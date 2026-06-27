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
                data-pd data-act="_qaAccept" data-actover="_qaHover">
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
        <button type="button" role="menuitem" data-act="exportData" data-exp="tasks">${_EXPORT_TASKS_IC}<span>Только задачи</span></button>
        <button type="button" role="menuitem" data-act="exportData" data-exp="all">${GRIM_IO_IC.full}<span>Всё — полный бэкап</span></button>
        <button type="button" role="menuitem" data-act="exportData" data-exp="md">${_EXPORT_MD_IC}<span>Задачи — markdown-чеклист</span></button>`,
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
