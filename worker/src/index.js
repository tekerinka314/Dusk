// ============================================================
//  Dusk sync Worker — Cloudflare Worker (free plan)
// ============================================================
// Two jobs, both impossible from a pure browser:
//
//  1. OAuth code↔token exchange + refresh (endpoints /exchange, /refresh).
//     A Google "Web" OAuth client REQUIRES the client_secret at the token
//     endpoint, and the browser must never hold a secret. This Worker holds it
//     (as the GOOGLE_CLIENT_SECRET secret) and does the exchange, so the client
//     gets a long-lived REFRESH TOKEN → silent re-auth for months, no popup.
//
//  2. Cross-device wake (endpoint /ws → Durable Object SyncRoom). One device
//     pushes new data, sends a one-byte nudge over its socket; the room relays
//     it to every OTHER connected device, which then pulls. Near-instant sync
//     while tabs are open, instead of waiting for the 30 s poll.
//
// COST: free Workers plan. The Durable Object is SQLite-backed (the only kind on
// free) and uses the WebSocket *Hibernation* API (state.acceptWebSocket) so idle
// connections incur NO duration charges. A couple of devices nudging each other
// is far inside the free tier (~3M req/month).
//
// SECRETS: GOOGLE_CLIENT_SECRET is set with `wrangler secret put` — it lives
// only in the Worker, never in this repo, never in the client. GOOGLE_CLIENT_ID
// and ALLOWED_ORIGIN are plain (non-secret) vars in wrangler.toml.

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// ALLOWED_ORIGIN may be a COMMA-SEPARATED list (e.g. the GitHub Pages origin and the
// Cloudflare Pages origin during a migration). CORS allows only ONE origin per response,
// so we echo the request's Origin when it's in the allowlist, else fall back to the
// first listed. `Vary: Origin` keeps caches from mixing the two.
function corsHeaders(env, request) {
    const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    const origin = request && request.headers.get('Origin');
    let acao = '*';
    if (allowed.length) acao = (origin && allowed.includes(origin)) ? origin : allowed[0];
    return {
        'Access-Control-Allow-Origin': acao,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
    };
}

function jsonResponse(obj, env, request, status) {
    return new Response(JSON.stringify(obj), {
        status: status || 200,
        headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(env, request)),
    });
}

// POST /exchange { code, redirect_uri, code_verifier? } → { access_token, refresh_token, expires_in }
async function handleExchange(request, env) {
    let body;
    try { body = await request.json(); } catch (_) { return jsonResponse({ error: 'bad_json' }, env, request, 400); }
    if (!body.code || !body.redirect_uri) return jsonResponse({ error: 'missing_code_or_redirect' }, env, request, 400);
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code: body.code,
        grant_type: 'authorization_code',
        redirect_uri: body.redirect_uri,
    });
    if (body.code_verifier) params.set('code_verifier', body.code_verifier);
    const r = await fetch(TOKEN_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    const j = await r.json();
    if (!r.ok) return jsonResponse({ error: j.error || 'exchange_failed', detail: j.error_description }, env, request, r.status);
    return jsonResponse({ access_token: j.access_token, refresh_token: j.refresh_token, expires_in: j.expires_in }, env, request);
}

// POST /refresh { refresh_token } → { access_token, expires_in }
async function handleRefresh(request, env) {
    let body;
    try { body = await request.json(); } catch (_) { return jsonResponse({ error: 'bad_json' }, env, request, 400); }
    if (!body.refresh_token) return jsonResponse({ error: 'missing_refresh_token' }, env, request, 400);
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: body.refresh_token,
        grant_type: 'refresh_token',
    });
    const r = await fetch(TOKEN_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    const j = await r.json();
    // 400 invalid_grant ⇒ the refresh token was revoked/expired. Tell the client so
    // it can drop it and ask for a fresh interactive sign-in.
    if (!r.ok) return jsonResponse({ error: j.error || 'refresh_failed', detail: j.error_description }, env, request, r.status);
    return jsonResponse({ access_token: j.access_token, expires_in: j.expires_in }, env, request);
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(env, request) });

        if (url.pathname === '/exchange' && request.method === 'POST') return handleExchange(request, env);
        if (url.pathname === '/refresh'  && request.method === 'POST') return handleRefresh(request, env);

        if (url.pathname === '/ws') {
            const room = url.searchParams.get('room') || 'default';
            const id = env.SYNC_ROOM.idFromName(room);
            return env.SYNC_ROOM.get(id).fetch(request);
        }
        if (url.pathname === '/' || url.pathname === '/health') {
            return new Response('dusk-sync ok', { headers: corsHeaders(env, request) });
        }
        return new Response('not found', { status: 404, headers: corsHeaders(env, request) });
    },
};

// ── Durable Object: one instance per room; relays a nudge to all OTHER sockets ─
export class SyncRoom {
    constructor(state, env) { this.state = state; this.env = env; }

    async fetch(request) {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('expected websocket', { status: 426 });
        }
        const pair = new WebSocketPair();
        const client = pair[0], server = pair[1];
        // Hibernation API: the runtime can evict the DO from memory between
        // messages → no duration charge while sockets sit idle.
        this.state.acceptWebSocket(server);
        return new Response(null, { status: 101, webSocket: client });
    }

    // Any message from one device → forward verbatim to the others (a "changed" nudge).
    async webSocketMessage(ws, message) {
        for (const peer of this.state.getWebSockets()) {
            if (peer !== ws) { try { peer.send(message); } catch (_) { /* peer gone */ } }
        }
    }
    async webSocketClose(ws) { try { ws.close(); } catch (_) {} }
    async webSocketError(ws) { try { ws.close(); } catch (_) {} }
}

// Named exports for the node test (_workertest.mjs) — it drives the pure OAuth
// handlers with a mocked global fetch. The Workers runtime ignores extra exports.
export { handleExchange, handleRefresh };
