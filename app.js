// ============================================================
//  DUSK — Task Journal  v5  (gothic + subtasks)
// ============================================================

// Sync data-layer (Idea 8): v4 adds per-record uid + updatedAt + a tombstones
// graveyard. v3 is kept FROZEN as a rollback fallback — loadState migrates v3→v4
// once and never writes v3 again (rule #1: never lose data).
const K_STATE_V3 = 'duskState_v3';
const K_STATE_V4 = 'duskState_v4';
const K_STATE    = K_STATE_V4;                  // active key — every save goes here
const K_PREMIGRATION = 'dusk_premigration_v3';  // one-time raw v3 snapshot, taken before migrating
const K_SOUND  = 'soundEnabled';
const K_FILTER = 'isFiltered';
const K_PAGE   = 'currentPage';
const K_SEARCH = 'searchQuery';
const K_EXPAND = 'expandOpen';

// ============================================================
//  COFFIN SVG  — gothic checkbox shape
// ============================================================
function coffinSVG(w, filled, cycle) {
    w = w || 21; filled = !!filled; cycle = !!cycle;
    const h  = Math.round(w * 1.28);
    const hw = w / 2;
    const sw = w * 0.30;   // top narrow half-width
    const sh = h * 0.26;   // shoulder y
    const pad = 1.2;
    const br  = h * 0.14;
    const path = `M${hw-sw},${pad} L${hw+sw},${pad} L${w-pad},${sh} L${w-pad},${h-br} Q${hw},${h-pad} ${pad},${h-br} L${pad},${sh} Z`;
    let fill, sc, sw2;
    if (cycle) {
        fill = 'fill="rgba(100,30,220,0.42)"'; sc = 'rgba(180,100,255,0.9)'; sw2 = 1.4;
    } else if (filled) {
        fill = 'fill="url(#coffinGrad)"'; sc = 'rgba(200,130,255,0.92)'; sw2 = 1.5;
    } else {
        fill = 'fill="rgba(8,2,28,0.55)"'; sc = 'rgba(110,40,195,0.72)'; sw2 = 1.3;
    }
    // Gothic cross on lid when checked
    const cy1 = sh * 0.42, cy2 = h * 0.54;
    const cmid = (cy1 + cy2) * 0.36, carm = w * 0.13;
    const cross = (filled || cycle)
        ? `<line x1="${hw}" y1="${cy1}" x2="${hw}" y2="${cy2}" stroke="rgba(255,255,255,0.72)" stroke-width="1.1" stroke-linecap="round"/>
           <line x1="${hw-carm}" y1="${cmid}" x2="${hw+carm}" y2="${cmid}" stroke="rgba(255,255,255,0.72)" stroke-width="1.1" stroke-linecap="round"/>`
        : '';
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;flex-shrink:0">
      <path class="coffin-body" d="${path}" ${fill} stroke="${sc}" stroke-width="${sw2}" stroke-linejoin="round"/>
      ${cross}
    </svg>`;
}

// ── Recurring-complete checkbox icon ─────────────────────────────────────────
// Gothic Return Cross: identical coffin body + fill/stroke to coffinSVG(filled),
// with a RETURN CROSS instead of a plain cross — a vertical bar + horizontal bar
// sharing the same metrics as coffinSVG's cross, but the vertical bar's bottom
// curves left in a U-hook (Bezier) tipped with an upward arrowhead.
// This marks the coffin as "done but returning" — visually authoritative and
// consistent with the completed coffin's weight, gradient and stroke intensity.
function cycleCoffinSVG(w) {
    w = w || 21;
    const h   = Math.round(w * 1.28);
    const hw  = w / 2;
    const sw  = w * 0.30;
    const sh  = h * 0.26;
    const pad = 1.2;
    const br  = h * 0.14;
    const body = `M${hw-sw},${pad} L${hw+sw},${pad} L${w-pad},${sh} L${w-pad},${h-br} Q${hw},${h-pad} ${pad},${h-br} L${pad},${sh} Z`;

    // Mark zone — SAME coordinates as coffinSVG's cross
    const cy1  = sh * 0.42;   // top of vertical bar  (≈2.95 at w=21)
    const cy2  = h  * 0.54;   // bottom zone limit     (≈14.58)
    const cmid = (cy1 + cy2) * 0.36;  // horizontal bar y (≈6.31)
    const carm = w  * 0.13;   // half-width of horizontal bar (≈2.73)

    // Return hook: vertical bar stops early, U-curves leftward
    const hookY  = cy2 - 2.0;               // bar bottom before hook  (≈12.58)
    const ctrlY  = cy2 - 0.2;               // Bezier depth — must stay ≤ cy2 (≈14.38)
    const hookX  = hw - carm * 1.35;        // hook end x (left side)   (≈6.81)

    // Upward arrowhead at hook end
    const aw = 1.2, ah = 1.7;
    const fmt = v => v.toFixed(2);

    // Vertical bar (from top to hook start)
    const vBar  = `M${fmt(hw)},${fmt(cy1)} L${fmt(hw)},${fmt(hookY)}`;
    // Horizontal bar (same as coffinSVG crossH)
    const hBar  = `M${fmt(hw-carm)},${fmt(cmid)} L${fmt(hw+carm)},${fmt(cmid)}`;
    // U-shaped return hook
    const hook  = `M${fmt(hw)},${fmt(hookY)} C${fmt(hw)},${fmt(ctrlY)} ${fmt(hookX)},${fmt(ctrlY)} ${fmt(hookX)},${fmt(hookY)}`;
    // Arrowhead wings pointing upward at hook end
    const arr   = `M${fmt(hookX)},${fmt(hookY)} L${fmt(hookX-aw)},${fmt(hookY+ah)} M${fmt(hookX)},${fmt(hookY)} L${fmt(hookX+aw)},${fmt(hookY+ah)}`;

    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;flex-shrink:0">
      <path class="coffin-body" d="${body}"
            fill="url(#coffinGrad)" stroke="rgba(200,130,255,0.92)" stroke-width="1.5" stroke-linejoin="round"/>
      <line x1="${fmt(hw)}" y1="${fmt(cy1)}" x2="${fmt(hw)}" y2="${fmt(hookY)}"
            stroke="rgba(255,255,255,0.72)" stroke-width="1.1" stroke-linecap="round"/>
      <line x1="${fmt(hw-carm)}" y1="${fmt(cmid)}" x2="${fmt(hw+carm)}" y2="${fmt(cmid)}"
            stroke="rgba(255,255,255,0.72)" stroke-width="1.1" stroke-linecap="round"/>
      <path d="${hook}" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="1.1" stroke-linecap="round"/>
      <path d="${arr}"  fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="1.1" stroke-linecap="round"/>
    </svg>`;
}
function subCoffinSVG(f) { return coffinSVG(14, f, false); }

function hexToRgb(h) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : null;
}

// ============================================================
//  GOTHIC ICON SET
//
//  Kept standard (no viable gothic alternative at ≤14px):
//    search  — magnifying glass is universally clear; rune/eye loses readability
//    sound   — speaker+wave = global audio convention
//    repeat  — loop arrows = universal "repeat" symbol
//    restore — counter-clockwise arrow = universal restore/undo
//    drag    — 6-dot grid = universal drag affordance
// ============================================================
const IC = {
    // Overflow «…» — gothic vine of lozenges (more actions). Lozenges widened a
    // touch (±2.65) + a small CSS size bump (.btn-task-more) so the thin column
    // reads as substantial as its neighbours without overpowering them.
    more: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 8.5V9.5M12 14.5V15.5" opacity=".55"/>
        <path d="M12 3L15.5 6L12 9L8.5 6Z"/>
        <path d="M12 9L15.5 12L12 15L8.5 12Z"/>
        <path d="M12 15L15.5 18L12 21L8.5 18Z"/>
        <circle cx="12" cy="6" r=".66" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="12" r=".66" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="18" r=".66" fill="currentColor" stroke="none"/>
    </svg>`,
    // Gothic rosette (quatrefoil) — "parent checks by subtasks" motif. Three fill
    // variants light progressively: g4 = inherit (outline), g4any = one petal +
    // core lit ("any one → the whole"), g4all = every petal lit ("all → whole").
    g4: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="7" r="2.2"/><circle cx="17" cy="12" r="2.2"/>
        <circle cx="12" cy="17" r="2.2"/><circle cx="7" cy="12" r="2.2"/>
        <circle cx="12" cy="12" r="2.1"/>
    </svg>`,
    g4any: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="7" r="2.2" fill="currentColor" stroke="none"/>
        <circle cx="17" cy="12" r="2.2"/><circle cx="12" cy="17" r="2.2"/><circle cx="7" cy="12" r="2.2"/>
        <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" opacity=".9"/>
    </svg>`,
    g4all: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="7" r="2.2" fill="currentColor" stroke="none"/>
        <circle cx="17" cy="12" r="2.2" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="17" r="2.2" fill="currentColor" stroke="none"/>
        <circle cx="7" cy="12" r="2.2" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" opacity=".9"/>
    </svg>`,
    // Skull (delete forever)
    skull: `<svg viewBox="0 0 20 22" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round">
        <path d="M4 13.5V10C4 6.7 6.69 4 10 4C13.31 4 16 6.7 16 10V13.5"/>
        <rect x="4" y="13.5" width="12" height="4.5" rx="1.3"/>
        <ellipse cx="7.5" cy="10.5" rx="1.4" ry="1.6" fill="currentColor" stroke="none"/>
        <ellipse cx="12.5" cy="10.5" rx="1.4" ry="1.6" fill="currentColor" stroke="none"/>
        <line x1="7.5" y1="13.5" x2="7.5" y2="18"/><line x1="10" y1="13.5" x2="10" y2="18"/><line x1="12.5" y1="13.5" x2="12.5" y2="18"/>
    </svg>`,
    // Sarcophagus icon — inline paths, no <use> dependency
    archive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 9L12 4.5L21 9"/><rect x="3" y="9" width="18" height="11" rx="1.8"/><line x1="12" y1="10.5" x2="12" y2="13.5"/><line x1="10.5" y1="12" x2="13.5" y2="12"/></svg>`,
    // Gothic quill (edit / rename)
    quill: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 3C16.5 7 8 13 5.5 21.5"/>
        <path d="M20 3C18.5 8 13.5 13.5 5.5 21.5"/>
        <path d="M5.5 21.5L3.5 23.5L7.5 22.5" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
    </svg>`,
    // Lancet window (deadline)
    window: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M6 21V11.5C6 7.4 8.69 4 12 4C15.31 4 18 7.4 18 11.5V21"/>
        <line x1="3" y1="21" x2="21" y2="21"/>
        <path d="M9 21V15C9 12.8 10.34 11 12 11C13.66 11 15 12.8 15 15V21"/>
    </svg>`,
    // Three gothic spires (priority)
    spires: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4.5" y1="20" x2="4.5" y2="16"/><path d="M3 16L4.5 11.5L6 16"/>
        <line x1="12" y1="20" x2="12" y2="12"/><path d="M10.5 12L12 7L13.5 12"/>
        <line x1="19.5" y1="20" x2="19.5" y2="14"/><path d="M18 14L19.5 9.5L21 14"/>
        <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>`,
    // Sort by priority — three descending gothic spires (tallest=highest priority)
    sortPriority: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="20" x2="5" y2="4"/><path d="M3.5 6L5 3.5L6.5 6"/>
        <line x1="12" y1="20" x2="12" y2="8"/><path d="M10.5 10L12 7.5L13.5 10"/>
        <line x1="19" y1="20" x2="19" y2="13"/><path d="M17.5 15L19 12.5L20.5 15"/>
        <line x1="3" y1="20" x2="21" y2="20" stroke-width="1.3"/>
    </svg>`,
    // Sort by order — three equal horizontal lines with a dot-cursor (= hand-placed order)
    sortOrder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" y1="6"  x2="20" y2="6"/>
        <line x1="4" y1="12" x2="20" y2="12"/>
        <line x1="4" y1="18" x2="20" y2="18"/>
        <circle cx="8" cy="12" r="2.2" fill="currentColor" stroke="none" opacity="0.8"/>
    </svg>`,
    // Sort alphabetically — a gothic "A" over "Z" with a descending arrow (A→Z order).
    sortAlpha: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3.5 10.5 L6 4 L8.5 10.5"/><line x1="4.5" y1="8.4" x2="7.5" y2="8.4"/>
        <path d="M3.6 14 H8.4 L3.6 20 H8.4"/>
        <line x1="15.5" y1="4.5" x2="15.5" y2="19"/><path d="M13 16.3 L15.5 19 L18 16.3"/>
    </svg>`,
    // Focus mode — gothic single lancet arch with rays (spotlight on one group)
    focusMode: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3C9.5 3 7.5 6 7.5 10V18H16.5V10C16.5 6 14.5 3 12 3Z"/>
        <line x1="12" y1="18" x2="12" y2="21"/>
        <line x1="9" y1="21" x2="15" y2="21"/>
        <line x1="4" y1="7"  x2="6.5" y2="9" stroke-width="1.2" opacity="0.55"/>
        <line x1="20" y1="7" x2="17.5" y2="9" stroke-width="1.2" opacity="0.55"/>
        <line x1="12" y1="0.5" x2="12" y2="2.2" stroke-width="1.2" opacity="0.55"/>
    </svg>`,
    dagger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L13.5 9H10.5Z" fill="currentColor" stroke="currentColor" stroke-width="1.2"/>
        <path d="M10.5 9H13.5L14 18H10Z"/>
        <line x1="9" y1="11" x2="15" y2="11"/>
        <circle cx="12" cy="20.5" r="1.7" stroke-width="1.5"/>
    </svg>`,
    // Gothic sword (collapse/expand arrows)
    sword: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="2" x2="12" y2="17"/>
        <path d="M9 5L12 2L15 5"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
        <path d="M11 17L10 20H14L13 17"/>
        <circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none"/>
    </svg>`,
    // Two crossed swords (clear / dismiss). Bold crossguards visible even at 9px.
    crossedSwords: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" y1="4" x2="20" y2="20"/>
        <line x1="3" y1="6" x2="6" y2="3"/>
        <line x1="6" y1="3" x2="9" y2="6"/>
        <circle cx="20" cy="20" r="1.4" fill="currentColor" stroke="none"/>
        <line x1="20" y1="4" x2="4" y2="20"/>
        <line x1="21" y1="6" x2="18" y2="3"/>
        <line x1="18" y1="3" x2="15" y2="6"/>
        <circle cx="4" cy="20" r="1.4" fill="currentColor" stroke="none"/>
    </svg>`,
    // Gothic rune circle (archive select indicator — unchecked)
    runeCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3 L21 8.5 L21 15.5 L12 21 L3 15.5 L3 8.5 Z" opacity="0.55"/>
        <line x1="12" y1="3" x2="12" y2="21" stroke-width="1" opacity="0.3"/>
        <line x1="3" y1="8.5" x2="21" y2="15.5" stroke-width="1" opacity="0.3"/>
        <line x1="21" y1="8.5" x2="3" y2="15.5" stroke-width="1" opacity="0.3"/>
        <circle cx="12" cy="12" r="2.5" opacity="0.4"/>
    </svg>`,
    // Gothic rune circle — checked/filled (archive select indicator — selected)
    runeCircleChecked: `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(200,130,255,0.95)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3 L21 8.5 L21 15.5 L12 21 L3 15.5 L3 8.5 Z" fill="rgba(120,40,220,0.32)" stroke="rgba(200,130,255,0.90)"/>
        <line x1="12" y1="3" x2="12" y2="21" stroke="rgba(210,150,255,0.50)" stroke-width="1"/>
        <line x1="3" y1="8.5" x2="21" y2="15.5" stroke="rgba(210,150,255,0.50)" stroke-width="1"/>
        <line x1="21" y1="8.5" x2="3" y2="15.5" stroke="rgba(210,150,255,0.50)" stroke-width="1"/>
        <circle cx="12" cy="12" r="3.5" fill="rgba(180,80,255,0.80)" stroke="rgba(230,180,255,0.95)" stroke-width="1.2"/>
    </svg>`,
    // Gothic rising coffin (restore from archive)
    restore: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 20H16L17.5 22H6.5L8 20Z"/>
        <path d="M8.5 20V14.5L7 11L8.5 8H15.5L17 11L15.5 14.5V20"/>
        <line x1="10" y1="11" x2="14" y2="11" stroke-width="1.2" opacity="0.7"/>
        <line x1="12" y1="2" x2="12" y2="7"/>
        <path d="M9.5 4.5L12 2L14.5 4.5"/>
    </svg>`,
    // Gothic eye/rune (search)
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <ellipse cx="11" cy="11" rx="5" ry="7.5" transform="rotate(-30 11 11)"/>
        <ellipse cx="11" cy="11" rx="2" ry="2" fill="currentColor" stroke="none" opacity="0.85"/>
        <line x1="14.5" y1="16" x2="21" y2="21"/>
    </svg>`,
    // Repeat monthly — gothic tablet with notch marks (calendar page / lunar cycle by month).
    // Lancet-arch top, three horizontal tally lines inside = "numbered day of month".
    repeatMonthly: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 21V9C5 6.24 8 4 12 4C16 4 19 6.24 19 9V21"/>
        <path d="M12 4C12 4 11 2.5 12 1.5C13 2.5 12 4 12 4"/>
        <line x1="3" y1="21" x2="21" y2="21" stroke-width="1.4"/>
        <line x1="8"  y1="12" x2="16" y2="12" stroke-width="1.2" opacity="0.85"/>
        <line x1="8"  y1="15" x2="16" y2="15" stroke-width="1.2" opacity="0.65"/>
        <line x1="8"  y1="18" x2="13" y2="18" stroke-width="1.2" opacity="0.45"/>
    </svg>`,
    // Middle diamond at full opacity creates a natural gradient peak.
    // Thin stroke sharpens edges; fills provide the solid presence.
    // Drag handle — a gothic quatrefoil chain: two four-lobed (quatrefoil) links
    // joined by a round link, evoking cathedral-tracery jewellery. Stroke-only so
    // it stays legible and elegant at handle sizes.
    drag: `<svg viewBox="0 0 16 20" fill="none" stroke="currentColor" stroke-width="0.95" stroke-linejoin="round">
        <g><circle cx="8" cy="3" r="1.45"/><circle cx="9.6" cy="4.6" r="1.45"/><circle cx="8" cy="6.2" r="1.45"/><circle cx="6.4" cy="4.6" r="1.45"/></g>
        <circle cx="8" cy="10" r="1.7"/>
        <g><circle cx="8" cy="13.8" r="1.45"/><circle cx="9.6" cy="15.4" r="1.45"/><circle cx="8" cy="17" r="1.45"/><circle cx="6.4" cy="15.4" r="1.45"/></g>
    </svg>`,
    // Sound on — gothic church bell (lancet-arch silhouette, clapper, crown ring).
    // Bells are the original sound/notification symbol; universally recognised,
    // and the pointed lancet arch naturally fits the gothic aesthetic.
    soundOn:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3C9.5 3 7 6 6.5 10C6 13 5 15.5 4 18H20C19 15.5 18 13 17.5 10C17 6 14.5 3 12 3Z"/>
        <line x1="4" y1="18" x2="20" y2="18"/>
        <line x1="12" y1="18" x2="12" y2="21"/>
        <circle cx="12" cy="21.8" r="1.1" fill="currentColor" stroke="none"/>
        <line x1="9.5" y1="2.2" x2="14.5" y2="2.2" stroke-width="1.2" opacity="0.5"/>
    </svg>`,
    // Sound off — same bell, dimmed and crossed out with a gothic X-strike.
    soundOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3C9.5 3 7 6 6.5 10C6 13 5 15.5 4 18H20C19 15.5 18 13 17.5 10C17 6 14.5 3 12 3Z" opacity="0.35"/>
        <line x1="4" y1="18" x2="20" y2="18" opacity="0.35"/>
        <line x1="12" y1="18" x2="12" y2="21" opacity="0.35"/>
        <circle cx="12" cy="21.8" r="1.1" fill="currentColor" stroke="none" opacity="0.35"/>
        <line x1="9.5" y1="2.2" x2="14.5" y2="2.2" stroke-width="1.2" opacity="0.2"/>
        <line x1="5" y1="5" x2="19" y2="19" stroke-width="2"/>
        <line x1="19" y1="5" x2="5" y2="19" stroke-width="2"/>
    </svg>`,
    // п.17 «Звук пера» toggle — scroll (traced from a reference, recoloured) + a quill.
    // ON = quill writes on the sheet; OFF = quill lifts off the page (CSS .off on .pen-q).
    penSound: `<svg viewBox="-74 -113 660 660" fill="none" stroke="none"><path d="M 45.251 1.537 C 4.564 12.556, -13.747 72.927, 12.038 111.036 C 18.611 120.750, 27.427 127.348, 37.932 130.415 C 42.361 131.708, 48.956 132, 73.682 132 L 104 132 104 212.777 C 104 284.868, 104.170 293.798, 105.584 295.817 C 106.455 297.061, 111.877 301.129, 117.632 304.857 L 128.096 311.635 117.148 321.368 C 111.127 326.722, 105.674 332.372, 105.031 333.924 C 104.172 336, 103.960 351.273, 104.234 391.624 L 104.605 446.500 107.283 456.500 C 115.178 485.978, 133.412 505.494, 157.764 510.530 C 164.068 511.834, 184.405 511.997, 311.764 511.766 L 458.500 511.500 466.715 508.718 C 504.275 495.996, 522.468 453.546, 505.518 418.177 C 496.829 400.047, 482.772 388.060, 463.698 382.514 L 458 380.858 458 270.652 C 458 175.577, 457.799 160.158, 456.538 158.358 C 455.734 157.209, 449.673 152.365, 443.070 147.592 C 436.467 142.819, 430.824 138.524, 430.530 138.048 C 430.236 137.573, 434.501 134.398, 440.009 130.994 C 451.099 124.141, 453 122.123, 453 117.212 C 453 112.154, 451.788 110.670, 440.974 102.480 C 432.285 95.900, 431 94.545, 431 91.963 L 431 89 440.550 89 C 457.455 89, 458.437 87.533, 457.773 63.264 C 457.371 48.526, 457.015 45.700, 454.829 39.880 C 448.100 21.965, 436.342 10.177, 418.120 3.079 L 411.500 0.500 231 0.308 C 77.669 0.144, 49.710 0.329, 45.251 1.537 M 48.404 21.827 C 36.137 26.067, 25.889 39.285, 21.909 56 C 20.253 62.952, 20.257 79.101, 21.916 85 C 29.347 111.424, 54.786 120.936, 64.992 101.107 C 66.999 97.207, 66.470 86.841, 64.017 82.033 C 61.646 77.387, 55.937 74.060, 50.266 74.022 C 41.400 73.962, 37.329 62.669, 44.019 56.692 C 47.088 53.950, 47.728 53.785, 53.495 54.248 C 70.897 55.644, 83.411 68.194, 86.211 87.055 C 87.329 94.587, 86.140 103.895, 83.377 109.237 L 81.949 112 93.122 112 L 104.295 112 103.702 88.750 C 102.887 56.831, 99.497 44.004, 88.816 32.416 C 79.660 22.483, 60.801 17.541, 48.404 21.827 M 106 20.386 C 106 20.598, 107.761 23.411, 109.913 26.636 C 114.545 33.577, 119.162 44.796, 121.621 55.086 C 123.250 61.903, 123.420 71.451, 123.733 173.670 L 124.074 284.839 138.025 293.946 C 160.541 308.643, 160.551 309.784, 138.327 329.534 L 123.806 342.438 124.247 392.969 C 124.665 440.800, 124.804 443.927, 126.843 451.500 C 132.979 474.276, 145.463 487.759, 163.500 491.090 C 186.599 495.357, 205.201 475.871, 207.674 444.816 C 210.327 411.509, 180.778 386.479, 164.592 408.323 C 161.560 412.415, 161.541 426.569, 164.562 430.615 C 167.860 435.032, 171.169 436.989, 176.863 437.889 C 183.949 439.009, 187.455 442.390, 187.455 448.102 C 187.455 451.501, 186.875 452.723, 184.072 455.227 C 180.877 458.081, 180.335 458.220, 174.291 457.735 C 140.031 454.985, 129.128 406.039, 158.441 386.583 C 168.963 379.600, 159.985 380, 306.186 380 L 438.009 380 437.755 274.298 L 437.500 168.596 422.002 157.277 C 402.499 143.033, 401.545 142.091, 401.545 137.056 C 401.545 131.948, 403.633 129.763, 415.581 122.372 C 420.761 119.167, 424.990 116.309, 424.978 116.022 C 424.967 115.735, 422.445 113.700, 419.375 111.500 C 411.253 105.680, 410.746 104.248, 411.155 88.283 L 411.500 74.834 414.766 71.917 C 417.912 69.107, 418.398 69, 428.016 69 L 438 69 438 63.136 C 438 41.132, 425.553 24.708, 406.079 21.015 C 401.047 20.061, 106 19.442, 106 20.386 M 182.879 80.816 C 174.180 88.590, 183.618 101.869, 194.020 96.490 C 197.543 94.668, 199 92.184, 199 88 C 199 79.267, 189.401 74.989, 182.879 80.816 M 227.110 79.385 C 220.302 83.188, 220.669 93.963, 227.705 96.878 C 229.764 97.731, 250.435 97.966, 305.839 97.769 L 381.174 97.500 383.587 94.694 C 386.860 90.889, 386.860 85.111, 383.587 81.306 L 381.174 78.500 305.337 78.275 C 243.634 78.092, 229.055 78.299, 227.110 79.385 M 182.896 136.802 C 180.254 139.163, 179.727 140.358, 179.727 144 C 179.727 147.642, 180.254 148.837, 182.896 151.198 L 186.064 154.029 283.619 153.765 L 381.174 153.500 383.587 150.694 C 386.860 146.889, 386.860 141.111, 383.587 137.306 L 381.174 134.500 283.619 134.235 L 186.064 133.971 182.896 136.802 M 182.896 192.802 C 180.254 195.163, 179.727 196.358, 179.727 200 C 179.727 203.642, 180.254 204.837, 182.896 207.198 L 186.064 210.029 283.619 209.765 L 381.174 209.500 383.587 206.694 C 386.860 202.889, 386.860 197.111, 383.587 193.306 L 381.174 190.500 283.619 190.235 L 186.064 189.971 182.896 192.802 M 182.896 248.802 C 180.254 251.163, 179.727 252.358, 179.727 256 C 179.727 259.642, 180.254 260.837, 182.896 263.198 L 186.064 266.029 283.619 265.765 L 381.174 265.500 383.587 262.694 C 386.860 258.889, 386.860 253.111, 383.587 249.306 L 381.174 246.500 283.619 246.235 L 186.064 245.971 182.896 248.802 M 182.896 304.802 C 180.254 307.163, 179.727 308.358, 179.727 312 C 179.727 315.642, 180.254 316.837, 182.896 319.198 L 186.064 322.029 283.619 321.765 L 381.174 321.500 383.587 318.694 C 386.860 314.889, 386.860 309.111, 383.587 305.306 L 381.174 302.500 283.619 302.235 L 186.064 301.971 182.896 304.802 M 220.089 407.551 C 222.238 411.703, 224.501 417.103, 225.117 419.551 L 226.237 424 306.072 424 C 391.699 424, 389.858 423.891, 392.575 429.145 C 395.252 434.322, 393.396 440.587, 388.528 442.805 C 386.566 443.699, 366.065 444, 307.082 444 L 228.258 444 227.571 450.250 C 226.129 463.359, 221.617 476.252, 214.973 486.250 L 211.152 492 329.326 491.994 C 400.407 491.991, 449.846 491.604, 453.387 491.024 C 472.427 487.906, 488.120 471.926, 491.130 452.590 C 494.852 428.688, 477.471 404.920, 453.387 400.976 C 449.851 400.397, 401.307 400.009, 331.841 400.006 L 216.182 400 220.089 407.551 M 418.500 425.161 C 411.145 429.205, 411.248 439.080, 418.684 442.883 C 424.925 446.075, 432.455 441.217, 432.455 434 C 432.455 426.749, 424.627 421.791, 418.500 425.161" fill="currentColor" fill-rule="evenodd"/><g class="pen-q"><path d="M512 26C414 74 326 156 250 292" fill="none" stroke="currentColor" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><path d="M512 26C474 132 398 222 268 300" fill="none" stroke="currentColor" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><path d="M506 33C436 93 374 182 300 292" fill="none" stroke="currentColor" stroke-width="19" stroke-linecap="round" stroke-linejoin="round" opacity=".4"/><path d="M250 292 230 340 283 322Z" fill="currentColor" stroke="none"/><path d="M474 70C455 96 427 112 399 117M450 112C431 142 402 158 373 163M424 156C405 186 376 200 347 205M398 200C379 228 350 242 322 247" fill="none" stroke="currentColor" stroke-width="19" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/></g></svg>`,
    // Gothic scroll with plus (add note)
    addNote:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 2H17V18L12 21.5L7 18V2Z"/><path d="M7 2C7 2 8.5 0.5 12 0.5C15.5 0.5 17 2 17 2"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/></svg>`,
    // Gothic scroll with horizontal lines (edit note — visually distinct from addNote which has a cross)
    editNote: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 2H17V18L12 21.5L7 18V2Z"/><path d="M7 2C7 2 8.5 0.5 12 0.5C15.5 0.5 17 2 17 2"/><line x1="9.5" y1="7.5" x2="14.5" y2="7.5"/><line x1="9.5" y1="11" x2="14.5" y2="11"/><line x1="9.5" y1="14.5" x2="13" y2="14.5"/></svg>`,
    // Small gothic cross (add-subtask confirm button — same as IC.add but separate for clarity)
    crossSm:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="12" y1="2" x2="12" y2="22"/><line x1="4.5" y1="8" x2="19.5" y2="8"/>
    </svg>`,
    // Gothic tombstone (group delete — intuitive "gone" symbol in gothic style)
    tombstone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 21V10.5C7 7.46 9.24 5 12 5C14.76 5 17 7.46 17 10.5V21"/>
        <line x1="4" y1="21" x2="20" y2="21"/>
        <line x1="10" y1="10" x2="14" y2="10" stroke-width="1.2"/>
        <line x1="12" y1="8" x2="12" y2="13" stroke-width="1.2"/>
    </svg>`,

    // "Ничего/отсутствие" — a pair of gothic crescent moons that flank the label on both
    // sides (horns toward the text). noneMoonL opens right; noneMoonR is its mirror.
    noneMoonL: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M14.5 3.35A9 9 0 1 0 14.5 20.65A9 9 0 0 1 14.5 3.35Z"/></svg>`,
    noneMoonR: `<svg class="none-moon-r" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M14.5 3.35A9 9 0 1 0 14.5 20.65A9 9 0 0 1 14.5 3.35Z"/></svg>`,

    // Gothic Latin cross — the same "add" glyph as the toolbar's «Группа» button.
    crossAdd: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round">
        <line x1="12" y1="2" x2="12" y2="22"/>
        <line x1="4.5" y1="8" x2="19.5" y2="8"/>
    </svg>`,

    // ── NEW GOTHIC ICONS ──────────────────────────────────────

    // Gothic arch clock — for "set deadline" in params
    // A lancet arch (gothic architecture) with clock hands inside: time + gothic in one shape
    // Cancelled seal — for "delete note"
    // Gothic eight-pointed starburst seal (heraldic wax-seal form, deeply medieval) + thin
    // cancellation X inside. The starburst outline = official document / sealed note;
    // the X = voided / erased. Compact, does not overlap with any existing icon.
    // Gothic tower clock — for "sort by deadline"
    // Medieval mechanical tower clock: lancet arch casing + clock face + pendulum.
    // The lancet arch is the defining gothic architectural form; the pendulum clock
    // with visible hands = timekeeping = deadline ordering. Unambiguous at any size.
    sundial: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 22V11.5C7 7 9.2 4 12 4C14.8 4 17 7 17 11.5V22"/>
        <line x1="5" y1="22" x2="19" y2="22" stroke-width="1.6"/>
        <circle cx="12" cy="13.5" r="3.8"/>
        <line x1="12" y1="13.5" x2="10.2" y2="11.5" stroke-width="2"/>
        <line x1="12" y1="13.5" x2="14.2" y2="11.5" stroke-width="1.3"/>
        <circle cx="12" cy="13.5" r="0.85" fill="currentColor" stroke="none"/>
        <line x1="12" y1="17.3" x2="12" y2="19.8" stroke-width="1.2" opacity="0.6"/>
        <circle cx="12" cy="20.5" r="0.9" stroke-width="1.3" opacity="0.65"/>
    </svg>`,

    // Gothic eye of truth — for "filter / show only unchecked"
    // Vesica piscis eye (medieval illuminated manuscript symbol of divine sight) =
    // "show me only what I seek" → filter. Slit pupil = discernment.
    gothEye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M2 12C5 5.5 9 3.5 12 3.5C15 3.5 19 5.5 22 12C19 18.5 15 20.5 12 20.5C9 20.5 5 18.5 2 12Z"/>
        <circle cx="12" cy="12" r="3.8"/>
        <ellipse cx="12" cy="12" rx="1.5" ry="3" fill="currentColor" stroke="none" opacity="0.92"/>
        <line x1="12" y1="3.5" x2="12" y2="2" stroke-width="1.3" opacity="0.55"/>
        <line x1="8.5" y1="4.8" x2="7.8" y2="3.2" stroke-width="1.1" opacity="0.42"/>
        <line x1="15.5" y1="4.8" x2="16.2" y2="3.2" stroke-width="1.1" opacity="0.42"/>
    </svg>`,

    // Gothic lemniscate — for "repeat / recurring"
    // A pointed (gothic-arched) figure-eight lying on its side = infinite loop / eternal return.
    // Visually: two lancet-arch teardrop loops joined at centre, arrowhead on right loop.
    // Completely distinct from: coffin (filled hexagon+cross), ouroboros (single circle+arrow),
    // and all other icons. Works cleanly at 12–14px: just two curves + tiny arrowhead.
    ouroboros: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <!-- Left loop: pointed teardrop going counter-clockwise -->
        <path d="M12 12 C11 9 8 6 6 7 C4 8 4 12 6 14 C8 15 11 13 12 12"/>
        <!-- Right loop: pointed teardrop going clockwise -->
        <path d="M12 12 C13 9 16 6 18 7 C20 8 20 12 18 14 C16 15 13 13 12 12"/>
        <!-- Arrowhead on right loop at 2-o'clock position — indicates direction of cycle -->
        <path d="M18.8 8.5 L20.2 7.2 L19.5 9.5" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    </svg>`,
    // Small cycle-return arrow (used in cycle-until-tag meta badge — 9px)
    // Cycle-return badge icon — angular unclosed diamond loop with arrowhead.
    // Same "cycle" meaning as the old round arrow but with gothic sharp angles.
    cycleReturn: `<svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M5 1.2L8.8 5L5 8.8L1.2 5L3.5 2.7"/><polyline points="3.5,1.2 5,1.2 5,2.7"/></svg>`,
    // Gothic twin-coffin (duplicate task) — two overlapping coffin silhouettes
    // The second one offset bottom-right = "copy" in medieval heraldic doubles
    twinCoffin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 3H11.5L15 6.5V17.5Q10 20 5 17.5V6.5Z" opacity="0.55"/>
        <path d="M9 6H15.5L19 9.5V20.5Q14 23 9 20.5V9.5Z"/>
        <line x1="14" y1="13" x2="14" y2="17" stroke-width="1.1" opacity="0.7"/>
        <line x1="12" y1="15" x2="16" y2="15" stroke-width="1.1" opacity="0.7"/>
    </svg>`,
    // Gothic crescent moon — "Без дедлайна" (no deadline / open-ended)
    moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>`,
    // Gothic lancet-arch with a slash — "снять дедлайн" / cancel deadline.
    // The arch is the same as IC.window (deadline icon); the diagonal strike means removal.
    // Visually: "this deadline is cancelled / erased".
    deadlineClear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M6 21V11.5C6 7.4 8.69 4 12 4C15.31 4 18 7.4 18 11.5V21" opacity="0.55"/>
        <line x1="3" y1="21" x2="21" y2="21" opacity="0.55"/>
        <path d="M9 21V15C9 12.8 10.34 11 12 11C13.66 11 15 12.8 15 15V21" opacity="0.55"/>
        <line x1="4" y1="4" x2="20" y2="20" stroke-width="2"/>
        <line x1="20" y1="4" x2="4" y2="20" stroke-width="2"/>
    </svg>`,

    // Gothic dagger / pin — for pinning tasks to the top of their group.
    pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="3" x2="12" y2="19"/>
        <path d="M9 7L12 3L15 7"/>
        <line x1="8" y1="10" x2="16" y2="10"/>
        <circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none"/>
    </svg>`,

    // Pinned-card mark — a forged iron spike driven diagonally into the top-left
    // corner. Built for VOLUME: the head + shaft are each split along their
    // centre-line into a lit upper-left facet and a shadowed lower-right facet
    // (white/black overlays on the theme colour), plus a specular glint — so it
    // reads as a 3-D forged nail, not a flat glyph.
    pinSpike: `<svg viewBox="0 0 24 24" stroke="none" stroke-linejoin="round">
        <path d="M2.8 5.6 L5.6 2.8 L16 16 Z" fill="currentColor"/>
        <path d="M4 0.8 L7.2 4 L4 7.2 L0.8 4 Z" fill="currentColor"/>
        <path d="M5.6 2.8 L16 16 L4 4 Z" fill="#ffffff" opacity="0.30"/>
        <path d="M2.8 5.6 L16 16 L4 4 Z" fill="#000000" opacity="0.32"/>
        <path d="M4 0.8 L4 4 L0.8 4 Z" fill="#ffffff" opacity="0.42"/>
        <path d="M7.2 4 L4 7.2 L4 4 Z" fill="#000000" opacity="0.34"/>
        <circle cx="3" cy="3" r="0.85" fill="#ffffff" opacity="0.75"/>
    </svg>`,

    // Gothic select checkbox — unchecked: lancet arch empty vessel
    selectEmpty: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 19V11C5 7.5 7.24 5 10 5C12.76 5 15 7.5 15 11V19"/>
        <line x1="3" y1="19" x2="17" y2="19"/>
    </svg>`,

    // Gothic select checkbox — checked: sealed coffin with a rune cross inside
    selectChecked: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 19V11C5 7.5 7.24 5 10 5C12.76 5 15 7.5 15 11V19" fill="rgba(130,50,255,0.18)"/>
        <line x1="3" y1="19" x2="17" y2="19"/>
        <line x1="10" y1="10" x2="10" y2="16.5" stroke="rgba(200,130,255,0.95)" stroke-width="1.8"/>
        <line x1="7" y1="12.5" x2="13" y2="12.5" stroke="rgba(200,130,255,0.95)" stroke-width="1.8"/>
        <circle cx="10" cy="8.5" r="1.2" fill="rgba(200,130,255,0.9)" stroke="none"/>
    </svg>`,

    // Snooze (postpone deadline) — gothic tower-clock face + a forward "skip" arc.
    snooze: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="13" r="7"/>
        <path d="M11 9.5V13L13.4 14.4"/>
        <path d="M16.5 3.5L20.5 4.5L19.5 8.5"/>
        <path d="M20.5 4.5C20.5 4.5 18 6.5 15.5 6.7"/>
    </svg>`,

    // Template (save task as a reusable grimoire) — gothic tome with a ribbon bookmark.
    template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 4.5C5 3.7 5.6 3 6.5 3H17C17.6 3 18 3.4 18 4V18.5C18 19.3 17.4 20 16.5 20H6.5C5.7 20 5 19.3 5 18.5V4.5Z"/>
        <path d="M5 18.5C5 17.7 5.7 17 6.5 17H18"/>
        <path d="M14 3V8.5L12 7L10 8.5V3" fill="currentColor" stroke="none" opacity="0.55"/>
    </svg>`,

    // Promote subtask → task: arrow rising to a top rule ("raise to top level").
    promote: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="4" x2="19" y2="4" opacity="0.6"/>
        <line x1="12" y1="20" x2="12" y2="8"/>
        <path d="M7 13L12 8L17 13"/>
    </svg>`,
    // Demote task → subtask: arrow descending under a top rule ("nest into a parent").
    demote: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="4" x2="19" y2="4" opacity="0.6"/>
        <line x1="12" y1="8" x2="12" y2="20"/>
        <path d="M7 15L12 20L17 15"/>
    </svg>`,
};

// ============================================================
//  MOTION HELPERS
// ============================================================
/** Returns true when the user has requested reduced motion. */
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ============================================================
//  DRAG HANDLE POSITIONING
//  Uses DOM measurements to position the handle correctly for
//  every item without a fixed height threshold.
//
//  task-check-col natural height (in flex flow):
//    task-check(27px) + gap(3px) + drag-handle(13px) = 43px
//
//  Large item: task-content taller than the check-col natural height.
//    → stretch col, then centre handle between checkbox-bottom and col-bottom.
//  Small item: check-col determines item height.
//    → keep handle in normal flow below checkbox; no absolute positioning.
// ============================================================
const CHECK_COL_NATURAL_H = 43;
const DRAG_HANDLE_H       = 13;
const DRAG_HANDLE_MIN_GAP = 5;

let _dragHandleObserver = null;

function _positionOneHandle(item) {
    const col     = item.querySelector('.task-check-col');
    const check   = item.querySelector('.task-check');
    const handle  = item.querySelector('.drag-handle');
    const content = item.querySelector('.task-content');
    if (!col || !check || !handle || !content) return;
    if (item.classList.contains('checked') || item.classList.contains('cycle-checked')) {
        _resetDragHandle(handle, col); return;
    }
    if (content.offsetHeight > CHECK_COL_NATURAL_H) {
        col.style.alignSelf = 'stretch';
        col.style.position  = 'relative';
        const colH   = col.offsetHeight;
        const checkH = check.offsetHeight;
        const topPx  = checkH + Math.max(DRAG_HANDLE_MIN_GAP, (colH - checkH - DRAG_HANDLE_H) / 2);
        handle.style.position  = 'absolute';
        handle.style.top       = Math.round(topPx) + 'px';
        handle.style.left      = '50%';
        handle.style.transform = 'translateX(-50%)';
        handle.style.margin    = '0';
    } else {
        _resetDragHandle(handle, col);
    }
}

function positionDragHandles() {
    requestAnimationFrame(() => {
        document.querySelectorAll('.task-item').forEach(item => _positionOneHandle(item));
        setupDragHandleObserver();
    });
}

function setupDragHandleObserver() {
    if (!window.ResizeObserver) return;
    if (_dragHandleObserver) _dragHandleObserver.disconnect();
    _dragHandleObserver = new ResizeObserver(entries => {
        const items = new Set();
        entries.forEach(e => { const i = e.target.closest('.task-item'); if (i) items.add(i); });
        items.forEach(item => _positionOneHandle(item));
    });
    document.querySelectorAll('.task-item .task-content').forEach(el => _dragHandleObserver.observe(el));
}

function _resetDragHandle(handle, col) {
    handle.style.position  = '';
    handle.style.top       = '';
    handle.style.left      = '';
    handle.style.transform = '';
    handle.style.margin    = '';
    col.style.alignSelf    = '';
    col.style.position     = '';
}


/**
 * Only applies to items that were just rendered (animation hasn't started).
 * Caps stagger at first STAGGER_MAX items so long lists don't feel slow.
 */
const STAGGER_MAX  = 8;
const STAGGER_STEP = 42; // ms between each item

function applyListStagger() {
    // IMP-1: only stagger items that actually have the entrance animation (.entering)
    // Non-entering items have no animation, so setting animationDelay on them is a no-op
    // but adding animationend listeners to hundreds of items every render was wasteful.
    const items = Array.from(
        document.querySelectorAll(
            '#list-container > .task-item.entering, .group-body > .task-item.entering'
        )
    );
    items.forEach((el, i) => {
        if (i >= STAGGER_MAX) {
            el.style.animationDelay = '0ms';
            return;
        }
        el.style.animationDelay = `${i * STAGGER_STEP}ms`;
        // Clean up after the animation so hover/transition aren't affected
        el.addEventListener('animationend', () => {
            el.style.animationDelay = '';
        }, { once: true });
    });
}

// ============================================================
//  STATE
// ============================================================
let state = {
    tasks:            [],   // {id,text,checked,priority,groupId,deadline,note,noteOpen,order,repeat,cycleChecked,nextReset,subtasks,subtasksOpen,subNotesAlwaysOpen}
    groups:           [],
    archive:          [],
    notes:            [],   // п11 Гримуар: {id:uuid, title, body, createdAt, updatedAt} — независимы от задач
    notesArchive:     [],   // п11 «Склеп»: архив заметок (ОТДЕЛЬНЫЙ от архива задач), +archivedAt
    tombstones:       [],   // Idea 8: deletion graveyard {uid,type,parentUid,deletedAt} — for future per-uid sync merge
    nextId:           1,    // Idea 8 (Design B): int id stays as the LOCAL DOM/onclick key; `uid` is the sync identity
    nextGroupId:      1,
    nextSubId:        1,
    sortMode:         'priority',  // 'priority' | 'order'  (global sort mode)
    sortModeOverrides: {},         // { [groupId | '__ungrouped__']: 'priority' | 'order' }
    subAnyMode:       false,       // global default: parent auto-checks by ALL subs (false) / ANY one sub (true)
};

// ---- UI STATE ----
let isFiltered       = true;
let searchQuery      = '';
let soundEnabled     = false;

// п.17 «Звук пера»: writing sound from a real quill recording (assets/quill-sound.mp3).
// Default OFF. Grains baked into one compact file; offsets below (built offline).
const K_PEN_SOUND  = 'dusk_pen_sound';
// D-3: PEN_ASSET (data:audio/mpeg base64, ~155 КБ) вынесен в pen-asset.js (грузится <script>-ом до app.js, кладётся в window.PEN_ASSET). _penLoad() декодирует его in-memory через atob — оффлайн-safe.
let penSoundEnabled = false;
const K_PEN_VOL = 'dusk_pen_vol';
let penVolume = 1;                                 // master 0..1, scales pen+hand together
let _penAC = null, _penBuf = null, _penLoading = null, _penVoices = 0, _penLastL = -1;
const PEN_GRAINS = {"letters":[{"s":0,"d":0.146},{"s":0.146,"d":0.156},{"s":0.302,"d":0.186},{"s":0.488,"d":0.136},{"s":0.624,"d":0.136},{"s":0.76,"d":0.136},{"s":0.896,"d":0.191},{"s":1.087,"d":0.171},{"s":1.258,"d":0.141},{"s":1.399,"d":0.131},{"s":1.53,"d":0.171},{"s":1.701,"d":0.181},{"s":1.882,"d":0.136},{"s":2.018,"d":0.206},{"s":2.224,"d":0.161},{"s":2.385,"d":0.186},{"s":2.571,"d":0.176},{"s":2.747,"d":0.201},{"s":2.948,"d":0.151},{"s":3.099,"d":0.216},{"s":3.315,"d":0.216},{"s":3.531,"d":0.176},{"s":3.707,"d":0.186},{"s":3.893,"d":0.146},{"s":4.039,"d":0.146},{"s":4.185,"d":0.171},{"s":4.356,"d":0.201},{"s":4.557,"d":0.171},{"s":4.728,"d":0.151},{"s":4.879,"d":0.141},{"s":5.02,"d":0.171},{"s":5.191,"d":0.191},{"s":5.382,"d":0.131},{"s":5.513,"d":0.141},{"s":5.654,"d":0.146},{"s":5.8,"d":0.136},{"s":5.936,"d":0.156},{"s":6.092,"d":0.196},{"s":6.288,"d":0.201},{"s":6.489,"d":0.181},{"s":6.67,"d":0.131},{"s":6.801,"d":0.146},{"s":6.947,"d":0.166},{"s":7.113,"d":0.151},{"s":7.264,"d":0.176},{"s":7.44,"d":0.171},{"s":7.611,"d":0.156},{"s":7.767,"d":0.166},{"s":7.933,"d":0.151},{"s":8.084,"d":0.146},{"s":8.23,"d":0.131}],"hand":{"s":8.361,"d":0.5}};
let expandOpen       = false;
let currentPage      = 'main';
let currentNoteId    = null;   // п11: open grimoire note id (uuid) or null
let notesSearchQuery = '';     // п11: grimoire search filter
let _grimVisibleIds  = [];     // NA-9: ids of notes currently shown (order for J/K nav)
let grimMode         = 'active';// п11: 'active' (Записи) | 'archive' (Склеп)
let grimFocus        = 0;      // п11: focus level 0=both · 1=list rail · 2=list hidden (note full)
let grimNoteCollapsed = false; // п11: transient — open note's pane folded away, full-width list (click open entry to toggle)
let grimBarMode      = 'auto'; // п11: toolbar reveal — 'auto'(hover) | 'open'(pinned) | 'closed'(hidden)
let grimTocOpen      = false;  // п.14: table-of-contents rail shown (only takes effect on notes with ≥3 headings)
let _grimTocHeads    = null;   // п.14: live H1-3 elements backing the TOC items
let _grimTocSpyRAF   = 0;      // п.14: rAF throttle for the scroll-spy
let _grimVerT        = 0;      // п.15: debounced idle timer → auto version snapshot
let _grimHistId      = null;   // п.15: note id whose Летопись modal is open (or null)
let _grimHistSel     = null;   // п.15: index (into the rendered list) of the previewed version
// п.15: version history lives in its OWN localStorage key, NOT inside `state`.
// Keeping full HTML body copies out of `state` is critical for perf — `state` is
// re-stringified (and ring-backed-up) on every keystroke-save, so bloating it with
// history would make typing lag. Versions are saved only when they actually change.
const K_NOTE_VERSIONS = 'dusk_note_versions_v1';
let grimVersions     = {};     // { [noteId]: [{at, t, b, kind}] }
let _grimSaveT       = null;   // п11: debounced note-save timer
let _grimSwapT       = null;   // п11: note→note crossfade timer (fade old page out, then render new)
let grimSelectMode   = false;  // п11/1b: multi-select notes in the current segment
let grimSelectedIds  = new Set();// п11/1b: ids of notes ticked in select mode
let _grimFindRanges  = [];     // п11/A: in-note find — match Ranges in the open body
let _grimFindIdx     = 0;      // п11/A: current match index
let _grimFindActive  = false;  // п11/A: find bar shown + highlights painted
let undoStack        = [];
let redoStack        = [];   // P-A: populated by undo(), cleared by any new pushUndo()
let deadlineTimer    = null;
let selectedColor    = '#6C8EF5';  // group color picker
let selectedPriority = 'none';
let selectedFormColor = null;       // task creation color (null = no color label)
let selectedRepeat   = 'none';
let formDeadline     = null;
let editingTaskId    = null;
let editingSubId     = null;   // for subtask repeat modal

// Feature: color filter
let colorFilter      = null;   // null | CSS color string — filter tasks by label color
let noteColorFilter  = null;   // NA-10: null | CSS color string — filter grimoire records by colour

// Feature: focus mode — show only one group at a time
let focusGroupId     = null;   // null | number

// Feature: archive search
let archiveSearchQuery = '';

// Feature: notifications tracking (prevent duplicate notifications per task per deadline).
// V-2: a Map<taskId, deadlineSignature> hydrated from localStorage, so a reload no longer
// re-announces deadlines already seen. The signature (serialized deadline) lets an edited
// or snoozed deadline notify again. `.delete(id)` on snooze/clear still works unchanged.
const _notifiedDeadlines = (() => {
    try { return new Map(JSON.parse(localStorage.getItem('dusk_notified_v1')) || []); }
    catch (_) { return new Map(); }
})();

// IMP-1: track task IDs that were JUST added so only they get taskIn animation.
// Populated by addTask/duplicateTask/restoreTask/restoreSelected/restoreAll.
// Cleared at the end of createTaskEl after being consumed.
const _newTaskIds = new Set();
// NA-5: grimoire analogue — only genuinely new/restored notes replay the entrance
// stagger; pin/colour/archive/delete must not re-animate the whole list. Consumed
// in _grimLeafHTML, seeded at the note-entry points + once at init (first view).
const _newNoteIds = new Set();
let renamingGroupId  = null;
let dlCurrentMode    = 'time'; // default — updated from localStorage on init
let _dlAutoRepeat    = true;   // X-6: weektime → auto-weekly toggle (default ON; off is the non-standard one-shot mode)

// ── Deadline mode persistence key
const K_DL_MODE = 'dusk_lastDlMode';
let pendingGroupForSelector = false;
// Schedule sort mode
let isScheduleMode   = false;       // global
const scheduleModeGroups = new Set(); // per-group overrides (groupId numbers)
// P7: Split groups mode — shows active/done as two collapsible zones inside each group
let isGroupSplitMode = false;
// P-B: "Today" view — show only tasks due today or overdue, ordered by deadline.
let isTodayMode = false;

// ---- DOM REFS ----
const inputBox        = document.getElementById('input-box');
const listContainer   = document.getElementById('list-container');
const groupsContainer = document.getElementById('groups-container');
const progressBar     = document.getElementById('progress-bar');
const progressSection = document.getElementById('progress-section');
const doneCount       = document.getElementById('done-count');
const quantityCount   = document.getElementById('quantity-count');
const toolbar         = document.getElementById('toolbar');
const groupsBar       = document.getElementById('groups-bar');
const emptyState      = document.getElementById('empty-state');
const allDone         = document.getElementById('all-done');
const toast           = document.getElementById('toast');
const groupModal      = document.getElementById('group-modal');
const groupNameInput  = document.getElementById('group-name-input');
const groupsList      = document.getElementById('groups-list');
const taskGroupSelect = document.getElementById('task-group-select');
const taskNote        = document.getElementById('task-note');
const btnExpand       = document.getElementById('btn-expand');
const extraFields     = document.getElementById('extra-fields');
const searchBox       = document.getElementById('search-box');
const btnFilter       = document.getElementById('btn-filter');
const btnSound        = document.getElementById('btn-sound');
const colorPicker     = document.getElementById('group-color-picker');
const mainPage        = document.getElementById('main-page');
const archivePage     = document.getElementById('archive-page');
const notesPage       = document.getElementById('notes-page');
const archiveList     = document.getElementById('archive-list');
const archiveEmpty    = document.getElementById('archive-empty');
const archiveBadge    = document.getElementById('archive-badge');

// ---- SORTABLE ----
let sortableMain = null;
const sortableGroups = {};
const sortableSubs   = {};
const sortableZones  = {}; // keyed inner uls for schedule+split combined mode
let _setupRaf = null;   // FIX: track pending rAF so we cancel stale queued inits

const SORTABLE_OPTS = {
    animation: 200,
    delay: 120,
    delayOnTouchOnly: false,
    fallbackTolerance: 5,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    draggable: '.task-item',   // only task-items are draggable — prevents zone ULs
                               // (sched-zone-ul, split-active-body) from being
                               // treated as draggable children by parent sortables
    filter: '.btn-task-action, .task-check, .sub-check, .btn-note-toggle, .btn-subtask-toggle, .btn-sub-notes-always, input, textarea, [contenteditable="true"], .subtask-section, .task-note-wrapper, .drag-handle, .task-item.checked, .task-item.cycle-checked',
    preventOnFilter: false,
    group: {
        name: 'tasks',
        pull: true,
        put: (to, from, el) =>
            el.classList.contains('task-item') &&
            !el.classList.contains('subtask-item') &&
            !el.classList.contains('checked') &&
            !el.classList.contains('cycle-checked'),
    },
    onEnd: onDragEnd,
    onAdd: onDragAdd,
    onStart() { document.body.classList.add('is-dragging'); },
    onMove(evt) {
        const dragged = evt.dragged;
        const from    = evt.from;
        const to      = evt.to;

        // ── Drag-over portal glow — clear FIRST before any early return ───
        // ANIM-6: previous code cleared after return false paths, leaving
        // stale drag-over highlight on the last valid group when blocking a move.
        if (!prefersReducedMotion()) {
            document.querySelectorAll('.group-body.drag-over')
                .forEach(el => el.classList.remove('drag-over'));
            if (to && to.classList.contains('group-body')) to.classList.add('drag-over');
        }

        // ── Universal blocks ──────────────────────────────────────────────
        if (dragged && (dragged.classList.contains('checked') || dragged.classList.contains('cycle-checked'))) return false;
        if (to && to.dataset.zoneDone === '1') return false;

        // ── Schedule / split isolation ────────────────────────────────────
        if (isScheduleMode || isGroupSplitMode) {

            // Helper: extract numeric group-id from a container element
            const gidOf = el => {
                if (!el) return null;
                if (el.dataset.groupId !== undefined && el.dataset.groupId !== '') return el.dataset.groupId;
                if (el.id && el.id.startsWith('group-list-')) return el.id.replace('group-list-', '');
                const sec = el.closest?.('.group-section');
                return sec ? (sec.dataset.groupId ?? null) : null;
            };

            const fromGid = gidOf(from);
            const toGid   = gidOf(to);
            const sameGroup = fromGid !== null && fromGid === toGid;

            if (sameGroup) {
                // Within same group — only allow drop into the exact same zone UL.
                // Block everything else (cross-zone, done zone, bare group-body, etc.)
                if (!to.dataset.sortableGroup) return false;
                // Also block dl ↔ ndl zone crossings
                if (isScheduleMode && from.dataset.zoneDl !== undefined && to.dataset.zoneDl !== undefined) {
                    if (from.dataset.zoneDl !== to.dataset.zoneDl) return false;
                }
                // Block active → done via any adjacent element check
                if (isGroupSplitMode && to.dataset.zoneDone === '1') return false;
            } else {
                // Cross-group drop — must land in group-body (or list-container).
                // Zone ULs of different groups are NOT valid targets because
                // the dl/ndl zone of target group may not exist yet.
                // We allow group-body; onDragAdd + render() will sort into correct zone.
                const isGroupBody = to.classList.contains('group-body') || to.id === 'list-container';
                if (!isGroupBody) return false;
            }
        }
    },
};

// ============================================================
//  INIT
// ============================================================
function init() {
    loadState();
    // Ensure new state fields exist for older stored data
    if (!state.sortMode) state.sortMode = 'priority';
    if (!state.sortModeOverrides) state.sortModeOverrides = {};
    if (!state.templates) state.templates = [];              // Idea 6: task templates
    if (!state.nextTemplateId) state.nextTemplateId = 1;
    loadGrimVersions();                                       // п.15: history store (own LS key)
    _grimMigrateVersions();                                   // lift inline versions out of state + prune orphans
    loadUiState();
    applySoundPref();
    applyPenSoundPref();
    setupEventListeners();
    _labelColorSwatches(); // 6f: a11y names for colour swatches
    setupMonthdayStepper();
    setupYearStepper();
    setupRepeatMonthdayStepper();
    initSegmentedInputs();  // segmented inputs + month picker + weekday picker
    // IMP-1: seed _newTaskIds with all loaded tasks so the first render
    // shows the entrance animation exactly as before — stagger included.
    state.tasks.forEach(t => _newTaskIds.add(t.id));
    // NA-5: same for notes — the first time the grimoire list paints (page open
    // or starting on it) every leaf staggers in; thereafter only new/restored ones.
    [...(state.notes || []), ...(state.notesArchive || [])].forEach(n => _newNoteIds.add(n.id));
    render();
    // Note: setupSortables() is called inside render() via rAF — no separate call needed here.
    startDeadlineTimer();
    _initPage();
    // NA-8: fold the grimoire toolbar popovers into the shared outside-click registry
    // (was three bespoke document-click handlers). Static elements → references stable.
    // IO has two mutually-exclusive menus → per-container closers so one can't close
    // the other. The close fns are idempotent (no-op when the popover is already shut).
    registerGothicPicker(document.getElementById('grim-new-split'), _grimCloseTplMenu);
    registerGothicPicker(document.getElementById('grim-io-split'),  _grimCloseIoSplit);
    registerGothicPicker(document.getElementById('grim-io-sel'),    _grimCloseIoSel);
    // P1: archive-all icon — clone the LIVE SVG node from nav-archive tab directly.
    const navArchiveSvg = document.querySelector('#nav-archive svg');
    const btnArchiveAll = document.getElementById('btn-archive-all');
    if (navArchiveSvg && btnArchiveAll) {
        btnArchiveAll.innerHTML = '';
        btnArchiveAll.appendChild(navArchiveSvg.cloneNode(true));
    }
    // Inject gothic deadline-clear icon into the inline form X button
    const btnDlClear = document.getElementById('deadline-clear-btn');
    if (btnDlClear) btnDlClear.innerHTML = IC.deadlineClear;
    // IMP-7: unify deadline icon
    const dlTriggerIcon = document.querySelector('#deadline-trigger svg');
    if (dlTriggerIcon) dlTriggerIcon.outerHTML = IC.window;
    // NA-11: sort mode trigger (icon + option list) — gothic 3-mode picker.
    _renderTaskSortControl();
    // Notifications button initial state
    // Use Notification.permission if available; fall back to localStorage for PWA offline
    const notifBtn = document.getElementById('btn-notifications');
    if (notifBtn && 'Notification' in window) {
        const granted = Notification.permission === 'granted' ||
                        (Notification.permission === 'default' && localStorage.getItem('dusk_notif') === '1');
        notifBtn.classList.toggle('active', granted);
        notifBtn.style.display = '';
        // Keep localStorage in sync with actual API state
        if (Notification.permission === 'granted') localStorage.setItem('dusk_notif', '1');
        else if (Notification.permission === 'denied') localStorage.removeItem('dusk_notif');
    } else if (notifBtn) {
        notifBtn.style.display = 'none';
    }
    // Group DnD
    initGroupDnD();
    if (!prefersReducedMotion()) {
        playLoadAnimations();
    }
}

// ============================================================
//  LOAD ANIMATIONS  (one-shot, fire once on page open)
// ============================================================
function playLoadAnimations() {
    // ── 1. Brand name rune shimmer ────────────────────────────────
    // Fires 800ms after load so user sees the name first, then the
    // shimmer passes over it like candlelight touching an inscription.
    const brandName = document.querySelector('.brand-name');
    if (brandName) {
        setTimeout(() => {
            brandName.classList.add('shimmer-once');
            brandName.addEventListener('animationend', () => {
                brandName.classList.remove('shimmer-once');
            }, { once: true });
        }, 800);
    }

    // ── 2. Tagline "task journal" letter-by-letter fade ────────────
    // Each character gets its own span with a staggered animation-delay.
    // Space is rendered as a non-breaking space to preserve layout.
    const tagline = document.querySelector('.brand-tagline');
    if (tagline) {
        const text    = tagline.textContent;
        const letters = [...text].map((ch, i) => {
            const delay = 400 + i * 55; // start 400ms after load, 55ms/char
            const char  = ch === ' ' ? '\u00A0' : ch;
            return `<span class="tagline-letter" style="animation-delay:${delay}ms">${char}</span>`;
        }).join('');
        tagline.innerHTML = letters;
    }
}

// ============================================================
//  PERSISTENCE
// ============================================================
function saveState() {
    try { bumpUpdatedAt(); } catch (_) { /* updatedAt is best-effort — never block a save */ }
    localStorage.setItem(K_STATE, JSON.stringify(state));   // K_STATE === v4
    try { maybeBackup(); } catch (_) { /* backups must never break a save */ }
}

// ============================================================
//  RING-BUFFER BACKUPS  (P-C — safety net, rule #1 "never lose data")
//  A throttled wrapper over saveState keeps the last N full-state
//  snapshots in a separate LS key, so a bad import / mass-delete /
//  future data migration can always be rolled back from the UI.
// ============================================================
const K_BACKUPS          = 'dusk_backups_v1';
const BACKUP_RING_SIZE   = 10;               // keep the last 10 snapshots
const BACKUP_THROTTLE_MS  = 10 * 60 * 1000;  // at most one auto-snapshot / 10 min

function loadBackups() {
    try { return JSON.parse(localStorage.getItem(K_BACKUPS)) || []; }
    catch (_) { return []; }
}

/** Quota-safe write: on failure drop the oldest snapshot(s) and retry. */
function persistBackups(arr) {
    while (arr.length) {
        try { localStorage.setItem(K_BACKUPS, JSON.stringify(arr)); return true; }
        catch (_) { arr.shift(); }
    }
    try { localStorage.removeItem(K_BACKUPS); } catch (_) {}
    return false;
}

/**
 * Capture a snapshot of the just-saved state, throttled by time.
 * Skips storing a duplicate when nothing changed since the last snapshot.
 */
function maybeBackup() {
    const backups = loadBackups();
    const last = backups[backups.length - 1];
    const now = Date.now();
    if (last && now - last.ts < BACKUP_THROTTLE_MS) return;
    const json = JSON.stringify(state);
    if (last && last.json === json) { last.ts = now; persistBackups(backups); return; }
    backups.push({
        ts: now,
        json,
        counts: {
            tasks:   Array.isArray(state.tasks)   ? state.tasks.length   : 0,
            groups:  Array.isArray(state.groups)  ? state.groups.length  : 0,
            archive: Array.isArray(state.archive) ? state.archive.length : 0,
        },
    });
    while (backups.length > BACKUP_RING_SIZE) backups.shift();
    persistBackups(backups);
}

function loadState() {
    // Idea 8: prefer the v4 key. If it's absent, do the one-time v3→v4 upgrade
    // (which keeps v3 frozen as a fallback). Only if neither exists fall back to
    // the legacy migrators.
    const rawV4 = localStorage.getItem(K_STATE_V4);
    if (rawV4) {
        try {
            const loaded = JSON.parse(rawV4);
            state = { tasks: [], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1, ...loaded };
            migrateTasks(state.tasks);
            migrateTasks(state.archive);
            normalizeState();
            saveState();   // persist note plain→HTML migration once
        } catch(e) { if (!_migrateV3toV4()) migrateFromOld(); }
        return;
    }
    if (_migrateV3toV4()) return;
    migrateFromOld();
}

// Idea 8: one-time v3→v4 upgrade. Reads the FROZEN v3 key, snapshots its raw blob
// ONCE (rule #1 — a pre-migration backup that survives even if v3 is later wiped),
// assigns uid/updatedAt + the tombstones array via migrateTasks/normalizeState,
// then writes v4. v3 itself is never modified. Returns true if a v3 state existed.
function _migrateV3toV4() {
    const rawV3 = localStorage.getItem(K_STATE_V3);
    if (!rawV3) return false;
    try {
        if (!localStorage.getItem(K_PREMIGRATION)) {
            try { localStorage.setItem(K_PREMIGRATION, rawV3); } catch (_) {}
        }
        const loaded = JSON.parse(rawV3);
        state = { tasks: [], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1, ...loaded };
        migrateTasks(state.tasks);
        migrateTasks(state.archive);
        normalizeState();
        saveState();   // writes v4; v3 stays untouched as a rollback fallback
        return true;
    } catch (e) { return false; }
}

function migrateTasks(arr) {
    arr.forEach(t => {
        // Idea 8: stable sync identity + per-task timestamp (int `id` stays the DOM key).
        // Idempotent backfill — only fills what's missing, so undo/redo snapshots
        // (already carrying uids) pass through unchanged.
        if (!t.uid)       t.uid = uid();
        if (!t.updatedAt) t.updatedAt = nowTs();
        if (!t.createdAt) t.createdAt = t.updatedAt;
        if (typeof t.deadline === 'string')
            t.deadline = { mode: 'date', value: t.deadline.slice(0,10) };
        if (t.deadline && t.deadline.mode === 'full')
            t.deadline = { mode: 'date', value: t.deadline.value.slice(0,10) };
        if (t.deadline && t.deadline.mode === 'yearmonth') {
            const [, m] = t.deadline.value.split('-');
            t.deadline = { mode: 'month', value: String(parseInt(m)) };
        }
        // Fix 1 migration: weektime deadlines saved before timeSet field existed
        // all had explicit times (the old code required them), so mark timeSet: true
        if (t.deadline && t.deadline.mode === 'weektime' && t.deadline.timeSet === undefined) {
            t.deadline.timeSet = true;
        }
        if (!t.repeat)                 t.repeat = 'none';
        if (!t.cycleChecked)           t.cycleChecked = false;
        if (!t.nextReset)              t.nextReset = null;
        if (!t.subtasks)               t.subtasks = [];
        if (t.subtasksOpen === undefined) t.subtasksOpen = t.subtasks.length > 0;
        if (t.noteOpen === undefined)  t.noteOpen = false;
        if (!t.priority)               t.priority = 'none';
        if (t.pinned === undefined)    t.pinned = false; // pin feature migration
        if (t.color === undefined)     t.color = null;   // task color label migration
        // I-2: normalise groupId to number|null — DOM reads it as string, state must be number
        if (t.groupId !== undefined && t.groupId !== null) {
            t.groupId = parseInt(t.groupId) || null;
        } else {
            t.groupId = null;
        }
        t.subtasks.forEach((s, i) => {
            if (!s.id)                   s.id = (state.nextSubId++);
            if (!s.uid)                  s.uid = uid();   // Idea 8: subtasks get a uid (no own updatedAt — parent task is the merge atom)
            if (!s.priority)             s.priority = 'none';
            if (!s.note)                 s.note = '';
            if (s.order === undefined)   s.order = i;
            if (s.checked === undefined) s.checked = false;
            if (!s.repeat)               s.repeat = 'none';         // P6 migration
            if (s.cycleChecked === undefined) s.cycleChecked = false; // P6 migration
        });
    });
}

// Stable string id for new records (grimoire notes — forward-compatible with the
// planned uuid/sync data-layer; falls back if crypto.randomUUID is unavailable).
function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'n-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36);
}

// epoch-ms timestamp — matches the grimoire-notes format (createdAt/updatedAt are numbers).
function nowTs() { return Date.now(); }

// ── Idea 8: automatic per-record `updatedAt` ────────────────────────────────
// "Merge per task" — the task is the merge atom; one updatedAt per task (a subtask
// edit bumps the parent), groups carry their own. To avoid 30 hand-placed
// touch() calls (one missed site = a stale timestamp = a future merge dropping a
// real edit), updatedAt is maintained by diffing record CONTENT at save time, so
// no mutation path can forget it. _recSig holds the last-saved content signature
// per uid (timestamps excluded). primeRecSig() re-seeds WITHOUT bumping and runs
// after every whole-state swap (load/undo/redo/import/restore) from normalizeState,
// so restoring an old snapshot keeps its original timestamps instead of stamping
// everything to "now".
let _recSig = new Map();
function _contentSig(rec) {
    const { updatedAt, createdAt, ...rest } = rec;   // identity-neutral content only
    return JSON.stringify(rest);
}
function _trackedRecords() {
    const out = [];
    if (Array.isArray(state.tasks))   for (const t of state.tasks)   out.push(t);
    if (Array.isArray(state.archive)) for (const t of state.archive) out.push(t);
    if (Array.isArray(state.groups))  for (const g of state.groups)  out.push(g);
    return out;
}
function primeRecSig() {
    _recSig = new Map();
    for (const r of _trackedRecords()) if (r && r.uid) _recSig.set(r.uid, _contentSig(r));
}
function bumpUpdatedAt() {
    const now = nowTs();
    for (const r of _trackedRecords()) {
        if (!r || !r.uid) continue;
        const sig  = _contentSig(r);
        const prev = _recSig.get(r.uid);
        if (prev === undefined) { _recSig.set(r.uid, sig); continue; } // new / just-stamped → track, no bump
        if (prev !== sig) { r.updatedAt = now; _recSig.set(r.uid, sig); }
    }
}

// ── Idea 8: tombstones ──────────────────────────────────────────────────────
// A permanent deletion records a lightweight {uid,type,parentUid,deletedAt} in
// state.tombstones instead of just vanishing, so a future per-uid sync merge can
// tell "deleted" apart from "never seen" (and a stale device can't resurrect it).
// Live arrays stay clean (only live records) → render/search/sort/DnD are
// untouched. Bodies remain recoverable via undo snapshots + the ring backups +
// the frozen v3 key (rule #1). Archiving is NOT a deletion (the task lives on in
// state.archive) so it never tombstones; only a *permanent* removal does.
function addTombstone(recUid, type, parentUid) {
    if (!recUid) return;
    if (!Array.isArray(state.tombstones)) state.tombstones = [];
    state.tombstones.push({ uid: recUid, type, parentUid: parentUid || null, deletedAt: nowTs() });
}

// Ensure optional collections exist after any whole-state replacement (load,
// import, undo/redo, restore) so older snapshots without them never throw.
function normalizeState() {
    if (!Array.isArray(state.notes)) state.notes = [];
    if (!Array.isArray(state.notesArchive)) state.notesArchive = [];
    if (!Array.isArray(state.noteTemplates)) state.noteTemplates = [];   // п.12: note templates
    if (!Array.isArray(state.tombstones)) state.tombstones = [];         // Idea 8: deletion graveyard
    // Idea 8: backfill uid/updatedAt on groups (tasks/subtasks are done in migrateTasks).
    const gnow = nowTs();
    (state.groups || []).forEach(g => {
        if (!g) return;
        if (!g.uid)       g.uid = uid();
        if (!g.updatedAt) g.updatedAt = gnow;
        if (!g.createdAt) g.createdAt = g.updatedAt;
    });
    migrateNotes();   // plain-text bodies → HTML once (idempotent via note.fmt)
    primeRecSig();    // Idea 8: re-seed content signatures after this (post-swap) state — no false updatedAt bump on the next save
}

function migrateFromOld() {
    const raw2 = localStorage.getItem('todoState_v2') || localStorage.getItem('todoState');
    if (raw2) {
        try {
            const loaded = JSON.parse(raw2);
            state = { tasks: [], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1, ...loaded };
            migrateTasks(state.tasks);
            migrateTasks(state.archive || []);
            normalizeState();
            saveState();
            // L-2: clean up legacy keys so they don't linger in storage
            localStorage.removeItem('todoState_v2');
            localStorage.removeItem('todoState');
            localStorage.removeItem('data');
            return;
        } catch(e) {}
    }
    const oldHtml = localStorage.getItem('data');
    if (!oldHtml) return;
    // ── XSS-safe migration: DOMParser does not execute scripts ───
    const parser = new DOMParser();
    const doc = parser.parseFromString(oldHtml, 'text/html');
    doc.querySelectorAll('li').forEach(li => {
        const textEl = li.querySelector('.task-text');
        if (!textEl) return;
        state.tasks.push({
            id: state.nextId++, uid: uid(), createdAt: nowTs(), updatedAt: nowTs(),
            text: textEl.innerText || textEl.textContent,
            checked: li.classList.contains('checked'), priority: 'none',
            groupId: null, deadline: null, note: '', noteOpen: false,
            order: state.tasks.length,
            repeat: 'none', cycleChecked: false, nextReset: null,
            subtasks: [], subtasksOpen: false,
        });
    });
    normalizeState();   // Idea 8: backfill group uids + tombstones for legacy-imported state
    saveState();
    localStorage.removeItem('data');
}

function loadUiState() {
    isFiltered  = localStorage.getItem(K_FILTER) !== '0';
    searchQuery = localStorage.getItem(K_SEARCH) || '';
    expandOpen  = localStorage.getItem(K_EXPAND) === '1';
    currentPage = localStorage.getItem(K_PAGE)   || 'main';
    isScheduleMode = localStorage.getItem('scheduleMode') === '1';
    isGroupSplitMode = localStorage.getItem('groupSplitMode') === '1';
    isTodayMode = localStorage.getItem('todayMode') === '1';
    grimFocus = Math.max(0, Math.min(2, parseInt(localStorage.getItem('grimFocus'), 10) || 0));   // п11: focus level persists across notes/segments/reload
    { const bm = localStorage.getItem('grimBarMode'); grimBarMode = (bm === 'open' || bm === 'closed') ? bm : 'auto'; }   // п11: toolbar mode persists
    grimTocOpen = localStorage.getItem('grimTocOpen') === '1';   // п.14: TOC rail preference persists
    const smg = localStorage.getItem('scheduleModeGroups');
    if (smg) { try { JSON.parse(smg).forEach(id => scheduleModeGroups.add(id)); } catch(e){} }
    // Sort mode
    if (!state.sortMode) state.sortMode = 'priority';
    if (!state.sortModeOverrides) state.sortModeOverrides = {};
    // Color filter
    colorFilter  = localStorage.getItem('dusk_colorFilter') || null;
    noteColorFilter = localStorage.getItem('dusk_noteColorFilter') || null;   // NA-10
    // Focus group
    const fg = localStorage.getItem('dusk_focusGroup');
    focusGroupId = fg ? parseInt(fg) || null : null;

    if (searchQuery) searchBox.value = searchQuery;
    if (expandOpen)  {
        btnExpand.classList.add('open');
        extraFields.classList.add('open');
        extraFields.style.maxHeight = 'none';
    }
    btnFilter.classList.toggle('active', isFiltered);
    const schedBtn = document.getElementById('btn-schedule');
    if (schedBtn) schedBtn.classList.toggle('active', isScheduleMode);
    const todayBtn = document.getElementById('btn-today');
    if (todayBtn) todayBtn.classList.toggle('active', isTodayMode);
    const splitBtn = document.getElementById('btn-split-groups');
    if (splitBtn) splitBtn.classList.toggle('active', isGroupSplitMode);
    updateSubAnyModeBtn();
    // NA-11: sort mode trigger (icon + option list) — gothic 3-mode picker.
    _renderTaskSortControl();
    // D-1: removed dead #btn-focus-mode lookup — no such element exists (focus is
    // toggled per-group from the group header), the getElementById always returned null.
    // Color filter swatch active state
    _syncColorFilterUI();
}

function saveUiState() {
    localStorage.setItem(K_FILTER, isFiltered  ? '1' : '0');
    localStorage.setItem(K_SEARCH, searchQuery);
    localStorage.setItem(K_EXPAND, expandOpen  ? '1' : '0');
    localStorage.setItem(K_PAGE,   currentPage);
    localStorage.setItem('scheduleMode', isScheduleMode ? '1' : '0');
    localStorage.setItem('todayMode', isTodayMode ? '1' : '0');
    localStorage.setItem('scheduleModeGroups', JSON.stringify([...scheduleModeGroups]));
    localStorage.setItem('groupSplitMode', isGroupSplitMode ? '1' : '0');
    if (colorFilter) localStorage.setItem('dusk_colorFilter', colorFilter);
    else localStorage.removeItem('dusk_colorFilter');
    if (noteColorFilter) localStorage.setItem('dusk_noteColorFilter', noteColorFilter);   // NA-10
    else localStorage.removeItem('dusk_noteColorFilter');
    if (focusGroupId != null) localStorage.setItem('dusk_focusGroup', String(focusGroupId));
    else localStorage.removeItem('dusk_focusGroup');
}

function pushUndo() {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 40) undoStack.shift();
    // P-A: a fresh user action invalidates the redo timeline.
    redoStack = [];
}

// V-4: push a PRE-CAPTURED state snapshot (not the current one). Used by inline note
// editors that snapshot at edit-start, so the whole debounced edit collapses into one
// undo step even though the live value was already mutated by the autosave.
function pushUndoSnapshot(json) {
    if (json == null) return;
    undoStack.push(json);
    if (undoStack.length > 40) undoStack.shift();
    redoStack = [];
}

function undo() {
    if (!undoStack.length) { showToast('Нечего отменять'); return; }
    // P-A: remember current state so the undo itself can be redone.
    redoStack.push(JSON.stringify(state));
    if (redoStack.length > 40) redoStack.shift();
    state = JSON.parse(undoStack.pop());
    migrateTasks(state.tasks);
    migrateTasks(state.archive || []);
    normalizeState();
    saveState(); render();
    // C3-1/C3-5: undo can restore archive contents (clear/delete-from-archive),
    // so refresh the archive view + badge — render() only rebuilds the main list.
    renderArchive(); updateArchiveBadge();
    // п11: a note add/delete/edit can be undone — refresh the grimoire too.
    if (currentNoteId && ![...(state.notes || []), ...(state.notesArchive || [])].some(n => n.id === currentNoteId)) currentNoteId = null;
    renderNotes();
    // UX-4 + I-5: restore full form snapshot (text, note, priority, color,
    // repeat, deadline, group, subtasks) so the user can re-submit immediately.
    if (_undoFormSnapshot) {
        const snap = _undoFormSnapshot;
        _undoFormSnapshot = null;

        inputBox.value = snap.text;
        if (taskNote) taskNote.value = snap.note;

        // Priority
        selectedPriority = snap.priority || 'none';
        document.querySelectorAll('#priority-selector .prio-grid-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.prio === selectedPriority));

        // Color (reflects presets + the custom crystal button)
        _setFormColor(snap.color || null);

        // Repeat
        setFormRepeat(snap.repeat || 'none');

        // Deadline
        formDeadline = snap.deadline || null;
        updateFormDeadlineDisplay();
        updateRepeatAvailability(snap.deadline?.mode || null);

        // Group
        if (taskGroupSelect) {
            taskGroupSelect.value = snap.groupId || '';
            renderGroupChips(snap.groupId || '');
        }

        // Subtasks
        formSubtasks = snap.subtasks || [];
        renderFormSubtasks();

        // Pin flag (P5)
        formPinned = !!snap.pinned;
        const _pinBtn = document.getElementById('form-pin-toggle');
        if (_pinBtn) {
            _pinBtn.classList.toggle('active', formPinned);
            _pinBtn.setAttribute('aria-pressed', formPinned ? 'true' : 'false');
        }

        // Open extra-fields panel if any extra data was captured
        if (!expandOpen && (snap.deadline || snap.priority !== 'none' ||
            snap.color || snap.repeat !== 'none' || snap.subtasks.length)) {
            toggleExpand();
        }

        inputBox.focus();
        inputBox.selectionStart = inputBox.selectionEnd = inputBox.value.length;
    }
    showToast('Отменено');
}

// P-A: re-apply the most recently undone change. Mirror of undo() but without the
// add-task form-restore nicety (redo is a pure state step). Ctrl+Shift+Z / Ctrl+Y.
function redo() {
    if (!redoStack.length) { showToast('Нечего повторить'); return; }
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 40) undoStack.shift();
    state = JSON.parse(redoStack.pop());
    migrateTasks(state.tasks);
    migrateTasks(state.archive || []);
    normalizeState();
    saveState(); render();
    renderArchive(); updateArchiveBadge();
    if (currentNoteId && ![...(state.notes || []), ...(state.notesArchive || [])].some(n => n.id === currentNoteId)) currentNoteId = null;
    renderNotes();
    showToast('Повторено');
}

// ============================================================
//  PAGE NAVIGATION
// ============================================================
let _pageTransitioning = false; // IMP-8: guard against rapid double-click

// Page registry — generalised from the old binary main/archive switch so the
// grimoire (notes) is a first-class third page. Add a page here + a nav button
// + a render hook and switchPage handles it.
const PAGE_EL  = { main: mainPage, archive: archivePage, notes: notesPage };
const PAGE_TAB = { main: 'nav-main', archive: 'nav-archive', notes: 'nav-notes' };

// Per-page render hook, run when a page becomes visible.
function _renderPage(page) {
    if (page === 'archive') renderArchive();
    else if (page === 'notes') renderNotes();
}

function _updatePageTabs(page) {
    for (const p in PAGE_TAB) {
        const b = document.getElementById(PAGE_TAB[p]);
        if (b) b.classList.toggle('active', p === page);
    }
}

// Show the persisted page on load without the transition animation (and FIX the
// old latent bug where a saved non-main page left the tab inert after reload).
function _initPage() {
    for (const p in PAGE_EL) {
        const el = PAGE_EL[p];
        if (el) el.style.display = (p === currentPage) ? 'block' : 'none';
    }
    _updatePageTabs(currentPage);
    _renderPage(currentPage);
}

function switchPage(page) {
    // Reset select mode when leaving archive
    if (page !== 'archive' && selectMode) {
        selectMode = false; selectedArchiveIds.clear();
        const bar = document.getElementById('archive-select-bar');
        if (bar) bar.style.display = 'none';
        const btn = document.getElementById('btn-select-mode');
        if (btn) btn.classList.remove('active');
    }
    // Also reset main-list select mode when leaving main page
    if (page !== 'main' && mainSelectMode) {
        mainSelectMode = false; selectedTaskIds.clear();
        const bar = document.getElementById('main-select-bar');
        if (bar) bar.style.display = 'none';
        const btn = document.getElementById('btn-main-select');
        if (btn) btn.classList.remove('active');
    }
    // п11/1b: reset grimoire select mode when leaving the notes page
    if (page !== 'notes' && grimSelectMode) _grimExitSelect();
    // п11/A: dismiss the in-note find bar when leaving the notes page
    if (page !== 'notes' && _grimFindActive) grimFindClose();
    if (page === currentPage) return;
    // IMP-8: block a second transition while one is already in flight
    if (_pageTransitioning) return;

    const outEl = PAGE_EL[currentPage];
    const inEl  = PAGE_EL[page];
    if (!outEl || !inEl) return;

    // Update nav tabs immediately — tab responds at the moment of click
    currentPage = page; saveUiState();
    _updatePageTabs(page);
    _refreshShortcutsHint();   // keep an open hint in sync with the active tab (no stale set)

    // Pulse glow on the newly-active tab
    const activeTab = document.getElementById(PAGE_TAB[page]);
    if (activeTab && !prefersReducedMotion()) {
        activeTab.classList.remove('tab-just-activated');
        void activeTab.offsetWidth; // reflow to restart animation
        activeTab.classList.add('tab-just-activated');
        activeTab.addEventListener('animationend', () => activeTab.classList.remove('tab-just-activated'), { once: true });
    }

    if (prefersReducedMotion()) {
        // Instant cut — no animation
        outEl.style.display = 'none';
        inEl.style.display  = 'block';
        _renderPage(page);
        return;
    }

    // Outgoing page: rise-and-fade (the stone being lifted)
    _pageTransitioning = true;
    outEl.classList.add('page-out');
    outEl.addEventListener('animationend', () => {
        outEl.classList.remove('page-out');
        outEl.style.display = 'none';

        // Incoming page: descend through veil
        _renderPage(page);
        inEl.style.display = 'block';
        inEl.classList.add('page-in');
        inEl.addEventListener('animationend', () => {
            inEl.classList.remove('page-in');
            _pageTransitioning = false; // IMP-8: transition complete
        }, { once: true });
        // ANIM-3 fallback: if animationend doesn't fire (Safari ≤15 edge case)
        setTimeout(() => {
            if (_pageTransitioning) {
                inEl.classList.remove('page-in');
                _pageTransitioning = false;
            }
        }, 600);
    }, { once: true });
    // ANIM-3 fallback for outgoing page too
    setTimeout(() => {
        if (outEl.classList.contains('page-out')) {
            outEl.classList.remove('page-out');
            outEl.style.display = 'none';
            _renderPage(page);
            inEl.style.display = 'block';
            _pageTransitioning = false;
        }
    }, 600);
}

// ============================================================
//  GRIMOIRE (NOTES) — п11 stage 0: standalone notes page.
//  Layout "Codex" (master–detail): list of entries + one editor.
//  Multi-note, explicit title, autosave (debounced), search.
//  Notes are independent of tasks; ids are uuids (uid()).
// ============================================================
// Hand-drawn gothic glyphs used across the grimoire (no emoji / generic icons).
const GIC = {
    tomeOpen:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8 C9.5 6.3 6.2 6 3.5 7 V19.2 C6.2 18.2 9.5 18.4 12 20 C14.5 18.4 17.8 18.2 20.5 19.2 V7 C17.8 6 14.5 6.3 12 8 Z"/><path d="M12 8 V20" opacity="0.5"/><path d="M5.7 10.4 H9.2 M5.7 12.7 H9.2 M14.8 10.4 H18.3 M14.8 12.7 H18.3" stroke-width="1" opacity="0.4"/><path d="M12 2 L12.9 4.1 L15 5 L12.9 5.9 L12 8 L11.1 5.9 L9 5 L11.1 4.1 Z" fill="currentColor" stroke="none"/></svg>`,
    coffin:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2.5 H15 L18 8 L16.2 21.5 H7.8 L6 8 Z"/><path d="M8.2 5.4 H15.8" stroke-width="1" opacity="0.4"/><path d="M12 8.4 V14.6 M9.8 10.9 H14.2" stroke-width="1.3"/></svg>`,
    quill:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4 C13 5 8 9 5.5 15.5 L4 20 L8.5 18.5 C15 16 19 11 20 4 Z"/><path d="M9 15 L14 10" opacity="0.6"/></svg>`,
    // Urn with rising soul-arrow — reuses the app's archive-restore motif ("вернуть из склепа").
    restore:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20H16L17.5 22H6.5L8 20Z"/><path d="M8.5 20V14.5L7 11L8.5 8H15.5L17 11L15.5 14.5V20"/><line x1="10" y1="11" x2="14" y2="11" stroke-width="1.1" opacity="0.7"/><line x1="12" y1="2.5" x2="12" y2="7"/><path d="M9.5 5L12 2.5L14.5 5"/></svg>`,
    // Ornate hourglass with sand funnels.
    hourglass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3 H17.5 M6.5 21 H17.5"/><path d="M8 3.5 V6.5 L12 11 L16 6.5 V3.5"/><path d="M8 20.5 V17.5 L12 13 L16 17.5 V20.5"/></svg>`,
    // Gothic sword glyph (the app's .dl-month-chevron) — CSS rotates it to point left.
    back:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="17"/><path d="M9 5L12 2L15 5"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
    // Fold affordance — a gothic grimoire that opens/closes. Expanded = open tome
    // (pages + ribbon bookmark); collapsed = clasped tome (spine bands, cross-sigil,
    // strap). CSS crossfades between the two by the .grim-note-collapsed state.
    foldOpen:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C9.7 5 6.3 5 4.2 6.1v12.6C6.3 17.7 9.7 17.7 12 19.2 14.3 17.7 17.7 17.7 19.8 18.7V6.1C17.7 5 14.3 5 12 6.5Z"/><path d="M12 6.5V19.2"/><path d="M6.2 9.6h3.4M6.2 12.1h3.4M6.2 14.6h2.4" opacity=".5"/><path d="M14.4 9.6h3.4M14.4 12.1h3.4M15.4 14.6h2.4" opacity=".5"/><path d="M12 19.2v2.6l1-.95 1 .95v-2.6"/></svg>`,
    foldClosed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 3.7h9.9a1.4 1.4 0 0 1 1.4 1.4v13.8a1.4 1.4 0 0 1-1.4 1.4H6.6Z"/><path d="M9.3 3.7v16.6"/><path d="M6.6 7h2.7M6.6 17h2.7" opacity=".6"/><path d="M13.4 8v5.3M10.9 10.65h5"/><path d="M12.2 15.8h3.6" opacity=".5"/><path d="M17.9 9.9h1.3a.55.55 0 0 1 .55.55v2.6a.55.55 0 0 1-.55.55h-1.3"/></svg>`,
    // п.14 TOC toggle — marginal rubric: a scribe's brace clasping ruled lines, each
    // led by an illuminated initial (dot). Reads as "the index of a long codex".
    toc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 4.5C5 4.5 5 6 5 6v12s0 1.5 1.5 1.5"/><line x1="9" y1="7.5" x2="18" y2="7.5"/><line x1="9" y1="12" x2="18" y2="12"/><line x1="9" y1="16.5" x2="15" y2="16.5"/><circle cx="7.4" cy="7.5" r=".95" fill="currentColor" stroke="none"/><circle cx="7.4" cy="12" r=".95" fill="currentColor" stroke="none"/><circle cx="7.4" cy="16.5" r=".95" fill="currentColor" stroke="none"/></svg>`,
    // Tiny lancet-arch bullet for H1 rows in the TOC panel.
    tocArch: `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 7.5c0-3.4 8-3.4 8 0"/></svg>`,
    // п.14 TOC collapse — dedicated glyph: a gothic blade (the app's sword motif) thrust
    // RIGHTward into a lancet edge-pillar, flanked by two index lines → "tuck the index
    // away into the margin". Intuitive collapse-to-the-side, strictly gothic + detailed.
    tocClose: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.6 4.4V19.6"/><path d="M17.8 5.9C18.3 4 20.9 4 21.4 5.9"/><path d="M18 19.6H21.2" opacity="0.85"/><path d="M3.4 7H11.5" opacity="0.5"/><path d="M3.4 17H11.5" opacity="0.5"/><path d="M3.2 12H15"/><path d="M11.6 8.7L15.3 12L11.6 15.3"/><path d="M6 10.2V13.8"/><circle cx="3.3" cy="12" r="1" fill="currentColor" stroke="none"/></svg>`,
    // п.15 «Летопись» (история версий) — winged hourglass / memento mori: an hourglass
    // with serif frame bars, sand in both bulbs + falling stream, flanked by three
    // tiers of feathered wings. Ornate, strictly gothic, distinct from the plain
    // hourglass (= createdAt) and quill (= updatedAt) used in the meta line.
    chronicle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.4 4.4H15.6"/><path d="M8.2 3.5V5.3M15.8 3.5V5.3" stroke-width="1.1" opacity=".6"/><path d="M8.4 19.6H15.6"/><path d="M8.2 18.7V20.5M15.8 18.7V20.5" stroke-width="1.1" opacity=".6"/><path d="M9.3 5V7.3L12 11L14.7 7.3V5"/><path d="M9.3 19V16.7L12 13L14.7 16.7V19"/><path d="M10.2 6.5H13.8" stroke-width="1.1" opacity=".7"/><path d="M12 11.2V13.1" stroke-width="1" opacity=".85"/><path d="M10.5 18.1C11.3 17 12.7 17 13.5 18.1" stroke-width="1.1" opacity=".7"/><path d="M8.5 8.1C6.1 7.3 4.1 7.9 2.9 9.4C4.5 9.1 5.6 9.4 6.6 10.2"/><path d="M8.3 10.5C6.2 10.1 4.5 10.7 3.4 11.9C4.8 11.6 5.9 11.9 6.9 12.5" opacity=".85"/><path d="M8.4 12.7C6.7 12.4 5.4 13 4.6 14C5.8 13.8 6.6 14 7.3 14.6" opacity=".62"/><path d="M15.5 8.1C17.9 7.3 19.9 7.9 21.1 9.4C19.5 9.1 18.4 9.4 17.4 10.2"/><path d="M15.7 10.5C17.8 10.1 19.5 10.7 20.6 11.9C19.2 11.6 18.1 11.9 17.1 12.5" opacity=".85"/><path d="M15.6 12.7C17.3 12.4 18.6 13 19.4 14C18.2 13.8 17.4 14 16.7 14.6" opacity=".62"/></svg>`,
    // п.15 modal dismiss — two crossed gothic daggers (blades, cross-guards, round
    // pommels) forming an X. Detailed + gothic; reads "close", distinct from the
    // single dagger (= destructive delete) used elsewhere.
    dismiss: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.6 5.6L16 16"/><path d="M16 16L18.7 18.7" stroke-width="2.4"/><path d="M4.0 7.0L7.0 4.0" opacity=".9"/><circle cx="3.9" cy="3.9" r=".95" fill="currentColor" stroke="none"/><path d="M18.4 5.6L8 16"/><path d="M8 16L5.3 18.7" stroke-width="2.4"/><path d="M20 7.0L17 4.0" opacity=".9"/><circle cx="20.1" cy="3.9" r=".95" fill="currentColor" stroke="none"/></svg>`,
    // Symmetric divider ornament (diamond flanked by two beads, centred about x=20).
    dividerFleur: `<svg viewBox="0 0 40 12" width="40" height="12" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="2.1"/><path d="M20 1.4 L24 6 L20 10.6 L16 6 Z" fill="currentColor" stroke="none"/><circle cx="34" cy="6" r="2.1"/></svg>`,
    // Focus toggle — list-rail glyph with an arrow (CSS flips it when focus is on).
    focus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5V19.5"/><path d="M20 4.5V19.5" stroke-opacity="0.4"/><path d="M16 12H9"/><path d="M12 9l-3 3 3 3"/></svg>`,
    // Focus CYCLE — layout shown as two gothic lancet panels (list | page); the list
    // panel narrows then vanishes across the three levels. [0]=both · [1]=rail · [2]=note full.
    focusLvl: [
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 19V10L6.25 6L9 10V19Z"/><path d="M11 19V10L15.75 6L20.5 10V19Z" stroke-opacity="0.4"/></svg>`,
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 19V11L4.75 8L6 11V19Z"/><path d="M8 19V10L14.25 6L20.5 10V19Z" stroke-opacity="0.4"/></svg>`,
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 19V9.5L12 4L20.5 9.5V19Z"/><path d="M9.4 13.1 12 15.7 14.6 13.1" stroke-opacity="0.45"/></svg>`,
    ],
    // Toolbar manual control — the scriptorium ribbon drawn in its own state:
    // auto = dashed ghost (reveals on hover) · open = solid ribbon pinned by a tack ·
    // closed = furled/rolled scroll (tucked away).
    barLvl: {
        auto:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8.5h14a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 5 8.5Z" stroke-dasharray="2.4 2.2"/><path d="M8 10.6v2.8M12 10.6v2.8M16 10.6v2.8" stroke-opacity="0.55"/></svg>`,
        open:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8.5h14a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 5 8.5Z"/><path d="M8 10.6v2.8M12 10.6v2.8M16 10.6v2.8"/></svg>`,
        closed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.3h11M6.5 14.7h11"/><path d="M6.5 9.3a2.7 2.7 0 1 0 0 5.4M17.5 9.3a2.7 2.7 0 1 1 0 5.4"/><path d="M9 12h6" stroke-opacity="0.5"/></svg>`,
    },
};
// Focus-cycle labels (tooltip describes what a click DOES next).
const GRIM_FOCUS_TITLE = ['Свернуть список в рейл', 'Скрыть список — заметка во весь экран', 'Показать список'];
// Toolbar-mode labels.
const GRIM_BAR_TITLE = { auto: 'Тулбар: по наведению — нажмите, чтобы закрепить', open: 'Тулбар закреплён — нажмите, чтобы скрыть', closed: 'Тулбар скрыт — нажмите для режима «по наведению»' };
// п.14 TOC button label.
const GRIM_TOC_TITLE = 'Оглавление — разделы записи';

function grimDate(ms) {
    if (!ms) return '';
    const d = new Date(ms), now = new Date();
    const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
    if (d.toDateString() === now.toDateString()) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `сегодня · ${hh}:${mm}`;
    }
    const sameYear = d.getFullYear() === now.getFullYear();
    return `${d.getDate()} ${months[d.getMonth()]}${sameYear ? '' : ' ' + d.getFullYear()}`;
}

// Records for the current segment (active = Записи, archive = Склеп).
function _grimList() {
    return (grimMode === 'archive' ? state.notesArchive : state.notes) || [];
}
function _grimCurrentNote() {
    return _grimList().find(n => n.id === currentNoteId) || null;
}

// ============================================================
//  п.15 — ЛЕТОПИСЬ (version history)
//  Per-note `versions: [{at, t, b, kind}]` — kind 'auto' (silent snapshots) or
//  'backup' (the state saved automatically right BEFORE a restore, kept in a
//  separate section so the user can always get back what they rolled away from).
//  Auto-snapshots fire on a ~10s edit pause and when leaving the note; identical
//  consecutive states are deduped. Old autos are thinned (last hour kept whole,
//  then 1/hour for a day, then 1/day for a week) so the log stays small.
// ============================================================
const GRIM_VER_IDLE = 10000;   // ms of edit-silence before an auto snapshot
const GRIM_VER_MAX  = 80;      // hard cap on kept auto snapshots (safety bound)
const GRIM_VER_BACKUPS = 12;   // hard cap on kept pre-restore backups

function loadGrimVersions() {
    try { grimVersions = JSON.parse(localStorage.getItem(K_NOTE_VERSIONS)) || {}; }
    catch (_) { grimVersions = {}; }
    if (!grimVersions || typeof grimVersions !== 'object' || Array.isArray(grimVersions)) grimVersions = {};
}
// Persist the version store on its own — cheap (history only) and called ONLY when
// a version actually changes, never on the per-keystroke save path.
function saveGrimVersions() {
    try { localStorage.setItem(K_NOTE_VERSIONS, JSON.stringify(grimVersions)); } catch (_) { /* quota */ }
}
function _grimVersionsOf(id) {
    if (!Array.isArray(grimVersions[id])) grimVersions[id] = [];
    return grimVersions[id];
}
// One-time lift: older builds (and seeded test data) stored versions inline on the
// note (`note.versions`) — move them into the standalone store and strip the field
// so `state` stops carrying history. Then drop history for notes that no longer
// exist (orphans) so the store can't grow forever.
function _grimMigrateVersions() {
    let moved = false, pruned = false;
    const lift = n => {
        if (Array.isArray(n.versions) && n.versions.length && !grimVersions[n.id]) {
            grimVersions[n.id] = n.versions.slice();
            moved = true;
        }
        if (n && 'versions' in n) { delete n.versions; moved = true; }
    };
    (state.notes || []).forEach(lift);
    (state.notesArchive || []).forEach(lift);
    const live = new Set([...(state.notes || []), ...(state.notesArchive || [])].map(n => n.id));
    for (const id in grimVersions) { if (!live.has(id)) { delete grimVersions[id]; pruned = true; } }
    if (moved) saveState();
    if (moved || pruned) saveGrimVersions();
}
// NA-3: restore the «Летопись» version store from an imported backup (top-level
// `_grimVersions`). 'replace' wipes local history and takes the file's wholesale;
// 'merge' keeps local and only adds history for note ids we don't already track.
// Then _grimMigrateVersions() lifts any inline note.versions (older files) and
// prunes orphans whose note didn't come across.
function _grimRestoreVersions(loaded, mode) {
    if (mode === 'replace') grimVersions = {};
    delete state._grimVersions;   // never let the backup key linger inside state
    const src = loaded && loaded._grimVersions;
    if (src && typeof src === 'object' && !Array.isArray(src)) {
        for (const id in src) {
            if (!Array.isArray(src[id])) continue;
            if (mode === 'replace' || !grimVersions[id]) grimVersions[id] = src[id].slice();
        }
    }
    _grimMigrateVersions();
    saveGrimVersions();
}

// Take a snapshot of `note` if it differs from the latest stored version.
// Returns true if a version was actually pushed (caller persists via saveGrimVersions).
function _grimSnapshot(note, kind) {
    if (!note) return false;
    const t = note.title || '', b = note.body || '';
    if (!t.trim() && !b.trim()) return false;            // nothing worth keeping yet
    const arr = _grimVersionsOf(note.id);
    if (kind !== 'backup') {
        const last = arr[arr.length - 1];
        if (last && last.t === t && last.b === b) return false;   // dedup identical autos
    }
    arr.push({ at: Date.now(), t, b, kind: kind === 'backup' ? 'backup' : 'auto' });
    _grimThinVersions(note.id);
    return true;
}

// Smart thinning: keep every auto < 1h old, 1 per hour up to a day, 1 per day up
// to a week, drop older. Backups are never thinned (only capped). Newest auto is
// always kept. Mutates grimVersions[id] in place.
function _grimThinVersions(id) {
    const vs = grimVersions[id] || [];
    const now = Date.now(), H = 3600e3, D = 86400e3;
    const autos = vs.filter(v => v.kind !== 'backup').sort((a, b) => a.at - b.at);
    const backs = vs.filter(v => v.kind === 'backup').sort((a, b) => a.at - b.at);
    const newest = autos[autos.length - 1];
    const bucket = new Map();   // bucketKey → newest version in that bucket
    const fresh = [];
    autos.forEach(v => {
        const age = now - v.at;
        if (v === newest || age < H) { fresh.push(v); return; }   // always keep newest + last hour
        if (age > 7 * D) return;                                   // older than a week → drop
        bucket.set(age < D ? 'h' + Math.floor(v.at / H) : 'd' + Math.floor(v.at / D), v);
    });
    let keptAutos = [...bucket.values(), ...fresh].sort((a, b) => a.at - b.at);
    if (keptAutos.length > GRIM_VER_MAX) keptAutos = keptAutos.slice(keptAutos.length - GRIM_VER_MAX);
    const keptBacks = backs.length > GRIM_VER_BACKUPS ? backs.slice(backs.length - GRIM_VER_BACKUPS) : backs;
    grimVersions[id] = [...keptAutos, ...keptBacks].sort((a, b) => a.at - b.at);
}

// Fired by the idle timer — snapshot the open note after an edit pause. Persists
// ONLY the version store (a tiny, separate key) — never touches `state`/maybeBackup,
// so this can't cause a typing freeze.
function _grimVersionTick() {
    _grimVerT = 0;
    if (_grimSnapshot(_grimCurrentNote(), 'auto')) saveGrimVersions();
}

// Snapshot the open note now (called when leaving/closing it). Clears the pending
// idle timer so we don't double-fire. Persists the version store if it changed.
function _grimSnapshotCurrent() {
    if (_grimVerT) { clearTimeout(_grimVerT); _grimVerT = 0; }
    if (_grimSnapshot(_grimCurrentNote(), 'auto')) { saveGrimVersions(); return true; }
    return false;
}

// (Re)arm the idle snapshot timer — called on every body/title edit.
function _grimScheduleVersion() {
    if (_grimVerT) clearTimeout(_grimVerT);
    _grimVerT = setTimeout(_grimVersionTick, GRIM_VER_IDLE);
}

// --- Летопись modal -----------------------------------------------------------
function _grimHistNote() { return (state.notes || []).find(n => n.id === _grimHistId) || null; }

// Compact gothic timestamp for a version row ("сегодня · 14:32", "вчера · 09:10",
// "3 июн · 22:05"). Distinct from grimDate (which omits the clock for past days).
function _grimVerStamp(ms) {
    const d = new Date(ms), now = new Date();
    const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const y = new Date(now); y.setDate(now.getDate() - 1);
    let day;
    if (d.toDateString() === now.toDateString()) day = 'сегодня';
    else if (d.toDateString() === y.toDateString()) day = 'вчера';
    else day = `${d.getDate()} ${months[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? '' : ' ' + d.getFullYear()}`;
    return `${day} · ${hh}:${mm}`;
}
function _grimAgo(ms) {
    const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    if (s < 60) return 'только что';
    const m = Math.floor(s / 60); if (m < 60) return m + ' мин назад';
    const h = Math.floor(m / 60); if (h < 24) return h + ' ч назад';
    return Math.floor(h / 24) + ' дн назад';
}

// Open the version history. Snapshot the live note first so its current state is
// always present as the newest entry, then build the overlay.
function grimOpenHistory(id) {
    const note = (state.notes || []).find(n => n.id === id);
    if (!note) return;
    if (_grimSnapshot(note, 'auto')) saveGrimVersions();
    _grimHistId = id;
    const vs = _grimVersionsOf(id);
    _grimHistSel = vs.length ? vs[vs.length - 1].at : null;   // preview newest by default
    let ov = document.getElementById('grim-hist-ov');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'grim-hist-ov';
        ov.className = 'grim-hist-ov';
        ov.addEventListener('click', e => { if (e.target === ov) grimCloseHistory(); });
        document.body.appendChild(ov);
    }
    // NA-8: a11y parity with the standard modal controller (U-1/U-2) — remember the
    // trigger to restore focus on close, move focus inside, and trap Tab within the dialog.
    ov._returnFocus = document.activeElement;
    if (!ov._trap) {
        // NA-8 (fix): the trap listens on DOCUMENT in capture, not on `ov`. The modal
        // rebuilds its innerHTML on every version preview (_grimRenderHistory), which
        // destroys the focused button → activeElement drops to <body>, OUTSIDE `ov`. A
        // listener bound to `ov` then never sees the next Tab (it no longer bubbles through
        // ov) and focus escapes to the page behind. A document-capture listener always
        // fires; when focus has left the dialog we pull it back in.
        ov._trap = (e) => {
            if (e.key !== 'Tab') return;
            const els = Array.from(ov.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
            if (!els.length) return;
            const first = els[0], last = els[els.length - 1];
            if (!ov.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
            if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
            else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
        };
        document.addEventListener('keydown', ov._trap, true);
    }
    _grimRenderHistory();
    requestAnimationFrame(() => requestAnimationFrame(() => {
        ov.classList.add('open');
        const focusable = Array.from(ov.querySelectorAll(FOCUSABLE));
        if (focusable.length) focusable[0].focus();
    }));
}
function grimCloseHistory() {
    const ov = document.getElementById('grim-hist-ov');
    _grimHistId = null; _grimHistSel = null;
    if (!ov) return;
    if (ov._trap) { document.removeEventListener('keydown', ov._trap, true); ov._trap = null; }
    // Return focus to the control that opened the Летопись (NA-8).
    const rf = ov._returnFocus; ov._returnFocus = null;
    if (rf && typeof rf.focus === 'function') rf.focus();
    ov.classList.remove('open');
    setTimeout(() => { const o = document.getElementById('grim-hist-ov'); if (o && !o.classList.contains('open')) o.remove(); }, 340);
}
function grimHistSelect(at) { _grimHistSel = at; _grimRenderHistory(); }

function _grimRenderHistory() {
    const ov = document.getElementById('grim-hist-ov');
    if (!ov) return;
    const note = _grimHistNote();
    if (!note) { grimCloseHistory(); return; }
    const vs = _grimVersionsOf(note.id).slice().sort((a, b) => b.at - a.at);   // newest first
    const autos = vs.filter(v => v.kind !== 'backup');
    const backs = vs.filter(v => v.kind === 'backup');
    const newestAt = autos.length ? autos[0].at : null;
    if ((_grimHistSel == null || !vs.some(v => v.at === _grimHistSel)) && vs.length) _grimHistSel = vs[0].at;
    const sel = vs.find(v => v.at === _grimHistSel) || null;

    const itemHTML = v => {
        const isNow = v.kind !== 'backup' && v.at === newestAt;
        const cls = 'grim-hist-item' + (v.at === _grimHistSel ? ' active' : '') + (v.kind === 'backup' ? ' backup' : '');
        const tag = v.kind === 'backup' ? '<span class="grim-hist-tag back">бэкап</span>'
            : isNow ? '<span class="grim-hist-tag now">сейчас</span>' : '';
        const title = (v.t || '').trim() || 'Без заглавия';
        const words = _grimPlain(v.b || '').trim().split(/\s+/).filter(Boolean).length;
        return `<button type="button" class="${cls}" onclick="grimHistSelect(${v.at})">
            <span class="grim-hist-when">${_grimVerStamp(v.at)}${tag}</span>
            <span class="grim-hist-ttl">${escHtml(title)}</span>
            <span class="grim-hist-sub">${_grimAgo(v.at)} · ${words} сл.</span>
        </button>`;
    };

    let list = '';
    if (backs.length) list += `<div class="grim-hist-sect back">Перед откатами</div>` + backs.map(itemHTML).join('');
    list += `<div class="grim-hist-sect">Снимки${autos.length ? ' · ' + autos.length : ''}</div>`;
    list += autos.length ? autos.map(itemHTML).join('') : `<div class="grim-hist-empty">Снимков пока нет</div>`;

    let preview;
    if (sel) {
        const isNow = sel.kind !== 'backup' && sel.at === newestAt;
        const title = (sel.t || '').trim() || 'Без заглавия';
        const action = isNow
            ? `<span class="grim-hist-cur">текущая версия</span>`
            : `<button type="button" class="grim-hist-restore" onclick="grimHistRestore(${sel.at})">${GIC.restore}<span>Восстановить</span></button>`;
        preview = `<div class="grim-hist-pv-head">
            <span class="grim-hist-pv-when">${GIC.chronicle}<span>${_grimVerStamp(sel.at)}</span></span>
            ${action}
          </div>
          <div class="grim-hist-pv-title${(sel.t || '').trim() ? '' : ' untitled'}">${escHtml(title)}</div>
          <div class="grim-hist-pv-body grim-body" contenteditable="false">${(sel.b || '').trim() ? sel.b : '<p class="grim-hist-blank">— пустая запись —</p>'}</div>`;
    } else {
        preview = `<div class="grim-hist-empty big">Эта запись ещё без летописи.<br>Снимки появятся по мере правок.</div>`;
    }

    // NA-8 (fix): rebuilding innerHTML destroys whatever was focused inside the
    // dialog (e.g. the version button just clicked via keyboard), dropping focus to
    // <body>. If focus was inside, restore it to the now-active entry so keyboard
    // users keep their place and focus never leaves the modal.
    const hadFocus = ov.contains(document.activeElement);
    ov.innerHTML = `<div class="grim-hist-modal" role="dialog" aria-modal="true" aria-label="Летопись записи">
      <div class="grim-hist-bar">
        <span class="grim-hist-title">${GIC.chronicle}<span>Летопись</span></span>
        <button type="button" class="grim-hist-x" onclick="grimCloseHistory()" title="Закрыть летопись" aria-label="Закрыть">${GIC.dismiss}</button>
      </div>
      <div class="grim-hist-cols">
        <aside class="grim-hist-list">${list}</aside>
        <section class="grim-hist-pv">${preview}</section>
      </div>
    </div>`;
    if (hadFocus) {
        const tgt = ov.querySelector('.grim-hist-item.active') || ov.querySelector(FOCUSABLE);
        if (tgt) tgt.focus();
    }
}

// Roll the note back to a stored version. Before overwriting, save the current
// state as a 'backup' version (kept in the separate «Перед откатами» section) AND
// push a global undo step, so the rolled-away state is recoverable two ways.
function grimHistRestore(at) {
    const note = _grimHistNote();
    if (!note) return;
    const v = _grimVersionsOf(note.id).find(x => x.at === at);
    if (!v) return;
    pushUndo();                       // global Ctrl+Z / toast-undo (note body lives in state)
    _grimSnapshot(note, 'backup');    // durable safety copy of what we roll away from
    saveGrimVersions();
    note.title = v.t;
    note.body = v.b;
    note.updatedAt = Date.now();
    delete note.ord;                  // edited → bubble to top
    saveState();
    renderNotes();                    // rebuilds the open detail with the restored body
    grimCloseHistory();
    showToast('Версия восстановлена · прежняя сохранена в «Перед откатами»', { undo: true });
}
// Esc closes the Летопись modal (when no inner editing is in play).
document.addEventListener('keydown', e => { if (e.key === 'Escape' && _grimHistId) grimCloseHistory(); });
// Top-level: sync the toolbar (segment + new btn), then show either the big
// empty state or the master–detail layout and (re)draw both panes.
function renderNotes() {
    const page = document.getElementById('notes-page');
    if (!page) return;
    _grimHideTableUI();   // drop any floating table picker/tools on (re)render
    const segA = document.getElementById('grim-seg-active');
    const segR = document.getElementById('grim-seg-archive');
    if (segA) segA.classList.toggle('active', grimMode === 'active');
    if (segR) segR.classList.toggle('active', grimMode === 'archive');
    _refreshShortcutsHint();   // keep an open hint in sync with the «Записи»/«Склеп» segment
    const segRc = document.getElementById('grim-seg-count');
    if (segRc) { const n = (state.notesArchive || []).length; segRc.textContent = n || ''; segRc.style.display = n ? '' : 'none'; }
    const newSplit = document.getElementById('grim-new-split');
    if (newSplit) {
        const showNew = (grimMode === 'active' && !grimSelectMode);
        newSplit.style.display = showNew ? '' : 'none';
        if (!showNew) _grimCloseTplMenu();   // never leave the templates popover open when hidden
    }
    // п.13: «Перенос» (import+export) — active mode, outside select; valid even with zero notes.
    const ioSplit = document.getElementById('grim-io-split');
    if (ioSplit) {
        const showIo = (grimMode === 'active' && !grimSelectMode);
        ioSplit.style.display = showIo ? '' : 'none';
        if (!showIo) _grimCloseIoMenu();
    }
    // п.6: «Опустошить склеп» — only in the crypt, when it holds records, outside select mode.
    const emptyBtn = document.getElementById('grim-empty-crypt');
    if (emptyBtn) {
        const show = grimMode === 'archive' && !grimSelectMode && (state.notesArchive || []).length;
        emptyBtn.style.display = show ? '' : 'none';
        if (!show) _disarmEmptyCrypt(emptyBtn);   // never leave it armed when it hides
    }
    // п11/1b: select toggle (only when the current segment has records) + the bulk bar.
    const hasList = !!_grimList().length;
    const selBtn = document.getElementById('grim-select-btn');
    if (selBtn) { selBtn.style.display = (hasList && !grimSelectMode) ? '' : 'none'; }
    const selBar = document.getElementById('grim-select-bar');
    if (selBar) selBar.style.display = grimSelectMode ? 'flex' : 'none';
    if (grimSelectMode) {
        // archive→склеп only in Записи; вернуть only in Склеп; delete in both.
        const ba = document.getElementById('grim-bulk-archive');
        const br = document.getElementById('grim-bulk-restore');
        if (ba) ba.style.display = grimMode === 'active'  ? '' : 'none';
        if (br) br.style.display = grimMode === 'archive' ? '' : 'none';
        _updateGrimSelectBar();
    }

    const layoutEl = document.getElementById('grim-layout');
    const emptyEl  = document.getElementById('grim-empty');
    if (!layoutEl || !emptyEl) return;
    if (!_grimList().length) {
        layoutEl.style.display = 'none';
        emptyEl.style.display = 'flex';
        emptyEl.innerHTML = _grimEmptyHTML();
        return;
    }
    emptyEl.style.display = 'none';
    layoutEl.style.display = '';
    renderGrimList(!prefersReducedMotion());   // animate entrance on full render
    renderGrimDetail();
    layoutEl.classList.toggle('show-detail', !!currentNoteId);
    _grimApplyFocus(layoutEl);
}

// Map the current focus level onto the layout classes (only when a note is open).
function _grimApplyFocus(layoutEl) {
    if (!layoutEl) return;
    if (!currentNoteId) grimNoteCollapsed = false;        // no open note → collapse is meaningless
    const collapsed = !!currentNoteId && grimNoteCollapsed;
    // Collapse (note pane → 0, full-width list) overrides the focus levels; mirror of grim-full.
    layoutEl.classList.toggle('grim-note-collapsed', collapsed);
    const lvl = (currentNoteId && !collapsed) ? grimFocus : 0;
    layoutEl.classList.toggle('grim-focus', lvl === 1);   // list → narrow rail
    layoutEl.classList.toggle('grim-full',  lvl === 2);   // list hidden → note fills container
}

// Desktop: fold the open record's pane away to browse the full-width list (selection kept),
// or expand it again. Triggered by clicking the entry that is already open (toggle).
function grimToggleCollapse() {
    if (!currentNoteId) return;
    clearTimeout(_grimSaveT); saveState();   // flush pending edits before folding the editor away
    grimNoteCollapsed = !grimNoteCollapsed;
    const layoutEl = document.getElementById('grim-layout');
    const detailEl = document.getElementById('grim-detail');
    const pageEl   = detailEl && detailEl.querySelector('.grim-page');
    const desktop  = !window.matchMedia || window.matchMedia('(min-width: 641px)').matches;
    // NA-4 (option 3): pin the page's pixel width before the note pane folds to zero.
    // The fold shrinks .grim-detail to ~0 width; without a pin the heavy body re-flows
    // its text to that width — the "vertical line" artifact — and back on expand, up to
    // 1–2 s of layout. Pinned in px the body never re-flows; .grim-pin clips the fixed-width
    // page to the pane (so it can't overflow right while the pane is narrower than the pin).
    // The opacity/transform veil still masks the fold. Un-pinned on expand-settle, when the
    // pane is full again so the natural width equals the pin → no reflow then either.
    if (desktop && pageEl && grimNoteCollapsed) {
        pageEl.style.width = pageEl.getBoundingClientRect().width + 'px';
        detailEl.classList.add('grim-pin');
    }
    _grimApplyFocus(layoutEl);
    if (!grimNoteCollapsed) {                // re-expanded → restore editing + re-glue table overlay
        if (grimMode === 'active') { const bo = document.getElementById('grim-body'); if (bo) bo.focus(); }
        requestAnimationFrame(_grimReflowOverlay);
        // The pane widens as the list grows back — re-glue the overlay once it settles.
        if (layoutEl) {
            // NA-4: the layout is FLEX, not grid. The width settles via the list's
            // flex-basis (bubbles up here) and the layout's own gap — grid-template-columns
            // never transitions, so the old filter never matched: the post-settle reflow
            // never ran AND the listener leaked one per re-expand. finish() de-dupes the
            // several transitionend events; a fallback timer (just past --dur-ritual)
            // guarantees the listener is always removed even if no transition fires.
            let done = false;
            const finish = () => {
                if (done) return; done = true;
                clearTimeout(fb);
                layoutEl.removeEventListener('transitionend', onEnd);
                if (pageEl) pageEl.style.width = '';            // NA-4: un-pin once the pane is full again
                if (detailEl) detailEl.classList.remove('grim-pin');
                _grimReflowOverlay();
            };
            const onEnd = (ev) => {
                if (ev.propertyName === 'flex-basis' || ev.propertyName === 'gap') finish();
            };
            layoutEl.addEventListener('transitionend', onEnd);
            const fb = setTimeout(finish, 700);
        } else {
            if (pageEl) pageEl.style.width = '';
            if (detailEl) detailEl.classList.remove('grim-pin');
        }
    }
}

// Focus CYCLE: both → list rail → list hidden (note full container) → both.
function grimToggleFocus() {
    grimFocus = (grimFocus + 1) % 3;
    localStorage.setItem('grimFocus', String(grimFocus));   // persist across notes/segments/reload
    _grimApplyFocus(document.getElementById('grim-layout'));
    const btn = document.querySelector('.grim-focus-toggle');
    if (btn) {
        btn.innerHTML = GIC.focusLvl[grimFocus];
        btn.classList.toggle('on', grimFocus > 0);
        btn.dataset.lvl = String(grimFocus);
        btn.setAttribute('aria-label', GRIM_FOCUS_TITLE[grimFocus]);
        btn.title = GRIM_FOCUS_TITLE[grimFocus];
    }
    requestAnimationFrame(_grimReflowOverlay);   // layout width changed → re-glue table overlay
}

// Toolbar CYCLE: auto (reveal on hover) → open (pinned visible) → closed (hidden) → auto.
function grimToggleBar() {
    grimBarMode = grimBarMode === 'auto' ? 'open' : grimBarMode === 'open' ? 'closed' : 'auto';
    localStorage.setItem('grimBarMode', grimBarMode);
    _grimApplyBarMode();
    const btn = document.querySelector('.grim-bar-toggle');
    if (btn) {
        btn.innerHTML = GIC.barLvl[grimBarMode];
        btn.classList.toggle('on', grimBarMode === 'open');
        btn.dataset.mode = grimBarMode;
        btn.setAttribute('aria-label', GRIM_BAR_TITLE[grimBarMode]);
        btn.title = GRIM_BAR_TITLE[grimBarMode];
    }
}

// Reflect grimBarMode on the open page; the toolbar reveal is otherwise pure CSS.
function _grimApplyBarMode() {
    const page = document.querySelector('#grim-detail .grim-page');
    if (!page) return;
    page.classList.toggle('bar-open', grimBarMode === 'open');
    page.classList.toggle('bar-closed', grimBarMode === 'closed');
    requestAnimationFrame(_grimReflowOverlay);   // toolbar height changed → re-glue table overlay
}

// ── п.14: Table of contents (TOC) rail ───────────────────────────────────────
// A sticky right-hand index of the note's H1-3 headings, shown on long notes
// (≥3 headings). Click jumps + flashes the heading; scroll-spy lights the
// current section. The rail is a flex sibling of .grim-page-main; the table
// overlay (.grim-tctl) is unaffected (it positions by absolute screen coords).
function grimToggleToc() {
    grimTocOpen = !grimTocOpen;
    localStorage.setItem('grimTocOpen', grimTocOpen ? '1' : '0');
    _grimRefreshToc();
    _grimScheduleTableUI();    // body width changed → re-glue table seals/gutters
}

// (Re)build the rail from the live headings and gate its visibility on ≥3 of them.
function _grimRefreshToc() {
    const page = document.querySelector('#grim-detail .grim-page');
    const bo = document.querySelector('#grim-detail .grim-body');   // active OR read-only crypt body
    const panel = document.getElementById('grim-toc');
    if (!page || !bo || !panel) { _grimTocDetach(); return; }
    const heads = [...bo.querySelectorAll('h1, h2, h3')].filter(h => (h.textContent || '').trim());
    const avail = heads.length >= 3;
    const open = avail && grimTocOpen;
    page.classList.toggle('toc-avail', avail);
    page.classList.toggle('toc-open', open);
    const btn = page.querySelector('.grim-toc-toggle');
    if (btn) btn.classList.toggle('on', open);
    if (!open) { panel.innerHTML = ''; _grimTocDetach(); return; }
    const lvl = h => (h.tagName === 'H1' ? 1 : h.tagName === 'H2' ? 2 : 3);
    let nav = '';
    heads.forEach((h, i) => {
        const gl = lvl(h) === 1 ? GIC.tocArch : '';
        nav += `<button type="button" class="grim-toc-item l${lvl(h)}" data-i="${i}"><span class="gtoc-gl">${gl}</span><span class="gtoc-tx">${escHtml((h.textContent || '').trim())}</span></button>`;
    });
    panel.innerHTML = `<div class="grim-toc-inner"><div class="grim-toc-scroll"><div class="grim-toc-head">${GIC.toc}<span>Оглавление</span><button type="button" class="grim-toc-close" onclick="grimToggleToc()" title="Свернуть оглавление" aria-label="Свернуть оглавление">${GIC.tocClose}</button></div><nav class="grim-toc-nav">${nav}</nav></div></div>`;
    panel.querySelectorAll('.grim-toc-item').forEach(b => b.addEventListener('click', () => _grimTocGo(parseInt(b.dataset.i, 10))));
    _grimTocHeads = heads;
    window.removeEventListener('scroll', _grimTocSpyScroll, true);
    window.addEventListener('scroll', _grimTocSpyScroll, true);
    _grimTocSpy();
}

// Detach the scroll-spy (note closed / TOC hidden / page rebuilt).
function _grimTocDetach() {
    window.removeEventListener('scroll', _grimTocSpyScroll, true);
    _grimTocHeads = null;
    if (_grimTocSpyRAF) { cancelAnimationFrame(_grimTocSpyRAF); _grimTocSpyRAF = 0; }
}

function _grimTocSpyScroll() {
    if (_grimTocSpyRAF) return;
    _grimTocSpyRAF = requestAnimationFrame(() => { _grimTocSpyRAF = 0; _grimTocSpy(); });
}

// Light the TOC item whose heading is the last one to have crossed the top line.
function _grimTocSpy() {
    const panel = document.getElementById('grim-toc');
    if (!panel || !_grimTocHeads || !_grimTocHeads.length) return;
    const items = panel.querySelectorAll('.grim-toc-item');
    if (!items.length) return;
    const TOP = 104;   // a heading becomes "current" once it passes this viewport line
    let active = 0;
    _grimTocHeads.forEach((h, i) => { if (h.getBoundingClientRect().top - TOP <= 4) active = i; });
    items.forEach((it, i) => it.classList.toggle('active', i === active));
}

// Click a TOC entry → smooth-scroll to the heading + brief illumination.
function _grimTocGo(i) {
    if (!_grimTocHeads || !_grimTocHeads[i]) return;
    const h = _grimTocHeads[i];
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    h.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    h.classList.remove('grim-toc-flash'); void h.offsetWidth; h.classList.add('grim-toc-flash');
    setTimeout(() => h.classList.remove('grim-toc-flash'), 1200);
    const panel = document.getElementById('grim-toc');
    if (panel) panel.querySelectorAll('.grim-toc-item').forEach((it, j) => it.classList.toggle('active', j === i));
}

function _grimEmptyHTML() {
    if (grimMode === 'archive') {
        return `<div class="grim-empty-ic">${GIC.coffin}</div>
            <p>Склеп пуст</p>
            <span class="grim-empty-sub">Здесь покоятся отправленные в архив записи</span>`;
    }
    return `<div class="grim-empty-ic">${GIC.tomeOpen}</div>
        <p>Гримуар пуст</p>
        <span class="grim-empty-sub">Ни одной записи ещё не начертано</span>
        <button class="grim-new-btn grim-empty-btn" onclick="grimNew()">${GIC.quill}<span>Начертать первую</span></button>`;
}

// ── п.7: list sort order ──────────────────────────────────────────────────────────
// 'manual' keeps the drag order (the default); the rest are computed orderings that
// disable DnD. Persisted in state.notesSort.
// «По правке» is a HYBRID: records sort by edit recency by default, but a manual DnD
// drag pins a record's spot (sticky `ord`); editing it again clears `ord` so it re-floats
// to the top. So drag-to-arrange and edit-bubbling coexist — no separate «Вручную» mode.
// «По созданию» / «По заглавию» are strict computed orders (DnD disabled).
const GRIM_SORTS = [
    { k: 'edited',  label: 'По правке'    },
    { k: 'created', label: 'По созданию'  },
    { k: 'title',   label: 'По заглавию'  },
];
const GRIM_SORT_SWORD = `<svg class="dl-month-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="17"/><path d="M9 5L12 2L15 5"/><line x1="10" y1="14" x2="14" y2="14"/><path d="M11 17L10 20H14L13 17"/><circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none"/></svg>`;

// The compact sort dropdown for the active list head (reuses .dl-month-* visuals).
function _grimSortControl() {
    const cur = state.notesSort || 'manual';
    const curLabel = (GRIM_SORTS.find(s => s.k === cur) || GRIM_SORTS[0]).label;
    const opts = GRIM_SORTS.map(s =>
        `<div class="dl-month-option${s.k === cur ? ' active' : ''}" role="option" aria-selected="${s.k === cur}" data-k="${s.k}" onclick="grimSetSort('${s.k}')">${s.label}</div>`
    ).join('');
    return `<div class="grim-sort dl-month-picker" id="grim-sort-picker">
        <button class="grim-sort-trigger" id="grim-sort-trigger" type="button" aria-haspopup="listbox" aria-expanded="false"
                title="Порядок записей" onclick="grimToggleSortMenu(event)" onkeydown="grimSortTriggerKey(event)">
            <span class="grim-sort-cur">${curLabel}</span>${GRIM_SORT_SWORD}
        </button>
        <div class="grim-sort-list dl-month-list" id="grim-sort-list" role="listbox" aria-hidden="true">${opts}</div>
    </div>`;
}
function grimToggleSortMenu(e) {
    if (e) e.stopPropagation();
    const p = document.getElementById('grim-sort-picker');
    if (!p) return;
    const open = !p.classList.contains('open');
    p.classList.toggle('open', open);
    const tr = document.getElementById('grim-sort-trigger');
    if (tr) tr.setAttribute('aria-expanded', open ? 'true' : 'false');
    const lst = document.getElementById('grim-sort-list');
    if (lst) lst.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) document.addEventListener('click', _grimSortOutside);
    else document.removeEventListener('click', _grimSortOutside);
}
function _grimSortOutside(e) {
    const p = document.getElementById('grim-sort-picker');
    if (p && !p.contains(e.target)) grimCloseSortMenu();
}
function grimCloseSortMenu() {
    const p = document.getElementById('grim-sort-picker');
    if (p) p.classList.remove('open');
    const tr = document.getElementById('grim-sort-trigger');
    if (tr) tr.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', _grimSortOutside);
}
function grimSortTriggerKey(e) {
    if (e.key === 'Escape') { grimCloseSortMenu(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); grimToggleSortMenu(e); }
}
function grimSetSort(k) {
    if (!GRIM_SORTS.some(s => s.k === k)) return;
    state.notesSort = k;
    grimCloseSortMenu();
    saveState();
    renderGrimList(false);   // re-sort + rebuild head (active option highlight)
}

function renderGrimList(animate) {
    const listEl = document.getElementById('grim-list');
    if (!listEl) return;
    // п.7: chosen sort for the active grimoire (crypt is always archived-recent first).
    if (state.notesSort === 'manual') state.notesSort = 'edited';   // legacy mode folded into the hybrid
    const sort = grimMode === 'archive' ? 'archived' : (state.notesSort || 'edited');
    const _UNTITLED_KEY = String.fromCharCode(0xffff);          // high code unit → untitled sinks last
    const titleKey = n => ((n.title || '').trim() || _UNTITLED_KEY);
    const cmp = {
        archived: (a, b) => (b.archivedAt || b.updatedAt || 0) - (a.archivedAt || a.updatedAt || 0),
        // hybrid: manual `ord` pins a spot, else fall back to updatedAt (edit recency).
        edited:   (a, b) => ((b.ord != null ? b.ord : (b.updatedAt || 0)) - (a.ord != null ? a.ord : (a.updatedAt || 0))),
        created:  (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
        title:    (a, b) => titleKey(a).localeCompare(titleKey(b), 'ru', { sensitivity: 'base' }),
    }[sort] || (() => 0);
    // Pinned records float to the top as a block (active only); within each block the
    // chosen comparator orders them. Crypt ignores pin.
    const all = _grimList().slice().sort((a, b) => {
        if (grimMode !== 'archive') {
            const pa = a.pinned ? 1 : 0, pb = b.pinned ? 1 : 0;
            if (pa !== pb) return pb - pa;
        }
        return cmp(a, b);
    });
    const q = notesSearchQuery.toLowerCase();
    let shown = q
        ? all.filter(n => (n.title || '').toLowerCase().includes(q) || _grimPlain(n.body).toLowerCase().includes(q))
        : all;
    if (noteColorFilter) shown = shown.filter(n => n.color === noteColorFilter);   // NA-10
    // #8: the crypt reads chronologically by when archived (newest first) — it has no sort
    // control of its own, and the month grouping below keys off this order.
    if (grimMode === 'archive') {
        shown = shown.slice().sort((a, b) => (b.archivedAt || b.updatedAt || 0) - (a.archivedAt || a.updatedAt || 0));
    }
    _grimVisibleIds = shown.map(n => n.id);   // NA-9: visible order for J/K notes nav
    const filtering = !!(q || noteColorFilter);   // either narrows the set → show the found count
    // NA-10: keep the colour-filter trigger in sync — active ring + the crystal tinted to
    // the chosen colour (via _grimInk so a near-black pick stays legible on the dark bg).
    const cfb = document.getElementById('grim-cfilter-btn');
    if (cfb) {
        cfb.classList.toggle('active', !!noteColorFilter);
        const ink = noteColorFilter ? _grimInk(noteColorFilter) : '';
        cfb.style.color = ink;
        cfb.style.borderColor = ink;   // active: tint the outline to the chosen colour too
    }
    const label = grimMode === 'archive' ? 'Склеп' : 'Записи';
    const sortCtl = grimMode === 'active' ? _grimSortControl() : '';
    const head = `<div class="grim-list-head"><span>${filtering ? `Найдено · ${shown.length}` : `${label} · ${all.length}`}</span>${sortCtl}</div>`;
    let body;
    if (!shown.length) body = `<div class="grim-list-none">Ничего не найдено</div>`;
    else if (grimMode === 'archive') body = _grimCryptMonthsHTML(shown, q, animate, filtering);   // #8: crypt by month
    else body = shown.map((n, i) => _grimLeafHTML(n, q, i, animate)).join('');
    listEl.innerHTML = head + body;
    _grimInitListSortable();   // (re)wire manual drag-reorder for the active grimoire
}

// Manual reorder of grimoire entries (DnD). Active grimoire only — disabled in the
// crypt, under search, in multi-select, and under the computed orders (created/title,
// where `ord` is ignored). Enabled in the hybrid «По правке». List head is a fixed anchor.
let _grimListSortable = null;
function _grimInitListSortable() {
    if (_grimListSortable) { _grimListSortable.destroy(); _grimListSortable = null; }
    const listEl = document.getElementById('grim-list');
    if (!listEl) return;
    if (grimMode !== 'active' || grimSelectMode || notesSearchQuery.trim() || noteColorFilter) return;
    const effSort = state.notesSort === 'manual' ? 'edited' : (state.notesSort || 'edited');
    if (effSort !== 'edited') return;   // DnD only in the hybrid «По правке»; computed orders disable it
    if (listEl.querySelectorAll('.grim-leaf').length < 2) return;
    _grimListSortable = new Sortable(listEl, {
        animation: 200,
        delay: 120,
        delayOnTouchOnly: false,
        fallbackTolerance: 5,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        draggable: '.grim-leaf',
        onStart() { document.body.classList.add('is-dragging'); },
        onEnd() {
            document.body.classList.remove('is-dragging');
            _grimPersistOrder();
        },
    });
}

// Freeze the new DOM order into per-note `ord` values, in the same numeric space
// as updatedAt (top = highest, spaced 1s) so a subsequently edited note — which
// drops its ord and falls back to a fresh, larger updatedAt — sorts above these.
function _grimPersistOrder() {
    const listEl = document.getElementById('grim-list');
    if (!listEl) return;
    const ids = [...listEl.querySelectorAll('.grim-leaf')].map(b => b.dataset.id);
    if (!ids.length) return;
    pushUndo();
    const base = Date.now();
    ids.forEach((id, i) => {
        const n = (state.notes || []).find(x => x.id === id);
        if (n) n.ord = base - i * 1000;
    });
    saveState();
}

// п.9 note colour (variant C — glow). Derive a contrast-safe "ink" version of any
// note colour: lift lightness into a readable band so even a near-black RGB-picker
// pick stays legible on the dark page. The raw colour drives only the soft halo;
// this ink drives anything that must READ (title text, divider fleur, leaf bar).
// Pure CSS color-mix can't guarantee a luminance floor — hence JS.
function _grimInk(hex) {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
    if (!m) return hex || '#B06CF5';
    const r = parseInt(m[1].slice(0, 2), 16) / 255, g = parseInt(m[1].slice(2, 4), 16) / 255, b = parseInt(m[1].slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, s = 0, l = (max + min) / 2;
    if (d) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
        h *= 60; if (h < 0) h += 360;
    }
    l = Math.min(0.82, Math.max(0.64, l));               // readable on near-black, never blinding
    if (s > 0) s = Math.max(0.45, Math.min(s, 0.85));    // keep a clear tint (true greys stay grey)
    const cc = (1 - Math.abs(2 * l - 1)) * s, x = cc * (1 - Math.abs(((h / 60) % 2) - 1)), mm = l - cc / 2;
    let rr = 0, gg = 0, bb = 0;
    if (h < 60)       { rr = cc; gg = x; }
    else if (h < 120) { rr = x;  gg = cc; }
    else if (h < 180) { gg = cc; bb = x; }
    else if (h < 240) { gg = x;  bb = cc; }
    else if (h < 300) { rr = x;  bb = cc; }
    else              { rr = cc; bb = x; }
    const hx = v => Math.round((v + mm) * 255).toString(16).padStart(2, '0');
    return '#' + hx(rr) + hx(gg) + hx(bb);
}
// Inline style fragment carrying both colour vars for a note element (leaf / page).
function _grimColorVars(n) {
    return n && n.color ? `--nc:${n.color};--nc-ink:${_grimInk(n.color)}` : '';
}

function _grimLeafHTML(n, q, i, animate) {
    const titleRaw = (n.title || '').trim();
    const title = titleRaw || 'Без заглавия';
    const titleH = q ? highlightSearch(escHtml(title), notesSearchQuery) : escHtml(title);
    const snipH  = _grimSnippetHTML(n.body, q);   // structure glyphs + windowed excerpt + highlight
    const ts = grimMode === 'archive' ? (n.archivedAt || n.updatedAt) : n.updatedAt;
    const sel   = grimSelectMode;
    const isSel = sel && grimSelectedIds.has(n.id);
    const isPinned = !!n.pinned && grimMode !== 'archive';   // pin is meaningless in the crypt
    // NA-5: gate the entrance on per-note novelty, not on every render. Consume the
    // id regardless of the motion flag so a reduced-motion render can't leave it
    // lingering to animate later; `anim` then also honours the explicit animate=false
    // re-sort paths (pin/sort-change) which must never replay the stagger.
    const isNew = _newNoteIds.has(n.id);
    if (isNew) _newNoteIds.delete(n.id);
    const anim = animate && isNew;
    const cls = `grim-leaf${!sel && n.id === currentNoteId ? ' active' : ''}${titleRaw ? '' : ' untitled'}${anim ? ' gl-in' : ''}${sel ? ' grim-leaf--select' : ''}${isSel ? ' selected' : ''}${isPinned ? ' pinned' : ''}${n.color ? ' has-color' : ''}`;
    const styleVars = [];
    if (anim) styleVars.push(`--i:${Math.min(i, 12)}`);
    if (n.color) styleVars.push(_grimColorVars(n));   // п.9 colour glow
    const style = styleVars.length ? ` style="${styleVars.join(';')}"` : '';
    const onclick = sel ? `grimToggleSelectNote('${n.id}')` : `grimOpen('${n.id}')`;
    const check = sel ? `<span class="grim-leaf-check">${isSel ? IC.selectChecked : IC.selectEmpty}</span>` : '';
    // Forged iron spike driven into the corner of a pinned record (same motif as tasks).
    const spike = isPinned && !sel ? `<span class="grim-leaf-spike" aria-hidden="true">${IC.pinSpike}</span>` : '';
    // Open (non-select) entry gets a fold affordance — re-click toggles its pane (desktop).
    const isOpen = !sel && n.id === currentNoteId;
    const fold = isOpen ? `<span class="grim-leaf-fold" aria-hidden="true"><span class="gf-open">${GIC.foldOpen}</span><span class="gf-closed">${GIC.foldClosed}</span></span>` : '';
    const titleAttr = isOpen ? ' title="Клик — свернуть/развернуть запись"' : '';
    // Crypt entries restore/destroy from the read-only detail footer (clean index).
    return `<button class="${cls}"${style} data-id="${n.id}" onclick="${onclick}"${titleAttr}>
        ${spike}${check}<span class="grim-leaf-main">
            <span class="grim-leaf-t">${titleH}</span>
            ${snipH ? `<span class="grim-leaf-s">${snipH}</span>` : ''}
            <span class="grim-leaf-d" title="${grimMode === 'archive' ? 'В склепе с' : 'Последняя правка'}">${grimMode === 'archive' ? GIC.coffin : GIC.quill}<span>${grimDate(ts)}</span></span>
        </span>${fold}
    </button>`;
}

// cross-app #8: the crypt (note archive) renders in collapsible YYYY-MM sections, mirroring
// the task archive. The crypt has NO drag-reorder and NO sort control, so this is a pure
// render grouping — notes arrive already ordered by archivedAt (newest first).
const _CRYPT_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                       'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
function _grimCryptMonthsHTML(notes, q, animate, filtering) {
    const groups = [];
    const byKey = new Map();
    notes.forEach(n => {
        const d = new Date(n.archivedAt || n.updatedAt || Date.now());
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        let g = byKey.get(key);
        if (!g) { g = { key, year: d.getFullYear(), month: d.getMonth() + 1, items: [] }; byKey.set(key, g); groups.push(g); }
        g.items.push(n);
    });
    const curYear = new Date().getFullYear();
    let i = 0;
    return groups.map(g => {
        const heading = `${_CRYPT_MONTHS[g.month - 1]}${g.year === curYear ? '' : ' ' + g.year}`;
        const colKey = 'cryptMonth_' + g.key;
        // Filtering force-expands so a search/colour hit can't hide inside a folded month.
        const isOpen = filtering || localStorage.getItem(colKey) !== '0';
        const leaves = g.items.map(n => _grimLeafHTML(n, q, i++, animate)).join('');
        return `<div class="grim-crypt-month${isOpen ? '' : ' collapsed'}" data-month-key="${g.key}">
            <button class="grim-crypt-month-head" onclick="grimToggleCryptMonth('${g.key}', this)" aria-expanded="${isOpen}" title="Свернуть / развернуть месяц">
                <span class="grim-crypt-month-name">${heading}</span>
                <span class="grim-crypt-month-count">${g.items.length}</span>
                <svg class="grim-crypt-month-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="2" x2="12" y2="17"/><path d="M9 5L12 2L15 5"/><line x1="10" y1="14" x2="14" y2="14"/><path d="M11 17L10 20H14L13 17"/><circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none"/>
                </svg>
            </button>
            <div class="grim-crypt-month-body"><div class="grim-crypt-month-inner">${leaves}</div></div>
        </div>`;
    }).join('');
}

function grimToggleCryptMonth(key, btn) {
    const section = btn.closest('.grim-crypt-month');
    if (!section) return;
    const collapsed = section.classList.toggle('collapsed');
    localStorage.setItem('cryptMonth_' + key, collapsed ? '0' : '1');
    btn.setAttribute('aria-expanded', String(!collapsed));
}

function renderGrimDetail() {
    const detailEl = document.getElementById('grim-detail');
    if (!detailEl) return;
    _grimTocDetach();                       // п.14: drop the old scroll-spy before the page is rebuilt
    const note = _grimCurrentNote();
    if (!note) {
        const hint = grimMode === 'archive' ? 'Выберите запись из склепа' : 'Выберите запись или начертайте новую';
        detailEl.innerHTML = `<div class="grim-detail-empty">
            <div class="grim-detail-empty-ic">${grimMode === 'archive' ? GIC.coffin : GIC.tomeOpen}</div>
            <p>${hint}</p>
        </div>`;
        return;
    }

    const backBtn = `<button class="grim-back" onclick="grimBack()" title="К списку">${GIC.back}</button>`;
    const focusBtn = `<button class="grim-focus-toggle${grimFocus ? ' on' : ''}" data-lvl="${grimFocus}" onclick="grimToggleFocus()" aria-label="${GRIM_FOCUS_TITLE[grimFocus]}" title="${GRIM_FOCUS_TITLE[grimFocus]}">${GIC.focusLvl[grimFocus]}</button>`;
    const tocBtn = `<button class="grim-toc-toggle${grimTocOpen ? ' on' : ''}" onclick="grimToggleToc()" aria-label="${GRIM_TOC_TITLE}" title="${GRIM_TOC_TITLE}">${GIC.toc}</button>`;
    const barBtn = `<button class="grim-bar-toggle${grimBarMode === 'open' ? ' on' : ''}" data-mode="${grimBarMode}" onclick="grimToggleBar()" aria-label="${GRIM_BAR_TITLE[grimBarMode]}" title="${GRIM_BAR_TITLE[grimBarMode]}">${GIC.barLvl[grimBarMode]}</button>`;
    // п.9 note colour: ink-tinted title/fleur + soft raw-colour glow.
    const colorCls = note.color ? ' has-color' : '';
    const colorVars = _grimColorVars(note);
    const colorStyle = colorVars ? ` style="${colorVars}"` : '';

    if (grimMode === 'archive') {
        // Read-only crypt view: restore / destroy. TOC works here too (long crypt notes).
        detailEl.innerHTML = `<div class="grim-page grim-page--ro${colorCls}"${colorStyle}>
          <div class="grim-page-main">
            ${backBtn}${focusBtn}${tocBtn}
            <div class="grim-title-ro">${escHtml((note.title || '').trim() || 'Без заглавия')}</div>
            <div class="grim-divider"><span class="grim-fleur">${GIC.dividerFleur}</span></div>
            <div class="grim-body grim-body--ro">${_grimSanitize(note.body || '')}</div>
            <div class="grim-meta">
                <span class="grim-date" title="В склепе с">${GIC.coffin}<span>${grimDate(note.archivedAt || note.updatedAt)}</span></span>
                <span class="grim-acts">
                    <button class="grim-act" onclick="grimRestoreNote('${note.id}')" title="Вернуть в гримуар">${GIC.restore}<span>вернуть</span></button>
                    <button class="grim-act danger" onclick="grimDeleteForever('${note.id}')" title="Уничтожить навсегда">${IC.skull}<span>удалить</span></button>
                </span>
            </div>
          </div>
          <aside class="grim-toc" id="grim-toc" contenteditable="false" aria-label="Оглавление"></aside>
        </div>`;
        requestAnimationFrame(_grimRefreshToc);   // build the TOC rail for the crypt note
        return;
    }

    // п.14: content lives in .grim-page-main so the TOC rail can sit beside it (a flex
    // sibling) without disturbing the table overlay (.grim-tctl stays a child of .grim-page
    // and is positioned by absolute screen coords, so the wrapper is transparent to it).
    detailEl.innerHTML = `<div class="grim-page${grimBarMode === 'open' ? ' bar-open' : grimBarMode === 'closed' ? ' bar-closed' : ''}${colorCls}"${colorStyle}>
      <div class="grim-page-main">
        ${backBtn}${barBtn}${focusBtn}${tocBtn}
        <textarea class="grim-title-in" id="grim-title-in" maxlength="120" rows="1"
               placeholder="Заглавие записи…" autocomplete="off" spellcheck="false"
               oninput="grimTitleInput(this)" onblur="grimCommit(event)" onkeydown="grimTitleKey(event)"></textarea>
        <div class="grim-divider"><span class="grim-fleur">${GIC.dividerFleur}</span></div>
        ${_grimToolbarHTML()}
        <div class="grim-body" id="grim-body" contenteditable="true" spellcheck="false"
             data-placeholder="Начертайте запись…"
             oninput="grimBodyInput(this)" onblur="grimCommit(event)" onpaste="plainTextPaste(event)"
             onclick="grimBodyClick(event)" onkeydown="grimBodyKey(event)"></div>
        <div class="grim-meta">
            <div class="grim-stamps">
                <span class="grim-stamp" title="Последняя правка">${GIC.quill}<span>правлено ${note.updatedAt ? grimDate(note.updatedAt) : '—'}</span></span>
                ${note.createdAt ? `<span class="grim-stamp is-created" title="Когда начертана">${GIC.hourglass}<span>начертано ${grimDate(note.createdAt)}</span></span>` : ''}
            </div>
            <span class="grim-acts">
                <button class="grim-act is-pin${note.pinned ? ' active' : ''}" onclick="grimTogglePin('${note.id}')" title="${note.pinned ? 'Открепить запись' : 'Закрепить наверху'}">${IC.pin}<span>${note.pinned ? 'закреплено' : 'закрепить'}</span></button>
                <button class="grim-act is-color${note.color ? ' active' : ''}" onclick="openGrimColorModal('${note.id}')" title="Цветовая метка"${colorStyle}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4L17 8.5L17 16L12 20L7 16L7 8.5Z"/></svg><span>цвет</span></button>
                <button class="grim-act" onclick="grimSaveAsTpl('${note.id}')" title="Сохранить как шаблон">${GRIM_TPL_IC.save}<span>шаблон</span></button>
                <button class="grim-act" onclick="grimOpenHistory('${note.id}')" title="Летопись — история версий записи">${GIC.chronicle}<span>летопись</span></button>
                <button class="grim-act" onclick="grimArchive('${note.id}')" title="Отправить в склеп">${GIC.coffin}<span>в склеп</span></button>
                <button class="grim-act danger" onclick="grimDelete('${note.id}')" title="Удалить навсегда">${IC.dagger}<span>удалить</span></button>
            </span>
        </div>
      </div><!-- /grim-page-main -->
      <aside class="grim-toc" id="grim-toc" contenteditable="false" aria-label="Оглавление"></aside>
    </div>`;
    // Set field contents as properties (avoids attribute-escaping pitfalls).
    const ti = document.getElementById('grim-title-in');
    const bo = document.getElementById('grim-body');
    if (ti) {
        ti.value = note.title || ''; _grimGrowTitle(ti);
        // Re-grow the title when its width changes (focus mode switches the list rail
        // in/out, window resize) so wrapped 2+ line titles aren't clipped.
        if ('ResizeObserver' in window) {
            if (!_grimTitleRO) _grimTitleRO = new ResizeObserver(() => { const t = document.getElementById('grim-title-in'); if (t) _grimGrowTitle(t); });
            _grimTitleRO.disconnect();
            _grimTitleRO.observe(ti);
        }
    }
    if (bo) bo.innerHTML = note.body || '';   // body holds sanitized HTML
    _grimEditTbl = null;                       // fresh detail → no table in edit mode
    _grimHoverTbl = null; _grimHoverSeal = null;
    if (bo) {
        _grimObserveBody(bo);                  // relayout on any body resize (font load, reflow, reveal)
        _grimWireBarFollow(detailEl.querySelector('.grim-page'));   // keep seals glued as the toolbar reveals/hides
        requestAnimationFrame(_grimLayoutTableUI);
        // webfonts change table metrics after first paint → relayout once they land
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(_grimScheduleTableUI);
        _grimRefreshToc();                     // п.14: build the table-of-contents rail
        // A: if a record opens while searching, paint + jump to its in-body matches.
        if (notesSearchQuery && grimMode === 'active') requestAnimationFrame(() => _grimFindRun(notesSearchQuery, true));
        else grimFindClose();
    } else {
        grimFindClose();
    }
}

// Auto-grow the title <textarea> to fit wrapped lines (no inner scrollbar).
let _grimGrowRAF = 0;
function _grimGrowTitle(el) {
    if (!el) return;
    // NA-12: coalesce the auto-grow into a single rAF. The title's ResizeObserver
    // calls this on every layout pass, and the height write can itself re-trigger
    // the observer — doing the read→write→read→write inline each time thrashes
    // layout. One pending frame, keyed to the live element, breaks the storm.
    if (_grimGrowRAF) cancelAnimationFrame(_grimGrowRAF);
    _grimGrowRAF = requestAnimationFrame(() => {
        _grimGrowRAF = 0;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    });
}

// Switch between Записи and Склеп.
function grimSetMode(mode) {
    if (mode === grimMode) return;
    clearTimeout(_grimSaveT); saveState();
    grimFindClose();
    grimCloseSortMenu();
    if (grimSelectMode) _grimExitSelect();   // 1b: leave select mode on segment switch
    grimMode = mode;
    currentNoteId = null;
    notesSearchQuery = '';
    const sb = document.getElementById('notes-search-box');
    if (sb) sb.value = '';
    // NA-10: drop the colour filter on segment switch — a colour present in Записи may
    // be absent in Склеп, which would otherwise show a confusing empty list.
    grimCloseColorFilter();
    if (noteColorFilter) { noteColorFilter = null; localStorage.removeItem('dusk_noteColorFilter'); }
    const layoutEl = document.getElementById('grim-layout');
    if (layoutEl) layoutEl.classList.remove('show-detail');
    renderNotes();
}

// Open a record in the detail pane (persist pending edits of the previous one first).
// opts.fromKb (NA-9): keyboard J/K browsing — keep focus on the list leaf so the next
// J/K is received (the editor would otherwise swallow it), and scroll it into view.
function grimOpen(id, opts) {
    const fromKb = !!(opts && opts.fromKb);
    if (id === currentNoteId) { if (!fromKb) grimToggleCollapse(); return; }   // re-click the open entry → fold/unfold its pane
    grimNoteCollapsed = false;                                    // opening a different record always expands
    clearTimeout(_grimSaveT); saveState();
    clearTimeout(_grimSwapT);

    // Render the new note's page + restore editing focus. Split out so a note→note
    // switch can defer it behind a brief fade-out of the outgoing page.
    const showNew = () => {
        renderGrimDetail();                       // new .grim-page → grimPageIn plays it in
        const layoutEl = document.getElementById('grim-layout');
        if (layoutEl) {
            layoutEl.classList.add('show-detail');
            _grimApplyFocus(layoutEl);            // honour persisted focus on open
        }
        // Only a manual open drops the caret into the editor; keyboard browsing keeps
        // focus on the list (see the leaf .focus() below) so J/K stay repeatable.
        if (!fromKb && grimMode === 'active') { const bo = document.getElementById('grim-body'); if (bo) bo.focus(); }
    };

    const detailEl = document.getElementById('grim-detail');
    const oldPage = detailEl && detailEl.querySelector('.grim-page');
    currentNoteId = id;
    renderGrimList(false);                        // instant active-highlight feedback
    if (fromKb) {
        const leaf = document.querySelector(`.grim-leaf[data-id="${id}"]`);
        if (leaf) { leaf.focus({ preventScroll: true }); leaf.scrollIntoView({ block: 'nearest' }); }
    }

    if (oldPage && !prefersReducedMotion()) {
        // Crossfade: sink the outgoing page, then materialise the new one.
        oldPage.classList.add('grim-page--leaving');
        _grimSwapT = setTimeout(showNew, 150);
    } else {
        showNew();
    }
}

// Create a fresh empty note and drop straight into editing its title.
function grimNew() {
    if (grimMode !== 'active') grimMode = 'active';
    clearTimeout(_grimSaveT); saveState();
    grimFindClose();
    pushUndo();
    const now = Date.now();
    const note = { id: uid(), title: '', body: '', fmt: true, color: null, createdAt: now, updatedAt: now };
    if (!Array.isArray(state.notes)) state.notes = [];
    state.notes.unshift(note);
    _newNoteIds.add(note.id);   // NA-5: animate the new leaf only
    currentNoteId = note.id;
    grimNoteCollapsed = false;
    notesSearchQuery = '';
    const sb = document.getElementById('notes-search-box');
    if (sb) sb.value = '';
    saveState();
    renderNotes();
    const layoutEl = document.getElementById('grim-layout');
    if (layoutEl) layoutEl.classList.add('show-detail');
    // Focus synchronously — the title input exists right after renderNotes(),
    // so no rAF race that would swallow the first keystrokes.
    const ti = document.getElementById('grim-title-in');
    if (ti) ti.focus();
}

// Mobile: return from the detail pane to the list.
function grimBack() {
    clearTimeout(_grimSaveT); saveState();
    grimFindClose();
    currentNoteId = null;
    grimNoteCollapsed = false;
    const layoutEl = document.getElementById('grim-layout');
    if (layoutEl) layoutEl.classList.remove('show-detail', 'grim-note-collapsed');
    renderGrimList(false);
    renderGrimDetail();
}

// Title is one logical line — Enter jumps to the body rather than adding a newline.
function grimTitleKey(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const bo = document.getElementById('grim-body');
        if (bo) bo.focus();
    }
}

// Live title edit: update model synchronously, patch the list leaf, debounce save.
function grimTitleInput(el) {
    const note = _grimCurrentNote();
    if (!note) return;
    _grimGrowTitle(el);                         // wrap long titles, grow to fit
    note.title = el.value;
    note.updatedAt = Date.now();
    delete note.ord;                            // edited → bubble back to top on next sort
    _grimSyncActiveLeaf();                       // patch leaf in place (highlight-aware)
    clearTimeout(_grimSaveT);
    _grimSaveT = setTimeout(saveState, 400);
    _grimScheduleVersion();                      // п.15: arm idle auto-snapshot
}

// Live body edit: update model synchronously, debounce save.
function grimBodyInput(el) {
    const note = _grimCurrentNote();
    if (!note) return;
    note.body = _grimSanitize(el.innerHTML);   // body holds sanitized HTML
    note.updatedAt = Date.now();
    delete note.ord;                            // edited → bubble back to top on next sort
    _grimSyncActiveLeaf();    // live-refresh the list snippet (windowed excerpt + highlight)
    if (_grimFindActive) _grimFindRun(notesSearchQuery, false);   // recompute stale match ranges (no jump)
    clearTimeout(_grimSaveT);
    _grimSaveT = setTimeout(saveState, 400);
    _grimScheduleVersion();   // п.15: arm idle auto-snapshot
    _grimScheduleTableUI();   // keep table seal/frame/gutters glued as cells reflow
}

// Blur (or pane switch) → flush save and re-sort/refresh the list (most-recent first).
function grimCommit(e) {
    clearTimeout(_grimSaveT);
    // п.15: if focus left the editor entirely (switching notes, leaving the page,
    // window blur) take a version snapshot. Transient blurs that stay inside the
    // editor (clicking a toolbar button) keep focus in .grim-page-main → no snapshot.
    const _rt = e && e.relatedTarget;
    const _main = document.querySelector('#grim-detail .grim-page-main');
    if (!_rt || !(_main && _main.contains(_rt))) _grimSnapshotCurrent();
    saveState();
    // If this blur was caused by clicking ANY list entry, a full rebuild would replace
    // that entry's node mid-press and swallow the click (breaks single-click open and the
    // re-click-to-collapse toggle) — so refresh in place, keeping node identity. Opening a
    // different note runs its own renderGrimList (which re-sorts the edited note to the
    // top). Only a blur that leaves the list entirely (clicking away, switching windows)
    // does the full render here, so an edited note still bubbles up immediately.
    const rt = e && e.relatedTarget;
    const toLeaf = rt && rt.classList && rt.classList.contains('grim-leaf');
    if (toLeaf) _grimSyncActiveLeaf();
    else renderGrimList(false);
    // Body blur (e.g. switching windows) must NOT tear down the table overlay —
    // only drop the transient floaters; the seal/edit state survives the round-trip.
    _grimCloseTableMenu();
    const pk = document.getElementById('grim-table-pop'); if (pk) pk.remove();
    _grimScheduleTableUI();
}

// Reflect the open note's edited title/snippet into its existing list entry without
// rebuilding the list, preserving the leaf's node identity (see grimCommit). Mirrors
// _grimLeafHTML exactly — windowed search excerpt + <mark> highlight — so an open
// note's leaf stays in sync under search instead of reverting to plain first-120 text.
function _grimSyncActiveLeaf() {
    const note = _grimCurrentNote();
    if (!note) return;
    const leaf = document.querySelector(`#grim-list .grim-leaf[data-id="${note.id}"]`);
    if (!leaf) return;
    const q = notesSearchQuery.toLowerCase();
    const titleRaw = (note.title || '').trim();
    const title = titleRaw || 'Без заглавия';
    leaf.classList.toggle('untitled', !titleRaw);
    const tEl = leaf.querySelector('.grim-leaf-t');
    if (tEl) tEl.innerHTML = q ? highlightSearch(escHtml(title), notesSearchQuery) : escHtml(title);
    const snipH = _grimSnippetHTML(note.body, q);
    let sEl = leaf.querySelector('.grim-leaf-s');
    if (!snipH) { if (sEl) sEl.remove(); return; }
    if (!sEl) {                                    // re-create a snippet that was emptied then refilled
        sEl = document.createElement('span');
        sEl.className = 'grim-leaf-s';
        const main = leaf.querySelector('.grim-leaf-main');
        if (main) main.insertBefore(sEl, leaf.querySelector('.grim-leaf-d'));
    }
    sEl.innerHTML = snipH;
}

// Active note → permanent delete (two-step confirm, undoable).
function grimDelete(id) {
    const btn = document.querySelector('#grim-detail .grim-act.danger');
    if (!_armDanger(btn, 'Нажмите ещё раз, чтобы удалить запись')) return;
    const idx = (state.notes || []).findIndex(n => n.id === id);
    if (idx < 0) return;
    clearTimeout(_grimSaveT);
    pushUndo();
    state.notes.splice(idx, 1);
    if (currentNoteId === id) currentNoteId = null;
    saveState();
    renderNotes();
    showToast('Запись удалена', { undo: true });
}

// (Note duplication removed 2026-06-18 — see _attic/grim-note-duplicate.removed.js)

// Toggle pin — pinned records float to the top of the active grimoire as a block.
// Does NOT touch updatedAt (pinning isn't a content edit, so «правлено» stays honest).
function grimTogglePin(id) {
    const note = (state.notes || []).find(n => n.id === id);
    if (!note) return;
    pushUndo();
    note.pinned = !note.pinned;
    delete note.ord;            // re-enter the natural order within its (un)pinned block
    saveState();
    renderNotes();
    showToast(note.pinned ? 'Запись закреплена' : 'Запись откреплена', { undo: true });
}

// Active note → Склеп (soft archive, undoable).
function grimArchive(id) {
    const idx = (state.notes || []).findIndex(n => n.id === id);
    if (idx < 0) return;
    clearTimeout(_grimSaveT);
    pushUndo();
    const [note] = state.notes.splice(idx, 1);
    note.archivedAt = Date.now();
    if (!Array.isArray(state.notesArchive)) state.notesArchive = [];
    state.notesArchive.unshift(note);
    if (currentNoteId === id) currentNoteId = null;
    saveState();
    renderNotes();
    showToast('Запись в склепе', { undo: true });
}

// Склеп → back to гримуар.
function grimRestoreNote(id) {
    const idx = (state.notesArchive || []).findIndex(n => n.id === id);
    if (idx < 0) return;
    pushUndo();
    const [note] = state.notesArchive.splice(idx, 1);
    delete note.archivedAt;
    note.updatedAt = Date.now();
    if (!Array.isArray(state.notes)) state.notes = [];
    state.notes.unshift(note);
    _newNoteIds.add(note.id);   // NA-5: animate the restored leaf only
    currentNoteId = null;
    grimMode = 'active';                 // auto-return to «Записи» after restoring
    notesSearchQuery = '';
    const sb = document.getElementById('notes-search-box');
    if (sb) sb.value = '';
    const layoutEl = document.getElementById('grim-layout');
    if (layoutEl) layoutEl.classList.remove('show-detail');
    saveState();
    renderNotes();
    showToast('Запись возвращена', { undo: true });
}

// Склеп → permanent delete (two-step confirm, undoable).
function grimDeleteForever(id) {
    const btn = document.querySelector('#grim-detail .grim-act.danger');
    if (!_armDanger(btn, 'Нажмите ещё раз — запись будет уничтожена')) return;
    const idx = (state.notesArchive || []).findIndex(n => n.id === id);
    if (idx < 0) return;
    pushUndo();
    state.notesArchive.splice(idx, 1);
    if (currentNoteId === id) currentNoteId = null;
    saveState();
    renderNotes();
    showToast('Запись уничтожена', { undo: true });
}

// Reset the armed state of the «Опустошить склеп» button (it lives in the static bar,
// so a render that hides it must also clear any pending confirm).
function _disarmEmptyCrypt(btn) {
    btn = btn || document.getElementById('grim-empty-crypt');
    if (!btn || !btn._armed) return;
    clearTimeout(btn._armTimer);
    btn._armed = false;
    btn.classList.remove('confirm-armed');
    btn.title = btn._prevTitle || 'Опустошить склеп — уничтожить все записи в нём';
}

// п.6: Склеп → wipe every archived record at once (two-step confirm, undoable).
// Deleting a group warns its contents go too; emptying the crypt is the same contract.
function grimEmptyCrypt(btn) {
    const n = (state.notesArchive || []).length;
    if (!n) return;
    if (!_armDanger(btn, `Нажмите ещё раз — склеп опустеет (будет уничтожено записей: ${n})`)) return;
    pushUndo();
    // Open archived note (if any) loses its detail pane.
    if (currentNoteId && (state.notesArchive || []).some(x => x.id === currentNoteId)) currentNoteId = null;
    state.notesArchive = [];
    saveState();
    renderNotes();
    showToast('Склеп опустошён', { undo: true });
}

function grimSearch(v) {
    notesSearchQuery = (v || '').trim();
    renderGrimList(false);
    // The search box doubles as the in-note find input: when a record is open, paint
    // and jump to matches in its body too (но без насильного скролла на каждый символ).
    if (currentNoteId && grimMode === 'active') _grimFindRun(notesSearchQuery, false);
    else grimFindClose();
}

// NA-13: the crossed-daggers button empties the search and runs an empty query
// (drops the list filter + in-note highlight), then returns focus to the field.
function grimClearSearch() {
    const sb = document.getElementById('notes-search-box');
    if (sb) sb.value = '';
    grimSearch('');
    if (sb) sb.focus();
}

// ── NA-10: colour filter for grimoire records (crystal button + swatch popover) ──
function grimToggleColorFilter(e) {
    if (e) e.stopPropagation();
    const p = document.getElementById('grim-cfilter');
    if (!p) return;
    const open = !p.classList.contains('open');
    if (open) _grimBuildColorFilterPop();
    p.classList.toggle('open', open);
    const btn = document.getElementById('grim-cfilter-btn');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    const pop = document.getElementById('grim-cfilter-pop');
    if (pop) pop.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) document.addEventListener('click', _grimColorFilterOutside);
    else document.removeEventListener('click', _grimColorFilterOutside);
}
function _grimColorFilterOutside(e) {
    const p = document.getElementById('grim-cfilter');
    if (p && !p.contains(e.target)) grimCloseColorFilter();
}
function grimCloseColorFilter() {
    const p = document.getElementById('grim-cfilter');
    if (p) p.classList.remove('open');
    const btn = document.getElementById('grim-cfilter-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', _grimColorFilterOutside);
}
// Build the swatch popover from the colours actually present in the current segment.
function _grimBuildColorFilterPop() {
    const pop = document.getElementById('grim-cfilter-pop');
    if (!pop) return;
    const colors = [...new Set(_grimList().filter(n => n.color).map(n => n.color))];
    if (!colors.length) {
        pop.innerHTML = '<p class="grim-cfilter-empty">Нет записей с цветом</p>';
        return;
    }
    const check = `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.8" stroke-linecap="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>`;
    const swatches = colors.map(c => `
        <button class="color-filter-swatch${noteColorFilter === c ? ' active' : ''}" style="background:${c}"
                onclick="grimSetColorFilter('${c}')" aria-label="Цвет ${c}" title="Цвет ${c}">
            ${noteColorFilter === c ? check : ''}
        </button>`).join('');
    const clearBtn = noteColorFilter ? `
        <button class="color-filter-swatch color-filter-clear" onclick="grimSetColorFilter(noteColorFilter)" title="Снять фильтр по цвету">
            ${IC.crossedSwords}
        </button>` : '';
    pop.innerHTML = swatches + clearBtn;
}
// Toggle the colour filter (re-click the active colour clears it), persist, re-render.
function grimSetColorFilter(color) {
    noteColorFilter = (noteColorFilter === color) ? null : color;
    if (noteColorFilter) localStorage.setItem('dusk_noteColorFilter', noteColorFilter);
    else localStorage.removeItem('dusk_noteColorFilter');
    _grimBuildColorFilterPop();          // refresh active ring + clear button
    renderGrimList(false);               // (also re-syncs the trigger's .active state)
}

// ── п11/A: in-note find — CSS Custom Highlight API (range-based, never written to
// note.body → no sanitizer/undo/save interaction). Drives off the same query as the
// list search; a floating gothic bar gives the count + prev/next + close. ──────────
function _grimFindSupported() {
    return typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined';
}
// (Re)collect match ranges in the open body, repaint, show the bar, optionally jump to #1.
function _grimFindRun(q, doScroll) {
    _grimFindClearPaint();
    _grimFindRanges = [];
    _grimFindIdx = 0;
    const bo = document.getElementById('grim-body');
    q = (q || '').trim();
    if (!bo || grimMode !== 'active' || !q) { _grimFindActive = false; _grimFindHideBar(); return; }
    const ql = q.toLowerCase();
    const walker = document.createTreeWalker(bo, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
        const text = node.nodeValue; if (!text) continue;
        const lower = text.toLowerCase();
        let from = 0, at;
        while ((at = lower.indexOf(ql, from)) !== -1) {
            const r = document.createRange();
            r.setStart(node, at); r.setEnd(node, at + ql.length);
            _grimFindRanges.push(r);
            from = at + ql.length;
        }
    }
    if (!_grimFindRanges.length) { _grimFindActive = false; _grimFindHideBar(); return; }
    _grimFindActive = true;
    _grimFindPaint();
    _grimFindShowBar();
    _grimFindGoto(0, doScroll !== false);
}
function _grimFindPaint() {
    if (!_grimFindSupported()) return;            // unsupported → ranges still drive scroll
    CSS.highlights.set('grim-find', new Highlight(..._grimFindRanges));
    const cur = _grimFindRanges[_grimFindIdx];
    if (cur) CSS.highlights.set('grim-find-cur', new Highlight(cur));
}
function _grimFindClearPaint() {
    if (typeof CSS !== 'undefined' && CSS.highlights) {
        CSS.highlights.delete('grim-find'); CSS.highlights.delete('grim-find-cur');
    }
}
function _grimFindGoto(idx, scroll) {
    const n = _grimFindRanges.length; if (!n) return;
    _grimFindIdx = ((idx % n) + n) % n;
    if (_grimFindSupported()) {
        const cur = _grimFindRanges[_grimFindIdx];
        if (cur) CSS.highlights.set('grim-find-cur', new Highlight(cur));
    }
    if (scroll !== false) {
        const r = _grimFindRanges[_grimFindIdx];
        const el = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
    _grimFindUpdateBar();
}
function grimFindNext() { _grimFindGoto(_grimFindIdx + 1, true); }
function grimFindPrev() { _grimFindGoto(_grimFindIdx - 1, true); }
function grimFindClose() {
    _grimFindClearPaint();
    _grimFindRanges = []; _grimFindActive = false;
    _grimFindHideBar();
}
// Body-level singleton (fixed-positioned): a transformed .grim-page would break a
// fixed child, so the bar lives on <body>.
function _grimFindBar() {
    let bar = document.getElementById('grim-find');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'grim-find'; bar.className = 'grim-find'; bar.setAttribute('role', 'toolbar');
        bar.setAttribute('aria-label', 'Поиск по записи');
        bar.innerHTML =
            `<button class="gf-btn gf-prev" onclick="grimFindPrev()" title="Предыдущее (Shift+F3)" aria-label="Предыдущее совпадение">${IC.sword}</button>` +
            `<button class="gf-btn gf-next" onclick="grimFindNext()" title="Следующее (F3)" aria-label="Следующее совпадение">${IC.sword}</button>` +
            `<span class="gf-cnt" id="grim-find-cnt"></span>` +
            `<span class="gf-sep"></span>` +
            `<button class="gf-btn gf-close" onclick="grimFindClose()" title="Закрыть (Esc)" aria-label="Закрыть поиск">${IC.crossedSwords}</button>`;
        document.body.appendChild(bar);
    }
    return bar;
}
function _grimFindShowBar() { _grimFindBar().classList.add('show'); _grimFindUpdateBar(); }
function _grimFindHideBar() { const b = document.getElementById('grim-find'); if (b) b.classList.remove('show'); }
function _grimFindUpdateBar() {
    const c = document.getElementById('grim-find-cnt');
    if (c) c.innerHTML = _grimFindRanges.length ? `<b>${_grimFindIdx + 1}</b> / ${_grimFindRanges.length}` : '0';
}

// ── Этап 1b: мультивыбор заметок (зеркало mainSelectMode задач) ─────────────
// Works in both segments: bulk «в склеп»/«вернуть»/«удалить» mirror the single-note
// actions (each undoable). Action set adapts to the segment in renderNotes.

// Two-step danger confirm shared by single + bulk note deletes. First call arms the
// button (red pulse + hint toast) and returns false; a second call within 3s disarms
// and returns true (caller proceeds). Mirrors the task bulk-delete pattern.
function _armDanger(btn, hint) {
    if (!btn) return true;            // no button → don't block (defensive)
    if (!btn._armed) {
        btn._armed = true;
        btn._prevTitle = btn.title;
        btn.classList.add('confirm-armed');
        btn.title = 'Нажмите ещё раз для подтверждения';
        showToast(hint || 'Нажмите ещё раз, чтобы удалить');
        btn._armTimer = setTimeout(() => {
            btn._armed = false;
            btn.classList.remove('confirm-armed');
            btn.title = btn._prevTitle || '';
        }, 3000);
        return false;
    }
    clearTimeout(btn._armTimer);
    btn._armed = false;
    btn.classList.remove('confirm-armed');
    btn.title = btn._prevTitle || '';
    return true;
}

// Leave select mode and clear the tick set (used on toggle-off, after a bulk op,
// on segment switch and on leaving the notes page).
function _grimExitSelect() {
    grimSelectMode = false;
    grimSelectedIds.clear();
    const delBtn = document.getElementById('grim-bulk-delete');
    if (delBtn) { clearTimeout(delBtn._armTimer); delBtn._armed = false; delBtn.classList.remove('confirm-armed'); delBtn.title = 'Удалить навсегда'; }
}

function grimToggleSelectMode() {
    if (grimSelectMode) {
        _grimExitSelect();
    } else {
        grimSelectMode = true;
        grimSelectedIds.clear();
        currentNoteId = null;                       // pure list while selecting
        const layoutEl = document.getElementById('grim-layout');
        if (layoutEl) layoutEl.classList.remove('show-detail');
    }
    renderNotes();
    _updateGrimSelectBar();
}

function grimToggleSelectNote(id) {
    if (grimSelectedIds.has(id)) grimSelectedIds.delete(id);
    else grimSelectedIds.add(id);
    const leaf = document.querySelector(`.grim-leaf[data-id="${id}"]`);
    if (leaf) {
        const on = grimSelectedIds.has(id);
        leaf.classList.toggle('selected', on);
        const ch = leaf.querySelector('.grim-leaf-check');
        if (ch) ch.innerHTML = on ? IC.selectChecked : IC.selectEmpty;
    }
    _updateGrimSelectBar();
}

function _updateGrimSelectBar() {
    const count = grimSelectedIds.size;
    const c = document.getElementById('grim-select-count');
    if (c) c.textContent = `${count} отмечено`;
    ['grim-bulk-archive', 'grim-bulk-restore', 'grim-bulk-color', 'grim-bulk-delete', 'grim-bulk-export'].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.disabled = count === 0;
    });
    if (count === 0) _grimCloseIoMenu();   // selection cleared → drop the export popover
}

// Записи → Склеп for every ticked note (soft archive, undoable).
function grimBulkArchive() {
    if (!grimSelectedIds.size || grimMode !== 'active') return;
    clearTimeout(_grimSaveT);
    pushUndo();
    const now = Date.now();
    const moved = (state.notes || []).filter(n => grimSelectedIds.has(n.id));
    moved.forEach(n => { n.archivedAt = now; });
    state.notes = (state.notes || []).filter(n => !grimSelectedIds.has(n.id));
    if (!Array.isArray(state.notesArchive)) state.notesArchive = [];
    state.notesArchive.unshift(...moved);
    const count = moved.length;
    currentNoteId = null;
    _grimExitSelect();
    saveState();
    renderNotes();
    showToast(`В склепе: ${count}`, { undo: true });
}

// Склеп → Записи for every ticked note (undoable); jumps back to «Записи».
function grimBulkRestore() {
    if (!grimSelectedIds.size || grimMode !== 'archive') return;
    pushUndo();
    const now = Date.now();
    const moved = (state.notesArchive || []).filter(n => grimSelectedIds.has(n.id));
    moved.forEach(n => { delete n.archivedAt; n.updatedAt = now; });
    state.notesArchive = (state.notesArchive || []).filter(n => !grimSelectedIds.has(n.id));
    if (!Array.isArray(state.notes)) state.notes = [];
    state.notes.unshift(...moved);
    moved.forEach(n => _newNoteIds.add(n.id));   // NA-5: animate the restored leaves only
    const count = moved.length;
    currentNoteId = null;
    _grimExitSelect();
    grimMode = 'active';                             // mirror single restore
    notesSearchQuery = '';
    const sb = document.getElementById('notes-search-box');
    if (sb) sb.value = '';
    saveState();
    renderNotes();
    showToast(`Возвращено: ${count}`, { undo: true });
}

// Permanent delete of every ticked note in the current segment (two-step, undoable).
function grimBulkDelete() {
    if (!grimSelectedIds.size) return;
    const btn = document.getElementById('grim-bulk-delete');
    if (!_armDanger(btn, `Нажмите ещё раз — записи будут уничтожены (${grimSelectedIds.size})`)) return;
    clearTimeout(_grimSaveT);
    pushUndo();
    const key = grimMode === 'archive' ? 'notesArchive' : 'notes';
    const count = (state[key] || []).filter(n => grimSelectedIds.has(n.id)).length;
    state[key] = (state[key] || []).filter(n => !grimSelectedIds.has(n.id));
    currentNoteId = null;
    _grimExitSelect();
    saveState();
    renderNotes();
    showToast(`Уничтожено: ${count}`, { undo: true });
}

// cross-app #7: colour label for every ticked note (mirror of task bulkSetColor).
// Colour is a label like pin — it does NOT bump updatedAt / re-sort. Works in the
// current segment (active or склеп), undoable.
function grimBulkColor(color) {
    if (!grimSelectedIds.size) return;
    const c = color || null;
    const key = grimMode === 'archive' ? 'notesArchive' : 'notes';
    pushUndo();
    let count = 0;
    (state[key] || []).forEach(n => { if (grimSelectedIds.has(n.id)) { n.color = c; count++; } });
    _grimExitSelect();
    saveState();
    renderNotes();
    showToast(c ? `Цвет установлен: ${count}` : `Цвет снят: ${count}`);
}

// ── Этап 1: WYSIWYG форматирование тела (body хранит HTML) ──────────────

// Plain text from an HTML body (for list snippets + search).
function _grimPlain(html) {
    const t = document.createElement('template');   // NA-2: inert parse (no <img> fetch / handler fire)
    t.innerHTML = html || '';
    return (t.content.textContent || '').split(String.fromCharCode(0x200B)).join('').replace(/\s+/g, ' ').trim();
}

// Collapse whitespace + strip the zero-width caret-holder used inside empty inline code.
function _grimCollapse(t) {
    return (t || '').split(String.fromCharCode(0x200B)).join('').replace(/\s+/g, ' ').trim();
}
// Flatten a note body into a structure-aware string: text runs interleaved with a
// sentinel char at each non-text block (table/quote/code/list/checklist), so the
// snippet can show a gothic glyph in place of the block instead of one flat run.
// Returns { flat, glyphs } where glyphs maps a flat-string index → block kind.
const _GRIM_SENT = '';
function _grimFlattenSnippet(html) {
    const tpl = document.createElement('template');   // NA-2: inert parse (no <img> fetch / handler fire)
    tpl.innerHTML = html || '';
    const root = tpl.content;
    let flat = '';
    const glyphs = new Map();
    const needSep = () => flat.length && flat[flat.length - 1] !== ' ';
    const pushText = t => { t = _grimCollapse(t); if (!t) return; if (needSep()) flat += ' '; flat += t; };
    const pushGlyph = k => { if (needSep()) flat += ' '; glyphs.set(flat.length, k); flat += _GRIM_SENT; };
    const blocks = [...root.children];
    if (!blocks.length) { pushText(root.textContent || ''); return { flat, glyphs }; }
    blocks.forEach(el => {
        switch (el.tagName) {
            case 'TABLE': pushGlyph('table'); break;
            case 'PRE':   pushGlyph('code'); break;               // block code (stage 8)
            case 'HR':    break;                                  // a rule carries no content
            case 'BLOCKQUOTE': pushGlyph('quote'); pushText(el.textContent); break;
            case 'UL': case 'OL': pushGlyph(el.classList.contains('task') ? 'task' : 'list'); pushText(el.textContent); break;
            default: pushText(el.textContent);
        }
    });
    return { flat, glyphs };
}
// One accent-tinted gothic glyph standing in for a structural block in the snippet (V3).
function _grimSnipGlyph(kind) {
    const g = { table: FIC.table, quote: FIC.quote, code: FIC.code, list: FIC.ul, task: FIC.task }[kind];
    return g ? `<span class="grim-snip-ic" aria-hidden="true">${g}</span>` : '';
}
// Build the list-snippet HTML: structure glyphs in document order, a windowed excerpt
// around the first search match (… ellipses) so the hit is always visible, and <mark>
// on the matched term. Returns '' for an empty note. Rendered into the leaf only —
// never into note.body, so no sanitizer/undo interaction. `q` is the lower-cased query.
function _grimSnippetHTML(body, q) {
    const { flat, glyphs } = _grimFlattenSnippet(body);
    if (!flat) return '';
    const WIN = 120;
    let start = 0, end = Math.min(flat.length, WIN);
    if (q) {
        const idx = flat.toLowerCase().indexOf(q);
        if (idx >= 0) { end = Math.min(flat.length, Math.max(0, idx - 36) + WIN); start = Math.max(0, end - WIN); }
    }
    let html = '', buf = '';
    const flush = () => { if (buf) { html += q ? highlightSearch(escHtml(buf), notesSearchQuery) : escHtml(buf); buf = ''; } };
    for (let i = start; i < end; i++) {
        const k = glyphs.get(i);
        if (k) { flush(); html += _grimSnipGlyph(k); }
        else buf += flat[i];
    }
    flush();
    if (start > 0) html = '…' + html;
    if (end < flat.length) html += '…';
    return html;
}

// One-time migration: old notes stored plain text → wrap into HTML paragraphs.
function _grimPlainToHtml(text) {
    if (!text) return '';
    return text.split(/\n{2,}/).map(par =>
        '<p>' + escHtml(par).replace(/\n/g, '<br>') + '</p>').join('');
}
function migrateNotes() {
    [...(state.notes || []), ...(state.notesArchive || [])].forEach(n => {
        if (!n) return;
        if (n.fmt !== true) { n.body = _grimPlainToHtml(n.body || ''); n.fmt = true; }
        // NA-2: pass every body through the whitelist sanitizer at the data boundary.
        // In-app records are already sanitized (so this is idempotent), but import-JSON,
        // hand-edited localStorage and a future cloud-sync file are external input —
        // their raw <img onerror>/<script> reaches snippet generation and the crypt
        // view otherwise. One pass here = the single trusted gate.
        n.body = _grimSanitize(n.body || '');
    });
}

// Whitelist sanitizer — only the tags/attrs the editor produces survive.
const GRIM_TAGS = { H1:1,H2:1,H3:1,P:1,BR:1,STRONG:1,B:1,EM:1,I:1,U:1,S:1,STRIKE:1,DEL:1,UL:1,OL:1,LI:1,BLOCKQUOTE:1,CODE:1,PRE:1,HR:1,A:1,DIV:1,SPAN:1,
                    TABLE:1,THEAD:1,TBODY:1,TR:1,TH:1,TD:1 };
function _grimSanitize(html) {
    // NA-2: parse into an INERT <template>, never a live <div>. A live element's
    // innerHTML dispatches resource loads (<img src>) and arms inline handlers the
    // instant it parses — so even though we strip the node afterwards, a queued
    // onerror still fires. <template>.content is an inert document fragment: no
    // fetches, handlers never run. This is the only sink fed genuinely raw input.
    const tpl = document.createElement('template');
    tpl.innerHTML = html || '';
    const root = tpl.content;
    root.querySelectorAll('script,style,iframe,object,embed').forEach(e => e.remove());
    const walk = node => {
        [...node.childNodes].forEach(ch => {
            if (ch.nodeType === 8) { ch.remove(); return; }      // comments
            if (ch.nodeType !== 1) return;                       // text ok
            if (!GRIM_TAGS[ch.tagName]) { ch.replaceWith(...ch.childNodes); return; } // unwrap unknown
            [...ch.attributes].forEach(a => {
                const n = a.name.toLowerCase();
                if (ch.tagName === 'A' && n === 'href') {
                    if (!/^(https?:|mailto:|#)/i.test(a.value)) ch.removeAttribute('href');
                } else if (n === 'class' && (ch.tagName === 'UL' || ch.tagName === 'LI')) {
                    const keep = a.value.split(/\s+/).filter(c => c === 'task' || c === 'done').join(' ');
                    keep ? ch.setAttribute('class', keep) : ch.removeAttribute('class');
                } else if (n === 'class' && (ch.tagName === 'TH' || ch.tagName === 'TD')) {
                    const keep = a.value.split(/\s+/).filter(c => c === 'align-c' || c === 'align-r').join(' ');
                    keep ? ch.setAttribute('class', keep) : ch.removeAttribute('class');
                } else if (n === 'class' && ch.tagName === 'DIV') {
                    // п.16 callouts — only the blessed callout classes survive on a <div>.
                    const ok = { 'grim-co': 1, 'grim-co-info': 1, 'grim-co-warn': 1, 'grim-co-secret': 1, 'grim-co-body': 1 };
                    const keep = a.value.split(/\s+/).filter(c => ok[c]).join(' ');
                    keep ? ch.setAttribute('class', keep) : ch.removeAttribute('class');
                } else {
                    ch.removeAttribute(a.name);
                }
            });
            if (ch.tagName === 'A') { ch.setAttribute('target', '_blank'); ch.setAttribute('rel', 'noopener noreferrer'); }
            walk(ch);
        });
    };
    walk(root);
    const out = document.createElement('div');
    out.appendChild(root);   // sanitized inert nodes (no <img>/handlers left) → live div to serialize
    return out.innerHTML;     // ZWSP caret-holders kept so empty <code> stays editable
}

// After any edit/command: persist (debounced) + refresh toolbar active-state.
function _grimAfterEdit(bo) {
    const note = _grimCurrentNote();
    if (note) {
        note.body = _grimSanitize(bo.innerHTML);
        note.updatedAt = Date.now();
        clearTimeout(_grimSaveT);
        _grimSaveT = setTimeout(saveState, 400);
    }
    _grimSyncToolbar();
    _grimScheduleTableUI();   // keep table seals/gutters glued as content reflows
    _grimRefreshToc();        // п.14: headings may have changed → rebuild the TOC
}

// Toolbar commands. onmousedown preventDefault on the buttons keeps the caret,
// so execCommand acts on the live selection.
function grimFmt(cmd) {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    bo.focus();
    switch (cmd) {
        case 'bold':      _grimEmphasis('bold');          break;   // self-commits
        case 'italic':    _grimEmphasis('italic');        break;   // self-commits
        case 'underline': _grimEmphasis('underline');     break;   // self-commits
        case 'strike':    _grimEmphasis('strikeThrough'); break;   // self-commits
        case 'ul':     _grimSetListType('bullet'); break;   // self-commits
        case 'ol':     _grimSetListType('number'); break;   // self-commits
        case 'quote':  _grimQuote();    _grimAfterEdit(bo); break;
        case 'hr':     _grimInsertHr(); break;              // self-commits
    }
}
// Nearest block-level "line" element around the caret.
function _grimCurrentBlock(bo) {
    const sel = window.getSelection();
    let n = sel && sel.anchorNode;
    while (n && n !== bo && !/^(LI|P|DIV|H1|H2|H3|BLOCKQUOTE)$/.test(n.tagName || '')) n = n.parentNode;
    return (n && n !== bo) ? n : null;
}
// Bold/italic: toggle the selection, or — with just a caret — the whole current line.
function _grimEmphasis(cmd) {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    bo.focus();
    try { document.execCommand('styleWithCSS', false, false); } catch (_) {}   // emit tags (<u>/<strike>), not inline style → survives sanitizer
    const sel = window.getSelection();
    if (sel && sel.rangeCount && sel.isCollapsed) {
        const block = _grimCurrentBlock(bo);
        if (block && block.textContent.length) {
            _grimPlaceMarker();
            const r = document.createRange();
            r.selectNodeContents(block);
            sel.removeAllRanges();
            sel.addRange(r);
            document.execCommand(cmd);
            _grimRestoreMarker(bo);
            _grimAfterEdit(bo);
            return;
        }
    }
    document.execCommand(cmd);
    _grimAfterEdit(bo);
}
function _grimToggleBlock(tag) {
    const cur = (document.queryCommandValue('formatBlock') || '').toLowerCase();
    document.execCommand('formatBlock', false, cur === tag ? 'p' : tag);
}
// Quote toggle. When turning a quote ON inside a list, drop the list first —
// (re-enabling a list inside the quote is then a deliberate, manual step).
function _grimQuote() {
    const bo = document.getElementById('grim-body');
    const sel = window.getSelection();
    const goingOn = (document.queryCommandValue('formatBlock') || '').toLowerCase() !== 'blockquote';
    if (goingOn) {
        let n = sel && sel.anchorNode;
        while (n && n !== bo) {
            if (n.tagName === 'UL') { document.execCommand('insertUnorderedList'); break; }
            if (n.tagName === 'OL') { document.execCommand('insertOrderedList'); break; }
            n = n.parentNode;
        }
    }
    _grimToggleBlock('blockquote');
}
function grimHeading(n) {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    bo.focus();
    _grimToggleBlock('h' + n);
    _grimAfterEdit(bo);
}
function grimChecklist() { _grimSetListType('task'); }

// ── List engine — per-line conversion, splitting where needed (Notion-style) ──
// A line's list type, or null when it isn't a list item.
function _grimLineType(li) {
    if (!li || li.tagName !== 'LI' || !li.parentNode) return null;
    const list = li.parentNode;
    if (list.tagName === 'OL') return 'number';
    if (list.tagName === 'UL') return list.classList.contains('task') ? 'task' : 'bullet';
    return null;
}
// Block-level "lines" (li / p / div / h / blockquote) the selection touches.
function _grimSelectedLines(bo) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return [];
    const range = sel.getRangeAt(0);
    let lines = [...bo.querySelectorAll('li,p,div,h1,h2,h3,blockquote')].filter(el => range.intersectsNode(el));
    lines = lines.filter(el => !lines.some(o => o !== el && el.contains(o)));   // keep leaves
    if (!lines.length) {
        let n = range.startContainer;
        while (n && n !== bo && !/^(LI|P|DIV|H1|H2|H3|BLOCKQUOTE)$/.test(n.tagName || '')) n = n.parentNode;
        if (n && n !== bo) lines = [n];
    }
    return lines;
}
// Invisible caret marker so the cursor survives the DOM surgery.
function _grimPlaceMarker() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const m = document.createElement('span');
    m.className = '__gcar';
    sel.getRangeAt(0).insertNode(m);
}
function _grimRestoreMarker(bo) {
    const m = bo.querySelector('.__gcar');
    if (!m) return;
    const r = document.createRange();
    r.setStartAfter(m);
    r.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    m.remove();
    bo.normalize();
}
// Two list elements that can be fused (same tag + same task-ness).
function _grimSameListKind(a, b) {
    if (!a || !b || a.tagName !== b.tagName) return false;
    if (a.tagName !== 'UL' && a.tagName !== 'OL') return false;
    return a.classList.contains('task') === b.classList.contains('task');
}
// Fuse consecutive same-kind list siblings (flat model → top level only).
function _grimMergeAdjacentLists(root) {
    let el = root.firstElementChild;
    while (el) {
        const next = el.nextElementSibling;
        if (_grimSameListKind(el, next)) {
            while (next.firstChild) el.appendChild(next.firstChild);
            next.remove();
            continue;   // keep folding into el
        }
        el = el.nextElementSibling;
    }
}
// Convert ONE line to 'bullet'|'number'|'task'|'p', splitting its list if needed.
function _grimConvertLine(line, toType) {
    // Remember the pre-list block type so toggling a list off restores it (e.g. H3),
    // and carry that memory across list-type changes.
    const pre = line.tagName === 'LI' ? (line.dataset.pre || 'p') : line.tagName.toLowerCase();
    let make = toType;
    if (toType === 'p' && /^h[1-3]$/.test(pre)) make = pre;   // restore the heading
    let newLine, wrapper;
    if (make === 'bullet' || make === 'number' || make === 'task') {
        newLine = document.createElement('li');
        if (make === 'number') wrapper = document.createElement('ol');
        else { wrapper = document.createElement('ul'); if (make === 'task') wrapper.className = 'task'; }
        newLine.dataset.pre = pre;
        wrapper.appendChild(newLine);
    } else {
        newLine = wrapper = document.createElement(make);   // 'p' | 'h1' | 'h2' | 'h3'
    }
    while (line.firstChild) newLine.appendChild(line.firstChild);
    if (!newLine.firstChild) newLine.appendChild(document.createElement('br'));
    if (line.tagName === 'LI') {
        const oldList = line.parentNode, kids = [...oldList.children];
        const after = kids.slice(kids.indexOf(line) + 1);
        oldList.parentNode.insertBefore(wrapper, oldList.nextSibling);
        if (after.length) {
            const tail = oldList.cloneNode(false);   // preserves tag + task class
            after.forEach(li2 => tail.appendChild(li2));
            wrapper.parentNode.insertBefore(tail, wrapper.nextSibling);
        }
        line.remove();
        if (!oldList.children.length) oldList.remove();
    } else {
        line.parentNode.insertBefore(wrapper, line);
        line.remove();
    }
}
// Apply a list type to the selected line(s); toggling the same type returns to paragraphs.
function _grimSetListType(target) {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    bo.focus();
    let lines = _grimSelectedLines(bo);
    if (!lines.length) {
        // No block wrapper yet (fresh single-line note) — wrap bo's inline content.
        const p = document.createElement('p');
        while (bo.firstChild) p.appendChild(bo.firstChild);
        if (!p.firstChild) p.appendChild(document.createElement('br'));
        bo.appendChild(p);
        lines = [p];
    }
    const toType = lines.every(l => _grimLineType(l) === target) ? 'p' : target;
    _grimPlaceMarker();
    lines.forEach(line => _grimConvertLine(line, toType));
    _grimMergeAdjacentLists(bo);
    _grimRestoreMarker(bo);
    _grimAfterEdit(bo);
}

// Insert a separator and drop the caret onto a fresh line below it.
function _grimInsertHr() {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    bo.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    // undo-audit (Part 2, inserts-only): insert via execCommand('insertHTML') so the
    // separator joins the browser's native undo stack (Ctrl+Z reverts it). The caret
    // lands on the fresh paragraph after the rule (insertHTML leaves it there).
    document.execCommand('insertHTML', false, '<hr><p data-gtnew="1"><br></p>');
    const np = bo.querySelector('p[data-gtnew]');
    if (np) { np.removeAttribute('data-gtnew'); _grimCaretToStart(np); }
    _grimAfterEdit(bo);
}

function grimInlineCode() {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    bo.focus();
    const sel = window.getSelection();
    const text = sel ? sel.toString() : '';
    if (text) {
        document.execCommand('insertHTML', false, '<code>' + escHtml(text) + '</code>');
    } else if (sel && sel.rangeCount) {
        // No selection — drop an empty code span (ZWSP holds the caret) via insertHTML
        // so it is native-undoable, then place the caret inside the fresh span.
        const zwsp = String.fromCharCode(0x200B);
        document.execCommand('insertHTML', false, '<code data-gtnew="1">' + zwsp + '</code>');
        const code = bo.querySelector('code[data-gtnew]');
        if (code) {
            code.removeAttribute('data-gtnew');
            const nr = document.createRange();
            nr.setStart(code.firstChild, 1);
            nr.collapse(true);
            sel.removeAllRanges();
            sel.addRange(nr);
        }
    }
    _grimAfterEdit(bo);
}

// ── п.8: multi-line code block (<pre>) ──────────────────────────────────────
// Walk up to the enclosing <pre>, if the caret sits inside one.
function _grimClosestPre(node, bo) {
    let n = node;
    while (n && n !== bo) { if (n.tagName === 'PRE') return n; n = n.parentNode; }
    return null;
}
// Toolbar / ``` → drop a code block at the caret (selected text becomes its body,
// newlines preserved). Inserted via insertHTML so it joins the native undo stack.
function grimCodeBlock() {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    bo.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    if (_grimClosestPre(sel.anchorNode, bo)) return;        // never nest blocks
    const zwsp = String.fromCharCode(0x200B);
    const text = sel.toString();
    const inner = text ? escHtml(text) : zwsp;              // ZWSP holds the caret when empty
    document.execCommand('insertHTML', false, '<pre data-gtnew="1">' + inner + '</pre><p data-gtnew2="1"><br></p>');
    const pre = bo.querySelector('pre[data-gtnew]');
    if (pre) {
        pre.removeAttribute('data-gtnew');
        const r = document.createRange();
        if (pre.firstChild && pre.firstChild.nodeType === 3) r.setStart(pre.firstChild, pre.firstChild.textContent.length);
        else { r.selectNodeContents(pre); r.collapse(false); }
        r.collapse(true);
        sel.removeAllRanges(); sel.addRange(r);
    }
    const np = bo.querySelector('p[data-gtnew2]');
    if (np) np.removeAttribute('data-gtnew2');
    _grimAfterEdit(bo);
}
// A line that is exactly ``` + Enter opens an empty code block (markdown trigger).
function _grimCodeFenceEnter(e) {
    const bo = document.getElementById('grim-body');
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount || !sel.isCollapsed) return false;
    // Climb to the top-level line under #grim-body (an element OR a bare text node —
    // a fresh, never-wrapped body types text straight into #grim-body).
    let blk = sel.anchorNode;
    while (blk && blk.parentNode && blk.parentNode !== bo) blk = blk.parentNode;
    if (!blk || blk.parentNode !== bo || _grimClosestPre(blk, bo)) return false;
    if (blk.textContent.trim() !== '```') return false;
    e.preventDefault();
    const zwsp = String.fromCharCode(0x200B);
    const pre = document.createElement('pre');
    pre.textContent = zwsp;
    const np = document.createElement('p');
    np.appendChild(document.createElement('br'));
    blk.parentNode.insertBefore(pre, blk);
    blk.parentNode.insertBefore(np, pre.nextSibling);
    blk.remove();
    const r = document.createRange();
    r.setStart(pre.firstChild, 1);
    r.collapse(true);
    sel.removeAllRanges(); sel.addRange(r);
    _grimAfterEdit(bo);
    return true;
}
// Enter inside a code block = newline; Enter on an empty trailing line exits the block
// to the paragraph below it (Shift+Enter always inserts a newline, never exits).
function _grimPreEnter(e) {
    const bo = document.getElementById('grim-body');
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount) return false;
    const pre = _grimClosestPre(sel.anchorNode, bo);
    if (!pre) return false;
    e.preventDefault();
    const zwsp = String.fromCharCode(0x200B);
    const strip = s => s.split(zwsp).join('');
    const cur = sel.getRangeAt(0);
    const tailR = document.createRange();
    tailR.selectNodeContents(pre);
    tailR.setStart(cur.endContainer, cur.endOffset);
    const atEnd = strip(tailR.toString()) === '';
    const raw = strip(pre.textContent);
    const endsNl = /\n$/.test(raw);
    if (!e.shiftKey && atEnd && (raw === '' || endsNl)) {
        if (endsNl) pre.textContent = strip(pre.textContent).replace(/\n$/, '');
        let np = pre.nextElementSibling;
        if (!np || np.tagName !== 'P') {
            np = document.createElement('p');
            np.appendChild(document.createElement('br'));
            pre.parentNode.insertBefore(np, pre.nextSibling);
        }
        if (strip(pre.textContent) === '') pre.remove();
        _grimCaretToStart(np);
        _grimAfterEdit(bo);
        return true;
    }
    // Insert a real newline char (execCommand('insertText','\n') is swallowed by Chrome
    // inside contenteditable, so do it by hand). A trailing newline needs a follow-up
    // ZWSP so the caret has somewhere to land on the fresh, otherwise-empty last line.
    const r = cur;
    r.deleteContents();
    const atVeryEnd = strip(tailR.toString()) === '';
    const tn = document.createTextNode(atVeryEnd ? '\n' + zwsp : '\n');
    r.insertNode(tn);
    const caret = document.createRange();
    caret.setStart(tn, 1);                 // just after the '\n' (before the ZWSP if present)
    caret.collapse(true);
    sel.removeAllRanges(); sel.addRange(caret);
    _grimAfterEdit(bo);
    return true;
}
// Tab inside a code block inserts two spaces instead of leaving the editor.
function _grimPreTab(e) {
    const bo = document.getElementById('grim-body');
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount) return false;
    if (!_grimClosestPre(sel.anchorNode, bo)) return false;
    e.preventDefault();
    document.execCommand('insertText', false, '  ');
    _grimAfterEdit(bo);
    return true;
}

// Link is set via a gothic modal (no native prompt). Selection is captured
// before the modal steals focus, then restored on confirm.
let _grimLinkRange = null, _grimLinkAnchor = null;
function grimLink() {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) { bo.focus(); return; }
    _grimLinkRange = sel.getRangeAt(0).cloneRange();
    // Editing an existing link under the caret?
    let n = sel.anchorNode; _grimLinkAnchor = null;
    while (n && n !== bo) { if (n.tagName === 'A') { _grimLinkAnchor = n; break; } n = n.parentNode; }
    const inp = document.getElementById('grim-link-input');
    if (inp) inp.value = _grimLinkAnchor ? (_grimLinkAnchor.getAttribute('href') || '') : 'https://';
    const nameInp = document.getElementById('grim-link-name');
    if (nameInp) nameInp.value = _grimLinkAnchor ? (_grimLinkAnchor.textContent || '') : (sel.toString() || '');
    const rm = document.getElementById('grim-link-remove');
    if (rm) rm.style.display = _grimLinkAnchor ? '' : 'none';
    openModalWithFocus('grim-link-modal');
    requestAnimationFrame(() => requestAnimationFrame(() => { if (inp) { inp.focus(); inp.select(); } }));
}
// Re-focus the body and restore the saved selection so execCommand acts on it.
function _grimRestoreLinkSel() {
    const bo = document.getElementById('grim-body');
    if (!bo || !_grimLinkRange) return null;
    bo.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_grimLinkRange);
    return bo;
}
function grimLinkConfirm() {
    const inp = document.getElementById('grim-link-input');
    const nameInp = document.getElementById('grim-link-name');
    let url = ((inp && inp.value) || '').trim();
    if (!url) { if (inp) { inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 400); } return; }
    if (!/^(https?:|mailto:|#)/i.test(url)) url = 'https://' + url;   // forgive a missing scheme
    const name = ((nameInp && nameInp.value) || '').trim();
    const anchor = _grimLinkAnchor, range = _grimLinkRange;
    const bo = _grimRestoreLinkSel();
    closeModalWithAnim('grim-link-modal', () => {});
    if (!bo) { _grimLinkRange = _grimLinkAnchor = null; return; }
    if (anchor) {
        anchor.setAttribute('href', url);
        if (name) anchor.textContent = name;          // empty name → keep existing text
    } else if (name) {
        document.execCommand('insertHTML', false, '<a href="' + escHtml(url) + '">' + escHtml(name) + '</a>');
    } else if (range && !range.collapsed) {
        document.execCommand('createLink', false, url);   // keep the selected text as the label
    } else {
        document.execCommand('insertHTML', false, '<a href="' + escHtml(url) + '">' + escHtml(url) + '</a>');
    }
    _grimLinkRange = _grimLinkAnchor = null;
    _grimAfterEdit(bo);
}
function grimLinkRemove() {
    const anchor = _grimLinkAnchor;
    const bo = _grimRestoreLinkSel();
    closeModalWithAnim('grim-link-modal', () => {});
    if (bo && anchor) {
        while (anchor.firstChild) anchor.parentNode.insertBefore(anchor.firstChild, anchor);
        anchor.remove();
        _grimAfterEdit(bo);
    }
    _grimLinkRange = _grimLinkAnchor = null;
}
function grimLinkClose(event) {
    if (!event || event.target === document.getElementById('grim-link-modal')) {
        closeModalWithAnim('grim-link-modal', () => {});
        _grimLinkRange = _grimLinkAnchor = null;
    }
}
// Click on a checklist box toggles done.
function grimBodyClick(e) {
    // Plain click follows a link like a real hyperlink; Ctrl/Cmd-click drops the
    // caret inside it instead (so the link text stays editable).
    const a = e.target.closest && e.target.closest('a');
    if (a && !e.ctrlKey && !e.metaKey) {
        const href = a.getAttribute('href');
        if (href) { e.preventDefault(); window.open(href, '_blank', 'noopener'); return; }
    }
    const li = e.target.closest && e.target.closest('.task li');
    if (!li) return;
    const r = li.getBoundingClientRect();
    if (e.clientX - r.left <= 26) {
        li.classList.toggle('done');
        _grimAfterEdit(document.getElementById('grim-body'));
    }
}
function grimBodyKey(e) {
    // First Backspace at the start of a list item drops the bullet (→ paragraph);
    // a second Backspace then merges into the previous line as usual.
    if (e.key === 'Escape' && _grimDismissTableUI()) return;   // staged dismiss: picker → menu → edit-mode
    if (e.key === 'Tab' && _grimTableTab(e)) return;     // walk table cells
    if (e.key === 'Tab' && _grimPreTab(e)) return;       // п.8: Tab → 2 spaces inside a code block
    if (e.key === 'Backspace' && _grimBackspaceCallout(e)) return;   // п.16: empty callout → delete whole врезка
    if (e.key === 'Backspace' && _grimBackspaceOutdent(e)) return;
    // п.8: ``` + Enter opens a code block; Enter inside one = newline / exit on empty tail.
    if (e.key === 'Enter' && !e.shiftKey && _grimCodeFenceEnter(e)) return;
    if (e.key === 'Enter' && _grimPreEnter(e)) return;
    // Plain Enter inside a quote/inline-code exits to a normal paragraph
    // (Shift+Enter still inserts a soft line break inside the block).
    if (e.key === 'Enter' && !e.shiftKey && _grimExitOnEnter(e)) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); grimFmt('bold'); }
    else if (k === 'i') { e.preventDefault(); grimFmt('italic'); }
    else if (k === 'u') { e.preventDefault(); grimFmt('underline'); }
    else if (k === 'k') { e.preventDefault(); grimLink(); }
}
// Collapse the selection to the start of an element's contents.
function _grimCaretToStart(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}
// On Enter, break out of a blockquote (new paragraph after it) or step the
// caret out of an inline <code> run so the next line isn't code-styled.
function _grimExitOnEnter(e) {
    const bo = document.getElementById('grim-body');
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount) return false;
    // п.16: Enter on an empty line inside a callout breaks out below it (no way to
    // get stuck typing forever in the врезка). Mirrors the blockquote escape.
    let co = sel.anchorNode;
    while (co && co !== bo && !(co.nodeType === 1 && co.classList && co.classList.contains('grim-co'))) co = co.parentNode;
    if (co && co !== bo) {
        let blk = sel.anchorNode;
        while (blk && blk !== co && !/^(P|LI|H1|H2|H3)$/.test(blk.tagName || '')) blk = blk.parentNode;
        if (blk && blk !== co && _grimCollapse(blk.textContent) === '') {
            e.preventDefault();
            const p = document.createElement('p');
            p.appendChild(document.createElement('br'));
            co.parentNode.insertBefore(p, co.nextSibling);
            const bodyEl = co.querySelector('.grim-co-body') || co;
            if (blk.parentNode && bodyEl.children.length > 1) blk.remove();   // drop the empty trailing line, keep callout
            _grimCaretToStart(p);
            _grimAfterEdit(bo);
            return true;
        }
    }
    let n = sel.anchorNode, bq = null, code = null;
    while (n && n !== bo) {
        if (n.tagName === 'BLOCKQUOTE') { bq = n; break; }
        if (n.tagName === 'CODE') { code = n; break; }
        n = n.parentNode;
    }
    if (bq) {
        e.preventDefault();
        const p = document.createElement('p');
        p.appendChild(document.createElement('br'));
        bq.parentNode.insertBefore(p, bq.nextSibling);
        _grimCaretToStart(p);
        _grimAfterEdit(bo);
        return true;
    }
    if (code) {
        // Only intercept when the caret sits at the very end of the code run.
        const atEnd = (sel.anchorNode.nodeType === 3
                && sel.anchorOffset === sel.anchorNode.textContent.length
                && sel.anchorNode.parentNode === code)
            || (sel.anchorNode === code && sel.anchorOffset === code.childNodes.length);
        if (atEnd) {
            const range = document.createRange();
            range.setStartAfter(code);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        return false;   // let the browser create the new paragraph (now outside code)
    }
    return false;
}
// п.16: Backspace anywhere inside an EMPTY callout deletes the whole врезка at once
// (instead of nibbling preceding blank lines and only then eating the callout).
function _grimBackspaceCallout(e) {
    const bo = document.getElementById('grim-body');
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount || !sel.isCollapsed) return false;
    let co = sel.anchorNode;
    while (co && co !== bo && !(co.nodeType === 1 && co.classList && co.classList.contains('grim-co'))) co = co.parentNode;
    if (!co || co === bo) return false;
    if (_grimCollapse(co.textContent) !== '') return false;   // only when the callout is empty
    e.preventDefault();
    const prev = co.previousElementSibling, next = co.nextElementSibling;
    co.remove();
    if (prev) {
        const r = document.createRange();
        r.selectNodeContents(prev); r.collapse(false);        // caret → end of previous block
        sel.removeAllRanges(); sel.addRange(r);
    } else if (next) {
        _grimCaretToStart(next);
    } else {
        const p = document.createElement('p');
        p.appendChild(document.createElement('br'));
        bo.appendChild(p);
        _grimCaretToStart(p);
    }
    _grimAfterEdit(bo);
    return true;
}
// First Backspace at the very start of a list item outdents it to a paragraph
// (keeps the text on its own line) instead of merging into the previous item.
function _grimBackspaceOutdent(e) {
    const bo = document.getElementById('grim-body');
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount || !sel.isCollapsed) return false;
    const range = sel.getRangeAt(0);
    let li = sel.anchorNode;
    while (li && li !== bo && li.tagName !== 'LI') li = li.parentNode;
    if (!li || li.tagName !== 'LI') return false;
    // only fire when the caret sits at the very start of the item
    const probe = document.createRange();
    probe.selectNodeContents(li);
    probe.setEnd(range.startContainer, range.startOffset);
    if (probe.toString().length) return false;
    e.preventDefault();
    _grimPlaceMarker();
    _grimConvertLine(li, 'p');
    _grimMergeAdjacentLists(bo);
    _grimRestoreMarker(bo);
    _grimAfterEdit(bo);
    return true;
}
function _grimSyncToolbar() {
    const bar = document.getElementById('grim-fmt-bar');
    if (!bar) return;
    const set = (cmd, on) => { const b = bar.querySelector(`[data-cmd="${cmd}"]`); if (b) b.classList.toggle('on', on); };
    try {
        set('bold', document.queryCommandState('bold'));
        set('italic', document.queryCommandState('italic'));
        set('underline', document.queryCommandState('underline'));
        set('strike', document.queryCommandState('strikeThrough'));
        // List context by DOM walk — a checklist is a UL too, so queryCommandState
        // can't tell ul/ul.task/ol apart; light the right button only.
        const bo = document.getElementById('grim-body');
        const sel = window.getSelection();
        let ulTask = false, ulPlain = false, ol = false, n = sel && sel.anchorNode;
        while (n && n !== bo) {
            if (n.tagName === 'OL') { ol = true; break; }
            if (n.tagName === 'UL') { n.classList.contains('task') ? ulTask = true : ulPlain = true; break; }
            n = n.parentNode;
        }
        set('ul', ulPlain);
        set('ol', ol);
        set('task', ulTask);
        const block = (document.queryCommandValue('formatBlock') || '').toLowerCase();
        ['h1','h2','h3'].forEach(h => set(h, block === h));
        set('quote', block === 'blockquote');
        set('codeblock', !!_grimClosestPre(sel && sel.anchorNode, bo));   // п.8
    } catch (_) { /* queryCommand* can throw if not focused */ }
}

// ── Tables (этап 2) ──────────────────────────────────────────────────────
// Insert via a hover size-grid (N×M); edit via a floating bar above the focused
// cell (add/remove rows & columns); Tab walks cells. First row = header (<th>)
// so markdown export yields a standard pipe table.
const GRIM_TBL_MAX = 8;

// Toggle the size-grid popover under the toolbar's table button.
function grimTableMenu(e) {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    const existing = document.getElementById('grim-table-pop');
    if (existing) { existing.remove(); return; }
    const pop = document.createElement('div');
    pop.id = 'grim-table-pop';
    pop.className = 'grim-table-pop';
    const grid = document.createElement('div');
    grid.className = 'gtp-grid';
    const lbl = document.createElement('div');
    lbl.className = 'gtp-lbl';
    lbl.textContent = 'размер';
    for (let r = 1; r <= GRIM_TBL_MAX; r++) {
        for (let c = 1; c <= GRIM_TBL_MAX; c++) {
            const cell = document.createElement('div');
            cell.className = 'gtp-c';
            cell.dataset.r = r; cell.dataset.c = c;
            cell.addEventListener('mouseenter', () => {
                lbl.textContent = c + ' × ' + r;
                grid.querySelectorAll('.gtp-c').forEach(x =>
                    x.classList.toggle('hot', +x.dataset.r <= r && +x.dataset.c <= c));
            });
            cell.addEventListener('mousedown', ev => { ev.preventDefault(); grimInsertTable(c, r); pop.remove(); });
            grid.appendChild(cell);
        }
    }
    pop.appendChild(grid);
    pop.appendChild(lbl);
    document.body.appendChild(pop);
    const rect = e.currentTarget.getBoundingClientRect();
    pop.style.top  = (rect.bottom + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - pop.offsetWidth - 10)) + 'px';
    setTimeout(() => {
        const off = ev => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('mousedown', off, true); } };
        document.addEventListener('mousedown', off, true);
    }, 0);
}

// Build and drop a cols×rows table at the caret (first row = header).
function grimInsertTable(cols, rows) {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    bo.focus();
    cols = Math.max(1, Math.min(GRIM_TBL_MAX, cols | 0));
    rows = Math.max(1, Math.min(GRIM_TBL_MAX, rows | 0));
    const mkCell = tag => { const el = document.createElement(tag); el.appendChild(document.createElement('br')); return el; };
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const htr = document.createElement('tr');
    for (let c = 0; c < cols; c++) htr.appendChild(mkCell('th'));
    thead.appendChild(htr);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    const dataRows = Math.max(1, rows - 1);     // always at least one body row to type into
    for (let r = 0; r < dataRows; r++) {
        const tr = document.createElement('tr');
        for (let c = 0; c < cols; c++) tr.appendChild(mkCell('td'));
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    // undo-audit (Part 2, inserts-only): insert NEW content at the caret via
    // execCommand('insertHTML') so the browser records it on its own undo stack
    // → Ctrl+Z reverts the whole table (verified). The transient data-gtnew marker
    // lets us re-find the freshly-parsed table to drop the caret into its first cell.
    table.setAttribute('data-gtnew', '1');
    document.execCommand('insertHTML', false, table.outerHTML + '<p><br></p>');
    const fresh = bo.querySelector('table[data-gtnew]');
    if (fresh) {
        fresh.removeAttribute('data-gtnew');
        _grimCaretToStart(fresh.querySelector('th,td'));
    }
    _grimAfterEdit(bo);
    requestAnimationFrame(_grimLayoutTableUI);   // draw the seal once geometry settles
}

// ── п.16: callouts (врезки) ─────────────────────────────────────────────────
// A callout is a plain <div class="grim-co grim-co-TYPE"><div class="grim-co-body">…</div></div>.
// No icon node is stored — the gothic glyph is painted by CSS (::before mask), so the
// saved body stays tiny and the sanitizer only has to bless the class. Three types:
// info (заметка/важное, фиолет), warn (опасность, красный), secret (тайна, приглушённый).
const GRIM_CO = {
    info:   { cls: 'grim-co-info',   name: 'Скрижаль',
              ic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2" opacity=".55"/><circle cx="12" cy="12" r="6.6"/><path d="M12 4.6V8M12 16V19.4M4.6 12H8M16 12H19.4" opacity=".7"/><path d="M12 7.2 13.4 10.6 16.8 12 13.4 13.4 12 16.8 10.6 13.4 7.2 12 10.6 10.6Z" fill="currentColor" fill-opacity=".22"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>` },
    warn:   { cls: 'grim-co-warn',   name: 'Угроза',
              ic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11.4C5 6.9 8.1 3.7 12 3.7C15.9 3.7 19 6.9 19 11.4C19 13.6 18.1 15.1 17 16.1V18.4C17 19.2 16.4 19.6 15.7 19.6H8.3C7.6 19.6 7 19.2 7 18.4V16.1C5.9 15.1 5 13.6 5 11.4Z"/><circle cx="9" cy="11.4" r="1.9" fill="currentColor" fill-opacity=".25"/><circle cx="15" cy="11.4" r="1.9" fill="currentColor" fill-opacity=".25"/><path d="M12 13.4 11 15.6H13Z" fill="currentColor" stroke="none"/><path d="M9.2 19.6V17.6M12 19.6V17.4M14.8 19.6V17.6" opacity=".75"/></svg>` },
    secret: { cls: 'grim-co-secret', name: 'Шёпот',
              ic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 12C5 8.4 8.3 6.6 12 6.6C15.7 6.6 19 8.4 21.4 12C19 15.6 15.7 17.4 12 17.4C8.3 17.4 5 15.6 2.6 12Z"/><circle cx="12" cy="12" r="3.3"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/></svg>` },
};

// Walk up from a node to the enclosing callout, if any (so we never nest one).
function _grimClosestCallout(node, bo) {
    let n = node;
    while (n && n !== bo) {
        if (n.nodeType === 1 && n.classList && n.classList.contains('grim-co')) return n;
        n = n.parentNode;
    }
    return null;
}

// Toolbar → small type-picker popover under the callout button.
function grimCalloutMenu(e) {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    const existing = document.getElementById('grim-co-pop');
    if (existing) { existing.remove(); return; }
    const pop = document.createElement('div');
    pop.id = 'grim-co-pop';
    pop.className = 'grim-co-pop';
    ['info', 'warn', 'secret'].forEach(k => {
        const it = GRIM_CO[k];
        const row = document.createElement('button');
        row.className = 'grim-co-pop-it ' + it.cls;
        row.innerHTML = `<span class="grim-co-pop-ic">${it.ic}</span><span>${it.name}</span>`;
        row.addEventListener('mousedown', ev => { ev.preventDefault(); grimCallout(k); pop.remove(); });
        pop.appendChild(row);
    });
    document.body.appendChild(pop);
    const rect = e.currentTarget.getBoundingClientRect();
    pop.style.top  = (rect.bottom + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - pop.offsetWidth - 10)) + 'px';
    setTimeout(() => {
        const off = ev => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('mousedown', off, true); } };
        document.addEventListener('mousedown', off, true);
    }, 0);
}

// Drop a callout of `type` at the caret (selected text becomes its body). Inserted
// via execCommand('insertHTML') so it joins the native undo stack (Ctrl+Z reverts it).
function grimCallout(type) {
    const bo = document.getElementById('grim-body');
    if (!bo) return;
    bo.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    if (_grimClosestCallout(sel.anchorNode, bo)) return;       // never nest callouts
    const it = GRIM_CO[type] || GRIM_CO.info;
    const text = sel.toString();
    const inner = text ? escHtml(text) : '<br>';
    const html = '<div class="grim-co ' + it.cls + '" data-gtnew="1"><div class="grim-co-body"><p>' + inner + '</p></div></div><p data-gtnew2="1"><br></p>';
    document.execCommand('insertHTML', false, html);
    const co = bo.querySelector('.grim-co[data-gtnew]');
    if (co) {
        co.removeAttribute('data-gtnew');
        // insertHTML splits the caret's block — if that block was empty, it leaves a
        // blank line above the callout. Drop it so the врезка sits on the caret's line.
        const prev = co.previousElementSibling;
        if (prev && /^(P|DIV)$/.test(prev.tagName) && _grimCollapse(prev.textContent) === '' && !prev.querySelector('img,hr,table')) prev.remove();
        const p = co.querySelector('.grim-co-body p, .grim-co-body');
        if (p) _grimCaretToStart(p);
    }
    _grimAfterEdit(bo);
}

// Resolve the cell / row / table around the caret (null when outside any table).
function _grimCellCtx() {
    const bo = document.getElementById('grim-body');
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount) return null;
    let n = sel.anchorNode;
    while (n && n !== bo && !/^(TD|TH)$/.test(n.tagName || '')) n = n.parentNode;
    if (!n || n === bo) return null;
    let table = n;
    while (table && table.tagName !== 'TABLE') table = table.parentNode;
    if (!table || !bo.contains(table)) return null;
    return { cell: n, row: n.parentNode, table };
}

// The structure-edit overlay lives INSIDE .grim-page (a positioned, non-editable
// sibling of the body) → it scrolls glued to the table, occupies no flow space,
// and never persists into note.body. Each table carries a wax-seal sigil at its
// top-right corner; clicking it enters "edit structure" mode for THAT table —
// gutter handles appear over every column (above the header) and beside every
// DATA row (the header row has no gutter: it is mandatory for markdown and can't
// be deleted). Clicking a gutter opens a small floating menu (add before / delete
// / add after). The caret never triggers any of this, so clicking a cell to edit
// its text stays quiet.
let _grimEditTbl = null;    // table currently in structure-edit mode (or null)
let _grimMenu = null;       // { el, gutter, kind } of the open floating menu (or null)
let _grimTblRAF = 0;
let _grimRO = null;         // ResizeObserver re-gluing the overlay when the body reflows
let _grimTitleRO = null;    // ResizeObserver re-growing the title <textarea> when its width changes
let _grimHoverTbl = null;   // table the pointer is currently over (seal shows on hover)
let _grimHoverSeal = null;  // table whose seal the pointer is over (keeps it visible)

// Relayout whenever the editor body changes size — covers webfont swap, container
// reveal, and content reflow, all of which move table geometry after first paint.
// Also wire (once per body) the hover delegation that reveals each table's seal.
function _grimObserveBody(bo) {
    if (!bo) return;
    if ('ResizeObserver' in window) {
        if (!_grimRO) _grimRO = new ResizeObserver(() => _grimScheduleTableUI());
        _grimRO.disconnect();
        _grimRO.observe(bo);
    }
    if (!bo._grimHoverWired) {
        const onHover = e => {
            const t = (e.relatedTarget && e.relatedTarget.closest) ? e.relatedTarget.closest('table') : null;
            const over = (e.target && e.target.closest) ? e.target.closest('table') : null;
            const next = e.type === 'mouseout' ? t : (over || t);
            if (next !== _grimHoverTbl) { _grimHoverTbl = next; _grimApplySealVis(); }
        };
        bo.addEventListener('mouseover', onHover);
        bo.addEventListener('mouseout', onHover);
        bo._grimHoverWired = true;
    }
}
// Toggle each seal's visibility: shown while its table is hovered, its seal is
// hovered, or it's the table in edit mode.
function _grimApplySealVis() {
    const ov = document.querySelector('#grim-detail .grim-tctl');
    if (!ov) return;
    ov.querySelectorAll('.gtc-seal').forEach(s => {
        const t = s._gtcTable;
        s.classList.toggle('gtc-show', !!t && (t === _grimEditTbl || t === _grimHoverTbl || t === _grimHoverSeal));
    });
}

function _grimTctl() {
    const page = document.querySelector('#grim-detail .grim-page');
    if (!page) return null;
    let ov = page.querySelector(':scope > .grim-tctl');
    if (!ov) {
        ov = document.createElement('div');
        ov.className = 'grim-tctl';
        ov.setAttribute('contenteditable', 'false');
        page.appendChild(ov);
    }
    return ov;
}
// Coalesce frequent relayouts (typing, resize) into one per frame.
function _grimScheduleTableUI() {
    if (_grimTblRAF) return;
    _grimTblRAF = requestAnimationFrame(() => { _grimTblRAF = 0; _grimLayoutTableUI(); });
}
// (Re)build the overlay from current geometry: a seal per table, plus gutters /
// frame / edge rails for the table in edit mode. Offsets are measured within the
// page's content box so they stay glued through scroll.
function _grimLayoutTableUI() {
    const bo = document.getElementById('grim-body');
    const page = document.querySelector('#grim-detail .grim-page');
    if (!bo || !page) return;
    if (_grimEditTbl && !bo.contains(_grimEditTbl)) _grimEditTbl = null;
    _grimCloseTableMenu();
    const ov = _grimTctl();
    if (!ov) return;
    ov.innerHTML = '';
    const tables = [...bo.querySelectorAll('table')];
    if (!tables.length) { ov.classList.remove('on'); return; }
    ov.classList.add('on');
    const pr = page.getBoundingClientRect();
    const ox = pr.left + page.clientLeft, oy = pr.top + page.clientTop;
    const R = Math.round;
    tables.forEach(table => {
        const tr = table.getBoundingClientRect();
        if (!tr.width || !tr.height) return;   // not laid out yet → skip; observer retries
        const seal = document.createElement('button');
        seal.type = 'button';
        seal.className = 'gtc-seal' + (table === _grimEditTbl ? ' on' : '');
        seal.title = 'Правка структуры таблицы';
        seal.innerHTML = `<span class="gtc-ring"></span>${FIC.tblSigil}`;
        seal._gtcTable = table;
        seal._gtcReflow = (ox2, oy2) => { const r = table.getBoundingClientRect(); seal.style.left = R(r.right - ox2) + 'px'; seal.style.top = R(r.top - oy2) + 'px'; };
        seal._gtcReflow(ox, oy);
        seal.addEventListener('mousedown', e => e.preventDefault());
        seal.addEventListener('mouseenter', () => { _grimHoverSeal = table; _grimApplySealVis(); });
        seal.addEventListener('mouseleave', () => { if (_grimHoverSeal === table) _grimHoverSeal = null; _grimApplySealVis(); });
        seal.addEventListener('click', e => {
            e.stopPropagation();
            _grimEditTbl = (table === _grimEditTbl) ? null : table;
            _grimLayoutTableUI();
        });
        ov.appendChild(seal);
        if (table !== _grimEditTbl) return;
        const frame = document.createElement('div');
        frame.className = 'gtc-frame';
        frame._gtcReflow = (ox2, oy2) => { const r = table.getBoundingClientRect(); Object.assign(frame.style, { left: R(r.left - ox2) + 'px', top: R(r.top - oy2) + 'px', width: R(r.width) + 'px', height: R(r.height) + 'px' }); };
        frame._gtcReflow(ox, oy);
        ov.appendChild(frame);
        const head = (table.tHead && table.tHead.rows[0]) ? table.tHead.rows[0] : table.rows[0];
        if (head) [...head.cells].forEach((cell, ci) => {
            const g = document.createElement('div');
            g.className = 'gtc-gut gtc-colgut';
            g._gtcReflow = (ox2, oy2) => { const cr = cell.getBoundingClientRect(), r = table.getBoundingClientRect(); Object.assign(g.style, { left: R(cr.left - ox2) + 'px', top: R(r.top - oy2 - 20) + 'px', width: R(cr.width) + 'px' }); };
            g._gtcReflow(ox, oy);
            g.innerHTML = `<span class="gtc-grip">${FIC.tblGrip}</span>`;
            g.addEventListener('mousedown', e => e.preventDefault());
            g.addEventListener('click', e => { e.stopPropagation(); _grimToggleTableMenu(g, 'col', ci, table); });
            ov.appendChild(g);
        });
        const bodyRows = table.tBodies[0] ? [...table.tBodies[0].rows] : [...table.rows].slice(1);
        bodyRows.forEach(rowEl => {
            const g = document.createElement('div');
            g.className = 'gtc-gut gtc-rowgut';
            g._gtcReflow = (ox2, oy2) => { const rr = rowEl.getBoundingClientRect(), r = table.getBoundingClientRect(); Object.assign(g.style, { left: R(r.left - ox2 - 20) + 'px', top: R(rr.top - oy2) + 'px', height: R(rr.height) + 'px' }); };
            g._gtcReflow(ox, oy);
            g.innerHTML = `<span class="gtc-grip">${FIC.tblGrip}</span>`;
            g.addEventListener('mousedown', e => e.preventDefault());
            g.addEventListener('click', e => { e.stopPropagation(); _grimToggleTableMenu(g, 'row', rowEl, table); });
            ov.appendChild(g);
        });
        const edgeCol = document.createElement('button');
        edgeCol.type = 'button'; edgeCol.className = 'gtc-edge gtc-edge-col'; edgeCol.title = 'Добавить колонку';
        edgeCol.innerHTML = FIC.tblAdd;
        edgeCol._gtcReflow = (ox2, oy2) => { const r = table.getBoundingClientRect(); Object.assign(edgeCol.style, { left: R(r.right - ox2 + 8) + 'px', top: R(r.top - oy2 + r.height / 2) + 'px' }); };
        edgeCol._gtcReflow(ox, oy);
        edgeCol.addEventListener('mousedown', e => e.preventDefault());
        edgeCol.addEventListener('click', e => { e.stopPropagation(); grimTableAppend('col', table); });
        ov.appendChild(edgeCol);
        const edgeRow = document.createElement('button');
        edgeRow.type = 'button'; edgeRow.className = 'gtc-edge gtc-edge-row'; edgeRow.title = 'Добавить строку';
        edgeRow.innerHTML = FIC.tblAdd;
        edgeRow._gtcReflow = (ox2, oy2) => { const r = table.getBoundingClientRect(); Object.assign(edgeRow.style, { left: R(r.left - ox2 + r.width / 2) + 'px', top: R(r.bottom - oy2 + 8) + 'px' }); };
        edgeRow._gtcReflow(ox, oy);
        edgeRow.addEventListener('mousedown', e => e.preventDefault());
        edgeRow.addEventListener('click', e => { e.stopPropagation(); grimTableAppend('row', table); });
        ov.appendChild(edgeRow);
    });
    _grimApplySealVis();   // hover-only: hide seals not hovered / not in edit mode
}
// Re-glue the overlay to current table geometry WITHOUT rebuilding it (no flicker,
// no fade-restart). Used while the toolbar reveal animation shifts the tables.
function _grimReflowOverlay() {
    const page = document.querySelector('#grim-detail .grim-page');
    const ov = page && page.querySelector(':scope > .grim-tctl');
    if (!page || !ov || !ov.classList.contains('on')) return;
    const pr = page.getBoundingClientRect();
    const ox = pr.left + page.clientLeft, oy = pr.top + page.clientTop;
    [...ov.children].forEach(el => { if (el._gtcReflow) el._gtcReflow(ox, oy); });
}
// The toolbar reveal/hide (hover OR manual mode) shifts the tables down/up; follow
// that transition frame-by-frame so each seal stays pinned to its table's corner.
function _grimWireBarFollow(page) {
    const bar = page && page.querySelector('.fmt-bar');
    if (!bar || bar._grimFollowWired) return;
    bar._grimFollowWired = true;
    let frames = 0, raf = 0;
    const loop = () => { _grimReflowOverlay(); if (--frames > 0) raf = requestAnimationFrame(loop); else raf = 0; };
    bar.addEventListener('transitionrun', () => { frames = 32; if (!raf) raf = requestAnimationFrame(loop); });
    bar.addEventListener('transitionend', () => { _grimReflowOverlay(); });
}
function _grimCloseTableMenu() {
    if (!_grimMenu) return;
    _grimMenu.el.remove();
    if (_grimMenu.gutter) _grimMenu.gutter.classList.remove('gtc-active');
    _grimMenu = null;
}
// Open (or, on the already-active gutter, close) the floating add/delete menu.
function _grimToggleTableMenu(gutter, kind, ref, table) {
    const wasActive = _grimMenu && _grimMenu.gutter === gutter;
    _grimCloseTableMenu();
    if (wasActive) return;
    const ov = _grimTctl();
    if (!ov) return;
    const bo = document.getElementById('grim-body');
    const menu = document.createElement('div');
    menu.className = 'gtc-pop';
    menu.setAttribute('contenteditable', 'false');
    const mk = (cls, title, glyph, op) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'gtc-mbtn' + (cls ? ' ' + cls : ''); b.title = title; b.innerHTML = glyph;
        b.addEventListener('mousedown', e => e.preventDefault());
        b.addEventListener('click', e => {
            e.stopPropagation();
            op();
            _grimCloseTableMenu();
            if (bo) _grimAfterEdit(bo);
            _grimLayoutTableUI();
        });
        return b;
    };
    if (kind === 'col') {
        const ci = ref;
        menu.appendChild(mk('', 'Колонка слева', FIC.tblAdd, () => _grimColInsert(table, ci, false)));
        menu.appendChild(mk('del', 'Удалить колонку', FIC.tblDel, () => _grimColDelete(table, ci)));
        menu.appendChild(mk('', 'Колонка справа', FIC.tblAdd, () => _grimColInsert(table, ci, true)));
        // ── п.13: column alignment L/C/R (markdown-native, per column) ──
        const div = document.createElement('span'); div.className = 'gtc-divline'; menu.appendChild(div);
        const aBtns = {};
        const setActive = a => Object.keys(aBtns).forEach(k => aBtns[k].classList.toggle('on', k === a));
        const mkAlign = (a, title, glyph) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'gtc-mbtn gtc-align'; b.title = title + ' (Shift — всем колонкам)'; b.innerHTML = glyph;
            b.addEventListener('mousedown', e => e.preventDefault());
            b.addEventListener('click', e => {
                e.stopPropagation();
                if (e.shiftKey) {
                    const n = table.rows[0] ? table.rows[0].cells.length : 0;
                    for (let c = 0; c < n; c++) _grimColAlign(table, c, a);
                } else {
                    _grimColAlign(table, ci, a);
                }
                setActive(a);
                if (bo) _grimAfterEdit(bo);
                _grimLayoutTableUI();
            });
            aBtns[a] = b; return b;
        };
        menu.appendChild(mkAlign('l', 'По левому краю', FIC.alignL));
        menu.appendChild(mkAlign('c', 'По центру', FIC.alignC));
        menu.appendChild(mkAlign('r', 'По правому краю', FIC.alignR));
        setActive(_grimColGetAlign(table, ci));
    } else {
        const rowEl = ref;
        menu.appendChild(mk('', 'Строка выше', FIC.tblAdd, () => _grimRowInsert(table, rowEl, false)));
        menu.appendChild(mk('del', 'Удалить строку', FIC.tblDel, () => _grimRowDelete(table, rowEl)));
        menu.appendChild(mk('', 'Строка ниже', FIC.tblAdd, () => _grimRowInsert(table, rowEl, true)));
    }
    ov.appendChild(menu);
    gutter.classList.add('gtc-active');
    _grimMenu = { el: menu, gutter, kind };
    // position above the gutter, clamped to the page; flip below if there's no room
    const page = document.querySelector('#grim-detail .grim-page');
    const prr = page.getBoundingClientRect();
    const ox = prr.left + page.clientLeft, oy = prr.top + page.clientTop;
    const gr = gutter.getBoundingClientRect();
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let left = (gr.left - ox) + gr.width / 2 - mw / 2;
    let top = (gr.top - oy) - mh - 6;
    left = Math.max(2, Math.min(left, page.clientWidth - mw - 2));
    if (top < 0) top = (gr.bottom - oy) + 6;
    Object.assign(menu.style, { left: left + 'px', top: top + 'px' });
}
// Staged Esc / dismissal: drop the size-grid picker, then the menu, then the mode.
function _grimDismissTableUI() {
    const pop = document.getElementById('grim-table-pop'); if (pop) { pop.remove(); return true; }
    if (_grimMenu) { _grimCloseTableMenu(); return true; }
    if (_grimEditTbl) { _grimEditTbl = null; _grimLayoutTableUI(); return true; }
    return false;
}
// Full teardown — used when the detail pane re-renders.
function _grimHideTableUI() {
    const pop = document.getElementById('grim-table-pop'); if (pop) pop.remove();
    _grimCloseTableMenu();
    _grimEditTbl = null;
    const ov = document.querySelector('#grim-detail .grim-tctl');
    if (ov) { ov.innerHTML = ''; ov.classList.remove('on'); }
}

// Edge rails: append a column (right) or row (bottom) at the end of the table.
function grimTableAppend(kind, table) {
    const bo = document.getElementById('grim-body');
    table = table || _grimEditTbl;
    if (!bo || !table || !bo.contains(table)) return;
    if (kind === 'col') {
        [...table.rows].forEach(tr => {
            const last = tr.cells[tr.cells.length - 1];
            const nc = document.createElement(last && last.tagName === 'TH' ? 'th' : 'td');
            nc.appendChild(document.createElement('br'));
            tr.appendChild(nc);
        });
    } else {
        const ncols = table.rows[0] ? table.rows[0].cells.length : 1;
        const ntr = document.createElement('tr');
        for (let i = 0; i < ncols; i++) { const td = document.createElement('td'); td.appendChild(document.createElement('br')); ntr.appendChild(td); }
        let tb = table.tBodies[0];
        if (!tb) { tb = document.createElement('tbody'); table.appendChild(tb); }
        tb.appendChild(ntr);
    }
    _grimAfterEdit(bo);
    _grimLayoutTableUI();
}

// Index-based structure ops, driven by the gutter menus (not the caret).
function _grimColInsert(table, ci, after) {
    [...table.rows].forEach(tr => {
        const ref = tr.cells[ci];
        const nc = document.createElement(ref && ref.tagName === 'TH' ? 'th' : 'td');
        nc.appendChild(document.createElement('br'));
        tr.insertBefore(nc, after ? (ref ? ref.nextSibling : null) : (ref || null));
    });
}
function _grimColDelete(table, ci) {
    if (table.rows[0] && table.rows[0].cells.length <= 1) { _grimRemoveTable(table); return; }
    [...table.rows].forEach(tr => { if (tr.cells[ci]) tr.deleteCell(ci); });
}
// п.13: set/read per-column text alignment (left = no class, default).
function _grimColAlign(table, ci, a) {
    [...table.rows].forEach(tr => {
        const c = tr.cells[ci]; if (!c) return;
        c.classList.remove('align-c', 'align-r');
        if (a === 'c') c.classList.add('align-c');
        else if (a === 'r') c.classList.add('align-r');
        if (!c.className) c.removeAttribute('class');
    });
}
function _grimColGetAlign(table, ci) {
    const c = table.rows[0] && table.rows[0].cells[ci];
    if (!c) return 'l';
    return c.classList.contains('align-c') ? 'c' : c.classList.contains('align-r') ? 'r' : 'l';
}
function _grimRowInsert(table, rowEl, after) {
    const ncols = rowEl.cells.length;
    const tr = document.createElement('tr');
    for (let i = 0; i < ncols; i++) { const td = document.createElement('td'); td.appendChild(document.createElement('br')); tr.appendChild(td); }
    rowEl.parentNode.insertBefore(tr, after ? rowEl.nextSibling : rowEl);
}
function _grimRowDelete(table, rowEl) {
    const n = table.tBodies[0] ? table.tBodies[0].rows.length : 0;
    if (n <= 1) { _grimRemoveTable(table); return; }   // removing the last data row drops the whole table
    rowEl.parentNode.removeChild(rowEl);
}
function _grimRemoveTable(table) {
    if (table === _grimEditTbl) _grimEditTbl = null;
    table.remove();
}

// Tab / Shift+Tab walks cells; Tab past the last cell appends a row.
function _grimTableTab(e) {
    const ctx = _grimCellCtx();
    if (!ctx) return false;
    e.preventDefault();
    const cells = [...ctx.table.querySelectorAll('th,td')];
    const i = cells.indexOf(ctx.cell);
    if (e.shiftKey) {
        if (i > 0) _grimCaretToStart(cells[i - 1]);
    } else if (i < cells.length - 1) {
        _grimCaretToStart(cells[i + 1]);
    } else {
        grimTableAppend('row', ctx.table);
        const next = [...ctx.table.querySelectorAll('th,td')][i + 1];
        if (next) _grimCaretToStart(next);
    }
    return true;
}

// Hand-drawn toolbar glyphs.
const FIC = {
    bold:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z"/><path d="M7 12h7a3.5 3.5 0 0 1 0 7H7z"/></svg>`,
    italic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="10" y1="5" x2="17" y2="5"/><line x1="7" y1="19" x2="14" y2="19"/><line x1="14" y1="5" x2="10" y2="19"/></svg>`,
    underline: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4.5v6a5 5 0 0 0 10 0v-6"/><line x1="5.5" y1="20" x2="18.5" y2="20"/></svg>`,
    strike: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4.5" y1="12" x2="19.5" y2="12"/><path d="M16.5 7.6C15.7 6 13.9 5 11.9 5 9.3 5 7.5 6.3 7.5 8.3c0 1.3.8 2.2 2.2 2.8"/><path d="M8 16.2c.7 1.6 2.4 2.6 4.4 2.6 2.5 0 4.2-1.3 4.2-3.2"/></svg>`,
    ul:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.6"/></svg>`,
    ol:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 5l1.5-.5V9M4 9h3"/></svg>`,
    task:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="6" height="6" rx="1.2"/><path d="M4.5 7.5l1 1 2-2.2"/><rect x="3" y="14" width="6" height="6" rx="1.2"/><path d="M12 7.5h9M12 17h9"/></svg>`,
    quote:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7c-2 0-3.5 1.6-3.5 3.6S7 14 9 14c0 2-1.2 3-3 3.4M19 7c-2 0-3.5 1.6-3.5 3.6S17 14 19 14c0 2-1.2 3-3 3.4"/></svg>`,
    code:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/></svg>`,
    // Multi-line code block — the inline </> motif framed in a panel (a code "tablet").
    codeBlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M10 10l-2.2 2 2.2 2M14 10l2.2 2-2.2 2"/></svg>`,
    hr:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="9" y2="12"/><path d="M12 9.5l2.2 2.5-2.2 2.5-2.2-2.5z" fill="currentColor" stroke="none"/><line x1="15" y1="12" x2="21" y2="12"/></svg>`,
    link:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 6 .5l2.5-2.5a4 4 0 0 0-5.6-5.6L11 8"/><path d="M14 10a4 4 0 0 0-6-.5L5.5 12a4 4 0 0 0 5.6 5.6L13 16"/></svg>`,
    md:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11"/><path d="M8 11l4 3 4-3"/><path d="M5 19h14"/></svg>`,
    // Callout (врезка) — a framed plaque with a heavy accent rail + a sigil-star,
    // standing for a marked block of lore.
    callout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M7 5v14" stroke-width="2.6"/><path d="M11 9.1 12 7.2 13 9.1 15.1 9.4 13.6 10.9 13.9 13 12 12 10.1 13 10.4 10.9 8.9 9.4Z" fill="currentColor" stroke="none" opacity=".85"/><path d="M10.6 15.4h6" opacity=".65"/></svg>`,
    table:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="3.5" y1="14.5" x2="20.5" y2="14.5"/><line x1="9.5" y1="4.5" x2="9.5" y2="19.5"/><line x1="15" y1="4.5" x2="15" y2="19.5"/></svg>`,
    // Table structure glyphs (approved set): cross-potent + diamond = add; a
    // sickle (contour blade + filled handle) = delete; a fleur-de-lis grip on the
    // gutters; a rose-window rosette as the edit-structure sigil.
    tblAdd:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5v15M4.5 12h15"/><path d="M10.2 4.5h3.6M10.2 19.5h3.6M4.5 10.2v3.6M19.5 10.2v3.6"/><path d="M12 9.4l2.6 2.6-2.6 2.6-2.6-2.6z" fill="currentColor" stroke="none"/></svg>`,
    tblDel:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8.7 15.4C6.1 10.8 9.2 4.9 18 5.3c-4.7 1-6.9 4.2-6.7 8.1"/><path d="M9.6 14.5l2.3 2.3-3.5 3.5a1.6 1.6 0 0 1-2.3-2.3z" fill="currentColor" stroke="none"/></svg>`,
    tblGrip:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.6c1.7 0 2.2 2 .95 3.2 1.85-.2 3.35 1.25 2.6 3.1-.55 1.5-2.5 1.95-3.55.85M12 4.6c-1.7 0-2.2 2-.95 3.2-1.85-.2-3.35 1.25-2.6 3.1.55 1.5 2.5 1.95 3.55.85M12 7.4V19.4M9.3 19.4h5.4"/></svg>`,
    tblSigil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 6.4a3.1 3.1 0 0 1 0 5.6 3.1 3.1 0 0 1 0-5.6z M12 12a3.1 3.1 0 0 1 0 5.6 3.1 3.1 0 0 1 0-5.6z M6.4 12a3.1 3.1 0 0 1 5.6 0 3.1 3.1 0 0 1-5.6 0z M12 12a3.1 3.1 0 0 1 5.6 0 3.1 3.1 0 0 1-5.6 0z"/></svg>`,
    // align L/C/R — scribe lines anchored to an ornamented edge rule (banner, variant B)
    alignL:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.6V19.4"/><path d="M4 4.6 2.8 5.8 4 7 5.2 5.8Z" fill="currentColor" stroke="none"/><path d="M4 19.4 2.8 18.2 4 17 5.2 18.2Z" fill="currentColor" stroke="none"/><path d="M6.5 8h12"/><path d="M6.5 12h8"/><path d="M6.5 16h13"/></svg>`,
    alignC:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.6V19.4"/><path d="M12 4.6 10.8 5.8 12 7 13.2 5.8Z" fill="currentColor" stroke="none"/><path d="M12 19.4 10.8 18.2 12 17 13.2 18.2Z" fill="currentColor" stroke="none"/><path d="M6 8h12"/><path d="M8 12h8"/><path d="M5 16h14"/></svg>`,
    alignR:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4.6V19.4"/><path d="M20 4.6 18.8 5.8 20 7 21.2 5.8Z" fill="currentColor" stroke="none"/><path d="M20 19.4 18.8 18.2 20 17 21.2 18.2Z" fill="currentColor" stroke="none"/><path d="M5.5 8h12"/><path d="M9.5 12h8"/><path d="M4.5 16h13"/></svg>`,
};
function _grimToolbarHTML() {
    const btn = (cmd, on, title, svg) =>
        `<button class="fmt-btn" data-cmd="${cmd}" onmousedown="event.preventDefault()" onclick="${on}" title="${title}">${svg}</button>`;
    // .fmt-inner is a pure collapse wrapper (overflow-hidden, no box) so the toolbar
    // truly folds to 0 when hidden — no residual padding/border leaking a gap under
    // the divider. .fmt-cluster carries the chrome and centres its grouped rows when
    // they wrap, so every wrapped row stays balanced and centred.
    return `<div class="fmt-bar" id="grim-fmt-bar"><div class="fmt-inner"><div class="fmt-cluster" role="toolbar" aria-label="Форматирование">
        <span class="fmt-grp">
            <button class="fmt-btn fmt-h" data-cmd="h1" onmousedown="event.preventDefault()" onclick="grimHeading(1)" title="Заголовок 1">H1</button>
            <button class="fmt-btn fmt-h" data-cmd="h2" onmousedown="event.preventDefault()" onclick="grimHeading(2)" title="Заголовок 2">H2</button>
            <button class="fmt-btn fmt-h" data-cmd="h3" onmousedown="event.preventDefault()" onclick="grimHeading(3)" title="Заголовок 3">H3</button>
        </span>
        <span class="fmt-grp">
            ${btn('bold', "grimFmt('bold')", 'Жирный (Ctrl+B)', FIC.bold)}
            ${btn('italic', "grimFmt('italic')", 'Курсив (Ctrl+I)', FIC.italic)}
            ${btn('underline', "grimFmt('underline')", 'Подчёркнутый (Ctrl+U)', FIC.underline)}
            ${btn('strike', "grimFmt('strike')", 'Зачёркнутый', FIC.strike)}
        </span>
        <span class="fmt-grp">
            ${btn('ul', "grimFmt('ul')", 'Маркированный список', FIC.ul)}
            ${btn('ol', "grimFmt('ol')", 'Нумерованный список', FIC.ol)}
            ${btn('task', "grimChecklist()", 'Чек-лист', FIC.task)}
        </span>
        <span class="fmt-grp">
            ${btn('quote', "grimFmt('quote')", 'Цитата', FIC.quote)}
            ${btn('code', "grimInlineCode()", 'Код', FIC.code)}
            ${btn('codeblock', "grimCodeBlock()", 'Блок кода (```)', FIC.codeBlock)}
            ${btn('hr', "grimFmt('hr')", 'Разделитель', FIC.hr)}
            ${btn('link', "grimLink()", 'Ссылка (Ctrl+K)', FIC.link)}
        </span>
        <span class="fmt-grp">${btn('table', "grimTableMenu(event)", 'Таблица', FIC.table)}</span>
        <span class="fmt-grp">${btn('callout', "grimCalloutMenu(event)", 'Врезка (каллаут)', FIC.callout)}</span>
        <span class="fmt-grp">
            <button class="fmt-btn export" onmousedown="event.preventDefault()" onclick="grimExportNote()" title="Экспорт записи в .md">${FIC.md}<span>.md</span></button>
        </span>
    </div></div></div>`;
}

// ── Markdown export ─────────────────────────────────────────────────────
function _grimDownload(name, text, mime) {
    const blob = new Blob([text], { type: (mime || 'text/markdown') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Экспортировано: ' + name);
}
function _grimSlug(s) {
    return ((s || '').trim() || 'без-заглавия').replace(/[\\/:*?"<>|]+/g, '').slice(0, 60);
}
function _grimInlineMd(node) {
    let out = '';
    node.childNodes.forEach(n => {
        if (n.nodeType === 3) { out += n.textContent; return; }
        if (n.nodeType !== 1) return;
        const t = n.tagName;
        if (t === 'STRONG' || t === 'B') out += '**' + _grimInlineMd(n) + '**';
        else if (t === 'EM' || t === 'I') out += '*' + _grimInlineMd(n) + '*';
        else if (t === 'U') out += '<u>' + _grimInlineMd(n) + '</u>';
        else if (t === 'S' || t === 'STRIKE' || t === 'DEL') out += '~~' + _grimInlineMd(n) + '~~';
        else if (t === 'CODE') out += '`' + n.textContent.split(String.fromCharCode(0x200B)).join('') + '`';
        else if (t === 'A') out += '[' + _grimInlineMd(n) + '](' + (n.getAttribute('href') || '') + ')';
        else if (t === 'BR') out += '  \n';
        else out += _grimInlineMd(n);
    });
    return out;
}
function _grimHtmlToMd(html) {
    const root = document.createElement('div');
    root.innerHTML = html || '';
    let md = '';
    root.childNodes.forEach(n => {
        if (n.nodeType === 3) { const t = n.textContent.trim(); if (t) md += t + '\n\n'; return; }
        if (n.nodeType !== 1) return;
        const tag = n.tagName;
        if (tag === 'H1') md += '# ' + _grimInlineMd(n) + '\n\n';
        else if (tag === 'H2') md += '## ' + _grimInlineMd(n) + '\n\n';
        else if (tag === 'H3') md += '### ' + _grimInlineMd(n) + '\n\n';
        else if (tag === 'BLOCKQUOTE') md += '> ' + _grimInlineMd(n).replace(/\n/g, '\n> ') + '\n\n';
        else if (tag === 'HR') md += '---\n\n';
        else if (tag === 'PRE') md += '```\n' + n.textContent.split(String.fromCharCode(0x200B)).join('').replace(/\n$/, '') + '\n```\n\n';
        else if (tag === 'TABLE') md += _grimTableToMd(n) + '\n';
        else if (tag === 'DIV' && n.classList.contains('grim-co')) {
            const kind = n.classList.contains('grim-co-warn') ? 'danger'
                       : n.classList.contains('grim-co-secret') ? 'secret' : 'note';
            const bodyEl = n.querySelector('.grim-co-body') || n;
            const inner = _grimHtmlToMd(bodyEl.innerHTML).split('\n').map(l => '> ' + l).join('\n');
            md += '> [!' + kind + ']\n' + inner + '\n\n';
        }
        else if (tag === 'UL') {
            const task = n.classList.contains('task');
            n.querySelectorAll(':scope > li').forEach(li => {
                md += (task ? '- [' + (li.classList.contains('done') ? 'x' : ' ') + '] ' : '- ') + _grimInlineMd(li) + '\n';
            });
            md += '\n';
        } else if (tag === 'OL') {
            let i = 1;
            n.querySelectorAll(':scope > li').forEach(li => { md += (i++) + '. ' + _grimInlineMd(li) + '\n'; });
            md += '\n';
        } else { // P, DIV, anything else block-ish
            const line = _grimInlineMd(n).trim();
            if (line) md += line + '\n\n';
        }
    });
    return md.trim();
}
// <table> → standard markdown pipe table (first row = header + separator).
function _grimTableToMd(table) {
    const rows = [...table.rows].map(tr =>
        [...tr.cells].map(c => _grimInlineMd(c).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim()));
    if (!rows.length) return '';
    const cols = Math.max(...rows.map(r => r.length));
    rows.forEach(r => { while (r.length < cols) r.push(''); });
    const line = cells => '| ' + cells.join(' | ') + ' |';
    const sep = [];
    for (let c = 0; c < cols; c++) {
        const a = _grimColGetAlign(table, c);
        sep.push(a === 'c' ? ':-:' : a === 'r' ? '--:' : '---');
    }
    let out = line(rows[0]) + '\n' + line(sep) + '\n';
    rows.slice(1).forEach(r => out += line(r) + '\n');
    return out;
}
function _grimNoteToMd(note) {
    return '# ' + ((note.title || '').trim() || 'Без заглавия') + '\n\n' + _grimHtmlToMd(note.body || '') + '\n';
}
function grimExportNote() {
    const note = _grimCurrentNote();
    if (!note) return;
    _grimDownload(_grimSlug(note.title) + '.md', _grimNoteToMd(note));
}
// ── п.13: unified import/export («Перенос») ─────────────────────────────────
// Backup = one .md, each note a YAML-frontmatter block (round-trips, keeps colour).
// Reading = ZIP (store), one .md per note (single note → bare .md). Detailed
// gothic glyphs (coffer+scroll / sealed tome / bound scrolls) — never emoji.
const GRIM_IO_IC = {
    import:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.4 13.2h15.2v5.4a1.2 1.2 0 0 1-1.2 1.2H5.6a1.2 1.2 0 0 1-1.2-1.2Z"/><path d="M4.4 13.2Q4.4 10.6 7 10.6h10q2.6 0 2.6 2.6"/><path d="M8.4 10.8v9M15.6 10.8v9" opacity=".5"/><circle cx="8.4" cy="12.6" r=".55" fill="currentColor" stroke="none"/><circle cx="15.6" cy="12.6" r=".55" fill="currentColor" stroke="none"/><rect x="10.7" y="14.6" width="2.6" height="3" rx=".4"/><circle cx="12" cy="15.6" r=".5"/><path d="M5.7 19.8l-.7 1.4M18.3 19.8l.7 1.4" opacity=".7"/><path d="M9.7 2.3h4.6q1 0 1 1v4.3q0 1-1 1H9.7q-1 0-1-1V3.3q0-1 1-1Z"/><path d="M14.3 2.3q1 0 1 1 0 .9-1 .9h-1.5" opacity=".65"/><path d="M8.7 3.6h5.6" opacity=".5"/><path d="M10.2 5.2h3.1M10.2 6.6h2.1" opacity=".45"/></svg>`,
    backup:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.4h10a1.6 1.6 0 0 1 1.6 1.6V19a1.6 1.6 0 0 1-1.6 1.6H6Q4 20.6 4 18.7V5.3Q4 3.4 6 3.4Z"/><path d="M6.6 3.4V20.6" opacity=".4"/><path d="M8 5.4 8.7 6.1 8 6.8 7.3 6.1Z" fill="currentColor" stroke="none" opacity=".7"/><path d="M15 5.4 15.7 6.1 15 6.8 14.3 6.1Z" fill="currentColor" stroke="none" opacity=".7"/><path d="M8 17.4 8.7 18.1 8 18.8 7.3 18.1Z" fill="currentColor" stroke="none" opacity=".7"/><path d="M15 17.4 15.7 18.1 15 18.8 14.3 18.1Z" fill="currentColor" stroke="none" opacity=".7"/><circle cx="11.8" cy="12" r="2.9"/><path d="M11.8 9.8 12.7 12 11.8 14.2 10.9 12Z" opacity=".65"/><path d="M17.6 10.2h1.4a.6.6 0 0 1 .6.6v2.4a.6.6 0 0 1-.6.6h-1.4"/></svg>`,
    reading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M14.2 4.2q1.3 0 1.3 1.4v11.2q0 1.4 1.3 1.4h-6.6q-1.3 0-1.3-1.4V5.6q0-1.4 1.3-1.4Z" opacity=".5"/><path d="M11.4 6.4q1.3 0 1.3 1.4v11.2q0 1.4 1.3 1.4H7.4q-1.3 0-1.3-1.4V7.8q0-1.4 1.3-1.4Z"/><path d="M6.1 7.5h6.6M6.1 19h6.6" opacity=".45"/><path d="M7.7 10.3h3.4M7.7 12.2h3.4M7.7 14.1h2.2" opacity=".45"/><path d="M4.4 13.4q7.5 2 15.2 0" opacity=".85"/><path d="M11.6 14.1q.5 1.5-.5 2.8m2-2.6q.6 1.4-.3 2.8" opacity=".6"/></svg>`,
    // «Полный бэкап» (.json + летопись) — warded coffer/vault: arched lid, banded
    // body, cross-keyhole seal. Carries the whole grimoire incl. «Летопись».
    full:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10.6q0-1.6 1.6-1.6h10.8q1.6 0 1.6 1.6v7.9a1.3 1.3 0 0 1-1.3 1.3H6.3A1.3 1.3 0 0 1 5 18.5Z"/><path d="M5 10.6q1-4.2 7-4.2t7 4.2" opacity=".7"/><path d="M5 13.2h14" opacity=".5"/><path d="M9 9V19.8M15 9V19.8" opacity=".4"/><circle cx="12" cy="13.1" r="1.45"/><path d="M12 14.5v2.3"/></svg>`,
};
function _grimDownloadBlob(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// notes for the export scope: 'all' = active grimoire; 'sel' = ticked (any segment).
function _grimScopeNotes(scope) {
    if (scope === 'sel') {
        return [...(state.notes || []), ...(state.notesArchive || [])].filter(n => grimSelectedIds.has(n.id));
    }
    return (state.notes || []).slice().sort((a, b) => (b.ord ?? b.updatedAt ?? 0) - (a.ord ?? a.updatedAt ?? 0));
}
// One note as a frontmatter block (title + optional colour) followed by its md body.
function _grimNoteToBackupMd(note) {
    const t = String(note.title || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    let fm = '---\ntitle: "' + t + '"\n';
    if (note.color) fm += 'color: ' + note.color + '\n';
    fm += '---\n\n';
    return fm + _grimHtmlToMd(note.body || '') + '\n';
}
function grimExportBackup(scope) {
    const arr = _grimScopeNotes(scope);
    _grimCloseIoMenu();
    if (!arr.length) { showToast('Нет записей для экспорта'); return; }
    _grimDownload((scope === 'sel' ? 'grimoire-selection' : 'grimoire-backup') + '.md',
                  arr.map(_grimNoteToBackupMd).join('\n'));
}
function grimExportReading(scope) {
    const arr = _grimScopeNotes(scope);
    _grimCloseIoMenu();
    if (!arr.length) { showToast('Нет записей для экспорта'); return; }
    if (arr.length === 1) { _grimDownload((_grimSlug(arr[0].title) || 'без-заглавия') + '.md', _grimNoteToMd(arr[0])); return; }
    const used = {};
    const files = arr.map(n => {
        const base = _grimSlug(n.title) || 'без-заглавия';
        let name = base + '.md', k = 2;
        while (used[name]) name = base + '-' + (k++) + '.md';
        used[name] = 1;
        return { name, text: _grimNoteToMd(n) };
    });
    _grimDownloadBlob('grimoire.zip', _grimZipStore(files));
    showToast('Экспортировано: grimoire.zip (' + files.length + ')');
}
// NA-3 (Б): full grimoire backup as JSON — unlike the .md/.zip exports this carries
// the rich data markdown can't hold: note ids (so «Летопись» re-attaches), colour,
// the склеп (archive), note templates, sort, AND the version store (grimVersions)
// for every exported note. Round-trips through grimImportFiles → choice modal
// («Добавить» / «Заменить»), restoring history. scope 'all' = whole grimoire;
// 'sel' = ticked notes + their letopis only.
function grimExportFullBackup(scope) {
    _grimCloseIoMenu();
    let notes, archive, templates;
    if (scope === 'sel') {
        const ids = grimSelectedIds;
        notes    = (state.notes || []).filter(n => ids.has(n.id));
        archive  = (state.notesArchive || []).filter(n => ids.has(n.id));
        templates = [];
        if (!notes.length && !archive.length) { showToast('Нет выбранных записей'); return; }
    } else {
        notes    = (state.notes || []).slice();
        archive  = (state.notesArchive || []).slice();
        templates = (state.noteTemplates || []).slice();
        if (!notes.length && !archive.length) { showToast('Нет записей для экспорта'); return; }
    }
    const ids = new Set([...notes, ...archive].map(n => n.id));
    const versions = {};
    for (const id of ids) { if (Array.isArray(grimVersions[id]) && grimVersions[id].length) versions[id] = grimVersions[id]; }
    const payload = {
        _grimFull: 1,
        notes, notesArchive: archive, noteTemplates: templates,
        notesSort: state.notesSort || null,
        _grimVersions: versions,
    };
    _grimDownload((scope === 'sel' ? 'grimoire-selection' : 'grimoire-full') + '.json',
                  JSON.stringify(payload, null, 2), 'application/json');
}

// Minimal store-method ZIP writer (no dependency). files = [{name, text}].
const _GRIM_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function _grimCrc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = _GRIM_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function _grimZipStore(files) {
    const enc = new TextEncoder();
    const u16 = v => [v & 0xFF, (v >> 8) & 0xFF];
    const u32 = v => [v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >>> 24) & 0xFF];
    const parts = [], central = []; let offset = 0;
    files.forEach(f => {
        const nameB = enc.encode(f.name), dataB = enc.encode(f.text), crc = _grimCrc32(dataB);
        const lh = [].concat([0x50, 0x4b, 0x03, 0x04], u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(dataB.length), u32(dataB.length), u16(nameB.length), u16(0));
        parts.push(new Uint8Array(lh), nameB, dataB);
        central.push({ nameB, crc, size: dataB.length, offset });
        offset += lh.length + nameB.length + dataB.length;
    });
    const cdStart = offset, cdParts = [];
    central.forEach(c => {
        const cd = [].concat([0x50, 0x4b, 0x01, 0x02], u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(c.crc), u32(c.size), u32(c.size), u16(c.nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.offset));
        cdParts.push(new Uint8Array(cd), c.nameB);
        offset += cd.length + c.nameB.length;
    });
    const cdSize = offset - cdStart;
    const eocd = new Uint8Array([].concat([0x50, 0x4b, 0x05, 0x06], u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(cdStart), u16(0)));
    const all = [...parts, ...cdParts, eocd];
    const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
    let p = 0; all.forEach(c => { out.set(c, p); p += c.length; });
    return new Blob([out], { type: 'application/zip' });
}

// ── «Перенос» popover (main bar: import + export-all; select bar: export-sel) ──
function _grimIoItem(icon, name, desc, onclick) {
    return `<div class="grim-tpl-item" role="menuitem" onclick="${onclick}">
        <span class="grim-tpl-ic">${icon}</span>
        <span class="grim-tpl-txt"><span class="grim-tpl-name">${escHtml(name)}</span><span class="grim-tpl-desc">${escHtml(desc)}</span></span>
    </div>`;
}
function _grimRenderIoMenu() {
    const pop = document.getElementById('grim-io-pop'); if (!pop) return;
    pop.innerHTML = '<div class="grim-tpl-head">Перенос записей</div>'
        + '<div class="grim-tpl-sect">Импорт</div>'
        + _grimIoItem(GRIM_IO_IC.import, 'Импорт файлов', '.md · .zip · .json · можно несколько', 'grimImportFiles()')
        + '<div class="grim-tpl-divline"></div><div class="grim-tpl-sect">Экспорт всего</div>'
        + _grimIoItem(GRIM_IO_IC.full, 'Полный бэкап записей', '.json · все записи Гримуара + летопись', "grimExportFullBackup('all')")
        + _grimIoItem(GRIM_IO_IC.backup, 'Резервная копия', 'один .md, разворачивается обратно', "grimExportBackup('all')")
        + _grimIoItem(GRIM_IO_IC.reading, 'Для чтения', 'ZIP · по файлу на заметку', "grimExportReading('all')");
}
function _grimRenderIoSelMenu() {
    const pop = document.getElementById('grim-io-sel-pop'); if (!pop) return;
    pop.innerHTML = '<div class="grim-tpl-head">Экспорт выбранных</div>'
        + _grimIoItem(GRIM_IO_IC.full, 'Полный бэкап записей', '.json · выбранные записи + летопись', "grimExportFullBackup('sel')")
        + _grimIoItem(GRIM_IO_IC.backup, 'Резервная копия', 'один .md', "grimExportBackup('sel')")
        + _grimIoItem(GRIM_IO_IC.reading, 'Для чтения', 'ZIP · по файлу', "grimExportReading('sel')");
}
function _grimCloseIoMenu() {
    ['grim-io-split', 'grim-io-sel'].forEach(id => { const w = document.getElementById(id); if (w) w.classList.remove('open'); });
    const a = document.getElementById('grim-io'); if (a) a.setAttribute('aria-expanded', 'false');
    const b = document.getElementById('grim-bulk-export'); if (b) b.setAttribute('aria-expanded', 'false');
}
// NA-8: per-container closers for the shared _gothicPickers registry. The registry
// fires once per registered picker, so a single shared close would mis-close the
// other IO menu when clicking inside this one. These close only their own popover;
// _grimCloseIoMenu stays for the explicit "close everything" call sites.
function _grimCloseIoSplit() {
    const w = document.getElementById('grim-io-split'); if (w) w.classList.remove('open');
    const a = document.getElementById('grim-io'); if (a) a.setAttribute('aria-expanded', 'false');
}
function _grimCloseIoSel() {
    const w = document.getElementById('grim-io-sel'); if (w) w.classList.remove('open');
    const b = document.getElementById('grim-bulk-export'); if (b) b.setAttribute('aria-expanded', 'false');
}
function grimToggleIoMenu(event) {
    if (event) event.stopPropagation();
    const w = document.getElementById('grim-io-split'); if (!w) return;
    const wasOpen = w.classList.contains('open');
    _grimCloseIoMenu();
    if (wasOpen) return;
    _grimRenderIoMenu();
    requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('open')));
    const b = document.getElementById('grim-io'); if (b) b.setAttribute('aria-expanded', 'true');
}
function grimToggleIoSelMenu(event) {
    if (event) event.stopPropagation();
    const w = document.getElementById('grim-io-sel'); if (!w) return;
    const wasOpen = w.classList.contains('open');
    _grimCloseIoMenu();
    if (wasOpen) return;
    _grimRenderIoSelMenu();
    requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('open')));
    const b = document.getElementById('grim-bulk-export'); if (b) b.setAttribute('aria-expanded', 'true');
}
// NA-8: outside-click now runs through the shared _gothicPickers registry
// (registered in init() once the static toolbar exists). Esc stays bespoke.
document.addEventListener('keydown', e => { if (e.key === 'Escape') _grimCloseIoMenu(); });

// ── Markdown import (.md file → new note) ───────────────────────────────
// Reverse of the export above: parse CommonMark-ish markdown into the same
// whitelist HTML the editor produces, so a round-trip (export → import)
// preserves structure. Inline parser mirrors _grimInlineMd.
function _grimMdInline(text) {
    // Protect inline code spans first so their contents are never re-parsed.
    const codes = [];
    let s = String(text).replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '' + (codes.length - 1) + ''; });
    s = escHtml(s);
    // export writes underline as literal <u>…</u> — bring those tags back.
    s = s.replace(/&lt;u&gt;/gi, '<u>').replace(/&lt;\/u&gt;/gi, '</u>');
    // links [text](url) — sanitizer later validates/cleans href.
    s = s.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (m, t, u) => '<a href="' + u + '">' + t + '</a>');
    // bold, then strike, then italic (single-marker last so ** isn't eaten as *).
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^_\w])_([^_\n]+)_(?![\w_])/g, '$1<em>$2</em>');
    s = s.replace(/(\d+)/g, (m, i) => '<code>' + escHtml(codes[+i]) + '</code>');
    return s;
}
// One pipe-table block (rows = [header, body1, body2…]; separator passed separately
// so per-column alignment (:--/:-:/--:) round-trips into align-c/align-r classes).
function _grimMdTable(rows, sepLine) {
    const cells = r => {
        let s = r.trim().replace(/^\|/, '').replace(/\|$/, '');
        const out = []; let cur = '';
        for (let k = 0; k < s.length; k++) {
            if (s[k] === '\\' && s[k + 1] === '|') { cur += '|'; k++; continue; }
            if (s[k] === '|') { out.push(cur); cur = ''; continue; }
            cur += s[k];
        }
        out.push(cur);
        return out.map(c => c.trim());
    };
    const aligns = (sepLine ? cells(sepLine) : []).map(c => {
        const L = c.startsWith(':'), R = c.endsWith(':');
        return L && R ? ' class="align-c"' : R ? ' class="align-r"' : '';
    });
    const cls = i => aligns[i] || '';
    const header = cells(rows[0]);
    let h = '<table><thead><tr>' + header.map((c, i) => '<th' + cls(i) + '>' + _grimMdInline(c) + '</th>').join('') + '</tr></thead>';
    if (rows.length > 1) {
        h += '<tbody>';
        for (let r = 1; r < rows.length; r++) {
            const cs = cells(rows[r]);
            while (cs.length < header.length) cs.push('');
            h += '<tr>' + cs.slice(0, header.length).map((c, i) => '<td' + cls(i) + '>' + _grimMdInline(c) + '</td>').join('') + '</tr>';
        }
        h += '</tbody>';
    }
    return h + '</table>';
}
function _grimMdToHtml(md) {
    const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    const isHr = l => /^ {0,3}([-*_])( *\1){2,} *$/.test(l);
    const isHead = l => /^ {0,3}#{1,6}\s/.test(l);
    const isFence = l => /^ {0,3}(`{3,}|~{3,})/.test(l);
    const isQuote = l => /^ {0,3}>/.test(l);
    const isUl = l => /^ {0,3}[-*+]\s+/.test(l);
    const isTask = l => /^ {0,3}[-*+]\s+\[[ xX]\]\s+/.test(l);
    const isOl = l => /^ {0,3}\d+[.)]\s+/.test(l);
    let html = '', i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (/^\s*$/.test(line)) { i++; continue; }
        // fenced code block — verbatim, no inline parse
        const fence = /^ {0,3}(`{3,}|~{3,})/.exec(line);
        if (fence) {
            const mark = fence[1][0], len = fence[1].length;
            const close = new RegExp('^ {0,3}' + mark + '{' + len + ',} *$');
            i++; const buf = [];
            while (i < lines.length && !close.test(lines[i])) { buf.push(lines[i]); i++; }
            i++; // consume closing fence (if present)
            html += '<pre>' + escHtml(buf.join('\n')) + '</pre>';
            continue;
        }
        // ATX heading (clamp 4-6 → h3, the deepest the editor has)
        const h = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
        if (h) { const lvl = Math.min(3, h[1].length); html += '<h' + lvl + '>' + _grimMdInline(h[2]) + '</h' + lvl + '>'; i++; continue; }
        if (isHr(line)) { html += '<hr>'; i++; continue; }
        // pipe table — header line followed by a |---|---| separator
        if (/\|/.test(line) && i + 1 < lines.length && /-/.test(lines[i + 1]) && /^ {0,3}\|?[\s:|-]*-[\s:|-]*$/.test(lines[i + 1])) {
            const sepLine = lines[i + 1];
            const rows = [line]; i += 2; // header + skip separator
            while (i < lines.length && /\|/.test(lines[i]) && !/^\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
            html += _grimMdTable(rows, sepLine);
            continue;
        }
        if (isQuote(line)) {
            const buf = [];
            while (i < lines.length && isQuote(lines[i])) { buf.push(lines[i].replace(/^ {0,3}> ?/, '')); i++; }
            html += '<blockquote>' + _grimMdInline(buf.join('\n')).replace(/[ \t]*\n/g, '<br>') + '</blockquote>';
            continue;
        }
        if (isTask(line)) {
            let lis = '';
            while (i < lines.length && isTask(lines[i])) {
                const m = /^ {0,3}[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(lines[i]);
                lis += '<li' + (/[xX]/.test(m[1]) ? ' class="done"' : '') + '>' + _grimMdInline(m[2]) + '</li>'; i++;
            }
            html += '<ul class="task">' + lis + '</ul>';
            continue;
        }
        if (isUl(line)) {
            let lis = '';
            while (i < lines.length && isUl(lines[i]) && !isTask(lines[i])) {
                lis += '<li>' + _grimMdInline(lines[i].replace(/^ {0,3}[-*+]\s+/, '')) + '</li>'; i++;
            }
            html += '<ul>' + lis + '</ul>';
            continue;
        }
        if (isOl(line)) {
            let lis = '';
            while (i < lines.length && isOl(lines[i])) {
                lis += '<li>' + _grimMdInline(lines[i].replace(/^ {0,3}\d+[.)]\s+/, '')) + '</li>'; i++;
            }
            html += '<ol>' + lis + '</ol>';
            continue;
        }
        // paragraph — gather until blank line or the start of another block
        const buf = [];
        while (i < lines.length && !/^\s*$/.test(lines[i]) && !isHead(lines[i]) && !isFence(lines[i])
               && !isQuote(lines[i]) && !isUl(lines[i]) && !isOl(lines[i]) && !isHr(lines[i])) {
            buf.push(lines[i]); i++;
        }
        let para = '';
        buf.forEach((l, k) => {
            const hard = / {2,}$/.test(l);                 // markdown hard break
            para += _grimMdInline(l.trim()) + (k < buf.length - 1 ? (hard ? '<br>' : ' ') : '');
        });
        html += '<p>' + para + '</p>';
    }
    return html;
}
// Plain markdown (no frontmatter) → {title, bodyMd, color}: first top-level # is
// the title, rest is the body; no heading → filename becomes the title.
function _grimSplitTitleBody(text, filename) {
    text = String(text || '').replace(/^﻿/, '');
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    let start = 0;
    while (start < lines.length && /^\s*$/.test(lines[start])) start++;
    let title = '', bodyLines;
    const h1 = /^ {0,3}#\s+(.*?)\s*#*\s*$/.exec(lines[start] || '');
    if (h1) { title = h1[1].trim(); bodyLines = lines.slice(start + 1); }
    else { bodyLines = lines; }
    if (!title) title = String(filename || '').replace(/\.(md|markdown|txt)$/i, '').trim();
    return { title, bodyMd: bodyLines.join('\n'), color: null };
}
// Backup-format parser: split a file into notes by YAML-frontmatter blocks.
// Returns [] for a plain (single-note) .md so the каller falls back to one note.
function _grimUnquote(s) {
    s = String(s || '').trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
        s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return s;
}
// A "---" line opens real frontmatter only if key:value lines follow until a
// closing "---" — this tells a note boundary apart from a body <hr>.
function _grimFmLooks(lines, idx) {
    let k = idx + 1, sawKey = false;
    while (k < lines.length && k < idx + 14) {
        const t = lines[k].trim();
        if (t === '---') return sawKey;
        if (/^[A-Za-z][\w-]*:\s?/.test(lines[k])) sawKey = true;
        else if (t !== '') return false;
        k++;
    }
    return false;
}
function _grimParseBackup(text) {
    const lines = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
    const notes = []; let i = 0;
    while (i < lines.length) {
        if (lines[i].trim() === '---' && _grimFmLooks(lines, i)) {
            const meta = {}; let j = i + 1;
            while (j < lines.length && lines[j].trim() !== '---') {
                const m = /^([A-Za-z][\w-]*):\s?(.*)$/.exec(lines[j]);
                if (m) meta[m[1].toLowerCase()] = m[2];
                j++;
            }
            j++;                                            // past the closing ---
            const body = [];
            while (j < lines.length) {
                if (lines[j].trim() === '---' && _grimFmLooks(lines, j)) break;
                body.push(lines[j]); j++;
            }
            const raw = (meta.color || '').trim();
            const color = /^#?[0-9a-fA-F]{6}$/.test(raw) ? (raw.startsWith('#') ? raw : '#' + raw) : null;
            notes.push({ title: _grimUnquote(meta.title), color, bodyMd: body.join('\n').trim() });
            i = j; continue;
        }
        i++;
    }
    return notes;
}
// Push a note built from {title, body(html), color} without rendering.
function _grimPushNote(seed) {
    const now = Date.now();
    const note = { id: uid(), title: seed.title || '', body: _grimSanitize(seed.body || ''), fmt: true, color: seed.color || null, createdAt: now, updatedAt: now };
    if (!Array.isArray(state.notes)) state.notes = [];
    state.notes.unshift(note);
    _newNoteIds.add(note.id);   // NA-5: animate the new leaf only
    return note.id;
}
// Turn collected docs ([{text, name}]) into notes — backup files split into many,
// plain files become one each. One undo step, one render, focus the last.
function _grimImportDocs(docs) {
    if (!docs.length) { showToast('Нет записей для импорта'); return; }
    if (grimMode !== 'active') grimMode = 'active';
    clearTimeout(_grimSaveT); saveState();
    grimFindClose();
    pushUndo();
    let added = 0, lastId = null;
    docs.forEach(d => {
        const parsed = _grimParseBackup(d.text);
        if (parsed.length) {
            parsed.forEach(n => { lastId = _grimPushNote({ title: n.title, body: _grimMdToHtml(n.bodyMd), color: n.color }); added++; });
        } else {
            const s = _grimSplitTitleBody(d.text, d.name);
            lastId = _grimPushNote({ title: s.title, body: _grimMdToHtml(s.bodyMd), color: s.color }); added++;
        }
    });
    if (!added) { showToast('Файлы пусты'); return; }
    currentNoteId = lastId;
    grimNoteCollapsed = false;
    notesSearchQuery = '';
    const sb = document.getElementById('notes-search-box'); if (sb) sb.value = '';
    saveState();
    renderNotes();
    const layoutEl = document.getElementById('grim-layout'); if (layoutEl) layoutEl.classList.add('show-detail');
    const ti = document.getElementById('grim-title-in'); if (ti) ti.focus();
    showToast('Импортировано записей: ' + added);
}
// NA-3 (Б): a JSON «Полный бэкап» (grimExportFullBackup) was dropped into the import
// picker — offer the same «Добавить» / «Заменить» choice DUSK uses, then restore notes
// + склеп + templates + «Летопись» (reusing _grimRestoreVersions). Reuses the shared
// import-choice modal; both openers now set their own title/desc so the text can't bleed.
function _grimFullImport(loaded) {
    const overlay = document.getElementById('import-choice-overlay');
    if (!overlay) { _grimApplyFullBackup(loaded, 'replace'); return; }   // fallback
    const title = document.getElementById('import-choice-title');
    const desc  = overlay.querySelector('.import-choice-desc');
    if (title) title.textContent = 'Импорт записей';
    if (desc)  desc.textContent  = 'Добавить записи Гримуара к существующим или полностью заменить?';
    const replaceBtn = document.getElementById('import-replace-btn');
    const mergeBtn   = document.getElementById('import-merge-btn');
    const cancelBtn  = document.getElementById('import-cancel-btn');
    const close = () => closeModalWithAnim('import-choice-overlay');
    replaceBtn.onclick = () => { close(); _grimApplyFullBackup(loaded, 'replace'); };
    mergeBtn.onclick   = () => { close(); _grimApplyFullBackup(loaded, 'merge'); };
    cancelBtn.onclick  = close;
    openModalWithFocus('import-choice-overlay');
}
function _grimApplyFullBackup(loaded, mode) {
    if (grimMode !== 'active') grimMode = 'active';
    clearTimeout(_grimSaveT); saveState();
    grimFindClose();
    pushUndo();
    if (!Array.isArray(state.notes))         state.notes = [];
    if (!Array.isArray(state.notesArchive))  state.notesArchive = [];
    if (!Array.isArray(state.noteTemplates)) state.noteTemplates = [];
    const inN = Array.isArray(loaded.notes) ? loaded.notes : [];
    const inA = Array.isArray(loaded.notesArchive) ? loaded.notesArchive : [];
    const inT = Array.isArray(loaded.noteTemplates) ? loaded.noteTemplates : [];
    let added = 0, lastId = null;
    if (mode === 'replace') {
        state.notes = inN.slice();
        state.notesArchive = inA.slice();
        state.noteTemplates = inT.slice();
        if (loaded.notesSort) state.notesSort = loaded.notesSort;
        added = inN.length;
        lastId = inN.length ? inN[0].id : null;
    } else {
        const seenN = new Set(state.notes.map(n => n.id));
        inN.forEach(n => { if (n && n.id && !seenN.has(n.id)) { state.notes.unshift(n); seenN.add(n.id); added++; lastId = n.id; } });
        const seenA = new Set(state.notesArchive.map(n => n.id));
        inA.forEach(n => { if (n && n.id && !seenA.has(n.id)) { state.notesArchive.push(n); seenA.add(n.id); } });
        const seenT = new Set(state.noteTemplates.map(t => t.id));
        inT.forEach(t => { if (t && t.id && !seenT.has(t.id)) { state.noteTemplates.push(t); seenT.add(t.id); } });
        if (!state.notesSort && loaded.notesSort) state.notesSort = loaded.notesSort;
    }
    normalizeState();                       // NA-2: sanitize imported bodies at the boundary
    _grimRestoreVersions(loaded, mode);      // NA-3: bring «Летопись» across (replace=take file's, merge=fill gaps)
    if (currentNoteId && ![...(state.notes || []), ...(state.notesArchive || [])].some(n => n.id === currentNoteId)) currentNoteId = null;
    if (mode === 'replace') { currentNoteId = lastId; grimNoteCollapsed = false; }
    notesSearchQuery = '';
    const sb = document.getElementById('notes-search-box'); if (sb) sb.value = '';
    saveState();
    renderNotes();
    showToast(mode === 'replace' ? ('Заменено · записей: ' + state.notes.length) : ('Добавлено записей: ' + added), { undo: true });
}
// Read a .md/.markdown/.txt entry from a ZIP (store or deflate via DecompressionStream).
async function _grimInflate(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function _grimUnzip(buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let eo = -1;
    for (let i = buf.length - 22; i >= 0; i--) { if (dv.getUint32(i, true) === 0x06054b50) { eo = i; break; } }
    if (eo < 0) return [];
    const cdCount = dv.getUint16(eo + 10, true);
    let p = dv.getUint32(eo + 16, true);
    const dec = new TextDecoder(), out = [];
    for (let i = 0; i < cdCount && p + 46 <= buf.length; i++) {
        if (dv.getUint32(p, true) !== 0x02014b50) break;
        const method = dv.getUint16(p + 10, true);
        const compSize = dv.getUint32(p + 20, true);
        const nameLen = dv.getUint16(p + 28, true);
        const extraLen = dv.getUint16(p + 30, true);
        const commentLen = dv.getUint16(p + 32, true);
        const lho = dv.getUint32(p + 42, true);
        const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
        p += 46 + nameLen + extraLen + commentLen;
        if (!/\.(md|markdown|txt)$/i.test(name)) continue;
        if (dv.getUint32(lho, true) !== 0x04034b50) continue;
        const dataStart = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
        const comp = buf.subarray(dataStart, dataStart + compSize);
        let text;
        if (method === 0) text = dec.decode(comp);
        else if (method === 8) { try { text = dec.decode(await _grimInflate(comp)); } catch (e) { continue; } }
        else continue;
        out.push({ text, name: name.split('/').pop() });
    }
    return out;
}
// Pick one or more .md/.zip files; collect docs (unzipping archives) and import.
function grimImportFiles() {
    _grimCloseIoMenu();
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.multiple = true;
    inp.accept = '.md,.markdown,.txt,.zip,.json,text/markdown,text/plain,application/zip,application/json';
    inp.style.display = 'none';
    inp.onchange = async () => {
        const files = [...(inp.files || [])]; inp.remove();
        if (!files.length) return;
        const docs = [];
        for (const f of files) {
            try {
                // NA-3 (Б): a JSON «Полный бэкап» takes its own path (choice modal +
                // history restore) — it can't be flattened into the .md note pipeline.
                if (/\.json$/i.test(f.name)) {
                    let loaded = null;
                    try { loaded = JSON.parse(await f.text()); } catch (_) { showToast('Не удалось прочитать .json'); return; }
                    if (loaded && loaded._grimFull) { _grimFullImport(loaded); return; }
                    // F-B: развести два формата. Полный бэкап DUSK (есть .tasks) — это бэкап ВСЕГО
                    // приложения; его место в импорте задач (тулбар), не здесь.
                    if (loaded && Array.isArray(loaded.tasks)) { showToast('Это полный бэкап DUSK — импортируйте его на странице «Задачи» (кнопка импорта в тулбаре)'); return; }
                    showToast('Это не бэкап записей Гримуара'); return;
                }
                if (/\.zip$/i.test(f.name)) {
                    const entries = await _grimUnzip(new Uint8Array(await f.arrayBuffer()));
                    entries.forEach(e => docs.push(e));
                } else {
                    docs.push({ text: await f.text(), name: f.name });
                }
            } catch (e) { /* skip unreadable file */ }
        }
        _grimImportDocs(docs);
    };
    document.body.appendChild(inp);
    inp.click();
}

// ── п.12: note templates (built-in gothic blueprints + user-saved) ──────────
// Built-in icons + the «save as template» / user-template glyph (tome + ribbon +
// star sigil). Hand-drawn gothic SVG, dark-violet idiom — never emoji.
const GRIM_TPL_IC = {
    diary:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16.6 2.6a7.6 7.6 0 1 0 4.8 12.9 6 6 0 0 1-4.8-12.9Z"/><path d="M6.2 5.1l.45 1.5 1.5.45-1.5.45L6.2 9l-.45-1.5L4.25 7.05l1.5-.45Z" fill="currentColor" stroke="none"/><path d="M4 19.6c2.4-1.5 4.8-1.5 7.2 0 2.4-1.5 4.8-1.5 7.2 0"/><path d="M5 22c2.1-1.2 4.1-1.2 6.2 0 2.1-1.2 4.1-1.2 6.2 0" opacity=".45"/></svg>`,
    ritual: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.3"/><circle cx="12" cy="12" r="7.9" opacity=".4"/><path d="M12 4.5 16.4 18.1 4.9 9.7 19.1 9.7 7.6 18.1Z"/><path d="M12 1.4v1.5M12 22.6v-1.5M1.4 12h1.5M22.6 12h-1.5" opacity=".5" stroke-width="1"/></svg>`,
    codex:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5 Q6.2 3 12 2.6 Q17.8 3 18 9.5 V21 H6 Z"/><rect x="7.9" y="6" width="3.8" height="3.8" rx=".5"/><path d="M8.8 9.2 9.8 6.7 10.8 9.2 M9.15 8.3h1.3" stroke-width=".95"/><path d="M13.1 6.9h3M13.1 8.8h2.3" opacity=".7" stroke-width="1.05"/><path d="M8.2 12.7h7.6M8.2 14.9h7.6M8.2 17.1h5.2" opacity=".55"/></svg>`,
    tablet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.4h12l1.6 2.2v15H4.4v-15Z"/><path d="M4.4 8.7h15.2M4.4 13.3h15.2M4.4 17.9h15.2M9.6 5.6v15M14.4 5.6v15"/><path d="M4.4 5.6h15.2" opacity=".55"/><path d="M3 3.4l1.4 2.2M21 3.4l-1.4 2.2" opacity=".5"/></svg>`,
    save:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.4 H17 a1.3 1.3 0 0 1 1.3 1.3 V19 a1.3 1.3 0 0 1 -1.3 1.3 H7 Q5.4 20.3 5.4 18.7 V5 Q5.4 3.4 7 3.4 Z"/><path d="M7.4 3.4 V20.3" opacity=".4"/><path d="M13.4 3.4 V8 l1.3 -1.2 1.3 1.2 V3.4"/><path d="M11.6 11.5 13.36 16.93 8.75 13.57 14.45 13.57 9.84 16.93 Z" stroke-width="1" opacity=".85"/></svg>`,
    // Delete a template — ornate gothic dagger plunged downward (pommel diamond,
    // curled quillons, fullered blade to a point). Reads as "strike out / destroy".
    del:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.2 13.5 3.7 12 5.2 10.5 3.7Z" fill="currentColor" stroke="none"/><path d="M12 5.2V7"/><path d="M8.3 8.6H15.7"/><path d="M8.3 8.6Q7 6.9 8.7 6.4M15.7 8.6Q17 6.9 15.3 6.4"/><path d="M10.4 8.6 12 21.4 13.6 8.6"/><path d="M12 10.4V18.4" opacity=".35"/></svg>`,
};
const _GRIM_MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
// Built-in blueprints — one per structural primitive of a note (prose / list /
// hierarchy / table). build() returns {title, body, color}; body is raw HTML
// (sanitised on spawn). Дневник stamps the current date as its title.
const GRIM_BUILTIN_TPL = [
    { key: 'diary',  name: 'Дневник',  desc: 'дата · проза · намерения', icon: GRIM_TPL_IC.diary,
      build() { const d = new Date(); return {
        title: `${d.getDate()} ${_GRIM_MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        body: '<blockquote>«Что записано — то не потеряно во тьме.»</blockquote>'
            + '<h2>Событие дня</h2><p><br></p>'
            + '<h2>Мысли и чувства</h2><p><br></p>'
            + '<h2>Намерения на завтра</h2><ul class="task"><li>Первое</li><li>Второе</li></ul>',
        color: null }; } },
    { key: 'ritual', name: 'Ритуал',   desc: 'цель · подготовка · шаги', icon: GRIM_TPL_IC.ritual,
      build() { return {
        title: 'Ритуал',
        body: '<h2>Цель</h2><p><br></p>'
            + '<h2>Подготовка</h2><ul><li>Что понадобится</li></ul>'
            + '<h2>Шаги</h2><ol><li>Подготовка пространства</li><li>Основное действие</li><li>Завершение</li></ol>'
            + '<blockquote>Предостережение: <em>не прерывай начатое.</em></blockquote>',
        color: null }; } },
    { key: 'codex',  name: 'Кодекс',   desc: 'полный труд: H1–H3 · список · таблица · код', icon: GRIM_TPL_IC.codex,
      build() { return {
        title: 'Заглавие труда',
        body: '<p><strong>Краткое вступление</strong> — о чём этот кодекс.</p>'
            + '<h2>Первый раздел</h2><p><br></p>'
            + '<h3>Подраздел</h3><ul><li>Пункт</li><li>Пункт</li></ul>'
            + '<hr>'
            + '<h2>Сводная таблица</h2>'
            + '<table><thead><tr><th>Понятие</th><th>Описание</th></tr></thead><tbody><tr><td></td><td></td></tr><tr><td></td><td></td></tr></tbody></table>'
            + '<p>Термин в тексте: <code>код</code>.</p>',
        color: null }; } },
    { key: 'tablet', name: 'Скрижаль', desc: 'таблица: данные · сравнение · реестр', icon: GRIM_TPL_IC.tablet,
      build() { return {
        title: 'Скрижаль',
        body: '<h2>Реестр</h2><p>Назначение таблицы.</p>'
            + '<table><thead><tr><th>Столбец 1</th><th>Столбец 2</th><th>Столбец 3</th></tr></thead><tbody><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></tbody></table>',
        color: null }; } },
];

// Spawn a new active note seeded from {title, body, color} (template or import).
function _grimSpawnSeeded(seed) {
    if (grimMode !== 'active') grimMode = 'active';
    clearTimeout(_grimSaveT); saveState();
    grimFindClose();
    pushUndo();
    const now = Date.now();
    const note = { id: uid(), title: seed.title || '', body: _grimSanitize(seed.body || ''), fmt: true, color: seed.color || null, createdAt: now, updatedAt: now };
    if (!Array.isArray(state.notes)) state.notes = [];
    state.notes.unshift(note);
    _newNoteIds.add(note.id);   // NA-5: animate the new leaf only
    currentNoteId = note.id;
    grimNoteCollapsed = false;
    notesSearchQuery = '';
    const sb = document.getElementById('notes-search-box'); if (sb) sb.value = '';
    saveState();
    renderNotes();
    const layoutEl = document.getElementById('grim-layout'); if (layoutEl) layoutEl.classList.add('show-detail');
    const ti = document.getElementById('grim-title-in'); if (ti) ti.focus();
}

// Save the open note as a reusable template (mirrors saveTaskAsTemplate).
function grimSaveAsTpl(id) {
    const note = (state.notes || []).find(n => n.id === id) || (state.notesArchive || []).find(n => n.id === id);
    if (!note) return;
    if (!Array.isArray(state.noteTemplates)) state.noteTemplates = [];
    pushUndo();
    state.noteTemplates.push({
        id: uid(),
        name: ((note.title || '').trim() || _grimPlain(note.body || '').trim() || 'Шаблон').slice(0, 60),
        title: note.title || '',
        body: note.body || '',
        color: note.color || null,
    });
    saveState();
    showToast('Сохранено как шаблон');
}

// Create a note from a built-in blueprint (by key) or a saved template (by id).
function grimUseBuiltin(key) {
    const t = GRIM_BUILTIN_TPL.find(b => b.key === key);
    if (!t) return;
    _grimCloseTplMenu();
    _grimSpawnSeeded(t.build());
    showToast('Запись из шаблона «' + t.name + '»');
}
function grimUseTpl(id) {
    const t = (state.noteTemplates || []).find(x => x.id === id);
    if (!t) return;
    _grimCloseTplMenu();
    _grimSpawnSeeded({ title: t.title, body: t.body, color: t.color });
    showToast('Запись из шаблона');
}
function grimDeleteTpl(id, event) {
    if (event) event.stopPropagation();
    pushUndo();
    state.noteTemplates = (state.noteTemplates || []).filter(x => x.id !== id);
    saveState();
    _grimRenderTplMenu();          // keep the open popover in sync
    showToast('Шаблон удалён');
}

// ── popover open/close + render ──
function grimToggleTplMenu(event) {
    if (event) event.stopPropagation();
    const split = document.getElementById('grim-new-split');
    if (!split) return;
    if (split.classList.contains('open')) { _grimCloseTplMenu(); return; }
    _grimRenderTplMenu();
    // Paint the closed base state first, THEN flip .open next frame so the
    // opacity/transform transition actually runs (same-tick add skips it).
    requestAnimationFrame(() => requestAnimationFrame(() => split.classList.add('open')));
    const trig = document.getElementById('grim-tpl-trigger');
    if (trig) trig.setAttribute('aria-expanded', 'true');
}
function _grimCloseTplMenu() {
    const split = document.getElementById('grim-new-split');
    if (split) split.classList.remove('open');
    const trig = document.getElementById('grim-tpl-trigger');
    if (trig) trig.setAttribute('aria-expanded', 'false');
}
function _grimRenderTplMenu() {
    const pop = document.getElementById('grim-tpl-pop');
    if (!pop) return;
    let html = '<div class="grim-tpl-head">Начертать из шаблона</div>';
    html += '<div class="grim-tpl-sect">Встроенные</div>';
    html += GRIM_BUILTIN_TPL.map(t => `
        <div class="grim-tpl-item" role="menuitem" onclick="grimUseBuiltin('${t.key}')">
            <span class="grim-tpl-ic">${t.icon}</span>
            <span class="grim-tpl-txt"><span class="grim-tpl-name">${escHtml(t.name)}</span><span class="grim-tpl-desc">${escHtml(t.desc)}</span></span>
        </div>`).join('');
    const mine = state.noteTemplates || [];
    if (mine.length) {
        html += '<div class="grim-tpl-divline"></div><div class="grim-tpl-sect">Свои</div>';
        html += mine.map(t => `
            <div class="grim-tpl-item user" role="menuitem" onclick="grimUseTpl('${t.id}')">
                <span class="grim-tpl-ic">${GRIM_TPL_IC.save}</span>
                <span class="grim-tpl-txt"><span class="grim-tpl-name">${escHtml(t.name || 'Шаблон')}</span><span class="grim-tpl-desc">своя заготовка</span></span>
                <button class="grim-tpl-del" onclick="grimDeleteTpl('${t.id}', event)" title="Удалить шаблон">${GRIM_TPL_IC.del}</button>
            </div>`).join('');
    }
    pop.innerHTML = html;
}
// NA-8: outside-click now runs through the shared _gothicPickers registry
// (registered in init() once the static toolbar exists). Esc stays bespoke.
document.addEventListener('keydown', e => { if (e.key === 'Escape') _grimCloseTplMenu(); });

// Live toolbar active-state while editing the body. (The caret no longer drives
// the table controls — those are an explicit per-table seal toggle instead.)
document.addEventListener('selectionchange', () => {
    if (document.activeElement && document.activeElement.id === 'grim-body') _grimSyncToolbar();
});
// A stray click anywhere outside a seal/gutter/menu closes the open menu (those
// targets call stopPropagation, so a click reaching here is "elsewhere").
document.addEventListener('click', () => { if (_grimMenu) _grimCloseTableMenu(); });
// Esc when the body isn't focused (e.g. focus drifted) still dismisses controls;
// the in-body case is handled by grimBodyKey.
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && (_grimMenu || _grimEditTbl)
        && !(document.activeElement && document.activeElement.id === 'grim-body')) _grimDismissTableUI();
});
// Reposition seals/gutters on resize (geometry shifts with column reflow).
window.addEventListener('resize', () => { if (document.querySelector('#grim-detail .grim-tctl')) _grimScheduleTableUI(); });
// Returning to the window/tab can leave the overlay stale (a blur fired on leave)
// — rebuild it so the seal comes back.
window.addEventListener('focus', () => { if (document.getElementById('grim-body')) _grimScheduleTableUI(); });
window.addEventListener('pageshow', () => { if (document.getElementById('grim-body')) _grimScheduleTableUI(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && document.getElementById('grim-body')) _grimScheduleTableUI(); });

// ============================================================
//  RENDER
// ============================================================
function render() {
    renderTasks();
    renderGroupBar();
    renderGroupSelect();
    updateProgress();
    updateVisibility();
    updateArchiveBadge();
    if (!prefersReducedMotion()) applyListStagger();
    setupSortables();
    attachPlainPasteHandlers();
    positionDragHandles();
    updateCollapseAllBtn();
    renderTagCloud();
    _syncCriticalPulse();
    updateTemplatesBtn();
}

// 7b: partial render for hot paths that change ONLY the task list (check, pin,
// priority, colour). Skips renderGroupBar / renderGroupSelect / renderTagCloud /
// updateArchiveBadge — those depend on data these ops never touch (group names,
// task text/tags, archive), so rebuilding them every time was wasted work.
function renderListOnly() {
    renderTasks();
    updateProgress();
    updateVisibility();
    if (!prefersReducedMotion()) applyListStagger();
    setupSortables();
    attachPlainPasteHandlers();
    positionDragHandles();
    updateCollapseAllBtn();
    _syncCriticalPulse();
}

function renderTasks() {
    // D-4: if a per-group sort picker is open, its <body>-portaled list would be
    // orphaned (left floating) when we wipe the list below. Close it first — while
    // the owning picker is still connected, so the list restores cleanly before the
    // rebuild. No-op when nothing is open.
    _closeSortPicker();
    listContainer.innerHTML   = '';
    groupsContainer.innerHTML = '';
    const query = searchQuery.toLowerCase();

    // Ungrouped tasks — only show if not focused on a specific group
    if (focusGroupId === null) {
        const ung = state.tasks.filter(t => !t.groupId);
        // Pinned float to the top of the "no group" context (above everything here).
        const { pinned, rest } = extractPinned(ung, query);
        appendPinnedBlock(listContainer, pinned, null);
        if (scheduleActive(null)) {
            const { withDl, noDl } = filterAndSortDeadline(rest, query);
            appendScheduleSection(listContainer, withDl, noDl, null);
        } else {
            filterAndSort(rest, query, null)
                .forEach(t => listContainer.appendChild(createTaskEl(t, false)));
        }
    }

    state.groups.forEach(group => {
        // Focus mode: skip groups that aren't the focused one
        if (focusGroupId !== null && group.id !== focusGroupId) return;

        const allGrouped = state.tasks.filter(t => t.groupId === group.id);
        let grouped = [...allGrouped];
        const bf = grouped.length;
        if (query) grouped = grouped.filter(t =>
            t.text.toLowerCase().includes(query) ||
            (t.note && t.note.toLowerCase().includes(query)) ||
            (t.subtasks && t.subtasks.some(s => s.text.toLowerCase().includes(query))));
        if (query && grouped.length === 0 && bf > 0) return;

        // P-B: in "Today" view drop tasks not due today/overdue; hide now-empty groups.
        if (isTodayMode) {
            grouped = grouped.filter(t => isDueTodayOrOverdue(t.deadline));
            if (grouped.length === 0) return;
        }

        // Count badge reflects the visible scope: today's tasks in Today view, else the whole group.
        const countSrc = isTodayMode ? grouped : allGrouped;
        const total    = countSrc.length;
        const done     = countSrc.filter(t => t.checked || t.cycleChecked).length;
        const collapsed = localStorage.getItem('groupCollapsed_' + group.id) === '1';
        const grpSched  = scheduleModeGroups.has(group.id);
        const effSched  = scheduleActive(group.id);
        const grpSortMode = getEffectiveSortMode(group.id);
        const hasOverride = (state.sortModeOverrides || {})[String(group.id)] !== undefined;

        const section = document.createElement('div');
        section.className = 'group-section' + (collapsed ? ' collapsed' : '') +
                            (focusGroupId === group.id ? ' group-focused' : '');
        section.dataset.groupId = group.id;
        section.innerHTML = `
            <div class="group-header" onclick="toggleGroupCollapse(${group.id})">
                <div class="group-drag-handle" onclick="event.stopPropagation()" title="Перетащить группу">
                    ${IC.drag}
                </div>
                <div class="group-color-dot" style="background:${group.color}"></div>
                <span class="group-title">${escHtml(group.name)}</span>
                <span class="group-count">${done}/${total}</span>
                <div class="group-actions" onclick="event.stopPropagation()">
                    <button class="btn-group-action${grpSched ? ' active-sched' : ''}"
                            onclick="toggleScheduleMode(${group.id})" title="Сортировка по дедлайну">${IC.sundial}</button>
                    ${_groupSortPicker(group.id, grpSortMode, hasOverride)}
                    <button class="btn-group-action${focusGroupId === group.id ? ' active-sched' : ''}"
                            onclick="toggleFocusGroup(${group.id})" title="${focusGroupId === group.id ? 'Снять фокус' : 'Фокус на этой группе'}">${IC.focusMode}</button>
                    <button class="btn-group-action" onclick="duplicateGroup(${group.id})" title="Дублировать группу">${IC.twinCoffin}</button>
                    <button class="btn-group-action" onclick="openRenameGroupModal(${group.id})" title="Переименовать">${IC.quill}</button>
                    <button class="btn-group-action danger" onclick="deleteGroup(${group.id})" title="Удалить группу">${IC.tombstone}</button>
                </div>
                <span class="group-chevron">${IC.sword}</span>
            </div>
            <ul class="task-list group-body" id="group-list-${group.id}"></ul>`;

        groupsContainer.appendChild(section);
        const ul = section.querySelector(`#group-list-${group.id}`);

        // Pinned float to the top of THIS group, above its active/done/schedule zones.
        const { pinned, rest } = extractPinned(grouped, query);
        appendPinnedBlock(ul, pinned, group.id);

        if (effSched && isGroupSplitMode) {
            const { withDl, noDl } = filterAndSortDeadline(rest, '');
            appendScheduleSplitSection(ul, withDl, noDl, group.id);
        } else if (effSched) {
            const { withDl, noDl } = filterAndSortDeadline(rest, '');
            appendScheduleSection(ul, withDl, noDl, group.id);
        } else if (isGroupSplitMode) {
            const sorted = filterAndSort(rest, query, group.id);
            appendSplitSection(ul, sorted, group.id, group.id);
        } else {
            filterAndSort(rest, query, group.id).forEach(t => ul.appendChild(createTaskEl(t, false)));
        }

        if (!collapsed) {
            ul.classList.add('expanded', 'unlocked');
        }
    }); // end state.groups.forEach
}

// Append tasks in schedule-mode layout (with subgroup dividers) to a container.
// Each zone UL is only rendered when it has tasks — no empty placeholder zones.
// Cross-group drops are handled via group-body Sortable + onDragAdd render().
function appendScheduleSection(container, withDl, noDl, groupId) {
    const hasBoth = withDl.length > 0 && noDl.length > 0;

    if (withDl.length > 0) {
        if (hasBoth) {
            const sep = document.createElement('li');
            sep.className = 'dl-subgroup-header';
            sep.innerHTML = `<span>${IC.sundial}<span>С дедлайном · ${withDl.length}</span></span>`;
            container.appendChild(sep);
        }
        const dlUl = document.createElement('ul');
        dlUl.className = 'sched-zone-ul';
        dlUl.dataset.sortableGroup = 'sched_dl';
        dlUl.dataset.zoneDl        = '1';
        dlUl.dataset.groupId       = groupId != null ? groupId : '';
        withDl.forEach(t => dlUl.appendChild(createTaskEl(t, true)));
        container.appendChild(dlUl);
    }

    if (noDl.length > 0) {
        if (hasBoth) {
            const sep2 = document.createElement('li');
            sep2.className = 'dl-subgroup-header dl-subgroup-nodl';
            sep2.innerHTML = `<span>${IC.moon}<span>Без дедлайна · ${noDl.length}</span></span>`;
            container.appendChild(sep2);
        }
        const ndlUl = document.createElement('ul');
        ndlUl.className = 'sched-zone-ul';
        ndlUl.dataset.sortableGroup = 'sched_ndl';
        ndlUl.dataset.zoneDl        = '0';
        ndlUl.dataset.groupId       = groupId != null ? groupId : '';
        noDl.forEach(t => ndlUl.appendChild(createTaskEl(t, false)));
        container.appendChild(ndlUl);
    }
}

// ── Pinned tasks (P5/pin redesign) ───────────────────────────────────────────
// A pinned, not-yet-completed task floats to the very top of ITS OWN context
// (its group, or the "no group" context) — above every other task there. We
// extract them BEFORE the mode-specific sort so they sit on top in normal,
// schedule AND split modes. In split mode they get their own gothic
// "Закреплённые" zone (see appendPinnedBlock); elsewhere they're plain cards.
// "Incomplete-only" filter predicate. Keeps a task that is not done — OR that was
// AUTO-checked from its subtasks (any-mode) yet still has active subtasks: hiding
// such a parent would strand its pending subtasks, so unchecking the triggering
// subtask to reopen the parent becomes impossible. Manually-checked parents are
// unaffected (autoChecked is false) and still hide as before.
function _visibleUnderFilter(t) {
    return (!t.checked && !t.cycleChecked) ||
           (t.autoChecked && (t.subtasks || []).some(s => !s.checked && !s.cycleChecked));
}

function extractPinned(tasks, query) {
    // Mirror the visibility filters used by filterAndSort so a hidden task never
    // surfaces in the pinned block.
    let list = [...tasks];
    if (isFiltered)  list = list.filter(_visibleUnderFilter);
    if (isTodayMode) list = list.filter(t => isDueTodayOrOverdue(t.deadline));
    if (query) list = list.filter(t =>
        t.text.toLowerCase().includes(query) ||
        (t.note && t.note.toLowerCase().includes(query)) ||
        (t.subtasks && t.subtasks.some(s => s.text.toLowerCase().includes(query))));
    if (colorFilter) list = list.filter(t => t.color === colorFilter);

    const pinned = list
        .filter(t => t.pinned && !t.checked && !t.cycleChecked)
        .sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id));
    const pinnedIds = new Set(pinned.map(t => t.id));
    // `rest` keeps the ORIGINAL list (incl. completed pinned) minus the active
    // pinned; the caller passes it through the normal sort which re-filters.
    const rest = tasks.filter(t => !pinnedIds.has(t.id));
    return { pinned, rest };
}

// Gothic glyphs for the pinned zone header (split mode): the pin/spike icon and
// the shared sword chevron used by every other split header.
const _PIN_HDR_CHEVRON = `<svg class="split-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="17"/><path d="M9 5L12 2L15 5"/><line x1="10" y1="14" x2="14" y2="14"/><path d="M11 17L10 20H14L13 17"/><circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none"/></svg>`;

// Renders a context's pinned tasks at the top of `container`.
//  • split mode → collapsible gothic "Закреплённые" zone (own sortable UL;
//    dragging a card OUT unpins it — handled in onDragAdd).
//  • normal / schedule → plain cards at the very top (no header).
function appendPinnedBlock(container, pinned, groupId) {
    if (!pinned.length) return;
    const showDl = scheduleActive(groupId);

    if (!isGroupSplitMode) {
        pinned.forEach(t => container.appendChild(createTaskEl(t, showDl && !!t.deadline)));
        return;
    }

    const key       = 'pinned_' + (groupId != null ? groupId : 'ung');
    const collapsed = localStorage.getItem('groupSplit_' + key) === '1';

    const hdr = document.createElement('li');
    hdr.className = 'split-zone-header split-pinned-header' + (collapsed ? ' collapsed' : '');
    hdr.innerHTML = `${IC.pin}<span>Закреплённые · ${pinned.length}</span>${_PIN_HDR_CHEVRON}`;
    hdr.onclick = () => {
        const c = hdr.classList.toggle('collapsed');
        localStorage.setItem('groupSplit_' + key, c ? '1' : '0');
        const wrap = hdr.nextElementSibling;
        if (wrap && wrap.classList.contains('split-pinned-wrap')) wrap.classList.toggle('collapsed', c);
    };
    container.appendChild(hdr);

    const wrap = document.createElement('li');
    wrap.className = 'split-pinned-wrap' + (collapsed ? ' collapsed' : '');
    wrap.style.cssText = 'list-style:none;padding:0;margin:0;';

    const ul = document.createElement('ul');
    ul.className = 'split-pinned-body';
    ul.dataset.sortableGroup = 'split_active';   // share the active pool so drag-out unpins
    ul.dataset.groupId       = groupId != null ? groupId : '';
    ul.dataset.zonePinned    = '1';
    pinned.forEach(t => ul.appendChild(createTaskEl(t, showDl && !!t.deadline)));
    wrap.appendChild(ul);
    container.appendChild(wrap);
}

/** Returns the effective sort mode for a given groupId (null = ungrouped). */
function getEffectiveSortMode(groupId) {
    const key = groupId != null ? String(groupId) : '__ungrouped__';
    const override = (state.sortModeOverrides || {})[key];
    return override ?? (state.sortMode || 'priority');
}

// P-B: a task belongs to the "Today" view if its deadline is overdue or falls
// on the current calendar day. Coarse modes (month/year) are excluded unless
// already overdue — "this month" is not "today".
function isDueTodayOrOverdue(dl) {
    if (!dl) return false;
    if (deadlineStatus(dl) === 'over') return true;       // overdue always qualifies
    const { mode } = dl;
    if (mode === 'month' || mode === 'year') return false; // too coarse to be "today"
    if (mode === 'time') return true;                      // a clock-time belongs to today
    if (mode === 'weektime' && dl.timeSet === false) return weektimeDayDiff(dl) === 0;
    const ts = getDeadlineTimestamp(dl);
    if (ts === null) return false;
    return calDayDiff(ts) === 0;                           // date / monthday / weektime(timeSet)
}

function filterAndSort(tasks, query, groupId = null) {
    let list = [...tasks];
    // Hide both permanently-done AND cycle-completed recurring tasks when filter is on.
    if (isFiltered) list = list.filter(_visibleUnderFilter);
    // P-B: "Today" view keeps only tasks due today or overdue.
    if (isTodayMode) list = list.filter(t => isDueTodayOrOverdue(t.deadline));
    if (query) list = list.filter(t =>
        t.text.toLowerCase().includes(query) ||
        (t.note && t.note.toLowerCase().includes(query)) ||
        (t.subtasks && t.subtasks.some(s => s.text.toLowerCase().includes(query)))
    );
    // Color filter
    if (colorFilter) list = list.filter(t => t.color === colorFilter);

    const sortMode = getEffectiveSortMode(groupId);
    const P = { high: 0, medium: 1, low: 2, none: 3 };
    list.sort((a, b) => {
        // Pinned always float to top
        const pa = (a.pinned && !a.checked && !a.cycleChecked) ? 0 : 1;
        const pb = (b.pinned && !b.checked && !b.cycleChecked) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        // Completion tier
        const ta = a.checked ? 2 : (a.cycleChecked ? 1 : 0);
        const tb = b.checked ? 2 : (b.cycleChecked ? 1 : 0);
        if (ta !== tb) return ta - tb;
        // NA-11: alpha mode sorts by task text (ru, case/diacritic-insensitive); ties → order.
        if (sortMode === 'alpha') {
            const c = (a.text || '').localeCompare(b.text || '', 'ru', { sensitivity: 'base' });
            if (c !== 0) return c;
            return (a.order ?? a.id) - (b.order ?? b.id);
        }
        // In 'order' mode skip priority, go straight to order
        if (sortMode !== 'order') {
            const pd = (P[a.priority] ?? 3) - (P[b.priority] ?? 3);
            if (pd !== 0) return pd;
        }
        return (a.order ?? a.id) - (b.order ?? b.id);
    });
    return list;
}

// Sort by deadline (earliest first), tasks without deadline at bottom sorted by priority
function filterAndSortDeadline(tasks, query) {
    let list = [...tasks];
    if (isFiltered) list = list.filter(_visibleUnderFilter);
    // P-B: "Today" view keeps only tasks due today or overdue.
    if (isTodayMode) list = list.filter(t => isDueTodayOrOverdue(t.deadline));
    if (query) list = list.filter(t =>
        t.text.toLowerCase().includes(query) ||
        (t.note && t.note.toLowerCase().includes(query)) ||
        // Search inside subtask texts (audit B-3)
        (t.subtasks && t.subtasks.some(s => s.text.toLowerCase().includes(query)))
    );
    // V-1: colour filter must apply in schedule mode too (was silently ignored).
    if (colorFilter) list = list.filter(t => t.color === colorFilter);
    const P = { high: 0, medium: 1, low: 2, none: 3 };
    const withDl  = list.filter(t => t.deadline && getDeadlineTimestamp(t.deadline) !== null);
    const withDlNoTs = list.filter(t => t.deadline && getDeadlineTimestamp(t.deadline) === null); // month/year/etc
    const noDl    = list.filter(t => !t.deadline);

    withDl.sort((a,b) => {
        const ta = getDeadlineTimestamp(a.deadline), tb = getDeadlineTimestamp(b.deadline);
        if (ta !== tb) return ta - tb;
        return (a.order ?? a.id) - (b.order ?? b.id);
    });

    // H-3 fix: give non-timestamp deadlines a meaningful sort key so
    // month=3 < month=11 and year=2027 < year=2028.
    // Modes: month (1-12), year (YYYY), monthday (1-31 of every month).
    // monthday tasks have no natural calendar position (could be any month),
    // so they sort by day value then order.
    function noTsSortKey(t) {
        const dl = t.deadline;
        const v  = parseInt(dl.value) || 0;
        if (dl.mode === 'year')     return v * 10000;          // year: 2027 → 20270000
        if (dl.mode === 'month') {
            const now = new Date();
            // Wrap: if month < current month assume next occurrence next year
            const monthNum = v < 1 ? 1 : v > 12 ? 12 : v;
            const curMonth = now.getMonth() + 1;
            const year = monthNum < curMonth ? now.getFullYear() + 1 : now.getFullYear();
            return year * 100 + monthNum;                      // e.g. 202603
        }
        if (dl.mode === 'monthday') return 100000 + v;         // monthday after month/year, sorted by day
        return 999999 + (t.order ?? t.id);                     // unknown modes at end
    }
    withDlNoTs.sort((a, b) => {
        const ka = noTsSortKey(a), kb = noTsSortKey(b);
        if (ka !== kb) return ka - kb;
        return (a.order ?? a.id) - (b.order ?? b.id);
    });

    noDl.sort((a,b) => {
        const ta = a.checked ? 2 : (a.cycleChecked ? 1 : 0);
        const tb = b.checked ? 2 : (b.cycleChecked ? 1 : 0);
        if (ta !== tb) return ta - tb;
        const pd = (P[a.priority] ?? 3) - (P[b.priority] ?? 3);
        if (pd !== 0) return pd;
        return (a.order ?? a.id) - (b.order ?? b.id);
    });
    return { withDl: [...withDl, ...withDlNoTs], noDl };
}

// Is schedule mode active for a given context (null = ungrouped)
function scheduleActive(groupId) {
    // P-B: "Today" view is always deadline-ordered (schedule layout).
    return isTodayMode || isScheduleMode || (groupId != null && scheduleModeGroups.has(groupId));
}

// ---- Sort Mode ----
// ── NA-11: task sort as a gothic 3-mode picker (priority / order / alpha), global +
// per-group override. Reuses the .dl-month-* picker visuals (deadline / grimoire sort).
const TASK_SORTS = [
    { k: 'priority', label: 'По приоритету' },
    { k: 'order',    label: 'По порядку'    },
    { k: 'alpha',    label: 'По алфавиту'   },
];
const TASK_SORT_ICON = { priority: 'sortPriority', order: 'sortOrder', alpha: 'sortAlpha' };
function _taskSortIcon(k)  { return IC[TASK_SORT_ICON[k] || 'sortPriority']; }
function _taskSortLabel(k) { return (TASK_SORTS.find(s => s.k === k) || TASK_SORTS[0]).label; }
// Option rows for a picker; `onclickFor(key)` returns the JS call string for each row.
// Each row carries the mode's own glyph (richer + reads at a glance).
function _taskSortOptions(curK, onclickFor) {
    return TASK_SORTS.map(s =>
        `<div class="dl-month-option task-sort-opt${s.k === curK ? ' active' : ''}" role="option" aria-selected="${s.k === curK}" onclick="${onclickFor(s.k)}">`
        + `<span class="tso-ic">${_taskSortIcon(s.k)}</span><span class="tso-label">${s.label}</span></div>`
    ).join('');
}
// Per-group picker markup (string) injected into the group header.
function _groupSortPicker(groupId, curK, hasOverride) {
    return `<span class="task-sort grp-sort dl-month-picker">
        <button class="btn-group-action btn-group-sort${hasOverride ? ' sort-overridden' : ''}" type="button"
                onclick="toggleSortPicker(event)" aria-haspopup="listbox" aria-expanded="false"
                title="Сортировка: ${_taskSortLabel(curK).toLowerCase()}">${_taskSortIcon(curK)}</button>
        <div class="dl-month-list task-sort-list" role="listbox" aria-hidden="true">${_taskSortOptions(curK, k => `setGroupSort(${groupId},'${k}')`)}</div>
    </span>`;
}
// Refresh the global toolbar trigger (icon + title + active ring) and its option list.
function _renderTaskSortControl() {
    const btn = document.getElementById('btn-sort-mode');
    if (btn) {
        btn.innerHTML = _taskSortIcon(state.sortMode);
        btn.title = 'Сортировка: ' + _taskSortLabel(state.sortMode).toLowerCase();
        btn.classList.toggle('active', state.sortMode !== 'priority');   // priority = the default
    }
    const list = document.getElementById('task-sort-list');
    if (list) list.innerHTML = _taskSortOptions(state.sortMode, k => `setTaskSort('${k}')`);
}
// One picker open at a time; outside-click closes. Works for the toolbar + every group.
// The list is PORTALED to <body> while open so it can't be clipped or painted over by a
// transformed ancestor / overflow / stacking context; closing restores it into the picker.
let _openSortPicker = null;
let _portaledList = null;   // { el, parent } — the list moved to <body>, and where it came from
function toggleSortPicker(e) {
    if (e) e.stopPropagation();
    const picker = e.currentTarget.closest('.dl-month-picker');
    if (!picker) return;
    const willOpen = !picker.classList.contains('open');
    _closeSortPicker();
    if (!willOpen) return;
    const lst = picker.querySelector('.dl-month-list');
    const r = picker.getBoundingClientRect();
    const openUp = r.bottom > window.innerHeight - 260;
    picker.classList.add('open');
    const tr = picker.querySelector('[aria-haspopup]'); if (tr) tr.setAttribute('aria-expanded', 'true');
    if (lst) {
        _portaledList = { el: lst, parent: picker };
        document.body.appendChild(lst);          // escape transformed/clipped/stacked ancestors
        lst.classList.add('task-sort-portal');
        lst.setAttribute('aria-hidden', 'false');
        // Anchor to the trigger; flip upward when it sits near the viewport bottom (S1-7).
        lst.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
        if (openUp) { lst.style.top = 'auto'; lst.style.bottom = (window.innerHeight - r.top + 6) + 'px'; }
        else        { lst.style.bottom = 'auto'; lst.style.top = (r.bottom + 6) + 'px'; }
    }
    _openSortPicker = picker;
    document.addEventListener('click', _sortPickerOutside);
}
function _sortPickerOutside(e) {
    if (!_openSortPicker) return;
    const lst = _portaledList && _portaledList.el;
    if (_openSortPicker.contains(e.target) || (lst && lst.contains(e.target))) return;
    _closeSortPicker();
}
function _closeSortPicker() {
    if (!_openSortPicker) return;
    const pk = _openSortPicker;
    pk.classList.remove('open', 'open-up');
    const tr = pk.querySelector('[aria-haspopup]'); if (tr) tr.setAttribute('aria-expanded', 'false');
    if (_portaledList) {
        const { el, parent } = _portaledList;
        el.classList.remove('task-sort-portal');
        el.style.top = el.style.bottom = el.style.right = '';
        el.setAttribute('aria-hidden', 'true');
        if (parent && parent.isConnected) parent.appendChild(el);   // restore into the picker
        else if (el.parentNode) el.parentNode.removeChild(el);      // picker re-rendered away → drop orphan
        _portaledList = null;
    }
    _openSortPicker = null;
    document.removeEventListener('click', _sortPickerOutside);
}
// Global sort mode.
function setTaskSort(k) {
    if (!TASK_SORTS.some(s => s.k === k)) return;
    _closeSortPicker();
    if (k === state.sortMode) return;
    state.sortMode = k;
    saveState();
    render();
    _renderTaskSortControl();
    showToast('Сортировка: ' + _taskSortLabel(k).toLowerCase());
}
// Per-group override (clears itself when it matches the global mode → group follows global).
function setGroupSort(groupId, k) {
    if (!TASK_SORTS.some(s => s.k === k)) return;
    _closeSortPicker();
    if (!state.sortModeOverrides) state.sortModeOverrides = {};
    const key = String(groupId);
    if (k === (state.sortMode || 'priority')) delete state.sortModeOverrides[key];
    else state.sortModeOverrides[key] = k;
    saveState();
    render();
}

function toggleSortMode() {
    state.sortMode = (state.sortMode === 'priority') ? 'order' : 'priority';
    saveState();
    const btn = document.getElementById('btn-sort-mode');
    if (btn) {
        btn.innerHTML = state.sortMode === 'order' ? IC.sortOrder : IC.sortPriority;
        btn.title     = state.sortMode === 'order' ? 'Режим: по порядку' : 'Режим: по приоритету';
        btn.classList.toggle('active', state.sortMode === 'order');
    }
    render();
    showToast(state.sortMode === 'order' ? 'Сортировка: по порядку' : 'Сортировка: по приоритету');
}

function toggleGroupSortMode(groupId) {
    if (!state.sortModeOverrides) state.sortModeOverrides = {};
    const key = String(groupId);
    const current = getEffectiveSortMode(groupId);
    const newMode = current === 'priority' ? 'order' : 'priority';
    // If override matches global — remove it (group follows global)
    if (newMode === state.sortMode) {
        delete state.sortModeOverrides[key];
    } else {
        state.sortModeOverrides[key] = newMode;
    }
    saveState();
    render();
}

// ---- Focus Mode ----
function toggleFocusGroup(groupId) {
    focusGroupId = (focusGroupId === groupId) ? null : groupId;
    saveUiState();
    render();
    if (focusGroupId !== null) {
        const grp = state.groups.find(g => g.id === groupId);
        showToast(`Фокус: ${escHtml(grp ? grp.name : '...')}`);
    } else {
        showToast('Фокус снят');
    }
}

// ---- Tag clear functions ----
function clearTaskRepeat(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    task.repeat = 'none';
    task.repeatAnchorTime     = null;
    task.repeatAnchorDay      = null;
    task.repeatAnchorMonthday = null;
    task.cycleChecked = false;
    task.nextReset    = null;
    saveState();
    render();
    showToast('Повтор снят');
}

function clearTaskDeadline(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    task.deadline = null;
    saveState();
    render();
    showToast('Дедлайн снят');
}

// ── Idea 1: Snooze (quick postpone) ──────────────────────────────────────────
// Snoozing converts the deadline to a concrete date(+time) — predictable across
// all deadline modes. Time-of-day is preserved when the original had one.
const _pad2 = n => String(n).padStart(2, '0');
const _ymd  = d => `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())}`;

function _deadlineTimeOfDay(dl) {
    if (!dl) return null;
    if (dl.mode === 'time')     return dl.value;
    if (dl.mode === 'date')     return dl.time || null;
    if (dl.mode === 'weektime') { const [, t] = dl.value.split('|'); return dl.timeSet !== false ? (t || null) : null; }
    return null;
}

function snoozeDeadline(id, preset) {
    closeFloatMenu();
    const task = state.tasks.find(t => t.id === id);
    if (!task || !task.deadline) return;
    pushUndo();
    const time = _deadlineTimeOfDay(task.deadline);
    let dl;
    if (preset === '1h') {
        const d = new Date(Date.now() + 3600000);
        dl = { mode: 'date', value: _ymd(d), time: `${_pad2(d.getHours())}:${_pad2(d.getMinutes())}` };
    } else if (preset === 'tomorrow') {
        const d = new Date(); d.setDate(d.getDate() + 1);
        dl = { mode: 'date', value: _ymd(d) };
        if (time) dl.time = time;
    } else { // 'week' — +7 days from the later of (existing deadline, now)
        const base = Math.max(getDeadlineTimestamp(task.deadline) || Date.now(), Date.now());
        const d = new Date(base + 7 * 86400000);
        dl = { mode: 'date', value: _ymd(d) };
        if (time) dl.time = time;
    }
    task.deadline = dl;
    // A snoozed deadline is in the future → clear any "notified" flag so it can fire again.
    _notifiedDeadlines.delete(id);
    saveState();
    renderListOnly();
    const label = { '1h': 'на 1 час', 'tomorrow': 'до завтра', 'week': 'на неделю' }[preset] || '';
    showToast(`Дедлайн отложен ${label}`.trim(), { undo: true });
}

// ── Shared floating popup-menu (used by snooze + demote parent-picker) ───────
let _floatMenuEl = null;
let _floatMenuAnchor = null;          // the trigger button the open menu belongs to
let _suppressReopenAnchor = null;     // set on a toggle-close so the trailing click doesn't reopen
let _suppressReopenAt = 0;
function closeFloatMenu() {
    const m = _floatMenuEl;
    _floatMenuEl = null;            // clear refs first so an immediate reopen makes a fresh element
    _floatMenuAnchor = null;
    document.removeEventListener('pointerdown', _floatMenuOutside, true);
    if (m) {
        // Smooth exit: fade/scale the old element out, then remove it.
        m.classList.add('float-menu-closing');
        let gone = false;
        const drop = () => { if (gone) return; gone = true; m.remove(); };
        m.addEventListener('animationend', drop, { once: true });
        setTimeout(drop, 240);      // safety net if animationend never fires
    }
}
function _floatMenuOutside(e) {
    if (!_floatMenuEl || _floatMenuEl.contains(e.target)) return;
    // A pointerdown on the very anchor that opened the menu is a toggle-close: the
    // trailing click would otherwise re-run the opener and reopen it. Remember the
    // anchor so _openFloatMenu suppresses that one reopen → the button toggles shut.
    if (_floatMenuAnchor && _floatMenuAnchor.contains(e.target)) {
        _suppressReopenAnchor = _floatMenuAnchor;
        _suppressReopenAt = performance.now();
    }
    closeFloatMenu();
}
// Opens a body-level menu anchored under `btn`. Returns false if it just toggled
// an already-open menu closed (incl. the same-anchor re-click toggle).
function _openFloatMenu(btn, innerHTML, extraClass) {
    if (_suppressReopenAnchor === btn && performance.now() - _suppressReopenAt < 400) {
        _suppressReopenAnchor = null;
        return false;
    }
    _suppressReopenAnchor = null;
    if (_floatMenuEl) { closeFloatMenu(); return false; }
    const menu = document.createElement('div');
    menu.className = 'snooze-menu' + (extraClass ? ' ' + extraClass : '');
    menu.setAttribute('role', 'menu');
    menu.innerHTML = innerHTML;
    document.body.appendChild(menu);
    const r  = btn.getBoundingClientRect();
    const mw = menu.offsetWidth || 160;
    menu.style.top  = Math.round(r.bottom + 5) + 'px';
    menu.style.left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - mw - 8))) + 'px';
    _floatMenuEl = menu;
    _floatMenuAnchor = btn;
    // Defer so this same click doesn't immediately close it
    setTimeout(() => document.addEventListener('pointerdown', _floatMenuOutside, true), 0);
    return true;
}

function openSnoozeMenu(event, id) {
    event.stopPropagation();
    _openFloatMenu(event.currentTarget, `
        <button type="button" role="menuitem" onclick="snoozeDeadline(${id}, '1h')">${IC.snooze}<span>+1 час</span></button>
        <button type="button" role="menuitem" onclick="snoozeDeadline(${id}, 'tomorrow')">${IC.moon}<span>До завтра</span></button>
        <button type="button" role="menuitem" onclick="snoozeDeadline(${id}, 'week')">${IC.sundial}<span>+1 неделя</span></button>
        <div class="snooze-custom">
            <input type="number" class="snooze-custom-input" id="snooze-custom-n" min="1" max="999" placeholder="N"
                   onkeydown="if(event.key==='Enter'){event.preventDefault();_snoozeCustomApply(${id})}">
            <div class="snooze-units">
                <button type="button" class="snooze-unit active" data-u="h" onclick="_snoozeUnitPick(this)">ч</button>
                <button type="button" class="snooze-unit" data-u="d" onclick="_snoozeUnitPick(this)">дн</button>
                <button type="button" class="snooze-unit" data-u="w" onclick="_snoozeUnitPick(this)">нед</button>
            </div>
            <button type="button" class="snooze-custom-go" onclick="_snoozeCustomApply(${id})">ОК</button>
        </div>`, 'snooze-with-custom');
}

function _snoozeUnitPick(btn) {
    if (!_floatMenuEl) return;
    _floatMenuEl.querySelectorAll('.snooze-unit').forEach(b => b.classList.toggle('active', b === btn));
}
function _snoozeCustomApply(id) {
    const inp = document.getElementById('snooze-custom-n');
    const n   = parseInt(inp && inp.value);
    if (!n || n < 1) { if (inp) inp.focus(); return; }
    const unitBtn = _floatMenuEl && _floatMenuEl.querySelector('.snooze-unit.active');
    snoozeByRelative(id, n, unitBtn ? unitBtn.dataset.u : 'h');
}
// Postpone a deadline by a relative amount (n hours / days / weeks).
function snoozeByRelative(id, n, unit) {
    closeFloatMenu();
    const task = state.tasks.find(t => t.id === id);
    if (!task || !task.deadline) return;
    pushUndo();
    const time = _deadlineTimeOfDay(task.deadline);
    let dl;
    if (unit === 'h') {
        const d = new Date(Date.now() + n * 3600000);
        dl = { mode:'date', value:_ymd(d), time:`${_pad2(d.getHours())}:${_pad2(d.getMinutes())}` };
    } else {
        const days = unit === 'w' ? n * 7 : n;
        const base = Math.max(getDeadlineTimestamp(task.deadline) || Date.now(), Date.now());
        const d = new Date(base + days * 86400000);
        dl = { mode:'date', value:_ymd(d) };
        if (time) dl.time = time;
    }
    task.deadline = dl;
    _notifiedDeadlines.delete(id);
    saveState(); renderListOnly();
    const u = { h:'ч', d:'дн', w:'нед' }[unit] || '';
    showToast(`Дедлайн отложен на ${n} ${u}`, { undo: true });
}

// 6f: give every static colour swatch an accessible name (they only had a
// background colour, so screen readers announced nothing). Dynamic colour-filter
// swatches are labelled where they're built (_populateColorFilterModal).
function _labelColorSwatches() {
    document.querySelectorAll('.color-swatch[data-color], .form-color-swatch[data-color]').forEach(sw => {
        if (sw.getAttribute('aria-label')) return;
        const c = sw.dataset.color;
        sw.setAttribute('aria-label', c ? ('Цвет ' + c) : 'Без цвета');
    });
}

// 6f: reflect the selected option to assistive tech on the custom listbox
// dropdowns (month / weekday / form-weekday) via aria-activedescendant.
function _syncListboxActive(listEl) {
    if (!listEl) return;
    listEl.querySelectorAll('.dl-month-option').forEach(opt => {
        if (!opt.id) opt.id = listEl.id + '-opt-' + (opt.dataset.value || 'any');
    });
    const active = listEl.querySelector('.dl-month-option.active');
    if (active) listEl.setAttribute('aria-activedescendant', active.id);
}

// ---- Color Filter ----
function _syncColorFilterUI() {
    // Sync the toolbar button's active state
    const cfBtn = document.getElementById('btn-color-filter');
    if (cfBtn) cfBtn.classList.toggle('active', !!colorFilter);
}

function setColorFilter(color) {
    const clearing = (colorFilter === color);
    colorFilter = clearing ? null : color;
    saveUiState();
    _syncColorFilterUI();
    render();
    // Picking OR clearing now both auto-close the modal (was: pick kept it open + repopulated).
    closeColorFilterModal();
    if (clearing) showToast('Фильтр по цвету очищен');
}

function openColorFilterModal() {
    const modal = document.getElementById('color-filter-modal');
    if (!modal) return;
    _populateColorFilterModal();
    openModalWithFocus('color-filter-modal');   // U-1/S1-3: focus-trap + return + exit-anim
}

function closeColorFilterModal(event) {
    if (!event || event.target === document.getElementById('color-filter-modal')) {
        closeModalWithAnim('color-filter-modal');
    }
}

function _populateColorFilterModal() {
    const container = document.getElementById('color-filter-swatches');
    if (!container) return;
    const colors = [...new Set(state.tasks
        .filter(t => t.color)
        .map(t => t.color))];
    if (!colors.length) {
        container.innerHTML = '<p class="color-filter-empty">В текущем списке нет задач с метками</p>';
        return;
    }
    const swatches = colors.map(c => `
        <button class="color-filter-swatch${colorFilter === c ? ' active' : ''}"
                style="background:${c}"
                onclick="setColorFilter('${c}')"
                aria-label="Цвет ${c}"
                title="Цвет ${c}">
            ${colorFilter === c
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.8" stroke-linecap="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>`
                : ''}
        </button>`).join('');

    // Gothic "extinguish" clear button — only shown when a filter is active
    const clearBtn = colorFilter ? `
        <button class="color-filter-swatch color-filter-clear"
                onclick="setColorFilter(colorFilter)"
                title="Снять фильтр по цвету">
            ${IC.crossedSwords}
        </button>` : '';

    container.innerHTML = swatches + clearBtn;
}

// ---- Archive Search ----
function _applyArchiveSearch() {
    const q = archiveSearchQuery.toLowerCase();
    document.querySelectorAll('#archive-list .archive-item').forEach(li => {
        const text = li.textContent.toLowerCase();
        li.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
    // Show/hide month headers if all their items are hidden
    document.querySelectorAll('.archive-month-section').forEach(sec => {
        const visible = [...sec.querySelectorAll('.archive-item')]
            .some(li => li.style.display !== 'none');
        sec.style.display = visible ? '' : 'none';
    });
}

// ---- Import merge ----
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loaded = JSON.parse(e.target.result);
            // F-B: развести два формата. Бэкап записей Гримуара (_grimFull) — только заметки;
            // его место в импорте Гримуара (Перенос → Импорт), не здесь.
            if (loaded && loaded._grimFull && !Array.isArray(loaded.tasks)) {
                showToast('Это бэкап записей Гримуара — импортируйте его в Гримуаре (Перенос → Импорт)'); return;
            }
            if (!loaded || !Array.isArray(loaded.tasks)) {
                showToast('Неверный формат файла'); return;
            }
            const clamp = (s, max) => (typeof s === 'string' ? s.slice(0, max) : s);
            const validColor = c => (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)) ? c : null;
            const okPrio   = p => (p === 'low' || p === 'medium' || p === 'high') ? p : 'none';
            const okRepeat = r => ['daily','weekly','weekdays','monthly'].includes(r) ? r : 'none';
            const sanitizeTask = t => ({
                ...t,
                text:  clamp(t.text,  200),
                note:  clamp(t.note,  500),
                // V-4: validate the colour label (was passed through unchecked and later
                // interpolated into style/onclick — broken values could corrupt markup).
                color: validColor(t.color),
                // D-4: validate enums from untrusted JSON so a bad value can't reach dataset/sort/CSS.
                priority: okPrio(t.priority),
                repeat:   okRepeat(t.repeat),
                subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(s => ({
                    ...s, text: clamp(s.text, 200), note: clamp(s.note, 500),
                    priority: okPrio(s.priority), repeat: okRepeat(s.repeat),
                })) : [],
            });
            const sanitizeGroup = g => ({
                ...g,
                id:    Number.isInteger(g.id) ? g.id : (parseInt(g.id) || 0),
                name:  clamp(g.name, 60),
                color: /^#[0-9a-fA-F]{6}$/.test(g.color) ? g.color : '#6C8EF5',
            });

            // Show merge/replace dialog
            _showImportChoiceModal(loaded, sanitizeTask, sanitizeGroup);
        } catch {
            showToast('Ошибка чтения файла');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function _showImportChoiceModal(loaded, sanitizeTask, sanitizeGroup) {
    const overlay = document.getElementById('import-choice-overlay');
    if (overlay) {
        const replaceBtn = document.getElementById('import-replace-btn');
        const mergeBtn   = document.getElementById('import-merge-btn');
        const cancelBtn  = document.getElementById('import-cancel-btn');
        const close = () => closeModalWithAnim('import-choice-overlay');   // U-1: exit-anim + trap removal

        replaceBtn.onclick = () => {
            close();
            pushUndo();
            // F-B: «Заменить» заменяет ТОЛЬКО домены, присутствующие в файле. Бэкап
            // «только задачи» не несёт данных Гримуара → сохраняем текущие записи/склеп/
            // шаблоны записей/сорт/летопись (правило №1: не теряем данные).
            const keepGrim = !('notes' in loaded) && !('notesArchive' in loaded);
            const _g = keepGrim ? { notes: state.notes, notesArchive: state.notesArchive,
                                    noteTemplates: state.noteTemplates, notesSort: state.notesSort } : null;
            state = {
                tasks: [], groups: [], archive: [],
                nextId: 1, nextGroupId: 1, nextSubId: 1,
                sortMode: 'priority', sortModeOverrides: {},
                ...loaded,
                tasks:   (loaded.tasks   || []).map(sanitizeTask),
                groups:  (loaded.groups  || []).map(sanitizeGroup),
                archive: (loaded.archive || []).map(sanitizeTask),
            };
            delete state._grimVersions;
            if (_g) { state.notes = _g.notes; state.notesArchive = _g.notesArchive;
                      state.noteTemplates = _g.noteTemplates; state.notesSort = _g.notesSort; }
            migrateTasks(state.tasks);
            migrateTasks(state.archive || []);
            normalizeState();
            if (!keepGrim) _grimRestoreVersions(loaded, 'replace');   // NA-3: только если файл нёс записи
            // C3-2: do NOT wipe undoStack — pushUndo() above is the only safety net
            // that lets the user undo a destructive "Replace" import.
            saveState(); render(); updateArchiveBadge();
            showToast(`Импортировано: ${state.tasks.length} задач`, { undo: true });
        };

        mergeBtn.onclick = () => {
            close();
            pushUndo();
            // Idea 8: merge by stable uid identity, not the fragile int-id offset.
            // 1) Ensure incoming records carry uids (old exports without one get fresh
            //    uids → treated as genuinely new, exactly like before).
            const inGroups  = (loaded.groups  || []).map(sanitizeGroup);
            const inTasks   = (loaded.tasks   || []).map(sanitizeTask);
            const inArchive = (loaded.archive || []).map(sanitizeTask);
            migrateTasks(inTasks);    // backfill uid/updatedAt on incoming (idempotent)
            migrateTasks(inArchive);
            const _gnow = nowTs();
            inGroups.forEach(g => { if (!g.uid) g.uid = uid(); if (!g.updatedAt) g.updatedAt = _gnow; });

            // 2) DEDUP by uid so re-importing the same backup no longer duplicates
            //    everything (manual «Добавить» adds genuinely-new records; updating an
            //    existing one is left to the sync stage with its «ask on conflict»).
            const localTaskUids  = new Set([...state.tasks, ...state.archive].map(t => t.uid));
            const localGroupUids = new Set(state.groups.map(g => g.uid));

            const idOffset  = state.nextId;
            const gidOffset = state.nextGroupId;
            const sidOffset = state.nextSubId;
            const baseOrder = state.tasks.length;
            // The int-id offset is now ONLY a local DOM-key allocator (identity is the
            // uid) — it can't corrupt identity even on collision. Map each incoming
            // group's int id → its resolved LOCAL int id (the existing local group when
            // the uid already lives here, else a fresh offset id) so a task whose group
            // was deduped still points at the right local group instead of orphaning.
            const gidMap = new Map();
            const newGroups = [];
            inGroups.forEach(g => {
                if (localGroupUids.has(g.uid)) {
                    const local = state.groups.find(lg => lg.uid === g.uid);
                    gidMap.set(g.id, local ? local.id : null);
                } else {
                    gidMap.set(g.id, g.id + gidOffset);
                    newGroups.push({ ...g, id: g.id + gidOffset });
                }
            });
            const remapTask = t => ({
                ...t,
                id:      t.id + idOffset,
                groupId: t.groupId != null ? (gidMap.has(t.groupId) ? gidMap.get(t.groupId) : t.groupId + gidOffset) : null,
                subtasks: (t.subtasks || []).map(s => ({ ...s, id: (s.id || 0) + sidOffset })),
                // C3-3: guard missing order from older exports (was `t.order + len` → NaN).
                order:   (t.order ?? 0) + baseOrder,
            });
            const newTasks   = inTasks.filter(t => !localTaskUids.has(t.uid)).map(remapTask);
            // C3-4: merge must also bring the imported archive (was silently dropped).
            const newArchive = inArchive.filter(t => !localTaskUids.has(t.uid)).map(remapTask);
            state.groups.push(...newGroups);
            state.tasks.push(...newTasks);
            state.archive.push(...newArchive);
            // C3-2/C3-3: advance every counter past the highest imported id (tasks AND
            // archive, plus their subtasks) so later-created records can't collide.
            const allRecords = [...newTasks, ...newArchive];
            if (allRecords.length) state.nextId   = Math.max(state.nextId,   ...allRecords.map(t => t.id + 1));
            if (newGroups.length)  state.nextGroupId = Math.max(state.nextGroupId, ...newGroups.map(g => g.id + 1));
            const allSubIds = allRecords.flatMap(t => (t.subtasks || []).map(s => s.id));
            if (allSubIds.length)  state.nextSubId = Math.max(state.nextSubId, ...allSubIds.map(id => id + 1));
            migrateTasks(state.tasks);
            migrateTasks(state.archive);
            // п11: merge grimoire notes + склеп too (uuid ids don't collide; dedupe by id).
            if (!Array.isArray(state.notes)) state.notes = [];
            if (!Array.isArray(state.notesArchive)) state.notesArchive = [];
            if (Array.isArray(loaded.notes)) {
                const seen = new Set(state.notes.map(n => n.id));
                loaded.notes.forEach(n => { if (n && !seen.has(n.id)) state.notes.push(n); });
            }
            if (Array.isArray(loaded.notesArchive)) {
                const seenA = new Set(state.notesArchive.map(n => n.id));
                loaded.notesArchive.forEach(n => { if (n && !seenA.has(n.id)) state.notesArchive.push(n); });
            }
            // NA-6: merge also carries note templates (dedupe by uuid) + the chosen
            // note sort when the local grimoire has none yet — both were silently
            // dropped before (only «Заменить» pulled them via ...loaded).
            if (Array.isArray(loaded.noteTemplates)) {
                if (!Array.isArray(state.noteTemplates)) state.noteTemplates = [];
                const seenT = new Set(state.noteTemplates.map(t => t.id));
                loaded.noteTemplates.forEach(t => { if (t && !seenT.has(t.id)) state.noteTemplates.push(t); });
            }
            if (!state.notesSort && loaded.notesSort) state.notesSort = loaded.notesSort;
            // NA-2: normalize AFTER merging notes so migrateNotes() sanitizes the
            // imported bodies too (external JSON = untrusted input).
            normalizeState();
            _grimRestoreVersions(loaded, 'merge');   // NA-3: add history for the new notes only
            saveState(); render(); updateArchiveBadge();
            showToast(`Добавлено: ${newTasks.length} задач`, { undo: true });
        };

        cancelBtn.onclick = close;
        // NA-3 (Б): the grimoire JSON import reuses this same overlay and rewrites its
        // title/desc, so set our own here too — each opener is self-contained, text can't bleed.
        const _t = document.getElementById('import-choice-title');
        const _d = overlay.querySelector('.import-choice-desc');
        if (_t) _t.textContent = 'Импорт данных';
        if (_d) _d.textContent = 'Добавить задачи к существующим или полностью заменить?';
        // U-1: NO backdrop-close for this destructive choice (per user) — a stray click
        // outside must not dismiss it. Esc + the three buttons remain the only exits.
        openModalWithFocus('import-choice-overlay');
    } else {
        // Fallback if modal not in HTML — just replace
        pushUndo();
        // F-B: как и в основной ветке — сохраняем данные Гримуара, если файл их не нёс.
        const keepGrim = !('notes' in loaded) && !('notesArchive' in loaded);
        const _g = keepGrim ? { notes: state.notes, notesArchive: state.notesArchive,
                                noteTemplates: state.noteTemplates, notesSort: state.notesSort } : null;
        state = {
            tasks: [], groups: [], archive: [],
            nextId: 1, nextGroupId: 1, nextSubId: 1,
            sortMode: 'priority', sortModeOverrides: {},
            ...loaded,
            tasks:   (loaded.tasks   || []).map(sanitizeTask),
            groups:  (loaded.groups  || []).map(sanitizeGroup),
            archive: (loaded.archive || []).map(sanitizeTask),
        };
        delete state._grimVersions;
        if (_g) { state.notes = _g.notes; state.notesArchive = _g.notesArchive;
                  state.noteTemplates = _g.noteTemplates; state.notesSort = _g.notesSort; }
        migrateTasks(state.tasks);
        migrateTasks(state.archive || []);
        normalizeState();
        if (!keepGrim) _grimRestoreVersions(loaded, 'replace');   // NA-3: только если файл нёс записи
        // C3-2: keep the pre-import snapshot so Replace stays undoable.
        saveState(); render(); updateArchiveBadge();
        showToast(`Импортировано: ${state.tasks.length} задач`, { undo: true });
    }
}

// ---- Web Notifications ----
function requestNotificationPermission() {
    if (!('Notification' in window)) { showToast('Уведомления не поддерживаются'); return; }
    Notification.requestPermission().then(perm => {
        const btn = document.getElementById('btn-notifications');
        const granted = perm === 'granted';
        if (btn) btn.classList.toggle('active', granted);
        // Persist so PWA offline reload restores button state correctly
        if (granted) localStorage.setItem('dusk_notif', '1');
        else localStorage.removeItem('dusk_notif');
        showToast(granted ? 'Уведомления включены' : 'Доступ к уведомлениям отклонён');
    });
}

function _checkDeadlineNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    let changed = false;
    state.tasks.forEach(task => {
        const status = (!task.checked && !task.cycleChecked && task.deadline)
            ? deadlineStatus(task.deadline) : null;
        const due = status === 'critical' || status === 'over' || status === 'live';
        // D-5: not due (completed, deadline removed, or pushed back) → drop the flag so a
        // later re-entry can notify again.
        if (!due) { if (_notifiedDeadlines.delete(task.id)) changed = true; return; }
        // V-2: notify once per deadline signature — an edited/snoozed deadline (new
        // signature) re-notifies; the same one already seen (this session or a prior load) skips.
        const sig = JSON.stringify(task.deadline);
        if (_notifiedDeadlines.get(task.id) === sig) return;
        _notifiedDeadlines.set(task.id, sig); changed = true;
        try {
            new Notification('DUSK — дедлайн', {
                body: task.text,
                icon: './icon-192.svg',
                tag:  'dusk-deadline-' + task.id,
            });
        } catch(e) { /* ignore */ }
    });
    // Prune flags for tasks that no longer exist so the store stays bounded.
    const liveIds = new Set(state.tasks.map(t => t.id));
    for (const id of [..._notifiedDeadlines.keys()]) {
        if (!liveIds.has(id)) { _notifiedDeadlines.delete(id); changed = true; }
    }
    if (changed) {
        try { localStorage.setItem('dusk_notified_v1', JSON.stringify([..._notifiedDeadlines])); } catch (_) {}
    }
}

// ---- Group DnD ----
let sortableGroupsList    = null;
let sortableGroupSections = null;

function initGroupDnD() {
    // Pill bar — drag to reorder via pill wrap
    const container = document.getElementById('groups-list');
    if (!container || typeof Sortable === 'undefined') return;
    if (sortableGroupsList) { sortableGroupsList.destroy(); sortableGroupsList = null; }
    sortableGroupsList = new Sortable(container, {
        animation: 200,
        delay: 120,
        delayOnTouchOnly: false,
        handle: '.group-pill-wrap',
        onEnd: (evt) => {
            const oldIdx = evt.oldIndex;
            const newIdx = evt.newIndex;
            if (oldIdx === newIdx) return;
            const moved = state.groups.splice(oldIdx, 1)[0];
            state.groups.splice(newIdx, 0, moved);
            saveState();
            render();
        },
    });

    // Group sections — drag via header drag handle
    if (groupsContainer) {
        if (sortableGroupSections) { sortableGroupSections.destroy(); sortableGroupSections = null; }
        sortableGroupSections = new Sortable(groupsContainer, {
            animation: 220,
            delay: 100,
            delayOnTouchOnly: false,
            handle: '.group-drag-handle',
            filter: '.group-actions',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: (evt) => {
                // C-1: the rendered sections may be a SUBSET of state.groups — Today view,
                // active search and focus mode hide empty / non-matching groups. A raw DOM
                // index (evt.oldIndex/newIndex) then maps to the WRONG state slot and silently
                // scrambles group order. Reorder by group id read from the live DOM instead:
                // drop the dragged group right after its new on-screen predecessor, leaving
                // hidden groups in their relative places.
                const movedId = parseInt(evt.item && evt.item.dataset.groupId);
                if (!Number.isInteger(movedId)) return;
                const domIds = [...groupsContainer.querySelectorAll(':scope > .group-section')]
                    .map(s => parseInt(s.dataset.groupId)).filter(Number.isInteger);
                if (domIds.length < 2) return;
                const moved = state.groups.find(g => g.id === movedId);
                if (!moved) return;
                const pos      = domIds.indexOf(movedId);
                const beforeId = pos > 0 ? domIds[pos - 1] : null;
                const rest     = state.groups.filter(g => g.id !== movedId);
                if (beforeId === null) {
                    const firstRendered = rest.findIndex(g => domIds.includes(g.id));
                    rest.splice(firstRendered === -1 ? 0 : firstRendered, 0, moved);
                } else {
                    rest.splice(rest.findIndex(g => g.id === beforeId) + 1, 0, moved);
                }
                state.groups = rest;
                saveState();
                render();
            },
        });
    }
}

// ---- Bulk priority change ----
// Shared guard for every bulk entry point — nudges the user instead of silently no-op'ing
// when they trigger a bulk action with nothing selected.
function _requireSelection() {
    if (!selectedTaskIds.size) { showToast('Сначала выберите задачи'); return false; }
    return true;
}

function bulkSetPriority(priority) {
    if (!_requireSelection()) return;
    pushUndo();
    selectedTaskIds.forEach(id => {
        const t = state.tasks.find(t => t.id === id);
        // Priority and colour are mutually exclusive accents — a real priority clears the colour
        // (mirror of bulkSetColor clearing priority). Without this the colour stripe, defined later
        // in CSS with equal specificity, would keep overriding the new priority stripe.
        if (t) _setTaskPriority(t, priority);
    });
    saveState();
    toggleMainSelectMode(); // exit select mode and re-render
    showToast('Приоритет изменён');
}

// ── P-D: bulk group / colour / deadline (parity with bulkSetPriority) ────────
let bulkColorActive    = false;   // task-color modal is acting on the whole selection
let bulkDeadlineActive = false;   // deadline modal is acting on the whole selection
let formColorActive    = false;   // task-color modal opened from the creation form (writes selectedFormColor)

function bulkSetGroup(groupId) {
    if (!selectedTaskIds.size) return;
    pushUndo();
    selectedTaskIds.forEach(id => {
        const t = state.tasks.find(t => t.id === id);
        if (t) t.groupId = groupId;
    });
    saveState();
    closeBulkGroupModal();
    const grp = groupId != null ? state.groups.find(g => g.id === groupId) : null;
    toggleMainSelectMode(); // exit select mode and re-render
    showToast(grp ? `Перемещено в «${grp.name}»` : 'Убрано из групп');
}

function bulkSetColor(color) {
    if (!selectedTaskIds.size) return;
    pushUndo();
    selectedTaskIds.forEach(id => {
        const t = state.tasks.find(t => t.id === id);
        // Colour and priority are mutually exclusive accents — setting a colour clears priority.
        if (t) _setTaskColor(t, color);
    });
    saveState();
    toggleMainSelectMode();
    showToast(color ? 'Цвет установлен' : 'Цвет снят');
}

function bulkSetDeadline(dl) {
    if (!selectedTaskIds.size) return;
    pushUndo();
    selectedTaskIds.forEach(id => {
        const t = state.tasks.find(t => t.id === id);
        if (t) t.deadline = dl;
    });
    saveState();
    toggleMainSelectMode();
    showToast(dl ? 'Дедлайн установлен' : 'Дедлайн снят');
}

function openBulkColorModal() {
    if (!_requireSelection()) return;
    bulkColorActive = true;
    formColorActive = false;
    document.querySelectorAll('#task-color-picker .color-swatch').forEach(s => s.classList.remove('active'));
    _grgbSyncFromColor(null, 'task'); // bulk has no single current colour — show the default gothic violet
    openModalWithFocus('task-color-modal');
}

function openBulkDeadlineModal() {
    if (!_requireSelection()) return;
    openDeadlineModal(null, true);
}

// ── Bulk group picker (small gothic modal listing group pills) ───────────────
function openBulkGroupModal() {
    if (!_requireSelection()) return;
    _renderBulkGroupList();
    openModalWithFocus('bulk-group-modal');
}
function closeBulkGroupModal(event) {
    if (!event || event.target === document.getElementById('bulk-group-modal')) {
        closeModalWithAnim('bulk-group-modal');
    }
}
function _renderBulkGroupList() {
    const cont = document.getElementById('bulk-group-list');
    if (!cont) return;
    const pills = state.groups.map(g => {
        const rgb = hexToRgb(g.color);
        const bg  = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.13)` : 'rgba(110,40,200,0.13)';
        const bd  = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.32)` : 'rgba(110,40,200,0.32)';
        return `<button class="bulk-group-pill meta-tag group-pill" style="background:${bg};color:${g.color};border-color:${bd}"
                    onclick="bulkSetGroup(${g.id})">${escHtml(g.name)}</button>`;
    }).join('');
    cont.innerHTML = `${pills}<button class="bulk-group-pill bulk-group-none" onclick="bulkSetGroup(null)">Без группы</button>`;
}

function renderGroupBar() {
    groupsList.innerHTML = '';
    state.groups.forEach(g => {
        const rgb = hexToRgb(g.color);
        const bg  = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.13)` : 'rgba(110,40,200,0.13)';
        const bd  = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.32)` : 'rgba(110,40,200,0.32)';
        const bgHov = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)` : 'rgba(110,40,200,0.22)';
        const wrap = document.createElement('div');
        wrap.className = 'group-pill-wrap';
        wrap.innerHTML = `
            <span class="meta-tag group-pill" style="background:${bg};color:${g.color};border-color:${bd}">${escHtml(g.name)}</span>
            <button class="btn-pill-delete" style="background:${bg};color:${g.color};border-color:${bd}" onmouseover="this.style.background='${bgHov}'" onmouseout="this.style.background='${bg}'" onclick="deleteGroup(${g.id})" title="Удалить группу">${IC.tombstone}</button>`;
        groupsList.appendChild(wrap);
    });
}

function renderGroupSelect() {
    const prev = taskGroupSelect.value;
    taskGroupSelect.innerHTML = '<option value="">— без группы —</option>';
    state.groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id; opt.textContent = g.name;
        taskGroupSelect.appendChild(opt);
    });
    const newOpt = document.createElement('option');
    newOpt.value = '__new__'; newOpt.textContent = '+ Создать группу...';
    newOpt.className = 'opt-new-group';
    taskGroupSelect.appendChild(newOpt);
    if (prev && prev !== '__new__' && taskGroupSelect.querySelector(`option[value="${prev}"]`))
        taskGroupSelect.value = prev;

    // Update inline chip selector
    renderGroupChips(taskGroupSelect.value);
}

// P7+P8: render the gothic group dropdown — trigger label (colour dot + name) + the
// option list (each group row carries a colour dot + a two-step delete button). Keeps the
// historical name renderGroupChips so all existing call sites stay valid.
function renderGroupChips(currentVal) {
    const list    = document.getElementById('grp-list');
    const trigEl  = document.getElementById('grp-trigger-label');
    if (!list || !trigEl) return;
    const currentGid = currentVal || '';

    // Trigger label reflects the current selection
    const curGroup = state.groups.find(g => String(g.id) === String(currentGid));
    trigEl.innerHTML = curGroup
        ? `<span class="grp-dd-dot" style="background:${curGroup.color}"></span>${escHtml(curGroup.name)}`
        : `${IC.noneMoonL}<span>без группы</span>${IC.noneMoonR}`;

    let html = `<div class="dl-month-option grp-dd-opt grp-dd-none${currentGid === '' ? ' active' : ''}" role="option" data-gid="" onclick="selectGroupChip('')">${IC.noneMoonL}<span>без группы</span>${IC.noneMoonR}</div>`;
    state.groups.forEach(g => {
        const isActive = String(g.id) === String(currentGid);
        html += `<div class="dl-month-option grp-dd-opt${isActive ? ' active' : ''}" role="option" data-gid="${g.id}" onclick="selectGroupChip('${g.id}')">
            <span class="grp-dd-dot" style="background:${g.color}"></span>
            <span class="grp-dd-name">${escHtml(g.name)}</span>
            <button class="grp-dd-del" type="button" data-gid="${g.id}" onclick="event.stopPropagation();deleteGroup(${g.id})" title="Удалить группу">${IC.tombstone}</button>
        </div>`;
    });
    html += `<div class="dl-month-option grp-dd-opt grp-dd-new" role="option" onclick="selectGroupChip('__new__')">${IC.crossAdd}<span class="grp-dd-name">Создать группу</span></div>`;
    list.innerHTML = html;
}

function selectGroupChip(gid) {
    if (window._closeGroupPicker) window._closeGroupPicker();
    if (gid === '__new__') {
        pendingGroupForSelector = true;
        showAddGroupModal();
        return;
    }
    taskGroupSelect.value = gid;
    renderGroupChips(gid);
}

// P8: open/close + outside-click wiring for the group dropdown. Mirrors
// initFormWeekdayPicker (incl. the .extra-fields overflow unclip + open-upward).
// ============================================================
//  G4-6: UNIFIED GOTHIC-PICKER OUTSIDE-CLICK
//  Each gothic dropdown used to register its OWN permanent document click
//  listener. They're consolidated here into ONE delegated listener over a
//  registry. closePicker() is a no-op when the picker is already closed, so
//  the delegate calls it unconditionally. (The repeat-modal weekday picker
//  uses a different pointerdown/classList pattern and keeps its own handler.)
// ============================================================
const _gothicPickers = [];
function registerGothicPicker(picker, closeFn) {
    if (picker && typeof closeFn === 'function') _gothicPickers.push({ picker, close: closeFn });
}
document.addEventListener('click', e => {
    for (const { picker, close } of _gothicPickers) {
        if (!picker.contains(e.target)) close();
    }
}, { passive: true });

function initGroupPicker() {
    const picker  = document.getElementById('grp-picker');
    const trigger = document.getElementById('grp-trigger');
    const list    = document.getElementById('grp-list');
    if (!picker || !trigger || !list) return;
    const extraFields = document.getElementById('extra-fields');
    let isOpen = false;

    function openPicker() {
        if (isOpen) return;
        isOpen = true;
        const rect = trigger.getBoundingClientRect();
        const listH = Math.min(224, 80 + state.groups.length * 40);
        const spaceBelow = window.innerHeight - rect.bottom;
        picker.classList.toggle('open-up', spaceBelow < listH && rect.top > listH);
        picker.classList.add('open');
        extraFields && extraFields.classList.add('dropdown-open');
        trigger.setAttribute('aria-expanded', 'true');
        list.setAttribute('aria-hidden', 'false');
    }
    function closePicker() {
        if (!isOpen) return;
        isOpen = false;
        picker.classList.remove('open', 'open-up');
        extraFields && extraFields.classList.remove('dropdown-open');
        trigger.setAttribute('aria-expanded', 'false');
        list.setAttribute('aria-hidden', 'true');
    }
    window._closeGroupPicker = closePicker; // selectGroupChip closes after a pick

    trigger.addEventListener('click', e => { e.stopPropagation(); isOpen ? closePicker() : openPicker(); });
    trigger.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closePicker(); return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? closePicker() : openPicker(); }
    });
    registerGothicPicker(picker, closePicker);   // G4-6: unified outside-click
}

// ---- Archive ----
// ---- Selection state ----
let selectMode = false;
const selectedArchiveIds = new Set();

// Main list bulk-select state (mirrors archive selectMode)
let mainSelectMode = false;
const selectedTaskIds = new Set();

function renderArchive() {
    archiveList.innerHTML = '';
    const items = [...state.archive].reverse();
    const archiveBtns    = document.getElementById('archive-btns');
    const clearBtn       = document.getElementById('btn-clear-archive');
    const selectBar      = document.getElementById('archive-select-bar');
    const searchWrap     = document.querySelector('.archive-search-wrap');

    if (!items.length) {
        archiveEmpty.style.display = 'flex';
        if (archiveBtns) archiveBtns.style.display = 'none';
        if (clearBtn)    clearBtn.style.display    = 'none';
        if (selectBar)   { selectBar.style.display = 'none'; selectMode = false; selectedArchiveIds.clear(); }
        // P2: nothing to search → collapse the search row smoothly, drop any stale query.
        if (searchWrap) searchWrap.classList.add('is-hidden');
        if (archiveSearchQuery) {
            archiveSearchQuery = '';
            const sb = document.getElementById('archive-search-box');
            if (sb) sb.value = '';
        }
        // (archive stats removed)
        return;
    }

    archiveEmpty.style.display = 'none';
    if (archiveBtns) archiveBtns.style.display = 'flex';
    if (clearBtn)    clearBtn.style.display    = 'flex';
    if (searchWrap)  searchWrap.classList.remove('is-hidden');

    // Render statistics
    const now7  = Date.now() - 7  * 86400000;
    const now30 = Date.now() - 30 * 86400000;
    const last7  = items.filter(i => (i.archivedAt || 0) >= now7).length;
    const last30 = items.filter(i => (i.archivedAt || 0) >= now30).length;
    // (archive stats removed)

    // Extension 11: group items by YYYY-MM
    const monthGroups = new Map(); // key: 'YYYY-MM' → array of items
    items.forEach(item => {
        const d = item.archivedAt ? new Date(item.archivedAt) : new Date();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthGroups.has(key)) monthGroups.set(key, []);
        monthGroups.get(key).push(item);
    });

    const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                        'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

    monthGroups.forEach((groupItems, key) => {
        const [year, month] = key.split('-').map(Number);
        const isCurrentYear = year === new Date().getFullYear();
        const heading = `${monthNames[month - 1]}${isCurrentYear ? '' : ' ' + year}`;
        const colKey  = 'archMonth_' + key;
        const isOpen  = localStorage.getItem(colKey) !== '0'; // default open

        // Month section header
        const section = document.createElement('div');
        section.className = 'archive-month-section' + (isOpen ? '' : ' collapsed');
        section.dataset.monthKey = key;

        const header = document.createElement('button');
        header.className = 'archive-month-header';
        header.innerHTML = `
            <span class="archive-month-name">${heading}</span>
            <span class="archive-month-count">${groupItems.length}</span>
            <svg class="archive-month-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="2" x2="12" y2="17"/>
                <path d="M9 5L12 2L15 5"/>
                <line x1="10" y1="14" x2="14" y2="14"/>
                <path d="M11 17L10 20H14L13 17"/>
                <circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none"/>
            </svg>`;
        header.addEventListener('click', () => {
            const c = section.classList.toggle('collapsed');
            localStorage.setItem(colKey, c ? '0' : '1');
        });
        section.appendChild(header);

        const body = document.createElement('ul');
        body.className = 'archive-month-body';

        groupItems.forEach(item => {
            const li = document.createElement('li');
            const isSelected = selectedArchiveIds.has(item.id);
            li.className = 'task-item archive-item'
                + (item.checked ? ' checked' : '')
                + (selectMode   ? ' select-mode' : '')
                + (isSelected   ? ' arc-selected' : '');
            li.dataset.id = item.id;
            li.dataset.prio = item.priority || 'none';
            // D-2: цвет-метка в архиве — тот же левый акцент, что и в основном списке.
            if (item.color) li.style.setProperty('--task-color', _grimInk(item.color));  // #2: контраст-safe
            // D-2: подсветка архивного поиска + линкификация заметок (паритет с основным списком).
            const hl = s => archiveSearchQuery ? highlightSearch(escHtml(s || ''), archiveSearchQuery) : escHtml(s || '');
            const noteHtml = item.note
                ? (archiveSearchQuery ? highlightSearch(escHtml(item.note), archiveSearchQuery) : linkifyNote(item.note))
                : '';

            const dlHtml = item.deadline ? `<span class="meta-tag">${formatDeadlineAbsolute(item.deadline, true)}</span>` : '';
            const groupColor = item.originalGroupColor || getGroupColor(item.groupId);
            const groupHtml = item.originalGroupName
                ? `<span class="meta-tag group-tag" style="color:${groupColor}">◈ ${escHtml(item.originalGroupName)}</span>` : '';
            const rptHtml   = (item.repeat && item.repeat !== 'none')
                ? `<span class="meta-tag repeat-tag">${IC.ouroboros}<span>${repeatLabel(item.repeat)}</span></span>` : '';
            const date = new Date(item.archivedAt).toLocaleDateString('ru', { day:'numeric', month:'short' });

            const subs = item.subtasks || [];
            const subsHtml = subs.length ? `
                <div class="archive-subs">
                    ${subs.map(s => `
                      <div class="archive-sub${s.checked ? ' checked' : ''}">
                        <span class="archive-sub-check">${subCoffinSVG(s.checked)}</span>
                        <span class="archive-sub-text">${hl(s.text)}</span>
                      </div>`).join('')}
                </div>` : '';

            const selectIndicator = selectMode
                ? `<div class="arc-select-indicator">${isSelected ? IC.runeCircleChecked : IC.runeCircle}</div>` : '';

            const actions = selectMode ? '' : `
                <div class="task-actions archive-actions">
                    <button class="btn-task-action restore-btn" onclick="restoreTask(${item.id})" title="Восстановить">${IC.restore}</button>
                    <button class="btn-task-action danger" onclick="deleteFromArchive(${item.id})" title="Удалить навсегда">${IC.skull}</button>
                </div>`;

            li.innerHTML = `
                ${selectIndicator}
                <div class="task-check arch-check">${coffinSVG(18, item.checked, false)}</div>
                <div class="task-content">
                    <span class="task-text">${hl(item.text)}</span>
                    <div class="task-meta">${groupHtml}${dlHtml}${rptHtml}<span class="meta-tag muted-tag">${date}</span></div>
                    ${item.note ? `<div class="task-note-wrapper visible"><div class="task-note-inner"><div class="task-note-text">${noteHtml}</div></div></div>` : ''}
                    ${subsHtml}
                </div>
                ${actions}`;

            if (selectMode) li.addEventListener('click', () => toggleArchiveSelection(item.id));
            body.appendChild(li);
        });

        section.appendChild(body);
        archiveList.appendChild(section);
    });

    // Apply archive search filter if active
    if (archiveSearchQuery) _applyArchiveSearch();
}

function toggleSelectMode() {
    selectMode = !selectMode;
    selectedArchiveIds.clear();
    const btn  = document.getElementById('btn-select-mode');
    const bar  = document.getElementById('archive-select-bar');
    if (btn) btn.classList.toggle('active', selectMode);
    if (bar) bar.style.display = selectMode ? 'flex' : 'none';
    updateSelectBar();
    renderArchive();
}

function toggleArchiveSelection(id) {
    if (selectedArchiveIds.has(id)) selectedArchiveIds.delete(id);
    else selectedArchiveIds.add(id);
    updateSelectBar();
    // Items are nested inside month sections — search whole archiveList
    const li = archiveList.querySelector(`.archive-item[data-id="${id}"]`);
    if (li) {
        const isSelected = selectedArchiveIds.has(id);
        li.classList.toggle('arc-selected', isSelected);
        const indicator = li.querySelector('.arc-select-indicator');
        if (indicator) indicator.innerHTML = isSelected
            ? IC.runeCircleChecked
            : IC.runeCircle;
    }
}

function updateSelectBar() {
    const count   = selectedArchiveIds.size;
    const countEl = document.getElementById('select-bar-count');
    const restBtn = document.getElementById('btn-restore-selected');
    if (countEl) {
        countEl.textContent = count > 0 ? `${count} отмечено` : 'Ничего не отмечено';
    }
    if (restBtn) restBtn.disabled = count === 0;
}

function restoreSelected() {
    if (!selectedArchiveIds.size) return;
    pushUndo();
    const ids = [...selectedArchiveIds];
    ids.forEach(id => {
        const item = state.archive.find(a => a.id === id);
        if (!item) return;
        state.tasks.push(taskFromArchive(item));
        _newTaskIds.add(item.id);
    });
    state.archive = state.archive.filter(a => !selectedArchiveIds.has(a.id));
    selectedArchiveIds.clear();
    selectMode = false;
    saveState(); render();
    updateArchiveBadge(); renderArchive();
    showToast(`Восстановлено: ${ids.length}`);
    setTimeout(() => switchPage('main'), 300);
}

function restoreAll() {
    if (!state.archive.length) return;
    pushUndo();
    state.archive.forEach(item => {
        state.tasks.push(taskFromArchive(item));
        _newTaskIds.add(item.id); // IMP-1: restored tasks get entrance animation
    });
    state.archive = [];
    saveState(); render();
    updateArchiveBadge(); renderArchive();
    showToast('Все задачи восстановлены');
    setTimeout(() => switchPage('main'), 300);
}

function updateArchiveBadge() {
    const n    = state.archive.length;
    const prev = parseInt(archiveBadge.textContent) || 0;

    archiveBadge.textContent     = n;
    archiveBadge.style.display   = n > 0 ? 'inline-flex' : 'none';

    // Spring bounce when archive grows (a new item arrived)
    if (!prefersReducedMotion() && n > prev && n > 0) {
        archiveBadge.classList.remove('popping');
        void archiveBadge.offsetWidth; // reflow
        archiveBadge.classList.add('popping');
        archiveBadge.addEventListener('animationend',
            () => archiveBadge.classList.remove('popping'),
            { once: true }
        );
    }
}
function getGroupColor(id) { const g = state.groups.find(g => g.id === id); return g ? g.color : '#9090cc'; }

// C-1: build an active task from an archived item, preserving ALL fields
// (color, pinned, repeatAnchor*, subNotesAlwaysOpen, …). Resets completion +
// cycle state and reassigns order. Single source of truth for archive→task so
// restoreTask / restoreAll / restoreSelected never drop fields again.
function taskFromArchive(item) {
    let groupId = item.groupId;
    if (groupId && !state.groups.find(g => g.id === groupId)) groupId = null;
    // Strip archive-only metadata; keep everything else verbatim.
    const { archivedAt, originalGroupName, originalGroupColor, ...rest } = item;
    return {
        ...rest,
        groupId,
        checked:      false,
        cycleChecked: false,
        nextReset:    null,
        noteOpen:     false,
        order:        state.tasks.length,
        subtasksOpen: true,
        subtasks: JSON.parse(JSON.stringify(item.subtasks || [])).map(s => ({
            ...s, cycleChecked: false, nextReset: null,
        })),
    };
}

// ============================================================
//  TASK ELEMENT FACTORY
// ============================================================
function createTaskEl(task, showDlSide) {
    const li = document.createElement('li');
    let cls = 'task-item';
    if (task.checked)      cls += ' checked';
    if (task.cycleChecked) cls += ' cycle-checked';
    if (showDlSide && task.deadline) cls += ' has-dl-side';
    // IMP-1: only animate tasks that were just added/restored — not all tasks on every render
    if (_newTaskIds.has(task.id)) {
        cls += ' entering';
        _newTaskIds.delete(task.id);
    }
    if (task.pinned) cls += ' pinned';
    li.className = cls;
    li.dataset.id    = task.id;
    li.dataset.prio  = task.priority || 'none';
    li.dataset.hasDl = task.deadline ? '1' : '0';
    // #2 (порт _grimInk): цвет-метку рисуем контраст-безопасным «ink» — тёмный кастомный
    // цвет иначе невидим на near-black. В стейте task.color остаётся сырым; инкается только показ.
    const taskInk = task.color ? _grimInk(task.color) : null;
    if (taskInk) li.style.setProperty('--task-color', taskInk);

    // ── Left deadline panel (schedule mode) ──
    let dlSideHtml = '';
    if (showDlSide && task.deadline) {
        const status    = deadlineStatus(task.deadline);
        const countdown = formatDeadlineCountdown(task.deadline);
        const absolute  = formatDeadlineAbsolute(task.deadline, true);  // bare: real date, no 'завтра' overlap
        const statusCls = status ? ` dl-side-${status}` : '';
        const cdHtml    = countdown ? `<span class="dl-side-countdown">${countdown}</span>` : '';
        dlSideHtml = `<div class="dl-side-panel${statusCls}">${cdHtml}<span class="dl-side-date">${absolute}</span></div>`;
    }

    // ── Deadline badge (meta row — hidden in schedule mode if side panel shown) ──
    let deadlineHtml = '';
    if (task.deadline && !showDlSide) {
        const status    = deadlineStatus(task.deadline);
        const countdown = formatDeadlineCountdown(task.deadline);
        const absolute  = formatDeadlineAbsolute(task.deadline, true);
        let tc = 'meta-tag deadline-tag';
        if (status === 'over')          tc += ' over';
        else if (status === 'live')     tc += ' live';
        else if (status === 'critical') tc += ' critical';
        else if (status === 'urgent')   tc += ' urgent';
        else if (status === 'warn')     tc += ' warn';
        const cdHtml = countdown ? `<span class="dl-countdown">${countdown}</span><span class="dl-sep">·</span>` : '';
        deadlineHtml = `<span class="meta-tag-wrap"><span class="${tc}" role="button" tabindex="0" title="Изменить дедлайн" onclick="openDeadlineModal(${task.id});event.stopPropagation();" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDeadlineModal(${task.id});}">${IC.window}<span class="dl-badge-inner">${cdHtml}<span class="dl-absolute">${absolute}</span></span></span><button class="btn-tag-clear" onclick="clearTaskDeadline(${task.id});event.stopPropagation();" title="Убрать дедлайн">${IC.crossedSwords}</button></span>`;
    }

    // ── Repeat badge ──
    const rptAnchorLabel = getRepeatAnchorLabel(task.repeat, task.repeatAnchorTime, task.repeatAnchorDay, task.repeatAnchorMonthday);
    const rptHtml = (task.repeat && task.repeat !== 'none')
        ? `<span class="meta-tag-wrap"><span class="meta-tag repeat-tag" role="button" tabindex="0" title="Изменить повтор" onclick="openRepeatModal(${task.id});event.stopPropagation();" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openRepeatModal(${task.id});}">${IC.ouroboros}<span>${repeatLabel(task.repeat)}${rptAnchorLabel ? ` · ${rptAnchorLabel}` : ''}</span></span><button class="btn-tag-clear" onclick="clearTaskRepeat(${task.id});event.stopPropagation();" title="Убрать повтор">${IC.crossedSwords}</button></span>` : '';

    // ── Note controls ──
    const hasNote = task.note && task.note.trim();
    // Single meta toggle (reads live DOM state): has note → show/hide the panel
    // (persisted in noteOpen); no note → open the panel straight into inline edit.
    const noteToggle = `<button class="btn-note-toggle${(hasNote && task.noteOpen) ? ' open' : ''}" id="note-toggle-${task.id}" onmousedown="event.preventDefault()" onclick="toggleTaskNote(${task.id})" title="${hasNote ? (task.noteOpen ? 'Скрыть заметку' : 'Показать заметку') : 'Добавить заметку'}">${IC.sword}<span>заметка</span></button>`;

    // ── Subtask toggle + always-show-notes button ──
    const subs    = task.subtasks || [];
    const sDone   = subs.filter(s => s.checked || s.cycleChecked).length;
    const subLbl  = subs.length ? ` ${sDone}/${subs.length}` : '';
    const subToggle = `<button class="btn-subtask-toggle${task.subtasksOpen ? ' open' : ''}" data-tid="${task.id}" onclick="toggleSubtasksSection(${task.id})" title="Подпункты">${IC.sword}<span>подпункты${subLbl}</span></button>`;
    // Always-show-notes button: only rendered when there are subtasks that have notes
    const hasSubNotes = subs.some(s => s.note && s.note.trim());
    const subNotesAlwaysBtn = (subs.length > 0 && hasSubNotes)
        ? `<button class="btn-sub-notes-always${task.subNotesAlwaysOpen ? ' active' : ''}" data-tid="${task.id}" onclick="toggleSubNotesAlwaysOpen(${task.id})" title="${task.subNotesAlwaysOpen ? 'Скрыть все заметки' : 'Показать все заметки подпунктов'}">${IC.gothEye}</button>`
        : '';

    const displayText = highlightHashtags(
        searchQuery ? highlightSearch(escHtml(task.text), searchQuery) : escHtml(task.text)
    );

    // ── Coffin checkbox ──
    // FIX: cycleChecked state gets its own distinct icon (coffin + return-arc)
    // instead of the generic purple-tinted coffin — immediately reads as "cyclic done".
    const checkEl = task.cycleChecked
        ? cycleCoffinSVG(21)
        : coffinSVG(21, task.checked, false);

    // ── Persistent cycle-until label (shown while task is cycle-complete) ──
    // Stays in the UI until the next cycle reset; does NOT disappear like a toast.
    // Uses the project's purple/violet palette — no green.
    const cycleUntilHtml = (task.cycleChecked && task.repeat && task.repeat !== 'none')
        ? `<span class="meta-tag cycle-until-tag">${IC.cycleReturn}<span>${formatCycleUntil(task)}</span></span>`
        : '';

    // ── Note "full editor" button (task-action) ──
    // Secondary path: opens the modal textarea for comfortable long-note editing.
    // Inline editing lives in the panel itself (primary path).
    const addNoteBtn = `<button class="btn-task-action${hasNote ? ' edit-note-btn' : ''}" id="note-modal-btn-${task.id}" onclick="${hasNote ? `openEditNoteModal(${task.id})` : `openNoteModal(${task.id})`}" title="${hasNote ? 'Изменить заметку в окне' : 'Заметка в окне'}">${hasNote ? IC.editNote : IC.addNote}</button>`;

    // ── Subtasks section ──
    const subtaskSearchHit = searchQuery && task.subtasks && task.subtasks.some(
        s => s.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const subsHtml = buildSubtaskSection(task, subtaskSearchHit ? true : undefined);

    // Accessible label for coffin checkbox varies by state
    const checkLabel = task.cycleChecked
        ? `Цикл завершён · ${formatCycleUntil(task)} — нажмите чтобы отменить`
        : task.checked
            ? `Отмечено как выполненное: ${task.text} — нажмите чтобы снять отметку`
            : `Отметить как выполненное: ${task.text}`;

    // Pinned mark — forged spike in the top-left corner (active pins only).
    const pinSpike = (task.pinned && !task.checked && !task.cycleChecked)
        ? `<span class="pin-spike" aria-hidden="true">${IC.pinSpike}</span>` : '';

    li.innerHTML = `
        ${pinSpike}
        ${dlSideHtml}
        ${mainSelectMode ? `<span class="task-select-checkbox${selectedTaskIds.has(task.id) ? ' selected' : ''}"
            aria-hidden="true">
            ${selectedTaskIds.has(task.id) ? IC.selectChecked : IC.selectEmpty}
        </span>` : ''}
        <div class="task-check-col">
            <button class="task-check${task.cycleChecked ? ' cycle-check' : ''}"
                    type="button"
                    onclick="toggleCheck(${task.id})"
                    role="checkbox"
                    aria-checked="${task.checked || task.cycleChecked ? 'true' : 'false'}"
                    aria-label="${escHtml(checkLabel)}"
                    title="${task.cycleChecked ? 'Нажмите, чтобы отменить · ' + escHtml(formatCycleUntil(task)) : task.checked ? 'Снять отметку' : 'Отметить выполненным'}"
                    >${checkEl}</button>
            <div class="drag-handle" aria-hidden="true">${IC.drag}</div>
        </div>
        <div class="task-content">
            <div class="task-head">
                <span class="task-text" data-id="${task.id}" spellcheck="false" title="Двойной клик — редактировать" ondblclick="startInlineEdit(event, ${task.id})">${displayText}</span>
                <div class="task-actions">
                    <button class="btn-task-action btn-pin${task.pinned ? ' active' : ''}" onclick="togglePin(${task.id})" title="${task.pinned ? 'Открепить' : 'Закрепить задачу'}">${IC.pin}</button>
                    <button class="btn-task-action btn-task-color" onclick="openTaskColorModal(${task.id})" title="Цветовая метка" style="${task.color ? `color:${taskInk}` : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 3L18 8L18 17L12 21L6 17L6 8Z" ${task.color ? `fill="${taskInk}" opacity="0.9"` : 'fill="none"'}/>
                            <line x1="12" y1="3" x2="12" y2="21" stroke-width="1" opacity="0.35"/>
                            <line x1="6" y1="8" x2="18" y2="8" stroke-width="1" opacity="0.35"/>
                            ${task.color ? '' : '<circle cx="12" cy="10.5" r="1.3" fill="currentColor" stroke="none" opacity="0.55"/>'}
                        </svg>
                    </button>
                    <button class="btn-task-action" onclick="openDeadlineModal(${task.id})" title="Дедлайн">${IC.window}</button>
                    ${task.deadline ? `<button class="btn-task-action btn-snooze" onclick="openSnoozeMenu(event, ${task.id})" title="Отложить дедлайн">${IC.snooze}</button>` : ''}
                    <button class="btn-task-action" onclick="openRepeatModal(${task.id})" title="Повтор">${IC.ouroboros}</button>
                    <button class="btn-task-action" onclick="openPrioModal(${task.id})" title="Приоритет">${IC.spires}</button>
                    ${addNoteBtn}
                    <button class="btn-task-action btn-task-more" onclick="openTaskMoreMenu(event, ${task.id})" title="Ещё действия" aria-haspopup="menu">${IC.more}</button>
                    <button class="btn-task-action archive-btn" onclick="removeTask(${task.id})" title="В архив">${IC.archive}</button>
                    <button class="btn-task-action danger" onclick="deleteTaskForever(${task.id})" title="Удалить навсегда">${IC.skull}</button>
                </div>
            </div>
            <div class="task-meta">${deadlineHtml}${rptHtml}${cycleUntilHtml}${noteToggle}${subToggle}${subNotesAlwaysBtn}</div>
            <div class="task-note-wrapper${(hasNote && task.noteOpen) ? ' visible' : ''}${hasNote ? ' has-note' : ''}" id="note-wrapper-${task.id}">
                <div class="task-note-inner">
                    <div class="task-note-text" id="note-${task.id}"
                         spellcheck="false" data-placeholder="начертайте примечание…"
                         aria-label="Заметка задачи"
                         ondblclick="_taskNoteEdit(this)"
                         oninput="_taskNoteInput(this)"
                         onkeydown="_taskNoteKeydown(event,this)"
                         onblur="_taskNoteCommit(this)"
                         title="Двойной клик — редактировать">${hasNote ? noteDisplayHTML(task.note) : ''}</div>
                </div>
                <button class="btn-note-delete" id="note-del-${task.id}" onclick="_taskNoteDelete(event, ${task.id})" title="Удалить заметку"${hasNote ? '' : ' style="display:none"'}>${IC.dagger}</button>
            </div>
            ${subsHtml}
        </div>`;

    // FIX-3: In mainSelectMode, clicking free space (outside actions/check/drag) toggles selection
    if (mainSelectMode) {
        li.addEventListener('click', e => {
            if (e.target.closest('.task-actions, .task-check-col, [contenteditable="true"], .inline-note-input, .btn-note-delete, .sub-check, .sub-prio-btn, .sub-actions')) return;
            toggleMainSelectTask(task.id);
        });
    }
    return li;
}

// ============================================================
//  SUBTASK SECTION BUILDER
// ============================================================
const SUB_PRIO = { high: 0, medium: 1, low: 2, none: 3 };

function sortSubtasks(subs) {
    return [...subs].sort((a, b) => {
        // Completion group: active (0) → cycle-checked done (1) → permanently checked (2)
        const doneA = a.checked ? 2 : (a.cycleChecked && a.repeat && a.repeat !== 'none') ? 1 : 0;
        const doneB = b.checked ? 2 : (b.cycleChecked && b.repeat && b.repeat !== 'none') ? 1 : 0;
        if (doneA !== doneB) return doneA - doneB;
        // Within same completion group: priority first, then stable creation/DnD order
        const pd = (SUB_PRIO[a.priority] ?? 3) - (SUB_PRIO[b.priority] ?? 3);
        if (pd !== 0) return pd;
        return (a.order ?? a.id) - (b.order ?? b.id);
    });
}

function buildSubtaskSection(task, forceOpen) {
    const subs   = sortSubtasks(task.subtasks || []);
    const isOpen = forceOpen !== undefined ? forceOpen : task.subtasksOpen;
    const sDone  = subs.filter(s => s.checked || s.cycleChecked).length;
    const sTotal = subs.length;
    const pct    = sTotal ? Math.round(sDone / sTotal * 100) : 0;

    const progressHtml = sTotal > 0 ? `
        <div class="sub-progress-bar-wrap">
            <div class="sub-progress-bar-track">
                <div class="sub-progress-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="sub-progress-label">${sDone}/${sTotal}</span>
        </div>` : '';

    // Problem 1: if group-split mode is on, split subtasks into active/done zones
    const { html: subsListHtml, splitMode } = _buildSubListContent(task);
    const splitUlExtra = splitMode ? ' sub-split-mode' : '';

    return `
    <div class="subtask-section${isOpen ? ' open' : ''}${task.subNotesAlwaysOpen ? ' notes-always-open' : ''}" id="sub-section-${task.id}">
        <div class="sub-section-inner">
            ${progressHtml}
            <ul class="subtask-list${splitUlExtra}" id="sub-list-${task.id}">
                ${subsListHtml}
            </ul>
            <div class="subtask-add-row">
                <input class="subtask-add-input" id="sub-input-${task.id}"
                       placeholder="Новый подпункт..." autocomplete="off" maxlength="200"
                       onkeydown="handleSubAdd(event, ${task.id})">
                <button class="btn-subtask-confirm" onclick="addSubtask(${task.id})" title="Добавить">
                    ${IC.crossSm}
                </button>
            </div>
        </div>
    </div>`;
}

// ── Builds the inner HTML of a task's subtask UL (problem 6) ──────────────────
// Single source of truth used by both buildSubtaskSection (full render) and
// renderSubList (incremental rebuild). Returns the markup + whether split-mode
// markup was produced, so the caller can set the matching UL class.
function _buildSubListContent(task) {
    const subs   = sortSubtasks(task.subtasks || []);
    const sTotal = subs.length;

    if (isGroupSplitMode && sTotal > 0) {
        const active = subs.filter(s => !s.checked && !s.cycleChecked);
        const done   = subs.filter(s =>  s.checked ||  s.cycleChecked);
        const doneKey   = 'subSplit_done_'   + task.id;
        const activeKey = 'subSplit_active_' + task.id;
        const doneCollapsed   = localStorage.getItem(doneKey)   === '1';
        const activeCollapsed = localStorage.getItem(activeKey) === '1';

        const activeHtml = active.map(s => buildSubtaskItemHTML(task.id, s)).join('');
        const doneHtml   = done.map(s =>   buildSubtaskItemHTML(task.id, s)).join('');

        const chevronSvg = `<svg class="sub-split-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="10" height="10">
            <line x1="12" y1="2" x2="12" y2="17"/>
            <path d="M9 5L12 2L15 5"/>
            <line x1="10" y1="14" x2="14" y2="14"/>
            <path d="M11 17L10 20H14L13 17"/>
            <circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none"/>
        </svg>`;

        const activeSection = active.length > 0 ? `
            <li class="sub-split-active-header${activeCollapsed ? ' collapsed' : ''}"
                onclick="toggleSubSplitActive(this,'${activeKey}')">
                ${IC.sword}<span>Активные · ${active.length}</span>${chevronSvg}
            </li>
            <li class="sub-split-active-wrap${activeCollapsed ? ' collapsed' : ''}" style="list-style:none;padding:0;margin:0;">
                <ul class="sub-split-inner">${activeHtml}</ul>
            </li>` : '';

        const doneSection = done.length > 0 ? `
            <li class="sub-split-done-header${doneCollapsed ? ' collapsed' : ''}"
                onclick="toggleSubSplitDone(this,'${doneKey}')">
                ${IC.sword}<span>Выполненные · ${done.length}</span>${chevronSvg}
            </li>
            <li class="sub-split-done-wrap${doneCollapsed ? ' collapsed' : ''}" style="list-style:none;padding:0;margin:0;">
                <ul class="sub-split-inner">${doneHtml}</ul>
            </li>` : '';

        return { html: activeSection + doneSection, splitMode: true };
    }

    return { html: subs.map(s => buildSubtaskItemHTML(task.id, s)).join(''), splitMode: false };
}

// ── Rebuilds one task's subtask UL in place (problem 6) ───────────────────────
// Works for BOTH normal (2-column grid) and split (active/done zones) modes,
// keeping the surrounding section (progress bar, add-row, open state) intact.
// Always re-inits the correct Sortable instances afterwards so DnD keeps working.
function renderSubList(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    const ul   = document.getElementById(`sub-list-${taskId}`);
    if (!task || !ul) return;
    const { html, splitMode } = _buildSubListContent(task);
    ul.className = 'subtask-list' + (splitMode ? ' sub-split-mode' : '');
    ul.innerHTML = html;
    initSubSortable(taskId);
    updateSubProgressBar(taskId);
    updateSubToggleBtn(taskId);
}

function buildSubtaskItemHTML(taskId, s) {
    const isCycleChecked = s.cycleChecked && s.repeat && s.repeat !== 'none';
    const isChecked = s.checked; // cycle-checked is a separate state — never add .checked class
    const subCheckLabel = isChecked || isCycleChecked
        ? `Подпункт выполнен: ${s.text} — снять отметку`
        : `Отметить подпункт: ${s.text}`;
    const subDisplayText = searchQuery
        ? highlightSearch(escHtml(s.text), searchQuery)
        : escHtml(s.text);
    // Checkbox icon: cycle-checked = return-coffin, checked = filled coffin, default = empty
    const subCheckIcon = isCycleChecked
        ? cycleCoffinSVG(14)
        : subCoffinSVG(s.checked);
    // Repeat button: ouroboros icon, opens shared repeat-modal, active when repeat is set
    const repeatSet = s.repeat && s.repeat !== 'none';
    const subAnchorLabel = getRepeatAnchorLabel(s.repeat, s.repeatAnchorTime, s.repeatAnchorDay, s.repeatAnchorMonthday);
    const subRepeatTitle = repeatSet
        ? `Повтор: ${repeatLabel(s.repeat)}${subAnchorLabel ? ` · ${subAnchorLabel}` : ''} — нажмите чтобы изменить`
        : 'Назначить повтор';
    const subRepeatBtn = `<button type="button" class="btn-sub-action sub-repeat-btn${repeatSet ? ' active' : ''}" onclick="openSubRepeatModal(${taskId},${s.id})" title="${subRepeatTitle}">${IC.ouroboros}</button>`;
    // Note wrapper: .has-note marks an existing note (hover/always-open reveal it);
    // .note-open is the live "expanded" state driven by the unified note system.
    const noteWrapClass = s.note ? 'has-note' : '';
    // P-E: subtask deadline. Reuses the task deadline helpers (all take a dl object).
    // When set: an always-visible status icon sits in the row (click = edit, colour/pulse =
    // status, tooltip = full date) and a countdown pill reveals on hover below the row
    // (same grid-rows reveal family as the note). When unset: a muted "set" button lives
    // in .sub-actions (hover-revealed like the repeat/priority controls).
    const subDl       = s.deadline || null;
    // Completed subtasks show a dormant (neutral) badge — no alarming colour/pulse,
    // matching how tasks suppress deadline status once checked/cycle-checked.
    const subDlDormant = isChecked || isCycleChecked;
    const subDlStatus = (subDl && !subDlDormant) ? deadlineStatus(subDl) : null;
    const subDlAbs    = subDl ? formatDeadlineAbsolute(subDl, true) : '';
    const subDlCd     = subDl ? formatDeadlineCountdown(subDl) : '';
    const subDlStatusCls = subDlStatus ? ` sub-dl-${subDlStatus}` : '';
    const subDlBadge = subDl
        ? `<button type="button" class="sub-deadline-badge${subDlStatusCls}" onclick="openSubDeadlineModal(${taskId},${s.id})" title="${escHtml(subDlAbs)}" aria-label="Дедлайн подпункта: ${escHtml(subDlAbs)} — изменить">${IC.window}</button>`
        : '';
    const subDlSetBtn = subDl
        ? ''
        : `<button type="button" class="btn-sub-action sub-deadline-btn" onclick="openSubDeadlineModal(${taskId},${s.id})" title="Назначить дедлайн">${IC.window}</button>`;
    const subDlWrap = subDl
        ? `<div class="sub-deadline-wrapper${subDlStatusCls}" id="subdl-${taskId}-${s.id}">
            <div class="sub-deadline-inner">
                <span class="sub-dl-pill" role="button" tabindex="0" title="Изменить дедлайн"
                      onclick="openSubDeadlineModal(${taskId},${s.id})"
                      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openSubDeadlineModal(${taskId},${s.id});}">
                    ${subDlCd ? `<span class="sub-dl-countdown">${subDlCd}</span><span class="sub-dl-sep">·</span>` : ''}
                    <span class="sub-dl-date">${escHtml(subDlAbs)}</span>
                    <button type="button" class="sub-dl-clear" onclick="event.stopPropagation();clearSubDeadline(${taskId},${s.id})" title="Снять дедлайн" aria-label="Снять дедлайн">${IC.crossedSwords}</button>
                </span>
            </div>
        </div>`
        : '';
    return `<li class="subtask-item${isChecked ? ' checked' : ''}${isCycleChecked ? ' cycle-checked' : ''}"
               data-tid="${taskId}" data-sid="${s.id}" data-sprio="${s.priority || 'none'}">
        <div class="sub-main-row">
            <div class="sub-drag-handle" aria-hidden="true">${IC.drag}</div>
            <button type="button" class="sub-check"
                    onclick="toggleSubtask(${taskId},${s.id})"
                    role="checkbox"
                    aria-checked="${(isChecked || isCycleChecked) ? 'true' : 'false'}"
                    aria-label="${escHtml(subCheckLabel)}"
                    >${subCheckIcon}</button>
            <span class="sub-text" spellcheck="false" title="Двойной клик — редактировать" ondblclick="startSubEdit(event,${taskId},${s.id})">${subDisplayText}</span>
            ${subDlBadge}
            <div class="sub-actions">
                <button type="button" class="btn-sub-action sub-prio-btn" onclick="cycleSubPriority(${taskId},${s.id})" title="Приоритет подпункта"><div class="sub-prio-dot"></div></button>
                ${subRepeatBtn}
                ${subDlSetBtn}
                <button type="button" class="btn-sub-action btn-sub-note-toggle${s.note ? ' has-note' : ''}" onpointerdown="event.preventDefault()" onclick="toggleSubNote(${taskId},${s.id})" title="${s.note ? 'Редактировать заметку' : 'Добавить заметку'}">${s.note ? IC.editNote : IC.addNote}</button>
                <button type="button" class="btn-sub-action" onclick="promoteSubtask(${taskId},${s.id})" title="Сделать самостоятельной задачей">${IC.promote}</button>
                <button type="button" class="btn-sub-action danger" onclick="deleteSubtask(${taskId},${s.id})" title="Удалить подпункт">${IC.skull}</button>
            </div>
        </div>
        ${subDlWrap}
        <div class="sub-note-wrapper ${noteWrapClass}" id="subnote-${taskId}-${s.id}">
            <div class="sub-note-inner">
                <div class="sub-note-text" id="subnote-text-${taskId}-${s.id}"
                     spellcheck="false" data-placeholder="начертайте примечание…"
                     aria-label="Заметка подпункта"
                     ondblclick="_noteEdit(this)"
                     oninput="_noteInput(this)"
                     onkeydown="_noteKeydown(event,this)"
                     onblur="_noteCommit(this)"
                    >${s.note ? noteDisplayHTML(s.note) : ''}</div>
                ${s.note ? `<button type="button" class="btn-sub-note-delete" onclick="_noteDeleteClick(event,this.parentElement.querySelector('.sub-note-text'))" title="Удалить заметку">${IC.dagger}</button>` : ''}
            </div>
        </div>
    </li>`;
}

// ============================================================
//  FORM SUBTASKS (subtasks added before task is created)
// ============================================================
let formSubtasks = []; // [{text, priority, note, repeat, repeatAnchorTime, repeatAnchorDay, repeatAnchorMonthday}]

// P5: form-level "pin the new task" flag — applied to the task created by addTask().
let formPinned = false;
function toggleFormPin() {
    formPinned = !formPinned;
    const btn = document.getElementById('form-pin-toggle');
    if (btn) {
        btn.classList.toggle('active', formPinned);
        btn.setAttribute('aria-pressed', formPinned ? 'true' : 'false');
    }
}
function _resetFormPin() {
    formPinned = false;
    const btn = document.getElementById('form-pin-toggle');
    if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
}

function addFormSubtask() {
    const input = document.getElementById('form-sub-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); return; }
    formSubtasks.push({
        text, checked: false,
        priority: 'none', note: '',
        repeat: 'none', repeatAnchorTime: null, repeatAnchorDay: null, repeatAnchorMonthday: null,
    });
    input.value = '';
    renderFormSubtasks();
    // Problem 5: animate the freshly added form-subtask in (same motion as the
    // inline subtask list).
    if (!prefersReducedMotion()) {
        const newEl = document.querySelector(`#form-sub-list .subtask-item[data-form-sub-idx="${formSubtasks.length - 1}"]`);
        if (newEl) {
            newEl.classList.add('sub-adding');
            newEl.addEventListener('animationend', () => newEl.classList.remove('sub-adding'), { once: true });
        }
    }
    input.focus();
}

function removeFormSubtask(idx) {
    const commit = () => { formSubtasks.splice(idx, 1); renderFormSubtasks(); };
    // Problem 5: fade the item out before it's removed.
    const el = document.querySelector(`#form-sub-list .subtask-item[data-form-sub-idx="${idx}"]`);
    if (!el || prefersReducedMotion()) { commit(); return; }
    let done = false;
    const finish = () => { if (done) return; done = true; commit(); };
    el.classList.add('sub-removing');
    el.addEventListener('animationend', e => { if (e.target === el) finish(); }, { once: true });
    setTimeout(finish, 240);
}

function clearFormSubtasks() {
    formSubtasks = [];
    _formSubRepeatIdx = null;
    renderFormSubtasks();
}

// P12: render the form's subtasks using the SAME markup/classes as in-task
// subtasks (buildSubtaskItemHTML) so they look and behave identically — drag
// handle, priority ember (data-sprio), hover-reveal actions, inline text edit,
// inline note. Index-based handlers (no ids/state, the task isn't created yet).
// Skipped vs in-task (meaningless before creation): checkbox, promote, split.
function renderFormSubtasks() {
    const list = document.getElementById('form-sub-list');
    if (!list) return;
    list.innerHTML = formSubtasks.map((s, i) => {
        const repeatSet = s.repeat && s.repeat !== 'none';
        const anchorLabel = repeatSet ? getRepeatAnchorLabel(s.repeat, s.repeatAnchorTime, s.repeatAnchorDay, s.repeatAnchorMonthday) : '';
        const repeatTitle = repeatSet
            ? `Повтор: ${repeatLabel(s.repeat)}${anchorLabel ? ` · ${anchorLabel}` : ''} — нажмите чтобы изменить`
            : 'Назначить повтор';
        const noteWrapClass = s.note ? 'has-note' : '';
        // P-E: form-subtask deadline (mirrors buildSubtaskItemHTML; index-based, no checked state)
        const fDl       = s.deadline || null;
        const fDlStatus = fDl ? deadlineStatus(fDl) : null;
        const fDlAbs    = fDl ? formatDeadlineAbsolute(fDl, true) : '';
        const fDlCd     = fDl ? formatDeadlineCountdown(fDl) : '';
        const fDlCls    = fDlStatus ? ` sub-dl-${fDlStatus}` : '';
        const fDlBadge = fDl
            ? `<button type="button" class="sub-deadline-badge${fDlCls}" onclick="openFormSubDeadline(${i})" title="${escHtml(fDlAbs)}" aria-label="Дедлайн подпункта: ${escHtml(fDlAbs)} — изменить">${IC.window}</button>`
            : '';
        const fDlSetBtn = fDl
            ? ''
            : `<button type="button" class="btn-sub-action sub-deadline-btn" onclick="openFormSubDeadline(${i})" title="Назначить дедлайн">${IC.window}</button>`;
        const fDlWrap = fDl
            ? `<div class="sub-deadline-wrapper${fDlCls}">
            <div class="sub-deadline-inner">
                <span class="sub-dl-pill" role="button" tabindex="0" title="Изменить дедлайн"
                      onclick="openFormSubDeadline(${i})"
                      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openFormSubDeadline(${i});}">
                    ${fDlCd ? `<span class="sub-dl-countdown">${fDlCd}</span><span class="sub-dl-sep">·</span>` : ''}
                    <span class="sub-dl-date">${escHtml(fDlAbs)}</span>
                    <button type="button" class="sub-dl-clear" onclick="event.stopPropagation();clearFormSubDeadline(${i})" title="Снять дедлайн" aria-label="Снять дедлайн">${IC.crossedSwords}</button>
                </span>
            </div>
        </div>`
            : '';
        return `<li class="subtask-item" data-form-sub-idx="${i}" data-sprio="${s.priority || 'none'}">
        <div class="sub-main-row">
            <div class="sub-drag-handle" aria-hidden="true">${IC.drag}</div>
            <span class="sub-text" spellcheck="false" title="Двойной клик — редактировать" ondblclick="startFormSubEdit(event,${i})">${escHtml(s.text)}</span>
            ${fDlBadge}
            <div class="sub-actions">
                <button type="button" class="btn-sub-action sub-prio-btn" onclick="cycleFormSubPriority(${i})" title="Приоритет подпункта"><div class="sub-prio-dot"></div></button>
                <button type="button" class="btn-sub-action sub-repeat-btn${repeatSet ? ' active' : ''}" onclick="openFormSubRepeat(${i})" title="${repeatTitle}">${IC.ouroboros}</button>
                ${fDlSetBtn}
                <button type="button" class="btn-sub-action btn-sub-note-toggle${s.note ? ' has-note' : ''}" onpointerdown="event.preventDefault()" onclick="toggleFormSubNote(${i})" title="${s.note ? 'Редактировать заметку' : 'Добавить заметку'}">${s.note ? IC.editNote : IC.addNote}</button>
                <button type="button" class="btn-sub-action danger" onclick="removeFormSubtask(${i})" title="Удалить подпункт">${IC.skull}</button>
            </div>
        </div>
        ${fDlWrap}
        <div class="sub-note-wrapper ${noteWrapClass}" id="form-subnote-${i}">
            <div class="sub-note-inner">
                <div class="sub-note-text" id="form-subnote-text-${i}"
                     spellcheck="false" data-placeholder="начертайте примечание…"
                     aria-label="Заметка подпункта"
                     ondblclick="_noteEdit(this)"
                     oninput="_noteInput(this)"
                     onkeydown="_noteKeydown(event,this)"
                     onblur="_noteCommit(this)"
                    >${s.note ? noteDisplayHTML(s.note) : ''}</div>
                ${s.note ? `<button type="button" class="btn-sub-note-delete" onclick="_noteDeleteClick(event,this.parentElement.querySelector('.sub-note-text'))" title="Удалить заметку">${IC.dagger}</button>` : ''}
            </div>
        </div>
    </li>`;
    }).join('');
    initFormSubSortable();
}

// ── Inline text edit for a form subtask (mirror of startSubEdit) ──────────────
function startFormSubEdit(event, i) {
    event.stopPropagation();
    const s = formSubtasks[i];
    if (!s) return;
    const span = event.target;
    if (span.contentEditable === 'true') return;
    span.contentEditable = 'true';
    span.spellcheck = false;
    span.textContent = s.text;
    span.focus();
    span.addEventListener('paste', plainTextPaste, { once: false });
    const range = document.createRange(); range.selectNodeContents(span);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    const commit = () => {
        span.removeEventListener('paste', plainTextPaste);
        span.contentEditable = 'false';
        const nw = span.textContent.trim();
        if (nw && nw !== s.text) s.text = nw;
        span.textContent = s.text;
    };
    span.addEventListener('blur', commit, { once: true });
    span.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
        if (e.key === 'Escape') {
            span.removeEventListener('paste', plainTextPaste);
            span.textContent = s.text;
            span.contentEditable = 'false';
            span.removeEventListener('blur', commit);
        }
    });
}

// ── Inline note for a form subtask — now handled by the unified note system
//    (_noteCtx resolves form context from data-form-sub-idx). Only the toggle
//    button needs a thin wrapper; create/save/delete go through the shared path.
function toggleFormSubNote(i) {
    _noteToggle(document.getElementById(`form-subnote-${i}`));
}

// P12: drag-to-reorder for the form's subtask list (parity with in-task subtasks).
let _formSubSortable = null;
function initFormSubSortable() {
    const list = document.getElementById('form-sub-list');
    if (!list || typeof Sortable === 'undefined') return;
    if (_formSubSortable) { try { _formSubSortable.destroy(); } catch (e) {} _formSubSortable = null; }
    if (!formSubtasks.length) return;
    _formSubSortable = new Sortable(list, {
        animation: 150,
        draggable: '.subtask-item',
        delay: 120,
        delayOnTouchOnly: false,
        fallbackTolerance: 5,
        // Keep clicks on actions / inline edit fields from starting a drag.
        filter: '.sub-actions, .btn-sub-action, .sub-note-wrapper, .sub-deadline-badge, .sub-deadline-wrapper, [contenteditable="true"]',
        preventOnFilter: false,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: onFormSubDragEnd,
    });
}
function onFormSubDragEnd() {
    const list = document.getElementById('form-sub-list');
    if (!list) return;
    // Read the new DOM order via each item's original index, then rebuild the array.
    const order = Array.from(list.querySelectorAll('.subtask-item'))
        .map(el => parseInt(el.dataset.formSubIdx));
    const reordered = order.map(i => formSubtasks[i]).filter(Boolean);
    if (reordered.length === formSubtasks.length) formSubtasks = reordered;
    renderFormSubtasks();
}

function handleFormSubAdd(event) { if (event.key === 'Enter') addFormSubtask(); }

function cycleFormSubPriority(idx) {
    const CYCLE = { none: 'high', high: 'medium', medium: 'low', low: 'none' };
    const s = formSubtasks[idx];
    if (!s) return;
    s.priority = CYCLE[s.priority] || 'none';
    renderFormSubtasks();
}

// Opens the shared repeat modal for a form-subtask (problem 3/4)
let _formSubRepeatIdx = null;
function openFormSubRepeat(idx) {
    const s = formSubtasks[idx];
    if (!s) return;
    _formSubRepeatIdx = idx;
    editingTaskId = null;
    editingSubId  = null;
    const cur = s.repeat || 'none';
    document.querySelectorAll('#modal-repeat-selector .repeat-modal-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.repeat === cur)
    );
    _populateRepeatAnchor(cur, s.repeatAnchorTime || '', parseInt(s.repeatAnchorDay) || 0, parseInt(s.repeatAnchorMonthday) || 0);
    // Patch confirm handler for this session: standard handler checks editingTaskId/SubId
    // We intercept via _formSubRepeatIdx flag (checked first in the patched handler).
    openModalWithFocus('repeat-modal');
}

// P-E: deadline for a FORM subtask (added before the task exists). Mirrors
// openFormSubRepeat — index-based, intercepted in confirmDeadline/applyDeadline via
// the _formSubDeadlineIdx flag (set inside openDeadlineModal's 4th param).
let _formSubDeadlineIdx = null;
function openFormSubDeadline(idx) {
    if (!formSubtasks[idx]) return;
    openDeadlineModal(null, false, null, idx);
}
function clearFormSubDeadline(idx) {
    const s = formSubtasks[idx];
    if (!s || !s.deadline) return;
    s.deadline = null;
    renderFormSubtasks();
}

// UX-4: snapshot of the form state captured just before addTask() commits,
// so Ctrl+Z can restore the text the user just submitted.
let _undoFormSnapshot = null;

// ============================================================
//  TASK CRUD
// ============================================================
function addTask() {
    const raw = inputBox.value.trim();
    if (!raw) { shakeInput(); showToast('Введите название задачи'); return; }
    _qaClose();
    // Idea 4: pull inline !priority / ~date tokens out of the text (#tags stay).
    const parsed = parseQuickInput(raw);
    const text = parsed.text;
    if (!text) { shakeInput(); showToast('Введите название задачи'); return; }
    const effPriority = parsed.priority || selectedPriority;

    // UX-4 + I-5: capture full form snapshot BEFORE clearing so undo() can
    // restore text, note, priority, color, repeat, deadline, group and subtasks.
    _undoFormSnapshot = {
        text:      inputBox.value,
        note:      taskNote ? taskNote.value : '',
        priority:  selectedPriority,
        color:     selectedFormColor,
        repeat:    selectedRepeat,
        deadline:  formDeadline ? JSON.parse(JSON.stringify(formDeadline)) : null,
        groupId:   taskGroupSelect ? taskGroupSelect.value : '',
        subtasks:  formSubtasks.slice(),
        pinned:    formPinned,
    };

    pushUndo();

    const groupId  = parseInt(taskGroupSelect.value) || null;
    const note     = taskNote.value.trim();
    const deadline = parsed.deadline || (formDeadline ? { ...formDeadline } : null);

    // Problem 3: read form-level repeat anchor
    // Prefer SegmentedInput value (registered after initSegmentedInputs); fall back to raw var
    const _fRAt  = segInputs['form-repeat-anchor-time']?.value || formRepeatAnchorTime || null;
    const _fRAd  = formRepeatAnchorDay;
    const _fRAmd = formRepeatAnchorMonthday;

    // X-6: a quick-add %weekday deadline auto-enables weekly repeat (default ON,
    // matching the deadline modal) — only when the form didn't set an explicit
    // repeat. Quick-add has no toggle, so it always uses the ON default.
    let _effRepeat    = selectedRepeat;
    let _effAnchorDay = _fRAd;
    if (parsed.deadline && parsed.deadline.mode === 'weektime' && (!_effRepeat || _effRepeat === 'none')) {
        _effRepeat    = 'weekly';
        _effAnchorDay = parseInt((parsed.deadline.value || '').split('|')[0]) || null;
    }

    const newSubtasks = formSubtasks.map((s, i) => ({
        id: state.nextSubId++, uid: uid(), text: s.text, checked: false,
        priority: s.priority || 'none',
        note: s.note || '',
        order: i,
        deadline: s.deadline ? JSON.parse(JSON.stringify(s.deadline)) : null,  // P-E: carry form-subtask deadline into the created task
        repeat: s.repeat || 'none',
        repeatAnchorTime: s.repeatAnchorTime || null,
        repeatAnchorDay: s.repeatAnchorDay || null,
        repeatAnchorMonthday: s.repeatAnchorMonthday || null,
        cycleChecked: false, nextReset: null,
    }));

    state.tasks.push({
        id: state.nextId++, uid: uid(), createdAt: nowTs(), updatedAt: nowTs(),
        text, checked: false,
        priority: effPriority,
        color: (effPriority && effPriority !== 'none') ? null : (selectedFormColor || null),
        groupId, deadline, note, noteOpen: false,
        order: state.tasks.length,
        repeat: _effRepeat,
        repeatAnchorTime:     _fRAt  || null,
        repeatAnchorDay:      _effAnchorDay || null,
        repeatAnchorMonthday: _fRAmd || null,
        cycleChecked: false,
        nextReset: null,
        subtasks: newSubtasks,
        subtasksOpen: newSubtasks.length > 0,
        pinned: formPinned,
    });
    // IMP-1: mark the new task so only it gets taskIn animation on render
    _newTaskIds.add(state.tasks[state.tasks.length - 1].id);

    inputBox.value = '';
    taskNote.value = '';
    clearFormDeadlineState();
    clearFormSubtasks();
    setFormRepeat('none');
    formRepeatAnchorTime = null;
    formRepeatAnchorDay  = null;
    formRepeatAnchorMonthday = null;
    segInputs['form-repeat-anchor-time']?.clear();
    // Reset form weekday picker label
    const fwdLabel = document.getElementById('form-wd-label');
    if (fwdLabel) fwdLabel.textContent = 'Любой день';
    document.getElementById('form-repeat-anchor-day') && (document.getElementById('form-repeat-anchor-day').value = '');
    document.querySelectorAll('#repeat-selector .repeat-btn').forEach(b => { b.disabled = false; });
    // Reset priority to none
    selectedPriority = 'none';
    document.querySelectorAll('#priority-selector .prio-grid-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.prio === 'none'));
    // Reset form color to none (also clears the custom crystal button)
    _setFormColor(null);
    // Reset group chip to none
    taskGroupSelect.value = '';
    renderGroupChips('');
    // P5: reset the pin flag/toggle for the next task
    _resetFormPin();

    saveState(); render();
    showToast('Задача добавлена');
}

function removeTask(id) {
    pushUndo();
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const group = task.groupId ? state.groups.find(g => g.id === task.groupId) : null;

    // ── Atomic state mutation (race-condition fix) ────────────────
    // Both archive-push and tasks-filter happen synchronously, before
    // any animation. Undo always sees a fully consistent snapshot:
    // the task is either in tasks OR in archive — never in both.
    // The animationend callback only calls render() for DOM cleanup;
    // it never touches state, so a mid-animation Ctrl+Z is safe.
    state.archive.push({
        ...task,
        subtasks: JSON.parse(JSON.stringify(task.subtasks || [])),
        archivedAt: Date.now(),
        originalGroupName:  group ? group.name  : null,
        originalGroupColor: group ? group.color : null,
    });
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
    updateArchiveBadge();
    // ─────────────────────────────────────────────────────────────

    const li = document.querySelector(`.task-item[data-id="${id}"]`);
    if (li) {
        li.style.setProperty('--row-h', li.scrollHeight + 'px'); // S1-1: real height for exit anim
        li.classList.add('removing');
        li.addEventListener('animationend', () => {
            render(); // DOM cleanup only — state already updated above
        }, { once: true });
    } else {
        render();
    }
    showToast('Задача перемещена в архив', { undo: true });
}

// Problem 4: fade the task's current row out, then re-render so it re-appears in
// its new active/completed slot — smooth in both the normal list and the split
// active/done zones. The coffin seal/unseal still plays on the checkbox during
// the fade. Falls back to an immediate render when motion is reduced.
// Add an animation class and auto-remove it when the element's OWN animation ends
// (e.target guard ignores animationend bubbling up from children — needed when a
// checkbox spin and a card pulse run on the same row at once).
function _animClassSelf(el, cls) {
    if (!el) return;
    el.classList.add(cls);
    const h = (e) => { if (e.target !== el) return; el.classList.remove(cls); el.removeEventListener('animationend', h); };
    el.addEventListener('animationend', h);
}

// Cycle-complete card animation for recurring tasks — a glow+rotate pulse that
// resonates with the coffin's 360° spin (distinct from the plain settle), played
// on the rebuilt cycle-checked row. Removed on animationend so it re-fires each cycle.
function _cycleSettle(id) {
    if (prefersReducedMotion()) return;
    const li = document.querySelector(`.task-item[data-id="${id}"]`);
    if (!li) return;
    li.classList.add('cycle-settling');
    li.addEventListener('animationend', () => li.classList.remove('cycle-settling'), { once: true });
}

function _leaveTaskThenRender(id, opts = {}) {
    const li      = document.querySelector(`.task-item[data-id="${id}"]`);
    const checkEl = li && li.querySelector('.task-check');
    const reduced = prefersReducedMotion();
    const afterRender = () => {
        // Settle the rebuilt row into its new slot (done-zone / list bottom) so a
        // check OR uncheck reads as a smooth move, not a pop-in. When checking with
        // the filter on, the row is gone → nothing to settle (clean disappearance).
        // Removed on animationend so the NEXT toggle gets a fresh animation (the
        // base .checked dim is now static, so removal no longer flashes).
        if (!reduced) {
            const newLi = document.querySelector(`.task-item[data-id="${id}"]`);
            if (newLi) {
                newLi.classList.add('settling-in');
                newLi.addEventListener('animationend', () => newLi.classList.remove('settling-in'), { once: true });
            }
        }
        if (opts.checkAllDone) {
            const allFinished = state.tasks.length > 0 &&
                state.tasks.every(t => t.checked || t.cycleChecked);
            if (allFinished) showAllDone();
        }
    };
    if (!li || reduced) { renderListOnly(); afterRender(); return; }
    if (checkEl && opts.sealClass) checkEl.classList.add(opts.sealClass);
    li.classList.add('task-leaving');
    let done = false;
    const finish = () => { if (done) return; done = true; renderListOnly(); afterRender(); };
    li.addEventListener('animationend', e => {
        if (e.target === li && e.animationName === 'taskLeave') finish();
    });
    setTimeout(finish, 320); // safety net if animationend never fires
}

function toggleCheck(id) {
    pushUndo();
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    if (task.repeat && task.repeat !== 'none') {
        task.autoChecked = false;   // manual parent toggle → auto-sync no longer owns it
        if (!task.cycleChecked) {
            task.cycleChecked = true;
            task.nextReset    = getNextResetTimestamp(task);
            playSound('check'); vibrate(30);
            saveState(); // persist immediately — render is deferred until after spin

            // ── Cycle-complete 360° spin on the coffin checkbox ───────
            // render() is intentionally delayed until animationend so the
            // spinning coffin completes its full arc before the DOM is
            // replaced. Previously render() fired synchronously, killing
            // the animation on the first frame.
            if (!prefersReducedMotion()) {
                const li      = document.querySelector(`.task-item[data-id="${id}"]`);
                const checkEl = li && li.querySelector('.task-check');
                if (checkEl) {
                    checkEl.classList.add('cycle-spinning');
                    checkEl.addEventListener('animationend', () => {
                        checkEl.classList.remove('cycle-spinning');
                        render(); // rebuild DOM with cycle-checked state after spin
                        _cycleSettle(id);   // special card animation resonating with the spin
                    }, { once: true });
                } else {
                    render(); // no element found — render immediately
                    _cycleSettle(id);
                }
            } else {
                render(); // reduced motion — no spin, render immediately
            }
            // ──────────────────────────────────────────────────────────

            showToast(`Цикл завершён · ${repeatLabel(task.repeat)}`);
        } else {
            // Cycle un-complete → fade the row out, then re-render it as active.
            task.cycleChecked = false;
            task.nextReset    = null;
            saveState();
            _leaveTaskThenRender(id, { fadeIn: true });
        }
        return;
    }

    task.checked = !task.checked;
    task.autoChecked = false;   // manual parent toggle → auto-sync no longer owns it
    // Subtasks are fully independent — parent toggle does NOT change their state
    if (task.checked) { playSound('check'); vibrate(30); }
    saveState(); // persist immediately — render is deferred until the fade-out ends

    // M-2: when CHECKING, let the coffin-seal ritual play to completion BEFORE the
    // row fades out + re-renders (parity with the cyclic-spin path). Previously seal
    // (220ms) and the row fade-out (200ms) ran together, so the seal's burst/settle
    // was masked by the row already going transparent. Unchecking keeps the original
    // simultaneous unseal + fade-in (reads fine).
    if (task.checked && !prefersReducedMotion()) {
        const li      = document.querySelector(`.task-item[data-id="${id}"]`);
        const checkEl = li && li.querySelector('.task-check');
        if (checkEl) {
            // Swap to the FILLED coffin so the seal pulse reads as "sealed", then
            // flash the row border — the ritual is now clearly visible (was pulsing
            // the still-empty coffin, which looked like nothing happened).
            checkEl.innerHTML = coffinSVG(21, true, false);
            checkEl.classList.add('sealing');
            if (li) {
                li.classList.add('seal-flash');
                li.addEventListener('animationend', () => li.classList.remove('seal-flash'), { once: true });
            }
            let sealed = false;
            const afterSeal = () => {
                if (sealed) return; sealed = true;
                // Seal already played — fade the row out and re-render into place.
                _leaveTaskThenRender(id, { fadeIn: false, checkAllDone: true });
            };
            checkEl.addEventListener('animationend', afterSeal, { once: true });
            setTimeout(afterSeal, 260); // safety net (coffinSeal ≈ --dur-quick 220ms)
            return;
        }
    }

    // Unchecking (or no checkbox / reduced motion): seal+leave together as before.
    _leaveTaskThenRender(id, {
        sealClass:    task.checked ? 'sealing' : 'unsealing',
        fadeIn:       !task.checked,
        checkAllDone: true,
    });
}

// "Архивировать всё" — moves all to archive (non-destructive)
function archiveAll() {
    if (!state.tasks.length) return;
    pushUndo();
    const now = Date.now();
    state.tasks.forEach(t => {
        const g = t.groupId ? state.groups.find(g => g.id === t.groupId) : null;
        state.archive.push({
            ...t,
            subtasks: JSON.parse(JSON.stringify(t.subtasks || [])),
            archivedAt: now,
            originalGroupName:  g ? g.name  : null,
            originalGroupColor: g ? g.color : null,
        });
    });
    state.tasks = [];
    saveState(); render();
    showToast('Все задачи архивированы', { undo: true });
}

// ── Two-step confirm helpers ──────────────────────────────────────────────────
// First click: button enters "armed" state (danger colour, new label).
// Second click within 3 s: action fires.  Timeout or outside click: disarm.
let _clearAllArmed = false;
let _clearAllTimer = null;

// "Удалить всё навсегда" — permanently destroys (two-step confirm)
function clearAll() {
    const btn = document.querySelector('.btn-tool.btn-danger[onclick="clearAll()"]');

    // I-6: if list is empty while armed, disarm cleanly and bail
    if (!state.tasks.length) {
        if (_clearAllArmed) {
            clearTimeout(_clearAllTimer);
            _clearAllArmed = false;
            if (btn) { btn.classList.remove('confirm-armed'); btn.title = 'Удалить всё навсегда'; }
        }
        return;
    }

    if (!_clearAllArmed) {
        // ── Arm ──
        _clearAllArmed = true;
        if (btn) {
            btn.classList.add('confirm-armed');
            btn.title = 'Нажмите ещё раз — удалить всё';
        }
        _clearAllTimer = setTimeout(() => {
            _clearAllArmed = false;
            if (btn) { btn.classList.remove('confirm-armed'); btn.title = 'Удалить всё навсегда'; }
        }, 3000);
        return;
    }
    // ── Fire ──
    clearTimeout(_clearAllTimer);
    _clearAllArmed = false;
    if (btn) { btn.classList.remove('confirm-armed'); btn.title = 'Удалить всё навсегда'; }

    pushUndo();
    // IMP-9: Clear all orphaned localStorage keys for groups before wiping tasks
    state.groups.forEach(g => {
        localStorage.removeItem('groupCollapsed_' + g.id);
        localStorage.removeItem('groupSplit_done_' + g.id);
        localStorage.removeItem('groupSplit_done_' + g.id + '_dl');
        localStorage.removeItem('groupSplit_done_' + g.id + '_ndl');
    });
    state.tasks.forEach(t => addTombstone(t.uid, 'task'));   // Idea 8: tombstone every wiped task
    state.tasks = [];
    saveState(); render();
    showToast('Все задачи удалены навсегда', { undo: true });
}

// Delete group — two-step confirm keyed by group id
const _deleteGroupArmed = new Map(); // groupId → timerId

function deleteGroup(id) {
    // Find every danger button for this group: the group-bar one AND the params dropdown one.
    const setArmed = on => document.querySelectorAll(
        `.group-section[data-group-id="${id}"] .btn-group-action.danger, .grp-dd-del[data-gid="${id}"]`
    ).forEach(b => b.classList.toggle('confirm-armed', on));

    if (!_deleteGroupArmed.has(id)) {
        // ── Arm ──
        _deleteGroupArmed.set(id, setTimeout(() => {
            _deleteGroupArmed.delete(id);
            setArmed(false);
        }, 3000));
        setArmed(true);
        const n = state.tasks.filter(t => t.groupId === id).length;
        showToast(n ? 'Нажмите ещё раз — удалить группу со всеми задачами' : 'Нажмите ещё раз — удалить группу');
        return;
    }
    // ── Fire ──
    clearTimeout(_deleteGroupArmed.get(id));
    _deleteGroupArmed.delete(id);
    setArmed(false);

    pushUndo();
    // Whether the group actually contained tasks — controls the toast wording (P9).
    const hadTasks = state.tasks.some(t => t.groupId === id);
    // Deleting a group deletes the tasks (and their subtasks) inside it.
    // Idea 8: tombstone the group AND each removed task before they leave the arrays.
    const _grp = state.groups.find(g => g.id === id);
    if (_grp) addTombstone(_grp.uid, 'group');
    state.tasks.forEach(t => { if (t.groupId === id) addTombstone(t.uid, 'task'); });
    state.tasks = state.tasks.filter(t => t.groupId !== id);
    state.groups = state.groups.filter(g => g.id !== id);
    // Clean up orphaned localStorage keys for this group
    localStorage.removeItem('groupCollapsed_' + id);
    // IMP-9: also clean split-done collapse keys (all suffixes used by appendSplitSection)
    localStorage.removeItem('groupSplit_done_' + id);
    localStorage.removeItem('groupSplit_done_' + id + '_dl');
    localStorage.removeItem('groupSplit_done_' + id + '_ndl');
    // B6: clear focus if this was the focused group
    if (focusGroupId === id) { focusGroupId = null; saveUiState(); }
    // B6: remove any sort-mode override for this group
    if (state.sortModeOverrides) delete state.sortModeOverrides[String(id)];
    saveState(); render();
    showToast(hadTasks ? 'Группа удалена со всеми задачами' : 'Группа удалена', { undo: true });
}

// Idea 6: duplicate a group + all its tasks (new ids), placed right after it.
function duplicateGroup(id) {
    const group = state.groups.find(g => g.id === id);
    if (!group) return;
    pushUndo();
    const newId = state.nextGroupId++;
    const gidx  = state.groups.findIndex(g => g.id === id);
    state.groups.splice(gidx + 1, 0, { id: newId, uid: uid(), createdAt: nowTs(), updatedAt: nowTs(), name: group.name + ' (копия)', color: group.color });

    const baseOrder = state.tasks.length;
    state.tasks.filter(t => t.groupId === id).forEach((t, i) => {
        const copy = {
            ...JSON.parse(JSON.stringify(t)),
            id:           state.nextId++,
            uid:          uid(), createdAt: nowTs(), updatedAt: nowTs(),   // Idea 8: a copy is a NEW record (don't inherit the original's uid)
            groupId:      newId,
            order:        baseOrder + i,
            checked:      false,
            cycleChecked: false,
            nextReset:    null,
            noteOpen:     false,
            subtasks: (t.subtasks || []).map(s => ({
                ...s, id: state.nextSubId++, uid: uid(), checked: false, cycleChecked: false, nextReset: null,
            })),
        };
        state.tasks.push(copy);
        _newTaskIds.add(copy.id);
    });
    saveState(); render();
    showToast(`Группа «${escHtml(group.name)}» скопирована`);
}

// ── Idea 6: task templates ───────────────────────────────────────────────────
function saveTaskAsTemplate(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    if (!state.templates) state.templates = [];
    if (!state.nextTemplateId) state.nextTemplateId = 1;
    pushUndo();
    state.templates.push({
        id:        state.nextTemplateId++,
        name:      (task.text || 'Шаблон').slice(0, 60),
        text:      task.text,
        priority:  task.priority || 'none',
        color:     task.color || null,
        deadline:  task.deadline ? JSON.parse(JSON.stringify(task.deadline)) : null,
        note:      task.note || '',
        repeat:    task.repeat || 'none',
        repeatAnchorTime:     task.repeatAnchorTime     || null,
        repeatAnchorDay:      task.repeatAnchorDay      || null,
        repeatAnchorMonthday: task.repeatAnchorMonthday || null,
        pinned:    !!task.pinned,
        subtasks: (task.subtasks || []).map(s => ({
            text: s.text, priority: s.priority || 'none', note: s.note || '',
            repeat: s.repeat || 'none', repeatAnchorTime: s.repeatAnchorTime || null,
            repeatAnchorDay: s.repeatAnchorDay || null, repeatAnchorMonthday: s.repeatAnchorMonthday || null,
        })),
    });
    saveState();
    updateTemplatesBtn();
    showToast('Сохранено как шаблон');
}

// P5: save the current ADD-TASK FORM as a template — saves only, does NOT create a
// task. Mirrors saveTaskAsTemplate() but reads from the live form state.
function saveFormAsTemplate() {
    const raw = inputBox.value.trim();
    if (!raw) { shakeInput(); showToast('Введите название для шаблона'); return; }
    const parsed = parseQuickInput(raw);
    const text = parsed.text;
    if (!text) { shakeInput(); showToast('Введите название для шаблона'); return; }
    if (!state.templates) state.templates = [];
    if (!state.nextTemplateId) state.nextTemplateId = 1;

    const effPriority = parsed.priority || selectedPriority;
    const deadline    = parsed.deadline || (formDeadline ? { ...formDeadline } : null);
    const _fRAt       = segInputs['form-repeat-anchor-time']?.value || formRepeatAnchorTime || null;

    pushUndo();
    state.templates.push({
        id:        state.nextTemplateId++,
        name:      text.slice(0, 60),
        text,
        priority:  effPriority || 'none',
        color:     (effPriority && effPriority !== 'none') ? null : (selectedFormColor || null),
        deadline:  deadline ? JSON.parse(JSON.stringify(deadline)) : null,
        note:      taskNote ? taskNote.value.trim() : '',
        repeat:    selectedRepeat || 'none',
        repeatAnchorTime:     _fRAt || null,
        repeatAnchorDay:      formRepeatAnchorDay || null,
        repeatAnchorMonthday: formRepeatAnchorMonthday || null,
        pinned:    formPinned,
        subtasks: (formSubtasks || []).map(s => ({
            text: s.text, priority: s.priority || 'none', note: s.note || '',
            repeat: s.repeat || 'none', repeatAnchorTime: s.repeatAnchorTime || null,
            repeatAnchorDay: s.repeatAnchorDay || null, repeatAnchorMonthday: s.repeatAnchorMonthday || null,
        })),
    });
    saveState();
    updateTemplatesBtn();
    showToast('Сохранено как шаблон');
}

function createTaskFromTemplate(tid) {
    const tpl = (state.templates || []).find(t => t.id === tid);
    if (!tpl) return;
    pushUndo();
    const newId = state.nextId++;
    state.tasks.push({
        id: newId, uid: uid(), createdAt: nowTs(), updatedAt: nowTs(),
        text: tpl.text, checked: false,
        priority: tpl.priority || 'none', color: tpl.color || null,
        groupId: null,
        deadline: tpl.deadline ? JSON.parse(JSON.stringify(tpl.deadline)) : null,
        note: tpl.note || '', noteOpen: false,
        order: state.tasks.length,
        repeat: tpl.repeat || 'none',
        repeatAnchorTime:     tpl.repeatAnchorTime     || null,
        repeatAnchorDay:      tpl.repeatAnchorDay      || null,
        repeatAnchorMonthday: tpl.repeatAnchorMonthday || null,
        cycleChecked: false, nextReset: null,
        subtasks: (tpl.subtasks || []).map((s, i) => ({
            id: state.nextSubId++, uid: uid(), text: s.text, checked: false,
            priority: s.priority || 'none', note: s.note || '', order: i,
            repeat: s.repeat || 'none', repeatAnchorTime: s.repeatAnchorTime || null,
            repeatAnchorDay: s.repeatAnchorDay || null, repeatAnchorMonthday: s.repeatAnchorMonthday || null,
            cycleChecked: false, nextReset: null,
        })),
        subtasksOpen: (tpl.subtasks || []).length > 0,
        pinned: !!tpl.pinned,
    });
    _newTaskIds.add(newId);
    saveState(); render();
    closeTemplatesModal();
    showToast('Задача создана из шаблона');
}

function deleteTemplate(tid) {
    state.templates = (state.templates || []).filter(t => t.id !== tid);
    saveState();
    _renderTemplatesList();
    updateTemplatesBtn();
    showToast('Шаблон удалён');
}

// Show/hide the "Шаблоны" launcher in the groups bar based on whether any exist.
function updateTemplatesBtn() {
    const btn = document.getElementById('btn-templates');
    if (!btn) return;
    btn.style.display = (state.templates && state.templates.length) ? '' : 'none';
}

function openTemplatesModal() {
    _renderTemplatesList();
    openModalWithFocus('templates-modal');
}
function closeTemplatesModal(event) {
    if (!event || event.target === document.getElementById('templates-modal')) {
        closeModalWithAnim('templates-modal');
    }
}
function _renderTemplatesList() {
    const cont = document.getElementById('templates-list');
    if (!cont) return;
    const tpls = state.templates || [];
    if (!tpls.length) {
        cont.innerHTML = '<p class="templates-empty">Нет сохранённых шаблонов</p>';
        return;
    }
    cont.innerHTML = tpls.map(t => {
        const bits = [];
        if (t.priority && t.priority !== 'none') bits.push(`<span class="tpl-bit tpl-prio-${t.priority}">${{high:'высокий',medium:'средний',low:'низкий'}[t.priority]}</span>`);
        if (t.repeat && t.repeat !== 'none')     bits.push(`<span class="tpl-bit">${IC.ouroboros}${repeatLabel(t.repeat)}</span>`);
        if (t.deadline)                          bits.push(`<span class="tpl-bit">${IC.window}дедлайн</span>`);
        if (t.subtasks && t.subtasks.length)     bits.push(`<span class="tpl-bit">${t.subtasks.length} подп.</span>`);
        return `<div class="template-item">
            <button class="template-create" onclick="createTaskFromTemplate(${t.id})" title="Создать задачу из шаблона">
                <span class="template-name">${escHtml(t.name)}</span>
                ${bits.length ? `<span class="template-meta">${bits.join('')}</span>` : ''}
            </button>
            <button class="template-del" onclick="deleteTemplate(${t.id})" title="Удалить шаблон">${IC.skull}</button>
        </div>`;
    }).join('');
}

// ============================================================
//  BACKUP RESTORE MODAL  (P-C)
// ============================================================
function _formatBackupAge(ts) {
    const min = Math.floor((Date.now() - ts) / 60000);
    if (min < 1)  return 'только что';
    if (min < 60) return `${min} мин назад`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs} ч назад`;
    const days = Math.floor(hrs / 24);
    return `${days} дн назад`;
}
function _formatBackupStamp(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openBackupModal() {
    _renderBackupList();
    openModalWithFocus('backup-modal');
}
function closeBackupModal(event) {
    if (!event || event.target === document.getElementById('backup-modal')) {
        closeModalWithAnim('backup-modal');
    }
}
function _renderBackupList() {
    const cont = document.getElementById('backup-list');
    if (!cont) return;
    const backups = loadBackups().slice().reverse(); // newest first
    if (!backups.length) {
        cont.innerHTML = '<p class="backups-empty">Точек восстановления пока нет</p>';
        return;
    }
    cont.innerHTML = backups.map(b => {
        const c = b.counts || {};
        const bits = [`${c.tasks ?? '?'} задач`, `${c.groups ?? '?'} групп`, `${c.archive ?? '?'} в архиве`];
        return `<div class="backup-item">
            <button class="backup-restore" onclick="restoreBackup(${b.ts})" title="Восстановить это состояние">
                <span class="backup-when">
                    <span class="backup-age">${_formatBackupAge(b.ts)}</span>
                    <span class="backup-stamp">${_formatBackupStamp(b.ts)}</span>
                </span>
                <span class="backup-meta">${bits.map(x => `<span class="backup-bit">${x}</span>`).join('')}</span>
            </button>
        </div>`;
    }).join('');
}

function restoreBackup(ts) {
    const snap = loadBackups().find(b => b.ts === ts);
    if (!snap) { showToast('Точка восстановления не найдена'); return; }
    let loaded;
    try { loaded = JSON.parse(snap.json); }
    catch (_) { showToast('Снимок повреждён'); return; }
    pushUndo(); // restoring is itself undoable — the current state is never lost
    state = { tasks: [], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1, ...loaded };
    migrateTasks(state.tasks);
    migrateTasks(state.archive);
    normalizeState();
    saveState();
    render();
    renderArchive();
    if (currentNoteId && ![...(state.notes || []), ...(state.notesArchive || [])].some(n => n.id === currentNoteId)) currentNoteId = null;
    renderNotes();
    updateArchiveBadge();
    updateTemplatesBtn();
    closeModalWithAnim('backup-modal');
    showToast('Состояние восстановлено', { undo: true });
}

// ---- Repeating tasks ----
/** Returns a compact human-readable anchor label, e.g. "пн в 14:30" or "в 09:00" */
function getRepeatAnchorLabel(repeat, anchorTime, anchorDay, anchorMonthday) {
    const DAY_SHORT = ['','пн','вт','ср','чт','пт','сб','вс'];
    const parts = [];
    if (repeat === 'monthly' && anchorMonthday) parts.push(`${anchorMonthday}-го`);
    if (repeat === 'weekly' && anchorDay) parts.push(DAY_SHORT[anchorDay] || '');
    if (anchorTime) parts.push(`в ${anchorTime}`);
    return parts.filter(Boolean).join(' ');
}

function getNextResetTimestamp(task) {
    const dl         = task.deadline;
    const anchorTime     = task.repeatAnchorTime     || null;  // "HH:MM" | null
    const anchorDay      = task.repeatAnchorDay      || null;  // 1-7 Mon-Sun | null
    const anchorMonthday = task.repeatAnchorMonthday || null;  // 1-31 | null

    // ── Deadline-anchored resets (unchanged) ──────────────────────────────────
    if (dl && dl.mode === 'date') {
        const base = new Date(dl.value + 'T00:00:00');
        if (task.repeat === 'daily')       base.setDate(base.getDate() + 1);
        else if (task.repeat === 'weekly') base.setDate(base.getDate() + 7);
        else if (task.repeat === 'weekdays') {
            do { base.setDate(base.getDate() + 1); } while ([0,6].includes(base.getDay()));
        }
        return base.getTime();
    }
    if (dl && dl.mode === 'time') {
        const [h, m] = dl.value.split(':').map(Number);
        const next = new Date(); next.setDate(next.getDate() + 1); next.setHours(h, m, 0, 0);
        return next.getTime();
    }
    if (dl && dl.mode === 'weektime') {
        const ts = getDeadlineTimestamp(dl);
        // I-7: ts can be in the past when daysUntil=0 and timeSet:false (midnight today already passed).
        // In that case ts+7d is still the correct next weekly reset — but guard against
        // it also being in the past (edge: old state where ts was never updated).
        if (ts) {
            const next = ts + 7 * 86400000;
            return next > Date.now() ? next : Date.now() + 7 * 86400000;
        }
        return Date.now() + 7 * 86400000;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const now = Date.now();

    if (task.repeat === 'daily') {
        if (anchorTime) {
            const [h, m] = anchorTime.split(':').map(Number);
            const next = new Date(); next.setHours(h, m, 0, 0);
            if (next.getTime() <= now) next.setDate(next.getDate() + 1);
            return next.getTime();
        }
        const midnight = new Date(); midnight.setHours(0,0,0,0);
        midnight.setDate(midnight.getDate() + 1);
        return midnight.getTime();
    }

    if (task.repeat === 'weekly') {
        if (anchorDay || anchorTime) {
            const [h, m] = anchorTime ? anchorTime.split(':').map(Number) : [0, 0];
            const next = new Date(); next.setHours(h, m, 0, 0);
            if (anchorDay) {
                // 1=Mon…7=Sun → JS: Mon=1…Sat=6, Sun=0
                const jsTarget = anchorDay === 7 ? 0 : anchorDay;
                const curJs    = next.getDay();
                let   daysUntil = (jsTarget - curJs + 7) % 7;
                if (daysUntil === 0 && next.getTime() <= now) daysUntil = 7;
                next.setDate(next.getDate() + daysUntil);
            } else {
                // Time-only: same weekday, next week at anchorTime
                next.setDate(next.getDate() + 7);
            }
            return next.getTime();
        }
        const midnight = new Date(); midnight.setHours(0,0,0,0);
        midnight.setDate(midnight.getDate() + 7);
        return midnight.getTime();
    }

    if (task.repeat === 'weekdays') {
        if (anchorTime) {
            const [h, m] = anchorTime.split(':').map(Number);
            const next = new Date(); next.setHours(h, m, 0, 0);
            if (next.getTime() <= now) next.setDate(next.getDate() + 1);
            while ([0, 6].includes(next.getDay())) next.setDate(next.getDate() + 1);
            return next.getTime();
        }
        const midnight = new Date(); midnight.setHours(0,0,0,0);
        midnight.setDate(midnight.getDate() + 1);
        while ([0, 6].includes(midnight.getDay())) midnight.setDate(midnight.getDate() + 1);
        return midnight.getTime();
    }

    const midnight = new Date(); midnight.setHours(0,0,0,0);

    if (task.repeat === 'monthly') {
        const day = anchorMonthday ? parseInt(anchorMonthday) : 1;
        const [h, m] = anchorTime ? anchorTime.split(':').map(Number) : [0, 0];
        const next = new Date();
        next.setHours(h, m, 0, 0);

        // Step 1: try this calendar month's occurrence.
        next.setDate(day);
        // If JS auto-rolled to the next month (short month overflow, e.g. Feb has no 29th),
        // we are already sitting at the right month — just re-apply the day there.
        if (next.getDate() !== day) next.setDate(day);

        // Step 2: if that date is still in the past, advance one month and try again.
        if (next.getTime() <= Date.now()) {
            next.setMonth(next.getMonth() + 1);
            next.setDate(day);
            if (next.getDate() !== day) next.setDate(day); // short-month repair
        }

        // Step 3: pathological guard — if still wrong (day=31 hitting back-to-back short months),
        // keep advancing until we land on a month that has the target day.
        let guard = 0;
        while (next.getDate() !== day && ++guard < 12) {
            next.setMonth(next.getMonth() + 1);
            next.setDate(day);
        }

        return next.getTime();
    }

    return midnight.getTime() + 86400000;
}

function shiftDeadline(dl, repeat) {
    if (!dl || dl.mode !== 'date') return dl;
    const base = new Date(dl.value + 'T00:00:00');
    if (repeat === 'daily')       base.setDate(base.getDate() + 1);
    else if (repeat === 'weekly') base.setDate(base.getDate() + 7);
    else if (repeat === 'weekdays') {
        do { base.setDate(base.getDate() + 1); } while ([0,6].includes(base.getDay()));
    }
    return { mode: 'date', value: base.toISOString().slice(0,10) };
}

function checkCycleResets() {
    // IMP-3: if a drag is in progress, defer until after drop rather than calling
    // render() mid-drag (which would destroy all Sortable instances including the
    // currently active one, causing the drag to hang/freeze).
    if (document.body.classList.contains('is-dragging')) {
        setTimeout(checkCycleResets, 600);
        return;
    }
    let changed = false;
    state.tasks.forEach(t => {
        if (t.cycleChecked) {
            // Guard: if nextReset is missing but task is cycle-checked, recompute it
            if (!t.nextReset) {
                t.nextReset = getNextResetTimestamp(t);
                changed = true;
            } else if (Date.now() >= t.nextReset) {
                t.cycleChecked = false;
                t.nextReset    = null;
                t.autoChecked  = false;   // parent's own cycle reset clears the auto-flag
                t.deadline     = shiftDeadline(t.deadline, t.repeat);
                changed = true;
            }
        }
        // Subtask cycle resets
        let subReset = false;
        (t.subtasks || []).forEach(s => {
            if (s.cycleChecked) {
                // Guard: if nextReset is missing, recompute from subtask repeat settings
                if (!s.nextReset) {
                    s.nextReset = getNextResetTimestamp(s);
                    changed = true;
                } else if (Date.now() >= s.nextReset) {
                    s.cycleChecked = false;
                    s.nextReset    = null;
                    changed = true;
                    subReset = true;
                }
            }
        });
        // Problem 5: a subtask returning to "active" must re-open a parent that was
        // auto-completed from its subtasks — otherwise it stays marked done until a
        // manual toggle. Mode-aware + uncheck-only (allowAutoCheck:false): a reset
        // can only *reduce* done-subs, so this never re-checks the parent or fights
        // the parent's own repeat; and a manually-checked parent is left untouched.
        if (subReset && (t.subtasks || []).length > 0) {
            if (_syncParentDone(t, { allowAutoCheck: false, subNowChecked: false }) !== 0) changed = true;
        }
    });
    if (changed) { saveState(); render(); }
}

function repeatLabel(r) {
    return { none:'Нет', daily:'Ежедневно', weekly:'Еженедельно', weekdays:'По будням', monthly:'Ежемесячно' }[r] || r;
}

// Returns human-readable "until …" text for a cycle-completed recurring task.
// Shown as a persistent label in the task UI (not a toast).
function formatCycleUntil(task) {
    const DAY_RU = ['вс','пн','вт','ср','чт','пт','сб'];

    // Build a human countdown from nextReset timestamp
    function countdown(ts) {
        const diff = ts - Date.now();
        if (diff <= 0) return null;
        const totalMin = Math.floor(diff / 60000);
        const totalH   = Math.floor(diff / 3600000);
        const days     = Math.floor(diff / 86400000);
        const hours    = totalH % 24;
        const mins     = totalMin % 60;
        const parts = [];
        if (days  > 0) parts.push(`${days}д`);
        if (hours > 0) parts.push(`${hours}ч`);
        if (mins  > 0 && days === 0) parts.push(`${mins}м`); // show minutes only when <1 day
        return parts.length ? parts.join(' ') : '<1м';
    }

    if (task.repeat === 'daily') {
        if (task.nextReset) {
            const cd = countdown(task.nextReset);
            return cd ? `до завтра · ${cd}` : 'до завтра';
        }
        return 'до завтра';
    }
    if (task.repeat === 'weekdays') {
        if (task.nextReset) {
            const d  = new Date(task.nextReset);
            const cd = countdown(task.nextReset);
            const day = DAY_RU[d.getDay()];
            return cd ? `до ${day} · ${cd}` : `до ${day}`;
        }
        return 'до следующего рабочего дня';
    }
    if (task.repeat === 'weekly') {
        if (task.nextReset) {
            const d   = new Date(task.nextReset);
            const day = DAY_RU[d.getDay()];
            const dt  = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            const cd  = countdown(task.nextReset);
            return cd ? `до ${day}, ${dt} · ${cd}` : `до ${day}, ${dt}`;
        }
        return 'до следующей недели';
    }
    if (task.repeat === 'monthly') {
        if (task.nextReset) {
            const d  = new Date(task.nextReset);
            const dt = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
            const cd = countdown(task.nextReset);
            return cd ? `до ${dt} · ${cd}` : `до ${dt}`;
        }
        return 'до следующего месяца';
    }
    if (task.nextReset) {
        const d  = new Date(task.nextReset);
        const dt = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        const cd = countdown(task.nextReset);
        return cd ? `до ${dt} · ${cd}` : `до ${dt}`;
    }
    return 'цикл завершён';
}

// ---- Archive ops ----
function restoreTask(id) {
    const item = state.archive.find(a => a.id === id);
    if (!item) return;

    // Problem 1: animate the archive item sliding LEFT before removing it.
    // State mutation + saveState happen immediately; render/switchPage deferred
    // until animationend so the animation actually plays (same pattern as removeTask).
    const li = document.querySelector(`.archive-item[data-id="${id}"]`);

    // Mutate state immediately
    pushUndo();
    state.tasks.push(taskFromArchive(item));
    _newTaskIds.add(item.id);
    state.archive = state.archive.filter(a => a.id !== id);
    updateArchiveBadge();

    const doTransition = () => {
        render();
        renderArchive();
        showToast('Задача восстановлена');
        setTimeout(() => switchPage('main'), 260);
    };

    if (li && !prefersReducedMotion()) {
        // FIX-ARCHIVE: guard against double-invocation.
        // animationend fires → doTransition() → renderArchive() wipes the DOM.
        // The old `li` stays in memory WITH '.restoring' still set, so the
        // 500ms fallback would see contains('restoring')===true and run
        // doTransition() a second time, scheduling a second switchPage('main')
        // that kicks the user out of archive even if they navigated there manually.
        let _transitionCalled = false;
        const safeTransition = () => {
            if (_transitionCalled) return;
            _transitionCalled = true;
            li.classList.remove('restoring'); // prevent fallback from re-firing
            doTransition();
        };
        li.style.setProperty('--row-h', li.scrollHeight + 'px'); // S1-1: real height for exit anim
        li.classList.add('restoring');
        li.addEventListener('animationend', safeTransition, { once: true });
        setTimeout(safeTransition, 500);
    } else {
        doTransition();
    }
}

function deleteFromArchive(id) {
    // C3-5: a single permanent delete from the archive must be undoable like
    // every other destructive action (the archive is the last safety net).
    pushUndo();
    const _arch = state.archive.find(a => a.id === id);
    if (_arch) addTombstone(_arch.uid, 'task');   // Idea 8: permanent delete from archive → tombstone
    state.archive = state.archive.filter(a => a.id !== id);
    saveState(); renderArchive(); updateArchiveBadge();
    showToast('Удалено из архива', { undo: true });
}

// C3-1: two-step confirm for wiping the whole archive — mirrors clearAll().
let _clearArchiveArmed = false;
let _clearArchiveTimer = null;

function clearArchive() {
    if (!state.archive.length) return;
    const btn = document.getElementById('btn-clear-archive');

    if (!_clearArchiveArmed) {
        // ── Arm ──
        _clearArchiveArmed = true;
        if (btn) { btn.classList.add('confirm-armed'); btn.title = 'Нажмите ещё раз — очистить весь архив'; }
        showToast('Нажмите ещё раз — очистить весь архив');
        _clearArchiveTimer = setTimeout(() => {
            _clearArchiveArmed = false;
            if (btn) { btn.classList.remove('confirm-armed'); btn.title = ''; }
        }, 3000);
        return;
    }
    // ── Fire ──
    clearTimeout(_clearArchiveTimer);
    _clearArchiveArmed = false;
    if (btn) { btn.classList.remove('confirm-armed'); btn.title = ''; }

    // C3-1: snapshot before wiping so the whole archive can be restored.
    pushUndo();
    selectMode = false; selectedArchiveIds.clear();
    const bar = document.getElementById('archive-select-bar');
    if (bar) bar.style.display = 'none';
    state.archive.forEach(a => addTombstone(a.uid, 'task'));   // Idea 8: tombstone every wiped archive task
    state.archive = [];
    saveState(); renderArchive(); updateArchiveBadge();
    showToast('Архив очищен', { undo: true });
}

// ============================================================
//  SUBTASK OPERATIONS
// ============================================================
// S1-5: run `cb` once when an element's max-height transition ends — OR after a
// fallback timeout if `transitionend` never fires (reduced-motion sets
// transition:none, or start==end height ⇒ no transition event). Returns a cancel()
// that detaches the listener + timer WITHOUT running cb (for rapid re-toggle).
function onMaxHeightEnd(el, cb, fallbackMs = 600) {
    let done = false;
    const onEnd = (e) => { if (e.propertyName === 'max-height') finish(); };
    const finish = () => {
        if (done) return; done = true;
        el.removeEventListener('transitionend', onEnd);
        clearTimeout(timer);
        cb();
    };
    const cancel = () => {
        if (done) return; done = true;
        el.removeEventListener('transitionend', onEnd);
        clearTimeout(timer);
    };
    el.addEventListener('transitionend', onEnd);
    const timer = setTimeout(finish, fallbackMs);
    return cancel;
}

function toggleSubtasksSection(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.subtasksOpen = !task.subtasksOpen;
    const sec = document.getElementById(`sub-section-${taskId}`);
    const btn = document.querySelector(`.btn-subtask-toggle[data-tid="${taskId}"]`);
    if (sec) {
        // S1-5: cancel any in-flight finisher before starting a new animation.
        if (sec._collapseCancel) { sec._collapseCancel(); sec._collapseCancel = null; }
        if (task.subtasksOpen) {
            sec.classList.add('open');
            // 7b: lazily attach subtask DnD now the section is visible (setupSortables
            // skips collapsed sections to avoid hundreds of idle Sortable instances).
            if ((task.subtasks || []).length) initSubSortable(taskId);
            // Animate to actual height, then release to 'none' so content can grow freely.
            const inner = sec.querySelector('.sub-section-inner');
            if (inner) {
                sec.style.maxHeight = inner.scrollHeight + 'px';
                sec._collapseCancel = onMaxHeightEnd(sec, () => {
                    sec._collapseCancel = null;
                    // Only unlock to 'none' if still open (not toggled back mid-animation)
                    if (task.subtasksOpen) sec.style.maxHeight = 'none';
                });
            }
        } else {
            // Collapse: pin the *current rendered* height first (not scrollHeight, which
            // ANIM-3: during a rapid toggle may reflect the full content height even while
            // an open animation is still in progress — causing a jump to full height before
            // collapsing). getComputedStyle reads the actual painted max-height value.
            const inner = sec.querySelector('.sub-section-inner');
            const currentMaxH = getComputedStyle(sec).maxHeight;
            // If currently 'none' (fully open), snapshot scrollHeight; otherwise use computed.
            sec.style.maxHeight = (currentMaxH === 'none' && inner)
                ? inner.scrollHeight + 'px'
                : currentMaxH;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    sec.style.maxHeight = '0';
                    sec.style.opacity = '0';
                });
            });
            sec._collapseCancel = onMaxHeightEnd(sec, () => {
                sec._collapseCancel = null;
                sec.classList.remove('open');
                sec.style.maxHeight = '';
                sec.style.opacity   = '';
            });
        }
    }
    if (btn) btn.classList.toggle('open', task.subtasksOpen);
    saveState();
}

function toggleSubNotesAlwaysOpen(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.subNotesAlwaysOpen = !task.subNotesAlwaysOpen;
    const sec = document.getElementById(`sub-section-${taskId}`);
    if (sec) sec.classList.toggle('notes-always-open', task.subNotesAlwaysOpen);
    // Open or close all has-note wrappers immediately via inline-style animation
    if (sec) {
        sec.querySelectorAll('.sub-note-wrapper.has-note').forEach(wrap => {
            if (task.subNotesAlwaysOpen) {
                wrap._dismissed = false;
                _openNoteWrap(wrap);
            } else {
                _closeNoteWrap(wrap);
                wrap._dismissed = false;
            }
        });
    }
    const btn = document.querySelector(`.btn-sub-notes-always[data-tid="${taskId}"]`);
    if (btn) {
        btn.classList.toggle('active', task.subNotesAlwaysOpen);
        btn.title = task.subNotesAlwaysOpen ? 'Скрыть все заметки' : 'Показать все заметки подпунктов';
    }
    saveState();
}

function addSubtask(taskId) {
    const task  = state.tasks.find(t => t.id === taskId);
    const input = document.getElementById(`sub-input-${taskId}`);
    if (!task || !input) return;
    const text = input.value.trim();
    if (!text) { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); return; }

    pushUndo();
    const sub = { id: state.nextSubId++, uid: uid(), text, checked: false, priority: 'none', note: '', order: task.subtasks.length, repeat: 'none', cycleChecked: false };
    task.subtasks.push(sub);

    // Problem 6: rebuild the whole list so the new item lands in the correct
    // place — including the active zone + 2-column grid when split mode is on
    // (a raw append broke the split layout and DnD). renderSubList re-inits DnD
    // and refreshes the toggle/progress counters.
    renderSubList(taskId);
    // Problem 5: gently animate just the newly inserted item in (other items keep
    // their place; in split mode this also overrides the blanket splitItemIn).
    if (!prefersReducedMotion()) {
        const newEl = document.querySelector(`.subtask-item[data-tid="${taskId}"][data-sid="${sub.id}"]`);
        if (newEl) {
            newEl.classList.add('sub-adding');
            newEl.addEventListener('animationend', () => newEl.classList.remove('sub-adding'), { once: true });
        }
    }
    input.value = '';
    input.focus();
    saveState();
    playSound('check');
}

function handleSubAdd(event, taskId) { if (event.key === 'Enter') addSubtask(taskId); }

// ── Parent ⇄ subtasks auto-check ─────────────────────────────────────────────
// Effective mode for a task: its own override ('any'/'all') or the global default
// (state.subAnyMode → 'any', else 'all'). 'inherit'/undefined fall through to global.
function _subCheckMode(task) {
    const m = task && task.subCheckMode;
    if (m === 'any' || m === 'all') return m;
    return state.subAnyMode ? 'any' : 'all';
}
// Auto-check / auto-uncheck the parent from its subtasks under the effective mode.
// "Respect manual": auto-sync only manages a parent it auto-checked itself
// (task.autoChecked) — a manually-marked parent is never auto-uncleared.
//   allowAutoCheck:false → uncheck-direction only (used by cycle resets so a
//   subtask returning to active never *re-checks* the parent or fights its own repeat).
// Returns 1 (auto-checked), -1 (auto-unchecked) or 0 (no change).
function _syncParentDone(task, { allowAutoCheck, subNowChecked }) {
    const subs = task.subtasks || [];
    if (!subs.length) return 0;
    const mode        = _subCheckMode(task);
    const isRecurring = task.repeat && task.repeat !== 'none';
    const isDone      = isRecurring ? !!task.cycleChecked : !!task.checked;
    const doCheck = () => {
        if (isRecurring) { task.cycleChecked = true; task.nextReset = getNextResetTimestamp(task); }
        else             { task.checked = true; }
        task.autoChecked = true; return 1;
    };
    const doUncheck = () => {
        if (isRecurring) { task.cycleChecked = false; task.nextReset = null; }
        else             { task.checked = false; }
        task.autoChecked = false; return -1;
    };

    if (mode === 'any') {
        // Action-driven: a sub turning ON checks the parent; a sub turning OFF
        // unchecks it even while OTHER subs stay checked. With no direction given
        // (a mode switch) fall back to "is any sub done?".
        if (subNowChecked === true)  return (!isDone && allowAutoCheck) ? doCheck() : 0;
        if (subNowChecked === false) return ( isDone && task.autoChecked) ? doUncheck() : 0;
        const anyDone = subs.some(s => s.checked || s.cycleChecked);
        if ( anyDone && !isDone && allowAutoCheck)   return doCheck();
        if (!anyDone &&  isDone && task.autoChecked) return doUncheck();
        return 0;
    }
    // 'all' mode — state-driven: parent done iff every sub is done.
    const allDone = subs.every(s => s.checked || s.cycleChecked);
    if ( allDone && !isDone && allowAutoCheck)   return doCheck();
    if (!allDone &&  isDone && task.autoChecked) return doUncheck();
    return 0;
}

function toggleSubtask(taskId, subId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const sub = task.subtasks.find(s => s.id === subId);
    if (!sub) return;
    pushUndo();

    // P6: subtask-level cycle repeat toggles cycleChecked (not checked).
    const subIsRecurring = sub.repeat && sub.repeat !== 'none';
    let subNowChecked;
    if (subIsRecurring) {
        sub.cycleChecked = !sub.cycleChecked;
        sub.checked = false;
        sub.nextReset = sub.cycleChecked ? getNextResetTimestamp(sub) : null;
        subNowChecked = sub.cycleChecked;
    } else {
        sub.checked = !sub.checked;
        subNowChecked = sub.checked;
    }

    // Mode-aware parent sync. V-5: single undo point (the snapshot above covers the
    // subtask toggle AND any parent auto-completion → one Ctrl+Z reverts both).
    const pc = _syncParentDone(task, { allowAutoCheck: true, subNowChecked });

    if (pc === 1)            { playSound('check'); vibrate(30); }   // parent auto-completed (single sound)
    else if (subNowChecked)  { playSound('check'); }

    if (pc !== 0) {
        // Auto-(un)check mode: the subtask toggle flipped the parent's done-state.
        saveState();
        const parentRecurring  = task.repeat && task.repeat !== 'none';
        const parentNowChecked = pc === 1;
        const reduced = prefersReducedMotion();
        const finishAllDone = () => {
            if (pc === 1) {
                const allFinished = state.tasks.length > 0 &&
                    state.tasks.every(t => t.checked || t.cycleChecked);
                if (allFinished) showAllDone();
            }
        };
        // After the in-place ritual + render, settle whichever rows survive the filter
        // into their new slot (recurring-complete → resonant cycle pulse, else fade-settle).
        const settleSurvivors = () => {
            if (reduced) return;
            const sEl = document.querySelector(`.subtask-item[data-tid="${taskId}"][data-sid="${subId}"]`);
            if (sEl) _animClassSelf(sEl, (subIsRecurring && subNowChecked) ? 'cycle-settling' : 'settling-in');
            const tEl = document.querySelector(`.task-item[data-id="${taskId}"]`);
            if (tEl) _animClassSelf(tEl, (parentNowChecked && parentRecurring) ? 'cycle-settling' : 'settling-in');
        };
        if (reduced) { render(); settleSurvivors(); finishAllDone(); return; }
        // Play a ritual SIMULTANEOUSLY on the triggering subtask AND the parent it
        // auto-(un)checked, on the CURRENT still-visible nodes, then render + settle —
        // so the move is seen in BOTH directions and even when the filter then hides them.
        //   recurring CHECK → coffin 360° spin; plain CHECK → seal-pulse;
        //   any UNCHECK     → cool release/unseal pulse (recurring uncheck never spins).
        const subEl  = document.querySelector(`.subtask-item[data-tid="${taskId}"][data-sid="${subId}"]`);
        const taskEl = document.querySelector(`.task-item[data-id="${taskId}"]`);
        let dur = 360;
        if (subEl) {
            if (subIsRecurring && subNowChecked) { _animClassSelf(subEl.querySelector('.sub-check'), 'cycle-spinning'); dur = Math.max(dur, 640); }
            else subEl.classList.add(subNowChecked ? 'check-pulse' : 'uncheck-pulse');
        }
        if (taskEl) {
            if (parentNowChecked && parentRecurring) { _animClassSelf(taskEl.querySelector('.task-check'), 'cycle-spinning'); dur = Math.max(dur, 640); }
            else taskEl.classList.add(parentNowChecked ? 'check-pulse' : 'uncheck-pulse');
        }
        setTimeout(() => { render(); settleSurvivors(); finishAllDone(); }, dur);
        return;
    }

    // Parent unchanged → re-sort just this sublist, fading the old slot out first
    // so the move reads smoothly in both normal and split layouts (problem 4).
    saveState();
    // Recurring subtask completing its cycle gets the same ritual as a recurring
    // task: a 360° spin on its coffin + a resonating card pulse (not the plain fade).
    if (subIsRecurring && subNowChecked) _animateSubCycleThenRefresh(taskId, subId);
    else                                 _animateSubThenRefresh(taskId, subId);
}

// Recurring-subtask cycle-complete: spin the sub's coffin, then rebuild and pulse
// the rebuilt card (mirrors the recurring-task path: cycleSpin + cycleCardSettle).
function _animateSubCycleThenRefresh(taskId, subId) {
    const checkEl = document.querySelector(`.subtask-item[data-tid="${taskId}"][data-sid="${subId}"] .sub-check`);
    if (!checkEl || (typeof prefersReducedMotion === 'function' && prefersReducedMotion())) {
        refreshSubtaskList(taskId);
        return;
    }
    let done = false;
    const finish = () => {
        if (done) return; done = true;
        refreshSubtaskList(taskId);
        const moved = document.querySelector(`.subtask-item[data-tid="${taskId}"][data-sid="${subId}"]`);
        if (moved) {
            moved.classList.add('cycle-settling');
            moved.addEventListener('animationend', () => moved.classList.remove('cycle-settling'), { once: true });
        }
    };
    checkEl.classList.add('cycle-spinning');
    checkEl.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 700); // safety net (spin ≈ --dur-ritual)
}

// Smoothly fades the toggled subtask's old node out, then rebuilds the list so
// it re-appears (with the existing enter animation) in its new active/done slot.
// Falls back to an immediate rebuild when motion is reduced or the node is gone.
function _animateSubThenRefresh(taskId, subId) {
    const itemEl = document.querySelector(`.subtask-item[data-tid="${taskId}"][data-sid="${subId}"]`);
    if (!itemEl || (typeof prefersReducedMotion === 'function' && prefersReducedMotion())) {
        refreshSubtaskList(taskId);
        return;
    }
    let done = false;
    const finish = () => {
        if (done) return; done = true;
        refreshSubtaskList(taskId);
        // Settle the moved subtask into its new slot (active/done split or reorder)
        // so it fades in rather than popping. Removed on animationend → next toggle re-animates.
        const moved = document.querySelector(`.subtask-item[data-tid="${taskId}"][data-sid="${subId}"]`);
        if (moved) {
            moved.classList.add('settling-in');
            moved.addEventListener('animationend', () => moved.classList.remove('settling-in'), { once: true });
        }
    };
    itemEl.classList.add('checking-out');
    itemEl.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 220); // safety net if animationend never fires
}

function deleteSubtask(taskId, subId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const commit = () => {
        pushUndo();
        const _sub = task.subtasks.find(s => s.id === subId);
        if (_sub) addTombstone(_sub.uid, 'subtask', task.uid);   // Idea 8 (also bumps the parent task's updatedAt via the auto-diff)
        task.subtasks = task.subtasks.filter(s => s.id !== subId);
        // Rebuild so split-zone counts/layout stay correct (problem 6).
        renderSubList(taskId);
        saveState();
    };
    // Problem 5: fade the item out before it's removed from state.
    const item = document.querySelector(`.subtask-item[data-tid="${taskId}"][data-sid="${subId}"]`);
    if (!item || prefersReducedMotion()) { commit(); return; }
    let done = false;
    const finish = () => { if (done) return; done = true; commit(); };
    item.classList.add('sub-removing');
    item.addEventListener('animationend', e => { if (e.target === item) finish(); }, { once: true });
    setTimeout(finish, 240); // safety net
}

// ── Idea 3: promote a subtask into a standalone task ─────────────────────────
function promoteSubtask(taskId, subId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const sub = task.subtasks.find(s => s.id === subId);
    if (!sub) return;
    pushUndo();
    const newId = state.nextId++;
    state.tasks.push({
        id: newId, uid: uid(), createdAt: nowTs(), updatedAt: nowTs(),
        text: sub.text, checked: !!sub.checked,
        priority: sub.priority || 'none', color: null,
        groupId: task.groupId,                 // inherit the parent's group
        deadline: sub.deadline ? JSON.parse(JSON.stringify(sub.deadline)) : null,  // P-E: carry the subtask's deadline up
        note: sub.note || '', noteOpen: false,
        order: state.tasks.length,
        repeat: sub.repeat || 'none',
        repeatAnchorTime:     sub.repeatAnchorTime     || null,
        repeatAnchorDay:      sub.repeatAnchorDay      || null,
        repeatAnchorMonthday: sub.repeatAnchorMonthday || null,
        cycleChecked: !!sub.cycleChecked, nextReset: sub.nextReset || null,
        subtasks: [], subtasksOpen: false, pinned: false,
    });
    _newTaskIds.add(newId);
    task.subtasks = task.subtasks.filter(s => s.id !== subId);
    saveState(); render();
    showToast('Подпункт стал задачей');
}

// ── Idea 3: demote a task into a subtask of another task ─────────────────────
// Overflow «…» on a task row — declutters the action row by holding the rarely
// used actions (template / duplicate / demote) behind one gothic trigger.
let _taskMoreAnchor = null;
function openTaskMoreMenu(event, id) {
    event.stopPropagation();
    _taskMoreAnchor = event.currentTarget;
    const task      = state.tasks.find(t => t.id === id);
    const canDemote = state.tasks.length > 1;
    const hasSubs   = task && (task.subtasks || []).length > 0;
    // Per-task sub-check selector — only meaningful when the task has subtasks. The
    // entry shows the effective mode's rosette variant; clicking opens the 3-option
    // compact selector (как везде / по любому / по всем).
    let subModeItem = '';
    if (hasSubs) {
        const eff = task.subCheckMode === 'any' ? IC.g4any
                  : task.subCheckMode === 'all' ? IC.g4all
                  : (state.subAnyMode ? IC.g4any : IC.g4all);
        subModeItem = `<button type="button" role="menuitem" onclick="_taskMore('submode', ${id})">${eff}<span>Чек по подпунктам</span></button>`;
    }
    _openFloatMenu(event.currentTarget, `
        <button type="button" role="menuitem" onclick="_taskMore('tpl', ${id})">${IC.template}<span>Сохранить как шаблон</span></button>
        <button type="button" role="menuitem" onclick="_taskMore('dup', ${id})">${IC.twinCoffin}<span>Дублировать задачу</span></button>
        ${subModeItem}
        ${canDemote ? `<button type="button" role="menuitem" onclick="_taskMore('demote', ${id})">${IC.demote}<span>Сделать подпунктом</span></button>` : ''}`,
        'task-more-menu');
}
function _taskMore(act, id) {
    const anchor = _taskMoreAnchor;
    closeFloatMenu();
    if (act === 'tpl')          saveTaskAsTemplate(id);
    else if (act === 'dup')     duplicateTask(id);
    else if (act === 'submode') _openSubModeMenu(anchor, id);
    else if (act === 'demote')  _openDemoteMenuAt(anchor, id);
}

// Per-task compact selector for "parent checks by subtasks" (3 options incl. inherit).
function _openSubModeMenu(anchorEl, id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const cur = (task.subCheckMode === 'any' || task.subCheckMode === 'all') ? task.subCheckMode : 'inherit';
    const opt = (val, icon, label) =>
        `<button type="button" role="menuitemradio" aria-checked="${cur === val}" class="submode-opt${cur === val ? ' on' : ''}" onclick="setTaskSubMode(${id}, '${val}')">${icon}<span>${label}</span></button>`;
    _openFloatMenu(anchorEl, `
        <div class="float-menu-head">Чек родителя по подпунктам</div>
        ${opt('inherit', IC.g4,    'Как везде')}
        ${opt('any',     IC.g4any, 'По любому подпункту')}
        ${opt('all',     IC.g4all, 'По всем подпунктам')}`,
        'submode-menu');
}
function setTaskSubMode(id, mode) {
    closeFloatMenu();
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    pushUndo();
    task.subCheckMode = mode;   // 'inherit' | 'any' | 'all'
    _syncParentDone(task, { allowAutoCheck: true });   // re-evaluate parent under the new mode
    saveState(); render();
}

// Global compact selector (2 options) for the default sub-check mode.
function openSubAnyModeMenu(event) {
    event.stopPropagation();
    const cur = state.subAnyMode ? 'any' : 'all';
    const opt = (val, icon, label) =>
        `<button type="button" role="menuitemradio" aria-checked="${cur === val}" class="submode-opt${cur === val ? ' on' : ''}" onclick="setGlobalSubMode('${val}')">${icon}<span>${label}</span></button>`;
    _openFloatMenu(event.currentTarget, `
        <div class="float-menu-head">Чек родителя по подпунктам</div>
        ${opt('all', IC.g4all, 'По всем подпунктам')}
        ${opt('any', IC.g4any, 'По любому подпункту')}`,
        'submode-menu');
}
function setGlobalSubMode(val) {
    closeFloatMenu();
    pushUndo();
    state.subAnyMode = (val === 'any');
    // Re-evaluate every task that inherits the global default under the new mode.
    state.tasks.forEach(t => {
        if (t.subCheckMode !== 'any' && t.subCheckMode !== 'all') _syncParentDone(t, { allowAutoCheck: true });
    });
    updateSubAnyModeBtn();
    saveState(); render();
}
function updateSubAnyModeBtn() {
    const b = document.getElementById('btn-sub-anymode');
    if (!b) return;
    // Default (all) is the baseline → not "active"; "any" is the engaged state.
    b.classList.toggle('active', !!state.subAnyMode);
    b.innerHTML = state.subAnyMode ? IC.g4any : IC.g4all;
    b.title = state.subAnyMode
        ? 'Родитель чекается по любому подпункту'
        : 'Родитель чекается по всем подпунктам';
}

function openDemoteMenu(event, id) {
    event.stopPropagation();
    _openDemoteMenuAt(event.currentTarget, id);
}
let _demoteAnchor = null;
// Anchored variant so the "…" overflow menu can re-open it on its own trigger.
// Candidates are bucketed by group (incl. «Без группы»); a section header renders
// only for a group that actually holds a candidate, and only when ≥2 buckets exist
// (a lone ungrouped list stays flat).
function _openDemoteMenuAt(anchorEl, id) {
    const candidates = state.tasks.filter(t => t.id !== id && !t.checked && !t.cycleChecked);
    if (!candidates.length) { showToast('Нет другой задачи для вложения'); return; }
    _demoteAnchor = anchorEl;

    const sections = [];
    const ungrouped = candidates.filter(t => !t.groupId);
    if (ungrouped.length) sections.push({ name: 'Без группы', items: ungrouped });
    state.groups.forEach(g => {
        const items = candidates.filter(t => t.groupId === g.id);
        if (items.length) sections.push({ name: g.name, items });
    });
    const showHeaders = !(sections.length === 1 && sections[0].name === 'Без группы');

    let html = '<div class="float-menu-head">В подпункт к…</div>';
    let shown = 0;
    for (const sec of sections) {
        if (shown >= 40) break;
        if (showHeaders) html += `<div class="demote-group-head">${escHtml(sec.name)}</div>`;
        for (const t of sec.items) {
            if (shown >= 40) break;
            html += `<button type="button" role="menuitem" onclick="_pickDemoteTarget(${id}, ${t.id})"><span class="float-menu-name">${escHtml(t.text)}</span></button>`;
            shown++;
        }
    }
    _openFloatMenu(anchorEl, html, 'demote-menu');
}

// When the source task carries its own subtasks, ask whether to drop them (default)
// or carry them alongside; otherwise demote straight away.
function _pickDemoteTarget(id, targetId) {
    const task = state.tasks.find(t => t.id === id);
    if (task && (task.subtasks || []).length > 0) {
        const anchor = _demoteAnchor;
        closeFloatMenu();
        _openFloatMenu(anchor, `
            <div class="float-menu-head">Подпункты задачи…</div>
            <button type="button" role="menuitem" onclick="demoteTask(${id}, ${targetId}, true)"><span>Отбросить</span></button>
            <button type="button" role="menuitem" onclick="demoteTask(${id}, ${targetId}, false)"><span>Перенести рядом</span></button>`,
            'demote-subs-menu');
    } else {
        demoteTask(id, targetId, true);
    }
}

function demoteTask(id, targetId, dropSubs) {
    closeFloatMenu();
    const task   = state.tasks.find(t => t.id === id);
    const target = state.tasks.find(t => t.id === targetId);
    if (!task || !target || id === targetId) return;
    pushUndo();
    const hadSubs = (task.subtasks || []).length > 0;
    const base = target.subtasks.length;
    target.subtasks.push({
        id: state.nextSubId++, uid: uid(), text: task.text, checked: !!task.checked,
        priority: task.priority || 'none', note: task.note || '', order: base,
        deadline: task.deadline ? JSON.parse(JSON.stringify(task.deadline)) : null,  // P-E: carry the task's deadline down
        repeat: task.repeat || 'none',
        repeatAnchorTime:     task.repeatAnchorTime     || null,
        repeatAnchorDay:      task.repeatAnchorDay      || null,
        repeatAnchorMonthday: task.repeatAnchorMonthday || null,
        cycleChecked: !!task.cycleChecked, nextReset: task.nextReset || null,
    });
    // Subtasks can't nest. dropSubs (default) discards the demoted task's own
    // subtasks; otherwise flatten them alongside it under the target.
    if (!dropSubs) {
        (task.subtasks || []).forEach((s, i) => {
            target.subtasks.push({ ...s, id: state.nextSubId++, uid: uid(), order: base + 1 + i });
        });
    }
    target.subtasksOpen = true;
    addTombstone(task.uid, 'task');   // Idea 8: the demoted task entity is gone (became a subtask) — tombstone so a merge can't resurrect it
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState(); render();
    showToast(dropSubs && hadSubs ? 'Задача стала подпунктом · подпункты отброшены' : 'Задача стала подпунктом',
              hadSubs ? { undo: true } : undefined);
}

function cycleSubPriority(taskId, subId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const sub = task.subtasks.find(s => s.id === subId);
    if (!sub) return;
    const cycle = ['none', 'low', 'medium', 'high'];
    sub.priority = cycle[(cycle.indexOf(sub.priority || 'none') + 1) % cycle.length];
    // Re-sort subtasks by new priority and refresh list (handles split layout).
    const sorted = sortSubtasks(task.subtasks);
    sorted.forEach((s, i) => { s.order = i; });
    renderSubList(taskId);
    saveState();
}

function toggleSubSplitDone(hdr, key) {
    const collapsed = hdr.classList.toggle('collapsed');
    localStorage.setItem(key, collapsed ? '1' : '0');
    const wrap = hdr.nextElementSibling;
    if (wrap && wrap.classList.contains('sub-split-done-wrap')) {
        wrap.classList.toggle('collapsed', collapsed);
    }
}

function toggleSubSplitActive(hdr, key) {
    const collapsed = hdr.classList.toggle('collapsed');
    localStorage.setItem(key, collapsed ? '1' : '0');
    const wrap = hdr.nextElementSibling;
    if (wrap && wrap.classList.contains('sub-split-active-wrap')) {
        wrap.classList.toggle('collapsed', collapsed);
    }
}

// P6: cycle subtask repeat (none → daily → weekly → weekdays → none)
// openSubRepeatModal — opens the shared repeat-modal for a subtask.
// Mirrors openRepeatModal() for main tasks; editingSubId tracks the target.
function openSubRepeatModal(taskId, subId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const sub = task.subtasks.find(s => s.id === subId);
    if (!sub) return;
    editingTaskId = taskId;
    editingSubId  = subId;
    const cur = sub.repeat || 'none';
    document.querySelectorAll('#modal-repeat-selector .repeat-modal-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.repeat === cur)
    );
    _populateRepeatAnchor(cur, sub.repeatAnchorTime || '', parseInt(sub.repeatAnchorDay) || 0, parseInt(sub.repeatAnchorMonthday) || 0);
    openModalWithFocus('repeat-modal');
}

// P-E: open the shared deadline modal targeting a subtask (mirrors openSubRepeatModal).
// editingTaskId + editingSubId are set inside openDeadlineModal via its subId param.
function openSubDeadlineModal(taskId, subId) {
    openDeadlineModal(taskId, false, subId);
}

// P-E: clear a subtask's deadline (mirrors clearTaskDeadline, + pushUndo so Ctrl+Z restores it).
function clearSubDeadline(taskId, subId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const sub = task.subtasks.find(s => s.id === subId);
    if (!sub || !sub.deadline) return;
    pushUndo();
    sub.deadline = null;
    saveState();
    renderSubList(taskId);
    showToast('Дедлайн снят');
}

// P8: delete subtask note — thin wrapper over the unified _noteDeleteClick.
function deleteSubNote(event, taskId, subId) {
    const wrap = document.getElementById(`subnote-${taskId}-${subId}`);
    _noteDeleteClick(event, wrap ? wrap.querySelector('.sub-note-text') : null);
}

function startSubEdit(event, taskId, subId) {
    event.stopPropagation();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const sub  = task.subtasks.find(s => s.id === subId);
    if (!sub) return;
    const span = event.target;
    if (span.contentEditable === 'true') return;
    span.contentEditable = 'true';
    span.spellcheck = false;
    span.textContent = sub.text;
    span.focus();
    // Attach plain-text paste directly here — attachPlainPasteHandlers() runs
    // before dblclick makes this element contenteditable, so it never catches it.
    span.addEventListener('paste', plainTextPaste, { once: false });
    const range = document.createRange(); range.selectNodeContents(span);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    // V-5: named handlers + a single cleanup so NOTHING leaks. The old anonymous keydown
    // listener was never removed (Escape left it attached and re-entry stacked more).
    const cleanup = () => {
        span.removeEventListener('paste', plainTextPaste);
        span.removeEventListener('blur', commit);
        span.removeEventListener('keydown', onKey);
    };
    const commit = () => {
        cleanup();
        span.contentEditable = 'false';
        const nw = span.textContent.trim();
        if (nw && nw !== sub.text) { pushUndo(); sub.text = nw; saveState(); }
        span.textContent = sub.text;
    };
    const onKey = e => {
        if (e.key === 'Enter') { e.preventDefault(); span.blur(); }   // → commit via blur
        else if (e.key === 'Escape') {
            e.preventDefault();
            cleanup();                       // revert without committing
            span.textContent = sub.text;
            span.contentEditable = 'false';
            span.blur();
        }
    };
    span.addEventListener('blur', commit, { once: true });
    span.addEventListener('keydown', onKey);
}

// ============================================================
//  UNIFIED INLINE NOTE SYSTEM (subtask + form subtask)
//  Context is resolved from the closest .subtask-item:
//    in-task → data-tid + data-sid    form → data-form-sub-idx
//  Collapse is a pure class toggle (.note-open) over the CSS
//  grid-template-rows 0fr↔1fr model — no inline-style bookkeeping.
//  At rest the note text is NON-editable so auto-links stay clickable;
//  dblclick / the note button enter edit mode (raw text), blur re-renders.
// ============================================================
const NOTE_MAX = 300;

// URLs → anchors (display only). Escapes first, so it's XSS-safe.
function linkifyNote(text) {
    return escHtml(text).replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="note-link">$1</a>'
    );
}
// Display HTML for a stored note value. During a search, highlight wins over
// links (mixing <mark> inside <a> would produce invalid nested markup).
function noteDisplayHTML(text) {
    if (!text) return '';
    if (searchQuery) return highlightSearch(escHtml(text), searchQuery);
    return linkifyNote(text);
}

// Resolve {kind, sub, item, …} from any element inside a .subtask-item.
function _noteCtx(el) {
    const item = el && el.closest ? el.closest('.subtask-item') : null;
    if (!item) return null;
    if (item.dataset.formSubIdx != null && item.dataset.formSubIdx !== '') {
        const idx = parseInt(item.dataset.formSubIdx);
        const sub = formSubtasks[idx];
        return sub ? { kind: 'form', idx, item, sub } : null;
    }
    const taskId = parseInt(item.dataset.tid);
    const subId  = parseInt(item.dataset.sid);
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return null;
    const sub = task.subtasks.find(s => s.id === subId);
    return sub ? { kind: 'sub', taskId, subId, item, sub, task } : null;
}

// Collapse helpers — pure class toggles. Names kept so every existing caller
// (hover handlers, always-open mode, toggle) keeps working unchanged.
function _openNoteWrap(wrap)  { if (wrap) { wrap.classList.add('note-open');    wrap._noteOpen = true;  } }
function _closeNoteWrap(wrap) { if (wrap) { wrap.classList.remove('note-open'); wrap._noteOpen = false; } }

// Enter edit mode: flatten links/marks back to raw text, enable editing, caret end.
function _noteEdit(el) {
    if (!el) return;
    const ctx = _noteCtx(el);
    if (!ctx) return;
    if (el.getAttribute('contenteditable') === 'true') { el.focus(); return; }
    el._noteCancel = false;
    // V-4: snapshot pre-edit state (in-task subtasks only) so an edit is one undo step
    // and Escape truly reverts; form subtasks aren't in `state`, so no undo there.
    el._noteOrig = ctx.sub.note || '';
    el._noteStateSnap = (ctx.kind === 'sub') ? JSON.stringify(state) : null;
    el.setAttribute('contenteditable', 'true');
    el.spellcheck = false;
    el.classList.add('editing');
    el.textContent = ctx.sub.note || '';
    el.focus();
    const range = document.createRange(); range.selectNodeContents(el); range.collapse(false);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    _noteCounter(el, (el.textContent || '').length);
}

// Char limit (truncate), live counter, debounced persist while typing.
function _noteInput(el) {
    let txt = el.textContent || '';
    if (txt.length > NOTE_MAX) {
        el.textContent = txt = txt.slice(0, NOTE_MAX);
        const range = document.createRange(); range.selectNodeContents(el); range.collapse(false);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    }
    _noteCounter(el, txt.length);
    clearTimeout(el._noteSaveT);
    el._noteSaveT = setTimeout(() => {
        const ctx = _noteCtx(el);
        if (ctx) _notePersist(ctx, (el.textContent || '').trim(), { keepEditing: true });
    }, 350);
}

// Unobtrusive counter near the limit (appears within the last 60 chars).
function _noteCounter(el, len) {
    const inner = el.closest('.sub-note-inner');
    if (!inner) return;
    let c = inner.querySelector('.sub-note-count');
    if (len >= NOTE_MAX - 60) {
        if (!c) { c = document.createElement('span'); c.className = 'sub-note-count'; inner.appendChild(c); }
        c.textContent = `${len}/${NOTE_MAX}`;
    } else if (c) {
        c.remove();
    }
}

// Enter = save (blur), Shift+Enter = newline, Esc = cancel (revert).
function _noteKeydown(e, el) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
    else if (e.key === 'Escape')          { e.preventDefault(); el._noteCancel = true; el.blur(); }
}

// Blur → finalize. Esc-cancel reverts; otherwise persist + render display (links).
function _noteCommit(el) {
    clearTimeout(el._noteSaveT);
    const ctx  = _noteCtx(el);
    const wrap = el.closest('.sub-note-wrapper');
    el.removeAttribute('contenteditable');
    el.classList.remove('editing');
    const inner = el.closest('.sub-note-inner');
    const counter = inner ? inner.querySelector('.sub-note-count') : null;
    if (counter) counter.remove();
    if (!ctx) return;

    if (el._noteCancel) {
        el._noteCancel = false;
        // V-4: revert a debounced autosave for in-task subtasks (form subs have no undo).
        // _notePersist with the original text also restores wrapper/button state.
        if (el._noteStateSnap != null && ctx.kind === 'sub' && ctx.sub.note !== el._noteOrig) _notePersist(ctx, el._noteOrig || '', {});
        el._noteStateSnap = null;
        el.innerHTML = noteDisplayHTML(ctx.sub.note || '');
        // create flow that was cancelled with nothing saved → collapse + clean up
        if (!ctx.sub.note && wrap && !wrap.classList.contains('has-note')) _closeNoteWrap(wrap);
        return;
    }
    const text = (el.textContent || '').trim().slice(0, NOTE_MAX);
    // V-4: one undo step for an in-task subtask note edit (form subs excluded).
    if (el._noteStateSnap != null && ctx.kind === 'sub' && text !== (el._noteOrig || '')) pushUndoSnapshot(el._noteStateSnap);
    el._noteStateSnap = null;
    _notePersist(ctx, text, { keepEditing: false });
    el.innerHTML = noteDisplayHTML(text);
}

// Write the note to state/formSubtasks and sync wrapper class + toggle button.
// keepEditing (debounced mid-typing): never rebuild the editable element's HTML
// and never collapse on a transient empty value.
function _notePersist(ctx, text, opts = {}) {
    ctx.sub.note = text;
    const wrap      = ctx.item.querySelector('.sub-note-wrapper');
    const toggleBtn = ctx.item.querySelector('.btn-sub-note-toggle');
    if (toggleBtn) {
        toggleBtn.classList.toggle('has-note', !!text);
        toggleBtn.title = text ? 'Редактировать заметку' : 'Добавить заметку';
        toggleBtn.innerHTML = text ? IC.editNote : IC.addNote;
    }
    if (wrap) {
        if (text) {
            wrap.classList.add('has-note', 'note-open');
            const inner = wrap.querySelector('.sub-note-inner') || wrap;
            if (!inner.querySelector('.btn-sub-note-delete')) {
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'btn-sub-note-delete';
                delBtn.title = 'Удалить заметку';
                delBtn.innerHTML = IC.dagger;
                delBtn.addEventListener('click', e => _noteDeleteClick(e, inner.querySelector('.sub-note-text')));
                inner.appendChild(delBtn);
            }
        } else if (!opts.keepEditing) {
            wrap.classList.remove('has-note', 'note-open');
            const ex = wrap.querySelector('.btn-sub-note-delete');
            if (ex) ex.remove();
        }
    }
    if (ctx.kind === 'sub') {
        saveState();
        updateSubNotesAlwaysBtn(ctx.taskId);
    }
}

// Delete the note (both contexts). Undoable for in-task subtasks.
function _noteDeleteClick(e, textEl) {
    if (e) e.stopPropagation();
    const ctx = _noteCtx(textEl || (e && e.currentTarget));
    if (!ctx) return;
    if (ctx.kind === 'sub') pushUndo();
    ctx.sub.note = '';
    const wrap = ctx.item.querySelector('.sub-note-wrapper');
    if (textEl) { textEl.removeAttribute('contenteditable'); textEl.classList.remove('editing'); textEl.innerHTML = ''; }
    if (wrap) {
        wrap.classList.remove('has-note', 'note-open');
        wrap._dismissed = false;
        const del = wrap.querySelector('.btn-sub-note-delete'); if (del) del.remove();
        const cnt = wrap.querySelector('.sub-note-count');      if (cnt) cnt.remove();
    }
    const toggleBtn = ctx.item.querySelector('.btn-sub-note-toggle');
    if (toggleBtn) { toggleBtn.classList.remove('has-note'); toggleBtn.title = 'Добавить заметку'; toggleBtn.innerHTML = IC.addNote; }
    if (ctx.kind === 'sub') { saveState(); updateSubNotesAlwaysBtn(ctx.taskId); }
}

// Shared toggle for the note button. For a note-less subtask it opens straight
// into edit (create flow); for an existing note it shows/hides (and commits if
// it was being edited).
function _noteToggle(wrap) {
    if (!wrap) return;
    const noteEl = wrap.querySelector('.sub-note-text');
    const open   = wrap.classList.contains('note-open');
    if (wrap.classList.contains('has-note')) {
        if (open) {
            if (noteEl && noteEl.getAttribute('contenteditable') === 'true') noteEl.blur();
            wrap._dismissed = true; _closeNoteWrap(wrap);
        } else {
            wrap._dismissed = false; _openNoteWrap(wrap); if (noteEl) _noteEdit(noteEl);
        }
    } else {
        // No saved note yet (create flow).
        if (open && noteEl && noteEl.getAttribute('contenteditable') === 'true') {
            noteEl.blur(); // commit in-progress text — collapses if empty, keeps if non-empty
        } else if (open) {
            _closeNoteWrap(wrap);
        } else {
            _openNoteWrap(wrap); if (noteEl) _noteEdit(noteEl);
        }
    }
}

// Thin context wrapper kept for the in-task note button's onclick.
function toggleSubNote(taskId, subId) {
    _noteToggle(document.getElementById(`subnote-${taskId}-${subId}`));
}

/**
 * Synchronise the "always-show notes" eye button presence in task-meta.
 * Called after saveSubNote / deleteSubNote (lightweight paths that skip render()).
 * - If at least one subtask now has a note → ensure button exists in DOM.
 * - If no subtask has a note anymore → remove button and deactivate the mode.
 */
function updateSubNotesAlwaysBtn(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const meta = document.querySelector(`.task-item[data-id="${taskId}"] .task-meta`);
    if (!meta) return;

    const hasSubNotes = (task.subtasks || []).some(s => s.note && s.note.trim());
    let btn = meta.querySelector(`.btn-sub-notes-always[data-tid="${taskId}"]`);

    if (hasSubNotes && !btn) {
        // Create button and insert immediately after the subtask-toggle button
        btn = document.createElement('button');
        btn.className = 'btn-sub-notes-always' + (task.subNotesAlwaysOpen ? ' active' : '');
        btn.dataset.tid = String(taskId);
        btn.title = task.subNotesAlwaysOpen ? 'Скрыть все заметки' : 'Показать все заметки подпунктов';
        btn.innerHTML = IC.gothEye;
        btn.addEventListener('click', () => toggleSubNotesAlwaysOpen(taskId));
        const subToggle = meta.querySelector(`.btn-subtask-toggle[data-tid="${taskId}"]`);
        if (subToggle) subToggle.insertAdjacentElement('afterend', btn);
        else meta.appendChild(btn);
    } else if (!hasSubNotes && btn) {
        // No notes left — deactivate mode and remove button
        if (task.subNotesAlwaysOpen) {
            task.subNotesAlwaysOpen = false;
            const sec = document.getElementById(`sub-section-${taskId}`);
            if (sec) sec.classList.remove('notes-always-open');
            saveState();
        }
        btn.remove();
    }
}

function updateSubProgressBar(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const wrap = document.querySelector(`#sub-section-${taskId} .sub-progress-bar-wrap`);
    if (!wrap) return;
    const total = task.subtasks.length;
    if (total === 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    // P6: count both checked and cycle-checked as done
    const done  = task.subtasks.filter(s => s.checked || s.cycleChecked).length;
    const pct   = Math.round(done / total * 100);
    const fill  = wrap.querySelector('.sub-progress-bar-fill');
    const lbl   = wrap.querySelector('.sub-progress-label');
    if (fill) fill.style.width = pct + '%';
    if (lbl)  lbl.textContent  = `${done}/${total}`;
}

function updateSubToggleBtn(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const btn = document.querySelector(`.btn-subtask-toggle[data-tid="${taskId}"]`);
    if (!btn) return;
    const cnt  = task.subtasks.length;
    // P6: count cycle-checked as done in toggle label too
    const done = task.subtasks.filter(s => s.checked || s.cycleChecked).length;
    btn.innerHTML = `${IC.sword}<span>подпункты${cnt > 0 ? ` ${done}/${cnt}` : ''}</span>`;
}

/**
 * Re-sort and re-render the subtask UL for a given task.
 * Called after any state change that affects sort order (check, priority, DnD).
 * Does NOT trigger a full page render — only rebuilds the UL innerHTML.
 */
function refreshSubtaskList(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    checkCycleResets(); // ensure any due resets are applied before rebuilding
    // renderSubList rebuilds the list for BOTH normal (2-column) and split
    // (active/done zones) layouts and re-inits DnD — problem 6. (If
    // checkCycleResets already triggered a full render this is a cheap no-op.)
    renderSubList(taskId);
}

function initSubSortable(taskId) {
    const ul = document.getElementById(`sub-list-${taskId}`);
    if (!ul) return;
    // sortableSubs[taskId] may hold a single instance (legacy) or an array
    // (split mode = one Sortable per active/done zone). Destroy them all.
    const _prev = sortableSubs[taskId];
    if (_prev) {
        (Array.isArray(_prev) ? _prev : [_prev]).forEach(s => { try { s.destroy(); } catch(e){} });
    }
    sortableSubs[taskId] = [];

    // ── Note hover: attach mouseenter/mouseleave DIRECTLY on each item ───────
    // We intentionally avoid mouseover/mouseout delegation here because those events
    // BUBBLE — every cursor movement between child elements re-fires mouseover on the
    // UL, causing _openNoteWrap to restart the animation from 0 repeatedly.
    // mouseenter/mouseleave fire exactly ONCE per item boundary crossing (no bubbling).
    ul.querySelectorAll('.subtask-item').forEach(item => {
        // Ensure _noteOpen is not stale from a previous render cycle — fresh DOM nodes
        // won't have it, but if initSubSortable is ever called without a full rebuild
        // the flag could be stuck at true, silently blocking the open guard.
        const noteWrap = item.querySelector('.sub-note-wrapper');
        if (noteWrap) noteWrap._noteOpen = false;
        item.addEventListener('mouseenter', () => {
            // notes-always-open mode: nothing to do, CSS handles visibility
            const sec = item.closest('.subtask-section');
            if (sec && sec.classList.contains('notes-always-open')) return;
            const wrap = item.querySelector('.sub-note-wrapper.has-note');
            if (wrap && !wrap._dismissed) _openNoteWrap(wrap);
        });
        item.addEventListener('mouseleave', () => {
            const sec = item.closest('.subtask-section');
            if (sec && sec.classList.contains('notes-always-open')) return;
            const wrap = item.querySelector('.sub-note-wrapper.has-note');
            if (!wrap) return;
            // Don't close if the note field is actively focused (user is editing)
            // NOTE: checking contentEditable === 'true' is WRONG — has-note wrappers
            // always render sub-note-text with contenteditable="true", so that check
            // would permanently block mouseleave from ever closing the note.
            const noteEl = wrap.querySelector('.sub-note-text');
            if (noteEl && document.activeElement === noteEl) return;
            _closeNoteWrap(wrap);
            wrap._dismissed = false; // reset so next hover is fresh
        });
    });
    // ─────────────────────────────────────────────────────────────────────────

    const activeOpts = {
        animation: 150,
        draggable: '.subtask-item:not(.checked):not(.cycle-checked)',
        delay: 120,
        delayOnTouchOnly: false,
        fallbackTolerance: 5,
        filter: '.sub-check, .sub-prio-btn, .sub-actions, .btn-sub-action, [contenteditable="true"], .sub-note-wrapper, .sub-deadline-badge, .sub-deadline-wrapper',
        preventOnFilter: false,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        group: { name: `subs-${taskId}`, pull: false, put: false },
        onEnd: (evt) => onSubDragEnd(evt, taskId),
    };

    if (ul.classList.contains('sub-split-mode')) {
        // Problem 6: in split mode the draggable items live inside the per-zone
        // .sub-split-inner grids — NOT as direct children of the UL. Attach a
        // Sortable to each grid so DnD works and the 2-column layout is preserved.
        const activeInner = ul.querySelector('.sub-split-active-wrap .sub-split-inner');
        const doneInner   = ul.querySelector('.sub-split-done-wrap .sub-split-inner');
        if (activeInner) sortableSubs[taskId].push(new Sortable(activeInner, activeOpts));
        // Done zone: reordering disabled (mirrors the task-level split lock).
        if (doneInner) sortableSubs[taskId].push(new Sortable(doneInner, {
            group: { name: `subs-done-${taskId}`, pull: false, put: false },
            disabled: true, sort: false, animation: 0,
        }));
    } else {
        sortableSubs[taskId].push(new Sortable(ul, activeOpts));
    }
}

function onSubDragEnd(evt, taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    // The drag container is the UL in normal mode, or the active .sub-split-inner
    // grid in split mode (problem 6). Read positions from wherever the item landed.
    const container = evt.to || evt.item.parentElement;
    if (!container) return;

    // Reorder — store DOM position as order
    const allItems = Array.from(container.querySelectorAll(':scope > .subtask-item'));
    allItems.forEach((el, i) => {
        const sid = parseInt(el.dataset.sid);
        const sub = task.subtasks.find(s => s.id === sid);
        if (sub) sub.order = i;
    });

    // Priority inference: 2-column grid, left=higher prio, top=higher prio
    // Grid position: col = idx % 2 (0=left, 1=right), row = Math.floor(idx/2)
    // The moved item should inherit priority from its grid neighbours
    const movedSid = parseInt(evt.item.dataset.sid);
    const movedSub = task.subtasks.find(s => s.id === movedSid);
    if (movedSub) {
        const idx = allItems.findIndex(el => parseInt(el.dataset.sid) === movedSid);
        // Look at neighbours in priority order: above-left, above-right, below-left, below-right
        const candidates = [idx - 2, idx - 1, idx + 1, idx + 2]
            .filter(i => i >= 0 && i < allItems.length);
        let newPrio = null;
        for (const ci of candidates) {
            const nSub = task.subtasks.find(s => s.id === parseInt(allItems[ci].dataset.sid));
            if (nSub && nSub.priority !== 'none') { newPrio = nSub.priority; break; }
        }
        if (newPrio !== null && newPrio !== movedSub.priority) {
            movedSub.priority = newPrio;
            evt.item.dataset.sprio = newPrio;
        }
    }

    // Re-sort by priority + order and re-render subtask list
    // saveState() intentionally called AFTER sortSubtasks updates order values below
    const sortedSubs = sortSubtasks(task.subtasks);
    sortedSubs.forEach((s, i) => { s.order = i; });
    renderSubList(taskId); // handles both normal + split layouts and re-inits DnD
    saveState();
}

// ============================================================
//  INLINE EDIT — task text
// ============================================================
function startInlineEdit(event, id) {
    event.stopPropagation();
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const span = document.querySelector(`.task-text[data-id="${id}"]`);
    if (!span) return;
    if (span.contentEditable === 'true') return; // already editing
    span.contentEditable = 'true';
    span.spellcheck = false;
    span.textContent = task.text;
    span.focus();
    const range = document.createRange(); range.selectNodeContents(span);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    const commit = () => {
        span.contentEditable = 'false';
        const nw = span.textContent.trim();
        if (nw && nw !== task.text) {
            pushUndo(); task.text = nw; saveState();
            render(); // only re-render when text actually changed
        } else {
            // Restore original rendered text (with hashtag highlights etc.) without full render
            span.innerHTML = highlightHashtags(escHtml(task.text));
        }
    };
    span.addEventListener('blur', commit, { once: true });
    span.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
        if (e.key === 'Escape') {
            span.removeEventListener('blur', commit);
            span.contentEditable = 'false';
            span.innerHTML = highlightHashtags(escHtml(task.text));
        }
    });
}

// ============================================================
//  TASK NOTE — unified inline editor (variant A "illuminated page").
//  Mirrors the subtask note UX (auto-links, Esc/Enter/Shift+Enter, char
//  limit + counter, debounced save, placeholder, search highlight) but on
//  the task model: one persistent panel toggled via noteOpen, plus the modal
//  as an optional full editor. Reuses the shared linkifyNote/noteDisplayHTML.
// ============================================================
const TASK_NOTE_MAX = 500;

// Meta "заметка" button: has note → show/hide panel (persist noteOpen);
// no note → reveal panel straight into inline edit (create flow).
function toggleTaskNote(id) {
    const task = state.tasks.find(t => t.id === id);
    const wrap = document.getElementById('note-wrapper-' + id);
    if (!task || !wrap) return;
    const btn    = document.getElementById('note-toggle-' + id);
    const noteEl = document.getElementById('note-' + id);
    // Editor open (create/edit in progress): the toggle acts as "finish & hide".
    // The button's onmousedown preventDefault keeps the caret in the field, so the
    // field is still contenteditable here — commit it (or cancel if empty), then
    // collapse. This avoids the blur-collapse + click-reopen double-fire.
    if (noteEl && noteEl.getAttribute('contenteditable') === 'true') {
        const hasText = !!(noteEl.textContent && noteEl.textContent.trim());
        if (!hasText) noteEl._noteCancel = true;   // empty → cancel cleanly
        noteEl.blur();                              // commit persists / cancels + collapses
        if (hasText) {                             // text saved → honour the hide intent
            task.noteOpen = false;
            wrap.classList.remove('visible');
            if (btn) { btn.classList.remove('open'); btn.title = 'Показать заметку'; }
            saveState();
        }
        return;
    }
    const hasNote = !!(task.note && task.note.trim());
    if (hasNote) {
        const willOpen = !wrap.classList.contains('visible');
        task.noteOpen = willOpen;
        wrap.classList.toggle('visible', willOpen);
        if (btn) { btn.classList.toggle('open', willOpen); btn.title = willOpen ? 'Скрыть заметку' : 'Показать заметку'; }
        saveState();
    } else {
        wrap.classList.add('visible');
        if (btn) btn.classList.add('open');
        _taskNoteEdit(noteEl);
    }
}

// Resolve {id, task, item, wrap} from any element inside a .task-item.
function _taskNoteCtx(el) {
    const item = el && el.closest ? el.closest('.task-item') : null;
    if (!item) return null;
    const id = parseInt(item.dataset.id);
    const task = state.tasks.find(t => t.id === id);
    return task ? { id, task, item, wrap: item.querySelector('.task-note-wrapper') } : null;
}

// Enter edit mode: flatten links back to raw text, enable editing, caret to end.
function _taskNoteEdit(el) {
    if (!el) return;
    const ctx = _taskNoteCtx(el);
    if (!ctx) return;
    if (el.getAttribute('contenteditable') === 'true') { el.focus(); return; }
    el._noteCancel = false;
    // V-4: snapshot pre-edit state so the whole edit is ONE undo step and Escape can truly
    // revert — the debounced autosave already mutates note text mid-edit.
    el._noteOrig = ctx.task.note || '';
    el._noteStateSnap = JSON.stringify(state);
    el.setAttribute('contenteditable', 'true');
    el.spellcheck = false;
    el.classList.add('editing');
    el.textContent = ctx.task.note || '';
    el.focus();
    const range = document.createRange(); range.selectNodeContents(el); range.collapse(false);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    _taskNoteCounter(el, (el.textContent || '').length);
}

// Char limit (truncate) + live counter + debounced save while typing.
function _taskNoteInput(el) {
    let txt = el.textContent || '';
    if (txt.length > TASK_NOTE_MAX) {
        el.textContent = txt = txt.slice(0, TASK_NOTE_MAX);
        const range = document.createRange(); range.selectNodeContents(el); range.collapse(false);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    }
    _taskNoteCounter(el, txt.length);
    clearTimeout(el._noteSaveT);
    el._noteSaveT = setTimeout(() => {
        const ctx = _taskNoteCtx(el);
        if (ctx) { ctx.task.note = (el.textContent || '').trim(); saveState(); }
    }, 350);
}

function _taskNoteCounter(el, len) {
    const wrap = el.closest('.task-note-wrapper');
    if (!wrap) return;
    let c = wrap.querySelector('.task-note-count');
    if (len >= TASK_NOTE_MAX - 80) {
        if (!c) { c = document.createElement('span'); c.className = 'task-note-count'; wrap.appendChild(c); }
        c.textContent = `${len}/${TASK_NOTE_MAX}`;
    } else if (c) { c.remove(); }
}

// Enter = save (blur), Shift+Enter = newline, Esc = cancel (revert).
function _taskNoteKeydown(e, el) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
    else if (e.key === 'Escape')          { e.preventDefault(); el._noteCancel = true; el.blur(); }
}

// Blur → finalize. Esc-cancel reverts; otherwise persist + render display (links).
function _taskNoteCommit(el) {
    clearTimeout(el._noteSaveT);
    const ctx  = _taskNoteCtx(el);
    el.removeAttribute('contenteditable');
    el.classList.remove('editing');
    const wrap = el.closest('.task-note-wrapper');
    const counter = wrap ? wrap.querySelector('.task-note-count') : null;
    if (counter) counter.remove();
    if (!ctx) return;
    if (el._noteCancel) {
        el._noteCancel = false;
        // V-4: a debounced autosave may have already written the typed value — revert it.
        if (el._noteStateSnap != null && ctx.task.note !== el._noteOrig) { ctx.task.note = el._noteOrig || ''; saveState(); }
        el._noteStateSnap = null;
        el.innerHTML = noteDisplayHTML(ctx.task.note || '');
        if (!(ctx.task.note && ctx.task.note.trim())) {
            // empty create flow cancelled → collapse panel
            ctx.task.noteOpen = false;
            if (wrap) { wrap.classList.remove('visible'); }
            const btn = document.getElementById('note-toggle-' + ctx.id);
            if (btn) btn.classList.remove('open');
        }
        return;
    }
    const text = (el.textContent || '').trim().slice(0, TASK_NOTE_MAX);
    // V-4: one undo step from the pre-edit snapshot (the live note may already equal
    // `text` because the debounce persisted it, which previously skipped pushUndo).
    if (el._noteStateSnap != null && text !== (el._noteOrig || '')) pushUndoSnapshot(el._noteStateSnap);
    el._noteStateSnap = null;
    _taskNotePersist(ctx, text);
    el.innerHTML = noteDisplayHTML(text);
}

// Write the note + sync panel state and both note buttons (no full re-render).
function _taskNotePersist(ctx, text) {
    ctx.task.note = text;
    const wrap = ctx.wrap;
    if (wrap) {
        wrap.classList.toggle('has-note', !!text);
        if (text) { wrap.classList.add('visible'); ctx.task.noteOpen = true; }
        else      { wrap.classList.remove('visible'); ctx.task.noteOpen = false; }
        const del = document.getElementById('note-del-' + ctx.id);
        if (del) del.style.display = text ? '' : 'none';
    }
    const tgl = document.getElementById('note-toggle-' + ctx.id);
    if (tgl) { tgl.classList.toggle('open', !!text); tgl.title = text ? 'Скрыть заметку' : 'Добавить заметку'; }
    const mbtn = document.getElementById('note-modal-btn-' + ctx.id);
    if (mbtn) {
        mbtn.classList.toggle('edit-note-btn', !!text);
        mbtn.innerHTML = text ? IC.editNote : IC.addNote;
        mbtn.title = text ? 'Изменить заметку в окне' : 'Заметка в окне';
        mbtn.setAttribute('onclick', text ? `openEditNoteModal(${ctx.id})` : `openNoteModal(${ctx.id})`);
    }
    saveState();
}

function openNoteModal(id) {
    editingTaskId = id;
    document.getElementById('note-modal-input').value = '';
    document.getElementById('note-modal').querySelector('.modal-title').textContent = 'Добавить заметку';
    openModalWithFocus('note-modal');
}

function openEditNoteModal(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    editingTaskId = id;
    document.getElementById('note-modal-input').value = task.note || '';
    document.getElementById('note-modal').querySelector('.modal-title').textContent = 'Изменить заметку';
    openModalWithFocus('note-modal');
    // Select text after focus trap moves focus in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const inp = document.getElementById('note-modal-input');
            if (inp) { inp.focus(); inp.select(); }
        });
    });
}

function closeNoteModal(event) {
    if (!event || event.target === document.getElementById('note-modal')) {
        const id = editingTaskId;
        closeModalWithAnim('note-modal', () => { editingTaskId = null; });
        // editingTaskId cleared in callback; nullify immediately too so callers see it
        if (!event) editingTaskId = null;
    }
}

function confirmNote() {
    const task = state.tasks.find(t => t.id === editingTaskId);
    if (!task) { closeNoteModal(); return; }
    const val = document.getElementById('note-modal-input').value.trim();
    if (!val) { closeNoteModal(); return; }
    pushUndo();
    task.note = val;
    // If note is now set, ensure it's open
    task.noteOpen = true;
    saveState(); render();
    closeNoteModal();
    showToast('Заметка сохранена');
}

// Delete the task note (from the panel dagger). Undoable; full re-render.
function _taskNoteDelete(event, id) {
    if (event) event.stopPropagation();
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    pushUndo(); task.note = ''; task.noteOpen = false;
    saveState(); render();
    showToast('Заметка удалена', { undo: true });
}

// ============================================================
function plainTextPaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    if (!text) return;
    // Selection API replacement for deprecated document.execCommand('insertText').
    // Works in all modern browsers including Firefox where execCommand is unreliable.
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    sel.deleteFromDocument();
    const node = document.createTextNode(text);
    sel.getRangeAt(0).insertNode(node);
    // Move cursor to end of inserted text
    sel.collapse(node, node.length);
}

/** Attach plain-text paste to all contenteditable note fields after render. */
function attachPlainPasteHandlers() {
    document.querySelectorAll('.task-note-text, .sub-note-text, .sub-text[contenteditable="true"]')
        .forEach(el => {
            el.removeEventListener('paste', plainTextPaste);
            el.addEventListener('paste', plainTextPaste);
        });
}

// Also attach to note modal textarea
document.getElementById('note-modal-input').addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    const ta = e.target;
    const start = ta.selectionStart, end = ta.selectionEnd;
    ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
    ta.selectionStart = ta.selectionEnd = start + text.length;
});

function deleteTaskForever(id) {
    pushUndo();
    // ── Atomic state mutation (race-condition fix) ────────────────
    // Task removed from state synchronously before animation starts.
    // A Ctrl+Z fired during the 280 ms collapse animation correctly
    // restores the full snapshot — animationend only cleans up DOM.
    const _t = state.tasks.find(t => t.id === id);
    if (_t) addTombstone(_t.uid, 'task');   // Idea 8: permanent delete → tombstone
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
    // ─────────────────────────────────────────────────────────────

    const li = document.querySelector(`.task-item[data-id="${id}"]`);
    if (li) {
        // Use removing-forever (vertical collapse) — semantically distinct from archive slide
        li.style.setProperty('--row-h', li.scrollHeight + 'px'); // S1-1: real height for exit anim
        li.classList.add('removing-forever');
        li.addEventListener('animationend', () => {
            render(); // DOM cleanup only — state already updated above
        }, { once: true });
    } else {
        render();
    }
    showToast('Задача удалена навсегда', { undo: true });
}

// ============================================================
//  PRIORITY MODAL
// ============================================================
// V-1: priority and the colour label are mutually-exclusive accents (agreed invariant).
// Every EXPLICIT priority/colour change routes through these single chokepoints so the
// pair can never both be set. (Drag priority-inheritance instead opts colour-labelled
// tasks out — see applyPriorityInheritance — so a reorder never silently drops a colour.)
function _setTaskPriority(task, p) {
    task.priority = p || 'none';
    if (task.priority !== 'none') task.color = null;
}
function _setTaskColor(task, c) {
    task.color = c || null;
    if (task.color) task.priority = 'none';
}

function openPrioModal(id) {
    editingTaskId = id;
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    document.querySelectorAll('#modal-prio-selector .prio-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.prio === (task.priority || 'none'))
    );
    openModalWithFocus('prio-modal');
}

function closePrioModal(event) {
    if (!event || event.target === document.getElementById('prio-modal')) {
        closeModalWithAnim('prio-modal', () => { editingTaskId = null; });
        if (!event) editingTaskId = null;
    }
}

document.getElementById('modal-prio-selector').addEventListener('click', e => {
    const btn = e.target.closest('.prio-btn');
    if (!btn) return;
    const task = state.tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    pushUndo(); _setTaskPriority(task, btn.dataset.prio);
    saveState(); renderListOnly(); closePrioModal(); // 7b: priority reorders the list only
    showToast('Приоритет изменён');
});

// ─── Task color modal ────────────────────────────────────────────────────────
// п.9: a grimoire note reuses the very same colour modal (presets + RGB spectrum +
// "без цвета"). This flag routes _commitColorChoice / close back to the note.
let noteColorActive = false;
let grimBulkColorActive = false;   // cross-app #7: task-color-modal acting on the whole note selection
let editingNoteColorId = null;
function openGrimColorModal(id) {
    const note = (state.notes || []).find(n => n.id === id);
    if (!note) return;
    noteColorActive = true; grimBulkColorActive = false; bulkColorActive = false; formColorActive = false; editingTaskId = null;
    editingNoteColorId = id;
    document.querySelectorAll('#task-color-picker .color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color === (note.color || ''))
    );
    _grgbSyncFromColor(note.color, 'task');   // reuse the task-color-modal spectrum scope
    openModalWithFocus('task-color-modal');
}

// cross-app #7: open the shared colour modal for the whole ticked note selection.
function openGrimBulkColorModal() {
    if (!grimSelectedIds.size) return;
    grimBulkColorActive = true;
    noteColorActive = false; bulkColorActive = false; formColorActive = false; editingTaskId = null; editingNoteColorId = null;
    document.querySelectorAll('#task-color-picker .color-swatch').forEach(s => s.classList.remove('active'));
    _grgbSyncFromColor(null, 'task');   // bulk has no single current colour — show the default gothic violet
    openModalWithFocus('task-color-modal');
}

function openTaskColorModal(id) {
    editingTaskId = id;
    bulkColorActive = false;   // P-D: normal per-task open clears any stale bulk flag
    formColorActive = false;
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    // Highlight current colour in picker
    document.querySelectorAll('#task-color-picker .color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color === (task.color || ''))
    );
    _grgbSyncFromColor(task.color, 'task'); // seed the spectrum from the task's current colour
    openModalWithFocus('task-color-modal');
}

// Opened from the creation form's "свой цвет" crystal — the modal writes back into
// selectedFormColor (no task exists yet) and reuses the same presets + spectrum.
function openFormColorModal() {
    formColorActive = true;
    bulkColorActive = false;
    editingTaskId = null;
    document.querySelectorAll('#task-color-picker .color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color === (selectedFormColor || ''))
    );
    _grgbSyncFromColor(selectedFormColor, 'task');
    openModalWithFocus('task-color-modal');
}

function closeTaskColorModal(event) {
    if (!event || event.target === document.getElementById('task-color-modal')) {
        bulkColorActive = false;   // P-D: cancelling bulk must not leak into the next open
        formColorActive = false;
        noteColorActive = false; editingNoteColorId = null;   // п.9: same for the note route
        grimBulkColorActive = false;   // cross-app #7: cancelling note-bulk colour must not leak either
        closeModalWithAnim('task-color-modal', () => { editingTaskId = null; });
        if (!event) editingTaskId = null;
    }
}

// Single commit path for ANY colour choice in the modal — preset swatch, custom
// spectrum, or "без цвета". Branches on bulkColorActive so bulk and per-task reuse it.
function _commitColorChoice(color) {
    const c = color || null; // '' / undefined → null = no colour
    if (grimBulkColorActive) {                 // cross-app #7: whole note selection
        grimBulkColorActive = false;
        grimBulkColor(c);
        closeModalWithAnim('task-color-modal');
        return;
    }
    if (noteColorActive) {
        noteColorActive = false;
        const note = (state.notes || []).find(n => n.id === editingNoteColorId);
        editingNoteColorId = null;
        if (note) {
            pushUndo();
            note.color = c;   // colour is a label, like pin — does NOT bump updatedAt / re-sort
            saveState();
            renderNotes();
        }
        closeModalWithAnim('task-color-modal');
        showToast(c ? 'Цвет записи установлен' : 'Цвет снят');
        return;
    }
    if (formColorActive) {
        formColorActive = false;
        _setFormColor(c);
        closeModalWithAnim('task-color-modal');
        return;
    }
    if (bulkColorActive) {
        bulkColorActive = false;
        bulkSetColor(c);
        closeModalWithAnim('task-color-modal');
        return;
    }
    const task = state.tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    pushUndo();
    _setTaskColor(task, c);
    saveState(); renderListOnly(); closeTaskColorModal(); // 7b: colour label affects the list only
    showToast(task.color ? 'Цвет установлен' : 'Цвет снят');
}

document.getElementById('task-color-picker').addEventListener('click', e => {
    const sw = e.target.closest('.color-swatch');
    if (!sw) return;
    _commitColorChoice(sw.dataset.color);
});

// ─── Gothic custom-colour spectrum (RGB picker) ──────────────────────────────
// A 2D saturation/value pad + a hue band. State is HSV; converted to/from hex.
let _grgbH = 270, _grgbS = 0.62, _grgbV = 0.92; // default: gothic violet ≈ #A060FF
// P-fix#2: the spectrum lives in two modals (colour-label + group). _grgbScope picks
// which one the engine reads/writes; both copies share the same class names (no dup ids).
let _grgbScope = 'task'; // 'task' (colour-label modal) | 'group' (group modal, live binding)

function _hsvToRgb(h, s, v) {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60)       { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else              { r = c; b = x; }
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}
function _rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}
function _hexToHsv(hex) {
    let h = (hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let hue = 0;
    if (d !== 0) {
        if (max === r)      hue = ((g - b) / d) % 6;
        else if (max === g) hue = (b - r) / d + 2;
        else                hue = (r - g) / d + 4;
        hue *= 60; if (hue < 0) hue += 360;
    }
    return { h: hue, s: max === 0 ? 0 : d / max, v: max };
}
function _grgbHex() {
    const { r, g, b } = _hsvToRgb(_grgbH, _grgbS, _grgbV);
    return _rgbToHex(r, g, b);
}
// Resolve the spectrum's elements within the currently active modal (by class, so the
// two copies don't need unique ids).
function _grgbEls() {
    const root = _grgbScope === 'group'
        ? document.getElementById('group-modal')
        : document.getElementById('task-color-modal');
    if (!root) return {};
    return {
        pad:     root.querySelector('.grgb-pad'),
        thumb:   root.querySelector('.grgb-thumb'),
        hue:     root.querySelector('.grgb-hue'),
        preview: root.querySelector('.grgb-preview'),
        hexEl:   root.querySelector('.grgb-hex'),
    };
}
// Pure visual render of the active spectrum — never mutates the chosen colour.
function _grgbRender() {
    const { pad, thumb, hue, preview, hexEl } = _grgbEls();
    if (!pad) return;
    const hex = _grgbHex();
    pad.style.setProperty('--grgb-hue', _grgbH);
    if (thumb) { thumb.style.left = (_grgbS * 100) + '%'; thumb.style.top = ((1 - _grgbV) * 100) + '%'; thumb.style.background = hex; }
    if (hue && +hue.value !== Math.round(_grgbH)) hue.value = Math.round(_grgbH);
    if (preview) preview.style.background = hex;
    if (hexEl) hexEl.textContent = hex;
}
// In group mode the spectrum is the live source of truth — a drag/hue change becomes the
// group's chosen colour and clears any highlighted preset.
function _groupColorFromSpectrum() {
    selectedColor = _grgbHex();
    if (colorPicker) colorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
}
function _grgbSyncFromColor(color, scope) {
    if (scope) _grgbScope = scope;
    const hsv = color ? _hexToHsv(color) : null;
    if (hsv) { _grgbH = hsv.h; _grgbS = hsv.s; _grgbV = hsv.v; }
    // else keep the last/default gothic violet
    _grgbRender();
}
function _grgbHue(val) {
    _grgbH = +val; _grgbRender();
    if (_grgbScope === 'group') _groupColorFromSpectrum();
}
function _grgbApply() { _commitColorChoice(_grgbHex()); }

// Pad pointer handling (mouse + touch via pointer events). Attached to BOTH spectrum
// copies; each handler sets the scope from the modal it lives in.
(function _grgbInitPads() {
    document.querySelectorAll('.grgb-pad').forEach(pad => {
        const scopeOf = () => pad.closest('#group-modal') ? 'group' : 'task';
        let dragging = false;
        const apply = e => {
            const rect = pad.getBoundingClientRect();
            if (rect.width === 0) return;
            _grgbScope = scopeOf();
            _grgbS = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            _grgbV = 1 - Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
            _grgbRender();
            if (_grgbScope === 'group') _groupColorFromSpectrum();
        };
        pad.addEventListener('pointerdown', e => { dragging = true; pad.setPointerCapture(e.pointerId); apply(e); });
        pad.addEventListener('pointermove', e => { if (dragging) apply(e); });
        pad.addEventListener('pointerup',   () => { dragging = false; });
        pad.addEventListener('pointercancel', () => { dragging = false; });
    });
})();

// ─── Populate anchor section ─────────────────────────────────────────────────
// repeatMode: current repeat value; anchorTime: "HH:MM"|""; anchorDay: 1-7|0
function _populateRepeatAnchor(repeatMode, anchorTime, anchorDay, anchorMonthday) {
    const section   = document.getElementById('repeat-anchor-section');
    const wdRow     = document.getElementById('repeat-anchor-weekday-row');
    const mdRow     = document.getElementById('repeat-anchor-monthday-row');
    const wdSelect  = document.getElementById('repeat-anchor-day');
    const wdLabel   = document.getElementById('repeat-wd-label');
    if (!section) return;

    const hasRepeat = repeatMode && repeatMode !== 'none';
    section.style.display = hasRepeat ? '' : 'none';
    if (wdRow) wdRow.style.display = (hasRepeat && repeatMode === 'weekly') ? '' : 'none';
    if (mdRow) mdRow.style.display = (hasRepeat && repeatMode === 'monthly') ? '' : 'none';
    const mdLbl = document.getElementById('repeat-anchor-monthday-label-text');
    if (mdLbl) mdLbl.style.display = (hasRepeat && repeatMode === 'monthly') ? '' : 'none';

    // Populate time via SegmentedInput
    const nativeTimeInput = document.getElementById('repeat-anchor-time');
    if (nativeTimeInput) {
        nativeTimeInput.value = anchorTime || '';
        if (segInputs['repeat-anchor-time']) segInputs['repeat-anchor-time'].syncFromInput();
    }

    // Populate weekday picker
    const WD_NAMES = ['','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
    if (wdSelect) wdSelect.value = anchorDay || '';
    if (wdLabel)  wdLabel.textContent = anchorDay ? (WD_NAMES[anchorDay] || 'Любой день') : 'Любой день';
    document.querySelectorAll('#repeat-wd-list .dl-month-option').forEach(opt => {
        opt.classList.toggle('active', (opt.dataset.value || '') === String(anchorDay || ''));
    });

    // Populate monthday stepper
    const mdInput = document.getElementById('repeat-anchor-monthday');
    if (mdInput) {
        mdInput.value = anchorMonthday || 1;
        _updateRepeatMonthdayHint(parseInt(mdInput.value) || 1);
    }
}
// ─────────────────────────────────────────────────────────────────────────────

// ============================================================
//  REPEAT MODAL (per-task)
// ============================================================
function openRepeatModal(id) {
    editingTaskId = id;
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const cur = task.repeat || 'none';
    document.querySelectorAll('#modal-repeat-selector .repeat-modal-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.repeat === cur)
    );
    _populateRepeatAnchor(cur, task.repeatAnchorTime || '', parseInt(task.repeatAnchorDay) || 0, parseInt(task.repeatAnchorMonthday) || 0);
    openModalWithFocus('repeat-modal');
}

function closeRepeatModal(event) {
    if (!event || event.target === document.getElementById('repeat-modal')) {
        closeModalWithAnim('repeat-modal', () => { editingTaskId = null; editingSubId = null; });
        if (!event) { editingTaskId = null; editingSubId = null; }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // ── Repeat button grid ────────────────────────────────────────────────────
    document.getElementById('modal-repeat-selector').addEventListener('click', e => {
        const btn = e.target.closest('.repeat-modal-btn');
        if (!btn) return;
        const newRepeat = btn.dataset.repeat;

        document.querySelectorAll('#modal-repeat-selector .repeat-modal-btn').forEach(b =>
            b.classList.toggle('active', b === btn)
        );
        const section = document.getElementById('repeat-anchor-section');
        const wdRow   = document.getElementById('repeat-anchor-weekday-row');
        const mdRow   = document.getElementById('repeat-anchor-monthday-row');
        if (section) section.style.display = newRepeat !== 'none' ? '' : 'none';
        if (wdRow)   wdRow.style.display   = newRepeat === 'weekly'  ? '' : 'none';
        if (mdRow)   mdRow.style.display   = newRepeat === 'monthly' ? '' : 'none';
        const mdLbl2 = document.getElementById('repeat-anchor-monthday-label-text');
        if (mdLbl2)  mdLbl2.style.display  = newRepeat === 'monthly' ? '' : 'none';
    });

    // ── Confirm button ────────────────────────────────────────────────────────
    const confirmBtn = document.getElementById('btn-confirm-repeat');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const activeBtn = document.querySelector('#modal-repeat-selector .repeat-modal-btn.active');
            if (!activeBtn) return;
            const newRepeat  = activeBtn.dataset.repeat;

            // Read time via SegmentedInput
            const anchorTime = segInputs['repeat-anchor-time']
                ? (segInputs['repeat-anchor-time'].getValue() || '').trim()
                : (document.getElementById('repeat-anchor-time')?.value || '').trim();
            const anchorDay      = parseInt(document.getElementById('repeat-anchor-day')?.value || '') || 0;
            const anchorMonthday = parseInt(document.getElementById('repeat-anchor-monthday')?.value || '') || 0;

            // Build human-readable label for toast (problem 5)
            const _toastLabel = () => {
                const label = getRepeatAnchorLabel(newRepeat, anchorTime || null, anchorDay || null, anchorMonthday || null);
                if (newRepeat === 'none') return 'Повтор отключён';
                return `Повтор: ${repeatLabel(newRepeat)}${label ? ` · ${label}` : ''}`;
            };

            // ── Form subtask repeat (problem 3/4) ─────────────────────────────
            if (_formSubRepeatIdx !== null) {
                const s = formSubtasks[_formSubRepeatIdx];
                if (s) {
                    s.repeat               = newRepeat;
                    s.repeatAnchorTime     = anchorTime     || null;
                    s.repeatAnchorDay      = anchorDay      || null;
                    s.repeatAnchorMonthday = anchorMonthday || null;
                    renderFormSubtasks();
                }
                _formSubRepeatIdx = null;
                closeRepeatModal();
                return;
            }

            if (editingSubId !== null) {
                // ── Subtask repeat ────────────────────────────────────────────
                const task = state.tasks.find(t => t.id === editingTaskId);
                if (!task) return;
                const sub = task.subtasks.find(s => s.id === editingSubId);
                if (!sub) return;
                pushUndo();
                sub.repeat               = newRepeat;
                sub.repeatAnchorTime     = anchorTime     || null;
                sub.repeatAnchorDay      = anchorDay      || null;
                sub.repeatAnchorMonthday = anchorMonthday || null;
                if (sub.repeat === 'none') { sub.cycleChecked = false; sub.nextReset = null; }
                // Problem 5: if the subtask is already cycle-completed, recompute its
                // reset point from the NEW anchor so the automatic reset fires at the
                // new reference time — without needing a manual un-/re-check.
                else if (sub.cycleChecked) { sub.nextReset = getNextResetTimestamp(sub); }
                saveState();

                // Lightweight DOM update for repeat button
                const subItem = document.querySelector(
                    `.subtask-item[data-tid="${editingTaskId}"][data-sid="${editingSubId}"]`
                );
                if (subItem) {
                    const repeatBtn = subItem.querySelector('.sub-repeat-btn');
                    if (repeatBtn) {
                        const repeatSet = sub.repeat !== 'none';
                        repeatBtn.classList.toggle('active', repeatSet);
                        const anchorLabel = getRepeatAnchorLabel(sub.repeat, sub.repeatAnchorTime, sub.repeatAnchorDay, sub.repeatAnchorMonthday);
                        repeatBtn.title = repeatSet
                            ? `Повтор: ${repeatLabel(sub.repeat)}${anchorLabel ? ` · ${anchorLabel}` : ''} — нажмите чтобы изменить`
                            : 'Назначить повтор';
                    }
                }
                // Problem 5: toast was missing for subtasks
                showToast(_toastLabel());
                editingSubId  = null;
                editingTaskId = null;
                closeRepeatModal();
                return;
            }

            // ── Main task repeat ──────────────────────────────────────────────
            const task = state.tasks.find(t => t.id === editingTaskId);
            if (!task) return;
            // 7c: weekly without anchor day → auto-use current day of week (Mon=1..Sun=7)
            let resolvedAnchorDay = anchorDay || null;
            if (newRepeat === 'weekly' && !resolvedAnchorDay) {
                const jsDay = new Date().getDay(); // 0=Sun
                resolvedAnchorDay = jsDay === 0 ? 7 : jsDay; // convert to Mon=1..Sun=7
            }
            pushUndo();
            task.repeat               = newRepeat;
            task.repeatAnchorTime     = anchorTime          || null;
            task.repeatAnchorDay      = resolvedAnchorDay;
            task.repeatAnchorMonthday = anchorMonthday      || null;
            if (task.repeat === 'none') { task.cycleChecked = false; task.nextReset = null; }
            // Problem 5: re-anchor an already cycle-completed task so the automatic
            // reset honours the new reference point immediately (no manual toggle).
            else if (task.cycleChecked) { task.nextReset = getNextResetTimestamp(task); }
            saveState(); render(); closeRepeatModal();
            showToast(_toastLabel());
        });
    }

    // ── Anchor weekday picker ─────────────────────────────────────────────────
    const repeatWdList    = document.getElementById('repeat-wd-list');
    const repeatWdTrigger = document.getElementById('repeat-wd-trigger');
    const repeatWdPicker  = document.getElementById('repeat-wd-picker');
    const repeatWdSelect  = document.getElementById('repeat-anchor-day');
    const repeatWdLabel   = document.getElementById('repeat-wd-label');
    const WD_NAMES = ['','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];

    if (repeatWdTrigger && repeatWdPicker) {
        repeatWdTrigger.addEventListener('click', () => {
            const isNowOpen = !repeatWdPicker.classList.contains('open');
            if (isNowOpen) {
                // Determine if list should open upward to avoid viewport clipping
                const rect = repeatWdTrigger.getBoundingClientRect();
                const listH = 290; // approx height for 8 options
                const spaceBelow = window.innerHeight - rect.bottom;
                if (spaceBelow < listH && rect.top > listH) {
                    repeatWdPicker.classList.add('open-up');
                } else {
                    repeatWdPicker.classList.remove('open-up');
                }
            }
            repeatWdPicker.classList.toggle('open');
            repeatWdTrigger.setAttribute('aria-expanded', repeatWdPicker.classList.contains('open'));
            repeatWdList?.setAttribute('aria-hidden', !repeatWdPicker.classList.contains('open'));
        });
    }
    if (repeatWdList) {
        repeatWdList.addEventListener('click', e => {
            const opt = e.target.closest('.dl-month-option');
            if (!opt) return;
            const val = opt.dataset.value || '';
            if (repeatWdSelect) repeatWdSelect.value = val;
            if (repeatWdLabel)  repeatWdLabel.textContent = val ? (WD_NAMES[parseInt(val)] || 'Любой день') : 'Любой день';
            repeatWdList.querySelectorAll('.dl-month-option').forEach(o =>
                o.classList.toggle('active', o === opt)
            );
            repeatWdPicker?.classList.remove('open', 'open-up');
            repeatWdTrigger?.setAttribute('aria-expanded', 'false');
            repeatWdList.setAttribute('aria-hidden', 'true');
        });
    }
    // Close weekday picker on outside click
    document.addEventListener('pointerdown', e => {
        if (repeatWdPicker && repeatWdPicker.classList.contains('open') &&
            !repeatWdPicker.contains(e.target)) {
            repeatWdPicker.classList.remove('open', 'open-up');
            repeatWdTrigger?.setAttribute('aria-expanded', 'false');
            repeatWdList?.setAttribute('aria-hidden', 'true');
        }
    }, { passive: true });

    // ── Anchor time: SegmentedInput handles clear via Backspace/Delete ───────
    // (no separate clear button needed — native widget pattern)

    // ── Form color picker (task creation) ───────────────────────────────────
    const formColorPicker = document.getElementById('form-color-picker');
    if (formColorPicker) {
        formColorPicker.addEventListener('click', e => {
            const sw = e.target.closest('.form-color-swatch');
            if (!sw) return;
            _setFormColor(sw.dataset.color || null);
        });
    }
});

// ============================================================
//  ACCESSIBILITY HELPERS
// ============================================================

/** Announce a message to screen readers via the live region. */
let _announceRafId = null;
function announce(msg) {
    const lr = document.getElementById('live-region');
    if (!lr) return;
    // W-6: Cancel any pending rAF from a previous rapid announce() call.
    // Without this, two toasts fired back-to-back would race: the first rAF
    // clears textContent just as the second rAF tries to set its message.
    if (_announceRafId) { cancelAnimationFrame(_announceRafId); _announceRafId = null; }
    lr.textContent = '';
    _announceRafId = requestAnimationFrame(() => {
        lr.textContent = msg;
        _announceRafId = null;
    });
}

/**
 * FOCUSABLE selector used for focus trapping inside modals.
 * Matches all standard interactive elements that are not disabled/hidden.
 */
const FOCUSABLE = [
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Open a modal overlay, move focus to its first focusable child,
 * and install a Tab/Shift-Tab focus trap so keyboard focus can't
 * escape the dialog.  Stores the triggering element so focus is
 * returned when the dialog closes.
 */
function openModalWithFocus(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    overlay._returnFocus = document.activeElement;   // remember caller

    overlay.style.display = 'flex';

    // Focus first focusable element after the animation starts
    requestAnimationFrame(() => {
        const focusable = Array.from(overlay.querySelectorAll(FOCUSABLE));
        if (focusable.length) focusable[0].focus();

        // Install focus trap
        overlay._trapHandler = (e) => {
            if (e.key !== 'Tab') return;
            const els = Array.from(overlay.querySelectorAll(FOCUSABLE));
            if (!els.length) return;
            const first = els[0], last = els[els.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
            }
        };
        overlay.addEventListener('keydown', overlay._trapHandler);
    });
}

// ============================================================
//  MODAL CLOSE HELPER
//  Adds .closing class → waits for CSS modalOut animation → hides overlay.
//  Removes focus trap and returns focus to the triggering element.
// ============================================================
function closeModalWithAnim(overlayId, onAfterClose) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;

    // Already hidden — nothing to do
    if (overlay.style.display === 'none') return;

    // Remove focus trap
    if (overlay._trapHandler) {
        overlay.removeEventListener('keydown', overlay._trapHandler);
        overlay._trapHandler = null;
    }

    overlay.classList.add('closing');

    // Guard: ensures finish() runs at most once even if both animationend
    // and the setTimeout fallback fire (animation completes in <350 ms).
    let _done = false;
    const finish = () => {
        if (_done) return;
        _done = true;
        overlay.style.display = 'none';
        overlay.classList.remove('closing');
        // Return focus to element that triggered the modal
        if (overlay._returnFocus && typeof overlay._returnFocus.focus === 'function') {
            overlay._returnFocus.focus();
            overlay._returnFocus = null;
        }
        if (onAfterClose) onAfterClose();
    };

    // Use animationend on the inner .modal element (the one that runs modalOut)
    const modalEl = overlay.querySelector('.modal');
    if (modalEl) {
        modalEl.addEventListener('animationend', finish, { once: true });
        // Safety fallback: if animation never fires (reduced-motion, etc.)
        setTimeout(finish, 350);
    } else {
        finish();
    }
}

// ============================================================
//  U-1: UNIFIED MODAL BACKDROP + Esc
//  One delegated backdrop handler replaces 12 inline onclick="closeXModal(event)".
//  Each modal's own close fn carries its cleanup (bulk flags, editingTaskId, picker
//  close) — the registry maps overlay id → that fn; calling it with NO arg hits the
//  `!event` branch so the cleanup always runs. The same registry drives the Esc
//  handler, so Esc no longer skips cleanup the way a bare closeModalWithAnim did.
//  import-choice-overlay is intentionally ABSENT: its destructive choice must not be
//  dismissed by a stray backdrop click (Esc + its buttons still close it).
// ============================================================
const MODAL_CLOSERS = {
    'group-modal':         closeGroupModal,
    'rename-group-modal':  closeRenameGroupModal,
    'grim-link-modal':     grimLinkClose,
    'deadline-modal':      closeDeadlineModal,
    'prio-modal':          closePrioModal,
    'task-color-modal':    closeTaskColorModal,
    'repeat-modal':        closeRepeatModal,
    'note-modal':          closeNoteModal,
    'color-filter-modal':  closeColorFilterModal,
    'templates-modal':     closeTemplatesModal,
    'backup-modal':        closeBackupModal,
    'bulk-group-modal':    closeBulkGroupModal,
};

// Close a modal overlay by id, routing through its cleanup-aware close fn when one
// exists (else a plain animated close). Used by both backdrop clicks and Esc.
function dismissModalById(id) {
    const fn = MODAL_CLOSERS[id];
    if (fn) fn(); else closeModalWithAnim(id);
}

// Single delegated backdrop listener: a click landing on the overlay itself (never
// on the inner .modal) closes it — for every registered modal at once.
document.addEventListener('click', e => {
    const ov = e.target.classList && e.target.classList.contains('modal-overlay') ? e.target : null;
    if (!ov || ov.style.display === 'none' || ov.classList.contains('closing')) return;
    if (MODAL_CLOSERS[ov.id]) dismissModalById(ov.id);   // import-choice absent → no backdrop close
});

// ============================================================
//  GROUPS
// ============================================================
function showAddGroupModal() {
    groupNameInput.value = '';
    _setGroupColor('#6C8EF5');   // P-fix#2: highlights the preset + seeds the embedded spectrum
    openModalWithFocus('group-modal');
}

// P6 + P-fix#2: reflect a chosen group colour — highlight the matching preset and move
// the embedded spectrum's thumb to it. Called on preset clicks and on modal open.
function _setGroupColor(c) {
    selectedColor = c || '#6C8EF5';
    if (colorPicker) {
        colorPicker.querySelectorAll('.color-swatch').forEach(s =>
            s.classList.toggle('active', s.dataset.color === selectedColor)
        );
    }
    _grgbSyncFromColor(selectedColor, 'group'); // position the spectrum on the chosen colour
}

function closeGroupModal(event) {
    if (!event || event.target === groupModal) {
        closeModalWithAnim('group-modal', () => {
            if (pendingGroupForSelector) { pendingGroupForSelector = false; taskGroupSelect.value = ''; }
        });
    }
}

function confirmAddGroup() {
    const name = groupNameInput.value.trim();
    if (!name) {
        groupNameInput.classList.add('shake');
        setTimeout(() => groupNameInput.classList.remove('shake'), 400);
        return;
    }
    pushUndo();
    const newId = state.nextGroupId++;
    state.groups.push({ id: newId, uid: uid(), createdAt: nowTs(), updatedAt: nowTs(), name, color: selectedColor });
    saveState();

    // Handle pending selector BEFORE closing so taskGroupSelect gets the new id
    // synchronously — render() will pick it up immediately below.
    if (pendingGroupForSelector) {
        pendingGroupForSelector = false;
        taskGroupSelect.value = String(newId);
        renderGroupChips(String(newId));
    }

    // Close with animation + focus-return (was direct display:none — no animation, no focus)
    closeModalWithAnim('group-modal');
    render();
    showToast(`Группа «${name}» создана`);
}


function toggleGroupCollapse(id) {
    const section = document.querySelector(`[data-group-id="${id}"]`);
    if (!section) return;
    const body = section.querySelector('.group-body');
    if (!body) return;

    // 3a FIX: use section.collapsed as the AUTHORITATIVE state, not body.expanded.
    // body.expanded lags behind (removed only in transitionend), causing double-fire
    // on rapid re-click while animation is in progress.
    const isCurrentlyCollapsed = section.classList.contains('collapsed');

    // S1-5: cancel any in-flight finisher before starting a new animation.
    if (body._collapseCancel) { body._collapseCancel(); body._collapseCancel = null; }

    if (isCurrentlyCollapsed) {
        // ── Expand ──────────────────────────────────────────────────────────
        section.classList.remove('collapsed');           // ← source of truth first
        body.classList.add('expanded');
        body.classList.remove('unlocked');
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.opacity   = '1';

        body._collapseCancel = onMaxHeightEnd(body, () => {
            body._collapseCancel = null;
            body.classList.add('unlocked');
            body.style.maxHeight = '';
        });
        localStorage.setItem('groupCollapsed_' + id, '0');
    } else {
        // ── Collapse ─────────────────────────────────────────────────────────
        section.classList.add('collapsed');              // ← source of truth first
        body.classList.remove('unlocked');
        // Pin current rendered height so the transition has a concrete start value.
        const currentH = getComputedStyle(body).maxHeight;
        body.style.maxHeight = (currentH === 'none') ? body.scrollHeight + 'px' : currentH;
        body.style.opacity   = '1';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                body.style.maxHeight = '0';
                body.style.opacity   = '0';
            });
        });

        body._collapseCancel = onMaxHeightEnd(body, () => {
            body._collapseCancel = null;
            body.classList.remove('expanded');
            body.style.maxHeight = '';
        });
        localStorage.setItem('groupCollapsed_' + id, '1');
    }
    updateCollapseAllBtn();
}

/**
 * Collapse or expand ALL groups at once.
 * If any group is expanded → collapse all; if all collapsed → expand all.
 */
function toggleCollapseAllGroups() {
    if (!state.groups.length) return;
    const sections = Array.from(document.querySelectorAll('.group-section[data-group-id]'));
    if (!sections.length) return;

    // 3c FIX: check section.collapsed (reliable) not body.expanded (animation-lagged).
    const anyExpanded = sections.some(s => !s.classList.contains('collapsed'));
    const shouldCollapse = anyExpanded;

    sections.forEach(s => {
        const id = parseInt(s.dataset.groupId);
        if (shouldCollapse && !s.classList.contains('collapsed')) toggleGroupCollapse(id);
        if (!shouldCollapse && s.classList.contains('collapsed'))  toggleGroupCollapse(id);
    });
    // updateCollapseAllBtn is called by each toggleGroupCollapse; call once more to finalize.
    updateCollapseAllBtn();
}

/** Keep the collapse-all button active state and tooltip in sync. */
function updateCollapseAllBtn() {
    const btn = document.getElementById('btn-collapse-all');
    if (!btn) return;
    const sections = Array.from(document.querySelectorAll('.group-section[data-group-id]'));
    if (!sections.length) { btn.style.display = 'none'; return; }
    btn.style.display = '';

    // 3b FIX: check section.collapsed (set immediately), not body.expanded (set after animation).
    const allCollapsed = sections.every(s => s.classList.contains('collapsed'));

    // 3b: highlight button when all groups are collapsed (= "expand all" action available)
    btn.classList.toggle('active', allCollapsed);
    // 3c: tooltip describes what the NEXT click will do
    btn.title = allCollapsed ? 'Развернуть все группы' : 'Свернуть все группы';
}

// ---- Group rename ----
function openRenameGroupModal(id) {
    renamingGroupId = id;
    const group = state.groups.find(g => g.id === id);
    if (!group) return;
    const inp = document.getElementById('rename-group-input');
    inp.value = group.name;
    openModalWithFocus('rename-group-modal');
    // Select input text after focus trap fires
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { if (inp) { inp.focus(); inp.select(); } });
    });
}

function closeRenameGroupModal(event) {
    if (!event || event.target === document.getElementById('rename-group-modal')) {
        closeModalWithAnim('rename-group-modal', () => { renamingGroupId = null; });
        if (!event) renamingGroupId = null;
    }
}

function confirmRenameGroup() {
    const name = document.getElementById('rename-group-input').value.trim();
    if (!name) {
        const inp = document.getElementById('rename-group-input');
        inp.classList.add('shake');
        setTimeout(() => inp.classList.remove('shake'), 400);
        return;
    }
    const group = state.groups.find(g => g.id === renamingGroupId);
    if (!group) { closeRenameGroupModal(); return; }
    pushUndo(); group.name = name;
    saveState();
    closeModalWithAnim('rename-group-modal', () => { renamingGroupId = null; });
    render();
    showToast('Группа переименована');
}

document.getElementById('rename-group-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmRenameGroup();
    if (e.key === 'Escape') closeRenameGroupModal();
});

(() => {
    const onKey = e => {
        if (e.key === 'Enter') { e.preventDefault(); grimLinkConfirm(); }
        if (e.key === 'Escape') grimLinkClose();
    };
    ['grim-link-input', 'grim-link-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', onKey);
    });
})();

colorPicker.addEventListener('click', e => {
    const s = e.target.closest('.color-swatch');
    if (!s) return;
    _setGroupColor(s.dataset.color);   // P-fix#2: highlights preset + moves the spectrum thumb
});

groupNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddGroup(); });

// group selector is now handled by chip buttons (selectGroupChip)

// ============================================================
//  DEADLINE MODAL
// ============================================================
function openDeadlineModal(taskId, bulk = false, subId = null, formSubIdx = null) {
    editingTaskId = taskId;
    editingSubId  = subId;       // P-E: null for task/form/bulk; set when editing a subtask deadline
    _formSubDeadlineIdx = formSubIdx;  // P-E: set only for a form-subtask deadline; reset on every other open
    bulkDeadlineActive = bulk;   // P-D: when true, confirm applies to the whole selection
    const existing = bulk ? null
        : (formSubIdx !== null
            ? (formSubtasks[formSubIdx] || {}).deadline
            : (subId !== null
                ? (((state.tasks.find(t => t.id === taskId) || {}).subtasks || [])
                      .find(s => s.id === subId) || {}).deadline
                : (taskId !== null
                    ? (state.tasks.find(t => t.id === taskId) || {}).deadline
                    : formDeadline)));

    // If task has no existing deadline, restore last-used mode (default: 'time')
    const savedMode = localStorage.getItem(K_DL_MODE) || 'time';
    const mode = (existing && existing.mode) || savedMode;
    setDeadlineMode(mode);

    // Clear all inputs — both native and segmented custom widgets
    document.getElementById('dl-time').value = '';
    document.getElementById('dl-weekday').value = '1';
    if (window._weekdayPickerSet) window._weekdayPickerSet(1);
    document.getElementById('dl-weektime-time').value = '';
    document.getElementById('dl-monthday').value = '';
    document.getElementById('dl-month').value = '1';
    if (window._monthPickerSet) window._monthPickerSet(1);
    document.getElementById('dl-year').value = '';
    document.getElementById('dl-date').value = '';
    if (segInputs['dl-time'])          segInputs['dl-time'].clear();
    if (segInputs['dl-weektime-time']) segInputs['dl-weektime-time'].clear();
    if (segInputs['dl-date'])          segInputs['dl-date'].clear();
    if (segInputs['dl-date-time'])     segInputs['dl-date-time'].clear();
    _setDlDurationFields(0);           // X-7: reset event-duration fields

    // Restrict date picker (still validated in JS on confirm)
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (segInputs['dl-date']) segInputs['dl-date']._todayMin = todayStr;

    if (existing) {
        const v = existing.value || '';
        if (mode === 'time')     document.getElementById('dl-time').value     = v;
        if (mode === 'weektime') {
            const [wd, t] = v.split('|');
            document.getElementById('dl-weekday').value = wd || '1';
            if (window._weekdayPickerSet) window._weekdayPickerSet(wd || '1');
            // Fix 1: if timeSet is false, leave the time input empty
            if (existing.timeSet !== false) {
                document.getElementById('dl-weektime-time').value = t || '';
            }
        }
        if (mode === 'monthday') document.getElementById('dl-monthday').value = v;
        if (mode === 'month')    { document.getElementById('dl-month').value    = v; if (window._monthPickerSet) window._monthPickerSet(v); }
        if (mode === 'year')     document.getElementById('dl-year').value     = v;
        if (mode === 'date')     {
            document.getElementById('dl-date').value     = v;
            // Extension 7: restore saved time if present
            const dlTimeEl = document.getElementById('dl-date-time');
            if (dlTimeEl) dlTimeEl.value = (existing && existing.time) ? existing.time : '';
        }
        _setDlDurationFields(existing.durationMin || 0);   // X-7: restore event-duration
    } else {
        // No existing deadline — clear time field too
        const dlTimeEl = document.getElementById('dl-date-time');
        if (dlTimeEl) dlTimeEl.value = '';
    }

    // Fix 3/4: sync segmented inputs from hidden input values
    if (segInputs['dl-time'])         segInputs['dl-time'].syncFromInput();
    if (segInputs['dl-weektime-time']) segInputs['dl-weektime-time'].syncFromInput();
    if (segInputs['dl-date'])         segInputs['dl-date'].syncFromInput();

    if (mode === 'monthday') updateMonthdayMax();
    // UX-2: When editing an existing task's deadline, immediately sync repeat availability
    // so incompatible repeat options are blocked. Previously only ran for form (editingTaskId===null).
    // Sync repeat availability with the active deadline mode for both task editing
    // and form creation (taskId===null with an existing formDeadline already set).
    // P-E: skip repeat-availability gating for the subtask + form-subtask paths — it
    // targets the form/task repeat selector, not the (form-)subtask's own repeat.
    if (subId === null && formSubIdx === null) {
        if (taskId !== null) {
            const taskForRepeat = state.tasks.find(t => t.id === taskId);
            if (taskForRepeat) updateRepeatAvailability(taskForRepeat.deadline?.mode || null);
        } else {
            updateRepeatAvailability(existing?.mode || null);
        }
    }

    // X-6: weektime auto-weekly toggle. Default ON; but if this target already
    // carries a weektime deadline whose repeat the user left non-recurring («none»),
    // reflect that opt-out instead of silently re-enabling it on every re-edit.
    let _arInit = true;
    if (existing && _AUTO_REPEAT_BY_MODE[existing.mode]) {
        const tgtRepeat = formSubIdx !== null
            ? (formSubtasks[formSubIdx] || {}).repeat
            : (subId !== null
                ? (((state.tasks.find(t => t.id === taskId) || {}).subtasks || []).find(s => s.id === subId) || {}).repeat
                : (taskId !== null
                    ? (state.tasks.find(t => t.id === taskId) || {}).repeat
                    : selectedRepeat));
        _arInit = (tgtRepeat !== 'none');
    }
    _setDlAutoRepeat(_arInit);

    openModalWithFocus('deadline-modal');
    // After the modal's entrance animation (~200ms), focus the active mode's input.
    // Two rAFs: first lets display:flex settle, second lets the modal animate in.
    requestAnimationFrame(() => requestAnimationFrame(() => _focusDeadlineModeInput(mode)));
}

function closeDeadlineModal(event) {
    if (!event || event.target === document.getElementById('deadline-modal')) {
        if (window._monthPickerClose)   window._monthPickerClose();
        if (window._weekdayPickerClose) window._weekdayPickerClose();
        // Clear monthday inline messages so they don't persist on re-open
        const mw = document.getElementById('dl-monthday-warn');
        const mn = document.getElementById('dl-monthday-note');
        if (mw) { mw.hidden = true; mw.textContent = ''; }
        if (mn) { mn.hidden = true; mn.textContent = ''; }
        bulkDeadlineActive = false;   // P-D: cancelling bulk must not leak into the next open
        editingSubId = null;          // P-E: cancelling a subtask-deadline edit must not leak
        _formSubDeadlineIdx = null;   // P-E: same for a form-subtask-deadline edit
        closeModalWithAnim('deadline-modal');
    }
}

function setDeadlineMode(mode, withFocus) {
    dlCurrentMode = mode;
    document.querySelectorAll('.dl-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    document.querySelectorAll('.dl-input-wrap').forEach(w => w.classList.remove('active'));
    const wrap = document.getElementById('dl-wrap-' + mode);
    if (wrap) wrap.classList.add('active');
    // X-7: event-duration row — only for time-precise modes (time / weektime / date).
    const _durRow = document.getElementById('dl-duration-row');
    if (_durRow) _durRow.hidden = !(mode === 'time' || mode === 'weektime' || mode === 'date');
    // X-8: shared auto-repeat toggle — for the rhythmic modes (time / weektime / monthday).
    _updateDlRepeatToggle(mode);
    if (mode === 'monthday') updateMonthdayMax();
    // Clear monthday inline warning and note when navigating away
    if (mode !== 'monthday') {
        const warnEl = document.getElementById('dl-monthday-warn');
        const noteEl = document.getElementById('dl-monthday-note');
        if (warnEl) { warnEl.hidden = true; warnEl.textContent = ''; }
        if (noteEl) { noteEl.hidden = true; noteEl.textContent = ''; }
    }
    // Close pickers that belong to other modes when switching away
    if (mode !== 'month'   && window._monthPickerClose)   window._monthPickerClose();
    if (mode !== 'weektime' && window._weekdayPickerClose) window._weekdayPickerClose();
    // Autofocus: only when user explicitly clicks a mode tab (not during modal init)
    if (withFocus) requestAnimationFrame(() => _focusDeadlineModeInput(mode));
}

// Focus the first interactive element for the given deadline mode.
// Called via requestAnimationFrame so display:block takes effect before focus.
function _focusDeadlineModeInput(mode) {
    switch (mode) {
        case 'time':
            if (segInputs['dl-time']) segInputs['dl-time']._focus(0);
            break;
        case 'weektime': {
            // Focus the time segment, not the weekday dropdown.
            // The weekday picker has full keyboard nav accessible via Tab;
            // time input is what the user immediately wants to type into.
            // Two rAFs: first lets display:flex settle, second ensures
            // segmented input is ready after any ongoing re-render.
            requestAnimationFrame(() => {
                if (segInputs['dl-weektime-time']) segInputs['dl-weektime-time']._focus(0);
            });
            break;
        }
        case 'monthday': {
            const el = document.getElementById('dl-monthday');
            if (el) el.focus();
            break;
        }
        case 'month': {
            const t = document.getElementById('dl-month-trigger');
            if (t) t.focus();
            break;
        }
        case 'year': {
            const el = document.getElementById('dl-year');
            if (el) el.focus();
            break;
        }
        case 'date':
            if (segInputs['dl-date']) segInputs['dl-date']._focus(0);
            break;
    }
}

document.querySelectorAll('.dl-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setDeadlineMode(btn.dataset.mode, true); // true = user-initiated → autofocus
        // NOTE: repeat availability is NOT updated here — only after confirmDeadline()
        // so that clicking a tab doesn't restrict repeats before the user has
        // actually saved a deadline in that mode.
    });
});

function updateRepeatAvailability(mode) {
    const repeatBtns = document.querySelectorAll('#repeat-selector .repeat-btn');
    // X-8: which repeats make sense per deadline mode. monthday now allows monthly
    // (auto-repeat coupling); time keeps all options; weektime stays weekly-only.
    // No forced reset for time/monthday so the auto-repeat coupling can stick.
    let allowed;
    if (!mode || mode === 'time') allowed = ['none', 'daily', 'weekly', 'weekdays', 'monthly'];
    else if (mode === 'weektime') allowed = ['none', 'weekly'];
    else if (mode === 'monthday') allowed = ['none', 'monthly'];
    else                          allowed = ['none']; // month / year / date
    repeatBtns.forEach(b => { b.disabled = !allowed.includes(b.dataset.repeat); });
    if (!allowed.includes(selectedRepeat)) setFormRepeat('none');
}

function clearDeadlineModal() {
    // Fix 3/4: also clear segmented custom inputs
    if (segInputs['dl-time'])         segInputs['dl-time'].clear();
    if (segInputs['dl-weektime-time']) segInputs['dl-weektime-time'].clear();
    if (segInputs['dl-date'])         segInputs['dl-date'].clear();
    // Extension 7: clear optional date-time field
    const dtEl = document.getElementById('dl-date-time');
    if (dtEl) dtEl.value = '';
    if (window._monthPickerClose)     window._monthPickerClose();
    if (window._weekdayPickerClose)   window._weekdayPickerClose();
    // Clear monthday inline messages
    const mw = document.getElementById('dl-monthday-warn');
    const mn = document.getElementById('dl-monthday-note');
    if (mw) { mw.hidden = true; mw.textContent = ''; }
    if (mn) { mn.hidden = true; mn.textContent = ''; }
    applyDeadline(null);
    closeModalWithAnim('deadline-modal');
    if (editingTaskId === null) {
        // Deadline cleared → all repeat options available
        updateRepeatAvailability(null);
    }
}

// X-6: weektime auto-weekly toggle (lives in the «День + Время» deadline section).
function _setDlAutoRepeat(on) {
    _dlAutoRepeat = !!on;
    const btn = document.getElementById('dl-repeat-toggle');
    if (!btn) return;
    btn.classList.toggle('on', _dlAutoRepeat);
    btn.setAttribute('aria-checked', _dlAutoRepeat ? 'true' : 'false');
    // State is conveyed by the lunar-phase switch + aria-checked (no text chip).
}
function toggleDlAutoRepeat() { _setDlAutoRepeat(!_dlAutoRepeat); }

// X-7: shared event-duration field (hours + minutes → total minutes; 0 = none).
function _readDlDuration() {
    const h = parseInt(document.getElementById('dl-dur-h')?.value) || 0;
    const m = parseInt(document.getElementById('dl-dur-m')?.value) || 0;
    return Math.max(0, h * 60 + m);
}
function _setDlDurationFields(min) {
    const total = Math.max(0, parseInt(min) || 0);
    const hEl = document.getElementById('dl-dur-h');
    const mEl = document.getElementById('dl-dur-m');
    if (hEl) hEl.value = total ? (Math.floor(total / 60) || '') : '';
    if (mEl) mEl.value = total ? (total % 60 || '') : '';
}
// #2: validate + auto-correct the duration fields as the user types
// (hours 0–23, minutes 0–59; strip non-digits; clamp out-of-range).
function _clampDlDuration(el) {
    if (!el) return;
    const max = el.id === 'dl-dur-h' ? 23 : 59;
    const digits = (el.value || '').replace(/\D/g, '');
    if (digits === '') { el.value = ''; return; }
    let n = parseInt(digits, 10);
    if (isNaN(n) || n < 0) n = 0;
    if (n > max) n = max;
    el.value = String(n);
}
// #2: gothic arch steppers — bump hours (±1) / minutes (±5), clamped 0–23 / 0–59.
// Zero shows as empty (placeholder «0»), consistent with _setDlDurationFields.
function _stepDlDuration(which, delta) {
    const el = document.getElementById(which === 'h' ? 'dl-dur-h' : 'dl-dur-m');
    if (!el) return;
    const max = which === 'h' ? 23 : 59;
    let n = (parseInt((el.value || '').replace(/\D/g, ''), 10) || 0) + delta;
    if (n < 0) n = 0;
    if (n > max) n = max;
    el.value = n ? String(n) : '';
}

// X-8: deadline-mode → auto-repeat coupling (time = daily, weektime = weekly,
// monthday = monthly). weektime is coupled inline in confirmDeadline (it returns
// early); the map drives the shared toggle label, _arInit, and the generic-path
// coupling for time/monthday below.
const _AUTO_REPEAT_BY_MODE = { time: 'daily', weektime: 'weekly', monthday: 'monthly' };
const _DL_REPEAT_LABELS = {
    weektime: { t: 'Повторять каждую неделю', s: 'Дедлайн сдвигается на следующую неделю — в выбранный день' },
    time:     { t: 'Повторять каждый день',   s: 'Дедлайн сдвигается на следующий день — в то же время' },
    monthday: { t: 'Повторять каждый месяц',  s: 'Дедлайн сдвигается на следующий месяц — на то же число' },
};
// Show + relabel the shared auto-repeat toggle for the active deadline mode.
function _updateDlRepeatToggle(mode) {
    const btn = document.getElementById('dl-repeat-toggle');
    if (!btn) return;
    const lbl = _DL_REPEAT_LABELS[mode];
    btn.hidden = !lbl;
    if (!lbl) return;
    const tEl = btn.querySelector('.dl-rt-title');
    const sEl = btn.querySelector('.dl-rt-sub');
    if (tEl) tEl.textContent = lbl.t;
    if (sEl) sEl.textContent = lbl.s;
}
// Apply the mode's recurring repeat (+anchor) to a task/subtask/formSubtask object.
// Honours the auto-repeat toggle; never overrides an explicit non-'none' choice.
function _applyAutoRepeatToTarget(obj, dl) {
    if (!_dlAutoRepeat || !obj || !dl) return;
    const rep = _AUTO_REPEAT_BY_MODE[dl.mode];
    if (!rep) return;
    if (obj.repeat && obj.repeat !== 'none') return;
    obj.repeat = rep;
    if (dl.mode === 'weektime')      obj.repeatAnchorDay      = parseInt(dl.value.split('|')[0]) || null;
    else if (dl.mode === 'monthday') obj.repeatAnchorMonthday = parseInt(dl.value) || null;
}

function confirmDeadline() {
    const mode = dlCurrentMode;
    const wasBulk = bulkDeadlineActive;   // P-D: don't touch the add-form repeat state in bulk
    let value  = '';
    if (mode === 'time') {
        value = segInputs['dl-time']?.getValue() || document.getElementById('dl-time').value;
        if (!value) {
            showToast('Введите время дедлайна');
            (segInputs['dl-time'] ? segInputs['dl-time']._focus(0) : document.getElementById('dl-time').focus());
            return;
        }
    }
    if (mode === 'weektime') {
        const wd = document.getElementById('dl-weekday').value;
        if (!wd) {
            showToast('Выберите день недели');
            document.getElementById('dl-weekday').focus();
            return;
        }
        const t  = segInputs['dl-weektime-time']?.getValue() || document.getElementById('dl-weektime-time').value;
        value = `${wd}|${t || '00:00'}`;
        const dl = { mode, value, timeSet: !!t };
        // X-7: optional event-duration (only meaningful when a time is set).
        if (t) { const _d = _readDlDuration(); if (_d > 0) dl.durationMin = _d; }
        localStorage.setItem(K_DL_MODE, mode);
        // I-9: save before applyDeadline() resets editingTaskId to null
        const targetId = editingTaskId;
        // P-E: form-subtask deadline target (task not yet created) — intercept first,
        // mirror the weektime→auto-weekly coupling onto the form subtask.
        if (_formSubDeadlineIdx !== null) {
            const fs = formSubtasks[_formSubDeadlineIdx];
            if (fs) {
                fs.deadline = dl;
                if (_dlAutoRepeat && (!fs.repeat || fs.repeat === 'none')) {
                    fs.repeat = 'weekly';
                    fs.repeatAnchorDay = parseInt(wd) || null;
                }
                renderFormSubtasks();
            }
            _formSubDeadlineIdx = null;
            editingTaskId = null;
            editingSubId  = null;
            closeModalWithAnim('deadline-modal');
            return;
        }
        // P-E: subtask deadline target — mirror the V-7 weektime→auto-weekly coupling
        // onto the subtask (subtasks support repeat). Must run BEFORE the task branch
        // because editingTaskId (the parent id) is also set for a subtask edit.
        if (editingSubId !== null) {
            const stask = state.tasks.find(x => x.id === editingTaskId);
            const ssub  = stask && stask.subtasks.find(s => s.id === editingSubId);
            if (ssub) {
                pushUndo();
                ssub.deadline = dl;
                if (_dlAutoRepeat && (!ssub.repeat || ssub.repeat === 'none')) {
                    ssub.repeat = 'weekly';
                    ssub.repeatAnchorDay = parseInt(wd) || null;
                }
                saveState();
                renderSubList(editingTaskId);
                showToast('Дедлайн установлен');
            }
            editingTaskId = null;
            editingSubId  = null;
            closeModalWithAnim('deadline-modal');
            return;
        }
        if (targetId !== null) {
            // V-7: set deadline AND auto-enable weekly repeat (anchored to the chosen
            // weekday) in ONE mutation + single render, so the repeat badge shows
            // immediately and the anchor day is filled. pushUndo first so Ctrl+Z
            // reverts both deadline and repeat together.
            const task = state.tasks.find(x => x.id === targetId);
            if (task) {
                pushUndo();
                task.deadline = dl;
                if (_dlAutoRepeat && task.repeat === 'none') {
                    task.repeat = 'weekly';
                    task.repeatAnchorDay = parseInt(wd) || null;
                }
                saveState(); render();
                showToast('Дедлайн установлен');
            }
            editingTaskId = null;
        } else {
            applyDeadline(dl);                       // form-creation / bulk path
            if (!wasBulk) {
                updateRepeatAvailability(dl.mode);
                // X-6: a fresh weektime deadline auto-enables weekly repeat on the
                // add-form too (default ON), mirroring the existing-task coupling.
                if (_dlAutoRepeat && selectedRepeat === 'none') {
                    setFormRepeat('weekly');
                    if (window._formWdPickerSet) window._formWdPickerSet(parseInt(wd) || '');
                    else formRepeatAnchorDay = parseInt(wd) || null;
                }
            }
        }
        closeModalWithAnim('deadline-modal');
        return;
    }
    if (mode === 'monthday') {
        const today  = new Date();
        const maxDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const months = ['январе','феврале','марте','апреле','мае','июне',
                        'июле','августе','сентябре','октябре','ноябре','декабре'];
        const monthName = months[today.getMonth()];
        const raw    = parseInt(document.getElementById('dl-monthday').value);
        const warnEl = document.getElementById('dl-monthday-warn');

        // Helper: hide warning and footnote (on success, mode switch, cancel, clear)
        function hideMonthdayWarn() {
            if (warnEl) { warnEl.hidden = true; warnEl.textContent = ''; }
            const noteEl = document.getElementById('dl-monthday-note');
            if (noteEl) { noteEl.hidden = true; noteEl.textContent = ''; }
        }

        // Structurally invalid: empty, NaN, ≤ 0
        if (isNaN(raw) || raw < 1) {
            hideMonthdayWarn();
            showToast('Введите корректный день');
            document.getElementById('dl-monthday').value = '';
            document.getElementById('dl-monthday').focus();
            return;
        }
        // Absolutely impossible: no month has more than 31 days
        if (raw > 31) {
            hideMonthdayWarn();
            showToast(`${raw} — такого числа не бывает ни в одном месяце`);
            document.getElementById('dl-monthday').value = '';
            // Hide note too — the field is cleared
            const noteEl2 = document.getElementById('dl-monthday-note');
            if (noteEl2) { noteEl2.hidden = true; noteEl2.textContent = ''; }
            document.getElementById('dl-monthday').focus();
            return;
        }
        // Day exists in theory (1–31) but not in the current month
        if (raw > maxDay) {
            // Clamp the input and show an inline warning.
            // The modal stays open — user can either adjust or confirm again.
            document.getElementById('dl-monthday').value = String(maxDay);
            if (warnEl) {
                warnEl.textContent = `${raw}-го числа в ${monthName} не существует — подставлено ближайшее: ${maxDay}. Нажмите «Сохранить» ещё раз, чтобы подтвердить.`;
                warnEl.hidden = false;
            }
            document.getElementById('dl-monthday').focus();
            return;   // ← modal stays open; next click saves the clamped value
        }

        // Valid day — hide any leftover warning and proceed
        hideMonthdayWarn();
        value = String(raw);
        // No more toast for 29–31: the static hint below the stepper already
        // explains the "short month" behaviour unobtrusively. (See #dl-monthday-note)
    }
    if (mode === 'month')  value = document.getElementById('dl-month').value;
    if (mode === 'year') {
        value = document.getElementById('dl-year').value;
        const yv = parseInt(value);
        if (!value) {
            showToast('Введите год дедлайна');
            document.getElementById('dl-year').focus();
            return;
        }
        if (yv < getYearMin() || yv > YEAR_MAX) {
            showToast(`Введите год от ${getYearMin()} до ${YEAR_MAX}`); return;
        }
    }
    if (mode === 'date') {
        value = segInputs['dl-date']?.getValue() || document.getElementById('dl-date').value;
        const dateSeg = segInputs['dl-date'];

        // Empty: user pressed Save without entering anything
        if (!value && (!dateSeg || dateSeg.segs.some(s => !s.buf.length))) {
            showToast('Введите дату дедлайна');
            if (dateSeg) dateSeg._focus(0); else document.getElementById('dl-date').focus();
            return;
        }

        // ── PRIMARY CHECK (catches the common failure path) ────────────────────
        // When user types an impossible date like 31.04.2026, _sync() writes
        // 'yyyy-MM-dd' into the hidden <input type="date">.  The browser's HTML5
        // value-sanitisation algorithm immediately rejects any non-existent
        // calendar date and resets input.value to ''.  So by the time we arrive
        // here, value === '' — the inner if(value) block is unreachable and the
        // old component-comparison fix never ran.
        //
        // The correct signal: input is empty BUT all three segment buffers are
        // fully committed.  That combination uniquely means "user entered all
        // digits but the resulting date does not exist on the calendar".
        if (!value && dateSeg && dateSeg.segs.every(s => s.buf.length === s.len)) {
            showToast('Такой даты не существует — введите корректное число');
            dateSeg.clear();
            return;   // stay in modal — do NOT call applyDeadline or closeModal
        }

        // ── SECONDARY CHECK (belt-and-suspenders, covers non-Chromium engines) ─
        // Some browsers may store the raw string without sanitising; the
        // component round-trip catches the rollover in that case.
        if (value) {
            const [yyyy, mm, dd] = value.split('-').map(Number);
            const chosen = new Date(yyyy, mm - 1, dd);   // local time, no UTC shift
            if (
                chosen.getFullYear() !== yyyy ||
                chosen.getMonth() + 1 !== mm  ||
                chosen.getDate()    !== dd
            ) {
                showToast('Такой даты не существует — введите корректное число');
                if (dateSeg) dateSeg.clear();
                document.getElementById('dl-date').value = '';
                return;
            }
            const today = new Date(); today.setHours(0, 0, 0, 0);
            if (chosen < today) { showToast('Нельзя выбрать дату в прошлом'); return; }
        }
    }

    const dl = value ? { mode, value } : null;
    // Extension 7: for date mode, persist optional time (HH:MM or empty)
    if (dl && mode === 'date') {
        const timeVal = (segInputs['dl-date-time']?.getValue() ||
                         document.getElementById('dl-date-time')?.value || '').trim();
        if (timeVal) dl.time = timeVal;
    }
    // X-7: optional event-duration for time-precise modes (instant when 0/unset).
    if (dl && (mode === 'time' || (mode === 'date' && dl.time))) {
        const _d = _readDlDuration();
        if (_d > 0) dl.durationMin = _d;
    }
    // Persist the chosen mode so next open pre-selects it
    if (dl) localStorage.setItem(K_DL_MODE, mode);
    // I-9: capture before applyDeadline() resets editingTaskId to null
    const targetId = editingTaskId;
    applyDeadline(dl);
    closeModalWithAnim('deadline-modal');
    // Update repeat availability AFTER deadline is confirmed — not on tab click
    if (targetId === null && !wasBulk) {
        updateRepeatAvailability(dl ? dl.mode : null);
        // X-8: auto-repeat coupling for the add-form (time→daily, monthday→monthly;
        // weektime is coupled in its own branch above). Object targets (task/sub/
        // form-sub) are coupled inside applyDeadline via _applyAutoRepeatToTarget.
        if (dl && _dlAutoRepeat && _AUTO_REPEAT_BY_MODE[dl.mode] && dl.mode !== 'weektime' && selectedRepeat === 'none') {
            setFormRepeat(_AUTO_REPEAT_BY_MODE[dl.mode]);
            if (dl.mode === 'monthday') {
                const _md = parseInt(dl.value) || null;
                if (window._formMdPickerSet) window._formMdPickerSet(_md || '');
                else formRepeatAnchorMonthday = _md;
            }
        }
    }
}

function applyDeadline(dl) {
    if (_formSubDeadlineIdx !== null) {       // P-E: form-subtask deadline (task not yet created; all modes except weektime)
        const s = formSubtasks[_formSubDeadlineIdx];
        if (s) { s.deadline = dl; _applyAutoRepeatToTarget(s, dl); renderFormSubtasks(); }
        _formSubDeadlineIdx = null;
        editingTaskId = null;
        editingSubId  = null;
        return;
    }
    if (editingSubId !== null) {              // P-E: subtask deadline target (all modes except weektime, which returns earlier)
        const task = state.tasks.find(t => t.id === editingTaskId);
        const sub  = task && task.subtasks.find(s => s.id === editingSubId);
        if (sub) {
            pushUndo();
            sub.deadline = dl;
            _applyAutoRepeatToTarget(sub, dl);
            saveState();
            renderSubList(editingTaskId);
            showToast(dl ? 'Дедлайн установлен' : 'Дедлайн удалён');
        }
        editingTaskId = null;
        editingSubId  = null;
        return;
    }
    if (bulkDeadlineActive) {                 // P-D: deadline modal opened for the selection
        bulkDeadlineActive = false;
        editingTaskId = null;
        bulkSetDeadline(dl);
        return;
    }
    if (editingTaskId !== null) {
        const task = state.tasks.find(t => t.id === editingTaskId);
        if (task) {
            pushUndo(); task.deadline = dl; _applyAutoRepeatToTarget(task, dl); saveState(); render();
            showToast(dl ? 'Дедлайн установлен' : 'Дедлайн удалён');
        }
    } else {
        formDeadline = dl;
        updateFormDeadlineDisplay();
    }
    editingTaskId = null;
}

function updateFormDeadlineDisplay() {
    const trigger  = document.getElementById('deadline-trigger-text');
    const clearBtn = document.getElementById('deadline-clear-btn');
    if (formDeadline) {
        trigger.textContent = formatDeadlineForm(formDeadline);  // full months, no relative words
        clearBtn.style.display = 'inline-flex';
    } else {
        trigger.textContent = 'Установить дедлайн';
        clearBtn.style.display = 'none';
    }
}

function clearFormDeadline(event) {
    if (event) event.stopPropagation();
    formDeadline = null;
    updateFormDeadlineDisplay();
    // Deadline cleared via X — unlock all repeat options
    updateRepeatAvailability(null);
}

function clearFormDeadlineState() {
    formDeadline = null;
    updateFormDeadlineDisplay();
    // Form reset — unlock all repeat options
    updateRepeatAvailability(null);
}

// ============================================================
//  MONTHDAY STEPPER
// ============================================================
function setupMonthdayStepper() {
    document.getElementById('dl-monthday-dec').addEventListener('click', () => stepMonthday(-1));
    document.getElementById('dl-monthday-inc').addEventListener('click', () => stepMonthday(+1));
    document.getElementById('dl-monthday').addEventListener('blur', () => {
        const v = parseInt(document.getElementById('dl-monthday').value);
        // Only reject truly unrecoverable input: empty / NaN / ≤ 0.
        // Everything in 1–∞ passes through so confirmDeadline can show
        // the correct inline warning with the actual value the user typed.
        if (isNaN(v) || v < 1) { document.getElementById('dl-monthday').value = ''; }
    });
    // Show the smart "short month" footnote in real time as the user types.
    // Logic is leap-year-aware. Replaces the old intrusive per-save toast.
    document.getElementById('dl-monthday').addEventListener('input', () => {
        const v    = parseInt(document.getElementById('dl-monthday').value);
        const note = document.getElementById('dl-monthday-note');
        if (!note) return;
        const text = monthdayNoteText(v);
        note.textContent = text;
        note.hidden = !text;
    });
}

// ── Year bounds: min = current year (deadlines must be present or future)
const getYearMin = () => new Date().getFullYear();
const YEAR_MAX = 2100;

function setupYearStepper() {
    const input = document.getElementById('dl-year');
    document.getElementById('dl-year-dec').addEventListener('click', () => stepYear(-1));
    document.getElementById('dl-year-inc').addEventListener('click', () => stepYear(+1));
    input.addEventListener('blur', () => {
        const v = parseInt(input.value);
        if (isNaN(v) || v < 1) { input.value = ''; return; }
        input.value = Math.min(Math.max(v, getYearMin()), YEAR_MAX);
    });
    // Set min attribute dynamically
    input.min = getYearMin();
    input.max = YEAR_MAX;
}

function stepYear(delta) {
    const input = document.getElementById('dl-year');
    let v = parseInt(input.value);
    if (isNaN(v)) v = new Date().getFullYear();
    v += delta;
    if (v < getYearMin()) v = getYearMin();
    if (v > YEAR_MAX)   v = YEAR_MAX;
    input.value = v;
}

function stepMonthday(delta) {
    // Wrap at 31 always — this mode means "Nth of every month", not current-month's last day.
    // Validation for short months (28/29/30) is shown as a UI note in monthdayNoteText().
    const maxDay = 31;
    const input  = document.getElementById('dl-monthday');
    let v = parseInt(input.value) || 0;
    v += delta;
    if (v < 1)      v = maxDay;
    if (v > maxDay) v = 1;
    input.value = v;
}

// Returns the footnote text for a given monthday value, leap-year-aware.
// Empty string means no note needed.
function _updateRepeatMonthdayHint(v) {
    const note = document.getElementById('repeat-anchor-monthday-note');
    if (!note) return;
    const text = monthdayNoteText(v);
    note.textContent = text;
    note.hidden = !text;
}

function setupRepeatMonthdayStepper() {
    const dec   = document.getElementById('repeat-anchor-monthday-dec');
    const inc   = document.getElementById('repeat-anchor-monthday-inc');
    const input = document.getElementById('repeat-anchor-monthday');
    if (!dec || !inc || !input) return;

    const step = (delta) => {
        let v = parseInt(input.value) || 0;
        v += delta;
        if (v < 1)  v = 31;
        if (v > 31) v = 1;
        input.value = v;
        _updateRepeatMonthdayHint(v);
    };
    dec.addEventListener('click', () => step(-1));
    inc.addEventListener('click', () => step(+1));
    input.addEventListener('blur', () => {
        const v = parseInt(input.value);
        if (isNaN(v) || v < 1) input.value = 1;
        if (v > 31) input.value = 31;
        _updateRepeatMonthdayHint(parseInt(input.value));
    });
    input.addEventListener('input', () => {
        _updateRepeatMonthdayHint(parseInt(input.value) || 0);
    });
}

function monthdayNoteText(v) {    if (!v || isNaN(v) || v < 29) return '';
    // I-18: We need to warn about February. The relevant question is whether
    // the *next* February will be in a leap year, not the current year.
    // e.g. if today is Nov 2027 (non-leap) the next February is Feb 2028 (leap)
    // — showing a warning would be incorrect for v=29.
    const now = new Date();
    const nextFebYear = now.getMonth() < 1 // January: next Feb is this year
        ? now.getFullYear()
        : now.getFullYear() + 1;           // Feb–Dec: next Feb is next year
    const isNextFebLeap = (nextFebYear % 4 === 0 && nextFebYear % 100 !== 0)
        || nextFebYear % 400 === 0;
    if (v === 29) {
        // In a leap year Feb 29 exists — no caveat needed.
        return isNextFebLeap ? '' : 'В феврале задача сдвинется на следующий месяц.';
    }
    if (v === 30) {
        // Feb never has 30 days, even in a leap year.
        return 'В феврале задача сдвинется на следующий месяц.';
    }
    // v >= 31 — affects February and months with 30 days (Apr, Jun, Sep, Nov).
    return 'В коротких месяцах задача сдвинется на следующий месяц.';
}

function updateMonthdayMax() {
    // IMP-5: monthday deadline repeats every month — the user needs to pick a
    // day that works for ANY month, not just the current one.  Capping input.max
    // to today's month (e.g. 28 in February) wrongly blocks entering 29–31.
    // The hint already explains the short-month behaviour via monthdayNoteText(),
    // so we just fix max=31 and update the informational hint with a general note.
    const input = document.getElementById('dl-monthday');
    const hint  = document.getElementById('dl-monthday-hint');
    input.max = 31;
    hint.textContent = '1–31 (в коротких месяцах — следующий день)';
    // No clamping — the user is allowed to set 31 for a monthly recurring task.
}

// ============================================================
//  DEADLINE UTILS
// ============================================================
// X-7: event-window for time-precise deadlines (time / weektime+time / date+time).
// Returns {start, end} in ms, end = start + durationMin*60000 (duration optional,
// 0 when unset → instant). For RECURRING modes (time = daily, weektime = weekly)
// the occurrence advances to the next period only once the WHOLE window has passed
// (end <= now) — so the deadline stays "live/burning" for the event's full duration
// instead of rolling forward the instant it begins. Returns null for modes without
// a precise clock-time (callers then fall back to their own day-level logic).
function deadlineWindow(dl) {
    if (!dl || !dl.value) return null;
    const { mode, value } = dl;
    const durMs = Math.max(0, parseInt(dl.durationMin) || 0) * 60000;
    const now   = Date.now();
    if (mode === 'time') {
        const [h, m] = value.split(':').map(Number);
        const d = new Date(); d.setHours(h, m, 0, 0);
        let start = d.getTime();
        if (start + durMs <= now) start += 86400000;        // whole window passed → tomorrow
        return { start, end: start + durMs };
    }
    if (mode === 'weektime' && dl.timeSet !== false) {
        const [wd, t] = value.split('|');
        if (!wd || !t) return null;
        const [h, m]   = t.split(':').map(Number);
        const jsTarget = parseInt(wd) === 7 ? 0 : parseInt(wd);
        const nowD     = new Date();
        const res      = new Date(nowD); res.setHours(h, m, 0, 0);
        res.setDate(res.getDate() + ((jsTarget - nowD.getDay() + 7) % 7));
        let start = res.getTime();
        if (start + durMs <= now) start += 7 * 86400000;    // whole window passed → next week
        return { start, end: start + durMs };
    }
    if (mode === 'date' && dl.time) {
        const start = new Date(value + 'T' + dl.time + ':00').getTime();
        return { start, end: start + durMs };               // one-time: never advances
    }
    return null;
}

function getDeadlineTimestamp(dl) {
    if (!dl || !dl.value) return null;
    const { mode, value } = dl;
    // X-7: time-precise modes resolve through the event-window (start of the current
    // or next occurrence) — keeps countdown/sorting anchored to the event start.
    const w = deadlineWindow(dl);
    if (w) return w.start;
    if (mode === 'date') {                  // date without time → midnight
        return new Date(value + 'T00:00:00').getTime();
    }
    if (mode === 'weektime') {              // Fix 1: day-only weektime → midnight of target weekday
        const [wd] = value.split('|');
        if (!wd) return null;
        const jsTarget  = parseInt(wd) === 7 ? 0 : parseInt(wd);
        const daysUntil = (jsTarget - new Date().getDay() + 7) % 7; // 0 = today
        const d = new Date(); d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + daysUntil);
        return d.getTime();
    }
    if (mode === 'monthday') {
        const day = parseInt(value);
        if (isNaN(day)) return null;
        const now     = new Date();
        const todayDay = now.getDate();
        // Fix 2: compare calendar days, not timestamps — avoids "today shifts to next month"
        // bug when midnight of target day is < current time.
        const d = new Date(now.getFullYear(), now.getMonth(), day); // midnight of target day
        if (day < todayDay) d.setMonth(d.getMonth() + 1); // strictly past → next month
        // day === todayDay → today; day > todayDay → later this month
        return d.getTime();
    }
    return null;
}

// Fix 2: calendar-day helpers — compare date-level deadlines as whole days,
// not raw milliseconds. This eliminates the off-by-one when it's e.g. 15:00
// and the deadline is tomorrow midnight: raw diff = 9h → Math.floor=0 → wrong.
function calDayDiff(ts) {
    // ts: timestamp of deadline (assumed midnight of target day for date/monthday)
    // Returns integer calendar days: 0 = today, 1 = tomorrow, negative = past
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(ts); target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
}

// Fix 1: day-diff for weektime-no-time deadlines (0 = today, 1-6 = days ahead)
function weektimeDayDiff(dl) {
    const [wd] = dl.value.split('|');
    const jsTarget = parseInt(wd) === 7 ? 0 : parseInt(wd);
    const jsToday  = new Date().getDay();
    return (jsTarget - jsToday + 7) % 7; // 0-6 only (0 = today, never loops to 7)
}

function deadlineStatus(dl) {
    if (!dl) return null;
    const { mode, value } = dl;
    const now = Date.now();

    // Режимы без timestamp — вычисляем напрямую
    if (mode === 'month') {
        const target = parseInt(value); // 1-12
        const cur = new Date().getMonth() + 1;
        const left = target >= cur ? target - cur : (12 - cur) + target;
        if (left === 0) return 'critical';
        if (left === 1) return 'urgent';
        if (left <= 3)  return 'warn';
        return 'ok';
    }
    if (mode === 'year') {
        const left = parseInt(value) - new Date().getFullYear();
        if (left < 0)  return 'over';
        if (left === 0) return 'critical';
        if (left === 1) return 'urgent';
        if (left <= 3)  return 'warn';
        return 'ok';
    }

    // Fix 1: weektime without explicit time → day-level thresholds
    if (mode === 'weektime' && dl.timeSet === false) {
        const days = weektimeDayDiff(dl);
        if (days === 0) return 'critical';
        if (days === 1) return 'urgent';
        if (days <= 3)  return 'warn';
        return 'ok';
    }

    // X-7: time-precise modes (time / weektime+time / date+time) resolve through the
    // event-window so the deadline burns ('live') for the WHOLE event, then advances.
    const win = deadlineWindow(dl);
    if (win) {
        if (now >= win.start && now <= win.end) return 'live';   // event in progress → burning
        if (now > win.end)  return 'over';                       // only one-time (date) reaches here
        const diff = win.start - now;                            // pre-event countdown
        if (mode === 'time') {
            if (diff < 1  * 3600000) return 'critical';
            if (diff < 3  * 3600000) return 'urgent';
            if (diff < 6  * 3600000) return 'warn';
            return 'ok';
        }
        if (mode === 'weektime') {
            if (diff < 2  * 3600000) return 'critical';
            if (diff < 8  * 3600000) return 'urgent';
            if (diff < 24 * 3600000) return 'warn';
            return 'ok';
        }
        // date + time
        if (diff < 3600000)   return 'critical';   // < 1h
        if (diff < 86400000)  return 'urgent';     // < 1 day
        if (diff < 259200000) return 'warn';       // < 3 days
        return 'ok';
    }

    const ts = getDeadlineTimestamp(dl);
    if (ts === null) return null;

    // Fix 2: date (no time) and monthday — use calendar days, not raw milliseconds.
    if (mode === 'date') {
        const days = calDayDiff(ts);
        if (days < 0)  return 'over';
        if (days === 0) return 'critical';
        if (days <= 2) return 'urgent';
        if (days <= 6) return 'warn';
        return 'ok';
    }
    if (mode === 'monthday') {
        const days = calDayDiff(ts);
        if (days < 0)  return 'over';
        if (days === 0) return 'critical';
        if (days <= 3) return 'urgent';
        if (days <= 9) return 'warn';
        return 'ok';
    }

    return 'ok';
}

function formatDeadlineCountdown(dl) {
    if (!dl) return null;
    const { mode, value } = dl;
    // X-7: during an event-window (time / weektime+time / date+time) show the live
    // "идёт" state with time-left, instead of a count to the next occurrence.
    const _win = deadlineWindow(dl);
    if (_win) {
        const _now = Date.now();
        if (_now >= _win.start && _now <= _win.end) {
            const left = _win.end - _now;
            if (_win.end === _win.start) return 'идёт сейчас';
            // X-7/#5: last minute → switch to seconds so the counter keeps ticking.
            if (left < 60000) return `идёт · ещё ${Math.max(1, Math.ceil(left / 1000))}с`;
            if (left < 3600000) return `идёт · ещё ${Math.round(left / 60000)}м`;
            const h = Math.floor(left / 3600000);
            const m = Math.round((left % 3600000) / 60000);
            return m ? `идёт · ещё ${h}ч ${m}м` : `идёт · ещё ${h}ч`;
        }
    }
    if (mode === 'month') {
        const target = parseInt(value);
        const cur = new Date().getMonth() + 1;
        const left = target >= cur ? target - cur : (12 - cur) + target;
        if (left === 0) return 'в этом месяце';
        if (left === 1) return 'следующий месяц';
        return `через ${left} мес.`;
    }
    if (mode === 'year') {
        const left = parseInt(value) - new Date().getFullYear();
        if (left < 0)  return 'просрочено';
        if (left === 0) return 'в этом году';
        if (left === 1) return 'следующий год';
        return `через ${left} л.`;
    }

    // Fix 1: weektime without time → day-level countdown
    if (mode === 'weektime' && dl.timeSet === false) {
        const days = weektimeDayDiff(dl);
        if (days === 0) return 'сегодня';
        if (days === 1) return 'завтра';
        return `через ${days}д`;
    }

    // Fix 2: monthday — use calDayDiff (ts is midnight, so raw diff < 0 for "today" is wrong)
    if (mode === 'monthday') {
        const ts = getDeadlineTimestamp(dl);
        if (ts === null) return null;
        const days = calDayDiff(ts);
        if (days < 0)  return 'просрочено';
        if (days === 0) return 'сегодня';
        if (days === 1) return 'завтра';
        return `через ${days}д`;
    }

    // Fix 2: date — use calDayDiff for same reason; show time if specified
    if (mode === 'date') {
        const ts = getDeadlineTimestamp(dl);
        if (ts === null) return null;
        const timeSuffix = dl.time ? ` ${dl.time}` : '';
        // When time is specified use minute-precision countdown for today
        if (dl.time) {
            const diff = ts - Date.now();
            if (diff < 0) {
                const ago = Math.abs(diff);
                if (ago < 3600000)  return `просрочено ${Math.round(ago/60000)}м`;
                if (ago < 86400000) return `просрочено ${Math.round(ago/3600000)}ч`;
                return 'просрочено';
            }
            const days = calDayDiff(ts);
            if (days === 0) {
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                if (h === 0) return `через ${m}м`;
                return `сегодня${timeSuffix}`;
            }
            if (days === 1) return `завтра${timeSuffix}`;
            return `через ${days}д${timeSuffix}`;
        }
        const days = calDayDiff(ts);
        if (days < 0)  return 'просрочено';
        if (days === 0) return 'сегодня';
        if (days === 1) return 'завтра';
        return `через ${days}д`;
    }

    // time / weektime-with-time: hour-precision countdown
    const ts  = getDeadlineTimestamp(dl);
    if (ts === null) return null;
    const now  = Date.now();
    const diff = ts - now;
    if (diff < 0) {
        const ago = Math.abs(diff);
        if (ago < 60000)    return 'только что';
        if (ago < 3600000)  return `просрочено ${Math.round(ago/60000)}м`;
        if (ago < 86400000) return `просрочено ${Math.round(ago/3600000)}ч`;
        return 'просрочено';
    }
    if (diff < 12 * 3600000) {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        if (h === 0) return `через ${m}м`;
        if (m === 0) return `через ${h}ч`;
        return `через ${h}ч ${m}м`;
    }
    if (diff < 86400000) return `через ${Math.round(diff/3600000)}ч`;
    const days = Math.round(diff / 86400000);
    return days === 1 ? 'завтра' : `через ${days}д`;
}

// bare=false (default): return relative words ('сегодня', 'завтра', 'вчера') for date mode.
// bare=true           : always return the actual date string — used in task badges where
//                       the countdown slot already shows the relative word; prevents
//                       "завтра · завтра" duplication.
function formatDeadlineAbsolute(dl, bare = false) {
    if (!dl || !dl.value) return '';
    const { mode, value } = dl;
    const MONTHS      = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    const MONTHS_FULL = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
    const DAYS        = ['','пн','вт','ср','чт','пт','сб','вс'];
    if (mode === 'year')     return `${value} г.`;
    if (mode === 'monthday') return `${value}-го числа`;
    if (mode === 'time')     return `в ${value}`;
    if (mode === 'weektime') {
        const [wd, t] = value.split('|');
        // Fix 1: if no explicit time was set, show only the day name
        if (dl.timeSet === false) return `${DAYS[parseInt(wd)] || '?'}`;
        return `${DAYS[parseInt(wd)] || '?'} в ${t}`;
    }
    if (mode === 'month') {
        const target = parseInt(value);
        const cur = new Date().getMonth() + 1;
        const yr  = new Date().getFullYear();
        const yearSuffix = target < cur ? ` ${yr + 1}` : '';
        return (MONTHS_FULL[target - 1] || value) + yearSuffix;
    }
    if (mode === 'date') {
        const d        = new Date(value + 'T00:00:00');
        const now      = new Date();
        const diffDays = Math.round((d - new Date(now.toDateString())) / 86400000);
        // Only return relative words when bare=false (schedule panel, archive, etc.)
        // In task badges (bare=true) the countdown already shows 'завтра'/'сегодня',
        // so the absolute slot must show the real date to avoid duplication.
        if (!bare) {
            if (diffDays === 0)  return 'сегодня';
            if (diffDays === 1)  return 'завтра';
            if (diffDays === -1) return 'вчера';
        }
        const sameYear = d.getFullYear() === now.getFullYear();
        return sameYear
            ? `${d.getDate()} ${MONTHS[d.getMonth()]}`
            : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }
    return String(value);
}

/** Form display variant: full month names in genitive case, no relative words.
 *  Used in updateFormDeadlineDisplay() so the inline deadline trigger reads
 *  "30 апреля" instead of "30 апр" or "завтра". */
function formatDeadlineForm(dl) {
    if (!dl || !dl.value) return '';
    const { mode, value } = dl;
    if (mode === 'date') {
        const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня',
                            'июля','августа','сентября','октября','ноября','декабря'];
        const d = new Date(value + 'T00:00:00');
        const now = new Date();
        const sameYear = d.getFullYear() === now.getFullYear();
        return sameYear
            ? `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
            : `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
    }
    // All other modes: delegate to the standard formatter
    return formatDeadlineAbsolute(dl);
}

// ---- Deadline timer ----
function startDeadlineTimer() {
    clearInterval(deadlineTimer);
    deadlineTimer = setInterval(() => {
        checkCycleResets();
        Promise.resolve().then(() => {
            updateDeadlineBadges();
            updateCycleUntilLabels();
            _checkDeadlineNotifications();
        });
    }, 2000); // 2s — responsive for manual cooldown triggers
}

// I-3: Browsers throttle setInterval in background tabs (up to 1 min+).
// When the user returns to the tab, immediately refresh deadlines and cycles
// so badges are never stale after screen-lock / tab-switch.
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        checkCycleResets();
        Promise.resolve().then(() => {
            updateDeadlineBadges();
            updateCycleUntilLabels();
        });
    }
});

/** Refresh text in .cycle-until-tag spans without a full render. */
function updateCycleUntilLabels() {
    state.tasks.forEach(task => {
        if (!task.cycleChecked || !task.nextReset) return;
        const tag = document.querySelector(`.task-item[data-id="${task.id}"] .cycle-until-tag span:last-child`);
        if (tag) tag.textContent = formatCycleUntil(task);
    });
}

// 6e: keep every "critical" deadline pulse in phase. A fixed epoch + negative
// animation-delay places each badge at the correct CONTINUOUS position of the
// 1.6s loop whenever it's (re)applied — so newly-rendered badges join the same
// rhythm with no collective jump, instead of each starting from a random phase.
const _PULSE_EPOCH = Date.now();
const _PULSE_MS = 1600; // must match pulseCritical / pulseSide duration in CSS
function _syncCriticalPulse() {
    if (prefersReducedMotion()) return;
    const delay = `-${(Date.now() - _PULSE_EPOCH) % _PULSE_MS}ms`;
    document.querySelectorAll('.meta-tag-wrap:has(> .deadline-tag.critical), .dl-side-panel.dl-side-critical')
        .forEach(el => { el.style.animationDelay = delay; });
}

function updateDeadlineBadges() {
    const tasksWithDl = state.tasks.filter(t => t.deadline);
    if (tasksWithDl.length) {
        // Build id → task map once (O(n)) instead of find() per DOM node (O(n²))
        const taskMap = new Map(tasksWithDl.map(t => [t.id, t]));

        document.querySelectorAll('.task-item[data-id]').forEach(li => {
            const id   = parseInt(li.dataset.id);
            const task = taskMap.get(id);
            if (!task) return;
            const badge = li.querySelector('.deadline-tag');
            if (!badge) return;
            const status = deadlineStatus(task.deadline);
            badge.className = 'meta-tag deadline-tag';
            if (status === 'over')          badge.classList.add('over');
            else if (status === 'live')     badge.classList.add('live');
            else if (status === 'critical') badge.classList.add('critical');
            else if (status === 'urgent')   badge.classList.add('urgent');
            else if (status === 'warn')     badge.classList.add('warn');
            const cdEl = badge.querySelector('.dl-countdown');
            const sep  = badge.querySelector('.dl-sep');
            const cd   = formatDeadlineCountdown(task.deadline);
            if (cdEl) {
                if (cd) { cdEl.textContent = cd; cdEl.style.display = ''; if (sep) sep.style.display = ''; }
                else    { cdEl.style.display = 'none'; if (sep) sep.style.display = 'none'; }
            }
        });
    }

    // P-E: subtask deadline badges + hover pills — live-tick the same way.
    document.querySelectorAll('.subtask-item[data-sid]').forEach(li => {
        const badge = li.querySelector('.sub-deadline-badge');
        if (!badge) return;                      // no deadline on this subtask
        const tid  = parseInt(li.dataset.tid);
        const sid  = parseInt(li.dataset.sid);
        const task = state.tasks.find(t => t.id === tid);
        const sub  = task && task.subtasks.find(s => s.id === sid);
        if (!sub || !sub.deadline) return;
        // Completed subtasks → dormant (neutral) badge, matching buildSubtaskItemHTML.
        const dormant = sub.checked || (sub.cycleChecked && sub.repeat && sub.repeat !== 'none');
        const status   = dormant ? null : deadlineStatus(sub.deadline);
        const statusCls = status ? ` sub-dl-${status}` : '';
        badge.className = 'sub-deadline-badge' + statusCls;
        badge.title     = formatDeadlineAbsolute(sub.deadline, true);
        const wrap = li.querySelector('.sub-deadline-wrapper');
        if (wrap) {
            // preserve the id so hover-reveal CSS + DnD keep targeting it
            wrap.className = 'sub-deadline-wrapper' + statusCls;
        }
        const cdEl  = li.querySelector('.sub-dl-countdown');
        const sepEl = li.querySelector('.sub-dl-sep');
        const cd    = formatDeadlineCountdown(sub.deadline);
        if (cdEl) {
            if (cd) { cdEl.textContent = cd; cdEl.style.display = ''; if (sepEl) sepEl.style.display = ''; }
            else    { cdEl.style.display = 'none'; if (sepEl) sepEl.style.display = 'none'; }
        }
        const absEl = li.querySelector('.sub-dl-date');
        if (absEl) absEl.textContent = formatDeadlineAbsolute(sub.deadline, true);
    });

    _syncCriticalPulse(); // 6e: re-align any newly-critical badges to the shared phase
}

// ============================================================
//  DRAG & DROP
// ============================================================
function setupSortables() {
    // FIX: cancel any pending rAF before destroying instances.
    // Without this, rapid consecutive calls (every render) queue multiple rAFs.
    // Each rAF fires later and re-creates Sortable on nodes that already have one,
    // leaving N duplicate instances attached to the same <ul> — DnD breaks silently.
    if (_setupRaf !== null) { cancelAnimationFrame(_setupRaf); _setupRaf = null; }

    // Destroy all existing instances synchronously
    // Also disconnect drag-handle ResizeObserver — its observed nodes are about to be replaced
    if (_dragHandleObserver) { _dragHandleObserver.disconnect(); _dragHandleObserver = null; }
    if (sortableMain) { try { sortableMain.destroy(); } catch(e){} sortableMain = null; }
    Object.values(sortableGroups).forEach(s => { try { s.destroy(); } catch(e){} });
    for (const k in sortableGroups) delete sortableGroups[k];
    Object.values(sortableSubs).forEach(s => { try { s.destroy(); } catch(e){} });
    for (const k in sortableSubs) delete sortableSubs[k];
    Object.values(sortableZones).forEach(s => { try { s.destroy(); } catch(e){} });
    for (const k in sortableZones) delete sortableZones[k];

    // Single rAF — guaranteed to fire exactly once per logical update cycle
    _setupRaf = requestAnimationFrame(() => {
        _setupRaf = null;

        // Normal mode: main list and group bodies get the shared 'tasks' group.
        // In schedule/split modes these containers hold no direct task children
        // (tasks live in zone sub-ULs), so they idle harmlessly.
        sortableMain = new Sortable(listContainer, { ...SORTABLE_OPTS });
        document.querySelectorAll('.group-body').forEach(ul => {
            const gid = parseInt(ul.id.replace('group-list-', ''));
            sortableGroups[gid] = new Sortable(ul, { ...SORTABLE_OPTS });
        });

        // ── Schedule-only mode: each sched-zone-ul is its own Sortable.
        //    Group name matches only same-type zones (sched_dl ↔ sched_dl,
        //    sched_ndl ↔ sched_ndl) — cross-zone movement blocked at library level.
        document.querySelectorAll('.sched-zone-ul').forEach((ul, i) => {
            const grpName = ul.dataset.sortableGroup; // 'sched_dl' | 'sched_ndl'
            const key = `${grpName}_${i}`;
            sortableZones[key] = new Sortable(ul, {
                ...SORTABLE_OPTS,
                group: {
                    name: grpName,
                    pull: true,
                    put: [grpName],   // only same-type zone accepts drops
                },
            });
        });

        // ── Split / combined modes: each split-active-body is its own Sortable.
        //    Group names: 'split_active' (split-only),
        //                 'combo_active_dl' / 'combo_active_ndl' (combined).
        //    put: [grpName] ensures only same-zone exchanges are possible.
        document.querySelectorAll('.split-active-body').forEach((ul, i) => {
            const grpName = ul.dataset.sortableGroup;
            const key = `${grpName}_${i}`;
            sortableZones[key] = new Sortable(ul, {
                ...SORTABLE_OPTS,
                group: {
                    name: grpName,
                    pull: true,
                    put: [grpName],
                },
            });
        });

        // ── Pinned zone (split mode): shares the 'split_active' pool so a card can
        //    be dragged OUT into the active zone (→ unpins) or reordered within.
        document.querySelectorAll('.split-pinned-body').forEach((ul, i) => {
            sortableZones[`split_pinned_${i}`] = new Sortable(ul, {
                ...SORTABLE_OPTS,
                group: { name: 'split_active', pull: true, put: ['split_active'] },
            });
        });

        // ── Done zones: fully disabled — no drag initiation, no drops accepted.
        document.querySelectorAll('.split-done-body').forEach(ul => {
            new Sortable(ul, {
                group:    { name: 'done_locked', pull: false, put: false },
                disabled: true,
                sort:     false,
                animation: 0,
            });
        });

        // Init subtask sortables — 7b: only for OPEN sections. Collapsed subtask
        // lists are hidden (can't be dragged anyway), so skipping them avoids
        // creating hundreds of idle Sortable instances on large boards. A section
        // gets its Sortable lazily when the user expands it (toggleSubtasksSection).
        state.tasks.forEach(task => {
            if (task.subtasks && task.subtasks.length && task.subtasksOpen) initSubSortable(task.id);
        });
    });
}

// ── Priority inheritance on drag ──
function inferNeighbourPriority(movedId, ul) {
    const items = Array.from(ul.querySelectorAll(':scope > .task-item'));
    const idx   = items.findIndex(el => parseInt(el.dataset.id) === movedId);
    if (idx === -1) return null;
    // Prefer the task above; fall back to task below
    if (idx > 0) {
        const above = state.tasks.find(t => t.id === parseInt(items[idx-1].dataset.id));
        if (above) return above.priority;
    }
    if (idx < items.length - 1) {
        const below = state.tasks.find(t => t.id === parseInt(items[idx+1].dataset.id));
        if (below) return below.priority;
    }
    return null;
}

function applyPriorityInheritance(movedId, ul) {
    const task = state.tasks.find(t => t.id === movedId);
    if (!task) return;
    // V-1: a colour-labelled task opts OUT of drag priority-inheritance — so a reorder
    // never pairs a priority WITH a colour (mutually exclusive) and never silently drops
    // the colour label (rule #1: never lose data). Explicit priority via the modal/bulk
    // still clears the colour, because there the user is deliberately choosing it.
    if (task.color) return;
    const newPrio = inferNeighbourPriority(movedId, ul);
    if (newPrio !== null && newPrio !== task.priority) {
        task.priority = newPrio;
        const el = ul.querySelector(`.task-item[data-id="${movedId}"]`);
        if (el) el.dataset.prio = newPrio;
    }
}

function onDragAdd(evt) {
    const taskId = parseInt(evt.item.dataset.id);
    const task   = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    // ── Pin / unpin via the split "Закреплённые" zone ──────────────────────
    // Drop INTO the pinned zone → pin; drag OUT of it elsewhere → unpin. Pin
    // state changes never inherit a neighbour's priority (the task keeps its own).
    const toPinned   = evt.to.dataset.zonePinned === '1';
    const fromPinned = evt.from.dataset.zonePinned === '1';
    let pinnedChanged = false;
    if (toPinned && !task.pinned)        { task.pinned = true;  pinnedChanged = true; }
    else if (fromPinned && !toPinned && task.pinned) { task.pinned = false; pinnedChanged = true; }

    // Determine new groupId
    let newGid = null;
    if (evt.to.id && evt.to.id.startsWith('group-list-')) {
        newGid = parseInt(evt.to.id.replace('group-list-', '')) || null;
    } else if (evt.to.dataset.groupId !== undefined && evt.to.dataset.groupId !== '') {
        newGid = parseInt(evt.to.dataset.groupId) || null;
    } else if (evt.to.id === 'list-container') {
        newGid = null;
    } else {
        const sec = evt.to.closest('.group-section');
        newGid = sec ? parseInt(sec.dataset.groupId) || null : null;
    }

    const groupChanged = task.groupId !== newGid;
    task.groupId = newGid;
    reorderList(evt.to);
    reorderList(evt.from);
    // Skip priority inheritance when pin state changed or a pinned zone is involved
    // — a pinned task must keep its own priority (so unpin restores its real state).
    if (!pinnedChanged && !toPinned && !fromPinned) applyPriorityInheritance(taskId, evt.to);
    saveState();
    updateGroupCounts();

    // Re-render when the zone structure must change: a cross-group drop in
    // schedule/split mode, OR any pin/unpin (the task must hop into/out of the
    // "Закреплённые" zone and the header count must refresh).
    if (pinnedChanged || (groupChanged && (isScheduleMode || isGroupSplitMode))) {
        render();
    }
}

function onDragEnd(evt) {
    const taskId = parseInt(evt.item.dataset.id);
    reorderList(evt.from);
    if (evt.from !== evt.to) reorderList(evt.to);
    // A reorder inside the pinned zone must not rewrite the task's priority.
    if (evt.to.dataset.zonePinned !== '1' && evt.from.dataset.zonePinned !== '1') {
        applyPriorityInheritance(taskId, evt.to);
    }
    saveState();
    document.body.classList.remove('is-dragging');
    // Always clean up portal glow regardless of where drag ended
    document.querySelectorAll('.group-body.drag-over')
        .forEach(el => el.classList.remove('drag-over'));

    // ── Ghost settle: smooth ink-to-solid transition after drop ──────
    // Uses inline style transition (NOT a @keyframes animation) so it
    // cannot conflict with taskIn or any other CSS animation on .task-item.
    // Approach: set ghost appearance inline → next rAF remove it →
    // CSS transition handles the smooth return to normal.
    if (!prefersReducedMotion() && evt.item) {
        const el = evt.item;
        // Apply ghost visual immediately (inline overrides everything)
        el.style.transition = 'none';
        el.style.opacity    = '0.28';
        el.style.filter     = 'sepia(0.65) saturate(0.32) brightness(0.78)';

        // Next frame: enable transition and remove ghost styles → browser animates back to normal
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                el.style.transition = 'opacity 0.75s cubic-bezier(0.16,1,0.3,1), filter 0.75s cubic-bezier(0.16,1,0.3,1)';
                el.style.opacity    = '';
                el.style.filter     = '';
                // Clean up transition override after it completes
                setTimeout(() => {
                    el.style.transition = '';
                }, 800);
            });
        });
    }
    // ─────────────────────────────────────────────────────────────────
}

function reorderList(ul) {
    Array.from(ul.querySelectorAll(':scope > .task-item')).forEach((li, i) => {
        const t = state.tasks.find(t => t.id === parseInt(li.dataset.id));
        if (t) t.order = i;
    });
}

function updateGroupCounts() {
    // I-19: build counts in a single O(N) pass, then apply in O(M) — was O(M*N).
    const counts = new Map();
    state.tasks.forEach(t => {
        if (isTodayMode && !isDueTodayOrOverdue(t.deadline)) return; // P-B: badge matches Today scope
        const key = t.groupId;
        const c = counts.get(key) || { total: 0, done: 0 };
        c.total++;
        if (t.checked || t.cycleChecked) c.done++;
        counts.set(key, c);
    });
    document.querySelectorAll('.group-section').forEach(sec => {
        const gid   = parseInt(sec.dataset.groupId);
        const c     = counts.get(gid) || { total: 0, done: 0 };
        const badge = sec.querySelector('.group-count');
        if (badge) badge.textContent = `${c.done}/${c.total}`;
    });
}

// ============================================================
//  FILTER & SEARCH
// ============================================================
function toggleFilter() {
    isFiltered = !isFiltered;
    saveUiState();
    btnFilter.classList.toggle('active', isFiltered);
    render();
    showToast(isFiltered ? 'Фильтр: только невыполненные' : 'Показаны все задачи');
    // D-3: announce result count for screen readers
    const visible = _visibleTaskEls().length;
    announce(isFiltered ? `Показано ${visible} невыполненных задач` : `Показаны все задачи`);
}

// Toggle schedule sort mode — null = global, number = per-group
function toggleScheduleMode(groupId) {
    if (groupId === null || groupId === undefined) {
        isScheduleMode = !isScheduleMode;
        document.getElementById('btn-schedule').classList.toggle('active', isScheduleMode);
    } else {
        if (scheduleModeGroups.has(groupId)) {
            scheduleModeGroups.delete(groupId);
        } else {
            scheduleModeGroups.add(groupId);
        }
    }
    saveUiState();
    render();
}

// P-B: "Today" view — only tasks due today or overdue, deadline-ordered.
function toggleTodayMode() {
    isTodayMode = !isTodayMode;
    const btn = document.getElementById('btn-today');
    if (btn) btn.classList.toggle('active', isTodayMode);
    saveUiState();
    render();
    showToast(isTodayMode ? 'Только на сегодня и просроченные' : 'Показаны все задачи');
    if (isTodayMode) {
        const visible = _visibleTaskEls().length;
        announce(`На сегодня: ${visible} задач`);
    } else {
        announce('Показаны все задачи');
    }
}

// ── P7: Split groups mode — divides each group into active / done zones ──────
function toggleGroupSplitMode() {
    isGroupSplitMode = !isGroupSplitMode;
    const btn = document.getElementById('btn-split-groups');
    if (btn) btn.classList.toggle('active', isGroupSplitMode);
    saveUiState();
    render();
    showToast(isGroupSplitMode ? 'Режим: активные / выполненные' : 'Режим: обычный список');
}

/**
 * Render tasks inside a group body in split mode:
 * two collapsible zones — active tasks and completed tasks.
 */
// P7: Combined mode — deadline is outer grouping, active/done split is inner.
// When BOTH dl and ndl tasks exist → nested structure with sched-split-inner wrapper.
// When only ONE type exists → render split directly on container (no indentation).
function appendScheduleSplitSection(container, withDl, noDl, groupId) {
    const hasBoth = withDl.length > 0 && noDl.length > 0;

    if (!hasBoth) {
        // No deadline mix — render split directly without any nesting wrapper.
        // This avoids the left-border indentation when there's nothing to separate.
        const allTasks = withDl.length > 0 ? withDl : noDl;
        const splitKey = groupId + (withDl.length > 0 ? '_dl' : '_ndl');
        appendSplitSection(container, allTasks, splitKey, groupId);
        return;
    }

    // Both deadline and non-deadline tasks exist — use full nested layout.
    if (withDl.length > 0) {
        const sep = document.createElement('li');
        sep.className = 'dl-subgroup-header';
        sep.innerHTML = `<span>${IC.sundial}<span>С дедлайном · ${withDl.length}</span></span>`;
        container.appendChild(sep);
        const innerUl = document.createElement('ul');
        innerUl.className = 'sched-split-inner';
        innerUl.dataset.zoneDl  = '1';
        innerUl.dataset.groupId = groupId;
        appendSplitSection(innerUl, withDl, groupId + '_dl', groupId);
        container.appendChild(innerUl);
    }
    if (noDl.length > 0) {
        const sep2 = document.createElement('li');
        sep2.className = 'dl-subgroup-header dl-subgroup-nodl';
        sep2.innerHTML = `<span>${IC.moon}<span>Без дедлайна · ${noDl.length}</span></span>`;
        container.appendChild(sep2);
        const innerUl2 = document.createElement('ul');
        innerUl2.className = 'sched-split-inner';
        innerUl2.dataset.zoneDl  = '0';
        innerUl2.dataset.groupId = groupId;
        appendSplitSection(innerUl2, noDl, groupId + '_ndl', groupId);
        container.appendChild(innerUl2);
    }
}


// appendSplitSection: renders active + done zones inside `ul`.
// `splitKey`    — string key for collapse state (may include '_dl'/'_ndl' suffix)
// `realGroupId` — integer group id (or null) used for groupId resolution on drop
function appendSplitSection(ul, tasks, splitKey, realGroupId) {
    const active = tasks.filter(t => !t.checked && !t.cycleChecked);
    const done   = tasks.filter(t =>  t.checked ||  t.cycleChecked);

    // Determine the Sortable group name for the active zone:
    //   combined mode (ul is sched-split-inner) → isolate by dl/ndl
    //   split-only mode                         → single 'split_active' pool
    const isCombo      = ul.dataset.zoneDl !== undefined;
    const activeGroup  = isCombo
        ? (ul.dataset.zoneDl === '1' ? 'combo_active_dl' : 'combo_active_ndl')
        : 'split_active';

    const doneCollapsed = localStorage.getItem('groupSplit_done_' + splitKey) === '1';

    // ── Active zone wrapped in its own sortable UL ──────────────────────────
    if (active.length > 0) {
        const activeKey = 'groupSplit_active_' + splitKey;
        const activeCollapsed = localStorage.getItem(activeKey) === '1';
        const hdr = document.createElement('li');
        hdr.className = 'split-zone-header split-active-header' + (activeCollapsed ? ' collapsed' : '');
        hdr.innerHTML = `<svg viewBox="0 0 14 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6.5C7 6.5 5 5 5 3.2C5 2 5.8 1.2 6.5 1C6.5 1 6 2.2 7 3C8 2 8.5 1 8.5 1C9.5 1.5 9 3 9 3.2C9 5 7 6.5 7 6.5Z" fill="currentColor" stroke="none" opacity="0.7"/><rect x="4.5" y="6.5" width="5" height="9" rx="0.7"/><line x1="3" y1="15.5" x2="11" y2="15.5" stroke-width="1.2"/><line x1="7" y1="6.5" x2="7" y2="7.5"/></svg><span>Активные · ${active.length}</span><svg class="split-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="17"/><path d="M9 5L12 2L15 5"/><line x1="10" y1="14" x2="14" y2="14"/><path d="M11 17L10 20H14L13 17"/><circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none"/></svg>`;
        hdr.onclick = () => {
            const c = hdr.classList.toggle('collapsed');
            localStorage.setItem(activeKey, c ? '1' : '0');
            const wrap = hdr.nextElementSibling;
            if (wrap && wrap.classList.contains('split-active-wrap')) {
                wrap.classList.toggle('collapsed', c);
            }
        };
        ul.appendChild(hdr);

        const activeWrap = document.createElement('li');
        activeWrap.className = 'split-active-wrap' + (activeCollapsed ? ' collapsed' : '');
        activeWrap.style.cssText = 'list-style:none;padding:0;margin:0;';

        const activeUl = document.createElement('ul');
        activeUl.className = 'split-active-body';
        activeUl.dataset.sortableGroup = activeGroup;
        activeUl.dataset.groupId       = realGroupId != null ? realGroupId : '';
        active.forEach(t => activeUl.appendChild(
            createTaskEl(t, scheduleActive(realGroupId) && !!t.deadline)
        ));
        activeWrap.appendChild(activeUl);
        ul.appendChild(activeWrap);
    }

    // ── Done zone — collapsible, fully locked ───────────────────────────────
    if (done.length > 0) {
        const doneHdr = document.createElement('li');
        doneHdr.className = 'split-zone-header split-done-header' + (doneCollapsed ? ' collapsed' : '');
        doneHdr.setAttribute('data-split-key', splitKey);
        doneHdr.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 3 H15.5 L18 10 L14.5 21 H9.5 L6 10 Z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9.5" y1="10.5" x2="14.5" y2="10.5"/></svg><span>Выполненные · ${done.length}</span><svg class="split-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="17"/><path d="M9 5L12 2L15 5"/><line x1="10" y1="14" x2="14" y2="14"/><path d="M11 17L10 20H14L13 17"/><circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none"/></svg>`;
        doneHdr.onclick = () => {
            const c = doneHdr.classList.toggle('collapsed');
            localStorage.setItem('groupSplit_done_' + splitKey, c ? '1' : '0');
            const wrap = doneHdr.nextElementSibling;
            if (wrap && wrap.classList.contains('split-done-wrap')) {
                wrap.classList.toggle('collapsed', c);
            }
        };
        ul.appendChild(doneHdr);

        // Wrap done-body in an animated li container (div is invalid inside ul)
        const doneWrap = document.createElement('li');
        doneWrap.className = 'split-done-wrap' + (doneCollapsed ? ' collapsed' : '');
        doneWrap.style.listStyle = 'none';
        doneWrap.style.padding   = '0';
        doneWrap.style.margin    = '0';

        const doneBody = document.createElement('ul');
        doneBody.className = 'split-done-body';
        doneBody.dataset.zoneDone = '1';
        doneBody.style.listStyle = 'none';
        done.forEach(t => doneBody.appendChild(createTaskEl(t, false)));
        doneWrap.appendChild(doneBody);
        ul.appendChild(doneWrap);
    }
}

let _searchDebounce = null;
searchBox.addEventListener('input', () => {
    searchQuery = searchBox.value.trim();
    saveUiState();
    // Debounce render: 120 ms is imperceptible to users but cuts render calls
    // during fast typing from N per keystroke to ~1 (audit E-2)
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(() => {
        render();
        // D-3: announce result count for screen readers after debounced render
        if (searchQuery) {
            const visible = _visibleTaskEls().length;
            announce(`Найдено ${visible} задач`);
        }
    }, 120);
});

// #3 (порт NA-13): крестик-кинжалы очищают поиск, перерисовывают список (и тег-облако)
// и возвращают фокус в поле. Видимость кнопки — чисто CSS (:placeholder-shown).
function clearMainSearch() {
    searchBox.value = '';
    searchQuery = '';
    saveUiState();
    render();
    searchBox.focus();
}
function clearArchiveSearch() {
    const sb = document.getElementById('archive-search-box');
    if (sb) sb.value = '';
    archiveSearchQuery = '';
    renderArchive();
    if (sb) sb.focus();
}

// #4: empty-state CTA — focus (and reveal) the new-task field so «Добавить первую задачу»
// drops the user straight onto the input.
function focusNewTaskInput() {
    const inp = document.getElementById('input-box');
    if (!inp) return;
    inp.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    inp.focus();
}

// ============================================================
//  PRIORITY / REPEAT SELECTORS (form)
// ============================================================
document.querySelectorAll('#priority-selector .prio-grid-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedPriority = btn.dataset.prio;
        document.querySelectorAll('#priority-selector .prio-grid-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // FIX-1: Disable form color picker whenever a priority is chosen
        _syncFormColorPickerState();
    });
});

// Mutual exclusion in the form: picking a priority clears any chosen colour
// (and vice-versa via _setFormColor). No longer disables the picker — colour and
// priority simply replace one another, matching per-task behaviour.
function _syncFormColorPickerState() {
    const hasPrio = selectedPriority && selectedPriority !== 'none';
    const picker  = document.getElementById('form-color-picker');
    if (!picker) return;
    if (hasPrio) {
        selectedFormColor = null;
        picker.querySelectorAll('.form-color-swatch').forEach(s =>
            s.classList.toggle('active', s.dataset.color === ''));
        const custom = picker.querySelector('.form-color-custom');
        if (custom) { custom.classList.remove('has-color'); custom.style.background = ''; }
    }
}

// Set the form's chosen colour (from a preset swatch OR the spectrum modal),
// reflect it in the picker, and clear any chosen priority (mutual exclusion).
function _setFormColor(c) {
    selectedFormColor = c || null;
    const picker = document.getElementById('form-color-picker');
    if (picker) {
        let matched = false;
        picker.querySelectorAll('.form-color-swatch').forEach(s => {
            const on = (s.dataset.color || null) === selectedFormColor;
            s.classList.toggle('active', on);
            if (on) matched = true;
        });
        // Custom (non-preset) colour → fill the crystal button with it like a swatch
        const custom = picker.querySelector('.form-color-custom');
        if (custom) {
            const isCustom = !!selectedFormColor && !matched;
            custom.classList.toggle('has-color', isCustom);
            custom.style.background = isCustom ? selectedFormColor : '';
        }
    }
    if (selectedFormColor) {
        selectedPriority = 'none';
        document.querySelectorAll('#priority-selector .prio-grid-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.prio === 'none'));
    }
}

document.querySelectorAll('#repeat-selector .repeat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        setFormRepeat(btn.dataset.repeat);
    });
});

// Form-level repeat anchor state
let formRepeatAnchorTime     = null;
let formRepeatAnchorDay      = null;
let formRepeatAnchorMonthday = null;

function setFormRepeat(repeat) {
    selectedRepeat = repeat;
    document.querySelectorAll('#repeat-selector .repeat-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.repeat === repeat)
    );
    // Problem 3: show/hide inline anchor section in form
    const anchor = document.getElementById('form-repeat-anchor');
    const wdRow  = document.getElementById('form-repeat-anchor-wd-row');
    const mdRow  = document.getElementById('form-repeat-anchor-md-row');
    const tmRow  = document.getElementById('form-repeat-anchor-time-row');
    if (anchor) anchor.style.display = (repeat && repeat !== 'none') ? '' : 'none';
    if (wdRow)  wdRow.style.display  = repeat === 'weekly'  ? '' : 'none';
    if (mdRow)  mdRow.style.display  = repeat === 'monthly' ? '' : 'none';
    if (tmRow)  tmRow.style.display  = (repeat && repeat !== 'none') ? '' : 'none';
    if (repeat === 'none') {
        formRepeatAnchorTime = null;
        formRepeatAnchorDay  = null;
        formRepeatAnchorMonthday = null;
    }
}

// ============================================================
//  EXPAND EXTRA FIELDS
// ============================================================
function toggleExpand() {
    expandOpen = !expandOpen;
    saveUiState();
    btnExpand.classList.toggle('open', expandOpen);

    if (expandOpen) {
        // ── Open: measure content height and animate to it ──────────
        extraFields.classList.add('open');
        extraFields.style.maxHeight = extraFields.scrollHeight + 'px';
        // M-4: switch to 'none' only after the MAX-HEIGHT transition ends (the
        // propertyName filter inside onMaxHeightEnd avoids firing on the faster
        // opacity transition). S1-5: fallback timer covers reduced-motion / no-op.
        if (extraFields._collapseCancel) extraFields._collapseCancel();
        extraFields._collapseCancel = onMaxHeightEnd(extraFields, () => {
            extraFields._collapseCancel = null;
            if (expandOpen) extraFields.style.maxHeight = 'none';
        });
    } else {
        // ── Close: pin current height first, then animate to 0 ──────
        extraFields.style.maxHeight = extraFields.scrollHeight + 'px';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                extraFields.style.maxHeight = '0';
                extraFields.classList.remove('open');
            });
        });

        // Reset form state when collapsing (audit B-9)
        clearFormSubtasks();
        clearFormDeadlineState();
        setFormRepeat('none');
        document.querySelectorAll('#repeat-selector .repeat-btn').forEach(b => { b.disabled = false; });
        selectedPriority = 'none';
        document.querySelectorAll('#priority-selector .prio-grid-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.prio === 'none'));
        _setFormColor(null); // also clears the custom crystal button on collapse
        taskGroupSelect.value = '';
        renderGroupChips('');
        if (taskNote) taskNote.value = '';
    }
}

// ============================================================
//  PROGRESS & VISIBILITY
// ============================================================
// IMP-10: persist milestone across reloads so we don't fire on first render.
// Seed from localStorage; fallback -1 if never set or keys missing.
let _lastProgressMilestone = parseInt(localStorage.getItem('dusk_milestone') || '-1');

function updateProgress() {
    const total = state.tasks.length;
    // FIX: cycleChecked tasks count as "done" in progress
    const done  = state.tasks.filter(t => t.checked || t.cycleChecked).length;
    const pct   = total ? Math.round(done / total * 100) : 0;

    progressBar.style.width = pct + '%';

    // ── Counter spring-bounce ─────────────────────────────────────
    // Animate counter digits when value changes (skip on first render)
    const prevDone  = parseInt(doneCount.textContent)  || 0;
    const prevTotal = parseInt(quantityCount.textContent) || 0;

    doneCount.textContent     = done;
    quantityCount.textContent = total;

    if (!prefersReducedMotion()) {
        if (done !== prevDone) {
            doneCount.classList.remove('counter-pop');
            void doneCount.offsetWidth; // reflow
            doneCount.classList.add('counter-pop');
        }
        if (total !== prevTotal) {
            quantityCount.classList.remove('counter-pop');
            void quantityCount.offsetWidth;
            quantityCount.classList.add('counter-pop');
        }
    }
    // ─────────────────────────────────────────────────────────────

    // ── Milestone glow (25 / 50 / 75 / 100%) ─────────────────────
    if (!prefersReducedMotion() && total > 0) {
        const milestones = [25, 50, 75, 100];
        // Find the highest milestone we've crossed
        let reached = -1;
        for (const m of milestones) {
            if (pct >= m) reached = m;
        }
        // Fire only on a new crossing (not on every render, not on page reload)
        if (reached > _lastProgressMilestone) {
            _lastProgressMilestone = reached;
            localStorage.setItem('dusk_milestone', reached); // IMP-10: persist
            progressBar.classList.remove('milestone-glow');
            void progressBar.offsetWidth;
            progressBar.classList.add('milestone-glow');
            progressBar.addEventListener('animationend',
                () => progressBar.classList.remove('milestone-glow'),
                { once: true }
            );
        }
        // Reset tracking when tasks are added / list grows
        if (pct < (_lastProgressMilestone > 0 ? _lastProgressMilestone - 24 : 0)) {
            _lastProgressMilestone = -1;
            localStorage.setItem('dusk_milestone', '-1'); // IMP-10: persist reset
        }
    }
    // ─────────────────────────────────────────────────────────────

    // ── Subtask footnote counter ──────────────────────────────────
    const subtaskRow = document.getElementById('subtask-progress-row');
    const subDoneEl  = document.getElementById('subtask-done-count');
    const subTotalEl = document.getElementById('subtask-total-count');
    const subBar     = document.getElementById('subtask-prog-bar');
    if (subtaskRow && subDoneEl && subTotalEl) {
        let subTotal = 0, subDone = 0;
        state.tasks.forEach(t => {
            if (!t.subtasks || !t.subtasks.length) return;
            subTotal += t.subtasks.length;
            subDone  += t.subtasks.filter(s => s.checked || s.cycleChecked).length;
        });
        if (subTotal > 0) {
            subtaskRow.style.display = 'flex';
            subDoneEl.textContent  = subDone;
            subTotalEl.textContent = subTotal;
            if (subBar) subBar.style.width = Math.round(subDone / subTotal * 100) + '%';
        } else {
            subtaskRow.style.display = 'none';
        }
    }
    // ─────────────────────────────────────────────────────────────
}

// Track whether empty-state was previously hidden so we only animate on transition
let _emptyWasVisible = false;

function updateVisibility() {
    const hasTasks = state.tasks.length > 0;
    progressSection.style.display = hasTasks ? 'flex'  : 'none';
    toolbar.style.display         = hasTasks ? 'flex'  : 'none';
    groupsBar.style.display       = 'flex';

    const query     = searchQuery.toLowerCase();
    // When filter is active, visible tasks exclude both checked and cycleChecked
    let visibleTasks = isFiltered
        ? state.tasks.filter(t => !t.checked && !t.cycleChecked)
        : [...state.tasks];
    // V-2: colour filter and focus mode also decide whether the list is empty,
    // so the empty-state plaque shows instead of a silent blank area.
    if (colorFilter) visibleTasks = visibleTasks.filter(t => t.color === colorFilter);
    if (focusGroupId !== null) visibleTasks = visibleTasks.filter(t => t.groupId === focusGroupId);
    // P-B: Today view narrows the empty-state check to today's/overdue tasks.
    if (isTodayMode) visibleTasks = visibleTasks.filter(t => isDueTodayOrOverdue(t.deadline));
    const noVisible = query
        ? !visibleTasks.some(t =>
            t.text.toLowerCase().includes(query) ||
            (t.note && t.note.toLowerCase().includes(query)) ||
            (t.subtasks && t.subtasks.some(s => s.text.toLowerCase().includes(query)))
          )
        : visibleTasks.length === 0;

    const wasHidden = !_emptyWasVisible;
    _emptyWasVisible = noVisible;

    // C-2: distinguish three "list reads empty" cases so the plaque never lies:
    //   • every task complete  → the «Все задачи выполнены» plaque (persists across reloads)
    //   • no tasks at all       → "Нет задач. Добавьте первую."
    //   • tasks exist but a filter/search/Today/focus hides them → neutral "Ничего не найдено"
    // Before: filter-ON + all-done showed a FALSE "Нет задач. Добавьте первую." on every render.
    const allDoneGlobal = state.tasks.length > 0 &&
        state.tasks.every(t => t.checked || t.cycleChecked);
    // C-2 (уточнено): плашка «Все выполнены» — только когда список пуст ИМЕННО из-за
    // завершённости (напр. при скрытии выполненных), БЕЗ активного поиска/цвет-фильтра/
    // фокуса/Today. Если же что-то скрыто реальным фильтром — честное «Ничего не найдено».
    const queryFilterActive = !!query || !!colorFilter || focusGroupId !== null || isTodayMode;

    if (noVisible && allDoneGlobal && !queryFilterActive) {
        emptyState.style.display = 'none';
        allDone.style.display = 'flex';
        allDone.style.flexDirection = 'column';
        allDone.style.alignItems = 'center';
        return;   // showAllDone() layers the celebration animation on top when triggered by a check
    }
    allDone.style.display = 'none';

    emptyState.style.display = noVisible ? 'flex' : 'none';
    if (noVisible) {
        emptyState.style.flexDirection = 'column';
        emptyState.style.alignItems = 'center';
        // Honest message: tasks exist but are filtered out → "nothing found", else "add first".
        const _msgEl = emptyState.querySelector('p');
        const _noTasks = state.tasks.length === 0;
        if (_msgEl) _msgEl.textContent = _noTasks
            ? 'Нет задач. Добавьте первую.'
            : 'Ничего не найдено';
        // #4: the «Добавить первую задачу» CTA only makes sense when there are NO tasks —
        // under an active filter («Ничего не найдено») adding a task would be a non-sequitur.
        const _addBtn = document.getElementById('empty-add-btn');
        if (_addBtn) _addBtn.style.display = _noTasks ? 'inline-flex' : 'none';

        // ── Empty state staged entrance ───────────────────────────
        // Only animate when transitioning from hidden → visible
        if (!prefersReducedMotion() && wasHidden) {
            const rune   = emptyState.querySelector('.empty-rune');
            const textEl = emptyState.querySelector('p');
            if (rune) {
                rune.style.animation = 'none';
                void rune.offsetWidth;
                // Entrance, then settle into ambient ornamentPulse
                rune.style.animation = 'emptyRuneIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards';
                rune.addEventListener('animationend', () => {
                    rune.style.animation = 'ornamentPulse 5s ease-in-out infinite';
                }, { once: true });
            }
            if (textEl) {
                textEl.style.animation = 'none';
                textEl.style.opacity   = '0';
                void textEl.offsetWidth;
                textEl.style.animation = 'emptyTextIn 0.32s ease 0.2s forwards';
            }
        }
        // ─────────────────────────────────────────────────────────
    }
}

// Cathedral-flash cleanup controller — ensures we never accumulate multiple listeners
let _cathedralFlashAbort = null;

function showAllDone() {
    allDone.style.display       = 'flex';
    allDone.style.flexDirection = 'column';
    allDone.style.alignItems    = 'center';
    playSound('allDone');

    if (!prefersReducedMotion()) {
        // Cathedral flash on the app box
        const appBox = document.querySelector('.todo-app');
        if (appBox) {
            // ANIM-5: abort any previous listener before adding a new one
            if (_cathedralFlashAbort) { _cathedralFlashAbort.abort(); }
            _cathedralFlashAbort = new AbortController();
            appBox.classList.remove('cathedral-flash');
            void appBox.offsetWidth;
            appBox.classList.add('cathedral-flash');
            appBox.addEventListener('animationend', (e) => {
                if (e.animationName === 'cathedralFlash') appBox.classList.remove('cathedral-flash');
            }, { once: true, signal: _cathedralFlashAbort.signal });
        }

        // Staged icon → text entrance (icon uses existing allDoneIcon keyframe,
        // text fades in with delay)
        const icon    = allDone.querySelector('.all-done-icon');
        const textEl  = allDone.querySelector('p');

        if (icon) {
            icon.style.animation = 'none';
            void icon.offsetWidth;
            icon.style.animation = 'allDoneIcon 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        }
        if (textEl) {
            textEl.style.animation = 'none';
            void textEl.offsetWidth;
            textEl.style.animation = 'allDoneText 0.35s ease 0.18s forwards';
            textEl.style.opacity   = '0'; // start hidden until animation fires
        }
    }
}

// ============================================================
//  GOTHIC SOUND ENGINE
//  Designed for dark/cathedral atmosphere:
//    check     — low pipe-organ note strike, short decay
//    allDone   — ascending minor chord arpeggio with reverb tail
//    add       — (no sound — silent action)
// ============================================================
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const t0 = ctx.currentTime;

        if (type === 'check') {
            // Organ pipe: two slightly-detuned sawtooth waves + low sub-tone
            // Creates a dark, hollow "thud" reminiscent of a church organ stop
            const freqs = [98, 98.7, 49]; // A2, slightly detuned A2, A1 sub
            freqs.forEach((freq, i) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                const filt = ctx.createBiquadFilter();
                filt.type = 'lowpass'; filt.frequency.value = 600 + i * 100;
                osc.type = i < 2 ? 'sawtooth' : 'triangle';
                osc.frequency.value = freq;
                osc.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
                const vol = i < 2 ? 0.055 : 0.04;
                gain.gain.setValueAtTime(0, t0);
                gain.gain.linearRampToValueAtTime(vol, t0 + 0.012); // quick attack
                gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);  // long sustain decay
                osc.start(t0); osc.stop(t0 + 0.6);
            });
        }

        if (type === 'allDone') {
            // A minor arpeggio: A2–C3–E3–A3 — haunting resolve
            // Each note has organ-style envelope
            const notes = [110, 130.8, 164.8, 220]; // A2 C3 E3 A3
            notes.forEach((freq, i) => {
                const delay = i * 0.13;
                const osc   = ctx.createOscillator();
                const gain  = ctx.createGain();
                const filt  = ctx.createBiquadFilter();
                filt.type = 'lowpass'; filt.frequency.value = 1200;
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                osc.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
                gain.gain.setValueAtTime(0, t0 + delay);
                gain.gain.linearRampToValueAtTime(0.07, t0 + delay + 0.018);
                gain.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 0.9);
                osc.start(t0 + delay); osc.stop(t0 + delay + 1.0);
            });

            // Bell overtone on the final note
            const bell = ctx.createOscillator();
            const bGain = ctx.createGain();
            bell.type = 'sine'; bell.frequency.value = 880; // A5
            bell.connect(bGain); bGain.connect(ctx.destination);
            bGain.gain.setValueAtTime(0, t0 + 0.39);
            bGain.gain.linearRampToValueAtTime(0.04, t0 + 0.41);
            bGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.4);
            bell.start(t0 + 0.39); bell.stop(t0 + 1.5);
        }
    } catch(e) {}
}

function vibrate(ms) { if (navigator.vibrate) navigator.vibrate(ms); }

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem(K_SOUND, soundEnabled ? '1' : '0');
    btnSound.classList.toggle('on',  soundEnabled);
    btnSound.classList.toggle('off', !soundEnabled);
    btnSound.innerHTML = soundEnabled ? IC.soundOn : IC.soundOff;
    btnSound.setAttribute('aria-pressed', String(soundEnabled));
    showToast(soundEnabled ? 'Звук включён' : 'Звук выключен');
}

function applySoundPref() {
    soundEnabled = localStorage.getItem(K_SOUND) === '1';
    btnSound.classList.toggle('on',  soundEnabled);
    btnSound.classList.toggle('off', !soundEnabled);
    btnSound.innerHTML = soundEnabled ? IC.soundOn : IC.soundOff;
    btnSound.setAttribute('aria-pressed', String(soundEnabled));
}

// ============================================================
//  п.17 — ЗВУК ПЕРА (writing sound from a real quill recording)
// ============================================================
const _penBtn = () => document.getElementById('btn-pen-sound');
const PEN_TIP_ON  = 'Звук пера: вкл — клавиши шуршат пером при письме. Нажми, чтобы выключить.';
const PEN_TIP_OFF = 'Звук пера: выкл — письмо беззвучно. Нажми, чтобы перо шуршало при наборе в заметках и задачах.';

// Lazy-load + decode the compact grain file once (called from a user gesture).
function _penLoad() {
    if (_penBuf) return Promise.resolve(_penBuf);
    if (_penLoading) return _penLoading;
    try { _penAC = _penAC || new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return Promise.reject(); }
    // D-3: decode the base64 data-URI in-memory via atob (NO fetch) so the pen sound works
    // fully offline from a local file:// page without any server. PEN_ASSET lives in
    // pen-asset.js (loaded as a <script> before app.js) → window.PEN_ASSET.
    _penLoading = Promise.resolve().then(() => {
        const src = PEN_ASSET || '';
        const b64 = src.slice(src.indexOf(',') + 1);
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return _penAC.decodeAudioData(bytes.buffer);
    })
        .then(decoded => { _penBuf = decoded; return decoded; })
        .catch(() => { _penLoading = null; });
    return _penLoading;
}

// Play one grain. kind: 'letter' (printable key) or 'hand' (space/backspace/enter).
function _penPlay(kind) {
    if (!penSoundEnabled || !_penBuf || !_penAC) return;
    if (_penVoices > 7) return;                       // polyphony cap → no machine-gun mush
    if (_penAC.state === 'suspended') _penAC.resume();
    let g;
    if (kind === 'hand') { g = PEN_GRAINS.hand; }
    else {
        const arr = PEN_GRAINS.letters;
        let i; do { i = (Math.random() * arr.length) | 0; } while (arr.length > 1 && i === _penLastL);
        _penLastL = i; g = arr[i];
    }
    const now = _penAC.currentTime;
    const src = _penAC.createBufferSource();
    src.buffer = _penBuf;
    src.playbackRate.value = 0.85 + Math.random() * 0.30;       // ±15% detune
    const hp = _penAC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300; hp.Q.value = 0.7;
    const lp = _penAC.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = (kind === 'hand') ? 12000 : 16000;
    const gain = _penAC.createGain();
    const vol = ((kind === 'hand') ? 0.5 : 0.65) * penVolume;    // hand softer; master scales both
    const dur = g.d;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.005);
    gain.gain.setValueAtTime(vol, now + Math.max(0.01, dur - 0.03));
    gain.gain.linearRampToValueAtTime(0.0001, now + dur);
    src.connect(hp).connect(lp).connect(gain).connect(_penAC.destination);
    _penVoices++;
    src.onended = () => { _penVoices = Math.max(0, _penVoices - 1); };
    src.start(now, g.s, dur);
    src.stop(now + dur + 0.02);
}

// Is this element one of the "writing" fields where the quill should sound?
function _penIsField(el) {
    if (!el) return false;
    if (el.id === 'grim-body' || (el.closest && el.closest('#grim-body'))) return true;
    if (el.id === 'grim-title-in') return true;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        return el.id === 'input-box' || el.id === 'task-note' || el.id === 'note-modal-input'
            || el.classList.contains('subtask-add-input') || el.classList.contains('note-input');
    }
    return false;
}

// Global keydown — sound a grain while typing in a writing field.
document.addEventListener('keydown', e => {
    if (!penSoundEnabled) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!_penIsField(e.target)) return;
    const soft = e.key === ' ' || e.key === 'Backspace' || e.key === 'Enter';
    const printable = e.key && e.key.length === 1;
    if (!soft && !printable) return;
    if (_penBuf) _penPlay(soft ? 'hand' : 'letter');
    else _penLoad();                                  // first keystroke warms the buffer (gesture)
}, true);

// Build the button's inner UI once: the morphing body holds a volume channel
// (revealed on hover when sound is on) + the quill icon pinned in the round base.
// Dragging inside the channel sets the master volume; clicking the icon toggles.
let _penUIWired = false;
function _penSetVolFromEvent(e) {
    const b = _penBtn(); if (!b) return;
    const ch = b.querySelector('.pen-chan'); if (!ch) return;
    const r = ch.getBoundingClientRect();
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    let f = (r.bottom - y) / r.height;
    f = Math.max(0, Math.min(1, f));
    penVolume = f;
    localStorage.setItem(K_PEN_VOL, f.toFixed(3));
    b.style.setProperty('--pv', (f * 100) + '%');
    const pc = b.querySelector('.pen-pct');
    if (pc) pc.textContent = Math.round(f * 100) + '%';
}
function _penBuildUI() {
    const b = _penBtn(); if (!b || _penUIWired) return;
    b.innerHTML =
        '<span class="pen-chan"><span class="pen-fill"></span></span>' +
        '<span class="pen-ico-slot">' + IC.penSound + '</span>' +
        '<span class="pen-pct"></span>';
    b.style.setProperty('--pv', (penVolume * 100) + '%');
    b.querySelector('.pen-pct').textContent = Math.round(penVolume * 100) + '%';
    let dragging = false, fromChan = false;
    b.addEventListener('pointerdown', e => {
        if (penSoundEnabled && e.target.closest('.pen-chan')) {
            dragging = true; fromChan = true;         // any click begun in the channel must NOT toggle
            b.classList.add('pen-live');
            _penSetVolFromEvent(e);
            try { b.setPointerCapture(e.pointerId); } catch (_) {}
            e.preventDefault();
        }
    });
    b.addEventListener('pointermove', e => { if (dragging) _penSetVolFromEvent(e); });
    const end = () => { if (dragging) { dragging = false; b.classList.remove('pen-live'); } };
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
    // click toggles on/off — only on the round BASE (bottom 40px = the actual button),
    // never in the grown bar body, and never when the interaction began in the channel
    // (pointer capture makes the click target the button itself, so guard with the flag).
    b.addEventListener('click', e => {
        if (fromChan) { fromChan = false; return; }
        const r = b.getBoundingClientRect();
        if (e.clientY < r.bottom - 40) return;        // landed in the bar body, not the base
        togglePenSound();
    });
    _penUIWired = true;
}
function _penSyncBtn() {
    const b = _penBtn(); if (!b) return;
    _penBuildUI();
    b.classList.toggle('on', penSoundEnabled);
    b.classList.toggle('off', !penSoundEnabled);
    b.style.setProperty('--pv', (penVolume * 100) + '%');
    b.title = penSoundEnabled ? PEN_TIP_ON : PEN_TIP_OFF;
    b.setAttribute('aria-label', penSoundEnabled ? 'Звук пера включён' : 'Звук пера выключен');
    b.setAttribute('aria-pressed', String(penSoundEnabled));
}

function togglePenSound() {
    penSoundEnabled = !penSoundEnabled;
    localStorage.setItem(K_PEN_SOUND, penSoundEnabled ? '1' : '0');
    _penSyncBtn();
    if (penSoundEnabled) _penLoad();                  // warm buffer on enable (user gesture)
    showToast(penSoundEnabled ? 'Звук пера включён' : 'Звук пера выключен');
}

function applyPenSoundPref() {
    penSoundEnabled = localStorage.getItem(K_PEN_SOUND) === '1';
    const sv = parseFloat(localStorage.getItem(K_PEN_VOL));
    penVolume = (isFinite(sv) && sv >= 0 && sv <= 1) ? sv : 1;
    _penSyncBtn();
    if (penSoundEnabled) _penLoad();
}

// ============================================================
//  TOAST
// ============================================================
let toastTimer  = null;
let toastHideTimer = null;

// Idea 7: showToast(msg, { undo: true }) appends an "Отменить" action that calls
// undo() — a safety net for destructive/mutating actions (archive, delete, …),
// reinforcing "never lose data". The undo window is longer (5s) than a plain toast.
function _hideToast() {
    toast.classList.remove('show');
    toast.classList.add('hide');
    toastHideTimer = setTimeout(() => toast.classList.remove('hide'), 280);
}

function showToast(msg, opts = {}) {
    // Cancel any in-flight hide
    clearTimeout(toastTimer);
    clearTimeout(toastHideTimer);
    toast.classList.remove('show', 'hide');

    // Force reflow so removing classes takes effect before re-adding
    void toast.offsetWidth;

    toast.classList.toggle('has-undo', !!opts.undo);
    toast.innerHTML = '';
    const span = document.createElement('span');
    span.className = 'toast-msg';
    span.textContent = msg;
    toast.appendChild(span);

    if (opts.undo) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'toast-undo-btn';
        btn.innerHTML = `${IC.restore}<span>Отменить</span>`;
        btn.addEventListener('click', () => { _hideToast(); undo(); });
        toast.appendChild(btn);
    }

    toast.classList.add('show');

    // Mirror to screen-reader live region so assistive tech hears every toast
    announce(opts.undo ? `${msg}. Доступна отмена` : msg);

    // After display time, trigger vanish animation then clean up
    toastTimer = setTimeout(_hideToast, opts.undo ? 5000 : 2400);
}

function shakeInput() {
    const row = document.getElementById('input-row');
    row.classList.add('shake');
    row.addEventListener('animationend', () => row.classList.remove('shake'), { once: true });
}

// ============================================================
//  HASHTAGS & SEARCH HIGHLIGHT
// ============================================================
// Tags are written with a leading "*" (e.g. *дом). Highlighted + clickable.
function highlightHashtags(html) {
    return html.replace(/\*([\wа-яёА-ЯЁ]+)/gu, '<span class="hashtag" onclick="filterByTag(\'*$1\')">*$1</span>');
}

/** Extract all *tag strings from a text string. Returns lowercase array. */
function extractTags(text) {
    const matches = text.match(/\*([\wа-яёА-ЯЁ]+)/gu) || [];
    return [...new Set(matches.map(t => t.toLowerCase()))];
}

/**
 * Render tag cloud under the search bar.
 * Shows up to 12 most-used tags across all tasks.
 * Active tag (matches current searchQuery) is highlighted.
 */
// D-1: Russian plural for "задача" (1 задача / 2 задачи / 5 задач).
function _zadachi(n) {
    const d = n % 10, h = n % 100;
    if (d === 1 && h !== 11) return 'задача';
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'задачи';
    return 'задач';
}

function renderTagCloud() {
    const cloud = document.getElementById('tag-cloud');
    if (!cloud) return;

    // Count tag frequency across all tasks (text + subtask text)
    const freq = new Map();
    state.tasks.forEach(t => {
        extractTags(t.text).forEach(tag => freq.set(tag, (freq.get(tag) || 0) + 1));
        (t.subtasks || []).forEach(s =>
            extractTags(s.text).forEach(tag => freq.set(tag, (freq.get(tag) || 0) + 1))
        );
    });

    if (freq.size === 0) { cloud.style.display = 'none'; return; }

    // Sort by frequency desc, cap at 12
    const sorted = [...freq.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 12);

    const active = searchQuery.toLowerCase().trim();
    cloud.innerHTML = sorted.map(([tag, count]) => {
        const isActive = active === tag;
        return `<button class="tag-chip${isActive ? ' active' : ''}"
                        onclick="filterByTag('${escHtml(tag)}')"
                        title="${count} ${_zadachi(count)}"
                >${escHtml(tag)}<span class="tag-chip-count">${count}</span></button>`;
    }).join('');
    cloud.style.display = 'flex';
}

function filterByTag(tag) {
    // If already filtering by this tag — clear it (toggle off)
    if (searchQuery.toLowerCase() === tag.toLowerCase()) {
        searchBox.value = ''; searchQuery = ''; saveUiState();
    } else {
        searchBox.value = tag; searchQuery = tag; saveUiState();
    }
    if (toolbar.style.display === 'none') toolbar.style.display = 'flex';
    render();
    // D-3: announce result count for screen readers
    const visible = _visibleTaskEls().length;
    announce(searchQuery ? `Найдено ${visible} задач по тегу ${tag}` : 'Фильтр по тегу снят');
}

function highlightSearch(html, query) {
    if (!query) return html;
    // html is already escHtml()-encoded. We must also encode the query so that
    // characters like < > & in the search term match their &lt; &gt; &amp; forms
    // in the encoded HTML — otherwise the search would silently fail for those chars.
    const escapedQuery = escHtml(query);
    const esc = escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return html.replace(new RegExp(`(${esc})`, 'gi'), '<mark class="highlight">$1</mark>');
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
        // G4-4: also escape single quotes — defense-in-depth for any value that
        // ends up inside a single-quoted attribute (e.g. onclick="fn('...')").
        .replace(/'/g,'&#39;');
}

// ============================================================
//  Idea 4: QUICK-ADD — inline syntax  *tag  %date  !priority
//  + an interactive typeahead dropdown (keyboard + mouse).
// ============================================================
// Parse the raw input: pull out !priority and %date tokens (removed from the
// text), keep *tags in the text (they're already highlighted + searchable).
function parseQuickInput(raw) {
    let text = raw;
    let priority = null;
    let deadline = null;
    const prioMap = {
        high:'high', h:'high', выс:'high', высокий:'high',
        medium:'medium', med:'medium', m:'medium', сред:'medium', средний:'medium',
        low:'low', l:'low', низ:'low', низкий:'low',
        none:'none', n:'none', нет:'none',
    };
    text = text.replace(/(^|\s)!([a-zA-Zа-яё]+)\b/gi, (m, pre, word) => {
        const key = word.toLowerCase();
        if (prioMap[key] !== undefined) { priority = prioMap[key]; return pre; }
        return m;
    });
    text = text.replace(/(^|\s)%(\S+)/g, (m, pre, tok) => {
        const dl = _parseQuickDate(tok);
        if (dl) { deadline = dl; return pre; }
        return m;
    });
    text = text.replace(/\s{2,}/g, ' ').trim();
    return { text, priority, deadline };
}

function _parseQuickDate(tok) {
    const t = tok.toLowerCase();
    const today = new Date();
    if (t === 'today'    || t === 'сегодня') return { mode:'date', value: _ymd(today) };
    if (t === 'tomorrow' || t === 'завтра')  { const d = new Date(); d.setDate(d.getDate()+1); return { mode:'date', value:_ymd(d) }; }
    const wd = { пн:1,вт:2,ср:3,чт:4,пт:5,сб:6,вс:7, mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sun:7 };
    if (wd[t]) return { mode:'weektime', value:`${wd[t]}|00:00`, timeSet:false };
    const mm = t.match(/^(\d{1,2}):(\d{2})$/);
    if (mm) { const h=+mm[1], mi=+mm[2]; if (h<24 && mi<60) return { mode:'time', value:`${_pad2(h)}:${_pad2(mi)}` }; }
    // P-G: bare day-of-month (e.g. "15") → nearest future date with that day.
    const dn = t.match(/^(\d{1,2})$/);
    if (dn) {
        const day = +dn[1];
        if (day >= 1 && day <= 31) {
            const d = new Date(today.getFullYear(), today.getMonth(), day);
            if (d.getDate() === day) {
                if (d < new Date(today.toDateString())) d.setMonth(d.getMonth() + 1);
                if (d.getDate() === day) return { mode:'date', value:_ymd(d) };
            }
        }
    }
    const rel = t.match(/^\+(\d+)(d|д|дн|w|н|нед)?$/);
    if (rel) { const n=+rel[1], u=rel[2]||'d'; const days=(u==='w'||u==='н'||u==='нед')?n*7:n; const d=new Date(); d.setDate(d.getDate()+days); return { mode:'date', value:_ymd(d) }; }
    const dm = t.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
    if (dm) {
        const day=+dm[1], mon=+dm[2]; let yr = dm[3] ? +dm[3] : today.getFullYear();
        if (dm[3] && dm[3].length === 2) yr = 2000 + yr;
        if (mon>=1 && mon<=12 && day>=1 && day<=31) {
            const d = new Date(yr, mon-1, day);
            if (d.getMonth() === mon-1 && d.getDate() === day) {
                if (!dm[3] && d < new Date(today.toDateString())) d.setFullYear(yr+1);
                return { mode:'date', value:_ymd(d) };
            }
        }
    }
    return null;
}

// ── Typeahead dropdown ───────────────────────────────────────────────────────
let _qaState  = null;   // { type, query, start, end, items, active }
let _qaMenuEl = null;

function _qaDetect() {
    const val = inputBox.value;
    const pos = inputBox.selectionStart ?? val.length;
    let s = pos;
    while (s > 0 && !/\s/.test(val[s-1])) s--;
    const token = val.slice(s, pos);
    if (!token) return null;
    const ch = token[0];
    if (ch === '!') return { type:'prio', query: token.slice(1), start:s, end:pos };
    if (ch === '*') return { type:'tag',  query: token.slice(1), start:s, end:pos };
    if (ch === '%') return { type:'date', query: token.slice(1), start:s, end:pos };
    return null;
}

function _qaSuggest(type, query) {
    const q = query.toLowerCase();
    if (type === 'prio') {
        return [
            { label:'Высокий',         insert:'!high',   cls:'prio-high'   },
            { label:'Средний',         insert:'!medium', cls:'prio-medium' },
            { label:'Низкий',          insert:'!low',    cls:'prio-low'    },
            { label:'Без приоритета',  insert:'!none',   cls:''            },
        ].filter(o => !q || o.label.toLowerCase().includes(q) || o.insert.slice(1).startsWith(q));
    }
    if (type === 'tag') {
        const tags = new Set();
        state.tasks.forEach(t => {
            extractTags(t.text).forEach(tg => tags.add(tg));
            (t.subtasks || []).forEach(s => extractTags(s.text).forEach(tg => tags.add(tg)));
        });
        const arr = [...tags].map(tg => tg.replace(/^\*/, '')).filter(tg => !q || tg.includes(q)).sort();
        const items = arr.slice(0, 8).map(tg => ({ label:'*'+tg, insert:'*'+tg }));
        if (q && !arr.includes(q)) items.unshift({ label:'*'+query, insert:'*'+query, hint:'новый тег' });
        // Always show something so the dropdown appears (discoverability) even when
        // there are no tags yet and nothing has been typed after the "*".
        if (!items.length) items.push({ label:'Введите название тега…', insert:'', disabled:true });
        return items;
    }
    if (type === 'date') {
        const parsed = query ? _parseQuickDate(query) : null;
        const out = parsed ? [{ label: formatDeadlineForm(parsed), insert:'%'+query, hint:'распознано' }] : [];
        const presets = [
            { label:'Сегодня',      insert:'%сегодня' },
            { label:'Завтра',       insert:'%завтра'  },
            { label:'Через неделю', insert:'%+7d'     },
            { label:'Понедельник',  insert:'%пн'      },
            { label:'Суббота',      insert:'%сб'      },
        ].filter(o => !q || o.label.toLowerCase().includes(q));
        return out.concat(presets);
    }
    return [];
}

function _qaUpdate() {
    const det = _qaDetect();
    if (!det) { _qaClose(); return; }
    const items = _qaSuggest(det.type, det.query);
    if (!items.length) { _qaClose(); return; }
    _qaState = { ...det, items, active: 0 };
    _qaRenderMenu();
}

function _qaRenderMenu() {
    if (!_qaState) return;
    if (!_qaMenuEl) {
        _qaMenuEl = document.createElement('div');
        _qaMenuEl.className = 'qa-menu';
        _qaMenuEl.setAttribute('role', 'listbox');
        document.body.appendChild(_qaMenuEl);
    }
    const { items, active } = _qaState;
    _qaMenuEl.innerHTML = items.map((it, i) => it.disabled
        ? `<div class="qa-item qa-disabled"><span class="qa-dot qa-dot-blank"></span><span class="qa-label">${escHtml(it.label)}</span></div>`
        : `<button type="button" role="option" class="qa-item${i === active ? ' active' : ''}" data-idx="${i}"
                aria-selected="${i === active ? 'true' : 'false'}"
                onmousedown="event.preventDefault()" onclick="_qaAccept(${i})" onmouseover="_qaHover(${i})">
            ${it.cls ? `<span class="qa-dot ${it.cls}"></span>` : `<span class="qa-dot qa-dot-blank"></span>`}
            <span class="qa-label">${escHtml(it.label)}</span>
            ${it.hint ? `<span class="qa-hint">${escHtml(it.hint)}</span>` : ''}
        </button>`).join('');
    const r = inputBox.getBoundingClientRect();
    _qaMenuEl.style.left  = Math.round(r.left) + 'px';
    _qaMenuEl.style.top   = Math.round(r.bottom + 5) + 'px';
    _qaMenuEl.style.width = Math.round(r.width) + 'px';
}

function _qaHover(i) {
    if (!_qaState) return;
    _qaState.active = i;
    _qaMenuEl.querySelectorAll('.qa-item').forEach((el, idx) => {
        el.classList.toggle('active', idx === i);
        el.setAttribute('aria-selected', idx === i ? 'true' : 'false');
    });
}

function _qaMove(dir) {
    if (!_qaState) return;
    const n = _qaState.items.length;
    _qaState.active = (_qaState.active + dir + n) % n;
    _qaRenderMenu();
}

function _qaAccept(idx) {
    if (!_qaState) return;
    const item = _qaState.items[idx]; if (!item) return;
    if (!item.insert) return;   // informational/disabled row — nothing to insert
    const val = inputBox.value;
    const before = val.slice(0, _qaState.start);
    const after  = val.slice(_qaState.end);
    const insert = item.insert + ' ';
    inputBox.value = before + insert + after;
    const caret = (before + insert).length;
    _qaClose();
    inputBox.focus();
    inputBox.setSelectionRange(caret, caret);
}

function _qaClose() {
    if (_qaMenuEl) { _qaMenuEl.remove(); _qaMenuEl = null; }
    _qaState = null;
}

// Returns true if the quick-add menu handled the key (so the Enter→addTask
// handler should NOT fire).
function _qaKeydown(e) {
    if (!_qaState) return false;
    if (e.key === 'ArrowDown')              { e.preventDefault(); _qaMove(1);  return true; }
    if (e.key === 'ArrowUp')                { e.preventDefault(); _qaMove(-1); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); _qaAccept(_qaState.active); return true; }
    if (e.key === 'Escape')                 { e.preventDefault(); _qaClose(); return true; }
    return false;
}

// ============================================================
//  EXPORT / IMPORT  (audit G-5)
// ============================================================

// F-B: gothic coffin glyph for the «Только задачи» export row (no width/height →
// sized by .snooze-menu svg CSS, like every other float-menu icon).
const _EXPORT_TASKS_IC = `<svg viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5H16L21 8V22.5Q12 26 3 22.5V8Z"/><line x1="7" y1="11.5" x2="17" y2="11.5" stroke-width="1.2" opacity="0.6"/></svg>`;
// X-2: «Задачи как markdown-чеклист» — gothic parchment sheet with curled edges
// and two checkbox ticks (scroll motif, family of GRIM_IO_IC.reading). Readable,
// lossy export (no JSON re-import) — sits beside the coffin/coffer backup glyphs.
const _EXPORT_MD_IC = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6.4 4.2h11.2v13q0 2.4-2.4 2.4H8.8q-2.4 0-2.4-2.4Z"/><path d="M6.4 4.2q-1.4 0-1.4 1.3t1.4 1.3M17.6 4.2q1.4 0 1.4 1.3t-1.4 1.3" opacity=".55"/><path d="M8.4 10l1.1 1.1 1.8-2.1"/><line x1="12.9" y1="10" x2="16" y2="10" opacity=".7"/><path d="M8.4 14.4l1.1 1.1 1.8-2.1"/><line x1="12.9" y1="14.4" x2="16" y2="14.4" opacity=".7"/></svg>`;

// F-B/X-2: the export icon opens a small gothic popover with the scopes instead of
// exporting directly — «Только задачи» / «Всё» (JSON backups) + «Markdown-чеклист».
function openExportMenu(event) {
    event.stopPropagation();
    _openFloatMenu(event.currentTarget, `
        <button type="button" role="menuitem" onclick="closeFloatMenu();exportData('tasks')">${_EXPORT_TASKS_IC}<span>Только задачи</span></button>
        <button type="button" role="menuitem" onclick="closeFloatMenu();exportData('all')">${GRIM_IO_IC.full}<span>Всё — полный бэкап</span></button>
        <button type="button" role="menuitem" onclick="closeFloatMenu();exportData('md')">${_EXPORT_MD_IC}<span>Задачи — markdown-чеклист</span></button>`,
        'export-menu');
}

/** Export DUSK data as a timestamped JSON file.
 *  scope 'tasks' → ВСЕ данные DUSK (задачи/группы/архив/заметки задач/подпункты/шаблоны
 *                  задач/сортировки/счётчики), БЕЗ данных Гримуара.
 *  scope 'all'   → полный бэкап всего приложения + «Летопись» Гримуара. */
function exportData(scope) {
    scope = scope || 'all';
    if (scope === 'md') { _exportTasksMarkdown(); return; }   // X-2: readable checklist, not JSON
    const date = new Date().toISOString().slice(0, 10);
    let payload, filename;
    if (scope === 'tasks') {
        // Вынимаем только данные Гримуара (записи, склеп, шаблоны записей, сорт записей,
        // на всякий случай летопись); всё остальное в state — данные DUSK — остаётся.
        const { notes, notesArchive, noteTemplates, notesSort, _grimVersions, ...dusk } = state;
        payload  = dusk;
        filename = `dusk-tasks-${date}.json`;
    } else {
        // NA-3: «Летопись» живёт в своём LS-ключе (вне state) — без неё device-move терял
        // историю записей; кладём её верхним ключом (правило №1: не теряем данные).
        payload  = { ...state, _grimVersions: grimVersions };
        filename = `dusk-backup-${date}.json`;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(scope === 'tasks' ? `Экспортировано (только задачи): ${filename}` : `Экспортировано: ${filename}`);
}

// X-2: serialize tasks to a portable markdown checklist (grouped, nested subtasks,
// deadline suffix). Lossy/human-readable — a companion to the JSON backup, not a
// re-importable format. Order mirrors the app (ungrouped first, then groups by order).
function _tasksToMarkdown() {
    const date    = new Date().toISOString().slice(0, 10);
    const byOrder = arr => arr.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const dlSfx   = dl => (dl && dl.value) ? `  _(до: ${formatDeadlineAbsolute(dl)})_` : '';
    const renderTask = t => {
        const lines = [`- [${t.checked ? 'x' : ' '}] ${(t.text || '').trim()}${dlSfx(t.deadline)}`];
        byOrder(t.subtasks || []).forEach(s =>
            lines.push(`  - [${s.checked ? 'x' : ' '}] ${(s.text || '').trim()}${dlSfx(s.deadline)}`));
        return lines.join('\n');
    };
    const out  = [`# DUSK — задачи`, '', `_${date}_`, ''];
    const ung  = byOrder((state.tasks || []).filter(t => !t.groupId));
    if (ung.length) { out.push('## Без группы', '', ...ung.map(renderTask), ''); }
    byOrder(state.groups || []).forEach(g => {
        const gt = byOrder((state.tasks || []).filter(t => t.groupId === g.id));
        if (!gt.length) return;
        out.push('## ' + ((g.name || '').trim() || 'Группа'), '', ...gt.map(renderTask), '');
    });
    if (out.length <= 4) out.push('_(задач нет)_', '');
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
function _exportTasksMarkdown() {
    const date = new Date().toISOString().slice(0, 10);
    _grimDownload(`dusk-tasks-${date}.md`, _tasksToMarkdown(), 'text/markdown');
}

/** Open system file picker for JSON import. */
function triggerImport() {
    document.getElementById('import-file-input').click();
}

// ============================================================
//  TASK DUPLICATION  (audit G-3)
// ============================================================

/**
 * Duplicate a task: creates an identical copy with a new id,
 * placed immediately after the original in its list/group.
 */
function duplicateTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    pushUndo();

    // Shift orders of tasks after the original to make room
    const afterOrder = task.order + 1;
    state.tasks.forEach(t => {
        if (t.groupId === task.groupId && t.order >= afterOrder) t.order++;
    });

    const copy = {
        ...JSON.parse(JSON.stringify(task)), // deep clone
        id:          state.nextId++,
        uid:         uid(), createdAt: nowTs(), updatedAt: nowTs(),   // Idea 8: a copy is a NEW record
        order:       afterOrder,
        checked:     false,
        cycleChecked:false,
        nextReset:   null,
        noteOpen:    false,
        pinned:      false,
        subtasksOpen:task.subtasks && task.subtasks.length > 0,
        subtasks:    (task.subtasks || []).map(s => ({
            ...s,
            id:          state.nextSubId++,
            uid:         uid(),
            checked:     false,
            cycleChecked:false,   // W-3: don't inherit cycle state from original
            nextReset:   null,
        })),
    };
    state.tasks.push(copy);
    _newTaskIds.add(copy.id); // IMP-1: only the new copy animates
    saveState(); render();
    showToast('Задача скопирована');
}

/** Toggle pinned state — pinned tasks float to the top of their group/section. */
function togglePin(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    pushUndo();
    task.pinned = !task.pinned;
    saveState(); renderListOnly(); // 7b: pin reorders the list only
    showToast(task.pinned ? 'Задача закреплена' : 'Задача откреплена');
}

// ============================================================
//  MAIN LIST BULK SELECTION
// ============================================================
function toggleMainSelectMode() {
    mainSelectMode = !mainSelectMode;
    selectedTaskIds.clear();
    const btn = document.getElementById('btn-main-select');
    const bar = document.getElementById('main-select-bar');
    if (btn) btn.classList.toggle('active', mainSelectMode);
    if (bar) bar.style.display = mainSelectMode ? 'flex' : 'none';
    _updateMainSelectBar(); // reset "0 отмечено" + disable bulk buttons on (re)open after the clear above
    render(); // re-render to show/hide checkboxes on task items
}

function toggleMainSelectTask(id) {
    if (selectedTaskIds.has(id)) selectedTaskIds.delete(id);
    else selectedTaskIds.add(id);
    _updateMainSelectBar();
    // Update visual selection state on the li
    const li = document.querySelector(`.task-item[data-id="${id}"]`);
    if (li) {
        li.classList.toggle('select-mode-selected', selectedTaskIds.has(id));
        // Problem 2: update the checkbox button icon in-place (no full render needed)
        const btn = li.querySelector('.task-select-checkbox');
        if (btn) {
            btn.classList.toggle('selected', selectedTaskIds.has(id));
            btn.innerHTML = selectedTaskIds.has(id) ? IC.selectChecked : IC.selectEmpty;
        }
    }
}

function _updateMainSelectBar() {
    const count   = selectedTaskIds.size;
    const countEl = document.getElementById('main-select-bar-count');
    const archBtn = document.getElementById('btn-bulk-archive');
    const delBtn  = document.getElementById('btn-bulk-delete');
    if (countEl) countEl.textContent = `${count} отмечено`;
    if (archBtn) archBtn.disabled = count === 0;
    if (delBtn)  delBtn.disabled  = count === 0;
}

function bulkArchive() {
    if (!selectedTaskIds.size) return;
    pushUndo();
    state.tasks.filter(t => selectedTaskIds.has(t.id)).forEach(t => {
        const grp = state.groups.find(g => g.id === t.groupId);
        state.archive.push({
            ...t,
            // D-4: deep-clone subtasks (parity with removeTask/archiveAll) so the
            // archived copy never shares a subtask array reference with live state.
            subtasks: JSON.parse(JSON.stringify(t.subtasks || [])),
            archivedAt: Date.now(),
            originalGroupName:  grp ? grp.name  : null,
            originalGroupColor: grp ? grp.color : null,
        });
    });
    const count = selectedTaskIds.size;
    state.tasks = state.tasks.filter(t => !selectedTaskIds.has(t.id));
    selectedTaskIds.clear();
    mainSelectMode = false;
    const btn = document.getElementById('btn-main-select');
    const bar = document.getElementById('main-select-bar');
    if (btn) btn.classList.remove('active');
    if (bar) bar.style.display = 'none';
    saveState(); render();
    showToast(`Архивировано: ${count}`, { undo: true });
}

function bulkDelete() {
    if (!selectedTaskIds.size) return;
    // Two-step confirmation reuses the existing _clearAllArmed pattern
    const btn = document.getElementById('btn-bulk-delete');
    if (!btn._armed) {
        btn._armed = true;
        btn.classList.add('confirm-armed');
        btn.title = 'Нажмите ещё раз для подтверждения';
        btn._armTimer = setTimeout(() => {
            btn._armed = false;
            btn.classList.remove('confirm-armed');
            btn.title = 'Удалить навсегда';
        }, 3000);
        return;
    }
    clearTimeout(btn._armTimer);
    btn._armed = false;
    btn.classList.remove('confirm-armed');

    pushUndo();
    const count = selectedTaskIds.size;
    state.tasks.forEach(t => { if (selectedTaskIds.has(t.id)) addTombstone(t.uid, 'task'); });   // Idea 8: bulk permanent delete → tombstones
    state.tasks = state.tasks.filter(t => !selectedTaskIds.has(t.id));
    selectedTaskIds.clear();
    mainSelectMode = false;
    const mainBtn = document.getElementById('btn-main-select');
    const bar     = document.getElementById('main-select-bar');
    if (mainBtn) mainBtn.classList.remove('active');
    if (bar) bar.style.display = 'none';
    saveState(); render();
    showToast(`Удалено: ${count}`, { undo: true });
}
let _focusedTaskId = null;
let _focusedByKeyboard = false; // UX-2: true only when task was selected via J/K, not just hovered
let _focusedArchiveId = null;   // archive-page J/K focus ring (crypt cards)

/** Return visible tasks in DOM render order — covers all render modes. */
// V-3: single source of truth for "visible task cards" across every render mode
// (normal, grouped, schedule zones, split active + pinned zones) — used by the SR
// announce counts AND J/K navigation so they can never disagree. Was copy-pasted in
// ~5 places with subtle differences (one used a descendant selector and dropped the
// split/pinned zones, so counts and keyboard nav diverged and pinned cards in split
// mode were unreachable by J/K).
function _visibleTaskEls() {
    return [...document.querySelectorAll(
        '#list-container > .task-item, .group-body > .task-item, ' +
        '.sched-zone-ul > .task-item, .split-active-body > .task-item, ' +
        '.split-pinned-body > .task-item')];
}

function getVisibleTaskIds() {
    return _visibleTaskEls().map(el => parseInt(el.dataset.id)).filter(Number.isInteger);
}

// ── P15a: hover sets focused task (works alongside J/K navigation) ───────
document.addEventListener('mouseover', e => {
    const li = e.target.closest('.task-item[data-id]');
    if (!li || li.classList.contains('archive-item')) return;
    const id = parseInt(li.dataset.id);
    if (id !== _focusedTaskId) {
        // Update focused id silently (no highlight ring — hover doesn't show it)
        _focusedTaskId = id;
        _focusedByKeyboard = false; // UX-2: hover is NOT keyboard selection
    }
});

// ── P15b: clicking outside a task clears kb-focus ring ───────────────────
document.addEventListener('click', e => {
    if (!e.target.closest('.task-item')) {
        _focusedTaskId = null;
        _focusedByKeyboard = false;
        document.querySelectorAll('.task-item.kb-focused')
            .forEach(el => el.classList.remove('kb-focused'));
    }
});

// Layout-independent key resolution.
// e.code is the physical key ('KeyJ', 'KeyX' etc.) regardless of OS keyboard layout.
// This means shortcuts work on Russian, Ukrainian, Dvorak etc. — the user presses
// the same physical position as on QWERTY and the shortcut fires.
// Fallback: if e.code is unavailable (old browsers), match e.key against QWERTY chars.
function _matchKey(e, qwertyChar) {
    const code = 'Key' + qwertyChar.toUpperCase();
    if (e.code) return e.code === code;
    return e.key && e.key.toLowerCase() === qwertyChar.toLowerCase();
}

document.addEventListener('keydown', e => {
    // ── Global shortcuts (always active) ──────────────────────
    // п11/undo-audit: the grimoire body/title are a rich-text editor whose own
    // (native) undo stack tracks typing + execCommand formats at the right
    // granularity. The app-level undo() snapshots WHOLE state, so hijacking
    // Ctrl+Z while the caret is in the editor reverted structural snapshots
    // (e.g. note creation) and DESTROYED the draft being typed (rule #1 breach).
    // → let the browser own undo/redo inside the editor; app undo owns the rest.
    {
        const ae = document.activeElement;
        if (ae && (ae.id === 'grim-body' || ae.id === 'grim-title-in') &&
            (e.ctrlKey || e.metaKey) && (e.code === 'KeyZ' || e.code === 'KeyY')) {
            return;   // native browser undo/redo for the grimoire rich editor
        }
    }
    // п11/A: Ctrl/Cmd+F on the notes page focuses the search box — it doubles as the
    // in-note find input (one query drives both the list filter and body highlight).
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF' && currentPage === 'notes') {
        e.preventDefault();
        const sb = document.getElementById('notes-search-box');
        if (sb) { sb.focus(); sb.select(); }
        return;
    }
    // Tasks archive: Ctrl/Cmd+F focuses the crypt search (mirror of the notes one).
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF' && currentPage === 'archive') {
        const sb = document.getElementById('archive-search-box');
        if (sb && sb.offsetParent !== null) { e.preventDefault(); sb.focus(); sb.select(); return; }
    }
    // п11/A: F3 / Shift+F3 step through body matches from ANYWHERE — including while the
    // caret is in the editor, where Enter must stay a line-break (so we can't hijack it).
    if (_grimFindActive && e.key === 'F3') { e.preventDefault(); e.shiftKey ? grimFindPrev() : grimFindNext(); return; }
    // Enter / Shift+Enter ALSO navigate when the focus is in the notes search box.
    if (_grimFindActive && e.key === 'Enter' && document.activeElement && document.activeElement.id === 'notes-search-box') {
        e.preventDefault(); e.shiftKey ? grimFindPrev() : grimFindNext(); return;
    }
    // P-A: redo on Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y; undo on Ctrl/Cmd+Z.
    // (Shift+Z must be checked before plain Z.)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ') { e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY')               { e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); undo(); return; }

    if (e.key === 'Escape') {
        // S1-4: close the top-most OPEN modal — the old hard-coded list missed
        // color-filter / templates / import-choice. Generic so future modals work too.
        const openModals = [...document.querySelectorAll('.modal-overlay')]
            .filter(m => m.style.display !== 'none' && !m.classList.contains('closing'));
        if (openModals.length) {
            // U-1: route through the cleanup-aware closer (import-choice falls back to a
            // plain animated close — Esc may still cancel it; only backdrop is blocked).
            dismissModalById(openModals[openModals.length - 1].id);
            return;
        }
        // п11/A: Esc closes the in-note find bar before anything else page-level.
        if (_grimFindActive) { grimFindClose(); return; }
        // No modal open → clear the keyboard-focus ring (tasks + archive both use .task-item).
        _focusedTaskId = null;
        _focusedArchiveId = null;
        document.querySelectorAll('.task-item.kb-focused')
            .forEach(el => el.classList.remove('kb-focused'));
        return;
    }

    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
                    document.activeElement?.contentEditable === 'true';

    // NA-9: notes-page keyboard parity — N forges a new record, J/K walk the list.
    // Placed before the task shortcuts so the same keys mean "notes" on the notes page.
    if (currentPage === 'notes' && !grimSelectMode && !inInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (_matchKey(e, 'N')) { e.preventDefault(); grimNew(); return; }
        if (_matchKey(e, 'J') || _matchKey(e, 'K')) {
            e.preventDefault();
            const nids = _grimVisibleIds || [];
            if (!nids.length) return;
            const cur = nids.indexOf(currentNoteId);
            const idx = _matchKey(e, 'J')
                ? (cur < nids.length - 1 ? cur + 1 : 0)
                : (cur > 0 ? cur - 1 : nids.length - 1);
            grimOpen(nids[idx], { fromKb: true });
            return;
        }
        // cross-app #5: gentle action parity for the OPEN record (mirrors task Del/T/E).
        // Only the active grimoire acts on a keypress; permanent delete keeps its two-step
        // button confirm, so it is intentionally NOT bound to a key (rule #1: never lose data).
        if (currentNoteId && grimMode === 'active' && (state.notes || []).some(n => n.id === currentNoteId)) {
            if (e.code === 'Delete') { e.preventDefault(); grimArchive(currentNoteId); return; }   // Del → склеп
            if (_matchKey(e, 'T'))   { e.preventDefault(); grimTogglePin(currentNoteId); return; }  // T  → закрепить
            if (_matchKey(e, 'E')) {                                                                // E  → править тело
                e.preventDefault();
                if (grimNoteCollapsed) { grimToggleCollapse(); return; }   // folded → expand (re-expand focuses body)
                const bo = document.getElementById('grim-body');
                if (bo) {
                    bo.focus();
                    const r = document.createRange(); r.selectNodeContents(bo); r.collapse(false);
                    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
                }
                return;
            }
        }
    }

    // Tasks archive page parity (mirror of the crypt): J/K walk the cards, N forges a task
    // and jumps to the Tasks tab. No per-card key actions — restore/destroy stay on buttons.
    if (currentPage === 'archive' && !inInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (_matchKey(e, 'N')) {            // new task → switch to the Tasks tab, then focus the input
            e.preventDefault();
            switchPage('main');
            setTimeout(focusNewTaskInput, 360);   // after the page-transition settles
            return;
        }
        if (_matchKey(e, 'J') || _matchKey(e, 'K')) {
            e.preventDefault();
            const ids = _visibleArchiveIds();
            if (!ids.length) return;
            const cur = ids.indexOf(_focusedArchiveId);
            const idx = _matchKey(e, 'J')
                ? (cur < ids.length - 1 ? cur + 1 : 0)
                : (cur > 0 ? cur - 1 : ids.length - 1);
            _focusedArchiveId = ids[idx];
            _highlightFocusedArchive(_focusedArchiveId);
            return;
        }
    }

    // N and / work even without a focused task
    if (_matchKey(e, 'N') && !inInput && !e.ctrlKey && !e.metaKey) { e.preventDefault(); inputBox.focus(); return; }
    if ((e.code === 'Slash' || e.code === 'NumpadDivide') && !inInput) {
        e.preventDefault();
        if (toolbar.style.display !== 'none') searchBox.focus();
        return;
    }

    if (inInput) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; // let browser handle Ctrl/Meta combos

    // ── J/K: navigate tasks ────────────────────────────────────
    const ids = getVisibleTaskIds();

    if (_matchKey(e, 'J')) {
        e.preventDefault();
        if (!ids.length) return;
        const curIdx = _focusedTaskId !== null ? ids.indexOf(_focusedTaskId) : -1;
        const nextIdx = curIdx < ids.length - 1 ? curIdx + 1 : 0;
        _focusedTaskId = ids[nextIdx];
        _focusedByKeyboard = true; // UX-2: explicit keyboard navigation
        highlightFocusedTask(_focusedTaskId);
        return;
    }
    if (_matchKey(e, 'K')) {
        e.preventDefault();
        if (!ids.length) return;
        const curIdx = _focusedTaskId !== null ? ids.indexOf(_focusedTaskId) : -1;
        const prevIdx = curIdx > 0 ? curIdx - 1 : ids.length - 1;
        _focusedTaskId = ids[prevIdx];
        _focusedByKeyboard = true; // UX-2: explicit keyboard navigation
        highlightFocusedTask(_focusedTaskId);
        return;
    }

    // ── Task actions: need a focused task ──────────────────────
    if (_focusedTaskId === null) return;

    if (_matchKey(e, 'X')) {
        e.preventDefault();
        toggleCheck(_focusedTaskId);
        return;
    }
    if (_matchKey(e, 'E')) {
        e.preventDefault();
        const span = document.querySelector(`.task-text[data-id="${_focusedTaskId}"]`);
        if (span) startInlineEdit({ target: span, stopPropagation: () => {} }, _focusedTaskId);
        return;
    }
    if (_matchKey(e, 'D')) {
        e.preventDefault();
        duplicateTask(_focusedTaskId);
        return;
    }
    if (e.code === 'Delete' || e.code === 'Backspace') {
        // UX-2: only archive via keyboard shortcut if the task was explicitly
        // selected with J/K — not just hovered. Prevents accidental deletion
        // when the user presses Delete for a text field that loses focus.
        if (!_focusedByKeyboard) return;
        e.preventDefault();
        removeTask(_focusedTaskId);
        _focusedTaskId = null;
        _focusedByKeyboard = false;
        return;
    }
    // UX-3: P — open priority modal for focused task
    if (_matchKey(e, 'P')) {
        e.preventDefault();
        openPrioModal(_focusedTaskId);
        return;
    }
    // UX-3: L — open deadline modal for focused task
    if (_matchKey(e, 'L')) {
        e.preventDefault();
        openDeadlineModal(_focusedTaskId);
        return;
    }
    // UX-3: M — open note (memo) modal for focused task
    if (_matchKey(e, 'M')) {
        e.preventDefault();
        const task = state.tasks.find(t => t.id === _focusedTaskId);
        if (!task) return;
        if (task.note) openEditNoteModal(_focusedTaskId);
        else openNoteModal(_focusedTaskId);
        return;
    }
    // UX-3: R — open repeat modal for focused task
    if (_matchKey(e, 'R')) {
        e.preventDefault();
        openRepeatModal(_focusedTaskId);
        return;
    }
    // UX-3: T — toggle pin (thumbTack) for focused task
    if (_matchKey(e, 'T')) {
        e.preventDefault();
        togglePin(_focusedTaskId);
        return;
    }
});

/** Show keyboard-focus ring on the given task. */
function highlightFocusedTask(id) {
    document.querySelectorAll('.task-item.kb-focused').forEach(el => el.classList.remove('kb-focused'));
    const el = document.querySelector(`.task-item[data-id="${id}"]`);
    if (el) {
        el.classList.add('kb-focused');
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

// Archive J/K navigation: ids of crypt cards that are actually on screen — excludes
// search-hidden items (display:none) and any card inside a collapsed month section.
function _visibleArchiveIds() {
    return [...document.querySelectorAll('#archive-list .archive-item')]
        .filter(el => el.style.display !== 'none' && !el.closest('.archive-month-section.collapsed'))
        .map(el => el.dataset.id);
}
function _highlightFocusedArchive(id) {
    document.querySelectorAll('#archive-list .archive-item.kb-focused').forEach(el => el.classList.remove('kb-focused'));
    const el = document.querySelector(`#archive-list .archive-item[data-id="${id}"]`);
    if (el) { el.classList.add('kb-focused'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
function setupEventListeners() {
    inputBox.addEventListener('keydown', e => {
        if (_qaKeydown(e)) return;          // quick-add typeahead handled the key
        if (e.key === 'Enter') addTask();
    });
    inputBox.addEventListener('input', _qaUpdate);
    inputBox.addEventListener('focus', () => {
        const h = document.getElementById('qa-syntax-hint'); if (h) h.classList.add('show');
    });
    inputBox.addEventListener('blur', () => {
        setTimeout(_qaClose, 150); // allow a typeahead item click to land first
        const h = document.getElementById('qa-syntax-hint'); if (h) h.classList.remove('show');
    });
    document.getElementById('note-modal-input').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.ctrlKey) confirmNote();
    });

    // ── Deadline modal shortcuts ──────────────────────────────────────────
    // Enter  → save (= "Сохранить"), skipped if focus is in an input or button
    // Delete → clear (= "Очистить"), skipped if:
    //   • focus is inside a native input/select (the seg-input's _onKey calls
    //     e.preventDefault() first, so e.defaultPrevented acts as guard there)
    //   • activeElement IS the seg-input div (segment keyboard nav active)
    document.getElementById('deadline-modal').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'button') return;
            e.preventDefault();
            confirmDeadline();
        } else if (e.key === 'Delete' && !e.defaultPrevented) {
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (document.activeElement && document.activeElement.classList.contains('seg-input')) return;
            e.preventDefault();
            clearDeadlineModal();
        }
    });
}

// ============================================================
//  SHORTCUTS HINT
// ============================================================
// UX-3: replaced auto-show-on-load with an always-accessible ? button.

let _shortcutsHintOpen = false;
let _taskHintHTML = null;   // the task-page (main) hint markup, captured once from the DOM
// cross-app #5: each context has its OWN key set. The crypt/archive have few or none —
// показывать task-клавиши там было бы ложью. &nbsp; keeps each pair from wrapping mid-token.
const _NOTES_HINT_HTML =                       // notes · «Записи» (active grimoire)
    '<kbd>N</kbd> новая &nbsp;·&nbsp; <kbd>J</kbd><kbd>K</kbd> навигация &nbsp;·&nbsp; ' +
    '<kbd>E</kbd> править &nbsp;·&nbsp; <kbd>Del</kbd> в склеп &nbsp;·&nbsp; <kbd>T</kbd> закрепить &nbsp;·&nbsp; ' +
    '<kbd>Ctrl+F</kbd> поиск &nbsp;·&nbsp; <kbd>F3</kbd> совпадение &nbsp;·&nbsp; <kbd>Ctrl+Z</kbd> отмена';
const _CRYPT_HINT_HTML =                        // notes · «Склеп» (read-only crypt: nav + search only)
    '<kbd>J</kbd><kbd>K</kbd> навигация &nbsp;·&nbsp; <kbd>N</kbd> новая запись &nbsp;·&nbsp; ' +
    '<kbd>Ctrl+F</kbd> поиск';
const _TASK_ARCHIVE_HINT_HTML =                 // tasks archive: nav + search + forge-new (jumps to Tasks)
    '<kbd>J</kbd><kbd>K</kbd> навигация &nbsp;·&nbsp; <kbd>N</kbd> новая задача &nbsp;·&nbsp; ' +
    '<kbd>Ctrl+F</kbd> поиск';

// Pick the hint markup for the CURRENT context (page + grimoire segment).
function _shortcutsHintHTML() {
    const hint = document.getElementById('shortcuts-hint');
    if (_taskHintHTML === null && hint) _taskHintHTML = hint.innerHTML;   // snapshot the task set once
    if (currentPage === 'notes')   return grimMode === 'archive' ? _CRYPT_HINT_HTML : _NOTES_HINT_HTML;
    if (currentPage === 'archive')  return _TASK_ARCHIVE_HINT_HTML;
    return _taskHintHTML || '';                  // main tasks page
}

// Live-sync the open hint with the active tab/segment so a stale set never lingers.
function _refreshShortcutsHint() {
    if (!_shortcutsHintOpen) return;
    const hint = document.getElementById('shortcuts-hint');
    if (hint) hint.innerHTML = _shortcutsHintHTML();
}

function toggleShortcutsHint() {
    const hint = document.getElementById('shortcuts-hint');
    const btn  = document.getElementById('btn-shortcuts-toggle');
    if (!hint) return;
    if (_taskHintHTML === null) _taskHintHTML = hint.innerHTML;   // snapshot the task set once
    _shortcutsHintOpen = !_shortcutsHintOpen;
    if (_shortcutsHintOpen) {
        hint.innerHTML = _shortcutsHintHTML();   // hint follows the current context
        hint.style.display = 'block';
        hint.style.opacity = '1';
        hint.style.transition = '';
        if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
    } else {
        hint.style.opacity = '0';
        hint.style.transition = 'opacity 0.2s';
        if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
        setTimeout(() => {
            if (!_shortcutsHintOpen) hint.style.display = 'none';
        }, 220);
    }
}

// ============================================================
//  SEGMENTED DATE/TIME INPUT  (Fix 3 + Fix 4)
//  Replaces native <input type="date/time"> with a custom
//  div-based segment widget. Features:
//    • Backspace clears current segment then jumps to previous
//    • Active segment highlighted with purple gothic glow
//    • Arrow keys / Tab navigate between segments
//    • Auto-advance after each segment is filled
//    • Syncs to a hidden <input> for all existing JS reads/writes
// ============================================================
const segInputs = {}; // { inputId: SegmentedInput }

class SegmentedInput {
    constructor(inputId, type) {
        this.input = document.getElementById(inputId);
        if (!this.input) return;
        this.type   = type;   // 'time' | 'date'
        this.activeIdx = -1;
        this._pending  = '';  // digit buffer for current segment
        this._todayMin = null;// optional minimum date (YYYY-MM-DD) for date inputs
        this._buildDefs();
        this._buildDOM();
    }

    _buildDefs() {
        if (this.type === 'time') {
            this.defs = [
                { len: 2, min: 0,    max: 23,   ph: 'чч'   },
                { len: 2, min: 0,    max: 59,   ph: 'мм'   },
            ];
        } else {
            this.defs = [
                { len: 2, min: 1,             max: 31,   ph: 'дд'   },
                { len: 2, min: 1,             max: 12,   ph: 'мм'   },
                { len: 4, min: getYearMin(),  max: 2100, ph: 'гггг' },
            ];
        }
        this.segs = this.defs.map(d => ({ ...d, el: null, buf: '' }));
    }

    _buildDOM() {
        const wrap = document.createElement('div');
        wrap.className = 'seg-input modal-input';
        wrap.setAttribute('tabindex', '0');
        wrap.setAttribute('role', 'group');
        wrap.setAttribute('aria-label', this.type === 'time' ? 'Время' : 'Дата');

        const sep = this.type === 'time' ? ':' : '.';
        this.segs.forEach((seg, i) => {
            if (i > 0) {
                const s = document.createElement('span');
                s.className = 'seg-sep';
                s.textContent = sep;
                s.setAttribute('aria-hidden', 'true');
                wrap.appendChild(s);
            }
            const el = document.createElement('span');
            el.className = 'seg';
            el.textContent = seg.ph;
            el.setAttribute('aria-label', seg.ph);
            seg.el = el;
            wrap.appendChild(el);
        });

        this.el = wrap;

        wrap.addEventListener('mousedown', e => {
            const target = e.target.closest('.seg');
            e.preventDefault(); // prevent blur on wrap
            const idx = target ? parseInt(target.dataset.idx ?? this.segs.indexOf(this.segs.find(s => s.el === target))) : -1;
            this._focus(idx >= 0 ? idx : (this.activeIdx >= 0 ? this.activeIdx : 0));
        });
        wrap.addEventListener('focus', () => {
            if (this.activeIdx === -1) this._focus(0);
        });
        wrap.addEventListener('blur', e => {
            // Only deactivate if focus truly left this widget
            if (!wrap.contains(e.relatedTarget)) this._deactivate();
        });
        wrap.addEventListener('keydown', e => this._onKey(e));

        // Bind each seg click explicitly for reliability
        this.segs.forEach((seg, i) => {
            seg.el.dataset.idx = i;
            seg.el.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); this._focus(i); });
        });

        // ── Native picker trigger button (calendar / clock icon) ──────────────
        // Clicking it calls showPicker() on the hidden-but-rendered native input.
        // The native input MUST NOT be display:none for showPicker() to work per spec.
        const pickerBtn = document.createElement('button');
        pickerBtn.type = 'button';
        pickerBtn.className = 'seg-picker-btn';
        pickerBtn.setAttribute('tabindex', '-1');
        const pickerTitle = this.type === 'time' ? 'Выбрать время' : 'Открыть календарь';
        pickerBtn.title = pickerTitle;
        pickerBtn.setAttribute('aria-label', pickerTitle);
        pickerBtn.innerHTML = this.type === 'time'
            // GOTHIC HOURGLASS — proper curves (not X-diagonals).
            // Two rails frame the glass; flowing S-curves form the true hourglass silhouette;
            // filled sand triangle at base = time elapsed. Distinct from the toolbar tower-clock.
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="3.5" x2="19" y2="3.5"/>
                <line x1="5" y1="20.5" x2="19" y2="20.5"/>
                <path d="M6.5 3.5 C6.5 3.5 11 8.5 12 12 C13 15.5 17.5 20.5 17.5 20.5"/>
                <path d="M17.5 3.5 C17.5 3.5 13 8.5 12 12 C11 15.5 6.5 20.5 6.5 20.5"/>
                <path d="M8.5 19 Q12 14.5 15.5 19" fill="currentColor" stroke="none" opacity="0.8"/>
              </svg>`
            // GOTHIC ARCH CALENDAR — lancet arch frame (architectural gothic motif) with
            // two horizontal shelf lines creating three week-rows, and a prominent circled
            // date in the middle row = "pick a date." Instantly legible as a date selector.
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 22V10C5 6.5 8 3 12 3C16 3 19 6.5 19 10V22Z"/>
                <line x1="3" y1="22" x2="21" y2="22"/>
                <line x1="5" y1="13.5" x2="19" y2="13.5"/>
                <line x1="5" y1="18.5" x2="19" y2="18.5"/>
                <circle cx="12" cy="16" r="2.4"/>
                <circle cx="12" cy="16" r="0.75" fill="currentColor" stroke="none"/>
              </svg>`;

        // Prevent mousedown from blurring the seg-input widget
        pickerBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
        pickerBtn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            // Apply min-date restriction set by openDeadlineModal
            if (this._todayMin) this.input.min = this._todayMin;
            try { this.input.showPicker(); } catch (_) { /* showPicker not supported in this env */ }
        });

        // ── Clear button: resets all segments to placeholder ──────────────────
        // Sits between the seg-input and the picker trigger — same ghost style but
        // smaller, danger-coloured on hover. Icon mirrors IC.deadlineClear pattern:
        // the domain symbol (hourglass for time, arch for date) at half opacity,
        // pierced by a bold ×. Consistent with existing note-delete and DL-clear icons.
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'seg-clear-btn';
        clearBtn.setAttribute('tabindex', '-1');
        const clearTitle = this.type === 'time' ? 'Очистить время' : 'Очистить дату';
        clearBtn.title = clearTitle;
        clearBtn.setAttribute('aria-label', clearTitle);
        clearBtn.innerHTML = this.type === 'time'
            // Gothic hourglass (faded) pierced by an ×  —  matches IC.deadlineClear style
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="3.5" x2="19" y2="3.5" opacity="0.45"/>
                <line x1="5" y1="20.5" x2="19" y2="20.5" opacity="0.45"/>
                <path d="M6.5 3.5 C6.5 3.5 11 8.5 12 12 C13 15.5 17.5 20.5 17.5 20.5" opacity="0.45"/>
                <path d="M17.5 3.5 C17.5 3.5 13 8.5 12 12 C11 15.5 6.5 20.5 6.5 20.5" opacity="0.45"/>
                <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke-width="2.1"/>
                <line x1="18.5" y1="5.5" x2="5.5" y2="18.5" stroke-width="2.1"/>
              </svg>`
            // Gothic arch/calendar (faded) pierced by an ×  —  for date inputs
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 22V10C5 6.5 8 3 12 3C16 3 19 6.5 19 10V22Z" opacity="0.45"/>
                <line x1="3" y1="22" x2="21" y2="22" opacity="0.45"/>
                <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke-width="2.1"/>
                <line x1="18.5" y1="5.5" x2="5.5" y2="18.5" stroke-width="2.1"/>
              </svg>`;
        clearBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
        clearBtn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            this.clear();
            // Return focus to the seg-input after clearing so keyboard use isn't interrupted
            this._focus(0);
        });

        // Row wrapper: [segmented widget][clear button][picker button][invisible native input]
        const row = document.createElement('div');
        row.className = 'seg-input-row';
        this.input.parentNode.insertBefore(row, this.input);
        row.appendChild(wrap);
        row.appendChild(clearBtn);
        row.appendChild(pickerBtn);
        row.appendChild(this.input);

        // Keep native input rendered but visually invisible.
        // position:absolute + opacity:0 satisfies showPicker()'s "must be rendered"
        // requirement without interfering with layout.
        this.input.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;border:none;padding:0;margin:0;';
        this.input.setAttribute('tabindex', '-1');

        // When user picks a value from the native picker, sync it into the segments
        this.input.addEventListener('change', () => { this.syncFromInput(); });
    }

    _focus(idx) {
        idx = Math.max(0, Math.min(this.segs.length - 1, idx));
        this.activeIdx = idx;
        this._pending  = '';
        this.segs.forEach((s, i) => s.el.classList.toggle('active', i === idx));
        if (document.activeElement !== this.el) this.el.focus();
    }

    _deactivate() {
        this.activeIdx = -1;
        this.segs.forEach(s => s.el.classList.remove('active'));
    }

    _onKey(e) {
        if (e.key === 'Tab') {
            if (!e.shiftKey && this.activeIdx < this.segs.length - 1) {
                e.preventDefault(); this._focus(this.activeIdx + 1);
            } else if (e.shiftKey && this.activeIdx > 0) {
                e.preventDefault(); this._focus(this.activeIdx - 1);
            } else {
                this._deactivate(); // let focus leave naturally
            }
            return;
        }
        if (e.key === 'ArrowRight') { e.preventDefault(); this._focus(Math.min(this.segs.length - 1, this.activeIdx + 1)); return; }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); this._focus(Math.max(0, this.activeIdx - 1)); return; }

        if (e.key === 'Backspace') {
            e.preventDefault();
            if (this.activeIdx < 0) return;
            const seg = this.segs[this.activeIdx];
            if (seg.buf.length > 0) {
                // Clear current segment, stay here
                seg.buf = '';
                this._pending = '';
                seg.el.textContent = seg.ph;
                this._sync();
            } else if (this.activeIdx > 0) {
                // Move to previous and clear it
                this._focus(this.activeIdx - 1);
                const prev = this.segs[this.activeIdx];
                prev.buf = '';
                this._pending = '';
                prev.el.textContent = prev.ph;
                this._sync();
            }
            return;
        }

        if (e.key === 'Delete') {
            e.preventDefault();
            if (this.activeIdx < 0) return;
            const seg = this.segs[this.activeIdx];
            seg.buf = ''; this._pending = '';
            seg.el.textContent = seg.ph;
            this._sync();
            return;
        }

        if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            if (this.activeIdx < 0) this._focus(0);
            this._digit(e.key);
        }
    }

    _digit(d) {
        const idx = this.activeIdx;
        const seg = this.segs[idx];
        this._pending += d;
        const raw = this._pending;

        if (raw.length >= seg.len) {
            this._commit(idx, raw);
            return;
        }

        // Show partial with underscores
        seg.el.textContent = raw + '_'.repeat(seg.len - raw.length);

        // Early commit: if first digit × 10 already exceeds max (e.g. hour digit 3→ 30>23)
        if (seg.len === 2) {
            const tenVal = parseInt(raw[0]) * 10;
            if (tenVal > seg.max) this._commit(idx, raw);
        }
    }

    _commit(idx, raw) {
        const seg = this.segs[idx];
        const val = Math.max(seg.min, Math.min(seg.max, parseInt(raw) || seg.min));
        seg.buf = String(val).padStart(seg.len, '0');
        seg.el.textContent = seg.buf;
        this._pending = '';
        this._sync();
        if (idx < this.segs.length - 1) this._focus(idx + 1);
    }

    _sync() {
        const filled = this.segs.every(s => s.buf.length === s.len);
        if (!filled) { this.input.value = ''; return; }

        if (this.type === 'time') {
            this.input.value = `${this.segs[0].buf}:${this.segs[1].buf}`;
        } else {
            // date segs order: [dd, mm, yyyy] → stored as YYYY-MM-DD
            const [dd, mm, yyyy] = this.segs.map(s => s.buf);
            this.input.value = `${yyyy}-${mm}-${dd}`;
        }
    }

    // Public: set from a value string (HH:MM for time, YYYY-MM-DD for date)
    setValue(v) {
        this.segs.forEach(s => { s.buf = ''; s.el.textContent = s.ph; });
        this._pending = '';
        this.input.value = '';
        if (!v) return;

        if (this.type === 'time') {
            const parts = v.split(':');
            if (parts.length >= 2) {
                this._setSeg(0, parts[0]);
                this._setSeg(1, parts[1]);
                this.input.value = v;
            }
        } else {
            const parts = v.split('-');
            if (parts.length >= 3) {
                this._setSeg(0, parts[2]); // dd
                this._setSeg(1, parts[1]); // mm
                this._setSeg(2, parts[0]); // yyyy
                this.input.value = v;
            }
        }
    }

    _setSeg(idx, v) {
        const seg = this.segs[idx];
        if (!seg) return;
        const val = parseInt(v) || 0;
        seg.buf = String(val).padStart(seg.len, '0');
        seg.el.textContent = seg.buf;
    }

    // Sync visual from whatever is currently in the hidden input
    syncFromInput() {
        this.setValue(this.input.value || '');
    }

    clear() {
        this.setValue('');
        this.activeIdx = -1;
        this.segs.forEach(s => s.el.classList.remove('active'));
    }

    getValue() { return this.input.value; }
}

// ============================================================
//  GOTHIC MONTH PICKER
//  Custom dropdown for the "Месяц" deadline mode.
//  The native <select id="dl-month"> stays hidden and is kept
//  in sync so that confirmDeadline() reads its .value unchanged.
// ============================================================
function initMonthPicker() {
    const MONTHS = [
        [1,'Январь'],[2,'Февраль'],[3,'Март'],[4,'Апрель'],
        [5,'Май'],[6,'Июнь'],[7,'Июль'],[8,'Август'],
        [9,'Сентябрь'],[10,'Октябрь'],[11,'Ноябрь'],[12,'Декабрь']
    ];

    const picker  = document.getElementById('dl-month-picker');
    const trigger = document.getElementById('dl-month-trigger');
    const label   = document.getElementById('dl-month-label');
    const list    = document.getElementById('dl-month-list');
    const select  = document.getElementById('dl-month');
    if (!picker || !trigger || !list || !select) return;

    let isOpen = false;

    function setMonth(v) {
        const n = parseInt(v, 10);
        const m = MONTHS.find(x => x[0] === n) || MONTHS[0];
        select.value = String(m[0]);
        label.textContent = m[1];
        list.querySelectorAll('.dl-month-option').forEach(opt => {
            const active = parseInt(opt.dataset.value, 10) === m[0];
            opt.classList.toggle('active', active);
            opt.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        _syncListboxActive(list);
    }

    function openPicker() {
        if (isOpen) return;
        isOpen = true;
        // S1-7: open upward when there isn't room below but there is above,
        // so the list never spills past the viewport bottom on short screens.
        const rect = trigger.getBoundingClientRect();
        const listH = 224; // matches .dl-month-list max-height
        const spaceBelow = window.innerHeight - rect.bottom;
        picker.classList.toggle('open-up', spaceBelow < listH && rect.top > listH);
        picker.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        list.setAttribute('aria-hidden', 'false');
        // Scroll active option into view
        const activeOpt = list.querySelector('.dl-month-option.active');
        if (activeOpt) activeOpt.scrollIntoView({ block: 'nearest' });
    }

    function closePicker() {
        if (!isOpen) return;
        isOpen = false;
        picker.classList.remove('open', 'open-up');
        trigger.setAttribute('aria-expanded', 'false');
        list.setAttribute('aria-hidden', 'true');
    }

    trigger.addEventListener('click', e => {
        e.stopPropagation();
        isOpen ? closePicker() : openPicker();
    });

    list.querySelectorAll('.dl-month-option').forEach(opt => {
        opt.addEventListener('click', e => {
            e.stopPropagation();
            setMonth(opt.dataset.value);
            closePicker();
            trigger.focus();
        });
    });

    // Keyboard: arrow navigation, Enter/Space, Escape
    trigger.addEventListener('keydown', e => {
        const cur = parseInt(select.value, 10);
        if (e.key === 'ArrowDown' || e.key === 'Down') {
            e.preventDefault();
            if (!isOpen) { openPicker(); return; }
            const next = MONTHS.find(x => x[0] === cur + 1);
            if (next) setMonth(next[0]);
        } else if (e.key === 'ArrowUp' || e.key === 'Up') {
            e.preventDefault();
            if (!isOpen) { openPicker(); return; }
            const prev = MONTHS.find(x => x[0] === cur - 1);
            if (prev) setMonth(prev[0]);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            isOpen ? closePicker() : openPicker();
        } else if (e.key === 'Escape') {
            closePicker();
        }
    });

    registerGothicPicker(picker, closePicker);   // G4-6: unified outside-click

    // Expose sync helpers for openDeadlineModal / clearDeadlineModal
    window._monthPickerSet   = setMonth;
    window._monthPickerClose = closePicker;

    setMonth(1); // default
}

// ============================================================
//  GOTHIC WEEKDAY PICKER
//  Custom dropdown for "День + Время" deadline mode (weektime).
//  Mirrors the initMonthPicker() pattern exactly:
//  hidden <select id="dl-weekday"> holds the value;
//  custom UI lives in #dl-weekday-picker / #dl-weekday-list.
// ============================================================
function initWeekdayPicker() {
    const DAYS = [
        [1,'Понедельник'],[2,'Вторник'],[3,'Среда'],[4,'Четверг'],
        [5,'Пятница'],[6,'Суббота'],[7,'Воскресенье']
    ];

    const picker  = document.getElementById('dl-weekday-picker');
    const trigger = document.getElementById('dl-weekday-trigger');
    const label   = document.getElementById('dl-weekday-label');
    const list    = document.getElementById('dl-weekday-list');
    const select  = document.getElementById('dl-weekday');
    if (!picker || !trigger || !list || !select) return;

    let isOpen = false;

    function setDay(v) {
        const n = parseInt(v, 10);
        const d = DAYS.find(x => x[0] === n) || DAYS[0];
        select.value  = String(d[0]);
        label.textContent = d[1];
        list.querySelectorAll('.dl-month-option').forEach(opt => {
            const active = parseInt(opt.dataset.value, 10) === d[0];
            opt.classList.toggle('active', active);
            opt.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        _syncListboxActive(list);
    }

    function openPicker() {
        if (isOpen) return;
        isOpen = true;
        picker.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        list.setAttribute('aria-hidden', 'false');
        const activeOpt = list.querySelector('.dl-month-option.active');
        if (activeOpt) activeOpt.scrollIntoView({ block: 'nearest' });
    }

    function closePicker() {
        if (!isOpen) return;
        isOpen = false;
        picker.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        list.setAttribute('aria-hidden', 'true');
    }

    trigger.addEventListener('click', e => {
        e.stopPropagation();
        isOpen ? closePicker() : openPicker();
    });

    list.querySelectorAll('.dl-month-option').forEach(opt => {
        opt.addEventListener('click', e => {
            e.stopPropagation();
            setDay(opt.dataset.value);
            closePicker();
            trigger.focus();
        });
    });

    // Keyboard: arrow navigation, Enter/Space, Escape
    trigger.addEventListener('keydown', e => {
        const cur = parseInt(select.value, 10);
        if (e.key === 'ArrowDown' || e.key === 'Down') {
            e.preventDefault();
            if (!isOpen) { openPicker(); return; }
            const next = DAYS.find(x => x[0] === cur + 1);
            if (next) setDay(next[0]);
        } else if (e.key === 'ArrowUp' || e.key === 'Up') {
            e.preventDefault();
            if (!isOpen) { openPicker(); return; }
            const prev = DAYS.find(x => x[0] === cur - 1);
            if (prev) setDay(prev[0]);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            isOpen ? closePicker() : openPicker();
        } else if (e.key === 'Escape') {
            closePicker();
        }
    });

    registerGothicPicker(picker, closePicker);   // G4-6: unified outside-click

    // Expose sync helpers for openDeadlineModal / clearDeadlineModal
    window._weekdayPickerSet   = setDay;
    window._weekdayPickerClose = closePicker;

    setDay(1); // default: Monday
}

function initSegmentedInputs() {
    segInputs['dl-time']              = new SegmentedInput('dl-time', 'time');
    segInputs['dl-weektime-time']     = new SegmentedInput('dl-weektime-time', 'time');
    segInputs['dl-date']              = new SegmentedInput('dl-date', 'date');
    segInputs['dl-date-time']         = new SegmentedInput('dl-date-time', 'time');
    segInputs['repeat-anchor-time']   = new SegmentedInput('repeat-anchor-time', 'time');
    segInputs['form-repeat-anchor-time'] = new SegmentedInput('form-repeat-anchor-time', 'time');
    initMonthPicker();
    initWeekdayPicker();
    initFormWeekdayPicker();
    initGroupPicker();
}

// ---- Form params weekday picker (mirrors modal's initWeekdayPicker) ----
function initFormWeekdayPicker() {
    const DAYS = [
        [1,'Понедельник'],[2,'Вторник'],[3,'Среда'],[4,'Четверг'],
        [5,'Пятница'],[6,'Суббота'],[7,'Воскресенье']
    ];
    const picker  = document.getElementById('form-wd-picker');
    const trigger = document.getElementById('form-wd-trigger');
    const label   = document.getElementById('form-wd-label');
    const list    = document.getElementById('form-wd-list');
    const hidden  = document.getElementById('form-repeat-anchor-day');
    if (!picker || !trigger || !list || !hidden) return;

    let isOpen = false;

    function setDay(v) {
        const n = parseInt(v, 10);
        const d = DAYS.find(x => x[0] === n);
        hidden.value = d ? String(d[0]) : '';
        formRepeatAnchorDay = d ? d[0] : null;
        label.textContent = d ? d[1] : 'Любой день';
        list.querySelectorAll('.dl-month-option').forEach(opt => {
            const active = opt.dataset.value === (d ? String(d[0]) : '');
            opt.classList.toggle('active', active);
            opt.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        _syncListboxActive(list);
    }

    // Problem 1: the .extra-fields params panel uses overflow:hidden for its
    // open/close animation, which clipped the bottom of this dropdown (Fri–Sun
    // were unreachable). While the picker is open we let the panel overflow so
    // the full list is visible/scrollable, and open upward when near the
    // viewport bottom (mirrors the modal weekday picker).
    const extraFields = document.getElementById('extra-fields');
    function openPicker() {
        if (isOpen) return;
        isOpen = true;
        const rect = trigger.getBoundingClientRect();
        const listH = 290; // approx height for 8 options
        const spaceBelow = window.innerHeight - rect.bottom;
        picker.classList.toggle('open-up', spaceBelow < listH && rect.top > listH);
        picker.classList.add('open');
        extraFields && extraFields.classList.add('dropdown-open');
        trigger.setAttribute('aria-expanded', 'true');
        list.setAttribute('aria-hidden', 'false');
    }
    function closePicker() {
        if (!isOpen) return;
        isOpen = false;
        picker.classList.remove('open', 'open-up');
        extraFields && extraFields.classList.remove('dropdown-open');
        trigger.setAttribute('aria-expanded', 'false');
        list.setAttribute('aria-hidden', 'true');
    }

    trigger.addEventListener('click', e => { e.stopPropagation(); isOpen ? closePicker() : openPicker(); });
    list.querySelectorAll('.dl-month-option').forEach(opt => {
        opt.addEventListener('click', e => { e.stopPropagation(); setDay(opt.dataset.value); closePicker(); trigger.focus(); });
    });
    trigger.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closePicker(); return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? closePicker() : openPicker(); return; }
    });
    registerGothicPicker(picker, closePicker);   // G4-6: unified outside-click
    // X-6: expose the day-setter so confirmDeadline's form-creation path can fill the
    // weekly anchor day when a weektime deadline auto-enables weekly repeat.
    window._formWdPickerSet = setDay;
}


init();
