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
    // Toolbar stays ALWAYS visible — export/import/restore-points are needed even with
    // no tasks (e.g. importing a backup on a fresh device = the #1 portability case).
    toolbar.style.display         = 'flex';
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
// Rule (not a brittle whitelist): any prose text-entry surface sounds —
//   • any contenteditable region (grim-body + its children, grim-title-in,
//     inline task/subtask rename spans),
//   • any <textarea> (note-modal-input, …),
//   • <input> of a free-text type (text/search/url/email/tel/password).
// Structured pickers stay SILENT: number / time / date / range / file / color /
// hidden inputs, and the segmented time/date widgets (plain <span>s, not inputs).
function _penIsField(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;            // grim-body & children, grim-title-in, inline rename spans
    const tag = el.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
        const t = (el.getAttribute('type') || 'text').toLowerCase();
        return t === 'text' || t === 'search' || t === 'url' || t === 'email' || t === 'tel' || t === 'password';
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

    // opts.action = { label, html, onClick } renders a generic gothic action button
    // (same styling as undo). opts.persist keeps the toast up (no auto-hide);
    // opts.duration overrides the auto-hide delay.
    const hasBtn = !!opts.undo || !!opts.action;
    toast.classList.toggle('has-undo', hasBtn);
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
    } else if (opts.action) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'toast-undo-btn';
        btn.innerHTML = `${opts.action.html || ''}<span>${opts.action.label || ''}</span>`;
        btn.addEventListener('click', () => { _hideToast(); try { opts.action.onClick(); } catch (_) {} });
        toast.appendChild(btn);
    }

    toast.classList.add('show');

    // Mirror to screen-reader live region so assistive tech hears every toast
    announce(opts.undo ? `${msg}. Доступна отмена` : msg);

    // After display time, trigger vanish animation then clean up (persist = stays up).
    if (!opts.persist) {
        toastTimer = setTimeout(_hideToast, opts.duration || (hasBtn ? 5000 : 2400));
    }
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
    return html.replace(/\*([\wа-яёА-ЯЁ]+)/gu, '<span class="hashtag" data-act="filterByTag" data-tag="*$1">*$1</span>');
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
                        data-act="filterByTag" data-tag="${escHtml(tag)}"
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

