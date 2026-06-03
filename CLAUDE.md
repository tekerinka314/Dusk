# DUSK — task journal

A single-page, offline-first gothic task manager (PWA). Plain vanilla JS — no
framework, no build step. Three source files do everything:

- `index.html` — markup, all modals, inline SVG icons, SVG `<symbol>` defs.
- `app.js` — all logic (state, rendering, repeats/cycles, drag-and-drop via
  SortableJS, deadlines, archive, import/export). State persists to
  `localStorage` under `duskState_v3`.
- `style.css` — all styling and animations.

## Design & UX — gothic aesthetic is MANDATORY

The gothic aesthetic is a hard requirement for **all** design and UX, not an
optional theme. It applies to every icon, glyph, button, control, hover effect,
state, animation, and empty state. When adding or changing anything visual:

- **Icons / glyphs:** hand-drawn gothic SVGs only (coffins, lancet arches,
  swords, crosses, hourglasses, runes, ouroboros, crescent moons). Never use
  emoji, generic Material/Feather icons, or a plain chevron where the rest of
  the app already uses a motif. Example: dropdown "chevrons" are the **gothic
  sword** glyph (`.dl-month-chevron`) — reuse that exact SVG, don't invent a new
  one or fall back to `<polyline points="6 9 12 15 18 9"/>`.
- **Reuse existing motifs:** before drawing a new icon, find where the same role
  is already represented and reuse that glyph so the language stays consistent.
- **Palette:** dark violet/purple on near-black (`--bg-*`, `--accent-*`,
  `--border-*`, deadline status vars). No alien colours; danger red is the only
  warm accent and only for destructive/over-deadline states.
- **Motion:** transitions use the shared `--ease-*` / `--dur-*` tokens. Movement
  is smooth and deliberate (fades, seals, slide-outs) — no abrupt
  appear/disappear, height jumps, or content shoving. Respect
  `prefers-reduced-motion`.
- **Controls:** buttons/affordances should feel integrated (e.g. the tag clear
  button slides out from inside the pill, sharing its background — never a
  separate bordered box).

When in doubt, match the surrounding code's existing gothic idiom rather than
introducing a new style.

## Working notes

- Keep changes surgical; preserve existing UX, logic, and the gothic style.
- Subtask lists render in a 2-column grid (single column on mobile) and support
  a split active/completed mode; DnD must keep working in every mode.
- Recurring items use `cycleChecked` + `nextReset`; `checkCycleResets()` (2s
  timer) auto-returns them to active at the reference point.
