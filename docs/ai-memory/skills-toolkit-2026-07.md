---
name: skills-toolkit-2026-07
description: "Курируемый набор скиллов под мобильный аудит и фазы Ф2-Ф5 — что установлено, что юзать на какой фазе"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 20078c52-ab20-4d6b-b966-8aefb9830cfb
---

Отбор 2026-07-16 (ручной скан установленных + npx skills find + веб-ресёрч
skills.sh leaderboard). **УСТАНОВЛЕНО ЮЗЕРОМ 2026-07-16 — все 9 стоят** (запускал
юзер через `!`: классификатор блочит агентские установки из неназванных
источников — это правило на будущее). Ошибки «PromptScript does not support
global» в логе установки — про сторонний таргет, игнорировать.

Пост-фактум: `motion` = Framer Motion (React) — НЕ ПОДХОДИТ (у нас ванильный
CSS), рекомендовано удалить; со скиллом playwright-cli приехал мусорный `dev`
(мейнтенанс их репо) — удалить; `svg-icon-maker` = VTracer растр→SVG
(конвейер, не рисование) — проверить перед Ф2.

**Установленный список (9):**
```
npx skills add vercel-labs/agent-skills@web-design-guidelines -g -y   # 468K — ревью UI по 100+ правилам; ГЛАВНЫЙ под мобильный аудит
npx skills add software-mansion/argent@argent-screenshot-diff -g -y   # 5.4K — скриншот-дифф воркфлоу
npx skills add julianoczkowski/designer-skills@design-review -g -y    # 3.8K — процесс дизайн-ревью
npx skills add hoodini/ai-agents-skills@mobile-responsiveness -g -y   # 979 — мобильная адаптивность
npx skills add mastepanoski/claude-skills@wcag-accessibility-audit -g -y # 850 — a11y/тач-таргеты/контраст
npx skills add microsoft/playwright-cli -g -y                         # 88K, официальный MS — Этап 5
npx skills add secondsky/claude-skills@motion -g -y                   # 754 — Ф2 моушен
npx skills add mindrally/skills@pwa-development -g -y                 # 595 — Ф4 PWA/TWA
npx skills add heroygt/skills@svg-icon-maker -g -y                    # 264 — Ф2 иконки; слабый источник — ПРОВЕРИТЬ содержимое перед использованием
```

**Уже установлено и обязательно к использованию по фазам:**
- Мобильный аудит: impeccable (audit/adapt/polish/critique), web-design-reviewer,
  webapp-testing, web-design-guidelines (после установки), verify,
  verification-before-completion, systematic-debugging.
- Ф2 дизайн: impeccable, design-taste-frontend, high-end-visual-design,
  visual-design-foundations, emil-design-eng, ui-ux-pro-max, web-typography,
  frontend-design, motion (новый), svg-icon-maker (новый).
- Ф4 TWA: pwa-development (новый), cloudflare, web-perf.
- Этап 5: playwright-cli (новый), webapp-testing.
- Экономия токенов: caveman:cavecrew (сжатые сабагенты).

**Отсеяно сознательно:** ui-audit/axiom (покрыто impeccable+web-design-guidelines),
стилевые паки minimalist/brutalist-ui (у нас готика), gsap/hyperframes (стек =
чистый CSS-токены), browser-use/browser-act (есть claude-in-chrome), image-to-code.
