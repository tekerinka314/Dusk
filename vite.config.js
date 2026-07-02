import { defineConfig } from 'vite';

// DUSK build (migration 2c). Key constraints:
//  • STABLE output names (app.js / style.css, no hashes) — the hand-rolled
//    sw.js precaches by exact name and stays network-first, so hashing adds
//    nothing except sw churn on every deploy.
//  • base './' — every URL stays relative, the app is origin/subpath-agnostic
//    (Pages prod, Pages previews, local `vite preview`).
//  • public/ holds everything the app fetches at RUNTIME by fixed name
//    (sw.js, version.json, manifest, icons, bg, pen-asset) — copied verbatim.
export default defineConfig({
    base: './',
    build: {
        modulePreload: false,           // single bundle — no preload graph needed
        chunkSizeWarningLimit: 1000,    // один бандл — так задумано (см. выше)
        rollupOptions: {
            output: {
                entryFileNames: 'app.js',
                chunkFileNames: '[name].js',
                // единственный CSS — стилевой лист приложения; фиксируем имя,
                // которое ждут sw.js (CORE_ASSETS) и url() внутри самого CSS
                assetFileNames: (info) =>
                    (info.names || []).some(n => n.endsWith('.css')) ? 'style.css' : '[name][extname]',
            },
        },
    },
});
