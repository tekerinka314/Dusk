// TS ambient view of this module's 2a globalThis slots (runtime inits below);
// `declare` emits nothing — the single storage slot stays globalThis.*.
declare var _pageTransitioning: any;
declare var _grimListSortable: any;
declare var _grimGrowRAF: any;
declare var _grimLinkRange: any;
declare var _grimLinkAnchor: any;
declare var _grimEditTbl: any;
declare var _grimMenu: any;
declare var _grimTblRAF: any;
declare var _grimRO: any;
declare var _grimTitleRO: any;
declare var _grimHoverTbl: any;
declare var _grimHoverSeal: any;

// ── ES-module bridge (migration 2a), part 1: HOISTED functions ──────────────
// Classic scripts hoisted these into the shared global scope before any code
// ran; publish them first so load-time cross-module calls keep working.
Object.assign(globalThis, {
    _renderPage, _updatePageTabs, _initPage, switchPage, grimDate, _grimList, _grimCurrentNote, loadGrimVersions,
    saveGrimVersions, _grimVersionsOf, _grimMigrateVersions, _grimRestoreVersions, _grimSnapshot, _grimThinVersions, _grimVersionTick, _grimSnapshotCurrent,
    _grimScheduleVersion, _grimHistNote, _grimVerStamp, _grimAgo, grimOpenHistory, grimCloseHistory, grimHistSelect, _grimRenderHistory,
    grimHistRestore, renderNotes, _grimApplyFocus, grimToggleCollapse, grimToggleFocus, grimToggleBar, _grimApplyBarMode, grimToggleToc,
    _grimRefreshToc, _grimTocDetach, _grimTocSpyScroll, _grimTocSpy, _grimTocGo, _grimEmptyHTML, _grimSortControl, grimToggleSortMenu,
    _grimSortOutside, grimCloseSortMenu, grimSortTriggerKey, grimSetSort, renderGrimList, _grimInitListSortable, _grimPersistOrder, _grimInk,
    _grimColorVars, _grimLeafHTML, _grimCryptMonthsHTML, grimToggleCryptMonth, renderGrimDetail, _grimGrowTitle, grimSetMode, grimOpen,
    grimNew, grimBack, grimTitleKey, grimTitleInput, grimBodyInput, grimCommit, _grimSyncActiveLeaf, grimDelete,
    grimTogglePin, grimArchive, grimRestoreNote, grimDeleteForever, _disarmEmptyCrypt, grimEmptyCrypt, grimSearch, grimClearSearch,
    grimToggleColorFilter, _grimColorFilterOutside, grimCloseColorFilter, _grimBuildColorFilterPop, grimSetColorFilter, _grimFindSupported, _grimFindRun, _grimFindPaint,
    _grimFindClearPaint, _grimFindGoto, grimFindNext, grimFindPrev, grimFindClose, _grimFindBar, _grimFindShowBar, _grimFindHideBar,
    _grimFindUpdateBar, _armDanger, _grimExitSelect, grimToggleSelectMode, grimToggleSelectNote, _updateGrimSelectBar, grimBulkArchive, grimBulkRestore,
    grimBulkDelete, grimBulkColor, _grimPlain, _grimCollapse, _grimFlattenSnippet, _grimSnipGlyph, _grimSnippetHTML, _grimPlainToHtml,
    migrateNotes, _grimSanitize, _grimAfterEdit, grimFmt, _grimCurrentBlock, _grimEmphasis, _grimToggleBlock, _grimQuote,
    grimHeading, grimChecklist, _grimLineType, _grimSelectedLines, _grimPlaceMarker, _grimRestoreMarker, _grimSameListKind, _grimMergeAdjacentLists,
    _grimConvertLine, _grimSetListType, _grimInsertHr, grimInlineCode, _grimClosestPre, grimCodeBlock, _grimCodeFenceEnter, _grimPreEnter,
    _grimPreTab, grimLink, _grimRestoreLinkSel, grimLinkConfirm, grimLinkRemove, grimLinkClose, grimBodyClick, grimBodyKey,
    _grimCaretToStart, _grimExitOnEnter, _grimBackspaceCallout, _grimBackspaceOutdent, _grimSyncToolbar, grimTableMenu, grimInsertTable, _grimClosestCallout,
    grimCalloutMenu, grimCallout, _grimCellCtx, _grimObserveBody, _grimApplySealVis, _grimTctl, _grimScheduleTableUI, _grimLayoutTableUI,
    _grimReflowOverlay, _grimWireBarFollow, _grimCloseTableMenu, _grimToggleTableMenu, _grimDismissTableUI, _grimHideTableUI, grimTableAppend, _grimColInsert,
    _grimColDelete, _grimColAlign, _grimColGetAlign, _grimRowInsert, _grimRowDelete, _grimRemoveTable, _grimTableTab, _grimToolbarHTML,
    _grimDownload, _grimSlug, _grimInlineMd, _grimHtmlToMd, _grimTableToMd, _grimNoteToMd, grimExportNote, _grimDownloadBlob,
    _grimScopeNotes, _grimNoteToBackupMd, grimExportBackup, grimExportReading, grimExportFullBackup, _grimCrc32, _grimZipStore, _grimIoItem,
    _grimRenderIoMenu, _grimRenderIoSelMenu, _grimCloseIoMenu, _grimCloseIoSplit, _grimCloseIoSel, grimToggleIoMenu, grimToggleIoSelMenu, _grimMdInline,
    _grimMdTable, _grimMdToHtml, _grimSplitTitleBody, _grimUnquote, _grimFmLooks, _grimParseBackup, _grimPushNote, _grimImportDocs,
    _grimFullImport, _grimApplyFullBackup, _grimInflate, _grimUnzip, grimImportFiles, _grimSpawnSeeded, grimSaveAsTpl, grimUseBuiltin,
    grimUseTpl, grimDeleteTpl, grimToggleTplMenu, _grimCloseTplMenu, _grimRenderTplMenu,
});

// ============================================================
//  PAGE NAVIGATION
// ============================================================
globalThis._pageTransitioning = false;// IMP-8: guard against rapid double-click

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
        const bar = document.getElementById('archive-select-bar') as any;
        if (bar) bar.style.display = 'none';
        const btn = document.getElementById('btn-select-mode') as any;
        if (btn) btn.classList.remove('active');
    }
    // Also reset main-list select mode when leaving main page
    if (page !== 'main' && mainSelectMode) {
        mainSelectMode = false; selectedTaskIds.clear();
        const bar = document.getElementById('main-select-bar') as any;
        if (bar) bar.style.display = 'none';
        const btn = document.getElementById('btn-main-select') as any;
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
    (ov as any)._returnFocus = document.activeElement;
    if (!(ov as any)._trap) {
        // NA-8 (fix): the trap listens on DOCUMENT in capture, not on `ov`. The modal
        // rebuilds its innerHTML on every version preview (_grimRenderHistory), which
        // destroys the focused button → activeElement drops to <body>, OUTSIDE `ov`. A
        // listener bound to `ov` then never sees the next Tab (it no longer bubbles through
        // ov) and focus escapes to the page behind. A document-capture listener always
        // fires; when focus has left the dialog we pull it back in.
        (ov as any)._trap = (e) => {
            if (e.key !== 'Tab') return;
            const els = (Array.from(ov.querySelectorAll(FOCUSABLE)) as any[]).filter(el => el.offsetParent !== null);
            if (!els.length) return;
            const first = els[0], last = els[els.length - 1];
            if (!ov.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
            if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
            else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
        };
        document.addEventListener('keydown', (ov as any)._trap, true);
    }
    _grimRenderHistory();
    requestAnimationFrame(() => requestAnimationFrame(() => {
        ov.classList.add('open');
        const focusable = (Array.from(ov.querySelectorAll(FOCUSABLE)) as any[]);
        if (focusable.length) focusable[0].focus();
    }));
}
function grimCloseHistory() {
    const ov = document.getElementById('grim-hist-ov') as any;
    _grimHistId = null; _grimHistSel = null;
    if (!ov) return;
    if ((ov as any)._trap) { document.removeEventListener('keydown', (ov as any)._trap, true); (ov as any)._trap = null; }
    // Return focus to the control that opened the Летопись (NA-8).
    const rf = (ov as any)._returnFocus; (ov as any)._returnFocus = null;
    if (rf && typeof rf.focus === 'function') rf.focus();
    ov.classList.remove('open');
    setTimeout(() => { const o = document.getElementById('grim-hist-ov') as any; if (o && !o.classList.contains('open')) o.remove(); }, 340);
}
function grimHistSelect(at) { _grimHistSel = at; _grimRenderHistory(); }

function _grimRenderHistory() {
    const ov = document.getElementById('grim-hist-ov') as any;
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
        return `<button type="button" class="${cls}" data-act="grimHistSelect" data-at="${v.at}">
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
            : `<button type="button" class="grim-hist-restore" data-act="grimHistRestore" data-at="${sel.at}">${GIC.restore}<span>Восстановить</span></button>`;
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
        <button type="button" class="grim-hist-x" data-act="grimCloseHistory" title="Закрыть летопись" aria-label="Закрыть">${GIC.dismiss}</button>
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
    note.updatedAt = nowTs();   // sync (Phase 1): monotonic record stamp
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
    const page = document.getElementById('notes-page') as any;
    if (!page) return;
    _grimHideTableUI();   // drop any floating table picker/tools on (re)render
    const segA = document.getElementById('grim-seg-active') as any;
    const segR = document.getElementById('grim-seg-archive') as any;
    if (segA) segA.classList.toggle('active', grimMode === 'active');
    if (segR) segR.classList.toggle('active', grimMode === 'archive');
    _refreshShortcutsHint();   // keep an open hint in sync with the «Записи»/«Склеп» segment
    const segRc = document.getElementById('grim-seg-count') as any;
    if (segRc) { const n = (state.notesArchive || []).length; segRc.textContent = n || ''; segRc.style.display = n ? '' : 'none'; }
    const newSplit = document.getElementById('grim-new-split') as any;
    if (newSplit) {
        const showNew = (grimMode === 'active' && !grimSelectMode);
        newSplit.style.display = showNew ? '' : 'none';
        if (!showNew) _grimCloseTplMenu();   // never leave the templates popover open when hidden
    }
    // п.13: «Перенос» (import+export) — active mode, outside select; valid even with zero notes.
    const ioSplit = document.getElementById('grim-io-split') as any;
    if (ioSplit) {
        const showIo = (grimMode === 'active' && !grimSelectMode);
        ioSplit.style.display = showIo ? '' : 'none';
        if (!showIo) _grimCloseIoMenu();
    }
    // п.6: «Опустошить склеп» — only in the crypt, when it holds records, outside select mode.
    const emptyBtn = document.getElementById('grim-empty-crypt') as any;
    if (emptyBtn) {
        const show = grimMode === 'archive' && !grimSelectMode && (state.notesArchive || []).length;
        emptyBtn.style.display = show ? '' : 'none';
        if (!show) _disarmEmptyCrypt(emptyBtn);   // never leave it armed when it hides
    }
    // п11/1b: select toggle (only when the current segment has records) + the bulk bar.
    const hasList = !!_grimList().length;
    const selBtn = document.getElementById('grim-select-btn') as any;
    if (selBtn) { selBtn.style.display = (hasList && !grimSelectMode) ? '' : 'none'; }
    const selBar = document.getElementById('grim-select-bar') as any;
    if (selBar) selBar.style.display = grimSelectMode ? 'flex' : 'none';
    if (grimSelectMode) {
        // archive→склеп only in Записи; вернуть only in Склеп; delete in both.
        const ba = document.getElementById('grim-bulk-archive') as any;
        const br = document.getElementById('grim-bulk-restore') as any;
        if (ba) ba.style.display = grimMode === 'active'  ? '' : 'none';
        if (br) br.style.display = grimMode === 'archive' ? '' : 'none';
        _updateGrimSelectBar();
    }

    const layoutEl = document.getElementById('grim-layout') as any;
    const emptyEl = document.getElementById('grim-empty') as any;
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
    const layoutEl = document.getElementById('grim-layout') as any;
    const detailEl = document.getElementById('grim-detail') as any;
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
        if (grimMode === 'active') { const bo = document.getElementById('grim-body') as any; if (bo) bo.focus(); }
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
    const btn = document.querySelector<HTMLElement>('.grim-focus-toggle');
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
    const btn = document.querySelector<HTMLElement>('.grim-bar-toggle');
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
    const page = document.querySelector<HTMLElement>('#grim-detail .grim-page');
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
    const page = document.querySelector<HTMLElement>('#grim-detail .grim-page');
    const bo = document.querySelector<HTMLElement>('#grim-detail .grim-body');   // active OR read-only crypt body
    const panel = document.getElementById('grim-toc') as any;
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
    panel.innerHTML = `<div class="grim-toc-inner"><div class="grim-toc-scroll"><div class="grim-toc-head">${GIC.toc}<span>Оглавление</span><button type="button" class="grim-toc-close" data-act="grimToggleToc" title="Свернуть оглавление" aria-label="Свернуть оглавление">${GIC.tocClose}</button></div><nav class="grim-toc-nav">${nav}</nav></div></div>`;
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
    const panel = document.getElementById('grim-toc') as any;
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
    const panel = document.getElementById('grim-toc') as any;
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
        <button class="grim-new-btn grim-empty-btn" data-act="grimNew">${GIC.quill}<span>Начертать первую</span></button>`;
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
        `<div class="dl-month-option${s.k === cur ? ' active' : ''}" role="option" aria-selected="${s.k === cur}" data-k="${s.k}" data-act="grimSetSort">${s.label}</div>`
    ).join('');
    return `<div class="grim-sort dl-month-picker" id="grim-sort-picker">
        <button class="grim-sort-trigger" id="grim-sort-trigger" type="button" aria-haspopup="listbox" aria-expanded="false"
                title="Порядок записей" data-act="grimToggleSortMenu" data-actkey="grimSortTriggerKey">
            <span class="grim-sort-cur">${curLabel}</span>${GRIM_SORT_SWORD}
        </button>
        <div class="grim-sort-list dl-month-list" id="grim-sort-list" role="listbox" aria-hidden="true">${opts}</div>
    </div>`;
}
function grimToggleSortMenu(e) {
    if (e) e.stopPropagation();
    const p = document.getElementById('grim-sort-picker') as any;
    if (!p) return;
    const open = !p.classList.contains('open');
    p.classList.toggle('open', open);
    const tr = document.getElementById('grim-sort-trigger') as any;
    if (tr) tr.setAttribute('aria-expanded', open ? 'true' : 'false');
    const lst = document.getElementById('grim-sort-list') as any;
    if (lst) lst.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) document.addEventListener('click', _grimSortOutside);
    else document.removeEventListener('click', _grimSortOutside);
}
function _grimSortOutside(e) {
    const p = document.getElementById('grim-sort-picker') as any;
    if (p && !p.contains(e.target)) grimCloseSortMenu();
}
function grimCloseSortMenu() {
    const p = document.getElementById('grim-sort-picker') as any;
    if (p) p.classList.remove('open');
    const tr = document.getElementById('grim-sort-trigger') as any;
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
    const listEl = document.getElementById('grim-list') as any;
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
    const cfb = document.getElementById('grim-cfilter-btn') as any;
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
globalThis._grimListSortable = null;
function _grimInitListSortable() {
    if (_grimListSortable) { _grimListSortable.destroy(); _grimListSortable = null; }
    const listEl = document.getElementById('grim-list') as any;
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
        fallbackOnBody: true,
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
    const listEl = document.getElementById('grim-list') as any;
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
    const leafAct = sel ? 'grimToggleSelectNote' : 'grimOpen';   // id rides on the leaf's own data-id
    const check = sel ? `<span class="grim-leaf-check">${isSel ? IC.selectChecked : IC.selectEmpty}</span>` : '';
    // Forged iron spike driven into the corner of a pinned record (same motif as tasks).
    const spike = isPinned && !sel ? `<span class="grim-leaf-spike" aria-hidden="true">${IC.pinSpike}</span>` : '';
    // Open (non-select) entry gets a fold affordance — re-click toggles its pane (desktop).
    const isOpen = !sel && n.id === currentNoteId;
    const fold = isOpen ? `<span class="grim-leaf-fold" aria-hidden="true"><span class="gf-open">${GIC.foldOpen}</span><span class="gf-closed">${GIC.foldClosed}</span></span>` : '';
    const titleAttr = isOpen ? ' title="Клик — свернуть/развернуть запись"' : '';
    // Crypt entries restore/destroy from the read-only detail footer (clean index).
    return `<button class="${cls}"${style} data-id="${n.id}" data-act="${leafAct}"${titleAttr}>
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
            <button class="grim-crypt-month-head" data-act="grimToggleCryptMonth" data-key="${g.key}" aria-expanded="${isOpen}" title="Свернуть / развернуть месяц">
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
    const detailEl = document.getElementById('grim-detail') as any;
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

    const backBtn = `<button class="grim-back" data-act="grimBack" title="К списку">${GIC.back}</button>`;
    const focusBtn = `<button class="grim-focus-toggle${grimFocus ? ' on' : ''}" data-lvl="${grimFocus}" data-act="grimToggleFocus" aria-label="${GRIM_FOCUS_TITLE[grimFocus]}" title="${GRIM_FOCUS_TITLE[grimFocus]}">${GIC.focusLvl[grimFocus]}</button>`;
    const tocBtn = `<button class="grim-toc-toggle${grimTocOpen ? ' on' : ''}" data-act="grimToggleToc" aria-label="${GRIM_TOC_TITLE}" title="${GRIM_TOC_TITLE}">${GIC.toc}</button>`;
    const barBtn = `<button class="grim-bar-toggle${grimBarMode === 'open' ? ' on' : ''}" data-mode="${grimBarMode}" data-act="grimToggleBar" aria-label="${GRIM_BAR_TITLE[grimBarMode]}" title="${GRIM_BAR_TITLE[grimBarMode]}">${GIC.barLvl[grimBarMode]}</button>`;
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
                    <button class="grim-act" data-act="grimRestoreNote" data-nid="${note.id}" title="Вернуть в гримуар">${GIC.restore}<span>вернуть</span></button>
                    <button class="grim-act danger" data-act="grimDeleteForever" data-nid="${note.id}" title="Уничтожить навсегда">${IC.skull}<span>удалить</span></button>
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
               data-actinput="grimTitleInput" data-actblur="grimCommit" data-actkey="grimTitleKey"></textarea>
        <div class="grim-divider"><span class="grim-fleur">${GIC.dividerFleur}</span></div>
        ${_grimToolbarHTML()}
        <div class="grim-body" id="grim-body" contenteditable="true" spellcheck="false"
             data-placeholder="Начертайте запись…"
             data-actinput="grimBodyInput" data-actblur="grimCommit" data-actpaste="plainTextPaste"
             data-act="grimBodyClick" data-actkey="grimBodyKey"></div>
        <div class="grim-meta">
            <div class="grim-stamps">
                <span class="grim-stamp" title="Последняя правка">${GIC.quill}<span>правлено ${note.updatedAt ? grimDate(note.updatedAt) : '—'}</span></span>
                ${note.createdAt ? `<span class="grim-stamp is-created" title="Когда начертана">${GIC.hourglass}<span>начертано ${grimDate(note.createdAt)}</span></span>` : ''}
            </div>
            <span class="grim-acts">
                <button class="grim-act is-pin${note.pinned ? ' active' : ''}" data-act="grimTogglePin" data-nid="${note.id}" title="${note.pinned ? 'Открепить запись' : 'Закрепить наверху'}">${IC.pin}<span>${note.pinned ? 'закреплено' : 'закрепить'}</span></button>
                <button class="grim-act is-color${note.color ? ' active' : ''}" data-act="openGrimColorModal" data-nid="${note.id}" title="Цветовая метка"${colorStyle}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4L17 8.5L17 16L12 20L7 16L7 8.5Z"/></svg><span>цвет</span></button>
                <button class="grim-act" data-act="grimSaveAsTpl" data-nid="${note.id}" title="Сохранить как шаблон">${GRIM_TPL_IC.save}<span>шаблон</span></button>
                <button class="grim-act" data-act="grimOpenHistory" data-nid="${note.id}" title="Летопись — история версий записи">${GIC.chronicle}<span>летопись</span></button>
                <button class="grim-act" data-act="grimArchive" data-nid="${note.id}" title="Отправить в склеп">${GIC.coffin}<span>в склеп</span></button>
                <button class="grim-act danger" data-act="grimDelete" data-nid="${note.id}" title="Удалить навсегда">${IC.dagger}<span>удалить</span></button>
            </span>
        </div>
      </div><!-- /grim-page-main -->
      <aside class="grim-toc" id="grim-toc" contenteditable="false" aria-label="Оглавление"></aside>
    </div>`;
    // Set field contents as properties (avoids attribute-escaping pitfalls).
    const ti = document.getElementById('grim-title-in') as any;
    const bo = document.getElementById('grim-body') as any;
    if (ti) {
        ti.value = note.title || ''; _grimGrowTitle(ti);
        // Re-grow the title when its width changes (focus mode switches the list rail
        // in/out, window resize) so wrapped 2+ line titles aren't clipped.
        if ('ResizeObserver' in window) {
            if (!_grimTitleRO) _grimTitleRO = new ResizeObserver(() => { const t = document.getElementById('grim-title-in') as any; if (t) _grimGrowTitle(t); });
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
globalThis._grimGrowRAF = 0;
function _grimGrowTitle(el: any) {
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
    const sb = document.getElementById('notes-search-box') as any;
    if (sb) sb.value = '';
    // NA-10: drop the colour filter on segment switch — a colour present in Записи may
    // be absent in Склеп, which would otherwise show a confusing empty list.
    grimCloseColorFilter();
    if (noteColorFilter) { noteColorFilter = null; localStorage.removeItem('dusk_noteColorFilter'); }
    const layoutEl = document.getElementById('grim-layout') as any;
    if (layoutEl) layoutEl.classList.remove('show-detail');
    renderNotes();
}

// Open a record in the detail pane (persist pending edits of the previous one first).
// opts.fromKb (NA-9): keyboard J/K browsing — keep focus on the list leaf so the next
// J/K is received (the editor would otherwise swallow it), and scroll it into view.
function grimOpen(id, opts?) {
    const fromKb = !!(opts && opts.fromKb);
    if (id === currentNoteId) { if (!fromKb) grimToggleCollapse(); return; }   // re-click the open entry → fold/unfold its pane
    grimNoteCollapsed = false;                                    // opening a different record always expands
    clearTimeout(_grimSaveT); saveState();
    clearTimeout(_grimSwapT);

    // Render the new note's page + restore editing focus. Split out so a note→note
    // switch can defer it behind a brief fade-out of the outgoing page.
    const showNew = () => {
        renderGrimDetail();                       // new .grim-page → grimPageIn plays it in
        const layoutEl = document.getElementById('grim-layout') as any;
        if (layoutEl) {
            layoutEl.classList.add('show-detail');
            _grimApplyFocus(layoutEl);            // honour persisted focus on open
        }
        // Only a manual open drops the caret into the editor; keyboard browsing keeps
        // focus on the list (see the leaf .focus() below) so J/K stay repeatable.
        if (!fromKb && grimMode === 'active') { const bo = document.getElementById('grim-body') as any; if (bo) bo.focus(); }
    };

    const detailEl = document.getElementById('grim-detail') as any;
    const oldPage = detailEl && detailEl.querySelector('.grim-page');
    currentNoteId = id;
    renderGrimList(false);                        // instant active-highlight feedback
    if (fromKb) {
        const leaf: any = document.querySelector(`.grim-leaf[data-id="${id}"]`);
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
    const sb = document.getElementById('notes-search-box') as any;
    if (sb) sb.value = '';
    saveState();
    renderNotes();
    const layoutEl = document.getElementById('grim-layout') as any;
    if (layoutEl) layoutEl.classList.add('show-detail');
    // Focus synchronously — the title input exists right after renderNotes(),
    // so no rAF race that would swallow the first keystrokes.
    const ti = document.getElementById('grim-title-in') as any;
    if (ti) ti.focus();
}

// Mobile: return from the detail pane to the list.
function grimBack() {
    clearTimeout(_grimSaveT); saveState();
    grimFindClose();
    currentNoteId = null;
    grimNoteCollapsed = false;
    const layoutEl = document.getElementById('grim-layout') as any;
    if (layoutEl) layoutEl.classList.remove('show-detail', 'grim-note-collapsed');
    renderGrimList(false);
    renderGrimDetail();
}

// Title is one logical line — Enter jumps to the body rather than adding a newline.
function grimTitleKey(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const bo = document.getElementById('grim-body') as any;
        if (bo) bo.focus();
    }
}

// Live title edit: update model synchronously, patch the list leaf, debounce save.
function grimTitleInput(el: any) {
    const note = _grimCurrentNote();
    if (!note) return;
    _grimGrowTitle(el);                         // wrap long titles, grow to fit
    note.title = el.value;
    note.updatedAt = nowTs();   // sync (Phase 1): monotonic record stamp
    delete note.ord;                            // edited → bubble back to top on next sort
    _grimSyncActiveLeaf();                       // patch leaf in place (highlight-aware)
    clearTimeout(_grimSaveT);
    _grimSaveT = setTimeout(saveState, 400);
    _grimScheduleVersion();                      // п.15: arm idle auto-snapshot
}

// Live body edit: update model synchronously, debounce save.
function grimBodyInput(el: any) {
    const note = _grimCurrentNote();
    if (!note) return;
    note.body = _grimSanitize(el.innerHTML);   // body holds sanitized HTML
    note.updatedAt = nowTs();   // sync (Phase 1): monotonic record stamp
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
    const _main = document.querySelector<HTMLElement>('#grim-detail .grim-page-main');
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
    const pk = document.getElementById('grim-table-pop') as any; if (pk) pk.remove();
    _grimScheduleTableUI();
}

// Reflect the open note's edited title/snippet into its existing list entry without
// rebuilding the list, preserving the leaf's node identity (see grimCommit). Mirrors
// _grimLeafHTML exactly — windowed search excerpt + <mark> highlight — so an open
// note's leaf stays in sync under search instead of reverting to plain first-120 text.
function _grimSyncActiveLeaf() {
    const note = _grimCurrentNote();
    if (!note) return;
    const leaf: any = document.querySelector(`#grim-list .grim-leaf[data-id="${note.id}"]`);
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
    const btn = document.querySelector<HTMLElement>('#grim-detail .grim-act.danger');
    if (!_armDanger(btn, 'Нажмите ещё раз, чтобы удалить запись')) return;
    const idx = (state.notes || []).findIndex(n => n.id === id);
    if (idx < 0) return;
    clearTimeout(_grimSaveT);
    pushUndo();
    state.notes.splice(idx, 1);
    addTombstone(id, 'note');   // sync (Phase 1): permanent delete → tombstone (notes use `id` as their sync key) so a stale device can't resurrect it
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
    note.updatedAt = nowTs();   // sync (Phase 1): stamp the archive (location) change
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
    note.updatedAt = nowTs();   // sync (Phase 1): stamp the restore (location) change
    if (!Array.isArray(state.notes)) state.notes = [];
    state.notes.unshift(note);
    _newNoteIds.add(note.id);   // NA-5: animate the restored leaf only
    currentNoteId = null;
    grimMode = 'active';                 // auto-return to «Записи» after restoring
    notesSearchQuery = '';
    const sb = document.getElementById('notes-search-box') as any;
    if (sb) sb.value = '';
    const layoutEl = document.getElementById('grim-layout') as any;
    if (layoutEl) layoutEl.classList.remove('show-detail');
    saveState();
    renderNotes();
    showToast('Запись возвращена', { undo: true });
}

// Склеп → permanent delete (two-step confirm, undoable).
function grimDeleteForever(id) {
    const btn = document.querySelector<HTMLElement>('#grim-detail .grim-act.danger');
    if (!_armDanger(btn, 'Нажмите ещё раз — запись будет уничтожена')) return;
    const idx = (state.notesArchive || []).findIndex(n => n.id === id);
    if (idx < 0) return;
    pushUndo();
    state.notesArchive.splice(idx, 1);
    addTombstone(id, 'note');   // sync (Phase 1): permanent delete → tombstone so a stale device can't resurrect it
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
    // V2-B0-01: permanent delete must leave tombstones (notes sync by `id`) —
    // without them a stale device's copy resurrects every emptied note on the
    // next merge. Same convention as grimDeleteForever / grimBulkDelete.
    (state.notesArchive || []).forEach(x => addTombstone(x.id, 'note'));
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
    const sb = document.getElementById('notes-search-box') as any;
    if (sb) sb.value = '';
    grimSearch('');
    if (sb) sb.focus();
}

// ── NA-10: colour filter for grimoire records (crystal button + swatch popover) ──
function grimToggleColorFilter(e) {
    if (e) e.stopPropagation();
    const p = document.getElementById('grim-cfilter') as any;
    if (!p) return;
    const open = !p.classList.contains('open');
    if (open) _grimBuildColorFilterPop();
    p.classList.toggle('open', open);
    const btn = document.getElementById('grim-cfilter-btn') as any;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    const pop = document.getElementById('grim-cfilter-pop') as any;
    if (pop) pop.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) document.addEventListener('click', _grimColorFilterOutside);
    else document.removeEventListener('click', _grimColorFilterOutside);
}
function _grimColorFilterOutside(e) {
    const p = document.getElementById('grim-cfilter') as any;
    if (p && !p.contains(e.target)) grimCloseColorFilter();
}
function grimCloseColorFilter() {
    const p = document.getElementById('grim-cfilter') as any;
    if (p) p.classList.remove('open');
    const btn = document.getElementById('grim-cfilter-btn') as any;
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', _grimColorFilterOutside);
}
// Build the swatch popover from the colours actually present in the current segment.
function _grimBuildColorFilterPop() {
    const pop = document.getElementById('grim-cfilter-pop') as any;
    if (!pop) return;
    const colors = [...new Set(_grimList().filter(n => n.color).map(n => n.color))];
    if (!colors.length) {
        pop.innerHTML = '<p class="grim-cfilter-empty">Нет записей с цветом</p>';
        return;
    }
    const check = `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.8" stroke-linecap="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>`;
    const swatches = colors.map(c => `
        <button class="color-filter-swatch${noteColorFilter === c ? ' active' : ''}" style="background:${c}"
                data-act="grimSetColorFilter" data-color="${escHtml(c)}" aria-label="Цвет ${c}" title="Цвет ${c}">
            ${noteColorFilter === c ? check : ''}
        </button>`).join('');
    const clearBtn = noteColorFilter ? `
        <button class="color-filter-swatch color-filter-clear" data-act="grimSetColorFilter" data-color="${escHtml(noteColorFilter)}" title="Снять фильтр по цвету">
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
    const bo = document.getElementById('grim-body') as any;
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
            `<button class="gf-btn gf-prev" data-act="grimFindPrev" title="Предыдущее (Shift+F3)" aria-label="Предыдущее совпадение">${IC.sword}</button>` +
            `<button class="gf-btn gf-next" data-act="grimFindNext" title="Следующее (F3)" aria-label="Следующее совпадение">${IC.sword}</button>` +
            `<span class="gf-cnt" id="grim-find-cnt"></span>` +
            `<span class="gf-sep"></span>` +
            `<button class="gf-btn gf-close" data-act="grimFindClose" title="Закрыть (Esc)" aria-label="Закрыть поиск">${IC.crossedSwords}</button>`;
        document.body.appendChild(bar);
    }
    return bar;
}
function _grimFindShowBar() { _grimFindBar().classList.add('show'); _grimFindUpdateBar(); }
function _grimFindHideBar() { const b = document.getElementById('grim-find') as any; if (b) b.classList.remove('show'); }
function _grimFindUpdateBar() {
    const c = document.getElementById('grim-find-cnt') as any;
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
    const delBtn = document.getElementById('grim-bulk-delete') as any;
    if (delBtn) { clearTimeout(delBtn._armTimer); delBtn._armed = false; delBtn.classList.remove('confirm-armed'); delBtn.title = 'Удалить навсегда'; }
}

function grimToggleSelectMode() {
    if (grimSelectMode) {
        _grimExitSelect();
    } else {
        grimSelectMode = true;
        grimSelectedIds.clear();
        currentNoteId = null;                       // pure list while selecting
        const layoutEl = document.getElementById('grim-layout') as any;
        if (layoutEl) layoutEl.classList.remove('show-detail');
    }
    renderNotes();
    _updateGrimSelectBar();
}

function grimToggleSelectNote(id) {
    if (grimSelectedIds.has(id)) grimSelectedIds.delete(id);
    else grimSelectedIds.add(id);
    const leaf: any = document.querySelector(`.grim-leaf[data-id="${id}"]`);
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
    const c = document.getElementById('grim-select-count') as any;
    if (c) c.textContent = `${count} отмечено`;
    ['grim-bulk-archive', 'grim-bulk-restore', 'grim-bulk-color', 'grim-bulk-delete', 'grim-bulk-export'].forEach(id => {
        const b = document.getElementById(id) as any;
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
    moved.forEach(n => { n.archivedAt = now; n.updatedAt = nowTs(); });   // sync (Phase 1): stamp the archive (location) change
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
    moved.forEach(n => { delete n.archivedAt; n.updatedAt = nowTs(); });   // sync (Phase 1): stamp the restore (location) change
    state.notesArchive = (state.notesArchive || []).filter(n => !grimSelectedIds.has(n.id));
    if (!Array.isArray(state.notes)) state.notes = [];
    state.notes.unshift(...moved);
    moved.forEach(n => _newNoteIds.add(n.id));   // NA-5: animate the restored leaves only
    const count = moved.length;
    currentNoteId = null;
    _grimExitSelect();
    grimMode = 'active';                             // mirror single restore
    notesSearchQuery = '';
    const sb = document.getElementById('notes-search-box') as any;
    if (sb) sb.value = '';
    saveState();
    renderNotes();
    showToast(`Возвращено: ${count}`, { undo: true });
}

// Permanent delete of every ticked note in the current segment (two-step, undoable).
function grimBulkDelete() {
    if (!grimSelectedIds.size) return;
    const btn = document.getElementById('grim-bulk-delete') as any;
    if (!_armDanger(btn, `Нажмите ещё раз — записи будут уничтожены (${grimSelectedIds.size})`)) return;
    clearTimeout(_grimSaveT);
    pushUndo();
    const key = grimMode === 'archive' ? 'notesArchive' : 'notes';
    const doomed = (state[key] || []).filter(n => grimSelectedIds.has(n.id));
    const count = doomed.length;
    doomed.forEach(n => addTombstone(n.id, 'note'));   // sync (Phase 1): bulk permanent delete → tombstones
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
            // textContent glues adjacent <li> texts into one run («купить свечинайти котёл»)
            // — join the items with a middot so the snippet stays readable.
            case 'UL': case 'OL': pushGlyph(el.classList.contains('task') ? 'task' : 'list');
                pushText([...el.querySelectorAll(':scope > li')].map(li => _grimCollapse(li.textContent)).filter(Boolean).join(' · '));
                break;
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
        note.updatedAt = nowTs();   // sync (Phase 1): monotonic record stamp
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
    const bo = document.getElementById('grim-body') as any;
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
    let n: any = sel && sel.anchorNode;
    while (n && n !== bo && !/^(LI|P|DIV|H1|H2|H3|BLOCKQUOTE)$/.test(n.tagName || '')) n = n.parentNode;
    return (n && n !== bo) ? n : null;
}
// Bold/italic: toggle the selection, or — with just a caret — the whole current line.
function _grimEmphasis(cmd) {
    const bo = document.getElementById('grim-body') as any;
    if (!bo) return;
    bo.focus();
    try { (document as any).execCommand('styleWithCSS', false, false); } catch (_) {}   // emit tags (<u>/<strike>), not inline style → survives sanitizer
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
    const bo = document.getElementById('grim-body') as any;
    const sel = window.getSelection();
    const goingOn = (document.queryCommandValue('formatBlock') || '').toLowerCase() !== 'blockquote';
    if (goingOn) {
        let n: any = sel && sel.anchorNode;
        while (n && n !== bo) {
            if (n.tagName === 'UL') { document.execCommand('insertUnorderedList'); break; }
            if (n.tagName === 'OL') { document.execCommand('insertOrderedList'); break; }
            n = n.parentNode;
        }
    }
    _grimToggleBlock('blockquote');
}
function grimHeading(n: any) {
    const bo = document.getElementById('grim-body') as any;
    if (!bo) return;
    bo.focus();
    _grimToggleBlock('h' + n);
    _grimAfterEdit(bo);
}
function grimChecklist() { _grimSetListType('task'); }

// ── List engine — per-line conversion, splitting where needed (Notion-style) ──
// A line's list type, or null when it isn't a list item.
function _grimLineType(li: any) {
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
        let n: any = range.startContainer;
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
function _grimSameListKind(a: any, b: any) {
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
function _grimConvertLine(line: any, toType) {
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
    const bo = document.getElementById('grim-body') as any;
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
    const bo = document.getElementById('grim-body') as any;
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
    const bo = document.getElementById('grim-body') as any;
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
function _grimClosestPre(node: any, bo) {
    let n: any = node;
    while (n && n !== bo) { if (n.tagName === 'PRE') return n; n = n.parentNode; }
    return null;
}
// Toolbar / ``` → drop a code block at the caret (selected text becomes its body,
// newlines preserved). Inserted via insertHTML so it joins the native undo stack.
function grimCodeBlock() {
    const bo = document.getElementById('grim-body') as any;
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
    const bo = document.getElementById('grim-body') as any;
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount || !sel.isCollapsed) return false;
    // Climb to the top-level line under #grim-body (an element OR a bare text node —
    // a fresh, never-wrapped body types text straight into #grim-body).
    let blk: any = sel.anchorNode;
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
    const bo = document.getElementById('grim-body') as any;
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
    const bo = document.getElementById('grim-body') as any;
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
globalThis._grimLinkRange = null; globalThis._grimLinkAnchor = null;
function grimLink() {
    const bo = document.getElementById('grim-body') as any;
    if (!bo) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) { bo.focus(); return; }
    _grimLinkRange = sel.getRangeAt(0).cloneRange();
    // Editing an existing link under the caret?
    let n: any = sel.anchorNode; _grimLinkAnchor = null;
    while (n && n !== bo) { if (n.tagName === 'A') { _grimLinkAnchor = n; break; } n = n.parentNode; }
    const inp = document.getElementById('grim-link-input') as any;
    if (inp) inp.value = _grimLinkAnchor ? (_grimLinkAnchor.getAttribute('href') || '') : 'https://';
    const nameInp = document.getElementById('grim-link-name') as any;
    if (nameInp) nameInp.value = _grimLinkAnchor ? (_grimLinkAnchor.textContent || '') : (sel.toString() || '');
    const rm = document.getElementById('grim-link-remove') as any;
    if (rm) rm.style.display = _grimLinkAnchor ? '' : 'none';
    openModalWithFocus('grim-link-modal');
    requestAnimationFrame(() => requestAnimationFrame(() => { if (inp) { inp.focus(); inp.select(); } }));
}
// Re-focus the body and restore the saved selection so execCommand acts on it.
function _grimRestoreLinkSel() {
    const bo = document.getElementById('grim-body') as any;
    if (!bo || !_grimLinkRange) return null;
    bo.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_grimLinkRange);
    return bo;
}
function grimLinkConfirm() {
    const inp = document.getElementById('grim-link-input') as any;
    const nameInp = document.getElementById('grim-link-name') as any;
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
function grimLinkClose(event?) {
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
function _grimCaretToStart(el: any) {
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
    const bo = document.getElementById('grim-body') as any;
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount) return false;
    // п.16: Enter on an empty line inside a callout breaks out below it (no way to
    // get stuck typing forever in the врезка). Mirrors the blockquote escape.
    let co: any = sel.anchorNode;
    while (co && co !== bo && !(co.nodeType === 1 && co.classList && co.classList.contains('grim-co'))) co = co.parentNode;
    if (co && co !== bo) {
        let blk: any = sel.anchorNode;
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
    let n: any = sel.anchorNode, bq = null, code = null;
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
    const bo = document.getElementById('grim-body') as any;
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount || !sel.isCollapsed) return false;
    let co: any = sel.anchorNode;
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
    const bo = document.getElementById('grim-body') as any;
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount || !sel.isCollapsed) return false;
    const range = sel.getRangeAt(0);
    let li: any = sel.anchorNode;
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
    const bar = document.getElementById('grim-fmt-bar') as any;
    if (!bar) return;
    const set = (cmd, on) => { const b = bar.querySelector(`[data-cmd="${cmd}"]`); if (b) b.classList.toggle('on', on); };
    try {
        set('bold', document.queryCommandState('bold'));
        set('italic', document.queryCommandState('italic'));
        set('underline', document.queryCommandState('underline'));
        set('strike', document.queryCommandState('strikeThrough'));
        // List context by DOM walk — a checklist is a UL too, so queryCommandState
        // can't tell ul/ul.task/ol apart; light the right button only.
        const bo = document.getElementById('grim-body') as any;
        const sel = window.getSelection();
        let ulTask = false, ulPlain = false, ol = false, n: any = sel && sel.anchorNode;
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
    const bo = document.getElementById('grim-body') as any;
    if (!bo) return;
    const existing = document.getElementById('grim-table-pop') as any;
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
            cell.dataset.r = String(r); cell.dataset.c = String(c);
            cell.addEventListener('mouseenter', () => {
                lbl.textContent = c + ' × ' + r;
                grid.querySelectorAll('.gtp-c').forEach((x: any) =>
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
    const bo = document.getElementById('grim-body') as any;
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
function _grimClosestCallout(node: any, bo) {
    let n: any = node;
    while (n && n !== bo) {
        if (n.nodeType === 1 && n.classList && n.classList.contains('grim-co')) return n;
        n = n.parentNode;
    }
    return null;
}

// Toolbar → small type-picker popover under the callout button.
function grimCalloutMenu(e) {
    const bo = document.getElementById('grim-body') as any;
    if (!bo) return;
    const existing = document.getElementById('grim-co-pop') as any;
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
    const bo = document.getElementById('grim-body') as any;
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
    const bo = document.getElementById('grim-body') as any;
    const sel = window.getSelection();
    if (!bo || !sel || !sel.rangeCount) return null;
    let n: any = sel.anchorNode;
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
globalThis._grimEditTbl = null;// table currently in structure-edit mode (or null)
globalThis._grimMenu = null;// { el, gutter, kind } of the open floating menu (or null)
globalThis._grimTblRAF = 0;
globalThis._grimRO = null;// ResizeObserver re-gluing the overlay when the body reflows
globalThis._grimTitleRO = null;// ResizeObserver re-growing the title <textarea> when its width changes
globalThis._grimHoverTbl = null;// table the pointer is currently over (seal shows on hover)
globalThis._grimHoverSeal = null;// table whose seal the pointer is over (keeps it visible)

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
    const ov = document.querySelector<HTMLElement>('#grim-detail .grim-tctl');
    if (!ov) return;
    ov.querySelectorAll('.gtc-seal').forEach((s: any) => {
        const t = s._gtcTable;
        s.classList.toggle('gtc-show', !!t && (t === _grimEditTbl || t === _grimHoverTbl || t === _grimHoverSeal));
    });
}

function _grimTctl() {
    const page = document.querySelector<HTMLElement>('#grim-detail .grim-page');
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
    const bo = document.getElementById('grim-body') as any;
    const page = document.querySelector<HTMLElement>('#grim-detail .grim-page');
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
        (seal as any)._gtcTable = table;
        (seal as any)._gtcReflow = (ox2, oy2) => { const r = table.getBoundingClientRect(); seal.style.left = R(r.right - ox2) + 'px'; seal.style.top = R(r.top - oy2) + 'px'; };
        (seal as any)._gtcReflow(ox, oy);
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
        (frame as any)._gtcReflow = (ox2, oy2) => { const r = table.getBoundingClientRect(); Object.assign(frame.style, { left: R(r.left - ox2) + 'px', top: R(r.top - oy2) + 'px', width: R(r.width) + 'px', height: R(r.height) + 'px' }); };
        (frame as any)._gtcReflow(ox, oy);
        ov.appendChild(frame);
        const head = (table.tHead && table.tHead.rows[0]) ? table.tHead.rows[0] : table.rows[0];
        if (head) [...head.cells].forEach((cell, ci) => {
            const g = document.createElement('div');
            g.className = 'gtc-gut gtc-colgut';
            (g as any)._gtcReflow = (ox2, oy2) => { const cr = cell.getBoundingClientRect(), r = table.getBoundingClientRect(); Object.assign(g.style, { left: R(cr.left - ox2) + 'px', top: R(r.top - oy2 - 20) + 'px', width: R(cr.width) + 'px' }); };
            (g as any)._gtcReflow(ox, oy);
            g.innerHTML = `<span class="gtc-grip">${FIC.tblGrip}</span>`;
            g.addEventListener('mousedown', e => e.preventDefault());
            g.addEventListener('click', e => { e.stopPropagation(); _grimToggleTableMenu(g, 'col', ci, table); });
            ov.appendChild(g);
        });
        const bodyRows = table.tBodies[0] ? [...table.tBodies[0].rows] : [...table.rows].slice(1);
        bodyRows.forEach(rowEl => {
            const g = document.createElement('div');
            g.className = 'gtc-gut gtc-rowgut';
            (g as any)._gtcReflow = (ox2, oy2) => { const rr = rowEl.getBoundingClientRect(), r = table.getBoundingClientRect(); Object.assign(g.style, { left: R(r.left - ox2 - 20) + 'px', top: R(rr.top - oy2) + 'px', height: R(rr.height) + 'px' }); };
            (g as any)._gtcReflow(ox, oy);
            g.innerHTML = `<span class="gtc-grip">${FIC.tblGrip}</span>`;
            g.addEventListener('mousedown', e => e.preventDefault());
            g.addEventListener('click', e => { e.stopPropagation(); _grimToggleTableMenu(g, 'row', rowEl, table); });
            ov.appendChild(g);
        });
        const edgeCol = document.createElement('button');
        edgeCol.type = 'button'; edgeCol.className = 'gtc-edge gtc-edge-col'; edgeCol.title = 'Добавить колонку';
        edgeCol.innerHTML = FIC.tblAdd;
        (edgeCol as any)._gtcReflow = (ox2, oy2) => { const r = table.getBoundingClientRect(); Object.assign(edgeCol.style, { left: R(r.right - ox2 + 8) + 'px', top: R(r.top - oy2 + r.height / 2) + 'px' }); };
        (edgeCol as any)._gtcReflow(ox, oy);
        edgeCol.addEventListener('mousedown', e => e.preventDefault());
        edgeCol.addEventListener('click', e => { e.stopPropagation(); grimTableAppend('col', table); });
        ov.appendChild(edgeCol);
        const edgeRow = document.createElement('button');
        edgeRow.type = 'button'; edgeRow.className = 'gtc-edge gtc-edge-row'; edgeRow.title = 'Добавить строку';
        edgeRow.innerHTML = FIC.tblAdd;
        (edgeRow as any)._gtcReflow = (ox2, oy2) => { const r = table.getBoundingClientRect(); Object.assign(edgeRow.style, { left: R(r.left - ox2 + r.width / 2) + 'px', top: R(r.bottom - oy2 + 8) + 'px' }); };
        (edgeRow as any)._gtcReflow(ox, oy);
        edgeRow.addEventListener('mousedown', e => e.preventDefault());
        edgeRow.addEventListener('click', e => { e.stopPropagation(); grimTableAppend('row', table); });
        ov.appendChild(edgeRow);
    });
    _grimApplySealVis();   // hover-only: hide seals not hovered / not in edit mode
}
// Re-glue the overlay to current table geometry WITHOUT rebuilding it (no flicker,
// no fade-restart). Used while the toolbar reveal animation shifts the tables.
function _grimReflowOverlay() {
    const page = document.querySelector<HTMLElement>('#grim-detail .grim-page');
    const ov = page && page.querySelector(':scope > .grim-tctl');
    if (!page || !ov || !ov.classList.contains('on')) return;
    const pr = page.getBoundingClientRect();
    const ox = pr.left + page.clientLeft, oy = pr.top + page.clientTop;
    [...ov.children].forEach(el => { if ((el as any)._gtcReflow) (el as any)._gtcReflow(ox, oy); });
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
    const bo = document.getElementById('grim-body') as any;
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
    const page = document.querySelector<HTMLElement>('#grim-detail .grim-page');
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
    const pop = document.getElementById('grim-table-pop') as any; if (pop) { pop.remove(); return true; }
    if (_grimMenu) { _grimCloseTableMenu(); return true; }
    if (_grimEditTbl) { _grimEditTbl = null; _grimLayoutTableUI(); return true; }
    return false;
}
// Full teardown — used when the detail pane re-renders.
function _grimHideTableUI() {
    const pop = document.getElementById('grim-table-pop') as any; if (pop) pop.remove();
    _grimCloseTableMenu();
    _grimEditTbl = null;
    const ov = document.querySelector<HTMLElement>('#grim-detail .grim-tctl');
    if (ov) { ov.innerHTML = ''; ov.classList.remove('on'); }
}

// Edge rails: append a column (right) or row (bottom) at the end of the table.
function grimTableAppend(kind, table) {
    const bo = document.getElementById('grim-body') as any;
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
    // Every fmt button is delegated: data-cmd carries the command, data-act="grimFmtBtn"
    // dispatches through _GRIM_FMT; data-pd is the focus-steal guard (was onmousedown
    // preventDefault) so the body keeps its selection/caret while the toolbar acts.
    const btn = (cmd, title, svg) =>
        `<button class="fmt-btn" data-cmd="${cmd}" data-pd data-act="grimFmtBtn" title="${title}">${svg}</button>`;
    // .fmt-inner is a pure collapse wrapper (overflow-hidden, no box) so the toolbar
    // truly folds to 0 when hidden — no residual padding/border leaking a gap under
    // the divider. .fmt-cluster carries the chrome and centres its grouped rows when
    // they wrap, so every wrapped row stays balanced and centred.
    return `<div class="fmt-bar" id="grim-fmt-bar"><div class="fmt-inner"><div class="fmt-cluster" role="toolbar" aria-label="Форматирование">
        <span class="fmt-grp">
            <button class="fmt-btn fmt-h" data-cmd="h1" data-pd data-act="grimFmtBtn" title="Заголовок 1">H1</button>
            <button class="fmt-btn fmt-h" data-cmd="h2" data-pd data-act="grimFmtBtn" title="Заголовок 2">H2</button>
            <button class="fmt-btn fmt-h" data-cmd="h3" data-pd data-act="grimFmtBtn" title="Заголовок 3">H3</button>
        </span>
        <span class="fmt-grp">
            ${btn('bold', 'Жирный (Ctrl+B)', FIC.bold)}
            ${btn('italic', 'Курсив (Ctrl+I)', FIC.italic)}
            ${btn('underline', 'Подчёркнутый (Ctrl+U)', FIC.underline)}
            ${btn('strike', 'Зачёркнутый', FIC.strike)}
        </span>
        <span class="fmt-grp">
            ${btn('ul', 'Маркированный список', FIC.ul)}
            ${btn('ol', 'Нумерованный список', FIC.ol)}
            ${btn('task', 'Чек-лист', FIC.task)}
        </span>
        <span class="fmt-grp">
            ${btn('quote', 'Цитата', FIC.quote)}
            ${btn('code', 'Код', FIC.code)}
            ${btn('codeblock', 'Блок кода (```)', FIC.codeBlock)}
            ${btn('hr', 'Разделитель', FIC.hr)}
            ${btn('link', 'Ссылка (Ctrl+K)', FIC.link)}
        </span>
        <span class="fmt-grp">${btn('table', 'Таблица', FIC.table)}</span>
        <span class="fmt-grp">${btn('callout', 'Врезка (каллаут)', FIC.callout)}</span>
        <span class="fmt-grp">
            <button class="fmt-btn export" data-cmd="export" data-pd data-act="grimFmtBtn" title="Экспорт записи в .md">${FIC.md}<span>.md</span></button>
        </span>
    </div></div></div>`;
}

// ── Markdown export ─────────────────────────────────────────────────────
function _grimDownload(name, text, mime?) {
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
function _grimInlineMd(node: any) {
    let out = '';
    node.childNodes.forEach((n: any) => {
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
    root.childNodes.forEach((n: any) => {
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
const _GRIM_CRC = (() => { const t = new Uint32Array(256); for (let n: any = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
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
function _grimIoItem(icon, name, desc, act, scope?) {
    return `<div class="grim-tpl-item" role="menuitem" data-act="${act}"${scope ? ` data-scope="${scope}"` : ''}>
        <span class="grim-tpl-ic">${icon}</span>
        <span class="grim-tpl-txt"><span class="grim-tpl-name">${escHtml(name)}</span><span class="grim-tpl-desc">${escHtml(desc)}</span></span>
    </div>`;
}
function _grimRenderIoMenu() {
    const pop = document.getElementById('grim-io-pop') as any; if (!pop) return;
    pop.innerHTML = '<div class="grim-tpl-head">Перенос записей</div>'
        + '<div class="grim-tpl-sect">Импорт</div>'
        + _grimIoItem(GRIM_IO_IC.import, 'Импорт файлов', '.md · .zip · .json · можно несколько', 'grimImportFiles')
        + '<div class="grim-tpl-divline"></div><div class="grim-tpl-sect">Экспорт всего</div>'
        + _grimIoItem(GRIM_IO_IC.full, 'Полный бэкап записей', '.json · все записи Гримуара + летопись', 'grimExportFullBackup', 'all')
        + _grimIoItem(GRIM_IO_IC.backup, 'Резервная копия', 'один .md, разворачивается обратно', 'grimExportBackup', 'all')
        + _grimIoItem(GRIM_IO_IC.reading, 'Для чтения', 'ZIP · по файлу на заметку', 'grimExportReading', 'all');
}
function _grimRenderIoSelMenu() {
    const pop = document.getElementById('grim-io-sel-pop') as any; if (!pop) return;
    pop.innerHTML = '<div class="grim-tpl-head">Экспорт выбранных</div>'
        + _grimIoItem(GRIM_IO_IC.full, 'Полный бэкап записей', '.json · выбранные записи + летопись', 'grimExportFullBackup', 'sel')
        + _grimIoItem(GRIM_IO_IC.backup, 'Резервная копия', 'один .md', 'grimExportBackup', 'sel')
        + _grimIoItem(GRIM_IO_IC.reading, 'Для чтения', 'ZIP · по файлу', 'grimExportReading', 'sel');
}
function _grimCloseIoMenu() {
    ['grim-io-split', 'grim-io-sel'].forEach(id => { const w = document.getElementById(id); if (w) w.classList.remove('open'); });
    const a = document.getElementById('grim-io') as any; if (a) a.setAttribute('aria-expanded', 'false');
    const b = document.getElementById('grim-bulk-export') as any; if (b) b.setAttribute('aria-expanded', 'false');
}
// NA-8: per-container closers for the shared _gothicPickers registry. The registry
// fires once per registered picker, so a single shared close would mis-close the
// other IO menu when clicking inside this one. These close only their own popover;
// _grimCloseIoMenu stays for the explicit "close everything" call sites.
function _grimCloseIoSplit() {
    const w = document.getElementById('grim-io-split') as any; if (w) w.classList.remove('open');
    const a = document.getElementById('grim-io') as any; if (a) a.setAttribute('aria-expanded', 'false');
}
function _grimCloseIoSel() {
    const w = document.getElementById('grim-io-sel') as any; if (w) w.classList.remove('open');
    const b = document.getElementById('grim-bulk-export') as any; if (b) b.setAttribute('aria-expanded', 'false');
}
function grimToggleIoMenu(event) {
    if (event) event.stopPropagation();
    const w = document.getElementById('grim-io-split') as any; if (!w) return;
    const wasOpen = w.classList.contains('open');
    _grimCloseIoMenu();
    if (wasOpen) return;
    _grimRenderIoMenu();
    requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('open')));
    const b = document.getElementById('grim-io') as any; if (b) b.setAttribute('aria-expanded', 'true');
}
function grimToggleIoSelMenu(event) {
    if (event) event.stopPropagation();
    const w = document.getElementById('grim-io-sel') as any; if (!w) return;
    const wasOpen = w.classList.contains('open');
    _grimCloseIoMenu();
    if (wasOpen) return;
    _grimRenderIoSelMenu();
    requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('open')));
    const b = document.getElementById('grim-bulk-export') as any; if (b) b.setAttribute('aria-expanded', 'true');
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
            const meta: any = {}; let j = i + 1;
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
    const sb = document.getElementById('notes-search-box') as any; if (sb) sb.value = '';
    saveState();
    renderNotes();
    const layoutEl = document.getElementById('grim-layout') as any; if (layoutEl) layoutEl.classList.add('show-detail');
    const ti = document.getElementById('grim-title-in') as any; if (ti) ti.focus();
    showToast('Импортировано записей: ' + added);
}
// NA-3 (Б): a JSON «Полный бэкап» (grimExportFullBackup) was dropped into the import
// picker — offer the same «Добавить» / «Заменить» choice DUSK uses, then restore notes
// + склеп + templates + «Летопись» (reusing _grimRestoreVersions). Reuses the shared
// import-choice modal; both openers now set their own title/desc so the text can't bleed.
function _grimFullImport(loaded) {
    const overlay = document.getElementById('import-choice-overlay') as any;
    if (!overlay) { _grimApplyFullBackup(loaded, 'replace'); return; }   // fallback
    const title = document.getElementById('import-choice-title') as any;
    const desc  = overlay.querySelector('.import-choice-desc');
    if (title) title.textContent = 'Импорт записей';
    if (desc)  desc.textContent  = 'Добавить записи Гримуара к существующим или полностью заменить?';
    const replaceBtn = document.getElementById('import-replace-btn') as any;
    const mergeBtn = document.getElementById('import-merge-btn') as any;
    const cancelBtn = document.getElementById('import-cancel-btn') as any;
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
    const sb = document.getElementById('notes-search-box') as any; if (sb) sb.value = '';
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
    const sb = document.getElementById('notes-search-box') as any; if (sb) sb.value = '';
    saveState();
    renderNotes();
    const layoutEl = document.getElementById('grim-layout') as any; if (layoutEl) layoutEl.classList.add('show-detail');
    const ti = document.getElementById('grim-title-in') as any; if (ti) ti.focus();
}

// Save the open note as a reusable template (mirrors saveTaskAsTemplate).
function grimSaveAsTpl(id) {
    const note = (state.notes || []).find(n => n.id === id) || (state.notesArchive || []).find(n => n.id === id);
    if (!note) return;
    if (!Array.isArray(state.noteTemplates)) state.noteTemplates = [];
    pushUndo();
    state.noteTemplates.push({
        id: uid(),
        createdAt: nowTs(), updatedAt: nowTs(),   // sync timestamp (uuid `id` is the sync key)
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
    const split = document.getElementById('grim-new-split') as any;
    if (!split) return;
    if (split.classList.contains('open')) { _grimCloseTplMenu(); return; }
    _grimRenderTplMenu();
    // Paint the closed base state first, THEN flip .open next frame so the
    // opacity/transform transition actually runs (same-tick add skips it).
    requestAnimationFrame(() => requestAnimationFrame(() => split.classList.add('open')));
    const trig = document.getElementById('grim-tpl-trigger') as any;
    if (trig) trig.setAttribute('aria-expanded', 'true');
}
function _grimCloseTplMenu() {
    const split = document.getElementById('grim-new-split') as any;
    if (split) split.classList.remove('open');
    const trig = document.getElementById('grim-tpl-trigger') as any;
    if (trig) trig.setAttribute('aria-expanded', 'false');
}
function _grimRenderTplMenu() {
    const pop = document.getElementById('grim-tpl-pop') as any;
    if (!pop) return;
    let html = '<div class="grim-tpl-head">Начертать из шаблона</div>';
    html += '<div class="grim-tpl-sect">Встроенные</div>';
    html += GRIM_BUILTIN_TPL.map(t => `
        <div class="grim-tpl-item" role="menuitem" data-act="grimUseBuiltin" data-key="${t.key}">
            <span class="grim-tpl-ic">${t.icon}</span>
            <span class="grim-tpl-txt"><span class="grim-tpl-name">${escHtml(t.name)}</span><span class="grim-tpl-desc">${escHtml(t.desc)}</span></span>
        </div>`).join('');
    const mine = state.noteTemplates || [];
    if (mine.length) {
        html += '<div class="grim-tpl-divline"></div><div class="grim-tpl-sect">Свои</div>';
        html += mine.map(t => `
            <div class="grim-tpl-item user" role="menuitem" data-act="grimUseTpl" data-id="${t.id}">
                <span class="grim-tpl-ic">${GRIM_TPL_IC.save}</span>
                <span class="grim-tpl-txt"><span class="grim-tpl-name">${escHtml(t.name || 'Шаблон')}</span><span class="grim-tpl-desc">своя заготовка</span></span>
                <button class="grim-tpl-del" data-act="grimDeleteTpl" data-id="${t.id}" title="Удалить шаблон">${GRIM_TPL_IC.del}</button>
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
window.addEventListener('resize', () => { if (document.querySelector<HTMLElement>('#grim-detail .grim-tctl')) _grimScheduleTableUI(); });
// Returning to the window/tab can leave the overlay stale (a blur fired on leave)
// — rebuild it so the seal comes back.
window.addEventListener('focus', () => { if (document.getElementById('grim-body')) _grimScheduleTableUI(); });
window.addEventListener('pageshow', () => { if (document.getElementById('grim-body')) _grimScheduleTableUI(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && document.getElementById('grim-body')) _grimScheduleTableUI(); });

// ── ES-module bridge (migration 2a), part 2: consts/classes ─────────────────
// (mutable top-level let/var declarations were converted to globalThis.* so
//  every module reads AND writes the same slot — no stale copies).
Object.assign(globalThis, {
    PAGE_EL, PAGE_TAB, GIC, GRIM_FOCUS_TITLE, GRIM_BAR_TITLE, GRIM_TOC_TITLE, GRIM_VER_IDLE, GRIM_VER_MAX,
    GRIM_VER_BACKUPS, GRIM_SORTS, GRIM_SORT_SWORD, _CRYPT_MONTHS, _GRIM_SENT, GRIM_TAGS, GRIM_TBL_MAX, GRIM_CO,
    FIC, GRIM_IO_IC, _GRIM_CRC, GRIM_TPL_IC, _GRIM_MONTHS, GRIM_BUILTIN_TPL,
});
