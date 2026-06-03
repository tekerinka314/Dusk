// ============================================================
//  DUSK — Task Journal  v5  (gothic + subtasks)
// ============================================================

const K_STATE  = 'duskState_v3';
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
    drag: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 1L11 4L8 7L5 4Z"  fill="currentColor" opacity="0.65" stroke-width="0.6" stroke-opacity="0.3"/>
        <path d="M8 5.5L11 8.5L8 11.5L5 8.5Z" fill="currentColor" opacity="1"    stroke-width="0.6" stroke-opacity="0.4"/>
        <path d="M8 10L11 13L8 16L5 13Z" fill="currentColor" opacity="0.65" stroke-width="0.6" stroke-opacity="0.3"/>
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

    // ── NEW GOTHIC ICONS ──────────────────────────────────────

    // Gothic arch clock — for "set deadline" in params
    // A lancet arch (gothic architecture) with clock hands inside: time + gothic in one shape
    // Cancelled seal — for "delete note"
    // Gothic eight-pointed starburst seal (heraldic wax-seal form, deeply medieval) + thin
    // cancellation X inside. The starburst outline = official document / sealed note;
    // the X = voided / erased. Compact, does not overlap with any existing icon.
    scrollX: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2.8L13.9 6.9L18.4 5.6L17.1 10.1L21.2 12L17.1 13.9L18.4 18.4L13.9 17.1L12 21.2L10.1 17.1L5.6 18.4L6.9 13.9L2.8 12L6.9 10.1L5.6 5.6L10.1 6.9Z"/>
        <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" stroke-width="1.5"/>
        <line x1="14.5" y1="9.5" x2="9.5" y2="14.5" stroke-width="1.5"/>
    </svg>`,

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
    nextId:           1,
    nextGroupId:      1,
    nextSubId:        1,
    sortMode:         'priority',  // 'priority' | 'order'  (global sort mode)
    sortModeOverrides: {},         // { [groupId | '__ungrouped__']: 'priority' | 'order' }
};

// ---- UI STATE ----
let isFiltered       = true;
let searchQuery      = '';
let soundEnabled     = false;
let expandOpen       = false;
let currentPage      = 'main';
let undoStack        = [];
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

// Feature: focus mode — show only one group at a time
let focusGroupId     = null;   // null | number

// Feature: archive search
let archiveSearchQuery = '';

// Feature: notifications tracking (prevent duplicate notifications per task per deadline)
const _notifiedDeadlines = new Set(); // Set<taskId>

// IMP-1: track task IDs that were JUST added so only they get taskIn animation.
// Populated by addTask/duplicateTask/restoreTask/restoreSelected/restoreAll.
// Cleared at the end of createTaskEl after being consumed.
const _newTaskIds = new Set();
let renamingGroupId  = null;
let dlCurrentMode    = 'time'; // default — updated from localStorage on init

// ── Deadline mode persistence key
const K_DL_MODE = 'dusk_lastDlMode';
let pendingGroupForSelector = false;
// Schedule sort mode
let isScheduleMode   = false;       // global
const scheduleModeGroups = new Set(); // per-group overrides (groupId numbers)
// P7: Split groups mode — shows active/done as two collapsible zones inside each group
let isGroupSplitMode = false;

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
const colorPicker     = document.getElementById('color-picker');
const mainPage        = document.getElementById('main-page');
const archivePage     = document.getElementById('archive-page');
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
    loadUiState();
    applySoundPref();
    setupEventListeners();
    setupMonthdayStepper();
    setupYearStepper();
    setupRepeatMonthdayStepper();
    initSegmentedInputs();  // segmented inputs + month picker + weekday picker
    // IMP-1: seed _newTaskIds with all loaded tasks so the first render
    // shows the entrance animation exactly as before — stagger included.
    state.tasks.forEach(t => _newTaskIds.add(t.id));
    render();
    // Note: setupSortables() is called inside render() via rAF — no separate call needed here.
    startDeadlineTimer();
    switchPage(currentPage);
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
    // Sort mode button initial state
    const sortBtn = document.getElementById('btn-sort-mode');
    if (sortBtn) {
        sortBtn.innerHTML = state.sortMode === 'order' ? IC.sortOrder : IC.sortPriority;
        sortBtn.title = state.sortMode === 'order' ? 'Режим: по порядку' : 'Режим: по приоритету';
        sortBtn.classList.toggle('active', state.sortMode === 'order');
    }
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
    localStorage.setItem(K_STATE, JSON.stringify(state));
}

function loadState() {
    const raw = localStorage.getItem(K_STATE);
    if (raw) {
        try {
            const loaded = JSON.parse(raw);
            state = { tasks: [], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1, ...loaded };
            migrateTasks(state.tasks);
            migrateTasks(state.archive);
        } catch(e) { migrateFromOld(); }
    } else {
        migrateFromOld();
    }
}

function migrateTasks(arr) {
    arr.forEach(t => {
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
            if (!s.priority)             s.priority = 'none';
            if (!s.note)                 s.note = '';
            if (s.order === undefined)   s.order = i;
            if (s.checked === undefined) s.checked = false;
            if (!s.repeat)               s.repeat = 'none';         // P6 migration
            if (s.cycleChecked === undefined) s.cycleChecked = false; // P6 migration
        });
    });
}

function migrateFromOld() {
    const raw2 = localStorage.getItem('todoState_v2') || localStorage.getItem('todoState');
    if (raw2) {
        try {
            const loaded = JSON.parse(raw2);
            state = { tasks: [], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1, ...loaded };
            migrateTasks(state.tasks);
            migrateTasks(state.archive || []);
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
            id: state.nextId++, text: textEl.innerText || textEl.textContent,
            checked: li.classList.contains('checked'), priority: 'none',
            groupId: null, deadline: null, note: '', noteOpen: false,
            order: state.tasks.length,
            repeat: 'none', cycleChecked: false, nextReset: null,
            subtasks: [], subtasksOpen: false,
        });
    });
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
    const smg = localStorage.getItem('scheduleModeGroups');
    if (smg) { try { JSON.parse(smg).forEach(id => scheduleModeGroups.add(id)); } catch(e){} }
    // Sort mode
    if (!state.sortMode) state.sortMode = 'priority';
    if (!state.sortModeOverrides) state.sortModeOverrides = {};
    // Color filter
    colorFilter  = localStorage.getItem('dusk_colorFilter') || null;
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
    const splitBtn = document.getElementById('btn-split-groups');
    if (splitBtn) splitBtn.classList.toggle('active', isGroupSplitMode);
    // Sort mode button
    const sortBtn = document.getElementById('btn-sort-mode');
    if (sortBtn) {
        sortBtn.innerHTML = state.sortMode === 'order' ? IC.sortOrder : IC.sortPriority;
        sortBtn.title = state.sortMode === 'order' ? 'Режим: по порядку' : 'Режим: по приоритету';
        sortBtn.classList.toggle('active', state.sortMode === 'order');
    }
    // Focus mode button
    const focusBtn = document.getElementById('btn-focus-mode');
    if (focusBtn) focusBtn.classList.toggle('active', !!focusGroupId);
    // Color filter swatch active state
    _syncColorFilterUI();
}

function saveUiState() {
    localStorage.setItem(K_FILTER, isFiltered  ? '1' : '0');
    localStorage.setItem(K_SEARCH, searchQuery);
    localStorage.setItem(K_EXPAND, expandOpen  ? '1' : '0');
    localStorage.setItem(K_PAGE,   currentPage);
    localStorage.setItem('scheduleMode', isScheduleMode ? '1' : '0');
    localStorage.setItem('scheduleModeGroups', JSON.stringify([...scheduleModeGroups]));
    localStorage.setItem('groupSplitMode', isGroupSplitMode ? '1' : '0');
    if (colorFilter) localStorage.setItem('dusk_colorFilter', colorFilter);
    else localStorage.removeItem('dusk_colorFilter');
    if (focusGroupId != null) localStorage.setItem('dusk_focusGroup', String(focusGroupId));
    else localStorage.removeItem('dusk_focusGroup');
}

function pushUndo() {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 40) undoStack.shift();
}

function undo() {
    if (!undoStack.length) { showToast('Нечего отменять'); return; }
    state = JSON.parse(undoStack.pop());
    migrateTasks(state.tasks);
    migrateTasks(state.archive || []);
    saveState(); render();
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

        // Color
        selectedFormColor = snap.color || null;
        document.querySelectorAll('#form-color-picker .form-color-swatch').forEach(s =>
            s.classList.toggle('active', s.dataset.color === (snap.color || '')));
        _syncFormColorPickerState();

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

// ============================================================
//  PAGE NAVIGATION
// ============================================================
let _pageTransitioning = false; // IMP-8: guard against rapid double-click

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
    if (page === currentPage) return;
    // IMP-8: block a second transition while one is already in flight
    if (_pageTransitioning) return;

    const outEl = page === 'archive' ? mainPage : archivePage;
    const inEl  = page === 'archive' ? archivePage : mainPage;

    // Update nav tabs immediately — tab responds at the moment of click
    currentPage = page; saveUiState();
    document.getElementById('nav-main').classList.toggle('active', page === 'main');
    document.getElementById('nav-archive').classList.toggle('active', page === 'archive');

    // Pulse glow on the newly-active tab
    const activeTab = document.getElementById(page === 'main' ? 'nav-main' : 'nav-archive');
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
        if (page === 'archive') renderArchive();
        return;
    }

    // Outgoing page: rise-and-fade (the stone being lifted)
    _pageTransitioning = true;
    outEl.classList.add('page-out');
    outEl.addEventListener('animationend', () => {
        outEl.classList.remove('page-out');
        outEl.style.display = 'none';

        // Incoming page: descend through veil
        if (page === 'archive') renderArchive();
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
            if (page === 'archive') renderArchive();
            inEl.style.display = 'block';
            _pageTransitioning = false;
        }
    }, 600);
}

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
}

function renderTasks() {
    listContainer.innerHTML   = '';
    groupsContainer.innerHTML = '';
    const query = searchQuery.toLowerCase();

    // Ungrouped tasks — only show if not focused on a specific group
    if (focusGroupId === null) {
        if (scheduleActive(null)) {
            const { withDl, noDl } = filterAndSortDeadline(state.tasks.filter(t => !t.groupId), query);
            appendScheduleSection(listContainer, withDl, noDl, null);
        } else {
            filterAndSort(state.tasks.filter(t => !t.groupId), query, null)
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

        const total    = allGrouped.length;
        const done     = allGrouped.filter(t => t.checked || t.cycleChecked).length;
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
                    <button class="btn-group-action btn-group-sort${hasOverride ? ' sort-overridden' : ''}"
                            onclick="toggleGroupSortMode(${group.id})" title="${grpSortMode === 'order' ? 'Режим: по порядку' : 'Режим: по приоритету'}">${grpSortMode === 'order' ? IC.sortOrder : IC.sortPriority}</button>
                    <button class="btn-group-action${focusGroupId === group.id ? ' active-sched' : ''}"
                            onclick="toggleFocusGroup(${group.id})" title="${focusGroupId === group.id ? 'Снять фокус' : 'Фокус на этой группе'}">${IC.focusMode}</button>
                    <button class="btn-group-action" onclick="openRenameGroupModal(${group.id})" title="Переименовать">${IC.quill}</button>
                    <button class="btn-group-action danger" onclick="deleteGroup(${group.id})" title="Удалить группу">${IC.tombstone}</button>
                </div>
                <span class="group-chevron">${IC.sword}</span>
            </div>
            <ul class="task-list group-body" id="group-list-${group.id}"></ul>`;

        groupsContainer.appendChild(section);
        const ul = section.querySelector(`#group-list-${group.id}`);

        if (effSched && isGroupSplitMode) {
            const { withDl, noDl } = filterAndSortDeadline(grouped, '');
            appendScheduleSplitSection(ul, withDl, noDl, group.id);
        } else if (effSched) {
            const { withDl, noDl } = filterAndSortDeadline(grouped, '');
            appendScheduleSection(ul, withDl, noDl, group.id);
        } else if (isGroupSplitMode) {
            const sorted = filterAndSort(grouped, query, group.id);
            appendSplitSection(ul, sorted, group.id, group.id);
        } else {
            filterAndSort(grouped, query, group.id).forEach(t => ul.appendChild(createTaskEl(t, false)));
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

/** Returns the effective sort mode for a given groupId (null = ungrouped). */
function getEffectiveSortMode(groupId) {
    const key = groupId != null ? String(groupId) : '__ungrouped__';
    const override = (state.sortModeOverrides || {})[key];
    return override ?? (state.sortMode || 'priority');
}

function filterAndSort(tasks, query, groupId = null) {
    let list = [...tasks];
    // Hide both permanently-done AND cycle-completed recurring tasks when filter is on.
    if (isFiltered) list = list.filter(t => !t.checked && !t.cycleChecked);
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
    if (isFiltered) list = list.filter(t => !t.checked && !t.cycleChecked);
    if (query) list = list.filter(t =>
        t.text.toLowerCase().includes(query) ||
        (t.note && t.note.toLowerCase().includes(query)) ||
        // Search inside subtask texts (audit B-3)
        (t.subtasks && t.subtasks.some(s => s.text.toLowerCase().includes(query)))
    );
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
    return isScheduleMode || (groupId != null && scheduleModeGroups.has(groupId));
}

// ---- Sort Mode ----
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
    if (clearing) {
        const modal = document.getElementById('color-filter-modal');
        if (modal) modal.style.display = 'none';
        showToast('Фильтр по цвету очищен');
    } else {
        _populateColorFilterModal();
    }
}

function openColorFilterModal() {
    const modal = document.getElementById('color-filter-modal');
    if (!modal) return;
    _populateColorFilterModal();
    modal.style.display = 'flex';
}

function closeColorFilterModal(event) {
    const modal = document.getElementById('color-filter-modal');
    if (!modal) return;
    if (!event || event.target === modal) modal.style.display = 'none';
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
            if (!loaded || !Array.isArray(loaded.tasks)) {
                showToast('Неверный формат файла'); return;
            }
            const clamp = (s, max) => (typeof s === 'string' ? s.slice(0, max) : s);
            const sanitizeTask = t => ({
                ...t,
                text:  clamp(t.text,  200),
                note:  clamp(t.note,  500),
                subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(s => ({
                    ...s, text: clamp(s.text, 200), note: clamp(s.note, 500),
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
        overlay.style.display = 'flex';
        const replaceBtn = document.getElementById('import-replace-btn');
        const mergeBtn   = document.getElementById('import-merge-btn');
        const cancelBtn  = document.getElementById('import-cancel-btn');
        const close = () => { overlay.style.display = 'none'; };

        replaceBtn.onclick = () => {
            close();
            pushUndo();
            state = {
                tasks: [], groups: [], archive: [],
                nextId: 1, nextGroupId: 1, nextSubId: 1,
                sortMode: 'priority', sortModeOverrides: {},
                ...loaded,
                tasks:   (loaded.tasks   || []).map(sanitizeTask),
                groups:  (loaded.groups  || []).map(sanitizeGroup),
                archive: (loaded.archive || []).map(sanitizeTask),
            };
            migrateTasks(state.tasks);
            migrateTasks(state.archive || []);
            undoStack = [];
            saveState(); render();
            showToast(`Импортировано: ${state.tasks.length} задач`);
        };

        mergeBtn.onclick = () => {
            close();
            pushUndo();
            const idOffset = state.nextId;
            const gidOffset = state.nextGroupId;
            const sidOffset = state.nextSubId;
            // Remap IDs to avoid collisions
            const newGroups = (loaded.groups || []).map(sanitizeGroup).map(g => ({
                ...g, id: g.id + gidOffset,
            }));
            const newTasks = (loaded.tasks || []).map(sanitizeTask).map(t => ({
                ...t,
                id:      t.id + idOffset,
                groupId: t.groupId != null ? t.groupId + gidOffset : null,
                subtasks: (t.subtasks || []).map(s => ({ ...s, id: (s.id || 0) + sidOffset })),
                order:   t.order + state.tasks.length,
            }));
            state.groups.push(...newGroups);
            state.tasks.push(...newTasks);
            if (newTasks.length)  state.nextId      = Math.max(state.nextId,  ...newTasks.map(t => t.id + 1));
            if (newGroups.length) state.nextGroupId = Math.max(state.nextGroupId, ...newGroups.map(g => g.id + 1));
            migrateTasks(state.tasks);
            saveState(); render();
            showToast(`Добавлено: ${newTasks.length} задач`);
        };

        cancelBtn.onclick = close;
        overlay.onclick = (ev) => { if (ev.target === overlay) close(); };
    } else {
        // Fallback if modal not in HTML — just replace
        pushUndo();
        state = {
            tasks: [], groups: [], archive: [],
            nextId: 1, nextGroupId: 1, nextSubId: 1,
            sortMode: 'priority', sortModeOverrides: {},
            ...loaded,
            tasks:   (loaded.tasks   || []).map(sanitizeTask),
            groups:  (loaded.groups  || []).map(sanitizeGroup),
            archive: (loaded.archive || []).map(sanitizeTask),
        };
        migrateTasks(state.tasks);
        migrateTasks(state.archive || []);
        undoStack = [];
        saveState(); render();
        showToast(`Импортировано: ${state.tasks.length} задач`);
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
    state.tasks.forEach(task => {
        if (task.checked || task.cycleChecked) return;
        if (!task.deadline) return;
        if (_notifiedDeadlines.has(task.id)) return;
        const status = deadlineStatus(task.deadline);
        if (status === 'critical' || status === 'over') {
            _notifiedDeadlines.add(task.id);
            try {
                new Notification('DUSK — дедлайн', {
                    body: task.text,
                    icon: './icon-192.svg',
                    tag:  'dusk-deadline-' + task.id,
                });
            } catch(e) { /* ignore */ }
        }
    });
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
                const oldIdx = evt.oldIndex;
                const newIdx = evt.newIndex;
                if (oldIdx === newIdx) return;
                const moved = state.groups.splice(oldIdx, 1)[0];
                state.groups.splice(newIdx, 0, moved);
                saveState();
                render();
            },
        });
    }
}

// ---- Bulk priority change ----
function bulkSetPriority(priority) {
    if (!selectedTaskIds.size) return;
    pushUndo();
    selectedTaskIds.forEach(id => {
        const t = state.tasks.find(t => t.id === id);
        if (t) t.priority = priority;
    });
    saveState();
    toggleMainSelectMode(); // exit select mode and re-render
    showToast('Приоритет изменён');
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

function renderGroupChips(currentVal) {
    const container = document.getElementById('group-inline-sel');
    if (!container) return;
    const currentGid = currentVal || '';
    let html = `<button class="grp-chip${currentGid === '' ? ' active' : ''}" data-gid="" onclick="selectGroupChip('')">— без группы —</button>`;
    state.groups.forEach(g => {
        const rgb  = hexToRgb(g.color);
        const bg   = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.14)` : 'rgba(110,40,200,0.14)';
        const bord = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)` : 'rgba(110,40,200,0.35)';
        const isActive = String(g.id) === String(currentGid);
        html += `<button class="grp-chip${isActive ? ' active' : ''}" data-gid="${g.id}"
            style="color:${g.color};border-color:${bord};${isActive ? `background:${bg}` : ''}"
            onclick="selectGroupChip('${g.id}')"><span class="grp-chip-dot" style="background:${g.color}"></span>${escHtml(g.name)}</button>`;
    });
    html += `<button class="grp-chip grp-chip-new" onclick="selectGroupChip('__new__')">+ Создать</button>`;
    container.innerHTML = html;
}

function selectGroupChip(gid) {
    if (gid === '__new__') {
        // D-6: deactivate current chip visually so state looks clean
        // while the user is in the "create group" modal
        const container = document.getElementById('task-group-chips');
        if (container) {
            container.querySelectorAll('.grp-chip.active').forEach(c => {
                c.classList.remove('active');
                c.style.background = '';
            });
        }
        pendingGroupForSelector = true;
        showAddGroupModal();
        return;
    }
    taskGroupSelect.value = gid;
    renderGroupChips(gid);
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

    if (!items.length) {
        archiveEmpty.style.display = 'flex';
        if (archiveBtns) archiveBtns.style.display = 'none';
        if (clearBtn)    clearBtn.style.display    = 'none';
        if (selectBar)   { selectBar.style.display = 'none'; selectMode = false; selectedArchiveIds.clear(); }
        // (archive stats removed)
        return;
    }

    archiveEmpty.style.display = 'none';
    if (archiveBtns) archiveBtns.style.display = 'flex';
    if (clearBtn)    clearBtn.style.display    = 'flex';

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
            <svg class="archive-month-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <polyline points="6 9 12 15 18 9"/>
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
                        <span class="archive-sub-text">${escHtml(s.text)}</span>
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
                    <span class="task-text">${escHtml(item.text)}</span>
                    <div class="task-meta">${groupHtml}${dlHtml}${rptHtml}<span class="meta-tag muted-tag">${date}</span></div>
                    ${item.note ? `<div class="task-note-wrapper visible"><div class="task-note-text">${escHtml(item.note)}</div></div>` : ''}
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
        let groupId = item.groupId;
        if (groupId && !state.groups.find(g => g.id === groupId)) groupId = null;
        state.tasks.push({
            id: item.id, text: item.text, checked: false,
            priority: item.priority || 'none', groupId,
            deadline: item.deadline, note: item.note, noteOpen: false,
            order: state.tasks.length,
            repeat: item.repeat || 'none',
            cycleChecked: false, nextReset: null,
            subtasks: JSON.parse(JSON.stringify(item.subtasks || [])).map(s => ({
                ...s, cycleChecked: false, nextReset: null,
            })),
            subtasksOpen: true,
        });
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
    const now = Date.now();
    state.archive.forEach(item => {
        let groupId = item.groupId;
        if (groupId && !state.groups.find(g => g.id === groupId)) groupId = null;
        state.tasks.push({
            id: item.id, text: item.text, checked: false,
            priority: item.priority || 'none', groupId,
            deadline: item.deadline, note: item.note, noteOpen: false,
            order: state.tasks.length,
            repeat: item.repeat || 'none',
            cycleChecked: false, nextReset: null,
            subtasks: JSON.parse(JSON.stringify(item.subtasks || [])).map(s => ({
                ...s, cycleChecked: false, nextReset: null,
            })),
            subtasksOpen: true,
        });
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
    if (task.color) li.style.setProperty('--task-color', task.color);

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
        else if (status === 'critical') tc += ' critical';
        else if (status === 'urgent')   tc += ' urgent';
        else if (status === 'warn')     tc += ' warn';
        const cdHtml = countdown ? `<span class="dl-countdown">${countdown}</span><span class="dl-sep">·</span>` : '';
        deadlineHtml = `<span class="meta-tag-wrap"><span class="${tc}">${IC.window}<span class="dl-badge-inner">${cdHtml}<span class="dl-absolute">${absolute}</span></span></span><button class="btn-tag-clear" onclick="clearTaskDeadline(${task.id});event.stopPropagation();" title="Убрать дедлайн">${IC.crossedSwords}</button></span>`;
    }

    // ── Repeat badge ──
    const rptAnchorLabel = getRepeatAnchorLabel(task.repeat, task.repeatAnchorTime, task.repeatAnchorDay, task.repeatAnchorMonthday);
    const rptHtml = (task.repeat && task.repeat !== 'none')
        ? `<span class="meta-tag-wrap"><span class="meta-tag repeat-tag">${IC.ouroboros}<span>${repeatLabel(task.repeat)}${rptAnchorLabel ? ` · ${rptAnchorLabel}` : ''}</span></span><button class="btn-tag-clear" onclick="clearTaskRepeat(${task.id});event.stopPropagation();" title="Убрать повтор">${IC.crossedSwords}</button></span>` : '';

    // ── Note controls ──
    const hasNote = task.note && task.note.trim();
    // Note toggle — always visible:
    //   • has note  → open/close note-wrapper
    //   • no note   → open/close inline-note-add field
    const noteToggle = hasNote
        ? `<button class="btn-note-toggle${task.noteOpen ? ' open' : ''}" onclick="toggleNote(event, ${task.id})" title="${task.noteOpen ? 'Скрыть заметку' : 'Показать заметку'}">${IC.sword}<span>заметка</span></button>`
        : `<button class="btn-note-toggle" id="note-add-toggle-${task.id}" onpointerdown="(function(e){var w=document.getElementById('inline-note-add-${task.id}');if(w&&w.classList.contains('open'))_inlineNoteClosingId=${task.id};})(event)" onclick="toggleInlineNoteAdd(event,${task.id})" title="Добавить заметку">${IC.sword}<span>заметка</span></button>`;

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

    // ── Note/edit buttons ──
    // P4: "add note" uses the modal (full textarea experience).
    // The inline-note-add area below also exists for quick inline entry.
    const addNoteBtn = !hasNote
        ? `<button class="btn-task-action" onclick="openNoteModal(${task.id})" title="Добавить заметку">${IC.addNote}</button>`
        : `<button class="btn-task-action edit-note-btn" onclick="openEditNoteModal(${task.id})" title="Изменить заметку">${IC.editNote}</button>`;

    // Inline note-add — always rendered when no note; hidden via CSS max-height:0 by default
    const inlineNoteAdd = !hasNote ? `
        <div class="inline-note-add" id="inline-note-add-${task.id}">
            <input class="inline-note-input" id="inline-note-input-${task.id}"
                   placeholder="Краткая заметка..." maxlength="300" autocomplete="off"
                   onkeydown="handleInlineNoteKey(event,${task.id})"
                   onblur="commitInlineNote(${task.id})">
        </div>` : '';

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

    li.innerHTML = `
        ${dlSideHtml}
        ${mainSelectMode ? `<button class="task-select-checkbox${selectedTaskIds.has(task.id) ? ' selected' : ''}"
            onclick="toggleMainSelectTask(${task.id})" title="Выбрать задачу" aria-label="Выбрать для массового действия">
            ${selectedTaskIds.has(task.id) ? IC.selectChecked : IC.selectEmpty}
        </button>` : ''}
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
                <span class="task-text" data-id="${task.id}" title="Двойной клик — редактировать" ondblclick="startInlineEdit(event, ${task.id})">${displayText}</span>
                <div class="task-actions">
                    <button class="btn-task-action btn-pin${task.pinned ? ' active' : ''}" onclick="togglePin(${task.id})" title="${task.pinned ? 'Открепить' : 'Закрепить задачу'}">${IC.pin}</button>
                    <button class="btn-task-action btn-task-color${(task.priority && task.priority !== 'none') ? ' color-btn-prio-disabled' : ''}" onclick="${(task.priority && task.priority !== 'none') ? '' : `openTaskColorModal(${task.id})`}" ${(task.priority && task.priority !== 'none') ? 'disabled title="Цветовая метка недоступна при заданном приоритете"' : `title="Цветовая метка"`} style="${task.color ? `color:${task.color}` : ''}">
                        <svg viewBox="0 0 24 24" fill="${task.color || 'none'}" stroke="currentColor" stroke-width="1.8">
                            <circle cx="12" cy="12" r="7" ${task.color ? `fill="${task.color}" opacity="0.85"` : 'fill="none"'}/>
                            ${task.color ? '' : '<circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.35"/>'}
                        </svg>
                    </button>
                    <button class="btn-task-action" onclick="openDeadlineModal(${task.id})" title="Дедлайн">${IC.window}</button>
                    <button class="btn-task-action" onclick="openRepeatModal(${task.id})" title="Повтор">${IC.ouroboros}</button>
                    <button class="btn-task-action" onclick="openPrioModal(${task.id})" title="Приоритет">${IC.spires}</button>
                    ${addNoteBtn}
                    <button class="btn-task-action" onclick="duplicateTask(${task.id})" title="Дублировать задачу">${IC.twinCoffin}</button>
                    <button class="btn-task-action archive-btn" onclick="removeTask(${task.id})" title="В архив">${IC.archive}</button>
                    <button class="btn-task-action danger" onclick="deleteTaskForever(${task.id})" title="Удалить навсегда">${IC.skull}</button>
                </div>
            </div>
            <div class="task-meta">${deadlineHtml}${rptHtml}${cycleUntilHtml}${noteToggle}${subToggle}${subNotesAlwaysBtn}</div>
            ${hasNote ? `
            <div class="task-note-wrapper${task.noteOpen ? ' visible' : ''}" id="note-wrapper-${task.id}">
                <div class="task-note-text" id="note-${task.id}"
                     ondblclick="startNoteInlineEdit(event, ${task.id})"
                     title="Двойной клик — редактировать">${escHtml(task.note)}</div>
                <button class="btn-note-delete" onclick="deleteNote(event, ${task.id})" title="Удалить заметку">${IC.scrollX}</button>
            </div>` : ''}
            ${inlineNoteAdd}
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
    // Note wrapper: .has-note means CSS :hover + :focus-within show it automatically.
    // .open is only used for the "create note" flow (no existing note).
    const noteWrapClass = s.note ? 'has-note' : '';
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
            <span class="sub-text" title="Двойной клик — редактировать" ondblclick="startSubEdit(event,${taskId},${s.id})">${subDisplayText}</span>
            <div class="sub-actions">
                <button type="button" class="btn-sub-action sub-prio-btn" onclick="cycleSubPriority(${taskId},${s.id})" title="Приоритет подпункта"><div class="sub-prio-dot"></div></button>
                ${subRepeatBtn}
                <button type="button" class="btn-sub-action btn-sub-note-toggle${s.note ? ' has-note' : ''}" onpointerdown="event.preventDefault()" onclick="toggleSubNote(${taskId},${s.id})" title="${s.note ? 'Редактировать заметку' : 'Добавить заметку'}">${s.note ? IC.editNote : IC.addNote}</button>
                <button type="button" class="btn-sub-action danger" onclick="deleteSubtask(${taskId},${s.id})" title="Удалить подпункт">${IC.skull}</button>
            </div>
        </div>
        <div class="sub-note-wrapper ${noteWrapClass}" id="subnote-${taskId}-${s.id}">
            <div class="sub-note-text" id="subnote-text-${taskId}-${s.id}"
                 ${s.note ? 'contenteditable="true"' : ''}
                 onfocus="this.contentEditable='true'"
                 onblur="saveSubNote(${taskId},${s.id},this.textContent.trim())"
                 onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();this.blur()}"
                >${escHtml(s.note || '')}</div>
            ${s.note ? `<button type="button" class="btn-sub-note-delete" onclick="deleteSubNote(event,${taskId},${s.id})" title="Удалить заметку">${IC.scrollX}</button>` : ''}
        </div>
    </li>`;
}

// ============================================================
//  FORM SUBTASKS (subtasks added before task is created)
// ============================================================
let formSubtasks = []; // [{text, priority, note, repeat, repeatAnchorTime, repeatAnchorDay, repeatAnchorMonthday}]

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
        const newEl = document.querySelector(`#form-sub-list .form-sub-item[data-form-sub-idx="${formSubtasks.length - 1}"]`);
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
    const el = document.querySelector(`#form-sub-list .form-sub-item[data-form-sub-idx="${idx}"]`);
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

function renderFormSubtasks() {
    const list = document.getElementById('form-sub-list');
    if (!list) return;
    const PRIO_COLORS = { high: 'var(--prio-high)', medium: 'var(--prio-medium)', low: 'var(--prio-low)', none: 'var(--border-mid)' };
    list.innerHTML = formSubtasks.map((s, i) => {
        const prioColor = PRIO_COLORS[s.priority] || PRIO_COLORS.none;
        const repeatSet = s.repeat && s.repeat !== 'none';
        const anchorLabel = repeatSet ? getRepeatAnchorLabel(s.repeat, s.repeatAnchorTime, s.repeatAnchorDay, s.repeatAnchorMonthday) : '';
        const repeatTitle = repeatSet
            ? `Повтор: ${repeatLabel(s.repeat)}${anchorLabel ? ` · ${anchorLabel}` : ''}`
            : 'Назначить повтор';
        return `
        <div class="form-sub-item" data-form-sub-idx="${i}">
            <div class="form-sub-main-row">
                ${subCoffinSVG(false)}
                <span class="form-sub-text">${escHtml(s.text)}</span>
                <div class="form-sub-actions">
                    <button class="btn-form-sub-action${s.priority !== 'none' ? ' active' : ''}"
                            onclick="cycleFormSubPriority(${i})" title="Приоритет подпункта">
                        <div class="sub-prio-dot" style="background:${prioColor}"></div>
                    </button>
                    <button class="btn-form-sub-action${repeatSet ? ' active' : ''}"
                            onclick="openFormSubRepeat(${i})" title="${repeatTitle}">
                        ${IC.ouroboros}
                    </button>
                    <button class="btn-form-sub-action${s.note ? ' has-note' : ''}"
                            onclick="editFormSubNote(${i})" title="${s.note ? 'Редактировать заметку' : 'Добавить заметку'}">
                        ${s.note ? IC.editNote : IC.addNote}
                    </button>
                    <button class="btn-form-sub-del" onclick="removeFormSubtask(${i})" title="Удалить">${IC.dagger}</button>
                </div>
            </div>
            ${s.note ? `<div class="form-sub-note-preview">${escHtml(s.note)}</div>` : ''}
        </div>`;
    }).join('');
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

function editFormSubNote(idx) {
    const s = formSubtasks[idx];
    if (!s) return;
    const newNote = prompt('Заметка подпункта:', s.note || '');
    if (newNote === null) return; // cancelled
    s.note = newNote.trim().slice(0, 300);
    renderFormSubtasks();
}

// UX-4: snapshot of the form state captured just before addTask() commits,
// so Ctrl+Z can restore the text the user just submitted.
let _undoFormSnapshot = null;

// ============================================================
//  TASK CRUD
// ============================================================
function addTask() {
    const text = inputBox.value.trim();
    if (!text) { shakeInput(); showToast('Введите название задачи'); return; }

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
    };

    pushUndo();

    const groupId  = parseInt(taskGroupSelect.value) || null;
    const note     = taskNote.value.trim();
    const deadline = formDeadline ? { ...formDeadline } : null;

    // Problem 3: read form-level repeat anchor
    // Prefer SegmentedInput value (registered after initSegmentedInputs); fall back to raw var
    const _fRAt  = segInputs['form-repeat-anchor-time']?.value || formRepeatAnchorTime || null;
    const _fRAd  = formRepeatAnchorDay;
    const _fRAmd = formRepeatAnchorMonthday;

    const newSubtasks = formSubtasks.map((s, i) => ({
        id: state.nextSubId++, text: s.text, checked: false,
        priority: s.priority || 'none',
        note: s.note || '',
        order: i,
        repeat: s.repeat || 'none',
        repeatAnchorTime: s.repeatAnchorTime || null,
        repeatAnchorDay: s.repeatAnchorDay || null,
        repeatAnchorMonthday: s.repeatAnchorMonthday || null,
        cycleChecked: false, nextReset: null,
    }));

    state.tasks.push({
        id: state.nextId++,
        text, checked: false,
        priority: selectedPriority,
        color: selectedFormColor || null,
        groupId, deadline, note, noteOpen: false,
        order: state.tasks.length,
        repeat: selectedRepeat,
        repeatAnchorTime:     _fRAt  || null,
        repeatAnchorDay:      _fRAd  || null,
        repeatAnchorMonthday: _fRAmd || null,
        cycleChecked: false,
        nextReset: null,
        subtasks: newSubtasks,
        subtasksOpen: newSubtasks.length > 0,
        pinned: false,
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
    // Reset form color to none
    selectedFormColor = null;
    document.querySelectorAll('#form-color-picker .form-color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color === ''));
    _syncFormColorPickerState(); // FIX-1: re-enable color picker after reset
    // Reset group chip to none
    taskGroupSelect.value = '';
    renderGroupChips('');

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
        li.classList.add('removing');
        li.addEventListener('animationend', () => {
            render(); // DOM cleanup only — state already updated above
        }, { once: true });
    } else {
        render();
    }
    showToast('Задача перемещена в архив');
}

// Problem 4: fade the task's current row out, then re-render so it re-appears in
// its new active/completed slot — smooth in both the normal list and the split
// active/done zones. The coffin seal/unseal still plays on the checkbox during
// the fade. Falls back to an immediate render when motion is reduced.
function _leaveTaskThenRender(id, opts = {}) {
    const li      = document.querySelector(`.task-item[data-id="${id}"]`);
    const checkEl = li && li.querySelector('.task-check');
    const reduced = prefersReducedMotion();
    const afterRender = () => {
        if (opts.fadeIn && !reduced) {
            const newLi = document.querySelector(`.task-item[data-id="${id}"]`);
            if (newLi) {
                newLi.classList.add('reentering');
                requestAnimationFrame(() => requestAnimationFrame(() => newLi.classList.remove('reentering')));
            }
        }
        if (opts.checkAllDone) {
            const allFinished = state.tasks.length > 0 &&
                state.tasks.every(t => t.checked || t.cycleChecked);
            if (allFinished) showAllDone();
        }
    };
    if (!li || reduced) { render(); afterRender(); return; }
    if (checkEl && opts.sealClass) checkEl.classList.add(opts.sealClass);
    li.classList.add('task-leaving');
    let done = false;
    const finish = () => { if (done) return; done = true; render(); afterRender(); };
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
                    }, { once: true });
                } else {
                    render(); // no element found — render immediately
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
    // Subtasks are fully independent — parent toggle does NOT change their state
    if (task.checked) { playSound('check'); vibrate(30); }
    saveState(); // persist immediately — render is deferred until the fade-out ends

    // ── Coffin seal ritual + smooth move (problem 4) ─────────────────────────
    // The checkbox seals/unseals while the whole row fades out, then re-renders
    // in its new active/completed position. A checked row dims into place via
    // taskCheckIn; an unchecked row fades back in via .reentering.
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
    showToast('Все задачи архивированы');
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
    state.tasks = [];
    saveState(); render();
    showToast('Все задачи удалены навсегда');
}

// Delete group — two-step confirm keyed by group id
const _deleteGroupArmed = new Map(); // groupId → timerId

function deleteGroup(id) {
    // Find the danger button for this group in the DOM
    const btn = document.querySelector(
        `.group-section[data-group-id="${id}"] .btn-group-action.danger`
    );

    if (!_deleteGroupArmed.has(id)) {
        // ── Arm ──
        _deleteGroupArmed.set(id, setTimeout(() => {
            _deleteGroupArmed.delete(id);
            if (btn) btn.classList.remove('confirm-armed');
        }, 3000));
        if (btn) btn.classList.add('confirm-armed');
        showToast('Нажмите ещё раз — удалить группу');
        return;
    }
    // ── Fire ──
    clearTimeout(_deleteGroupArmed.get(id));
    _deleteGroupArmed.delete(id);
    if (btn) btn.classList.remove('confirm-armed');

    pushUndo();
    state.tasks.forEach(t => { if (t.groupId === id) t.groupId = null; });
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
    showToast('Группа удалена');
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
        // Problem 5: a subtask returning to "active" must also re-open a parent that
        // was auto-completed because every subtask was done — otherwise the parent
        // stays marked done until the user manually toggles it. Mirrors the
        // "any sub unchecked → uncheck parent" rule in toggleSubtask().
        if (subReset && (t.subtasks || []).length > 0) {
            const allSubsDone = t.subtasks.every(s => s.checked || s.cycleChecked);
            if (!allSubsDone) {
                if (t.cycleChecked) { t.cycleChecked = false; t.nextReset = null; changed = true; }
                else if (t.checked) { t.checked = false; changed = true; }
            }
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
    let groupId = item.groupId;
    if (groupId && !state.groups.find(g => g.id === groupId)) groupId = null;
    state.tasks.push({
        id: item.id, text: item.text, checked: false,
        priority: item.priority || 'none', groupId,
        deadline: item.deadline, note: item.note, noteOpen: false,
        order: state.tasks.length,
        repeat: item.repeat || 'none',
        cycleChecked: false, nextReset: null,
        subtasks: JSON.parse(JSON.stringify(item.subtasks || [])).map(s => ({
            ...s, cycleChecked: false, nextReset: null,
        })),
        subtasksOpen: true,
    });
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
        li.classList.add('restoring');
        li.addEventListener('animationend', safeTransition, { once: true });
        setTimeout(safeTransition, 500);
    } else {
        doTransition();
    }
}

function deleteFromArchive(id) {
    state.archive = state.archive.filter(a => a.id !== id);
    saveState(); renderArchive(); updateArchiveBadge();
    showToast('Удалено из архива');
}

function clearArchive() {
    if (!state.archive.length) return;
    // Reset select mode
    selectMode = false; selectedArchiveIds.clear();
    const bar = document.getElementById('archive-select-bar');
    if (bar) bar.style.display = 'none';
    state.archive = [];
    saveState(); renderArchive(); updateArchiveBadge();
    showToast('Архив очищен');
}

// ============================================================
//  SUBTASK OPERATIONS
// ============================================================
function toggleSubtasksSection(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.subtasksOpen = !task.subtasksOpen;
    const sec = document.getElementById(`sub-section-${taskId}`);
    const btn = document.querySelector(`.btn-subtask-toggle[data-tid="${taskId}"]`);
    if (sec) {
        if (task.subtasksOpen) {
            sec.classList.add('open');
            // Animate to actual height, then release to 'none' so content can grow freely.
            // ANIM-2: use transitionend instead of setTimeout(320) — timers are inaccurate
            // and can fire before/after the CSS transition completes.
            const inner = sec.querySelector('.sub-section-inner');
            if (inner) {
                const h = inner.scrollHeight;
                sec.style.maxHeight = h + 'px';
                const _onOpened = (e) => {
                    if (e.propertyName !== 'max-height') return;
                    sec.removeEventListener('transitionend', _onOpened);
                    // Only unlock to 'none' if still open (not toggled back mid-animation)
                    if (task.subtasksOpen) sec.style.maxHeight = 'none';
                };
                sec.addEventListener('transitionend', _onOpened);
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
            const _onCollapsed = (e) => {
                if (e.propertyName !== 'max-height') return;
                sec.removeEventListener('transitionend', _onCollapsed);
                sec.classList.remove('open');
                sec.style.maxHeight = '';
                sec.style.opacity   = '';
            };
            sec.addEventListener('transitionend', _onCollapsed);
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
    const sub = { id: state.nextSubId++, text, checked: false, priority: 'none', note: '', order: task.subtasks.length, repeat: 'none', cycleChecked: false };
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

function toggleSubtask(taskId, subId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const sub = task.subtasks.find(s => s.id === subId);
    if (!sub) return;
    pushUndo();

    // P6: subtask-level cycle repeat — toggle cycleChecked, not checked
    const subIsRecurring = sub.repeat && sub.repeat !== 'none';
    if (subIsRecurring) {
        sub.cycleChecked = !sub.cycleChecked;
        sub.checked = false;
        // Set nextReset when marking done so checkCycleResets can auto-uncheck later
        if (sub.cycleChecked) {
            sub.nextReset = getNextResetTimestamp(sub);
        } else {
            sub.nextReset = null;
        }

        // P3: also check if all subs are now done → auto-complete parent
        if (sub.cycleChecked) {
            const allSubsDone = task.subtasks.length > 0 &&
                task.subtasks.every(s => s.checked || s.cycleChecked);
            if (allSubsDone) {
                pushUndo(); // W-1: separate undo point for the parent auto-completion
                const isRecurring = task.repeat && task.repeat !== 'none';
                if (isRecurring) {
                    if (!task.cycleChecked) {
                        task.cycleChecked = true;
                        task.nextReset = getNextResetTimestamp(task);
                        playSound('check'); vibrate(30);
                    }
                } else if (!task.checked) {
                    task.checked = true;
                    playSound('check'); vibrate(30);
                }
                saveState(); render();
                const allFinished = state.tasks.length > 0 &&
                    state.tasks.every(t => t.checked || t.cycleChecked);
                if (allFinished) showAllDone();
                return;
            }
        }

        saveState();
        if (sub.cycleChecked) playSound('check');
        // Re-sort so cycle-checked items move to their correct position group,
        // with a smooth fade-out of the old position first (problem 4).
        _animateSubThenRefresh(taskId, subId);
        return;
    }

    sub.checked = !sub.checked;

    const isRecurring = task.repeat && task.repeat !== 'none';

    // All subs "done" → auto-mark parent done.
    const allSubsDone = task.subtasks.length > 0 &&
        task.subtasks.every(s => s.checked || s.cycleChecked);

    if (sub.checked && allSubsDone) {
        pushUndo(); // W-1: separate undo point for auto-completing the parent task
        if (isRecurring) {
            if (!task.cycleChecked) {
                task.cycleChecked = true;
                task.nextReset    = getNextResetTimestamp(task);
                playSound('check'); vibrate(30);
            }
        } else if (!task.checked) {
            task.checked = true;
            playSound('check'); vibrate(30);
        }
        saveState(); render();
        const allFinished = state.tasks.length > 0 &&
            state.tasks.every(t => t.checked || t.cycleChecked);
        if (allFinished) showAllDone();
        return;
    }

    // Any sub unchecked → auto-uncheck parent
    if (!sub.checked) {
        if (isRecurring) {
            if (task.cycleChecked) {
                task.cycleChecked = false;
                task.nextReset    = null;
                saveState(); render();
                return;
            }
        } else if (task.checked) {
            task.checked = false;
            saveState(); render();
            return;
        }
    }

    // Re-sort: checked items sink to bottom, unchecked float back up.
    // Fade the old position out first so the move reads smoothly in both the
    // normal and split layouts (problem 4).
    saveState();
    if (sub.checked) playSound('check');
    _animateSubThenRefresh(taskId, subId);
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
    const finish = () => { if (done) return; done = true; refreshSubtaskList(taskId); };
    itemEl.classList.add('checking-out');
    itemEl.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 220); // safety net if animationend never fires
}

function deleteSubtask(taskId, subId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const commit = () => {
        pushUndo();
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

// P8: delete subtask note
function deleteSubNote(event, taskId, subId) {
    event.stopPropagation();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const sub = task.subtasks.find(s => s.id === subId);
    if (!sub) return;
    pushUndo();
    sub.note = '';
    saveState();
    const wrap = document.getElementById(`subnote-${taskId}-${subId}`);
    if (wrap) {
        wrap.classList.remove('has-note', 'open');
        wrap._dismissed = false;
        _closeNoteWrap(wrap);
        const txt = document.getElementById(`subnote-text-${taskId}-${subId}`);
        if (txt) { txt.textContent = ''; txt.contentEditable = 'false'; }
        const delBtn = wrap.querySelector('.btn-sub-note-delete');
        if (delBtn) delBtn.remove();
    }
    // Update toggle button indicator
    const noteToggleBtn = document.querySelector(
        `.subtask-item[data-tid="${taskId}"][data-sid="${subId}"] .btn-sub-note-toggle`
    );
    if (noteToggleBtn) {
        noteToggleBtn.classList.remove('has-note');
        noteToggleBtn.title = 'Добавить заметку';
    }
    // May remove eye button if this was the last note
    updateSubNotesAlwaysBtn(taskId);
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
    span.textContent = sub.text;
    span.focus();
    // Attach plain-text paste directly here — attachPlainPasteHandlers() runs
    // before dblclick makes this element contenteditable, so it never catches it.
    span.addEventListener('paste', plainTextPaste, { once: false });
    const range = document.createRange(); range.selectNodeContents(span);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    const commit = () => {
        span.removeEventListener('paste', plainTextPaste);
        span.contentEditable = 'false';
        const nw = span.textContent.trim();
        if (nw && nw !== sub.text) { pushUndo(); sub.text = nw; saveState(); }
        span.textContent = sub.text;
    };
    span.addEventListener('blur', commit, { once: true });
    span.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
        if (e.key === 'Escape') {
            span.removeEventListener('paste', plainTextPaste);
            span.textContent = sub.text;
            span.contentEditable = 'false';
            span.removeEventListener('blur', commit);
        }
    });
}

function _openNoteWrap(wrap) {
    if (!wrap) return;
    // Guard: don't restart animation if already open/opening
    if (wrap._noteOpen) return;
    wrap._noteOpen = true;
    wrap.style.maxHeight    = '0';
    wrap.style.opacity      = '0';
    wrap.style.pointerEvents = 'none';
    // Force reflow so the browser registers start values before animating
    void wrap.offsetHeight;
    wrap.style.maxHeight    = '160px';
    wrap.style.opacity      = '1';
    wrap.style.pointerEvents = 'auto';
}
function _closeNoteWrap(wrap) {
    if (!wrap) return;
    wrap._noteOpen = false;
    // Transition directly from the current computed value (even if mid-animation) to 0.
    // The old pattern of setting maxHeight = scrollHeight first caused a visible snap:
    // if the open animation was still running at e.g. 120px, the intermediate
    // scrollHeight assignment (say 60px) jumped the element to 60px before animating
    // to 0 — the browser saw two distinct layout changes instead of one smooth one.
    // With no intermediate assignment the CSS transition always starts from whatever
    // the browser currently has computed, giving a perfectly smooth close.
    wrap.style.maxHeight    = '0';
    wrap.style.opacity      = '0';
    wrap.style.pointerEvents = 'none';
}

function toggleSubNote(taskId, subId) {
    const wrap = document.getElementById(`subnote-${taskId}-${subId}`);
    if (!wrap) return;
    const noteEl  = wrap.querySelector('.sub-note-text');
    const toggleBtn = document.querySelector(
        `.subtask-item[data-tid="${taskId}"][data-sid="${subId}"] .btn-sub-note-toggle`
    );

    if (wrap.classList.contains('has-note')) {
        // Existing note — .showing controls visibility via inline style
        const isVisible = wrap.style.opacity === '1' ||
                          parseFloat(getComputedStyle(wrap).opacity) > 0.5;
        if (isVisible && !wrap._dismissed) {
            // Close it
            wrap._dismissed = true;
            _closeNoteWrap(wrap);
            if (noteEl) { noteEl.contentEditable = 'false'; }
            if (toggleBtn) toggleBtn.title = 'Редактировать заметку';
        } else {
            // Open it for editing
            wrap._dismissed = false;
            _openNoteWrap(wrap);
            if (noteEl) { noteEl.contentEditable = 'true'; noteEl.focus(); }
            if (toggleBtn) toggleBtn.title = 'Скрыть заметку';
        }
    } else {
        // No note yet — creation flow
        const isOpen = wrap.classList.contains('open');
        if (isOpen) {
            // Close: first animate via inline styles, THEN remove class after transition
            // Removing .open before _closeNoteWrap caused CSS .open{max-height:160px} to
            // race with inline style setting → 2-frame jump.
            _closeNoteWrap(wrap);
            if (noteEl) { noteEl.contentEditable = 'false'; }
            if (toggleBtn) toggleBtn.title = 'Добавить заметку';
            // Remove class after transition completes so it doesn't fight inline styles
            const dur = 220; // matches CSS transition: max-height 0.22s
            setTimeout(() => wrap.classList.remove('open'), dur);
        } else {
            wrap.classList.add('open');
            _openNoteWrap(wrap);
            if (noteEl) { noteEl.contentEditable = 'true'; noteEl.focus(); }
            if (toggleBtn) toggleBtn.title = 'Отменить добавление заметки';
        }
    }
}

function saveSubNote(taskId, subId, text) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const sub = task.subtasks.find(s => s.id === subId);
    if (!sub) return;
    sub.note = text;

    // Update the note-toggle button indicator
    const noteToggleBtn = document.querySelector(
        `.subtask-item[data-tid="${taskId}"][data-sid="${subId}"] .btn-sub-note-toggle`
    );
    if (noteToggleBtn) {
        noteToggleBtn.classList.toggle('has-note', !!text);
        noteToggleBtn.title = text ? 'Редактировать заметку' : 'Добавить заметку';
    }

    const wrap = document.getElementById(`subnote-${taskId}-${subId}`);
    if (wrap) {
        // wasEmpty: note didn't exist before this save — first-time creation path.
        // If the note already existed, we must NOT touch .showing/.dismissed because
        // toggleSubNote may have just set .dismissed to close the note, and this blur
        // handler fires synchronously after contentEditable='false' — overwriting it
        // would reopen the note and break the toggle.
        const wasEmpty = !wrap.classList.contains('has-note');

        if (text) {
            wrap.classList.add('has-note');
            wrap.classList.remove('open');
            if (wasEmpty) {
                // Fresh note: stay visible (cursor still on item)
                wrap._dismissed = false;
                _openNoteWrap(wrap);
            }
            // If note already existed: do NOT touch inline styles — toggleSubNote owns them

            // Inject delete button if missing
            if (!wrap.querySelector('.btn-sub-note-delete')) {
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'btn-sub-note-delete';
                delBtn.title = 'Удалить заметку';
                delBtn.innerHTML = IC.scrollX;
                delBtn.addEventListener('click', e => deleteSubNote(e, taskId, subId));
                wrap.appendChild(delBtn);
            }
        } else {
            // Note cleared: collapse wrapper fully
            wrap.classList.remove('has-note', 'open');
            wrap._dismissed = false;
            _closeNoteWrap(wrap);
            const existingDelBtn = wrap.querySelector('.btn-sub-note-delete');
            if (existingDelBtn) existingDelBtn.remove();
        }
    }

    saveState();
    // Keep the eye button (always-show-notes) in sync with note presence
    updateSubNotesAlwaysBtn(taskId);
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
        filter: '.sub-check, .sub-prio-btn, .sub-actions, .btn-sub-action, [contenteditable="true"], .sub-note-wrapper',
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

// ---- Inline edit note ----
function startNoteInlineEdit(event, id) {
    event.stopPropagation();
    const task    = state.tasks.find(t => t.id === id);
    if (!task) return;
    const wrapper = document.getElementById('note-wrapper-' + id);
    const noteEl  = document.getElementById('note-' + id);
    if (!noteEl || !wrapper || !wrapper.classList.contains('visible')) return;
    noteEl.contentEditable = 'true';
    noteEl.classList.add('editing');
    noteEl.focus();
    const range = document.createRange(); range.selectNodeContents(noteEl);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    const commit = () => {
        noteEl.contentEditable = 'false'; noteEl.classList.remove('editing');
        const nw = noteEl.textContent.trim();
        if (nw !== task.note) { pushUndo(); task.note = nw; saveState(); }
        render();
    };
    noteEl.addEventListener('blur', commit, { once: true });
    noteEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); noteEl.blur(); }
        if (e.key === 'Escape') {
            noteEl.textContent = task.note || '';
            noteEl.contentEditable = 'false'; noteEl.classList.remove('editing');
            noteEl.removeEventListener('blur', commit);
        }
    });
}

// ============================================================
//  NOTES
// ============================================================
function toggleNote(event, id) {
    event.stopPropagation();
    const task    = state.tasks.find(t => t.id === id);
    const wrapper = document.getElementById('note-wrapper-' + id);
    const btn     = event.currentTarget;
    if (!wrapper || !task) return;
    task.noteOpen = !task.noteOpen;
    wrapper.classList.toggle('visible', task.noteOpen);
    btn.classList.toggle('open', task.noteOpen);
    saveState(); // persist open state
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

function deleteNote(event, id) {
    event.stopPropagation();
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    pushUndo(); task.note = ''; task.noteOpen = false;
    saveState(); render();
    showToast('Заметка удалена');
}

// ============================================================
//  INLINE NOTE ADD  (opens input inside task, no modal)
// ============================================================

// Flag set by pointerdown on the toggle button — tells the blur handler
// that the blur was caused by clicking the same toggle, so we should close
// rather than commit-then-reopen.
let _inlineNoteClosingId = null;

function toggleInlineNoteAdd(event, id) {
    event.stopPropagation();
    const wrap = document.getElementById(`inline-note-add-${id}`);
    const btn  = event.currentTarget;
    if (!wrap) { openNoteModal(id); return; }

    // If pointerdown already triggered a force-close (blur → cancelInlineNote),
    // the field is already shut — consuming the flag prevents re-open on click.
    if (_inlineNoteClosingId === id) {
        _inlineNoteClosingId = null;
        return;
    }

    const isOpen = wrap.classList.contains('open');
    if (isOpen) {
        wrap.classList.remove('open');
        btn && btn.classList.remove('open');
        const inp = document.getElementById(`inline-note-input-${id}`);
        if (inp) {
            inp.removeEventListener('paste', plainTextPaste); // I-19: remove on close
            inp.value = '';
        }
    } else {
        wrap.classList.add('open');
        btn && btn.classList.add('open');
        const inp = document.getElementById(`inline-note-input-${id}`);
        if (inp) {
            inp.removeEventListener('paste', plainTextPaste); // guard against duplicates
            inp.addEventListener('paste', plainTextPaste);
            inp.focus();
        }
    }
}


function handleInlineNoteKey(event, id) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); commitInlineNote(id); }
    if (event.key === 'Escape') { cancelInlineNote(id); }
}

function commitInlineNote(id) {
    // If blur was triggered by clicking the same toggle button (pointerdown set the flag),
    // just close the field — DON'T clear the flag here; toggleInlineNoteAdd consumes it.
    if (_inlineNoteClosingId === id) { cancelInlineNote(id); return; }
    const task = state.tasks.find(t => t.id === id);
    const inp  = document.getElementById(`inline-note-input-${id}`);
    if (!task || !inp) return;
    const val = inp.value.trim();
    if (!val) { cancelInlineNote(id); return; }
    pushUndo();
    task.note = val;
    task.noteOpen = true;
    saveState(); render();
    showToast('Заметка сохранена');
}

function cancelInlineNote(id) {
    const wrap = document.getElementById(`inline-note-add-${id}`);
    if (!wrap) return;
    wrap.classList.remove('open');
    const btn = document.getElementById(`note-add-toggle-${id}`);
    if (btn) btn.classList.remove('open');
    const inp = document.getElementById(`inline-note-input-${id}`);
    if (inp) {
        inp.removeEventListener('paste', plainTextPaste); // I-19: clean up
        inp.value = '';
    }
}

// ============================================================
//  AUTO-CLOSE OPEN SUB-NOTE WRAPPERS ON OUTSIDE CLICK  (P10)
//  When user clicks anywhere outside an open sub-note-wrapper,
//  close it — mirrors how main-task note fields behave.
// ============================================================
//  AUTO-CLOSE OPEN SUB-NOTE WRAPPERS ON OUTSIDE CLICK
//  Only .open wrappers (empty-note creation flow) are handled here.
//  .has-note wrappers are managed by mouseover/mouseout delegation in initSubSortable.
// ============================================================
document.addEventListener('pointerdown', e => {
    document.querySelectorAll('.sub-note-wrapper.open').forEach(wrap => {
        if (!wrap.contains(e.target)) {
            const wrapId = wrap.id;
            const parts  = wrapId.split('-');
            const taskId = parts[1];
            const subId  = parts[2];
            const toggleBtn = document.querySelector(
                `.subtask-item[data-tid="${taskId}"][data-sid="${subId}"] .btn-sub-note-toggle`
            );
            if (toggleBtn && toggleBtn.contains(e.target)) return;
            // Animate first, THEN remove class — same pattern as toggleSubNote close
            _closeNoteWrap(wrap);
            const noteEl = wrap.querySelector('.sub-note-text');
            if (noteEl) { noteEl.contentEditable = 'false'; }
            if (toggleBtn) toggleBtn.title = 'Добавить заметку';
            setTimeout(() => wrap.classList.remove('open'), 220);
        }
    });
}, { passive: true });

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
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
    // ─────────────────────────────────────────────────────────────

    const li = document.querySelector(`.task-item[data-id="${id}"]`);
    if (li) {
        // Use removing-forever (vertical collapse) — semantically distinct from archive slide
        li.classList.add('removing-forever');
        li.addEventListener('animationend', () => {
            render(); // DOM cleanup only — state already updated above
        }, { once: true });
    } else {
        render();
    }
    showToast('Задача удалена навсегда');
}

// ============================================================
//  PRIORITY MODAL
// ============================================================
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
    pushUndo(); task.priority = btn.dataset.prio;
    saveState(); render(); closePrioModal();
    showToast('Приоритет изменён');
});

// ─── Task color modal ────────────────────────────────────────────────────────
function openTaskColorModal(id) {
    editingTaskId = id;
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    // FIX-1: block color editing when a priority is assigned
    if (task.priority && task.priority !== 'none') return;
    // Highlight current colour in picker
    document.querySelectorAll('#task-color-picker .color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color === (task.color || ''))
    );
    openModalWithFocus('task-color-modal');
}

function closeTaskColorModal(event) {
    if (!event || event.target === document.getElementById('task-color-modal')) {
        closeModalWithAnim('task-color-modal', () => { editingTaskId = null; });
        if (!event) editingTaskId = null;
    }
}

document.getElementById('task-color-picker').addEventListener('click', e => {
    const sw = e.target.closest('.color-swatch');
    if (!sw) return;
    const task = state.tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    pushUndo();
    task.color = sw.dataset.color || null; // empty string → null = no color
    saveState(); render(); closeTaskColorModal();
    showToast(task.color ? 'Метка установлена' : 'Метка снята');
});

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
            selectedFormColor = sw.dataset.color || null;
            formColorPicker.querySelectorAll('.form-color-swatch').forEach(s =>
                s.classList.toggle('active', s === sw)
            );
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
//  GROUPS
// ============================================================
function showAddGroupModal() {
    groupNameInput.value = '';
    selectedColor = '#6C8EF5';
    colorPicker.querySelectorAll('.color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color === selectedColor)
    );
    openModalWithFocus('group-modal');
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
    state.groups.push({ id: newId, name, color: selectedColor });
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

    // ── Chip entry ripple: animate the newly created chip ─────────
    if (!prefersReducedMotion()) {
        requestAnimationFrame(() => {
            const newChip = document.querySelector(
                `#group-inline-sel .grp-chip[data-gid="${newId}"]`
            );
            if (newChip) {
                newChip.classList.add('entering');
                newChip.addEventListener('animationend',
                    () => newChip.classList.remove('entering'),
                    { once: true }
                );
            }
        });
    }
    // ─────────────────────────────────────────────────────────────
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

    // Cancel any in-flight transitionend handler before starting a new animation.
    if (body._collapseHandler) {
        body.removeEventListener('transitionend', body._collapseHandler);
        body._collapseHandler = null;
    }

    if (isCurrentlyCollapsed) {
        // ── Expand ──────────────────────────────────────────────────────────
        section.classList.remove('collapsed');           // ← source of truth first
        body.classList.add('expanded');
        body.classList.remove('unlocked');
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.opacity   = '1';

        const _onOpen = (e) => {
            if (e.propertyName !== 'max-height') return;
            body.removeEventListener('transitionend', _onOpen);
            body._collapseHandler = null;
            body.classList.add('unlocked');
            body.style.maxHeight = '';
        };
        body._collapseHandler = _onOpen;
        body.addEventListener('transitionend', _onOpen);
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

        const _onClose = (e) => {
            if (e.propertyName !== 'max-height') return;
            body.removeEventListener('transitionend', _onClose);
            body._collapseHandler = null;
            body.classList.remove('expanded');
            body.style.maxHeight = '';
        };
        body._collapseHandler = _onClose;
        body.addEventListener('transitionend', _onClose);
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

colorPicker.addEventListener('click', e => {
    const s = e.target.closest('.color-swatch');
    if (!s) return;
    selectedColor = s.dataset.color;
    colorPicker.querySelectorAll('.color-swatch').forEach(sw => sw.classList.toggle('active', sw === s));
});

groupNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddGroup(); });

// group selector is now handled by chip buttons (selectGroupChip)

// ============================================================
//  DEADLINE MODAL
// ============================================================
function openDeadlineModal(taskId) {
    editingTaskId = taskId;
    const existing = taskId !== null
        ? (state.tasks.find(t => t.id === taskId) || {}).deadline
        : formDeadline;

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
    if (taskId !== null) {
        const taskForRepeat = state.tasks.find(t => t.id === taskId);
        if (taskForRepeat) updateRepeatAvailability(taskForRepeat.deadline?.mode || null);
    } else {
        updateRepeatAvailability(existing?.mode || null);
    }

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
        closeModalWithAnim('deadline-modal');
    }
}

function setDeadlineMode(mode, withFocus) {
    dlCurrentMode = mode;
    document.querySelectorAll('.dl-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    document.querySelectorAll('.dl-input-wrap').forEach(w => w.classList.remove('active'));
    const wrap = document.getElementById('dl-wrap-' + mode);
    if (wrap) wrap.classList.add('active');
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
    if (!mode || mode === 'time') {
        // No deadline or time-only deadline — all repeat options available
        repeatBtns.forEach(b => { b.disabled = false; });
        if (mode === 'time') setFormRepeat('none');
    } else if (mode === 'weektime') {
        // Day + time → only weekly makes sense
        repeatBtns.forEach(b => {
            b.disabled = (b.dataset.repeat !== 'none' && b.dataset.repeat !== 'weekly');
        });
        if (selectedRepeat !== 'none' && selectedRepeat !== 'weekly') setFormRepeat('none');
    } else {
        // monthday / month / year / date → no recurring repeat makes sense
        repeatBtns.forEach(b => { b.disabled = b.dataset.repeat !== 'none'; });
        setFormRepeat('none');
    }
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

function confirmDeadline() {
    const mode = dlCurrentMode;
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
        if (dl) localStorage.setItem(K_DL_MODE, mode);
        // I-9: save before applyDeadline() resets editingTaskId to null
        const targetId = editingTaskId;
        applyDeadline(dl);
        closeModalWithAnim('deadline-modal');
        if (targetId === null) updateRepeatAvailability(dl ? dl.mode : null);
        if (dl && dl.mode === 'weektime' && targetId !== null) {
            const task = state.tasks.find(t => t.id === targetId);
            if (task && task.repeat === 'none') { task.repeat = 'weekly'; saveState(); }
        }
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
    // Persist the chosen mode so next open pre-selects it
    if (dl) localStorage.setItem(K_DL_MODE, mode);
    // I-9: capture before applyDeadline() resets editingTaskId to null
    const targetId = editingTaskId;
    applyDeadline(dl);
    closeModalWithAnim('deadline-modal');
    // Update repeat availability AFTER deadline is confirmed — not on tab click
    if (targetId === null) updateRepeatAvailability(dl ? dl.mode : null);
    if (dl && dl.mode === 'weektime' && targetId !== null) {
        const task = state.tasks.find(t => t.id === targetId);
        if (task && task.repeat === 'none') { task.repeat = 'weekly'; saveState(); }
    }
}

function applyDeadline(dl) {
    if (editingTaskId !== null) {
        const task = state.tasks.find(t => t.id === editingTaskId);
        if (task) {
            pushUndo(); task.deadline = dl; saveState(); render();
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
function getDeadlineTimestamp(dl) {
    if (!dl || !dl.value) return null;
    const { mode, value } = dl;
    if (mode === 'date') {
        // Extension 7: if time is specified, use that exact moment; otherwise midnight
        if (dl.time) return new Date(value + 'T' + dl.time + ':00').getTime();
        return new Date(value + 'T00:00:00').getTime();
    }
    if (mode === 'time') {
        const [h, m] = value.split(':').map(Number);
        const d = new Date(); d.setHours(h, m, 0, 0);
        if (d <= Date.now()) d.setDate(d.getDate() + 1);
        return d.getTime();
    }
    if (mode === 'weektime') {
        const [wd, t] = value.split('|');
        if (!wd) return null;
        // Fix 1: day-only weektime — return midnight of target weekday (never rolls to +7)
        if (dl.timeSet === false) {
            const jsTarget = parseInt(wd) === 7 ? 0 : parseInt(wd);
            const jsToday  = new Date().getDay();
            const daysUntil = (jsTarget - jsToday + 7) % 7; // 0 = today
            const d = new Date(); d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + daysUntil);
            return d.getTime();
        }
        if (!t) return null;
        const [h, m] = t.split(':').map(Number);
        const now = new Date();
        const result = new Date(now); result.setHours(h, m, 0, 0);
        const jsTarget = parseInt(wd) === 7 ? 0 : parseInt(wd);
        const jsToday  = now.getDay();
        let daysUntil  = (jsTarget - jsToday + 7) % 7;
        if (daysUntil === 0 && result <= now) daysUntil = 7;
        result.setDate(result.getDate() + daysUntil);
        return result.getTime();
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

    const ts = getDeadlineTimestamp(dl);
    if (ts === null) return null;
    const diff = ts - now;

    if (mode === 'time') {
        if (diff < 0)                return 'over';
        if (diff < 1  * 3600000)    return 'critical';
        if (diff < 3  * 3600000)    return 'urgent';
        if (diff < 6  * 3600000)    return 'warn';
        return 'ok';
    }
    if (mode === 'weektime') { // timeSet === true (or migrated)
        if (diff < 0)                return 'over';
        if (diff < 2  * 3600000)    return 'critical';
        if (diff < 8  * 3600000)    return 'urgent';
        if (diff < 24 * 3600000)    return 'warn';
        return 'ok';
    }

    // Fix 2: date and monthday — use calendar days, not raw milliseconds.
    if (mode === 'date') {
        // Extension 7: if time is specified, compare precisely at that moment
        if (dl.time) {
            const diff = ts - Date.now();
            if (diff < 0)           return 'over';
            if (diff < 3600000)     return 'critical';  // < 1h
            if (diff < 86400000)    return 'urgent';    // < 1 day
            if (diff < 259200000)   return 'warn';      // < 3 days
            return 'ok';
        }
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

function updateDeadlineBadges() {
    // Fast-exit: no tasks with deadlines at all
    const tasksWithDl = state.tasks.filter(t => t.deadline);
    if (!tasksWithDl.length) return;

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

        // ── Done zones: fully disabled — no drag initiation, no drops accepted.
        document.querySelectorAll('.split-done-body').forEach(ul => {
            new Sortable(ul, {
                group:    { name: 'done_locked', pull: false, put: false },
                disabled: true,
                sort:     false,
                animation: 0,
            });
        });

        // Init all subtask sortables
        state.tasks.forEach(task => {
            if (task.subtasks && task.subtasks.length) initSubSortable(task.id);
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
    applyPriorityInheritance(taskId, evt.to);
    saveState();
    updateGroupCounts();

    // Cross-group drop in schedule or split mode: the task may have landed in a
    // bare group-body (no zone UL existed yet). A full render() re-builds the
    // zone structure (С дедлайном / Без дедлайна) correctly for both groups.
    if (groupChanged && (isScheduleMode || isGroupSplitMode)) {
        render();
    }
}

function onDragEnd(evt) {
    const taskId = parseInt(evt.item.dataset.id);
    reorderList(evt.from);
    if (evt.from !== evt.to) reorderList(evt.to);
    applyPriorityInheritance(taskId, evt.to);
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
    const visible = document.querySelectorAll(
        '#list-container > .task-item, .group-body > .task-item, ' +
        '.sched-zone-ul > .task-item, .split-active-body > .task-item').length;
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
        doneHdr.innerHTML = `<svg viewBox="0 0 14 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3.5L10 3.5L13 6L13 16Q7 18.5 1 16L1 6Z" opacity="0.6"/><line x1="7" y1="7" x2="7" y2="13" stroke-width="1.1" opacity="0.55"/><line x1="4.5" y1="9.5" x2="9.5" y2="9.5" stroke-width="1.1" opacity="0.55"/></svg><span>Выполненные · ${done.length}</span><svg class="split-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="17"/><path d="M9 5L12 2L15 5"/><line x1="10" y1="14" x2="14" y2="14"/><path d="M11 17L10 20H14L13 17"/><circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none"/></svg>`;
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
            const visible = document.querySelectorAll(
                '#list-container > .task-item, .group-body > .task-item, ' +
                '.sched-zone-ul > .task-item, .split-active-body > .task-item').length;
            announce(`Найдено ${visible} задач`);
        }
    }, 120);
});

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

function _syncFormColorPickerState() {
    const hasPrio = selectedPriority && selectedPriority !== 'none';
    const picker  = document.getElementById('form-color-picker');
    if (!picker) return;
    picker.classList.toggle('color-picker-prio-disabled', hasPrio);
    picker.querySelectorAll('.form-color-swatch').forEach(sw => {
        sw.disabled = hasPrio;
        sw.tabIndex = hasPrio ? -1 : 0;
    });
    if (hasPrio) {
        // Clear any previously selected colour
        selectedFormColor = null;
        picker.querySelectorAll('.form-color-swatch').forEach(s =>
            s.classList.toggle('active', s.dataset.color === ''));
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
        // After transition ends, switch to 'none' so content can grow freely
        extraFields.addEventListener('transitionend', () => {
            if (expandOpen) extraFields.style.maxHeight = 'none';
        }, { once: true });
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
        selectedFormColor = null;
        _syncFormColorPickerState(); // FIX-1: re-enable color picker on collapse
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
    const visibleTasks = isFiltered
        ? state.tasks.filter(t => !t.checked && !t.cycleChecked)
        : state.tasks;
    const noVisible = query
        ? !visibleTasks.some(t =>
            t.text.toLowerCase().includes(query) ||
            (t.note && t.note.toLowerCase().includes(query)) ||
            (t.subtasks && t.subtasks.some(s => s.text.toLowerCase().includes(query)))
          )
        : visibleTasks.length === 0;

    const wasHidden = !_emptyWasVisible;
    _emptyWasVisible = noVisible;

    emptyState.style.display = noVisible ? 'flex' : 'none';
    if (noVisible) {
        emptyState.style.flexDirection = 'column';
        emptyState.style.alignItems = 'center';

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
    allDone.style.display = 'none';
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
//  TOAST
// ============================================================
let toastTimer  = null;
let toastHideTimer = null;

function showToast(msg) {
    // Cancel any in-flight hide
    clearTimeout(toastTimer);
    clearTimeout(toastHideTimer);
    toast.classList.remove('show', 'hide');

    // Force reflow so removing classes takes effect before re-adding
    void toast.offsetWidth;

    toast.textContent = msg;
    toast.classList.add('show');

    // Mirror to screen-reader live region so assistive tech hears every toast
    announce(msg);

    // After display time, trigger vanish animation then clean up
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        toastHideTimer = setTimeout(() => toast.classList.remove('hide'), 280);
    }, 2400);
}

function shakeInput() {
    const row = document.getElementById('input-row');
    row.classList.add('shake');
    row.addEventListener('animationend', () => row.classList.remove('shake'), { once: true });
}

// ============================================================
//  HASHTAGS & SEARCH HIGHLIGHT
// ============================================================
function highlightHashtags(html) {
    return html.replace(/#([\wа-яёА-ЯЁ]+)/gu, '<span class="hashtag" onclick="filterByTag(\'#$1\')">#$1</span>');
}

/** Extract all #tag strings from a text string. Returns lowercase array. */
function extractTags(text) {
    const matches = text.match(/#([\wа-яёА-ЯЁ]+)/gu) || [];
    return [...new Set(matches.map(t => t.toLowerCase()))];
}

/**
 * Render tag cloud under the search bar.
 * Shows up to 12 most-used tags across all tasks.
 * Active tag (matches current searchQuery) is highlighted.
 */
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
                        title="${count} задач"
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
    const visible = document.querySelectorAll(
        '#list-container > .task-item, .group-body > .task-item, ' +
        '.sched-zone-ul > .task-item, .split-active-body > .task-item').length;
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
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
//  EXPORT / IMPORT  (audit G-5)
// ============================================================

/** Export full state as a timestamped JSON file. */
function exportData() {
    const filename = `dusk-backup-${new Date().toISOString().slice(0,10)}.json`;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`Экспортировано: ${filename}`);
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
    saveState(); render();
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
    showToast(`Архивировано: ${count}`);
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
    state.tasks = state.tasks.filter(t => !selectedTaskIds.has(t.id));
    selectedTaskIds.clear();
    mainSelectMode = false;
    const mainBtn = document.getElementById('btn-main-select');
    const bar     = document.getElementById('main-select-bar');
    if (mainBtn) mainBtn.classList.remove('active');
    if (bar) bar.style.display = 'none';
    saveState(); render();
    showToast(`Удалено: ${count}`);
}
let _focusedTaskId = null;
let _focusedByKeyboard = false; // UX-2: true only when task was selected via J/K, not just hovered

/** Return visible tasks in DOM render order — covers all render modes. */
function getVisibleTaskIds() {
    // Covers: normal list, grouped, schedule zones, split view
    return Array.from(
        document.querySelectorAll(
            '#list-container > .task-item[data-id], ' +
            '.group-body > .task-item[data-id], ' +
            '.sched-zone-ul > .task-item[data-id], ' +
            '.split-active-body > .task-item[data-id]'
        )
    ).map(el => parseInt(el.dataset.id));
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
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); undo(); return; }

    if (e.key === 'Escape') {
        closeModalWithAnim('deadline-modal');
        closeModalWithAnim('rename-group-modal');
        closeModalWithAnim('repeat-modal');
        closeModalWithAnim('task-color-modal');
        closeGroupModal(); closeNoteModal(); closePrioModal(); closeTaskColorModal();
        _focusedTaskId = null;
        document.querySelectorAll('.task-item.kb-focused')
            .forEach(el => el.classList.remove('kb-focused'));
        return;
    }

    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
                    document.activeElement?.contentEditable === 'true';

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

// ============================================================
//  EVENT LISTENERS
// ============================================================
function setupEventListeners() {
    inputBox.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
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
// showShortcutsHint() shim kept to avoid errors from any future callers.
function showShortcutsHint() { /* no-op — hint is now toggled via btn-shortcuts-toggle */ }

let _shortcutsHintOpen = false;

function toggleShortcutsHint() {
    const hint = document.getElementById('shortcuts-hint');
    const btn  = document.getElementById('btn-shortcuts-toggle');
    if (!hint) return;
    _shortcutsHintOpen = !_shortcutsHintOpen;
    if (_shortcutsHintOpen) {
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
    }

    function openPicker() {
        if (isOpen) return;
        isOpen = true;
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

    // Close on outside click (including modal overlay clicks)
    document.addEventListener('click', e => {
        if (isOpen && !picker.contains(e.target)) closePicker();
    });

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

    // Close on outside click
    document.addEventListener('click', e => {
        if (isOpen && !picker.contains(e.target)) closePicker();
    });

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
    document.addEventListener('click', e => {
        if (!picker.contains(e.target)) closePicker();
    }, { passive: true });
}


init();
