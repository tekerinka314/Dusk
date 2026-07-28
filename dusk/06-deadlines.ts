// ── ES-module bridge (migration 2a), part 1: HOISTED functions ──────────────
// Classic scripts hoisted these into the shared global scope before any code
// ran; publish them first so load-time cross-module calls keep working.
Object.assign(globalThis, {
    openDeadlineModal, closeDeadlineModal, setDeadlineMode, _focusDeadlineModeInput, updateRepeatAvailability, clearDeadlineModal, _setDlAutoRepeat, toggleDlAutoRepeat,
    _readDlDuration, _setDlDurationFields, _clampDlDuration, _stepDlDuration, _updateDlRepeatToggle, _applyAutoRepeatToTarget, confirmDeadline, applyDeadline,
    updateFormDeadlineDisplay, clearFormDeadline, clearFormDeadlineState, setupMonthdayStepper, setupYearStepper, stepYear, stepMonthday, _updateRepeatMonthdayHint,
    setupRepeatMonthdayStepper, monthdayNoteText, updateMonthdayMax, deadlineWindow, getDeadlineTimestamp, calDayDiff, weektimeDayDiff, deadlineStatus,
    formatDeadlineCountdown, formatDeadlineAbsolute, formatDeadlineForm, startDeadlineTimer, updateCycleUntilLabels, _syncCriticalPulse, updateDeadlineBadges,
});

// ============================================================
//  DEADLINE MODAL
// ============================================================
function openDeadlineModal(taskId, bulk = false, subId = null, formSubIdx = null) {
    editingTaskId = taskId;
    editingSubId  = subId;       // P-E: null for task/form/bulk; set when editing a subtask deadline
    globalThis._formSubDeadlineIdx = formSubIdx;  // P-E: set only for a form-subtask deadline; reset on every other open
    globalThis.bulkDeadlineActive = bulk;   // P-D: when true, confirm applies to the whole selection
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
    (document.getElementById('dl-time') as HTMLInputElement).value = '';
    (document.getElementById('dl-weekday') as HTMLInputElement).value = '1';
    if ((window as any)._weekdayPickerSet) (window as any)._weekdayPickerSet(1);
    (document.getElementById('dl-weektime-time') as HTMLInputElement).value = '';
    (document.getElementById('dl-monthday') as HTMLInputElement).value = '';
    (document.getElementById('dl-month') as HTMLInputElement).value = '1';
    if ((window as any)._monthPickerSet) (window as any)._monthPickerSet(1);
    (document.getElementById('dl-year') as HTMLInputElement).value = '';
    (document.getElementById('dl-date') as HTMLInputElement).value = '';
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
        if (mode === 'time')     (document.getElementById('dl-time') as HTMLInputElement).value     = v;
        if (mode === 'weektime') {
            const [wd, t] = v.split('|');
            (document.getElementById('dl-weekday') as HTMLInputElement).value = wd || '1';
            if ((window as any)._weekdayPickerSet) (window as any)._weekdayPickerSet(wd || '1');
            // Fix 1: if timeSet is false, leave the time input empty
            if (existing.timeSet !== false) {
                (document.getElementById('dl-weektime-time') as HTMLInputElement).value = t || '';
            }
        }
        if (mode === 'monthday') (document.getElementById('dl-monthday') as HTMLInputElement).value = v;
        if (mode === 'month')    { (document.getElementById('dl-month') as HTMLInputElement).value    = v; if ((window as any)._monthPickerSet) (window as any)._monthPickerSet(v); }
        if (mode === 'year')     (document.getElementById('dl-year') as HTMLInputElement).value     = v;
        if (mode === 'date')     {
            (document.getElementById('dl-date') as HTMLInputElement).value     = v;
            // Extension 7: restore saved time if present
            const dlTimeEl = document.getElementById('dl-date-time') as any;
            if (dlTimeEl) dlTimeEl.value = (existing && existing.time) ? existing.time : '';
        }
        _setDlDurationFields(existing.durationMin || 0);   // X-7: restore event-duration
    } else {
        // No existing deadline — clear time field too
        const dlTimeEl = document.getElementById('dl-date-time') as any;
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

    // Auto-repeat toggle. Default OFF for a new deadline in every mode; but if this
    // target already carries a rhythmic deadline, reflect its actual repeat state
    // (ON when recurring, OFF when the user left it «none») on re-edit.
    let _arInit = false;
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

function closeDeadlineModal(event?) {
    if (!event || event.target === document.getElementById('deadline-modal')) {
        if ((window as any)._monthPickerClose)   (window as any)._monthPickerClose();
        if ((window as any)._weekdayPickerClose) (window as any)._weekdayPickerClose();
        // Clear monthday inline messages so they don't persist on re-open
        const mw = document.getElementById('dl-monthday-warn');
        const mn = document.getElementById('dl-monthday-note');
        if (mw) { mw.hidden = true; mw.textContent = ''; }
        if (mn) { mn.hidden = true; mn.textContent = ''; }
        globalThis.bulkDeadlineActive = false;   // P-D: cancelling bulk must not leak into the next open
        editingSubId = null;          // P-E: cancelling a subtask-deadline edit must not leak
        globalThis._formSubDeadlineIdx = null;   // P-E: same for a form-subtask-deadline edit
        closeModalWithAnim('deadline-modal');
    }
}

function setDeadlineMode(mode, withFocus?) {
    dlCurrentMode = mode;
    document.querySelectorAll<HTMLElement>('.dl-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    document.querySelectorAll<HTMLElement>('.dl-input-wrap').forEach(w => w.classList.remove('active'));
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
    if (mode !== 'month'   && (window as any)._monthPickerClose)   (window as any)._monthPickerClose();
    if (mode !== 'weektime' && (window as any)._weekdayPickerClose) (window as any)._weekdayPickerClose();
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

document.querySelectorAll<HTMLElement>('.dl-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setDeadlineMode(btn.dataset.mode, true); // true = user-initiated → autofocus
        // NOTE: repeat availability is NOT updated here — only after confirmDeadline()
        // so that clicking a tab doesn't restrict repeats before the user has
        // actually saved a deadline in that mode.
    });
});

function updateRepeatAvailability(mode) {
    const repeatBtns = document.querySelectorAll<HTMLButtonElement>('#repeat-selector .repeat-btn');
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
    const dtEl = document.getElementById('dl-date-time') as any;
    if (dtEl) dtEl.value = '';
    if ((window as any)._monthPickerClose)     (window as any)._monthPickerClose();
    if ((window as any)._weekdayPickerClose)   (window as any)._weekdayPickerClose();
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
    const h = parseInt((document.getElementById('dl-dur-h') as HTMLInputElement)?.value) || 0;
    const m = parseInt((document.getElementById('dl-dur-m') as HTMLInputElement)?.value) || 0;
    return Math.max(0, h * 60 + m);
}
function _setDlDurationFields(min) {
    const total = Math.max(0, parseInt(min) || 0);
    const hEl = document.getElementById('dl-dur-h') as any;
    const mEl = document.getElementById('dl-dur-m') as any;
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
    const el = document.getElementById(which === 'h' ? 'dl-dur-h' : 'dl-dur-m') as any;
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
// V2-B5-08: два повторения говорили одним словом. Развели: «круговорот» и
// уроборос закреплены за механикой ОБЕТА (клавиша R), тумблер говорит о
// ПЕРЕНОСЕ исхода. ⚠ Находка аудита утверждала, что тумблер «не делает обет
// повторяющимся» — код говорит обратное: `_applyAutoRepeatToTarget` ставит
// obj.repeat, когда своего круговорота нет. Подпись обязана обещать ровно это,
// иначе разведение слов превращается во вторую ложь.
const _DL_REPEAT_LABELS = {
    weektime: { t: 'Переносить исход каждую неделю', s: 'Сдвигается в выбранный день; обет станет круговоротным' },
    time:     { t: 'Переносить исход каждый день',   s: 'Сдвигается на то же время; обет станет круговоротным' },
    monthday: { t: 'Переносить исход каждый месяц',  s: 'Сдвигается на то же число; обет станет круговоротным' },
};
// Show + relabel the shared auto-repeat toggle for the active deadline mode.
function _updateDlRepeatToggle(mode) {
    const btn = document.getElementById('dl-repeat-toggle');
    if (!btn) return;
    const lbl = _DL_REPEAT_LABELS[mode];
    btn.hidden = !lbl;
    if (!lbl) return;
    const tEl = btn.querySelector<HTMLElement>('.dl-rt-title');
    const sEl = btn.querySelector<HTMLElement>('.dl-rt-sub');
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
        value = segInputs['dl-time']?.getValue() || (document.getElementById('dl-time') as HTMLInputElement).value;
        if (!value) {
            showToast('Не указано время исхода');
            (segInputs['dl-time'] ? segInputs['dl-time']._focus(0) : document.getElementById('dl-time').focus());
            return;
        }
    }
    if (mode === 'weektime') {
        const wd = (document.getElementById('dl-weekday') as HTMLInputElement).value;
        if (!wd) {
            showToast('Выберите день недели');
            document.getElementById('dl-weekday').focus();
            return;
        }
        const t  = segInputs['dl-weektime-time']?.getValue() || (document.getElementById('dl-weektime-time') as HTMLInputElement).value;
        value = `${wd}|${t || '00:00'}`;
        const dl: any = { mode, value, timeSet: !!t };
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
            globalThis._formSubDeadlineIdx = null;
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
                showToast('Исход назначен');
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
                showToast('Исход назначен');
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
                    if ((window as any)._formWdPickerSet) (window as any)._formWdPickerSet(parseInt(wd) || '');
                    else globalThis.formRepeatAnchorDay = parseInt(wd) || null;
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
        const raw    = parseInt((document.getElementById('dl-monthday') as HTMLInputElement).value);
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
            (document.getElementById('dl-monthday') as HTMLInputElement).value = '';
            document.getElementById('dl-monthday').focus();
            return;
        }
        // Absolutely impossible: no month has more than 31 days
        if (raw > 31) {
            hideMonthdayWarn();
            showToast(`${raw} — такого числа не бывает ни в одном месяце`);
            (document.getElementById('dl-monthday') as HTMLInputElement).value = '';
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
            (document.getElementById('dl-monthday') as HTMLInputElement).value = String(maxDay);
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
    if (mode === 'month')  value = (document.getElementById('dl-month') as HTMLInputElement).value;
    if (mode === 'year') {
        value = (document.getElementById('dl-year') as HTMLInputElement).value;
        const yv = parseInt(value);
        if (!value) {
            showToast('Не указан год исхода');
            document.getElementById('dl-year').focus();
            return;
        }
        if (yv < getYearMin() || yv > YEAR_MAX) {
            showToast(`Введите год от ${getYearMin()} до ${YEAR_MAX}`); return;
        }
    }
    if (mode === 'date') {
        value = segInputs['dl-date']?.getValue() || (document.getElementById('dl-date') as HTMLInputElement).value;
        const dateSeg = segInputs['dl-date'];

        // Empty: user pressed Save without entering anything
        if (!value && (!dateSeg || dateSeg.segs.some(s => !s.buf.length))) {
            showToast('Не указана дата исхода');
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
                (document.getElementById('dl-date') as HTMLInputElement).value = '';
                return;
            }
            const today = new Date(); today.setHours(0, 0, 0, 0);
            if (chosen < today) { showToast('Нельзя выбрать дату в прошлом'); return; }
        }
    }

    const dl: any = value ? { mode, value } : null;
    // Extension 7: for date mode, persist optional time (HH:MM or empty)
    if (dl && mode === 'date') {
        const timeVal = (segInputs['dl-date-time']?.getValue() ||
                         (document.getElementById('dl-date-time') as HTMLInputElement)?.value || '').trim();
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
                if ((window as any)._formMdPickerSet) (window as any)._formMdPickerSet(_md || '');
                else globalThis.formRepeatAnchorMonthday = _md;
            }
        }
    }
}

function applyDeadline(dl) {
    if (_formSubDeadlineIdx !== null) {       // P-E: form-subtask deadline (task not yet created; all modes except weektime)
        const s = formSubtasks[_formSubDeadlineIdx];
        if (s) { s.deadline = dl; _applyAutoRepeatToTarget(s, dl); renderFormSubtasks(); }
        globalThis._formSubDeadlineIdx = null;
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
            showToast(dl ? 'Исход назначен' : 'Исход снят');
        }
        editingTaskId = null;
        editingSubId  = null;
        return;
    }
    if (bulkDeadlineActive) {                 // P-D: deadline modal opened for the selection
        globalThis.bulkDeadlineActive = false;
        editingTaskId = null;
        bulkSetDeadline(dl);
        return;
    }
    if (editingTaskId !== null) {
        const task = state.tasks.find(t => t.id === editingTaskId);
        if (task) {
            pushUndo(); task.deadline = dl; _applyAutoRepeatToTarget(task, dl); saveState(); render();
            showToast(dl ? 'Исход назначен' : 'Исход снят');
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
        trigger.textContent = 'Назначить исход';
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
        const v = parseInt((document.getElementById('dl-monthday') as HTMLInputElement).value);
        // Only reject truly unrecoverable input: empty / NaN / ≤ 0.
        // Everything in 1–∞ passes through so confirmDeadline can show
        // the correct inline warning with the actual value the user typed.
        if (isNaN(v) || v < 1) { (document.getElementById('dl-monthday') as HTMLInputElement).value = ''; }
    });
    // Show the smart "short month" footnote in real time as the user types.
    // Logic is leap-year-aware. Replaces the old intrusive per-save toast.
    document.getElementById('dl-monthday').addEventListener('input', () => {
        const v    = parseInt((document.getElementById('dl-monthday') as HTMLInputElement).value);
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
    const input = document.getElementById('dl-year') as any;
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
    const input = document.getElementById('dl-year') as any;
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
    const input  = document.getElementById('dl-monthday') as any;
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
    const input = document.getElementById('repeat-anchor-monthday') as any;
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
        return isNextFebLeap ? '' : 'В феврале обет сдвинется на следующий месяц.';
    }
    if (v === 30) {
        // Feb never has 30 days, even in a leap year.
        return 'В феврале обет сдвинется на следующий месяц.';
    }
    // v >= 31 — affects February and months with 30 days (Apr, Jun, Sep, Nov).
    return 'В коротких месяцах обет сдвинется на следующий месяц.';
}

function updateMonthdayMax() {
    // IMP-5: monthday deadline repeats every month — the user needs to pick a
    // day that works for ANY month, not just the current one.  Capping input.max
    // to today's month (e.g. 28 in February) wrongly blocks entering 29–31.
    // The hint already explains the short-month behaviour via monthdayNoteText(),
    // so we just fix max=31 and update the informational hint with a general note.
    const input = document.getElementById('dl-monthday') as any;
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
    return Math.round((+target - +today) / 86400000);
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
        const diffDays = Math.round((+d - +new Date(now.toDateString())) / 86400000);
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
const _PULSE_MS = 1600; // must match the glowBlink duration on critical glows in CSS
function _syncCriticalPulse() {
    if (prefersReducedMotion()) return;
    const delay = `-${(Date.now() - _PULSE_EPOCH) % _PULSE_MS}ms`;
    // MOTION-W1: the pulse now lives on the ::after pseudo-layer (opacity-only);
    // inline animation-delay can't reach a pseudo — pass it through a CSS var.
    document.querySelectorAll<HTMLElement>('.meta-tag-wrap:has(> .deadline-tag.critical), .dl-side-panel.dl-side-critical')
        .forEach(el => { el.style.setProperty('--pulse-delay', delay); });
}

function updateDeadlineBadges() {
    _tickRailDigest();   // B4-01: rail digest countdowns tick on the same timer
    const tasksWithDl = state.tasks.filter(t => t.deadline);
    if (tasksWithDl.length) {
        // Build id → task map once (O(n)) instead of find() per DOM node (O(n²))
        const taskMap = new Map<any, any>(tasksWithDl.map(t => [t.id, t]));

        document.querySelectorAll<HTMLElement>('.task-item[data-id]').forEach(li => {
            const id   = parseInt(li.dataset.id);
            const task = taskMap.get(id);
            if (!task) return;
            const badge = li.querySelector<HTMLElement>('.deadline-tag');
            if (!badge) return;
            const status = deadlineStatus(task.deadline);
            badge.className = 'meta-tag deadline-tag';
            if (status === 'over')          badge.classList.add('over');
            else if (status === 'live')     badge.classList.add('live');
            else if (status === 'critical') badge.classList.add('critical');
            else if (status === 'urgent')   badge.classList.add('urgent');
            else if (status === 'warn')     badge.classList.add('warn');
            const cdEl = badge.querySelector<HTMLElement>('.dl-countdown');
            const sep  = badge.querySelector<HTMLElement>('.dl-sep');
            const cd   = formatDeadlineCountdown(task.deadline);
            if (cdEl) {
                if (cd) { cdEl.textContent = cd; cdEl.style.display = ''; if (sep) sep.style.display = ''; }
                else    { cdEl.style.display = 'none'; if (sep) sep.style.display = 'none'; }
            }
        });
    }

    // P-E: subtask deadline badges + hover pills — live-tick the same way.
    document.querySelectorAll<HTMLElement>('.subtask-item[data-sid]').forEach(li => {
        const badge = li.querySelector<HTMLElement>('.sub-deadline-badge');
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
        const wrap = li.querySelector<HTMLElement>('.sub-deadline-wrapper');
        if (wrap) {
            // preserve the id so hover-reveal CSS + DnD keep targeting it
            wrap.className = 'sub-deadline-wrapper' + statusCls;
        }
        const cdEl  = li.querySelector<HTMLElement>('.sub-dl-countdown');
        const sepEl = li.querySelector<HTMLElement>('.sub-dl-sep');
        const cd    = formatDeadlineCountdown(sub.deadline);
        if (cdEl) {
            if (cd) { cdEl.textContent = cd; cdEl.style.display = ''; if (sepEl) sepEl.style.display = ''; }
            else    { cdEl.style.display = 'none'; if (sepEl) sepEl.style.display = 'none'; }
        }
        const absEl = li.querySelector<HTMLElement>('.sub-dl-date');
        if (absEl) absEl.textContent = formatDeadlineAbsolute(sub.deadline, true);
    });

    _syncCriticalPulse(); // 6e: re-align any newly-critical badges to the shared phase
}

// ── ES-module bridge (migration 2a), part 2: consts/classes ─────────────────
// (mutable top-level let/var declarations were converted to globalThis.* so
//  every module reads AND writes the same slot — no stale copies).
Object.assign(globalThis, {
    _AUTO_REPEAT_BY_MODE, _DL_REPEAT_LABELS, getYearMin, YEAR_MAX, _PULSE_EPOCH, _PULSE_MS,
});
