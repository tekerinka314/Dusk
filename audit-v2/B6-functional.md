# B6 — Functional correctness + Guardrail A (data-safety) deep-dive

**Аудитор:** Opus 4.8 (xhigh), по `audit-v2/S4-B6-DIRECTIVE.md`. **Дата:** 2026-07-12.
B6 — ядро безопасности данных всего аудита. Метод по спеке: сначала статически
(читаем подсистему, выводим машину состояний, пытаемся опровергнуть), затем runtime-проба
на реальном `dist/` для каждого пути, где данные под угрозой. Только seeded-состояния,
никогда реальные LS/IDB пользователя.

**Harness:** `D:\tmp\pw\b1\` — playwright-core + системный Chrome. Чистый движок мержа
`dusk/09-sync.ts` гоняется как node-проба через vitest .ts-transform. Полный syncNow-цикл
проверен под **фейковым Google Drive + Worker** (`fakecloud.mjs`, перехват `page.route`,
состояние файла+версии живёт в node — два контекста на одном `drive` = два устройства).
Сырьё: `audit-v2/shots/s4/*.json`. Probe-скрипты: `D:\tmp\pw\b1\s4_*.mjs` (переиспользуемы
на fix-этапе).

Статус: **Tier 0 (безопасность данных) ЗАКРЫТ.** Tier 1 (движки): **P11 + P9 сделаны**
(1 finding + sibling-sweep clean); P10/P12–P18 — следующая сессия.

---

## Tier 0 — результаты (в порядке риска)

| Probe | Что проверяли | Итог | Finding |
|---|---|---|---|
| **P0** | IDB-stale-boot clobber (промоут V2-B0-02) | **ПОДТВЕРЖДЁН (B)** — LS 15→14, тихая необратимая потеря; control доказал «IDB безусловно побеждает» | **V2-B0-02 D→B** `[RATIFY-FABLE]` |
| **P1** | grimEmptyCrypt воскрешение (промоут V2-B0-01) | **ПОДТВЕРЖДЁН (B)** — заметка без надгробия воскресает в мерже; control (надгробие) удаляет | **V2-B0-01 A→B** |
| **P6-RACE** | boot-гонка on-open-sync ↔ loadState | **ПОДТВЕРЖДЁН (B), детерминирован** — пустой Drive → полный wipe 5/5; staler Drive → потеря несинканной правки 3/3; **безопасно при наличии IDB-store (Case 2, 14/14)** | **V2-B6-01 (ФЛАГМАН)** `[RATIFY-FABLE]` |
| **P2** | multi-tab LWW | **ПОДТВЕРЖДЁН (B)** — правка второй вкладки стёрта; нет `storage`/BroadcastChannel | **V2-B6-02** `[RATIFY-FABLE]` (+E) |
| **P3** | backups-ring целостность | **ЧИСТО (B)** — кольцо 10, порядок, oldest drop; restore обратим (pushUndo+undo-тост) | нет (рабочая сеть безопасности) |
| **P4** | quota-честность saveState | **ПОДТВЕРЖДЁН (B)** — QuotaExceededError глотается молча, правка потеряна, `pageErrors=0` | **V2-B6-03** `[RATIFY-FABLE]` |
| **P5** | undo над приземлившимся мержем | **МАШИНА ЗАПИСАНА (B)** — undo откатывает и remote-правку; self-healing на след. синке (без потери) | **V2-B6-05** `[RATIFY-FABLE]` (design) |
| **P6** | syncNow-оркестрация (untested loop) | **ЦИКЛ ВЕРЕН (B)** — все 6 сценариев зелёные (см. таблицу) | нет (сам цикл корректен) |
| **P7** | merge-gaps за пределами vitest | **ЧИСТО (B)** — все 4 gap-а безопасны (см. таблицу) | нет |
| **P8** | карантин: целостность + правда отображения | **ПОДТВЕРЖДЁН (B)** — 3 вида показывают «пусто» при наличии контента; инъекция инертна | **V2-B6-04** (owed V2-B4-07) |

Итог Tier 0: **3 новых finding-а + 2 промоушена + 1 design-вердикт**, флагман = **V2-B6-01
boot-гонка**. Полные записи — в `FINDINGS.md` (B6 + промоушены B0-01/B0-02).

---

## P6 — syncNow под фейковым Drive (P6a–f). Цикл КОРРЕКТЕН.

`ARCHITECTURE §10`: весь `syncNow`-цикл (11) имел НОЛЬ покрытия тестами — самая новая
территория. Все шесть сценариев проходят (raw `p6_sync.json`):

| Сценарий | Инвариант | Итог |
|---|---|---|
| **a** two-device happy path | сходятся, ничего не потеряно | ✓ B тянет 14 от A; A получает FROM-B; converged, 15/15 |
| **b** push ConflictError | retry ≤4, без double-apply, журнал без дублей | ✓ A-EDIT×1 + PEER-TASK оба выжили, `jrDup=false` |
| **c** offline / push-fail | baseline НЕ продвигается, правка pending, позже доставлена | ✓ `baselineUnchanged`, `pending=true`, `delivered=true` |
| **d** edit-during-flight (`9441a3b`) | правка в полёте достигает облака | ✓ `cloud=true local=true` (через `_syncQueued` re-run) |
| **e** token expiry mid-loop | тихий refresh, синк завершается без потери авторизации | ✓ `/refresh` вызван, `signedIn=true`, доставлено |
| **f** `_pushNeeded` canon honesty | UI-pref → нет push; synced-field → push | ✓ pref: v2→v2; task-text: v2→v3 |

Вывод: механика цикла (pull→snapshotPreMerge→merge→apply→saveState→push→saveBaseline,
ConflictError-retry, baseline-дисциплина, edit-in-flight, refresh, canon) — **исправна**.
Единственный риск в этой территории — **boot-гонка ДО** входа в цикл (V2-B6-01).

---

## P7 — merge-gaps за пределами vitest (39+13). Все ЧИСТО.

Node-проба против реального `mergeStates` (raw `p1_p7_merge.json`). Кейс vitest #16
(`_groupUid`→`groupId` rebuild с разными int-id) и #14 (archive-vs-live) уже закреплены —
anti-scope. Остальные gap-ы:

| Gap | Ожидание | Итог |
|---|---|---|
| **P7a** archive-на-A vs text-edit-на-B | `_arch` и `text` — независимые поля, оба выживают | ✓ `_arch=true text=EDITED`, 0 конфликтов |
| **P7b** group cascade-delete vs task-edit | delete-vs-edit → DELETE + карантин, без сироты | ✓ task+group удалены, quarantine есть, loser=EDITED |
| **P7c** promote-subtask-на-A vs edit-sub-на-B | promote чеканит НОВЫЙ uid; sub delete-vs-edit → DELETE+карантин; без reuse/drop | ✓ promoted-задача есть, s1 ушёл из родителя, edit в карантине |
| **P7d** templates / noteTemplates field-merge | поля мержатся как у групп | ✓ name+color / name+body оба выжили |

Вывод: identity-трансляция и location-конфликты безопасны и согласованы с
залоченными решениями §9 (delete-vs-edit→DELETE). Findings нет.

---

## P8 — карантин: правда отображения (owed V2-B4-07)

Seed по одной записи каждого вида → `openQuarantine()` → что рендерит `.sync-quar-loser`
(raw `p8_quar.json`):

| Вид записи | loser несёт | Показывает | Вердикт |
|---|---|---|---|
| field / строка | 'проигравший текст' | текст | ✓ |
| field / объект (deadline) | `{mode,value}` | JSON | ✓ (честно, некрасиво) |
| field / false | false | `false` | ✓ |
| field / '' | пусто | «ПУСТО» | ✓ (правда пусто) |
| subtask / есть text | text | текст | ✓ |
| **subtask / text='' но note есть** | note | **«ПУСТО»** | ✗ **V2-B6-04** (= S2 jq3) |
| note-both / есть title | title | title | ✓ |
| **note-both / title='' но body есть** | body | **«ПУСТО»** | ✗ **V2-B6-04** |
| delete-vs-edit / task | text | текст | ✓ |
| **delete-vs-edit / note title=''** | body | **«ПУСТО»** | ✗ **V2-B6-04** |
| **инъекция** `<img onerror>` | — | 'злая' (экранировано) | ✓ ИНЕРТНО, `__XSS` не сработал |

`_entryLoserPreview` (11:586) читает только `.text||.name||.title`, никогда `.body`/`.note` →
запись без заголовка выглядит пустой, юзер может «Отклонить» → GC через 90д → потеря через
дезинформацию. Restore-путь (`restoreQuarantineEntry` 11:508) пишет полный `entry.loser` и
бампит `updatedAt` (распространяется на след. синке) — механика восстановления ВЕРНА;
дефект только в ПРЕВЬЮ. Детерминированный uid записи (`_entry` 09:146-148) + union-дедуп
журнала закреплены vitest (#20/#23) — дублей на re-merge нет (anti-scope).

---

## Tier 1 — движки (частично: P11, P9)

**P11 — quick-add parser sibling sweep + battery.** Директива: сначала проверить, не
заражает ли `\b`-после-кириллицы (B1-11, priority-regex 08:38) сиблингов `*`/`%`. Прямые
вызовы `parseQuickInput`/`extractTags` (raw `p11_quickadd.json`): **дефект ИЗОЛИРОВАН в
priority-regex.** Date `%` (08:43, `\S+`) и tag `*` (07:1197, `[\wа-яёА-ЯЁ]+u`) —
**кириллице-безопасны** (verified: `%завтра/%сегодня/%пн/%15/%12.07/%+3d/%+2нед/%20:30` все
парсятся; `*молоко/*тег` тоже; junk `%мусор` корректно не парсится и остаётся в тексте;
false-триггеры `50%`, `важно!` не парсятся; multitag дедуп+lowercase). B1-11 подтверждён
(RU `!высокий`→null, EN `!high`→high). **Новых finding нет — sweep очищает сиблингов.**

**P9 — repeats/cycle clock battery** (инъекция Date, raw `p9_repeats.json`). Корректно:
**monthly-31 overflow-repair** (1617-1644) — все переходы садятся на месяц С 31-м, пропуская
короткие (Jan31→Mar31, Apr15→May31, May31→Jul31); **leap Feb-29** (2028→Feb29, 2027→Mar29);
weektime rollover; `checkCycleResets` возврат-в-активное + без double-fire. **НАЙДЕНО
V2-B6-06:** `shiftDeadline` (04:1658) чеканит дату через `toISOString()` (UTC) при том, что
всё приложение использует локальные даты (`_ymd`) → date-mode повторяющийся дедлайн едет на
день КОРОЧЕ восточнее UTC (**UTC+3 юзера**: daily → вообще не сдвигается/заморожен; weekly →
+6 вместо +7). Snooze (`_ymd`) и reset-тайминг (`getTime()`) — корректны; баг изолирован.

## ROI-ledger (что пропущено и почему)

- **P3 LS/IDB backups-ring divergence** — не отдельная проба: тот же IDB-first класс, что
  P0/V2-B0-02, но кольцо не является авторитетной копией → одна строка cross-ref, без
  отдельного finding.
- **P8 restore/dismiss runtime-клик** — путь подтверждён по коду (A, 11:508-564: restore
  пишет loser+bump updatedAt; dismiss→resolved). Runtime-клик низкого риска, не гонялся
  (ROI). Grimuar callout-класс round-trip перенесён в **P15** (Tier 1, тест санитайзера).
- **P2 частота** — E-вопрос пользователю (две вкладки?), severity от ответа.
- **Tier 1 остаток (P10, P12–P18)** — deadline-status-transitions (P10; частично покрыт
  P9 — shiftDeadline/reset), undo-census (P12), view-combos (P13), DnD (P14), Grimuar-battery
  (P15, +callout round-trip из P8), notifications (P16), mobile-taps (P17), reconcile-fuzz
  (P18) — следующая сессия. Boundary-insurance: Tier 0 + Tier1(P9/P11) закоммичены отдельно.

## Probe-artefact ledger (`D:\tmp\pw\b1\`)

| Скрипт | Probe | Raw JSON (`audit-v2/shots/s4/`) |
|---|---|---|
| `s4_merge_probes.test.mjs` (→ `tests/_s4_merge_probes.test.mjs` для запуска) | P1, P7a-d | `p1_p7_merge.json` |
| `s4_p0_idbboot.mjs` | P0 (a/b/c) | `p0_idbboot.json` |
| `s4_bootrace.mjs` + `s4_racetiming.mjs` | V2-B6-01 (+discriminator) | `bootrace.json`, `racetiming.json` |
| `s4_p2_multitab.mjs` | P2 | `p2_multitab.json` |
| `s4_p3_backups.mjs` | P3 | `p3_backups.json` |
| `s4_p4_quota.mjs` | P4 | `p4_quota.json` |
| `fakecloud.mjs` + `s4_p6_sync.mjs` | P6 a-f | `p6_sync.json` |
| `s4_p5_undo.mjs` | P5 | `p5_undo.json` |
| `s4_p8_quar.mjs` | P8 | `p8_quar.json` |
| `s4_p11_quickadd.mjs` | P11 | `p11_quickadd.json` |
| `s4_p9_repeats.mjs` + `s4_tzcheck.mjs` | P9 (V2-B6-06) | `p9_repeats.json` |

Запуск node-мерж-проб: скопировать `s4_merge_probes.test.mjs` в `tests/` (правильный
relative-import), `npx vitest run <path>` (vitest фильтрует файлы вне корня — отсюда копия).
