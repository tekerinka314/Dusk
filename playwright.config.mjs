// Этап 5 — смоук-харнесс в репо (E2E-SPEC.md). Гоняется ЛОКАЛЬНО: `npm run e2e`.
//
// Три решения, которые тут закреплены:
//  • testMatch = *.e2e.mjs, НЕ *.spec.mjs — у vitest дефолтный include ловит
//    `.spec.` и утащил бы эти файлы в `npm test`, где happy-dom не умеет
//    Playwright. Развязка именем не теряется при правке vite.config.js.
//  • channel 'chrome' — системный браузер, как во внешнем харнессе: ноль
//    скачивания бандла и тот же движок, что у юзера. PW_CHANNEL=chromium
//    переключает на бандл, если он когда-нибудь понадобится.
//  • webServer = build + `vite preview` над dist/ — проверяем ровно то, что
//    уезжает на Pages (стабильные имена, реальный sw.js, public/ целиком),
//    а не dev-сервер.
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PW_PORT || 4173);
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: /.*\.e2e\.mjs$/,
    fullyParallel: true,
    workers: Number(process.env.PW_WORKERS || 4),
    timeout: 30_000,
    expect: { timeout: 5_000 },
    reporter: process.env.PW_REPORTER ? [[process.env.PW_REPORTER]] : [['list']],
    use: {
        baseURL: BASE,
        channel: process.env.PW_CHANNEL || 'chrome',
        colorScheme: 'dark',
        reducedMotion: 'no-preference',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off',
    },
    webServer: {
        // preview отдаёт dist/ — поэтому пересобираем перед прогоном.
        command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
        url: `${BASE}/index.html`,
        reuseExistingServer: true,
        timeout: 180_000,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
