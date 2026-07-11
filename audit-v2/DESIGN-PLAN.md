# DUSK / Grimuar — Ultimate Design Plan (S2 · Fable 5 · 2026-07-11)

Mandate (user): apply ALL installed design skills to produce the definitive
design-improvement plan; refactoring allowed, no restrictions; final decision on
every item is the user's. This plan consolidates B2/B3/B4 evidence (17 findings)
into one coherent program. It is a PLAN — no code was changed.

## 0. Skills consulted and how they were applied

| Skill | What it contributed | Override applied |
|---|---|---|
| impeccable (critique/audit/craft/typeset/colorize/layout/polish) | critique frames (AI-slop verdict, cognitive load, Nielsen), deterministic detector run, typography/color/layout mechanics below | its sub-agent orchestration replaced by audit-serial protocol (spec rev4 §4a) |
| redesign-existing-projects | generic-AI-pattern catalog → used as the B2 hunting list (priority strip, dot bullets, plain menus) | its "fix immediately" flow → plan-only |
| design-taste-frontend | bias-correction directives: shape-consistency lock, color-consistency lock, state cycles, eyebrow restraint | **serif-ban & LILA-rule overridden via their own override gates**: DUSK's brand IS violet manuscript/heritage — serif + violet are the deliberate identity, executed "with intent, not gradient slop" |
| high-end-visual-design | anti-cheap-defaults checklist (shadow tinting, texture, variance) | its Apple/Linear aesthetic mandate ignored — collides with locked gothic identity |
| emil-design-eng | animation decision framework (frequency→animate?), easing/duration tables, origin-aware popovers, :active tactile press, blur-масking, @starting-style, interruptibility | none — fully applicable |
| visual-design-foundations | token architecture (primitive→semantic), type-scale/spacing-scale formalization | none |
| web-typography | light-on-dark compensation, loading strategy, measure discipline | none |
| ui-ux-pro-max | dark-mode DB guidelines (OLED glow limits, elevation-by-lightness) | its style taxonomy has no gothic entry — used only for dark-theme mechanics |
| web-design-reviewer | (method duplicate of our harness — not used) | — |
| superpowers | reserved for the FIX stage (TDD, verification-before-completion, plans) | — |

## 1. Design thesis

**DUSK is an illuminated grimoire, not a themed to-do app.** The audit proved the
identity already exists at full strength in the "hero layer" (deadline candles,
quick-add ornaments, Grimuar editor, tombstone checkboxes, RU voice) and is
absent in the "chrome layer" (menus, system modals, sync surfaces) and in most
glyphs. The plan therefore has one strategic move, executed across six fronts:

> **Extend the existing identity to 100% of surfaces, at Tier-A craft, without
> inventing a second language.**

Three pillars:
1. **Один язык** — every popover, modal, state and glyph inherits the manuscript
   voice (nothing "plain rounded rect" survives).
2. **Ремесло** — foundations formalized as tokens (type scale, spacing, OKLCH
   palette, elevation, motion), so craft is systematic, not per-surface luck.
3. **Сцена под размер** — desktop stops being a phone column; mobile rework
   (B1 roadmap) and desktop tiers share the same component skin.

## 2. Foundations spec (tokens first — everything else inherits)

### 2.1 Typography (stack is right; formalize the system)
- KEEP the 4-family stack: Cinzel (display), Cormorant (body), Cormorant SC
  (labels), JetBrains Mono (data/chrome). It is the app's strongest anti-generic
  asset. (taste-skill serif-ban overridden — manuscript brand gate passes.)
- Formalize a **fixed rem scale, ratio 1.25, 5 roles**: `--text-xs/sm/base/lg/xl`
  (caption ~12.8, secondary ~14, body 16, subhead 20, display 25+ — map current
  sizes onto the scale; kill orphan sizes found in the census).
- **Light-on-dark compensation** (web-typography/typeset): body line-height
  +0.05–0.1, letter-spacing +0.01em, consider weight 500 for Cormorant body on
  glass surfaces — directly addresses the real-note verdict (mobile body reads
  thin/dim; grimuar_note.png).
- **Numbers**: `font-variant-numeric: tabular-nums` for counters (2/14), dates,
  deadline chips — stops chip-width jitter.
- **Caps tracking token**: SC labels already tracked; freeze as
  `--track-caps: 0.08em` and apply uniformly (some chips are tighter than others).
- **Measure**: `max-width: 65ch` on Grimuar body (currently ок at desktop by
  accident of column width; token it so desktop tiers don't break it).
- Body text ≥16px on mobile (B5 to verify current values; raise where below).
- Fonts load from Google CDN → self-host woff2 + `font-display: swap` + metric
  fallbacks (offline PWA correctness; queued as B12 check, fix belongs here).

### 2.2 Color (violet is the brand — execute it with OKLCH discipline)
- Re-derive the palette in **OKLCH**; keep the perceived colors, gain uniform
  lightness steps.
- **Tinted neutrals**: all greys get chroma 0.005–0.015 hued to the brand violet
  (most already are; formalize as primitives `--dusk-0..900`).
- **Elevation = lightness, not shadow** (dark-mode rule): define 3 surface
  steps (page glass / card / raised popover-modal) with rising lightness; keep
  the signature glow as *candlelight accent*, not as the elevation mechanism.
- **Shadow/glow tokens**: violet-tinted shadows only (never pure black); one
  glow scale (`--glow-sm/md/lg`) so ember/critical-pulse/FAB share physics.
- **Semantic layer**: `--danger` (the only warm accent — keep), `--accent`,
  `--success?` — decide: the letopis «СЕЙЧАС» green is the lone system-green;
  either token it as deliberate `--vital` or recolor to violet/silver (B2 note).
- **Label-colors (V2-B2-03)**: keep 10 hues as DATA; render swatch chrome
  desaturated toward dusk (OKLCH: same hue, chroma −25%, lightness normalized) —
  distinguishability verified in B5; presentation as cabochons/ink (see 3.3).
- **60-30-10 check**: violet accent is currently ~everywhere at low intensity —
  after tokenization, reserve the brightest accent step for primary action/focus
  only (accent earns power by rarity).
- Alpha cleanup: replace ad-hoc rgba overlays with explicit overlay tokens
  (alpha-is-a-smell rule; exceptions: focus rings, glass).

### 2.3 Space & rhythm
- **4pt spacing scale** tokens (`--space-1..8` = 4,8,12,16,24,32,48,64); sweep
  arbitrary values onto the scale (B4 census found no chaos, but no scale either).
- **Vertical rhythm**: card paddings/gaps as multiples of body line-height where
  text-adjacent.
- `gap` over margins in the grids (mostly already true).

### 2.4 Z-index & selection
- Z-scale token ladder (base/raised/sticky/popover/modal/toast) replacing the
  19 ad-hoc values (report-only note in B4).
- Global violet `::selection` (V2-B4-06).

## 3. Component skin system (the "one language" front)

### 3.1 The Gothic Popover/Modal Frame — one engine, one skin
Rides V2-B4-02 (single anchored-popover utility). The skin (V2-B2-01):
- Frame: hairline violet border + corner accents (etched serifs/fleur nubs — the
  `dividerFleur` motif GIC already owns), header rule with the diamond ornament,
  surface = elevation step 3.
- Items: SC labels, glyph slot (registry icon), hover = ink-wash fill (not
  grey), `[disabled]` = 0.35 opacity + no hover (V2-B4-05).
- Behavior (engine): flip + clamp + maxHeight (float-menu already has) +
  **reposition-or-close on scroll/resize** + **Esc** + arrow-key menu nav +
  single-open across ALL families (kills V2-B1-27/28, B1-17).
- Motion (emil): origin-aware `transform-origin` from trigger, enter
  `scale(0.97)+opacity` 150–200ms strong ease-out
  (`cubic-bezier(0.23,1,0.32,1)`), exit 120ms; modals keep center-origin.
- Applies to: snooze, task-more, sub-mode ×2, demote, export, sync panel, sort,
  qa-typeahead, gothic pickers, grim io/tpl/cfilter + system modals (rename,
  templates, color-filter, quarantine).

### 3.2 Interaction states — full cycle, everywhere
Per taste-skill state directives + emil tactility; feeds the B4 state matrix:
- `:active` press `scale(0.97)` (100–160ms) on every pressable (buttons, chips,
  swatches, menu items, checkboxes).
- Focus-visible: current purple ring is good — token it, audit coverage (B5).
- Disabled: shared style (3.1).
- Loading: NO generic spinners — wax/candle skeletons: content-shaped
  placeholders with a faint ember shimmer (sync pull, letopis open, import).
- Error/success: inline near source (forms), toast only transient (already the
  pattern); style toasts with the frame skin.
- Empty states (V2-B2-04): tasks-side set in own motifs + voice —
  «Список пуст» → unlit candle / empty niche; all-done → burnt-down candle +
  «Все свершено»; filter-empty → «Ничего не найдено под этой луной» class of
  voice (final RU lines to user taste, B5 polishes copy).
- Tooltips: delay first, instant-subsequent (emil) — micro-win for the toolbar.

### 3.3 Priority & label-color idiom (V2-B2-02/03)
- Priority: replace left strip + dots with the **ember idiom** — glow emanating
  from the tombstone checkbox (or card left edge as *light*, not a bar), driven
  by `--prio-*` tint; intensities: high=full ember + slow pulse, medium=steady,
  low=faint. Preview page → user picks (his design-tools rule).
- Label colors: cabochon/ink-drop tokens (desaturated per 2.2) on cards and in
  pickers; Grimuar card frames keep their tint but move to the same token.
- Typeahead priority menu inherits frame skin + ember glyphs (no dots).

### 3.4 Desktop stage (V2-B4-01)
- Tier 1 (≤1600px): as now (proven at 1366).
- Tier 2 (>1600px): column → ~900px, type scale unchanged (measure holds via ch
  tokens), toolbar gains air.
- Tier 3 (opt-in, user decision): **master-detail** — tasks list left +
  persistent right pane (open task's subtasks/note, or pinned Grimuar note);
  mirrors Grimuar's own layout; the background cathedral finally has a
  composition role (panes framed like diptych panels).
- Density var (impeccable live-param idea): `--density` multiplier on space
  tokens; compact mode for power use.
- Viewport-anchored strips (V2-B4-03): hotkey bar & status pill re-anchor to the
  column; right FAB stack docks to column edge.

## 4. Iconography program (V2-B3-01..05 — the largest craft front)

1. **Registry first**: one definition per ROLE (builders); replace 99 index.html
   statics with refs; kill the 6-cross/5-crescent drift (V2-B3-02).
2. **Semantic map** ratified by user BEFORE drawing (V2-B3-03): schedule
   concepts → astral/time motifs (moon phases for daily/weekly, sundial for
   hours, bell-toll for monthday), death motifs reserved for archive/delete;
   cross disambiguated (add vs none).
3. **Weight scale**: 24-grid, two stroke weights (1.75 primary / 1.25 detail),
   optical 16px variants for action-row glyphs (V2-B3-04).
4. **Ornate redesign by family against Tier-A exemplars** (chronicle, skull,
   sundial, crossedSwords, coffin-emblem): order = card action row → toolbar
   clusters → modal/menu glyphs → nav tabs → pickers. Every family ships as an
   HTML preview sheet (the s2 icon-sheet harness) → user picks → land.
5. 16px legibility gate mandatory per glyph; detail lives in the 24/32px
   variants, silhouettes carry 16px.
6. Verify the 5 empty-rendering sheet cells (V2-B3-05) during the first
   registry sweep.

## 5. Motion system (principles now; B7 audits against them)

- Adopt emil decision framework: **frequency gates animation** — check/uncheck
  (dozens/day) stays ≤160ms minimal; modals/menus 150–250ms; rare moments
  (archive month open, seal, empty-state first paint) may delight.
- Never animate keyboard-initiated actions (hotkey S sync, quick-add submit).
- Custom easing tokens exist (`--ease-*`) — extend with the strong pair:
  `--ease-out-strong: cubic-bezier(0.23,1,0.32,1)`,
  `--ease-in-out-strong: cubic-bezier(0.77,0,0.175,1)`; ban ease-in on UI.
- Interruptible: transitions (not keyframes) for anything re-triggerable;
  @starting-style for enters; blur ≤2px to mask rough crossfades (checkbox→seal).
- Popovers origin-aware (3.1). Reduced-motion parity stays law (B7 matrix).
- Signature moments (keep/extend, restrained): candle burn (exists), coffin
  seal (exists), ember pulse (3.3); candidates for user taste: ink-bleed on
  check, moon-arc progress bar, page-turn on Grimuar open (max ONE new
  signature per surface; delight is rare by design).

## 6. Phased roadmap (fix-stage order; each phase = shippable, findings mapped)

| Phase | Contents | Findings closed | Risk |
|---|---|---|---|
| **D1 Foundations** | tokens: type scale, spacing, OKLCH palette+neutrals, elevation, glow/shadow, z-ladder, ::selection, tabular-nums, caps-tracking, light-on-dark compensation | V2-B4-06, parts B2-03/B2-05 | low (values-only sweep) |
| **D2 Popover engine + Gothic frame** | one utility + skin + states (disabled, Esc, arrows, origin-aware motion, single-open) | V2-B4-02, V2-B2-01, V2-B4-05, V2-B1-27, V2-B1-28, B1-17 | medium (touch every menu — regression tests = s2_fix2 probes) |
| **D3 Priority ember + label cabochons** | card ember, picker glyphs, swatch restyle | V2-B2-02, V2-B2-03 | low-medium (preview→pick) |
| **D4 Icon registry** | dedupe to one-def-per-role, statics→refs, weight scale | V2-B3-02, V2-B3-04, V2-B3-05 | medium (markup churn; visual-diff per surface) |
| **D5 Icon redesign families** | semantic map → ornate families w/ preview sheets | V2-B3-01, V2-B3-03 | low per family (isolated) |
| **D6 Desktop tiers** | ≥1600px column, strips re-anchor, density var; master-detail if user opts in | V2-B4-01, V2-B4-03 | medium (layout) / high for master-detail |
| **D7 Voice & readability** | tasks empty-state set, archive readability, collapsed-group affordance, quarantine RU labels | V2-B2-04, V2-B2-05, V2-B4-04, V2-B4-07 | low |
| **D8 Signature motion** | emil-framework pass over all animations + chosen new signature(s) | (B7 findings TBD) | low-medium |

Ordering logic: D1 unblocks everything (tokens); D2 kills the biggest UX bugs +
restyles 15 surfaces at once; D3-D5 are the identity payload; D6 needs D1-D2
skin to look right; D7 cheap wins anywhere; D8 after B7's audit lands.
B1 mobile rework (P0 from B1 roadmap) CONSUMES D1-D3 outputs — the action-model
rework should be implemented against the new skin, not the old one, to avoid
doing the work twice. Recommended macro-order at fix stage:
**D1 → D2 → B1-P0 action-model + D3 → D4/D5 → D6/D7 → D8.**

## 7. User decisions needed (each phase gates on its own approvals)

1. Master-detail desktop mode (D6 Tier 3): да/нет/прототип?
2. Parchment grain/noise micro-texture on card surfaces (subtle, anti-flat):
   вкусовой вопрос — прототип в D1?
3. «СЕЙЧАС»-chip green: узаконить как `--vital` или увести в фиолет/серебро?
4. Empty-state voice lines (D7): предложу варианты — финальные строки за тобой.
5. Icon semantic map (D2 of the icon program): ратификация до отрисовки.
6. New signature moment candidates (D8): ink-bleed / moon-arc / page-turn —
   выбрать максимум 1-2 или ни одного.

— Конец плана. Все решения по пунктам — за пользователем; аудит кода не менял.
