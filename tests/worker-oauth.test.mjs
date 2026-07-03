// Cloudflare Worker OAuth handlers (worker/src/index.js), mocked fetch, 17 cases.
// Ported node harness (was tests/harness/worker-oauth.mjs; body kept verbatim).
// worker/ stays plain JS (deployed by wrangler, NOT part of the TS migration).
import { it, expect } from 'vitest';
import { handleExchange, handleRefresh } from '../worker/src/index.js';

let pass = 0; const failures = [];
const rec = (n, c, d) => { if (c) pass++; else failures.push(n + (d != null ? ' · ' + JSON.stringify(d) : '')); };
const env = { GOOGLE_CLIENT_ID:'CID', GOOGLE_CLIENT_SECRET:'SECRET', ALLOWED_ORIGIN:'https://app.example' };

let lastCall = null;
function mockFetch(respObj, ok=true, status=200) {
  globalThis.fetch = async (url, opts) => {
    const params = new URLSearchParams(opts.body);
    lastCall = { url, method: opts.method, ct: opts.headers['Content-Type'], params: Object.fromEntries(params) };
    return { ok, status, json: async () => respObj };
  };
}
const req = (body) => new Request('https://worker/x', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
const reqO = (body, origin) => new Request('https://worker/x', { method:'POST', headers:{'Content-Type':'application/json','Origin':origin}, body: JSON.stringify(body) });

it('worker OAuth handlers — 17 cases', async () => {
  // 1. exchange: happy path
  mockFetch({ access_token:'AT', refresh_token:'RT', expires_in:3600 });
  let r = await handleExchange(req({ code:'CODE', redirect_uri:'https://app.example/Dusk/', code_verifier:'VER' }), env);
  let j = await r.json();
  rec('exchange: hits Google token endpoint', lastCall.url==='https://oauth2.googleapis.com/token', lastCall.url);
  rec('exchange: form-urlencoded POST', lastCall.method==='POST' && /x-www-form-urlencoded/.test(lastCall.ct));
  rec('exchange: grant_type=authorization_code', lastCall.params.grant_type==='authorization_code');
  rec('exchange: sends client_id + SECRET (server-side only)', lastCall.params.client_id==='CID' && lastCall.params.client_secret==='SECRET');
  rec('exchange: passes code + redirect_uri + PKCE verifier', lastCall.params.code==='CODE' && lastCall.params.redirect_uri==='https://app.example/Dusk/' && lastCall.params.code_verifier==='VER');
  rec('exchange: returns access+refresh+expiry to client', j.access_token==='AT' && j.refresh_token==='RT' && j.expires_in===3600, j);
  rec('exchange: CORS locked to ALLOWED_ORIGIN', r.headers.get('Access-Control-Allow-Origin')==='https://app.example', r.headers.get('Access-Control-Allow-Origin'));

  // 2. exchange: missing fields → 400, no fetch
  lastCall=null; globalThis.fetch = async()=>{ lastCall='CALLED'; return {ok:true,json:async()=>({})}; };
  r = await handleExchange(req({ code:'only' }), env);
  rec('exchange: missing redirect_uri → 400', r.status===400, r.status);
  rec('exchange: bad request does NOT call Google', lastCall===null, lastCall);

  // 3. refresh: happy path — only access token back, NO refresh_token leak required
  mockFetch({ access_token:'AT2', expires_in:3599 });
  r = await handleRefresh(req({ refresh_token:'RT' }), env);
  j = await r.json();
  rec('refresh: grant_type=refresh_token', lastCall.params.grant_type==='refresh_token');
  rec('refresh: sends the refresh_token + secret', lastCall.params.refresh_token==='RT' && lastCall.params.client_secret==='SECRET');
  rec('refresh: returns a fresh access token', j.access_token==='AT2' && j.expires_in===3599, j);

  // 4. refresh: Google rejects (invalid_grant) → status propagated so client drops the token
  mockFetch({ error:'invalid_grant', error_description:'expired' }, false, 400);
  r = await handleRefresh(req({ refresh_token:'DEAD' }), env);
  j = await r.json();
  rec('refresh: revoked token → 400 propagated', r.status===400 && j.error==='invalid_grant', {s:r.status,j});

  // 5. refresh: missing token → 400, no fetch
  lastCall=null; globalThis.fetch = async()=>{ lastCall='CALLED'; return {ok:true,json:async()=>({})}; };
  r = await handleRefresh(req({}), env);
  rec('refresh: missing refresh_token → 400, no Google call', r.status===400 && lastCall===null, {s:r.status,lastCall});

  // 6. CORS allowlist: echo the request Origin when it's in the comma-list, else first
  const env2 = { ...env, ALLOWED_ORIGIN:'https://a.example,https://b.example' };
  mockFetch({ access_token:'AT', refresh_token:'RT', expires_in:3600 });
  let rr = await handleExchange(reqO({ code:'C', redirect_uri:'https://b.example/' }, 'https://b.example'), env2);
  rec('CORS: echoes a matching Origin from the allowlist', rr.headers.get('Access-Control-Allow-Origin')==='https://b.example', rr.headers.get('Access-Control-Allow-Origin'));
  rec('CORS: Vary: Origin set', /Origin/.test(rr.headers.get('Vary')||''), rr.headers.get('Vary'));
  rr = await handleExchange(reqO({ code:'C', redirect_uri:'x' }, 'https://evil.example'), env2);
  rec('CORS: non-listed Origin → falls back to first (not echoed)', rr.headers.get('Access-Control-Allow-Origin')==='https://a.example', rr.headers.get('Access-Control-Allow-Origin'));

    expect(failures).toEqual([]);
    expect(pass).toBe(17);
});
