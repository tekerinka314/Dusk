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
        deadlineHtml = `<span class="meta-tag-wrap"><span class="${tc}" role="button" tabindex="0" title="Изменить дедлайн" data-act="openDeadlineModal" data-actkey="kactivate">${IC.window}<span class="dl-badge-inner">${cdHtml}<span class="dl-absolute">${absolute}</span></span></span><button class="btn-tag-clear" data-act="clearTaskDeadline" title="Убрать дедлайн">${IC.crossedSwords}</button></span>`;
    }

    // ── Repeat badge ──
    const rptAnchorLabel = getRepeatAnchorLabel(task.repeat, task.repeatAnchorTime, task.repeatAnchorDay, task.repeatAnchorMonthday);
    const rptHtml = (task.repeat && task.repeat !== 'none')
        ? `<span class="meta-tag-wrap"><span class="meta-tag repeat-tag" role="button" tabindex="0" title="Изменить повтор" data-act="openRepeatModal" data-actkey="kactivate">${IC.ouroboros}<span>${repeatLabel(task.repeat)}${rptAnchorLabel ? ` · ${rptAnchorLabel}` : ''}</span></span><button class="btn-tag-clear" data-act="clearTaskRepeat" title="Убрать повтор">${IC.crossedSwords}</button></span>` : '';

    // ── Note controls ──
    const hasNote = task.note && task.note.trim();
    // Single meta toggle (reads live DOM state): has note → show/hide the panel
    // (persisted in noteOpen); no note → open the panel straight into inline edit.
    const noteToggle = `<button class="btn-note-toggle${(hasNote && task.noteOpen) ? ' open' : ''}" id="note-toggle-${task.id}" data-pd data-act="toggleTaskNote" title="${hasNote ? (task.noteOpen ? 'Скрыть заметку' : 'Показать заметку') : 'Добавить заметку'}">${IC.sword}<span>заметка</span></button>`;

    // ── Subtask toggle + always-show-notes button ──
    const subs    = task.subtasks || [];
    const sDone   = subs.filter(s => s.checked || s.cycleChecked).length;
    const subLbl  = subs.length ? ` ${sDone}/${subs.length}` : '';
    const subToggle = `<button class="btn-subtask-toggle${task.subtasksOpen ? ' open' : ''}" data-tid="${task.id}" data-act="toggleSubtasksSection" title="Подпункты">${IC.sword}<span>подпункты${subLbl}</span></button>`;
    // Always-show-notes button: only rendered when there are subtasks that have notes
    const hasSubNotes = subs.some(s => s.note && s.note.trim());
    const subNotesAlwaysBtn = (subs.length > 0 && hasSubNotes)
        ? `<button class="btn-sub-notes-always${task.subNotesAlwaysOpen ? ' active' : ''}" data-tid="${task.id}" data-act="toggleSubNotesAlwaysOpen" title="${task.subNotesAlwaysOpen ? 'Скрыть все заметки' : 'Показать все заметки подпунктов'}">${IC.gothEye}</button>`
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
    const addNoteBtn = `<button class="btn-task-action${hasNote ? ' edit-note-btn' : ''}" id="note-modal-btn-${task.id}" data-act="${hasNote ? 'openEditNoteModal' : 'openNoteModal'}" title="${hasNote ? 'Изменить заметку в окне' : 'Заметка в окне'}">${hasNote ? IC.editNote : IC.addNote}</button>`;

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
                    data-act="toggleCheck"
                    role="checkbox"
                    aria-checked="${task.checked || task.cycleChecked ? 'true' : 'false'}"
                    aria-label="${escHtml(checkLabel)}"
                    title="${task.cycleChecked ? 'Нажмите, чтобы отменить · ' + escHtml(formatCycleUntil(task)) : task.checked ? 'Снять отметку' : 'Отметить выполненным'}"
                    >${checkEl}</button>
            <div class="drag-handle" aria-hidden="true">${IC.drag}</div>
        </div>
        <div class="task-content">
            <div class="task-head">
                <span class="task-text" data-id="${task.id}" spellcheck="false" title="Двойной клик — редактировать" data-actdbl="startInlineEdit">${displayText}</span>
                <div class="task-actions">
                    <button class="btn-task-action btn-pin${task.pinned ? ' active' : ''}" data-act="togglePin" title="${task.pinned ? 'Открепить' : 'Закрепить задачу'}">${IC.pin}</button>
                    <button class="btn-task-action btn-task-color" data-act="openTaskColorModal" title="Цветовая метка" style="${task.color ? `color:${taskInk}` : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 3L18 8L18 17L12 21L6 17L6 8Z" ${task.color ? `fill="${taskInk}" opacity="0.9"` : 'fill="none"'}/>
                            <line x1="12" y1="3" x2="12" y2="21" stroke-width="1" opacity="0.35"/>
                            <line x1="6" y1="8" x2="18" y2="8" stroke-width="1" opacity="0.35"/>
                            ${task.color ? '' : '<circle cx="12" cy="10.5" r="1.3" fill="currentColor" stroke="none" opacity="0.55"/>'}
                        </svg>
                    </button>
                    <button class="btn-task-action" data-act="openDeadlineModal" title="Дедлайн">${IC.window}</button>
                    ${task.deadline ? `<button class="btn-task-action btn-snooze" data-act="openSnoozeMenu" title="Отложить дедлайн">${IC.snooze}</button>` : ''}
                    <button class="btn-task-action" data-act="openRepeatModal" title="Повтор">${IC.ouroboros}</button>
                    <button class="btn-task-action" data-act="openPrioModal" title="Приоритет">${IC.spires}</button>
                    ${addNoteBtn}
                    <button class="btn-task-action btn-task-more" data-act="openTaskMoreMenu" title="Ещё действия" aria-haspopup="menu">${IC.more}</button>
                    <button class="btn-task-action archive-btn" data-act="removeTask" title="В архив">${IC.archive}</button>
                    <button class="btn-task-action danger" data-act="deleteTaskForever" title="Удалить навсегда">${IC.skull}</button>
                </div>
            </div>
            <div class="task-meta">${deadlineHtml}${rptHtml}${cycleUntilHtml}${noteToggle}${subToggle}${subNotesAlwaysBtn}</div>
            <div class="task-note-wrapper${(hasNote && task.noteOpen) ? ' visible' : ''}${hasNote ? ' has-note' : ''}" id="note-wrapper-${task.id}">
                <div class="task-note-inner">
                    <div class="task-note-text" id="note-${task.id}"
                         spellcheck="false" data-placeholder="начертайте примечание…"
                         aria-label="Заметка задачи"
                         data-actdbl="_taskNoteEdit"
                         data-actinput="_taskNoteInput"
                         data-actkey="_taskNoteKeydown"
                         data-actblur="_taskNoteCommit"
                         title="Двойной клик — редактировать">${hasNote ? noteDisplayHTML(task.note) : ''}</div>
                </div>
                <button class="btn-note-delete" id="note-del-${task.id}" data-act="_taskNoteDelete" title="Удалить заметку"${hasNote ? '' : ' style="display:none"'}>${IC.dagger}</button>
            </div>
            ${subsHtml}
        </div>`;

    // FIX-3: In mainSelectMode, clicking free space (outside actions/check/drag) toggles selection
    if (mainSelectMode) {
        li.addEventListener('click', e => {
            if (e.target.closest('.task-actions, .task-check-col, [contenteditable="true"], .inline-note-input, .btn-note-delete, .sub-check, .sub-prio-btn, .sub-actions, [data-act]')) return;
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
                       data-actkey="subAddKey">
                <button class="btn-subtask-confirm" data-act="addSubtask" title="Добавить">
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
    let subs = sortSubtasks(task.subtasks || []);
    // "Только невыполненные": the filter that hides finished TASKS must also hide
    // finished SUBTASKS — in both the standard 2-column grid and the split
    // active/done layout (under filter the done zone simply has nothing left).
    // Counts/progress stay truthful: buildSubtaskSection + the row toggle compute
    // sDone/sTotal straight from task.subtasks, not from this filtered view.
    if (isFiltered) subs = subs.filter(s => !s.checked && !s.cycleChecked);
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
                data-act="toggleSubSplitActive" data-splitkey="${activeKey}">
                ${IC.sword}<span>Активные · ${active.length}</span>${chevronSvg}
            </li>
            <li class="sub-split-active-wrap${activeCollapsed ? ' collapsed' : ''}" style="list-style:none;padding:0;margin:0;">
                <ul class="sub-split-inner">${activeHtml}</ul>
            </li>` : '';

        const doneSection = done.length > 0 ? `
            <li class="sub-split-done-header${doneCollapsed ? ' collapsed' : ''}"
                data-act="toggleSubSplitDone" data-splitkey="${doneKey}">
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
    const subRepeatBtn = `<button type="button" class="btn-sub-action sub-repeat-btn${repeatSet ? ' active' : ''}" data-act="openSubRepeatModal" title="${subRepeatTitle}">${IC.ouroboros}</button>`;
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
        ? `<button type="button" class="sub-deadline-badge${subDlStatusCls}" data-act="openSubDeadlineModal" title="${escHtml(subDlAbs)}" aria-label="Дедлайн подпункта: ${escHtml(subDlAbs)} — изменить">${IC.window}</button>`
        : '';
    const subDlSetBtn = subDl
        ? ''
        : `<button type="button" class="btn-sub-action sub-deadline-btn" data-act="openSubDeadlineModal" title="Назначить дедлайн">${IC.window}</button>`;
    const subDlWrap = subDl
        ? `<div class="sub-deadline-wrapper${subDlStatusCls}" id="subdl-${taskId}-${s.id}">
            <div class="sub-deadline-inner">
                <span class="sub-dl-pill" role="button" tabindex="0" title="Изменить дедлайн"
                      data-act="openSubDeadlineModal" data-actkey="kactivate">
                    ${subDlCd ? `<span class="sub-dl-countdown">${subDlCd}</span><span class="sub-dl-sep">·</span>` : ''}
                    <span class="sub-dl-date">${escHtml(subDlAbs)}</span>
                    <button type="button" class="sub-dl-clear" data-act="clearSubDeadline" title="Снять дедлайн" aria-label="Снять дедлайн">${IC.crossedSwords}</button>
                </span>
            </div>
        </div>`
        : '';
    return `<li class="subtask-item${isChecked ? ' checked' : ''}${isCycleChecked ? ' cycle-checked' : ''}"
               data-tid="${taskId}" data-sid="${s.id}" data-sprio="${s.priority || 'none'}">
        <div class="sub-main-row">
            <div class="sub-drag-handle" aria-hidden="true">${IC.drag}</div>
            <button type="button" class="sub-check"
                    data-act="toggleSubtask"
                    role="checkbox"
                    aria-checked="${(isChecked || isCycleChecked) ? 'true' : 'false'}"
                    aria-label="${escHtml(subCheckLabel)}"
                    >${subCheckIcon}</button>
            <span class="sub-text" spellcheck="false" title="Двойной клик — редактировать" data-actdbl="startSubEdit">${subDisplayText}</span>
            ${subDlBadge}
            <div class="sub-actions">
                <button type="button" class="btn-sub-action sub-prio-btn" data-act="cycleSubPriority" title="Приоритет подпункта"><div class="sub-prio-dot"></div></button>
                ${subRepeatBtn}
                ${subDlSetBtn}
                <button type="button" class="btn-sub-action btn-sub-note-toggle${s.note ? ' has-note' : ''}" data-pd data-act="toggleSubNote" title="${s.note ? 'Редактировать заметку' : 'Добавить заметку'}">${s.note ? IC.editNote : IC.addNote}</button>
                <button type="button" class="btn-sub-action" data-act="promoteSubtask" title="Сделать самостоятельной задачей">${IC.promote}</button>
                <button type="button" class="btn-sub-action danger" data-act="deleteSubtask" title="Удалить подпункт">${IC.skull}</button>
            </div>
        </div>
        ${subDlWrap}
        <div class="sub-note-wrapper ${noteWrapClass}" id="subnote-${taskId}-${s.id}">
            <div class="sub-note-inner">
                <div class="sub-note-text" id="subnote-text-${taskId}-${s.id}"
                     spellcheck="false" data-placeholder="начертайте примечание…"
                     aria-label="Заметка подпункта"
                     data-actdbl="_noteEdit"
                     data-actinput="_noteInput"
                     data-actkey="_noteKeydown"
                     data-actblur="_noteCommit"
                    >${s.note ? noteDisplayHTML(s.note) : ''}</div>
                ${s.note ? `<button type="button" class="btn-sub-note-delete" data-act="_noteDeleteClick" title="Удалить заметку">${IC.dagger}</button>` : ''}
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
            ? `<button type="button" class="sub-deadline-badge${fDlCls}" data-act="openFormSubDeadline" title="${escHtml(fDlAbs)}" aria-label="Дедлайн подпункта: ${escHtml(fDlAbs)} — изменить">${IC.window}</button>`
            : '';
        const fDlSetBtn = fDl
            ? ''
            : `<button type="button" class="btn-sub-action sub-deadline-btn" data-act="openFormSubDeadline" title="Назначить дедлайн">${IC.window}</button>`;
        const fDlWrap = fDl
            ? `<div class="sub-deadline-wrapper${fDlCls}">
            <div class="sub-deadline-inner">
                <span class="sub-dl-pill" role="button" tabindex="0" title="Изменить дедлайн"
                      data-act="openFormSubDeadline" data-actkey="kactivate">
                    ${fDlCd ? `<span class="sub-dl-countdown">${fDlCd}</span><span class="sub-dl-sep">·</span>` : ''}
                    <span class="sub-dl-date">${escHtml(fDlAbs)}</span>
                    <button type="button" class="sub-dl-clear" data-act="clearFormSubDeadline" data-stop title="Снять дедлайн" aria-label="Снять дедлайн">${IC.crossedSwords}</button>
                </span>
            </div>
        </div>`
            : '';
        return `<li class="subtask-item" data-form-sub-idx="${i}" data-sprio="${s.priority || 'none'}">
        <div class="sub-main-row">
            <div class="sub-drag-handle" aria-hidden="true">${IC.drag}</div>
            <span class="sub-text" spellcheck="false" title="Двойной клик — редактировать" data-actdbl="startFormSubEdit">${escHtml(s.text)}</span>
            ${fDlBadge}
            <div class="sub-actions">
                <button type="button" class="btn-sub-action sub-prio-btn" data-act="cycleFormSubPriority" title="Приоритет подпункта"><div class="sub-prio-dot"></div></button>
                <button type="button" class="btn-sub-action sub-repeat-btn${repeatSet ? ' active' : ''}" data-act="openFormSubRepeat" title="${repeatTitle}">${IC.ouroboros}</button>
                ${fDlSetBtn}
                <button type="button" class="btn-sub-action btn-sub-note-toggle${s.note ? ' has-note' : ''}" data-pd data-act="toggleFormSubNote" title="${s.note ? 'Редактировать заметку' : 'Добавить заметку'}">${s.note ? IC.editNote : IC.addNote}</button>
                <button type="button" class="btn-sub-action danger" data-act="removeFormSubtask" title="Удалить подпункт">${IC.skull}</button>
            </div>
        </div>
        ${fDlWrap}
        <div class="sub-note-wrapper ${noteWrapClass}" id="form-subnote-${i}">
            <div class="sub-note-inner">
                <div class="sub-note-text" id="form-subnote-text-${i}"
                     spellcheck="false" data-placeholder="начертайте примечание…"
                     aria-label="Заметка подпункта"
                     data-actdbl="_noteEdit"
                     data-actinput="_noteInput"
                     data-actkey="_noteKeydown"
                     data-actblur="_noteCommit"
                    >${s.note ? noteDisplayHTML(s.note) : ''}</div>
                ${s.note ? `<button type="button" class="btn-sub-note-delete" data-act="_noteDeleteClick" title="Удалить заметку">${IC.dagger}</button>` : ''}
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
    const btn = document.querySelector('.btn-tool.btn-danger[data-act="clearAll"]');

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
            <button class="template-create" data-act="createTaskFromTemplate" data-id="${t.id}" title="Создать задачу из шаблона">
                <span class="template-name">${escHtml(t.name)}</span>
                ${bits.length ? `<span class="template-meta">${bits.join('')}</span>` : ''}
            </button>
            <button class="template-del" data-act="deleteTemplate" data-id="${t.id}" title="Удалить шаблон">${IC.skull}</button>
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
            <button class="backup-restore" data-act="restoreBackup" data-ts="${b.ts}" title="Восстановить это состояние">
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
        subModeItem = `<button type="button" role="menuitem" data-act="_taskMore" data-more="submode" data-id="${id}">${eff}<span>Чек по подпунктам</span></button>`;
    }
    _openFloatMenu(event.currentTarget, `
        <button type="button" role="menuitem" data-act="_taskMore" data-more="tpl" data-id="${id}">${IC.template}<span>Сохранить как шаблон</span></button>
        <button type="button" role="menuitem" data-act="_taskMore" data-more="dup" data-id="${id}">${IC.twinCoffin}<span>Дублировать задачу</span></button>
        ${subModeItem}
        ${canDemote ? `<button type="button" role="menuitem" data-act="_taskMore" data-more="demote" data-id="${id}">${IC.demote}<span>Сделать подпунктом</span></button>` : ''}`,
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
        `<button type="button" role="menuitemradio" aria-checked="${cur === val}" class="submode-opt${cur === val ? ' on' : ''}" data-act="setTaskSubMode" data-id="${id}" data-mode="${val}">${icon}<span>${label}</span></button>`;
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
        `<button type="button" role="menuitemradio" aria-checked="${cur === val}" class="submode-opt${cur === val ? ' on' : ''}" data-act="setGlobalSubMode" data-mode="${val}">${icon}<span>${label}</span></button>`;
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
            html += `<button type="button" role="menuitem" data-act="_pickDemoteTarget" data-id="${id}" data-target="${t.id}"><span class="float-menu-name">${escHtml(t.text)}</span></button>`;
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
            <button type="button" role="menuitem" data-act="demoteTask" data-id="${id}" data-target="${targetId}" data-drop="1"><span>Отбросить</span></button>
            <button type="button" role="menuitem" data-act="demoteTask" data-id="${id}" data-target="${targetId}" data-drop="0"><span>Перенести рядом</span></button>`,
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

