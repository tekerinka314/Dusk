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

// In-place reconciliation: make `parent`'s element children exactly `desired` (an
// array of nodes) in order, WITHOUT removing/re-inserting nodes already in place.
// This kills the per-render repaint FLASH: the old render wiped the list with
// innerHTML='' every time, so every card / group frame (and its backdrop-filter
// blur) was torn down and re-inserted → a visible flicker on EVERY action. Now an
// unchanged card or group is left physically untouched; only what actually changed
// is replaced/moved/removed.
function _reconcile(parent, desired) {
    const want = new Set(desired);
    for (let i = parent.childNodes.length - 1; i >= 0; i--) {
        const n = parent.childNodes[i];
        if (n.nodeType !== 1 || !want.has(n)) parent.removeChild(n);
    }
    for (let i = 0; i < desired.length; i++) {
        const node = desired[i];
        if (parent.children[i] !== node) parent.insertBefore(node, parent.children[i] || null);
    }
}

// Inner HTML of a group header (everything inside .group-header, not the body UL).
// Rebuilt in place on a reused section shell — the header has no backdrop-filter so
// replacing its content does not flash, while the section frame itself stays put.
function _groupHeaderHTML(group, done, total, grpSched, grpSortMode, hasOverride) {
    return `
                <div class="group-drag-handle" data-act="noop" title="Перетащить группу">${IC.drag}</div>
                <div class="group-color-dot" style="background:${group.color}"></div>
                <span class="group-title">${escHtml(group.name)}</span>
                <span class="group-count">${done}/${total}</span>
                <div class="group-actions" data-act="noop">
                    <button class="btn-group-action${grpSched ? ' active-sched' : ''}"
                            data-act="toggleScheduleMode" title="Сортировка по дедлайну">${IC.sundial}</button>
                    ${_groupSortPicker(group.id, grpSortMode, hasOverride)}
                    <button class="btn-group-action${focusGroupId === group.id ? ' active-sched' : ''}"
                            data-act="toggleFocusGroup" title="${focusGroupId === group.id ? 'Снять фокус' : 'Фокус на этой группе'}">${IC.focusMode}</button>
                    <button class="btn-group-action" data-act="duplicateGroup" title="Дублировать группу">${IC.twinCoffin}</button>
                    <button class="btn-group-action" data-act="openRenameGroupModal" title="Переименовать">${IC.quill}</button>
                    <button class="btn-group-action danger" data-act="deleteGroup" title="Удалить группу">${IC.tombstone}</button>
                </div>
                <span class="group-chevron">${IC.sword}</span>`;
}

// Gothic zone glyphs (active = candle, done = coffin). Lifted verbatim from
// appendSplitSection so the reconciling split renderer below draws the same headers.
const _SPLIT_ACTIVE_ICON = `<svg viewBox="0 0 14 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6.5C7 6.5 5 5 5 3.2C5 2 5.8 1.2 6.5 1C6.5 1 6 2.2 7 3C8 2 8.5 1 8.5 1C9.5 1.5 9 3 9 3.2C9 5 7 6.5 7 6.5Z" fill="currentColor" stroke="none" opacity="0.7"/><rect x="4.5" y="6.5" width="5" height="9" rx="0.7"/><line x1="3" y1="15.5" x2="11" y2="15.5" stroke-width="1.2"/><line x1="7" y1="6.5" x2="7" y2="7.5"/></svg>`;
const _SPLIT_DONE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 3 H15.5 L18 10 L14.5 21 H9.5 L6 10 Z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9.5" y1="10.5" x2="14.5" y2="10.5"/></svg>`;

// Ensure a split zone (header <li> + wrap <li> ▸ body <ul>) exists inside `container`,
// reusing the LIVE nodes when present (keyed by data-zonekey). Returns {header,wrap,body};
// the caller reconciles cards into `.body`. Bug B: this is what lets split mode keep its
// card / subtask DOM across renders instead of the old innerHTML='' teardown.
function _ensureSplitZone(container, spec) {
    let header = container.querySelector(`:scope > [data-zonekey="${spec.zoneKey}"]`);
    let wrap, body;
    if (header) {
        wrap = header.nextElementSibling;
        body = wrap.querySelector('ul');
        const lbl = header.querySelector('span');   // refresh count only — keep the SVGs
        if (lbl) lbl.textContent = spec.label;
    } else {
        const ckey = spec.collapseKey;
        header = document.createElement('li');
        header.className = spec.headerClass;
        header.dataset.zonekey = spec.zoneKey;
        if (spec.headerAttr) header.setAttribute(spec.headerAttr[0], spec.headerAttr[1]);
        header.innerHTML = `${spec.icon}<span>${spec.label}</span>${_PIN_HDR_CHEVRON}`;
        wrap = document.createElement('li');
        wrap.className = spec.wrapClass;
        wrap.style.cssText = 'list-style:none;padding:0;margin:0;';
        body = document.createElement('ul');
        body.className = spec.bodyClass;
        if (spec.bodyStyle) body.style.cssText = spec.bodyStyle;
        wrap.appendChild(body);
        const theWrap = wrap;
        header.onclick = () => {
            const c = header.classList.toggle('collapsed');
            localStorage.setItem(ckey, c ? '1' : '0');
            theWrap.classList.toggle('collapsed', c);
        };
    }
    header.classList.toggle('collapsed', spec.collapsed);
    wrap.classList.toggle('collapsed', spec.collapsed);
    if (spec.bodyData) for (const k in spec.bodyData) body.dataset[k] = spec.bodyData[k];
    return { header, wrap, body };
}

// Ensure a plain keyed element (a zone <ul> or a separator <li>) exists inside
// `container`, reusing the live one when present so its card children survive across
// renders — the schedule-mode analogue of _ensureSplitZone.
function _ensureKeyed(container, key, tag) {
    let el = container.querySelector(`:scope > [data-zonekey="${key}"]`);
    if (!el) { el = document.createElement(tag); el.dataset.zonekey = key; }
    return el;
}

// Pinned tasks for a context as reconcilable nodes. Mirrors appendPinnedBlock's branch:
// split mode → a collapsible gothic "Закреплённые" zone (header+wrap, body reconciled);
// otherwise plain cards. Returns the ordered nodes for the caller's _reconcile.
function _pinnedNodes(container, pinned, gid, showDl) {
    if (!pinned.length) return [];
    if (!isGroupSplitMode) return pinned.map(t => createTaskEl(t, showDl && !!t.deadline));
    const key = 'pinned_' + (gid != null ? gid : 'ung');
    const z = _ensureSplitZone(container, {
        zoneKey: key,
        headerClass: 'split-zone-header split-pinned-header',
        icon: IC.pin,
        label: `Закреплённые · ${pinned.length}`,
        wrapClass: 'split-pinned-wrap',
        bodyClass: 'split-pinned-body',
        bodyData: { sortableGroup: 'split_active', groupId: gid != null ? String(gid) : '', zonePinned: '1' },
        collapseKey: 'groupSplit_' + key,
        collapsed: localStorage.getItem('groupSplit_' + key) === '1',
    });
    _reconcile(z.body, pinned.map(t => createTaskEl(t, showDl && !!t.deadline)));
    return [z.header, z.wrap];
}

// Active/done split zones for `tasks` inside `container`, reconciled in place. Returns
// the ordered [header,wrap,...] nodes for the caller's own _reconcile. `splitKey` matches
// appendSplitSection's collapse-state keys (may carry a _dl/_ndl suffix in combined mode).
// The active-zone Sortable pool is isolated per deadline-zone when nested in a combined
// sched-split-inner UL (matches appendSplitSection's isCombo branch).
function _splitZoneNodes(container, tasks, splitKey, gid, showDl) {
    const out = [];
    const active = tasks.filter(t => !t.checked && !t.cycleChecked);
    const done   = tasks.filter(t =>  t.checked ||  t.cycleChecked);
    const activeGroup = container.dataset.zoneDl !== undefined
        ? (container.dataset.zoneDl === '1' ? 'combo_active_dl' : 'combo_active_ndl')
        : 'split_active';
    if (active.length) {
        const z = _ensureSplitZone(container, {
            zoneKey: 'active_' + splitKey,
            headerClass: 'split-zone-header split-active-header',
            icon: _SPLIT_ACTIVE_ICON,
            label: `Активные · ${active.length}`,
            wrapClass: 'split-active-wrap',
            bodyClass: 'split-active-body',
            bodyData: { sortableGroup: activeGroup, groupId: gid != null ? String(gid) : '' },
            collapseKey: 'groupSplit_active_' + splitKey,
            collapsed: localStorage.getItem('groupSplit_active_' + splitKey) === '1',
        });
        _reconcile(z.body, active.map(t => createTaskEl(t, showDl && !!t.deadline)));
        out.push(z.header, z.wrap);
    }
    if (done.length) {
        const z = _ensureSplitZone(container, {
            zoneKey: 'done_' + splitKey,
            headerClass: 'split-zone-header split-done-header',
            headerAttr: ['data-split-key', String(splitKey)],
            icon: _SPLIT_DONE_ICON,
            label: `Выполненные · ${done.length}`,
            wrapClass: 'split-done-wrap',
            bodyClass: 'split-done-body',
            bodyStyle: 'list-style:none',
            bodyData: { zoneDone: '1' },
            collapseKey: 'groupSplit_done_' + splitKey,
            collapsed: localStorage.getItem('groupSplit_done_' + splitKey) === '1',
        });
        _reconcile(z.body, done.map(t => createTaskEl(t, false)));
        out.push(z.header, z.wrap);
    }
    return out;
}

// Pure-split body (pinned + active/done) — reconciled instead of appendSplitSection's
// teardown. Only the toggled card migrates between zones; every other card / subtask /
// Sortable is left physically in place.
function _renderSplitBody(container, pinned, rest, gid, query) {
    const showDl  = scheduleActive(gid);
    const desired = _pinnedNodes(container, pinned, gid, showDl);
    const sorted  = filterAndSort(rest, query, gid);
    desired.push(..._splitZoneNodes(container, sorted, String(gid), gid, showDl));
    _reconcile(container, desired);
}

// Schedule-only body (pinned + "С дедлайном"/"Без дедлайна" zones) — reconciled instead
// of appendScheduleSection's teardown. Deadline cards still rebuild when their live
// countdown ticks (correct), but unchanged cards and the zone scaffold persist.
function _renderScheduleBody(container, pinned, rest, gid, query) {
    const showDl  = scheduleActive(gid);
    const desired = _pinnedNodes(container, pinned, gid, showDl);
    const { withDl, noDl } = filterAndSortDeadline(rest, query);
    const hasBoth = withDl.length > 0 && noDl.length > 0;
    if (withDl.length) {
        if (hasBoth) {
            const sep = _ensureKeyed(container, 'sched_sep_dl_' + gid, 'li');
            sep.className = 'dl-subgroup-header';
            sep.innerHTML = `<span>${IC.sundial}<span>С дедлайном · ${withDl.length}</span></span>`;
            desired.push(sep);
        }
        const dlUl = _ensureKeyed(container, 'sched_dl_' + gid, 'ul');
        dlUl.className = 'sched-zone-ul';
        dlUl.dataset.sortableGroup = 'sched_dl';
        dlUl.dataset.zoneDl        = '1';
        dlUl.dataset.groupId       = gid != null ? String(gid) : '';
        _reconcile(dlUl, withDl.map(t => createTaskEl(t, true)));
        desired.push(dlUl);
    }
    if (noDl.length) {
        if (hasBoth) {
            const sep2 = _ensureKeyed(container, 'sched_sep_ndl_' + gid, 'li');
            sep2.className = 'dl-subgroup-header dl-subgroup-nodl';
            sep2.innerHTML = `<span>${IC.moon}<span>Без дедлайна · ${noDl.length}</span></span>`;
            desired.push(sep2);
        }
        const ndlUl = _ensureKeyed(container, 'sched_ndl_' + gid, 'ul');
        ndlUl.className = 'sched-zone-ul';
        ndlUl.dataset.sortableGroup = 'sched_ndl';
        ndlUl.dataset.zoneDl        = '0';
        ndlUl.dataset.groupId       = gid != null ? String(gid) : '';
        _reconcile(ndlUl, noDl.map(t => createTaskEl(t, false)));
        desired.push(ndlUl);
    }
    _reconcile(container, desired);
}

// Combined schedule+split body — reconciled instead of appendScheduleSplitSection's
// teardown. With only one deadline class, the active/done zones sit directly in the body;
// with both, each deadline class gets its own sched-split-inner UL holding its split zones.
function _renderScheduleSplitBody(container, pinned, rest, gid) {
    const showDl  = scheduleActive(gid);
    const desired = _pinnedNodes(container, pinned, gid, showDl);
    const { withDl, noDl } = filterAndSortDeadline(rest, '');
    const hasBoth = withDl.length > 0 && noDl.length > 0;
    if (!hasBoth) {
        const all      = withDl.length ? withDl : noDl;
        const splitKey = gid + (withDl.length ? '_dl' : '_ndl');
        desired.push(..._splitZoneNodes(container, all, splitKey, gid, showDl));
    } else {
        const sepDl = _ensureKeyed(container, 'combo_sep_dl_' + gid, 'li');
        sepDl.className = 'dl-subgroup-header';
        sepDl.innerHTML = `<span>${IC.sundial}<span>С дедлайном · ${withDl.length}</span></span>`;
        const innerDl = _ensureKeyed(container, 'combo_inner_dl_' + gid, 'ul');
        innerDl.className = 'sched-split-inner';
        innerDl.dataset.zoneDl  = '1';
        innerDl.dataset.groupId = gid != null ? String(gid) : '';
        _reconcile(innerDl, _splitZoneNodes(innerDl, withDl, gid + '_dl', gid, showDl));
        desired.push(sepDl, innerDl);

        const sepNdl = _ensureKeyed(container, 'combo_sep_ndl_' + gid, 'li');
        sepNdl.className = 'dl-subgroup-header dl-subgroup-nodl';
        sepNdl.innerHTML = `<span>${IC.moon}<span>Без дедлайна · ${noDl.length}</span></span>`;
        const innerNdl = _ensureKeyed(container, 'combo_inner_ndl_' + gid, 'ul');
        innerNdl.className = 'sched-split-inner';
        innerNdl.dataset.zoneDl  = '0';
        innerNdl.dataset.groupId = gid != null ? String(gid) : '';
        _reconcile(innerNdl, _splitZoneNodes(innerNdl, noDl, gid + '_ndl', gid, showDl));
        desired.push(sepNdl, innerNdl);
    }
    _reconcile(container, desired);
}

// Bug B: cross-render DOM reuse caches, set at the top of each renderTasks() pass
// and read by createTaskEl. _liCache = whole task cards (an unchanged card is reused
// in place); _subCache = subtask sections (reused inside a card that IS rebuilt).
let _subCache = null;
let _liCache  = null;
function renderTasks() {
    // D-4: if a per-group sort picker is open, its <body>-portaled list would be
    // orphaned (left floating) when we wipe the list below. Close it first — while
    // the owning picker is still connected, so the list restores cleanly before the
    // rebuild. No-op when nothing is open.
    _closeSortPicker();
    // Bug B: harvest live .subtask-section nodes BEFORE wiping the list, keyed by task
    // id. createTaskEl reuses the one whose data-derived HTML is unchanged instead of
    // rebuilding it — so checking/unchecking a parent (which never touches subtasks)
    // no longer rebuilds subtask DOM / Sortable / open note panels.
    _subCache = new Map();
    document.querySelectorAll('.subtask-section').forEach(sec => {
        const m = sec.id && sec.id.match(/^sub-section-(\d+)$/);
        if (m) _subCache.set(parseInt(m[1]), sec);
    });
    _liCache = new Map();
    document.querySelectorAll('.task-item[data-id]').forEach(li => {
        const id = parseInt(li.dataset.id);
        if (!isNaN(id)) _liCache.set(id, li);
    });
    const query = searchQuery.toLowerCase();

    // ── Ungrouped tasks ──────────────────────────────────────────────────────
    // Shown only when not focused on a specific group. In NORMAL mode the cards are
    // direct children of listContainer → reconcile them in place (no teardown → no
    // flash). Schedule / split modes build nested zones, so they keep the simple
    // rebuild — a rarer, deliberate toggle, identical behaviour to before.
    if (focusGroupId === null) {
        const ung = state.tasks.filter(t => !t.groupId);
        // Pinned float to the top of the "no group" context (above everything here).
        const { pinned, rest } = extractPinned(ung, query);
        if (scheduleActive(null)) {
            // Schedule mode — reconciled deadline zones (ungrouped never splits active/done).
            _renderScheduleBody(listContainer, pinned, rest, null, query);
        } else {
            // Normal AND split modes reconcile in place. The ungrouped REST is a plain
            // list either way (only the pinned block differs: split → gothic zone).
            const desired = _pinnedNodes(listContainer, pinned, null, false);
            filterAndSort(rest, query, null).forEach(t => desired.push(createTaskEl(t, false)));
            _reconcile(listContainer, desired);
        }
    } else {
        listContainer.innerHTML = '';   // focus mode hides the ungrouped context
    }

    // ── Groups ───────────────────────────────────────────────────────────────
    // Reuse each group's SECTION shell across renders (keyed by groupId) so the
    // blurred group frame is NEVER torn down — that teardown was the visible "whole
    // group flickers" flash. Harvest the live sections first.
    const _secCache = new Map();
    Array.from(groupsContainer.children).forEach(sec => {
        if (sec.classList && sec.classList.contains('group-section') && sec.dataset.groupId)
            _secCache.set(parseInt(sec.dataset.groupId), sec);
    });
    const desiredSections = [];

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

        // Reuse this group's section shell, or forge a fresh skeleton (header + body UL).
        let section = _secCache.get(group.id);
        if (section) {
            _secCache.delete(group.id);
        } else {
            section = document.createElement('div');
            section.dataset.groupId = group.id;
            section.innerHTML =
                `<div class="group-header" data-act="toggleGroupCollapse"></div>` +
                `<ul class="task-list group-body" id="group-list-${group.id}"></ul>`;
        }
        section.className = 'group-section' + (collapsed ? ' collapsed' : '') +
                            (focusGroupId === group.id ? ' group-focused' : '');

        // Rebuild the header ONLY when its structure changed (name/colour/mode/sort),
        // which avoids re-parsing its SVG icons on every render. The done/total count
        // changes on each check, so update just that span surgically — no header churn.
        const header    = section.querySelector('.group-header');
        const _structSig = [group.name, group.color, grpSched, grpSortMode,
                            hasOverride, focusGroupId === group.id].join('\x1f');
        if (header._structSig !== _structSig) {
            header.innerHTML  = _groupHeaderHTML(group, done, total, grpSched, grpSortMode, hasOverride);
            header._structSig = _structSig;
        } else {
            const countEl = header.querySelector('.group-count');
            if (countEl) countEl.textContent = `${done}/${total}`;
        }

        const ul = section.querySelector('.group-body');
        ul.id = 'group-list-' + group.id;   // idempotent on reuse, needed on a fresh skeleton
        ul.style.maxHeight = '';            // drop any inline height left by a collapse animation

        // Pinned float to the top of THIS group, above its active/done/schedule zones.
        const { pinned, rest } = extractPinned(grouped, query);

        // Every mode now reconciles IN PLACE (Bug B): the zone scaffold + card + subtask
        // nodes survive across renders, so any action rebuilds only the touched card.
        if (effSched && isGroupSplitMode) {
            _renderScheduleSplitBody(ul, pinned, rest, group.id);
        } else if (effSched) {
            _renderScheduleBody(ul, pinned, rest, group.id, '');
        } else if (isGroupSplitMode) {
            _renderSplitBody(ul, pinned, rest, group.id, query);
        } else {
            // Normal mode: cards are direct children → reconcile in place.
            const desired = _pinnedNodes(ul, pinned, group.id, false);
            filterAndSort(rest, query, group.id).forEach(t => desired.push(createTaskEl(t, false)));
            _reconcile(ul, desired);
        }

        // Toggle ONLY the dynamic open/collapse classes (no wholesale className reset),
        // so a group that stays open keeps max-height:none with no momentary collapse.
        ul.classList.toggle('expanded', !collapsed);
        ul.classList.toggle('unlocked', !collapsed);

        desiredSections.push(section);
    }); // end state.groups.forEach

    _reconcile(groupsContainer, desiredSections);
    _subCache = null;   // Bug B: end of pass — drop refs to any unclaimed (detached) nodes
    _liCache  = null;
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
function _taskSortOptions(curK, gid) {
    const gidAttr = (gid != null) ? ` data-gid="${gid}"` : '';   // present → per-group override; absent → global toolbar
    return TASK_SORTS.map(s =>
        `<div class="dl-month-option task-sort-opt${s.k === curK ? ' active' : ''}" role="option" aria-selected="${s.k === curK}" data-act="sortOpt" data-k="${s.k}"${gidAttr}>`
        + `<span class="tso-ic">${_taskSortIcon(s.k)}</span><span class="tso-label">${s.label}</span></div>`
    ).join('');
}
// Per-group picker markup (string) injected into the group header.
function _groupSortPicker(groupId, curK, hasOverride) {
    return `<span class="task-sort grp-sort dl-month-picker">
        <button class="btn-group-action btn-group-sort${hasOverride ? ' sort-overridden' : ''}" type="button"
                data-act="toggleSortPicker" aria-haspopup="listbox" aria-expanded="false"
                title="Сортировка: ${_taskSortLabel(curK).toLowerCase()}">${_taskSortIcon(curK)}</button>
        <div class="dl-month-list task-sort-list" role="listbox" aria-hidden="true">${_taskSortOptions(curK, groupId)}</div>
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
    if (list) list.innerHTML = _taskSortOptions(state.sortMode, null);   // null gid → toolbar (global) sort
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
        <button type="button" role="menuitem" data-act="snoozeDeadline" data-id="${id}" data-snz="1h">${IC.snooze}<span>+1 час</span></button>
        <button type="button" role="menuitem" data-act="snoozeDeadline" data-id="${id}" data-snz="tomorrow">${IC.moon}<span>До завтра</span></button>
        <button type="button" role="menuitem" data-act="snoozeDeadline" data-id="${id}" data-snz="week">${IC.sundial}<span>+1 неделя</span></button>
        <div class="snooze-custom">
            <input type="number" class="snooze-custom-input" id="snooze-custom-n" min="1" max="999" placeholder="N"
                   data-actkey="snoozeCustomKey" data-id="${id}">
            <div class="snooze-units">
                <button type="button" class="snooze-unit active" data-u="h" data-act="_snoozeUnitPick">ч</button>
                <button type="button" class="snooze-unit" data-u="d" data-act="_snoozeUnitPick">дн</button>
                <button type="button" class="snooze-unit" data-u="w" data-act="_snoozeUnitPick">нед</button>
            </div>
            <button type="button" class="snooze-custom-go" data-act="_snoozeCustomApply" data-id="${id}">ОК</button>
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
                data-act="setColorFilter" data-color="${escHtml(c)}"
                aria-label="Цвет ${c}"
                title="Цвет ${c}">
            ${colorFilter === c
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.8" stroke-linecap="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>`
                : ''}
        </button>`).join('');

    // Gothic "extinguish" clear button — only shown when a filter is active
    const clearBtn = colorFilter ? `
        <button class="color-filter-swatch color-filter-clear"
                data-act="setColorFilter" data-color="${escHtml(colorFilter)}"
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
                    data-act="bulkSetGroup" data-gid="${g.id}">${escHtml(g.name)}</button>`;
    }).join('');
    cont.innerHTML = `${pills}<button class="bulk-group-pill bulk-group-none" data-act="bulkSetGroup">Без группы</button>`;
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
            <button class="btn-pill-delete" style="background:${bg};color:${g.color};border-color:${bd}" data-actover="hoverBg" data-actout="outBg" data-bg="${bg}" data-bghov="${bgHov}" data-act="deleteGroupById" data-gid="${g.id}" title="Удалить группу">${IC.tombstone}</button>`;
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

    let html = `<div class="dl-month-option grp-dd-opt grp-dd-none${currentGid === '' ? ' active' : ''}" role="option" data-gid="" data-act="selectGroupChip" data-chip="">${IC.noneMoonL}<span>без группы</span>${IC.noneMoonR}</div>`;
    state.groups.forEach(g => {
        const isActive = String(g.id) === String(currentGid);
        html += `<div class="dl-month-option grp-dd-opt${isActive ? ' active' : ''}" role="option" data-gid="${g.id}" data-act="selectGroupChip" data-chip="${g.id}">
            <span class="grp-dd-dot" style="background:${g.color}"></span>
            <span class="grp-dd-name">${escHtml(g.name)}</span>
            <button class="grp-dd-del" type="button" data-gid="${g.id}" data-act="deleteGroupById" data-stop title="Удалить группу">${IC.tombstone}</button>
        </div>`;
    });
    html += `<div class="dl-month-option grp-dd-opt grp-dd-new" role="option" data-act="selectGroupChip" data-chip="__new__">${IC.crossAdd}<span class="grp-dd-name">Создать группу</span></div>`;
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
                    <button class="btn-task-action restore-btn" data-act="restoreTask" title="Восстановить">${IC.restore}</button>
                    <button class="btn-task-action danger" data-act="deleteFromArchive" title="Удалить навсегда">${IC.skull}</button>
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

