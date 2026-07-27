// TS ambient view of this module's 2a globalThis slots (runtime inits below);
// `declare` emits nothing — the single storage slot stays globalThis.*.
declare var noteColorActive: any;
declare var grimBulkColorActive: any;
declare var editingNoteColorId: any;
declare var _grgbH: any;
declare var _grgbS: any;
declare var _grgbV: any;
declare var _grgbScope: any;
declare var _announceRafId: any;

// ── ES-module bridge (migration 2a), part 1: HOISTED functions ──────────────
// Classic scripts hoisted these into the shared global scope before any code
// ran; publish them first so load-time cross-module calls keep working.
Object.assign(globalThis, {
    linkifyNote, noteDisplayHTML, _noteCtx, _openNoteWrap, _closeNoteWrap, _noteEdit, _noteInput, _noteCounter,
    _noteKeydown, _noteCommit, _notePersist, _noteDeleteClick, _noteToggle, toggleSubNote, updateSubNotesAlwaysBtn, updateSubProgressBar,
    updateSubToggleBtn, refreshSubtaskList, initSubSortable, onSubDragEnd, startInlineEdit, toggleTaskNote, _taskNoteCtx, _taskNoteEdit,
    _taskNoteInput, _taskNoteCounter, _taskNoteKeydown, _taskNoteCommit, _taskNotePersist, openNoteModal, openEditNoteModal, closeNoteModal,
    confirmNote, _taskNoteDelete, plainTextPaste, attachPlainPasteHandlers, deleteTaskForever, _setTaskPriority, _setTaskColor, openPrioModal,
    closePrioModal, openGrimColorModal, openGrimBulkColorModal, openTaskColorModal, openFormColorModal, closeTaskColorModal, _commitColorChoice, _hsvToRgb,
    _rgbToHex, _hexToHsv, _grgbHex, _grgbEls, _grgbRender, _groupColorFromSpectrum, _grgbSyncFromColor, _grgbHue,
    _grgbApply, _populateRepeatAnchor, openRepeatModal, closeRepeatModal, announce, openModalWithFocus, closeModalWithAnim, dismissModalById,
    showAddGroupModal, _setGroupColor, closeGroupModal, confirmAddGroup, toggleGroupCollapse, toggleCollapseAllGroups, updateCollapseAllBtn, openRenameGroupModal,
    closeRenameGroupModal, confirmRenameGroup,
});

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
function _openNoteWrap(wrap)  { if (wrap) { wrap.classList.add('note-open');    (wrap as any)._noteOpen = true;  } }
function _closeNoteWrap(wrap) { if (wrap) { wrap.classList.remove('note-open'); (wrap as any)._noteOpen = false; } }

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
function _notePersist(ctx, text, opts: any = {}) {
    ctx.sub.note = text;
    const wrap      = ctx.item.querySelector('.sub-note-wrapper');
    const toggleBtn = ctx.item.querySelector('.btn-sub-note-toggle');
    if (toggleBtn) {
        toggleBtn.classList.toggle('has-note', !!text);
        toggleBtn.title = text ? 'Переписать примечание' : 'Начертать примечание';
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
                delBtn.title = 'Стереть примечание';
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
        (wrap as any)._dismissed = false;
        const del = wrap.querySelector('.btn-sub-note-delete'); if (del) del.remove();
        const cnt = wrap.querySelector('.sub-note-count');      if (cnt) cnt.remove();
    }
    const toggleBtn = ctx.item.querySelector('.btn-sub-note-toggle');
    if (toggleBtn) { toggleBtn.classList.remove('has-note'); toggleBtn.title = 'Начертать примечание'; toggleBtn.innerHTML = IC.addNote; }
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
            (wrap as any)._dismissed = true; _closeNoteWrap(wrap);
        } else {
            (wrap as any)._dismissed = false; _openNoteWrap(wrap); if (noteEl) _noteEdit(noteEl);
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
    const meta: any = document.querySelector(`.task-item[data-id="${taskId}"] .task-meta`);
    if (!meta) return;

    const hasSubNotes = (task.subtasks || []).some(s => s.note && s.note.trim());
    let btn = meta.querySelector(`.btn-sub-notes-always[data-tid="${taskId}"]`);

    if (hasSubNotes && !btn) {
        // Create button and insert immediately after the subtask-toggle button
        btn = document.createElement('button');
        btn.className = 'btn-sub-notes-always' + (task.subNotesAlwaysOpen ? ' active' : '');
        btn.dataset.tid = String(taskId);
        btn.title = task.subNotesAlwaysOpen ? 'Скрыть все примечания' : 'Показать все примечания подпунктов';
        btn.innerHTML = eyeGlyph(!task.subNotesAlwaysOpen);
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
    const wrap: any = document.querySelector(`#sub-section-${taskId} .sub-progress-bar-wrap`);
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
    ul.querySelectorAll<HTMLElement>('.subtask-item').forEach(item => {
        // Ensure _noteOpen is not stale from a previous render cycle — fresh DOM nodes
        // won't have it, but if initSubSortable is ever called without a full rebuild
        // the flag could be stuck at true, silently blocking the open guard.
        const noteWrap = item.querySelector('.sub-note-wrapper');
        if (noteWrap) (noteWrap as any)._noteOpen = false;
        // Bug B: subtask rows now persist across renders (reconciliation), and this
        // function re-runs every render — so bind the hover listeners ONCE per node or
        // they stack up and fire _openNoteWrap N times per hover.
        if ((item as any)._hoverBound) return;
        (item as any)._hoverBound = true;
        item.addEventListener('mouseenter', () => {
            // notes-always-open mode: nothing to do, CSS handles visibility
            const sec = item.closest('.subtask-section');
            if (sec && sec.classList.contains('notes-always-open')) return;
            const wrap = item.querySelector('.sub-note-wrapper.has-note');
            if (wrap && !(wrap as any)._dismissed) _openNoteWrap(wrap);
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
            (wrap as any)._dismissed = false; // reset so next hover is fresh
        });
    });
    // ─────────────────────────────────────────────────────────────────────────

    const activeOpts = {
        animation: 150,
        draggable: '.subtask-item:not(.checked):not(.cycle-checked)',
        delay: 120,
        delayOnTouchOnly: false,
        fallbackTolerance: 5,
        fallbackOnBody: true,
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
        const activeInner = ul.querySelector<HTMLElement>('.sub-split-active-wrap .sub-split-inner');
        const doneInner   = ul.querySelector<HTMLElement>('.sub-split-done-wrap .sub-split-inner');
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
    const allItems = (Array.from as any)(container.querySelectorAll(':scope > .subtask-item'));
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
    const span: any = document.querySelector(`.task-text[data-id="${id}"]`);
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
        if (!hasText) (noteEl as any)._noteCancel = true;   // empty → cancel cleanly
        noteEl.blur();                              // commit persists / cancels + collapses
        if (hasText) {                             // text saved → honour the hide intent
            task.noteOpen = false;
            wrap.classList.remove('visible');
            if (btn) { btn.classList.remove('open'); btn.title = 'Показать примечание'; }
            saveState();
        }
        return;
    }
    const hasNote = !!(task.note && task.note.trim());
    if (hasNote) {
        const willOpen = !wrap.classList.contains('visible');
        task.noteOpen = willOpen;
        wrap.classList.toggle('visible', willOpen);
        if (btn) { btn.classList.toggle('open', willOpen); btn.title = willOpen ? 'Скрыть примечание' : 'Показать примечание'; }
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
    if (tgl) { tgl.classList.toggle('open', !!text); tgl.title = text ? 'Скрыть примечание' : 'Начертать примечание'; }
    const mbtn = document.getElementById('note-modal-btn-' + ctx.id);
    if (mbtn) {
        mbtn.classList.toggle('edit-note-btn', !!text);
        mbtn.innerHTML = text ? IC.editNote : IC.addNote;
        mbtn.title = text ? 'Переписать примечание в окне' : 'Примечание в окне';
        mbtn.setAttribute('onclick', text ? `openEditNoteModal(${ctx.id})` : `openNoteModal(${ctx.id})`);
    }
    saveState();
}

function openNoteModal(id) {
    editingTaskId = id;
    (document.getElementById('note-modal-input') as HTMLInputElement).value = '';
    document.getElementById('note-modal').querySelector<HTMLElement>('.modal-title').textContent = 'Начертать примечание';
    openModalWithFocus('note-modal');
}

function openEditNoteModal(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    editingTaskId = id;
    (document.getElementById('note-modal-input') as HTMLInputElement).value = task.note || '';
    document.getElementById('note-modal').querySelector<HTMLElement>('.modal-title').textContent = 'Переписать примечание';
    openModalWithFocus('note-modal');
    // Select text after focus trap moves focus in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const inp = document.getElementById('note-modal-input') as any;
            if (inp) { inp.focus(); inp.select(); }
        });
    });
}

function closeNoteModal(event?) {
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
    const val = (document.getElementById('note-modal-input') as HTMLInputElement).value.trim();
    if (!val) { closeNoteModal(); return; }
    pushUndo();
    task.note = val;
    // If note is now set, ensure it's open
    task.noteOpen = true;
    saveState(); render();
    closeNoteModal();
    showToast('Примечание начертано');
}

// Delete the task note (from the panel dagger). Undoable; full re-render.
function _taskNoteDelete(event, id) {
    if (event) event.stopPropagation();
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    pushUndo(); task.note = ''; task.noteOpen = false;
    saveState(); render();
    showToast('Примечание стёрто', { undo: true });
}

// ============================================================
function plainTextPaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || (window as any).clipboardData).getData('text/plain');
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
    document.querySelectorAll<HTMLElement>('.task-note-text, .sub-note-text, .sub-text[contenteditable="true"]')
        .forEach(el => {
            el.removeEventListener('paste', plainTextPaste);
            el.addEventListener('paste', plainTextPaste);
        });
}

// Also attach to note modal textarea
document.getElementById('note-modal-input').addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || (window as any).clipboardData).getData('text/plain');
    const ta = e.target as any;
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

    const li: any = document.querySelector(`.task-item[data-id="${id}"]`);
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
    showToast('Обет уничтожен', { undo: true });
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
    document.querySelectorAll<HTMLElement>('#modal-prio-selector .prio-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.prio === (task.priority || 'none'))
    );
    openModalWithFocus('prio-modal');
}

function closePrioModal(event?) {
    if (!event || event.target === document.getElementById('prio-modal')) {
        closeModalWithAnim('prio-modal', () => { editingTaskId = null; });
        if (!event) editingTaskId = null;
    }
}

document.getElementById('modal-prio-selector').addEventListener('click', e => {
    const btn = (e.target as any).closest('.prio-btn');
    if (!btn) return;
    const task = state.tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    pushUndo(); _setTaskPriority(task, btn.dataset.prio);
    saveState(); renderListOnly(); closePrioModal(); // 7b: priority reorders the list only
    showToast('Ранг изменён');
});

// ─── Task color modal ────────────────────────────────────────────────────────
// п.9: a grimoire note reuses the very same colour modal (presets + RGB spectrum +
// "без цвета"). This flag routes _commitColorChoice / close back to the note.
globalThis.noteColorActive = false;
globalThis.grimBulkColorActive = false;// cross-app #7: task-color-modal acting on the whole note selection
globalThis.editingNoteColorId = null;
function openGrimColorModal(id) {
    const note = (state.notes || []).find(n => n.id === id);
    if (!note) return;
    noteColorActive = true; grimBulkColorActive = false; globalThis.bulkColorActive = false; globalThis.formColorActive = false; editingTaskId = null;
    editingNoteColorId = id;
    document.querySelectorAll<HTMLElement>('#task-color-picker .color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color === (note.color || ''))
    );
    _grgbSyncFromColor(note.color, 'task');   // reuse the task-color-modal spectrum scope
    openModalWithFocus('task-color-modal');
}

// cross-app #7: open the shared colour modal for the whole ticked note selection.
function openGrimBulkColorModal() {
    if (!grimSelectedIds.size) return;
    grimBulkColorActive = true;
    noteColorActive = false; globalThis.bulkColorActive = false; globalThis.formColorActive = false; editingTaskId = null; editingNoteColorId = null;
    document.querySelectorAll<HTMLElement>('#task-color-picker .color-swatch').forEach(s => s.classList.remove('active'));
    _grgbSyncFromColor(null, 'task');   // bulk has no single current colour — show the default gothic violet
    openModalWithFocus('task-color-modal');
}

function openTaskColorModal(id) {
    editingTaskId = id;
    globalThis.bulkColorActive = false;   // P-D: normal per-task open clears any stale bulk flag
    globalThis.formColorActive = false;
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    // Highlight current colour in picker
    document.querySelectorAll<HTMLElement>('#task-color-picker .color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color === (task.color || ''))
    );
    _grgbSyncFromColor(task.color, 'task'); // seed the spectrum from the task's current colour
    openModalWithFocus('task-color-modal');
}

// Opened from the creation form's "свой цвет" crystal — the modal writes back into
// selectedFormColor (no task exists yet) and reuses the same presets + spectrum.
function openFormColorModal() {
    globalThis.formColorActive = true;
    globalThis.bulkColorActive = false;
    editingTaskId = null;
    document.querySelectorAll<HTMLElement>('#task-color-picker .color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color === (selectedFormColor || ''))
    );
    _grgbSyncFromColor(selectedFormColor, 'task');
    openModalWithFocus('task-color-modal');
}

function closeTaskColorModal(event?) {
    if (!event || event.target === document.getElementById('task-color-modal')) {
        globalThis.bulkColorActive = false;   // P-D: cancelling bulk must not leak into the next open
        globalThis.formColorActive = false;
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
        showToast(c ? 'Витраж записи наложен' : 'Витраж снят');
        return;
    }
    if (formColorActive) {
        globalThis.formColorActive = false;
        _setFormColor(c);
        closeModalWithAnim('task-color-modal');
        return;
    }
    if (bulkColorActive) {
        globalThis.bulkColorActive = false;
        bulkSetColor(c);
        closeModalWithAnim('task-color-modal');
        return;
    }
    const task = state.tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    pushUndo();
    _setTaskColor(task, c);
    saveState(); renderListOnly(); closeTaskColorModal(); // 7b: colour label affects the list only
    showToast(task.color ? 'Витраж наложен' : 'Витраж снят');
}

document.getElementById('task-color-picker').addEventListener('click', e => {
    const sw = (e.target as any).closest('.color-swatch');
    if (!sw) return;
    _commitColorChoice(sw.dataset.color);
});

// ─── Gothic custom-colour spectrum (RGB picker) ──────────────────────────────
// A 2D saturation/value pad + a hue band. State is HSV; converted to/from hex.
globalThis._grgbH = 270; globalThis._grgbS = 0.62; globalThis._grgbV = 0.92;// default: gothic violet ≈ #A060FF
// P-fix#2: the spectrum lives in two modals (colour-label + group). _grgbScope picks
// which one the engine reads/writes; both copies share the same class names (no dup ids).
globalThis._grgbScope = 'task';// 'task' (colour-label modal) | 'group' (group modal, live binding)

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
        pad:     root.querySelector<HTMLElement>('.grgb-pad'),
        thumb:   root.querySelector<HTMLElement>('.grgb-thumb'),
        hue:     root.querySelector('.grgb-hue') as any,
        preview: root.querySelector<HTMLElement>('.grgb-preview'),
        hexEl:   root.querySelector<HTMLElement>('.grgb-hex'),
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
    if (colorPicker) colorPicker.querySelectorAll<HTMLElement>('.color-swatch').forEach(s => s.classList.remove('active'));
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
    document.querySelectorAll<HTMLElement>('.grgb-pad').forEach(pad => {
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
    const section = document.getElementById('repeat-anchor-section') as any;
    const wdRow = document.getElementById('repeat-anchor-weekday-row') as any;
    const mdRow = document.getElementById('repeat-anchor-monthday-row') as any;
    const wdSelect = document.getElementById('repeat-anchor-day') as any;
    const wdLabel = document.getElementById('repeat-wd-label') as any;
    if (!section) return;

    const hasRepeat = repeatMode && repeatMode !== 'none';
    section.style.display = hasRepeat ? '' : 'none';
    if (wdRow) wdRow.style.display = (hasRepeat && repeatMode === 'weekly') ? '' : 'none';
    if (mdRow) mdRow.style.display = (hasRepeat && repeatMode === 'monthly') ? '' : 'none';
    const mdLbl = document.getElementById('repeat-anchor-monthday-label-text') as any;
    if (mdLbl) mdLbl.style.display = (hasRepeat && repeatMode === 'monthly') ? '' : 'none';

    // Populate time via SegmentedInput
    const nativeTimeInput = document.getElementById('repeat-anchor-time') as any;
    if (nativeTimeInput) {
        nativeTimeInput.value = anchorTime || '';
        if (segInputs['repeat-anchor-time']) segInputs['repeat-anchor-time'].syncFromInput();
    }

    // Populate weekday picker
    const WD_NAMES = ['','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
    if (wdSelect) wdSelect.value = anchorDay || '';
    if (wdLabel)  wdLabel.textContent = anchorDay ? (WD_NAMES[anchorDay] || 'Любой день') : 'Любой день';
    document.querySelectorAll<HTMLElement>('#repeat-wd-list .dl-month-option').forEach(opt => {
        opt.classList.toggle('active', (opt.dataset.value || '') === String(anchorDay || ''));
    });

    // Populate monthday stepper
    const mdInput = document.getElementById('repeat-anchor-monthday') as any;
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
    document.querySelectorAll<HTMLElement>('#modal-repeat-selector .repeat-modal-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.repeat === cur)
    );
    _populateRepeatAnchor(cur, task.repeatAnchorTime || '', parseInt(task.repeatAnchorDay) || 0, parseInt(task.repeatAnchorMonthday) || 0);
    openModalWithFocus('repeat-modal');
}

function closeRepeatModal(event?) {
    if (!event || event.target === document.getElementById('repeat-modal')) {
        closeModalWithAnim('repeat-modal', () => { editingTaskId = null; editingSubId = null; });
        if (!event) { editingTaskId = null; editingSubId = null; }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // ── Repeat button grid ────────────────────────────────────────────────────
    document.getElementById('modal-repeat-selector').addEventListener('click', e => {
        const btn = (e.target as any).closest('.repeat-modal-btn');
        if (!btn) return;
        const newRepeat = btn.dataset.repeat;

        document.querySelectorAll<HTMLElement>('#modal-repeat-selector .repeat-modal-btn').forEach(b =>
            b.classList.toggle('active', b === btn)
        );
        const section = document.getElementById('repeat-anchor-section') as any;
        const wdRow = document.getElementById('repeat-anchor-weekday-row') as any;
        const mdRow = document.getElementById('repeat-anchor-monthday-row') as any;
        if (section) section.style.display = newRepeat !== 'none' ? '' : 'none';
        if (wdRow)   wdRow.style.display   = newRepeat === 'weekly'  ? '' : 'none';
        if (mdRow)   mdRow.style.display   = newRepeat === 'monthly' ? '' : 'none';
        const mdLbl2 = document.getElementById('repeat-anchor-monthday-label-text') as any;
        if (mdLbl2)  mdLbl2.style.display  = newRepeat === 'monthly' ? '' : 'none';
    });

    // ── Confirm button ────────────────────────────────────────────────────────
    const confirmBtn = document.getElementById('btn-confirm-repeat') as any;
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const activeBtn = document.querySelector<HTMLElement>('#modal-repeat-selector .repeat-modal-btn.active');
            if (!activeBtn) return;
            const newRepeat  = activeBtn.dataset.repeat;

            // Read time via SegmentedInput
            const anchorTime = segInputs['repeat-anchor-time']
                ? (segInputs['repeat-anchor-time'].getValue() || '').trim()
                : ((document.getElementById('repeat-anchor-time') as HTMLInputElement)?.value || '').trim();
            const anchorDay      = parseInt((document.getElementById('repeat-anchor-day') as HTMLInputElement)?.value || '') || 0;
            const anchorMonthday = parseInt((document.getElementById('repeat-anchor-monthday') as HTMLInputElement)?.value || '') || 0;

            // Build human-readable label for toast (problem 5)
            const _toastLabel = () => {
                const label = getRepeatAnchorLabel(newRepeat, anchorTime || null, anchorDay || null, anchorMonthday || null);
                if (newRepeat === 'none') return 'Повтор отключён';
                return `Круговорот: ${repeatLabel(newRepeat)}${label ? ` · ${label}` : ''}`;
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
                globalThis._formSubRepeatIdx = null;
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
                    const repeatBtn = subItem.querySelector<HTMLElement>('.sub-repeat-btn');
                    if (repeatBtn) {
                        const repeatSet = sub.repeat !== 'none';
                        repeatBtn.classList.toggle('active', repeatSet);
                        const anchorLabel = getRepeatAnchorLabel(sub.repeat, sub.repeatAnchorTime, sub.repeatAnchorDay, sub.repeatAnchorMonthday);
                        repeatBtn.title = repeatSet
                            ? `Круговорот: ${repeatLabel(sub.repeat)}${anchorLabel ? ` · ${anchorLabel}` : ''} — нажмите чтобы изменить`
                            : 'Назначить круговорот';
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
    const repeatWdList = document.getElementById('repeat-wd-list') as any;
    const repeatWdTrigger = document.getElementById('repeat-wd-trigger') as any;
    const repeatWdPicker = document.getElementById('repeat-wd-picker') as any;
    const repeatWdSelect = document.getElementById('repeat-anchor-day') as any;
    const repeatWdLabel = document.getElementById('repeat-wd-label') as any;
    const WD_NAMES = ['','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];

    if (repeatWdTrigger && repeatWdPicker) {
        repeatWdTrigger.addEventListener('click', () => {
            const isNowOpen = !repeatWdPicker.classList.contains('open');
            if (isNowOpen) {
                // Determine if list should open upward to avoid viewport clipping
                // (bounded by the scrollable modal's top edge — see _pickerOpenUp)
                repeatWdPicker.classList.toggle('open-up', _pickerOpenUp(repeatWdTrigger, 290 /* ~8 options */));
            }
            repeatWdPicker.classList.toggle('open');
            repeatWdTrigger.setAttribute('aria-expanded', repeatWdPicker.classList.contains('open'));
            repeatWdList?.setAttribute('aria-hidden', !repeatWdPicker.classList.contains('open'));
        });
    }
    if (repeatWdList) {
        repeatWdList.addEventListener('click', e => {
            const opt = (e.target as any).closest('.dl-month-option');
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
    const formColorPicker = document.getElementById('form-color-picker') as any;
    if (formColorPicker) {
        formColorPicker.addEventListener('click', e => {
            const sw = (e.target as any).closest('.form-color-swatch');
            if (!sw) return;
            _setFormColor(sw.dataset.color || null);
        });
    }
});

// ============================================================
//  ACCESSIBILITY HELPERS
// ============================================================

/** Announce a message to screen readers via the live region. */
globalThis._announceRafId = null;
function announce(msg) {
    const lr = document.getElementById('live-region') as any;
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
    (overlay as any)._returnFocus = document.activeElement;   // remember caller

    overlay.style.display = 'flex';

    // Focus first focusable element after the animation starts.
    // F2 (coarse): focus the dialog panel itself instead — programmatic focus
    // on the first button painted a focus ring on every open (same defect the
    // action sheets had). Keyboard/desktop keeps the first-control focus.
    requestAnimationFrame(() => {
        const focusable: any[] = Array.from(overlay.querySelectorAll(FOCUSABLE));
        if (IS_COARSE) {
            const panel: any = overlay.querySelector('.modal') || overlay;
            panel.tabIndex = -1;
            panel.focus({ preventScroll: true });
        } else if (focusable.length) focusable[0].focus();

        // Install focus trap
        (overlay as any)._trapHandler = (e) => {
            if (e.key !== 'Tab') return;
            const els: any[] = Array.from(overlay.querySelectorAll(FOCUSABLE));
            if (!els.length) return;
            const first = els[0], last = els[els.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
            }
        };
        overlay.addEventListener('keydown', (overlay as any)._trapHandler);
    });
}

// ============================================================
//  MODAL CLOSE HELPER
//  Adds .closing class → waits for CSS modalOut animation → hides overlay.
//  Removes focus trap and returns focus to the triggering element.
// ============================================================
function closeModalWithAnim(overlayId, onAfterClose?) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;

    // Already hidden — nothing to do
    if (overlay.style.display === 'none') return;

    // Remove focus trap
    if ((overlay as any)._trapHandler) {
        overlay.removeEventListener('keydown', (overlay as any)._trapHandler);
        (overlay as any)._trapHandler = null;
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
        if ((overlay as any)._returnFocus && typeof (overlay as any)._returnFocus.focus === 'function') {
            (overlay as any)._returnFocus.focus();
            (overlay as any)._returnFocus = null;
        }
        if (onAfterClose) onAfterClose();
    };

    // Use animationend on the inner .modal element (the one that runs modalOut)
    const modalEl = overlay.querySelector<HTMLElement>('.modal');
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
    'deadline-modal':      (...a) => closeDeadlineModal(...a),   // 7c split: closeDeadlineModal в dusk/06 (грузится позже) → ленивая ссылка

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
    const ov: any = (e.target as any).classList && (e.target as any).classList.contains('modal-overlay') ? e.target : null;
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
        colorPicker.querySelectorAll<HTMLElement>('.color-swatch').forEach(s =>
            s.classList.toggle('active', s.dataset.color === selectedColor)
        );
    }
    _grgbSyncFromColor(selectedColor, 'group'); // position the spectrum on the chosen colour
}

function closeGroupModal(event?) {
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
    showToast(`Свод «${name}» создан`);
}


function toggleGroupCollapse(id) {
    const section = document.querySelector(`[data-group-id="${id}"]`);
    if (!section) return;
    const body = section.querySelector<HTMLElement>('.group-body');
    if (!body) return;

    // 3a FIX: use section.collapsed as the AUTHORITATIVE state, not body.expanded.
    // body.expanded lags behind (removed only in transitionend), causing double-fire
    // on rapid re-click while animation is in progress.
    const isCurrentlyCollapsed = section.classList.contains('collapsed');

    // S1-5: cancel any in-flight finisher before starting a new animation.
    if ((body as any)._collapseCancel) { (body as any)._collapseCancel(); (body as any)._collapseCancel = null; }

    if (isCurrentlyCollapsed) {
        // ── Expand ──────────────────────────────────────────────────────────
        section.classList.remove('collapsed');           // ← source of truth first
        body.classList.add('expanded');
        body.classList.remove('unlocked');
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.opacity   = '1';

        (body as any)._collapseCancel = onMaxHeightEnd(body, () => {
            (body as any)._collapseCancel = null;
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

        (body as any)._collapseCancel = onMaxHeightEnd(body, () => {
            (body as any)._collapseCancel = null;
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
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.group-section[data-group-id]'));
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
    const btn = document.getElementById('btn-collapse-all') as any;
    if (!btn) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.group-section[data-group-id]'));
    if (!sections.length) { btn.style.display = 'none'; return; }
    btn.style.display = '';

    // 3b FIX: check section.collapsed (set immediately), not body.expanded (set after animation).
    const allCollapsed = sections.every(s => s.classList.contains('collapsed'));

    // 3b: highlight button when all groups are collapsed (= "expand all" action available)
    btn.classList.toggle('active', allCollapsed);
    // 3c: tooltip describes what the NEXT click will do
    btn.title = allCollapsed ? 'Развернуть все своды' : 'Свернуть все своды';
}

// ---- Group rename ----
function openRenameGroupModal(id) {
    renamingGroupId = id;
    const group = state.groups.find(g => g.id === id);
    if (!group) return;
    const inp = document.getElementById('rename-group-input') as any;
    inp.value = group.name;
    openModalWithFocus('rename-group-modal');
    // Select input text after focus trap fires
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { if (inp) { inp.focus(); inp.select(); } });
    });
}

function closeRenameGroupModal(event?) {
    if (!event || event.target === document.getElementById('rename-group-modal')) {
        closeModalWithAnim('rename-group-modal', () => { renamingGroupId = null; });
        if (!event) renamingGroupId = null;
    }
}

function confirmRenameGroup() {
    const name = (document.getElementById('rename-group-input') as HTMLInputElement).value.trim();
    if (!name) {
        const inp = document.getElementById('rename-group-input') as any;
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
    showToast('Свод переименован');
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
    const s = (e.target as any).closest('.color-swatch');
    if (!s) return;
    _setGroupColor(s.dataset.color);   // P-fix#2: highlights preset + moves the spectrum thumb
});

groupNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddGroup(); });

// group selector is now handled by chip buttons (selectGroupChip)

// ── ES-module bridge (migration 2a), part 2: consts/classes ─────────────────
// (mutable top-level let/var declarations were converted to globalThis.* so
//  every module reads AND writes the same slot — no stale copies).
Object.assign(globalThis, {
    NOTE_MAX, TASK_NOTE_MAX, FOCUSABLE, MODAL_CLOSERS,
});
