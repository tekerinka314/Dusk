---
name: motion-rebuild-2026-07-17
description: "Мотион W1-W4 СДЕЛАН (билд -7, 19c8915); safe-area ЗАКРЫТ (системная полоса, финал = TWA Ф4); СЛЕДУЮЩЕЕ = Ф3 дизайн B4-01/B4-02 (запросить /effort xhigh); Opus не раньше конца лимита"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6fb78490-65dc-405e-a1f4-4dc1aced0a52
---

**Мотион-перестройка (2026-07-17, коммит `19c8915`, билд -7) — W1-W4 сделаны.**
План+статус = `audit-v2/MOTION-PLAN.md` (binding-правила новой системы там).

Корни лага (аудит): (1) `.task-item` носил `backdrop-filter: blur(4px)` — блюр-область на КАЖДЫЙ ряд; (2) `.todo-app` blur(22px) на весь экран телефона; (3) вечные box-shadow/filter-пульсы (emblem/live/critical/side/portal) — repaint каждый кадр всегда; (4) 58× `transition:all` + `--dur-standard` 340ms.

Сделано: пульсы → статичные тени на `::after` + shared `glowBlink`/`glowBreathe` (opacity-only); `_syncCriticalPulse` теперь через CSS-var `--pulse-delay` (inline animationDelay до псевдо не достаёт); task-item блюр удалён глобально; ≤640px backdrop-диета (карта без блюра + фон 0.94, стекло половинного радиуса); transition:all → явные списки; coarse-токены 170/260/230, standard 340→300.

**Safe-area корень:** Chrome 135+ edge-to-edge — жестовую полосу красит СТРАНИЦА, не theme-color (потому 3 смены theme-color «не срабатывали»). Фикс: `html::after` полоса высотой inset, #150933, z120 (под шитами z200+). Верхний статус-бар = manifest theme_color, запечён в WebAPK — юзеру **переустановить PWA** или ждать ре-минта (1-3 дня).

**Вердикт юзера (тот же день):** DnD/бейджи/темп — норм; «не 120hz, но терпимо». Чин ВСЁ ЕЩЁ чёрный на его девайсе → системная полоса/запечённый WebAPK, из веба недостижимо; тема ЗАКРЫТА (юзер: не тратить токены), настоящий фикс = Ф4 TWA navigationBarColor. Остаток мотиона + мобильные баги (дропдаун сортировки уезжает влево за экран) + инвентарь тач-подсказок ПЕРЕДАНЫ ОПУСУ: `audit-v2/OPUS-QUEUE-2026-07-17.md` (`f4dcc32`). Тач-интуитивность (нет тултипов на телефоне) — дизайн за Fable в Ф3-сессии (O-3 заблокирован).

**Решение юзера (конец сессии):** Opus НЕ запускается до конца текущего Fable-лимита — всё делает Fable. OPUS-QUEUE (`audit-v2/OPUS-QUEUE-2026-07-17.md`) исполняется Опусом ПОЗЖЕ, когда юзер его запустит. **Следующая Fable-сессия = Ф3 по STRATEGY.md:** дизайн large-screen tier B4-01 + поповер-движок B4-02 (детали в audit-v2/FIX-PLAN.md); это дизайн-сессия → в начале ПОПРОСИТЬ юзера `/effort xhigh`. Adversarial-воркфлоу всё ещё отложен юзером (напомнить при случае). Вход в сессию: CLAUDE.md → STRATEGY.md → FIX-PLAN.md §B4 → эта память.

**Остаток (если лаг не ушёл):** JS-фаза (reflow-чтения 02-grimoire ×22, 07-dnd ×13; content-visibility для архива; FLIP схлопывания при уходе ряда); замер web-perf скиллом / on-device trace. `dangerPulse`/`armedPulse` оставлены (transient ≤3s). Возможные жертвы W3-свипа: анимации редких свойств через `all` стали мгновенными — ловить в визуальном ревью юзера.
