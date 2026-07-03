// TS ambient view of this module's 2a globalThis slots (runtime inits below);
// `declare` emits nothing — the single storage slot stays globalThis.*.
declare var _dragHandleObserver: any;
declare var state: any;
declare var isFiltered: any;
declare var searchQuery: any;
declare var soundEnabled: any;
declare var penSoundEnabled: any;
declare var penVolume: any;
declare var _penAC: any;
declare var _penBuf: any;
declare var _penLoading: any;
declare var _penVoices: any;
declare var _penLastL: any;
declare var expandOpen: any;
declare var currentPage: any;
declare var currentNoteId: any;
declare var notesSearchQuery: any;
declare var _grimVisibleIds: any;
declare var grimMode: any;
declare var grimFocus: any;
declare var grimNoteCollapsed: any;
declare var grimBarMode: any;
declare var grimTocOpen: any;
declare var _grimTocHeads: any;
declare var _grimTocSpyRAF: any;
declare var _grimVerT: any;
declare var _grimHistId: any;
declare var _grimHistSel: any;
declare var grimVersions: any;
declare var _grimSaveT: any;
declare var _grimSwapT: any;
declare var grimSelectMode: any;
declare var grimSelectedIds: any;
declare var _grimFindRanges: any;
declare var _grimFindIdx: any;
declare var _grimFindActive: any;
declare var undoStack: any;
declare var redoStack: any;
declare var deadlineTimer: any;
declare var selectedColor: any;
declare var selectedPriority: any;
declare var selectedFormColor: any;
declare var selectedRepeat: any;
declare var formDeadline: any;
declare var editingTaskId: any;
declare var editingSubId: any;
declare var colorFilter: any;
declare var noteColorFilter: any;
declare var focusGroupId: any;
declare var archiveSearchQuery: any;
declare var renamingGroupId: any;
declare var dlCurrentMode: any;
declare var _dlAutoRepeat: any;
declare var pendingGroupForSelector: any;
declare var isScheduleMode: any;
declare var isGroupSplitMode: any;
declare var isTodayMode: any;
declare var sortableMain: any;
declare var _setupRaf: any;
declare var _lastTs: any;
declare var _recSig: any;

// ── ES-module bridge (migration 2a), part 1: HOISTED functions ──────────────
// Classic scripts hoisted these into the shared global scope before any code
// ran; publish them first so load-time cross-module calls keep working.
Object.assign(globalThis, {
    coffinSVG, cycleCoffinSVG, subCoffinSVG, hexToRgb, prefersReducedMotion, _positionOneHandle, positionDragHandles, setupDragHandleObserver,
    _resetDragHandle, applyListStagger, init, playLoadAnimations, saveState, loadBackups, persistBackups, maybeBackup,
    loadState, _migrateV3toV4, migrateTasks, uid, nowTs, _contentSig, _trackedRecords, primeRecSig,
    bumpUpdatedAt, addTombstone, _delegate, normalizeState, migrateFromOld, loadUiState, saveUiState, pushUndo,
    pushUndoSnapshot, undo, redo,
});

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

globalThis._dragHandleObserver = null;

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
        document.querySelectorAll<HTMLElement>(
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
globalThis.state = {
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
globalThis.isFiltered = false;
globalThis.searchQuery = '';
globalThis.soundEnabled = false;

// п.17 «Звук пера»: writing sound from a real quill recording (assets/quill-sound.mp3).
// Default OFF. Grains baked into one compact file; offsets below (built offline).
const K_PEN_SOUND  = 'dusk_pen_sound';
// D-3: PEN_ASSET (data:audio/mpeg base64, ~155 КБ) вынесен в pen-asset.js (грузится <script>-ом до app.js, кладётся в window.PEN_ASSET). _penLoad() декодирует его in-memory через atob — оффлайн-safe.
globalThis.penSoundEnabled = false;
const K_PEN_VOL = 'dusk_pen_vol';
globalThis.penVolume = 1;// master 0..1, scales pen+hand together
globalThis._penAC = null; globalThis._penBuf = null; globalThis._penLoading = null; globalThis._penVoices = 0; globalThis._penLastL = -1;
const PEN_GRAINS = {"letters":[{"s":0,"d":0.146},{"s":0.146,"d":0.156},{"s":0.302,"d":0.186},{"s":0.488,"d":0.136},{"s":0.624,"d":0.136},{"s":0.76,"d":0.136},{"s":0.896,"d":0.191},{"s":1.087,"d":0.171},{"s":1.258,"d":0.141},{"s":1.399,"d":0.131},{"s":1.53,"d":0.171},{"s":1.701,"d":0.181},{"s":1.882,"d":0.136},{"s":2.018,"d":0.206},{"s":2.224,"d":0.161},{"s":2.385,"d":0.186},{"s":2.571,"d":0.176},{"s":2.747,"d":0.201},{"s":2.948,"d":0.151},{"s":3.099,"d":0.216},{"s":3.315,"d":0.216},{"s":3.531,"d":0.176},{"s":3.707,"d":0.186},{"s":3.893,"d":0.146},{"s":4.039,"d":0.146},{"s":4.185,"d":0.171},{"s":4.356,"d":0.201},{"s":4.557,"d":0.171},{"s":4.728,"d":0.151},{"s":4.879,"d":0.141},{"s":5.02,"d":0.171},{"s":5.191,"d":0.191},{"s":5.382,"d":0.131},{"s":5.513,"d":0.141},{"s":5.654,"d":0.146},{"s":5.8,"d":0.136},{"s":5.936,"d":0.156},{"s":6.092,"d":0.196},{"s":6.288,"d":0.201},{"s":6.489,"d":0.181},{"s":6.67,"d":0.131},{"s":6.801,"d":0.146},{"s":6.947,"d":0.166},{"s":7.113,"d":0.151},{"s":7.264,"d":0.176},{"s":7.44,"d":0.171},{"s":7.611,"d":0.156},{"s":7.767,"d":0.166},{"s":7.933,"d":0.151},{"s":8.084,"d":0.146},{"s":8.23,"d":0.131}],"hand":{"s":8.361,"d":0.5}};
globalThis.expandOpen = false;
globalThis.currentPage = 'main';
globalThis.currentNoteId = null;// п11: open grimoire note id (uuid) or null
globalThis.notesSearchQuery = '';// п11: grimoire search filter
globalThis._grimVisibleIds = [];// NA-9: ids of notes currently shown (order for J/K nav)
globalThis.grimMode = 'active';// п11: 'active' (Записи) | 'archive' (Склеп)
globalThis.grimFocus = 0;// п11: focus level 0=both · 1=list rail · 2=list hidden (note full)
globalThis.grimNoteCollapsed = false;// п11: transient — open note's pane folded away, full-width list (click open entry to toggle)
globalThis.grimBarMode = 'auto';// п11: toolbar reveal — 'auto'(hover) | 'open'(pinned) | 'closed'(hidden)
globalThis.grimTocOpen = false;// п.14: table-of-contents rail shown (only takes effect on notes with ≥3 headings)
globalThis._grimTocHeads = null;// п.14: live H1-3 elements backing the TOC items
globalThis._grimTocSpyRAF = 0;// п.14: rAF throttle for the scroll-spy
globalThis._grimVerT = 0;// п.15: debounced idle timer → auto version snapshot
globalThis._grimHistId = null;// п.15: note id whose Летопись modal is open (or null)
globalThis._grimHistSel = null;// п.15: index (into the rendered list) of the previewed version
// п.15: version history lives in its OWN localStorage key, NOT inside `state`.
// Keeping full HTML body copies out of `state` is critical for perf — `state` is
// re-stringified (and ring-backed-up) on every keystroke-save, so bloating it with
// history would make typing lag. Versions are saved only when they actually change.
const K_NOTE_VERSIONS = 'dusk_note_versions_v1';
globalThis.grimVersions = {};// { [noteId]: [{at, t, b, kind}] }
globalThis._grimSaveT = null;// п11: debounced note-save timer
globalThis._grimSwapT = null;// п11: note→note crossfade timer (fade old page out, then render new)
globalThis.grimSelectMode = false;// п11/1b: multi-select notes in the current segment
globalThis.grimSelectedIds = new Set();// п11/1b: ids of notes ticked in select mode
globalThis._grimFindRanges = [];// п11/A: in-note find — match Ranges in the open body
globalThis._grimFindIdx = 0;// п11/A: current match index
globalThis._grimFindActive = false;// п11/A: find bar shown + highlights painted
globalThis.undoStack = [];
globalThis.redoStack = [];// P-A: populated by undo(), cleared by any new pushUndo()
globalThis.deadlineTimer = null;
globalThis.selectedColor = '#6C8EF5';// group color picker
globalThis.selectedPriority = 'none';
globalThis.selectedFormColor = null;// task creation color (null = no color label)
globalThis.selectedRepeat = 'none';
globalThis.formDeadline = null;
globalThis.editingTaskId = null;
globalThis.editingSubId = null;// for subtask repeat modal

// Feature: color filter
globalThis.colorFilter = null;// null | CSS color string — filter tasks by label color
globalThis.noteColorFilter = null;// NA-10: null | CSS color string — filter grimoire records by colour

// Feature: focus mode — show only one group at a time
globalThis.focusGroupId = null;// null | number

// Feature: archive search
globalThis.archiveSearchQuery = '';

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
globalThis.renamingGroupId = null;
globalThis.dlCurrentMode = 'time';// default — updated from localStorage on init
globalThis._dlAutoRepeat = false;// auto-repeat toggle — default OFF in every mode; an existing recurring deadline re-opens reflecting its own state

// ── Deadline mode persistence key
const K_DL_MODE = 'dusk_lastDlMode';
globalThis.pendingGroupForSelector = false;
// Schedule sort mode
globalThis.isScheduleMode = false;// global
const scheduleModeGroups = new Set(); // per-group overrides (groupId numbers)
// P7: Split groups mode — shows active/done as two collapsible zones inside each group
globalThis.isGroupSplitMode = false;
// P-B: "Today" view — show only tasks due today or overdue, ordered by deadline.
globalThis.isTodayMode = false;

// ---- DOM REFS ----
const inputBox        = document.getElementById('input-box') as HTMLInputElement;
const listContainer   = document.getElementById('list-container');
const groupsContainer = document.getElementById('groups-container');
const progressBar     = document.getElementById('progress-bar');
const progressSection = document.getElementById('progress-section');
const doneCount       = document.getElementById('done-count');
const quantityCount   = document.getElementById('quantity-count');
const toolbarEl       = document.getElementById('toolbar');   // 'toolbar' clashes with lib.dom window.toolbar (BarProp); bridged under the old name
const groupsBar       = document.getElementById('groups-bar');
const emptyState      = document.getElementById('empty-state');
const allDone         = document.getElementById('all-done');
const toast           = document.getElementById('toast');
const groupModal      = document.getElementById('group-modal');
const groupNameInput  = document.getElementById('group-name-input');
const groupsList      = document.getElementById('groups-list');
const taskGroupSelect = document.getElementById('task-group-select') as HTMLSelectElement;
const taskNote        = document.getElementById('task-note') as HTMLInputElement;
const btnExpand       = document.getElementById('btn-expand');
const extraFields     = document.getElementById('extra-fields');
const searchBox       = document.getElementById('search-box') as HTMLInputElement;
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
globalThis.sortableMain = null;
const sortableGroups: Record<string, any> = {};
const sortableSubs: Record<string, any>   = {};
const sortableZones: Record<string, any>  = {}; // keyed inner uls for schedule+split combined mode
globalThis._setupRaf = null;// FIX: track pending rAF so we cancel stale queued inits

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
    // 7c split A1: onDragEnd/onDragAdd живут в dusk/07-dnd; этот файл (core)
    // грузится раньше, поэтому ссылаемся лениво (вызов в момент drag, когда
    // 07 уже загружен). Хендлеры используют только evt, не this → обёртка безопасна.
    onEnd: (...a: any[]) => (onDragEnd as any)(...a),
    onAdd: (...a: any[]) => (onDragAdd as any)(...a),
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
    // Sync Phase 3: notify the sync layer (debounced push). Guarded — undefined until
    // 11-sync-ui.js loads, and a no-op until sync is enabled + ready (never blocks a save).
    try { if (typeof _afterSaveState === 'function') _afterSaveState(); } catch (_) {}
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
            if (!s.uid)                  s.uid = uid();   // Idea 8: subtasks get a uid (sync identity)
            if (!s.updatedAt)            s.updatedAt = t.updatedAt || nowTs();   // sync (Phase 1): subtasks now carry their own updatedAt to tiebreak a same-subtask clash
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
// Sync (Phase 1): MONOTONIC — never returns a value <= the last one it issued. A device
// clock that jumps backwards, or two stamps inside the same millisecond, can no longer make
// a newer edit look older than an older one (that would make the 3-way merge drop a real
// edit). updatedAt/createdAt/deletedAt stay plain numbers (comparable with `<`). In-memory
// monotonic is enough for Phase 1 — full HLC (Hybrid Logical Clock) is deferred as a drop-in.
globalThis._lastTs = 0;
function nowTs() {
    _lastTs = Math.max(Date.now(), _lastTs + 1);
    return _lastTs;
}

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
globalThis._recSig = new Map();
function _contentSig(rec) {
    const { updatedAt, createdAt, ...rest } = rec;   // identity-neutral content only
    // Sync (Phase 1): subtasks are now their own merge records (each carries its own
    // updatedAt). Strip nested subtask timestamps from the PARENT signature so a subtask's
    // clock bump can't trigger a spurious parent bump — a subtask CONTENT change still
    // mutates this signature (its text/priority/etc. live in `rest`), so "edit a subtask →
    // bump the parent task too" still holds.
    if (Array.isArray(rest.subtasks)) {
        rest.subtasks = rest.subtasks.map(s => {
            const { updatedAt, createdAt, ...srest } = s;
            return srest;
        });
    }
    return JSON.stringify(rest);
}
function _trackedRecords() {
    const out = [];
    // Tasks + their subtasks (subtasks gained their own uid+updatedAt in Phase 1, so the
    // content-diff auto-bump maintains them too — one missed manual touch() = a stale stamp
    // = a future merge dropping a real edit, which the auto-diff prevents).
    if (Array.isArray(state.tasks))   for (const t of state.tasks)   { out.push(t); if (Array.isArray(t.subtasks)) for (const s of t.subtasks) out.push(s); }
    if (Array.isArray(state.archive)) for (const t of state.archive) { out.push(t); if (Array.isArray(t.subtasks)) for (const s of t.subtasks) out.push(s); }
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
        if (r.updatedAt == null) r.updatedAt = now;   // sync (Phase 1): a fresh record (e.g. a just-added subtask) must always carry a stamp
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
function addTombstone(recUid, type, parentUid?) {
    if (!recUid) return;
    if (!Array.isArray(state.tombstones)) state.tombstones = [];
    state.tombstones.push({ uid: recUid, type, parentUid: parentUid || null, deletedAt: nowTs() });
}

// ── 7c: event delegation (slice 1 — task rows) ──────────────────────────────
// Handlers were historically baked into innerHTML as inline `onclick="fn(${id})"`.
// That forces every handler to be a global and interpolates ids straight into an
// attribute string (an XSS-class surface). 7c migrates these to `data-act` + one
// set of document-level delegated listeners. Migration is INCREMENTAL and
// additive: un-migrated inline handlers keep working alongside, so it lands one
// subsystem at a time. An adapter reads its args from the element / its
// `.task-item` ancestor (the task id already lives on that `data-id` — no
// per-button duplication). currentTarget-dependent handlers (float-menu anchors)
// get a thin synthetic event so the original functions stay untouched.
const ACT       = {};   // click
const ACT_DBL   = {};   // dblclick
const ACT_INPUT = {};   // input
const ACT_BLUR  = {};   // focusout  (blur doesn't bubble; focusout does)
const ACT_KEY   = {};   // keydown
const ACT_OVER  = {};   // mouseover (hover affordances, e.g. quick-add typeahead)
const ACT_OUT   = {};   // mouseout  (hover-leave, paired with ACT_OVER)
const ACT_PASTE = {};   // paste     (Grimoire body plain-text paste)
const ACT_CHANGE = {};  // change    (file <input>, number commit-on-change)
const _tid   = el => { const li = el && el.closest('.task-item'); return li ? +li.dataset.id : null; };
const _sTid  = el => { const it = el && el.closest('.subtask-item'); return it ? +it.dataset.tid : null; };
const _sSid  = el => { const it = el && el.closest('.subtask-item'); return it ? +it.dataset.sid : null; };
const _synEv = (el, e) => ({ currentTarget: el, target: e.target, stopPropagation() {}, preventDefault() { e.preventDefault(); } });
function _delegate(map, attr, e) {
    const t = e.target;
    if (!t || typeof t.closest !== 'function') return;   // target can be document/window (e.g. keydown with no focus)
    const el = t.closest('[' + attr + ']');
    if (!el) return;
    const fn = map[el.dataset[attr.slice(5)]];   // 'data-act' → dataset.act, 'data-actdbl' → dataset.actdbl, …
    if (!fn) return;
    if (el.dataset.stop !== undefined) e.stopPropagation();
    fn(el, e);
}
document.addEventListener('click',     e => _delegate(ACT,       'data-act',      e));
document.addEventListener('dblclick',  e => _delegate(ACT_DBL,   'data-actdbl',   e));
document.addEventListener('input',     e => _delegate(ACT_INPUT, 'data-actinput', e));
document.addEventListener('focusout',  e => _delegate(ACT_BLUR,  'data-actblur',  e));
document.addEventListener('keydown',   e => _delegate(ACT_KEY,   'data-actkey',   e));
document.addEventListener('mouseover', e => _delegate(ACT_OVER,  'data-actover',  e));
document.addEventListener('mouseout',  e => _delegate(ACT_OUT,   'data-actout',   e));
document.addEventListener('paste',     e => _delegate(ACT_PASTE, 'data-actpaste', e));
document.addEventListener('change',    e => _delegate(ACT_CHANGE, 'data-actchange', e));
document.addEventListener('mousedown', e => { const t = e.target as any; if (t && typeof t.closest === 'function' && t.closest('[data-pd]')) e.preventDefault(); });  // focus-steal guard
Object.assign(ACT, {
    toggleCheck:              el     => toggleCheck(_tid(el)),
    togglePin:                el     => togglePin(_tid(el)),
    openTaskColorModal:       el     => openTaskColorModal(_tid(el)),
    openDeadlineModal:        el     => openDeadlineModal(_tid(el)),
    clearTaskDeadline:        el     => clearTaskDeadline(_tid(el)),
    openSnoozeMenu:           (el, e) => openSnoozeMenu(_synEv(el, e), _tid(el)),
    openRepeatModal:          el     => openRepeatModal(_tid(el)),
    clearTaskRepeat:          el     => clearTaskRepeat(_tid(el)),
    openPrioModal:            el     => openPrioModal(_tid(el)),
    openTaskMoreMenu:         (el, e) => openTaskMoreMenu(_synEv(el, e), _tid(el)),
    removeTask:               el     => removeTask(_tid(el)),
    deleteTaskForever:        el     => deleteTaskForever(_tid(el)),
    toggleTaskNote:           el     => toggleTaskNote(_tid(el)),
    toggleSubtasksSection:    el     => toggleSubtasksSection(_tid(el)),
    toggleSubNotesAlwaysOpen: el     => toggleSubNotesAlwaysOpen(_tid(el)),
    openNoteModal:            el     => openNoteModal(_tid(el)),
    openEditNoteModal:        el     => openEditNoteModal(_tid(el)),
    _taskNoteDelete:          (el, e) => _taskNoteDelete(e, _tid(el)),
});
Object.assign(ACT_DBL, {
    startInlineEdit: (el, e) => startInlineEdit(_synEv(el, e), _tid(el)),
    _taskNoteEdit:   el      => _taskNoteEdit(el),
});
Object.assign(ACT_INPUT, { _taskNoteInput:  el => _taskNoteInput(el) });
Object.assign(ACT_BLUR,  { _taskNoteCommit: el => _taskNoteCommit(el) });
Object.assign(ACT_KEY, {
    _taskNoteKeydown: (el, e) => _taskNoteKeydown(e, el),
    // keyboard activation for role="button" pills: Enter/Space triggers the click action
    kactivate:        (el, e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const f = ACT[el.dataset.act]; if (f) f(el, e); } },
});

// 7c slice-2 — subtasks (item actions, split headers, subtask notes). taskId + subId
// both live on the .subtask-item ancestor (data-tid / data-sid). startSubEdit reads
// event.target as the editable span → feed it the delegated element directly.
Object.assign(ACT, {
    toggleSubtask:        el => toggleSubtask(_sTid(el), _sSid(el)),
    cycleSubPriority:     el => cycleSubPriority(_sTid(el), _sSid(el)),
    toggleSubNote:        el => toggleSubNote(_sTid(el), _sSid(el)),
    promoteSubtask:       el => promoteSubtask(_sTid(el), _sSid(el)),
    deleteSubtask:        el => deleteSubtask(_sTid(el), _sSid(el)),
    openSubRepeatModal:   el => openSubRepeatModal(_sTid(el), _sSid(el)),
    openSubDeadlineModal: el => openSubDeadlineModal(_sTid(el), _sSid(el)),
    clearSubDeadline:     el => clearSubDeadline(_sTid(el), _sSid(el)),
    toggleSubSplitActive: el => toggleSubSplitActive(el, el.dataset.splitkey),
    toggleSubSplitDone:   el => toggleSubSplitDone(el, el.dataset.splitkey),
    _noteDeleteClick:     (el, e) => _noteDeleteClick(e, el.parentElement.querySelector('.sub-note-text')),
});
Object.assign(ACT_DBL, {
    startSubEdit: (el, e) => startSubEdit({ stopPropagation() {}, target: el }, _sTid(el), _sSid(el)),
    _noteEdit:    el => _noteEdit(el),
});
Object.assign(ACT_INPUT, { _noteInput:  el => _noteInput(el) });
Object.assign(ACT_BLUR,  { _noteCommit: el => _noteCommit(el) });
Object.assign(ACT_KEY,   { _noteKeydown: (el, e) => _noteKeydown(e, el) });

// 7c slice-3a — group header cluster. The group id lives on the .group-section
// ancestor (data-group-id). The whole .group-header toggles collapse; the action
// buttons sit nearer, so closest('[data-act]') resolves to the button (not the
// header) — no stopPropagation needed. The drag handle + actions container carry
// data-act="noop" so a click on their padding/gaps is ABSORBED (faithful to the
// old per-container stopPropagation) instead of bubbling to the header toggle.
// The sort picker button stays inline: it self-stops propagation, so it never
// reaches the delegated header toggle.
const _gid = el => { const s = el && el.closest('.group-section'); return s ? +s.dataset.groupId : null; };
Object.assign(ACT, {
    noop:                () => {},
    toggleGroupCollapse: el => toggleGroupCollapse(_gid(el)),
    toggleScheduleMode:  el => toggleScheduleMode(_gid(el)),
    toggleFocusGroup:    el => toggleFocusGroup(_gid(el)),
    duplicateGroup:      el => duplicateGroup(_gid(el)),
    openRenameGroupModal: el => openRenameGroupModal(_gid(el)),
    deleteGroup:         el => deleteGroup(_gid(el)),
});

// 7c slice-3b — sort picker (toolbar + per-group) & colour filter. The sort list
// is PORTALED to <body> while open, so the option can't rely on a .group-section
// ancestor — it carries its own data-gid (absent → global toolbar sort). The sort
// trigger keeps its real stopPropagation (mirrors the inline behaviour). Colour
// swatches carry the colour in data-color (the clear button reuses the active one).
Object.assign(ACT, {
    toggleSortPicker: (el, e) => toggleSortPicker({ currentTarget: el, stopPropagation: () => e.stopPropagation() }),
    sortOpt:          el => { const k = el.dataset.k; if (el.dataset.gid !== undefined) setGroupSort(+el.dataset.gid, k); else setTaskSort(k); },
    setColorFilter:   el => setColorFilter(el.dataset.color),
});

// 7c slice-3c — body-level float menus (snooze, task «…», sub-check mode, demote,
// export). These are appended to <body> so they have no row ancestor — every
// variable (task id, target id, mode, drop-flag) rides on the button's own data-*
// attributes. The triggers (openSnoozeMenu/openTaskMoreMenu already delegated in
// slice 1; openSubAnyModeMenu/openExportMenu/openDemoteMenu stay inline until the
// index.html slice) build these menus, so only the menu items move here.
Object.assign(ACT, {
    snoozeDeadline:    el => snoozeDeadline(+el.dataset.id, el.dataset.snz),
    _snoozeUnitPick:   el => _snoozeUnitPick(el),
    _snoozeCustomApply: el => _snoozeCustomApply(+el.dataset.id),
    _taskMore:         el => _taskMore(el.dataset.more, +el.dataset.id),
    setTaskSubMode:    el => setTaskSubMode(+el.dataset.id, el.dataset.mode),
    setGlobalSubMode:  el => setGlobalSubMode(el.dataset.mode),
    _pickDemoteTarget: el => _pickDemoteTarget(+el.dataset.id, +el.dataset.target),
    demoteTask:        el => demoteTask(+el.dataset.id, +el.dataset.target, el.dataset.drop === '1'),
    exportData:        el => { closeFloatMenu(); exportData(el.dataset.exp); },
});
Object.assign(ACT_KEY, {
    snoozeCustomKey: (el, e) => { if (e.key === 'Enter') { e.preventDefault(); _snoozeCustomApply(+el.dataset.id); } },
});

// 7c slice-3d — list widgets: archive rows, templates, backups, tag chips/hashtags,
// quick-add typeahead. Archive rows ARE .task-item[data-id] → reuse _tid. The rest
// carry their key on the button (template/backup id, tag string, qa index).
Object.assign(ACT, {
    restoreTask:           el => restoreTask(_tid(el)),
    deleteFromArchive:     el => deleteFromArchive(_tid(el)),
    createTaskFromTemplate: el => createTaskFromTemplate(+el.dataset.id),
    deleteTemplate:        el => deleteTemplate(+el.dataset.id),
    restoreBackup:         el => restoreBackup(+el.dataset.ts),
    filterByTag:           el => filterByTag(el.dataset.tag),
    _qaAccept:             el => _qaAccept(+el.dataset.idx),
});
Object.assign(ACT_OVER, { _qaHover: el => _qaHover(+el.dataset.idx) });

// 7c slice-3e — form subtasks (task create/edit modal) + the per-task add-subtask
// row. Form rows are <li.subtask-item data-form-sub-idx> (index into the transient
// formSubtasks list — no real sub id), so a dedicated _fsi reads that index. The
// add-subtask input/button live inside the task row → reuse _tid. Note handlers
// (_noteEdit/_noteInput/_noteKeydown/_noteCommit/_noteDeleteClick) and kactivate are
// shared with the real subtask slice — only the form-specific actions are added here.
const _fsi = el => { const it = el && el.closest('.subtask-item'); return it && it.dataset.formSubIdx !== undefined ? +it.dataset.formSubIdx : null; };
Object.assign(ACT, {
    addSubtask:            el => addSubtask(_tid(el)),
    openFormSubDeadline:   el => openFormSubDeadline(_fsi(el)),
    clearFormSubDeadline:  el => clearFormSubDeadline(_fsi(el)),
    cycleFormSubPriority:  el => cycleFormSubPriority(_fsi(el)),
    openFormSubRepeat:     el => openFormSubRepeat(_fsi(el)),
    toggleFormSubNote:     el => toggleFormSubNote(_fsi(el)),
    removeFormSubtask:     el => removeFormSubtask(_fsi(el)),
});
Object.assign(ACT_DBL, {
    startFormSubEdit: (el) => startFormSubEdit({ stopPropagation() {}, target: el }, _fsi(el)),
});
Object.assign(ACT_KEY, {
    subAddKey: (el, e) => handleSubAdd(e, _tid(el)),
});

// 7c slice-3f — group widgets that live OUTSIDE a .group-section: the bulk-action
// group picker and the form's group-chip dropdown. Their group id rides on the
// button's own data-gid/data-chip (so deleteGroupById is a distinct adapter from
// the header's _gid-based deleteGroup). The bulk-bar delete keeps its colour-hover
// as a data-driven over/out pair instead of inline this.style mutation.
Object.assign(ACT, {
    bulkSetGroup:    el => bulkSetGroup('gid' in el.dataset ? +el.dataset.gid : null),
    deleteGroupById: el => deleteGroup(+el.dataset.gid),
    selectGroupChip: el => selectGroupChip(el.dataset.chip),
});
Object.assign(ACT_OVER, { hoverBg: el => { el.style.background = el.dataset.bghov; } });
Object.assign(ACT_OUT,  { outBg:   el => { el.style.background = el.dataset.bg; } });

// 7c slice-3g — Grimoire editor (header rail, title/body editors, action footer,
// crypt restore/destroy) + the format toolbar. There is one open note at a time, so
// these are singletons: the note id (a string) rides on each footer button's
// data-nid; the header/editor handlers take no id. The toolbar collapses to one
// adapter — every fmt button carries its command in data-cmd and dispatches through
// _GRIM_FMT (table/callout anchor their popover off the button via _synEv).
const _GRIM_FMT = {
    bold:      () => grimFmt('bold'),
    italic:    () => grimFmt('italic'),
    underline: () => grimFmt('underline'),
    strike:    () => grimFmt('strike'),
    ul:        () => grimFmt('ul'),
    ol:        () => grimFmt('ol'),
    quote:     () => grimFmt('quote'),
    hr:        () => grimFmt('hr'),
    task:      () => grimChecklist(),
    code:      () => grimInlineCode(),
    codeblock: () => grimCodeBlock(),
    link:      () => grimLink(),
    h1:        () => grimHeading(1),
    h2:        () => grimHeading(2),
    h3:        () => grimHeading(3),
    table:     (el, e) => grimTableMenu(_synEv(el, e)),
    callout:   (el, e) => grimCalloutMenu(_synEv(el, e)),
    export:    () => grimExportNote(),
};
Object.assign(ACT, {
    grimBack:          () => grimBack(),
    grimToggleFocus:   () => grimToggleFocus(),
    grimToggleToc:     () => grimToggleToc(),
    grimToggleBar:     () => grimToggleBar(),
    grimBodyClick:     (el, e) => grimBodyClick(e),
    grimTogglePin:     el => grimTogglePin(el.dataset.nid),
    openGrimColorModal: el => openGrimColorModal(el.dataset.nid),
    grimSaveAsTpl:     el => grimSaveAsTpl(el.dataset.nid),
    grimOpenHistory:   el => grimOpenHistory(el.dataset.nid),
    grimArchive:       el => grimArchive(el.dataset.nid),
    grimDelete:        el => grimDelete(el.dataset.nid),
    grimRestoreNote:   el => grimRestoreNote(el.dataset.nid),
    grimDeleteForever: el => grimDeleteForever(el.dataset.nid),
    grimFmtBtn:        (el, e) => { const f = _GRIM_FMT[el.dataset.cmd]; if (f) f(el, e); },
});
Object.assign(ACT_INPUT, {
    grimTitleInput: el => grimTitleInput(el),
    grimBodyInput:  el => grimBodyInput(el),
});
Object.assign(ACT_BLUR,  { grimCommit: (el, e) => grimCommit(e) });
Object.assign(ACT_KEY, {
    grimTitleKey: (el, e) => grimTitleKey(e),
    grimBodyKey:  (el, e) => grimBodyKey(e),
});
Object.assign(ACT_PASTE, { plainTextPaste: (el, e) => plainTextPaste(e) });

// 7c slice-3h — Grimoire list, crypt, and the body-portaled menus (history modal,
// sort picker, colour filter, find bar, template + IO popovers). Note ids are
// strings: the leaf reuses its own data-id; the rest carry their key on the button
// (history timestamp, sort key, colour, crypt-month key, template id, export scope).
// The sort trigger keeps its real stopPropagation through the event (its outside-close
// is a dynamically-added listener, not a _gothicPicker). grimSetColorFilter rebuilds
// its popover on pick → e.target detaches → the shared _gothicPickers contains-check
// then closes it: that MATCHES the old inline (no stopPropagation), so a plain adapter
// is faithful. grimDeleteTpl is the opposite — it had event.stopPropagation to KEEP
// its popover open across deletes; with document-level delegation only
// stopImmediatePropagation prevents the _gothicPickers sibling listener from closing it.
Object.assign(ACT, {
    grimNew:              () => grimNew(),
    grimOpen:             el => grimOpen(el.dataset.id),
    grimToggleSelectNote: el => grimToggleSelectNote(el.dataset.id),
    grimToggleCryptMonth: el => grimToggleCryptMonth(el.dataset.key, el),
    grimSetSort:          el => grimSetSort(el.dataset.k),
    grimToggleSortMenu:   (el, e) => grimToggleSortMenu(e),
    grimSetColorFilter:   el => grimSetColorFilter(el.dataset.color),
    grimHistSelect:       el => grimHistSelect(+el.dataset.at),
    grimHistRestore:      el => grimHistRestore(+el.dataset.at),
    grimCloseHistory:     () => grimCloseHistory(),
    grimFindPrev:         () => grimFindPrev(),
    grimFindNext:         () => grimFindNext(),
    grimFindClose:        () => grimFindClose(),
    grimUseBuiltin:       el => grimUseBuiltin(el.dataset.key),
    grimUseTpl:           el => grimUseTpl(el.dataset.id),
    grimDeleteTpl:        (el, e) => { e.stopImmediatePropagation(); grimDeleteTpl(el.dataset.id, e); },
    grimImportFiles:      () => grimImportFiles(),
    grimExportFullBackup: el => grimExportFullBackup(el.dataset.scope),
    grimExportBackup:     el => grimExportBackup(el.dataset.scope),
    grimExportReading:    el => grimExportReading(el.dataset.scope),
});
Object.assign(ACT_KEY, { grimSortTriggerKey: (el, e) => grimSortTriggerKey(e) });

// 7c slice-4 — index.html static handlers (migrated in small clusters). 4a: the
// page-nav tabs (page in data-page). 4b: no-arg main-toolbar toggles.
Object.assign(ACT, {
    switchPage:               el => switchPage(el.dataset.page),
    toggleTodayMode:          () => toggleTodayMode(),
    toggleGroupSplitMode:     () => toggleGroupSplitMode(),
    toggleCollapseAllGroups:  () => toggleCollapseAllGroups(),
    toggleFilter:             () => toggleFilter(),
    openColorFilterModal:     () => openColorFilterModal(),
    toggleMainSelectMode:     () => toggleMainSelectMode(),
    // 4c: more no-arg main-page actions (header + toolbar + empty state).
    addTask:                  () => addTask(),
    toggleExpand:             () => toggleExpand(),
    clearMainSearch:          () => clearMainSearch(),
    archiveAll:               () => archiveAll(),
    openBackupModal:          () => openBackupModal(),
    triggerImport:            () => triggerImport(),
    showAddGroupModal:        () => showAddGroupModal(),
    openTemplatesModal:       () => openTemplatesModal(),
    focusNewTaskInput:        () => focusNewTaskInput(),
});

// 7c slice-4d — task create/edit form modal (static markup in index.html). All
// singletons (one form), so no id plumbing. openFormDeadline is distinct from the
// row-level openDeadlineModal (that one reads _tid; the form opens with null). The
// clear-deadline ✕ sits INSIDE the deadline trigger button — its own data-act wins
// via closest() (nearest), so the trigger's open doesn't also fire (replaces the
// old inline stopPropagation). The monthday stepper folds both ±buttons into one
// adapter (delta in data-delta), clamped to 1..31, mirroring the old inline math.
Object.assign(ACT, {
    openFormColorModal:  () => openFormColorModal(),
    openFormDeadline:    () => openDeadlineModal(null),
    clearFormDeadline:   (el, e) => clearFormDeadline(e),
    formMonthdayStep:    el => {
        const i = document.getElementById('form-repeat-anchor-monthday') as HTMLInputElement;
        if (!i) return;
        i.value = String(Math.max(1, Math.min(31, (parseInt(i.value) || 1) + (+el.dataset.delta))));
        globalThis.formRepeatAnchorMonthday = parseInt(i.value) || null;
    },
    addFormSubtask:      () => addFormSubtask(),
    toggleFormPin:       () => toggleFormPin(),
    saveFormAsTemplate:  () => saveFormAsTemplate(),
});
Object.assign(ACT_CHANGE, {
    formMonthdayInput: el => { globalThis.formRepeatAnchorMonthday = parseInt(el.value) || null; },
});
Object.assign(ACT_KEY, { formSubAddKey: (el, e) => handleFormSubAdd(e) });

// 7c slice-4e — main toolbar leftovers + the main-list bulk-select bar. The sort
// trigger / schedule toggle reuse the already-registered slice-3b/3a adapters
// (toggleSortPicker, toggleScheduleMode — _gid is null off any group → global).
// openSubAnyModeMenu / openExportMenu are body float-menus anchored on currentTarget
// → the slice-1 _synEv pattern (no-op stopPropagation is fine; float menus add their
// outside-close on a later tick). bulkSetPriority carries the level in data-prio.
Object.assign(ACT, {
    requestNotificationPermission: () => requestNotificationPermission(),
    openSubAnyModeMenu:  (el, e) => openSubAnyModeMenu(_synEv(el, e)),
    openExportMenu:      (el, e) => openExportMenu(_synEv(el, e)),
    clearAll:            () => clearAll(),
    bulkSetPriority:     el => bulkSetPriority(el.dataset.prio),
    openBulkGroupModal:  () => openBulkGroupModal(),
    openBulkColorModal:  () => openBulkColorModal(),
    openBulkDeadlineModal: () => openBulkDeadlineModal(),
    bulkArchive:         () => bulkArchive(),
    bulkDelete:          () => bulkDelete(),
});
Object.assign(ACT_CHANGE, { importData: (el, e) => importData(e) });

// 7c slice-4f — archive page (search clear, restore/select/clear, restore-selected).
// All no-arg singletons; the search box commits its query + re-renders on input.
Object.assign(ACT, {
    clearArchiveSearch: () => clearArchiveSearch(),
    restoreAll:         () => restoreAll(),
    toggleSelectMode:   () => toggleSelectMode(),
    clearArchive:       () => clearArchive(),
    restoreSelected:    () => restoreSelected(),
});
Object.assign(ACT_INPUT, {
    archiveSearchInput: el => { archiveSearchQuery = el.value.trim(); renderArchive(); },
});

// 7c slice-4g — Grimoire toolbar (static markup): segment tabs, select toggle, the
// IO / template / colour-filter popover triggers, empty-crypt, and the grim select
// bar. Each popover TRIGGER lives INSIDE its registered _gothicPicker container
// (#grim-io-split / #grim-new-split / #grim-io-sel), so the shared contains-check
// keeps it open with no stopPropagation needed; grim-cfilter manages its own
// outside-close listener (like grimToggleSortMenu). grimEmptyCrypt arms on its own
// button element (two-step danger), so it takes the element. grimNew is already in
// slice-3h. Segment mode rides in data-mode.
Object.assign(ACT, {
    grimSetMode:          el => grimSetMode(el.dataset.mode),
    grimToggleSelectMode: () => grimToggleSelectMode(),
    grimToggleIoMenu:     (el, e) => grimToggleIoMenu(e),
    grimEmptyCrypt:       el => grimEmptyCrypt(el),
    grimToggleTplMenu:    (el, e) => grimToggleTplMenu(e),
    grimClearSearch:      () => grimClearSearch(),
    grimToggleColorFilter:(el, e) => grimToggleColorFilter(e),
    grimBulkArchive:      () => grimBulkArchive(),
    grimBulkRestore:      () => grimBulkRestore(),
    openGrimBulkColorModal: () => openGrimBulkColorModal(),
    grimToggleIoSelMenu:  (el, e) => grimToggleIoSelMenu(e),
    grimBulkDelete:       () => grimBulkDelete(),
});
Object.assign(ACT_INPUT, { grimSearchInput: el => grimSearch(el.value) });

// 7c slice-4h — all remaining static modal controls (group / rename / link /
// deadline / prio / task-colour / repeat / note / templates / backups / bulk-group)
// plus the floating sound + shortcuts buttons. Every overlay backdrop close is the
// pre-existing delegated U-1 handler; these are the in-modal cancel/confirm/clear/
// danger buttons. The deadline duration steppers fold into one adapter (unit in
// data-unit, signed step in data-delta); both number fields clamp on input. The two
// RGB hue sliders (group + task-colour) share one input adapter. commitColorClear
// is the "Без цвета" button (empty string → clears the label).
Object.assign(ACT, {
    closeGroupModal:        () => closeGroupModal(),
    confirmAddGroup:        () => confirmAddGroup(),
    closeRenameGroupModal:  () => closeRenameGroupModal(),
    confirmRenameGroup:     () => confirmRenameGroup(),
    grimLinkRemove:         () => grimLinkRemove(),
    grimLinkClose:          () => grimLinkClose(),
    grimLinkConfirm:        () => grimLinkConfirm(),
    toggleDlAutoRepeat:     () => toggleDlAutoRepeat(),
    stepDlDuration:         el => _stepDlDuration(el.dataset.unit, +el.dataset.delta),
    closeDeadlineModal:     () => closeDeadlineModal(),
    clearDeadlineModal:     () => clearDeadlineModal(),
    confirmDeadline:        () => confirmDeadline(),
    closePrioModal:         () => closePrioModal(),
    grgbApply:              () => _grgbApply(),
    commitColorClear:       () => _commitColorChoice(''),
    closeTaskColorModal:    () => closeTaskColorModal(),
    closeRepeatModal:       () => closeRepeatModal(),
    closeNoteModal:         () => closeNoteModal(),
    confirmNote:            () => confirmNote(),
    toggleSound:            () => toggleSound(),
    toggleShortcutsHint:    () => toggleShortcutsHint(),
    closeTemplatesModal:    () => closeTemplatesModal(),
    closeBackupModal:       () => closeBackupModal(),
    closeBulkGroupModal:    () => closeBulkGroupModal(),
});
Object.assign(ACT_INPUT, {
    grgbHue:         el => _grgbHue(el.value),
    clampDlDuration: el => _clampDlDuration(el),
});

// Ensure optional collections exist after any whole-state replacement (load,
// import, undo/redo, restore) so older snapshots without them never throw.
function normalizeState() {
    if (!Array.isArray(state.notes)) state.notes = [];
    if (!Array.isArray(state.notesArchive)) state.notesArchive = [];
    if (!Array.isArray(state.noteTemplates)) state.noteTemplates = [];   // п.12: note templates
    if (!Array.isArray(state.templates)) state.templates = [];           // task templates
    if (!Array.isArray(state.tombstones)) state.tombstones = [];         // Idea 8: deletion graveyard
    if (!Array.isArray(state.syncJournal)) state.syncJournal = [];        // sync (Phase 1): quarantine journal lives INSIDE state (it is synced)
    // Idea 8: backfill uid/updatedAt on groups (tasks/subtasks are done in migrateTasks).
    const gnow = nowTs();
    (state.groups || []).forEach(g => {
        if (!g) return;
        if (!g.uid)       g.uid = uid();
        if (!g.updatedAt) g.updatedAt = gnow;
        if (!g.createdAt) g.createdAt = g.updatedAt;
    });
    // Sync (Phase 1): templates become synced records — backfill stable identity + timestamps.
    // Task templates historically carried only a device-local int `id` (meaningless across
    // devices) → give them a `uid` (sync identity) + timestamps. Note templates already carry
    // a uuid `id` (used as their sync key) but lacked timestamps. Templates are create/use/
    // delete only (never edited in place) → updatedAt == createdAt is fine; their merge is
    // effectively union + tombstone.
    (state.templates || []).forEach(t => {
        if (!t) return;
        if (!t.uid)       t.uid = uid();
        if (!t.updatedAt) t.updatedAt = gnow;
        if (!t.createdAt) t.createdAt = t.updatedAt;
    });
    (state.noteTemplates || []).forEach(t => {
        if (!t) return;
        if (!t.updatedAt) t.updatedAt = gnow;
        if (!t.createdAt) t.createdAt = t.updatedAt;
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
        const textEl = li.querySelector('.task-text') as HTMLElement;
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
    isFiltered  = localStorage.getItem(K_FILTER) === '1';
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
        globalThis._undoFormSnapshot = null;

        inputBox.value = snap.text;
        if (taskNote) taskNote.value = snap.note;

        // Priority
        selectedPriority = snap.priority || 'none';
        document.querySelectorAll<HTMLElement>('#priority-selector .prio-grid-btn').forEach(b =>
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
        globalThis.formSubtasks = snap.subtasks || [];
        renderFormSubtasks();

        // Pin flag (P5)
        globalThis.formPinned = !!snap.pinned;
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

// ── ES-module bridge (migration 2a), part 2: consts/classes ─────────────────
// (mutable top-level let/var declarations were converted to globalThis.* so
//  every module reads AND writes the same slot — no stale copies).
Object.assign(globalThis, {
    K_STATE_V3, K_STATE_V4, K_STATE, K_PREMIGRATION, K_SOUND, K_FILTER, K_PAGE, K_SEARCH,
    K_EXPAND, IC, CHECK_COL_NATURAL_H, DRAG_HANDLE_H, DRAG_HANDLE_MIN_GAP, STAGGER_MAX, STAGGER_STEP, K_PEN_SOUND,
    K_PEN_VOL, PEN_GRAINS, K_NOTE_VERSIONS, _notifiedDeadlines, _newTaskIds, _newNoteIds, K_DL_MODE, scheduleModeGroups,
    inputBox, listContainer, groupsContainer, progressBar, progressSection, doneCount, quantityCount, toolbar: toolbarEl,
    groupsBar, emptyState, allDone, toast, groupModal, groupNameInput, groupsList, taskGroupSelect,
    taskNote, btnExpand, extraFields, searchBox, btnFilter, btnSound, colorPicker, mainPage,
    archivePage, notesPage, archiveList, archiveEmpty, archiveBadge, sortableGroups, sortableSubs, sortableZones,
    SORTABLE_OPTS, K_BACKUPS, BACKUP_RING_SIZE, BACKUP_THROTTLE_MS, ACT, ACT_DBL, ACT_INPUT, ACT_BLUR,
    ACT_KEY, ACT_OVER, ACT_OUT, ACT_PASTE, ACT_CHANGE, _tid, _sTid, _sSid,
    _synEv, _gid, _fsi, _GRIM_FMT,
});
