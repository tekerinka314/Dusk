/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  ВЫРЕЗАННЫЙ ФУНКЦИОНАЛ — копирование (дублирование) ЗАМЕТОК гримуара.
 *  Удалён из app.js / index.html по запросу 2026-06-18. Файл НЕ подключён к
 *  приложению — хранится только как резервная копия на случай возврата фичи.
 *
 *  Чтобы вернуть:
 *    1. Вставить функцию grimDuplicate() обратно в app.js (рядом с grimArchive
 *       / grimDelete, секция действий над активной заметкой).
 *    2. Вернуть кнопку в строку .grim-acts в renderGrimDetail (активная ветка),
 *       между «копия»-соседями (была после «летопись», перед «в склеп»).
 *    3. Иконка — IC.twinCoffin (готик-двойной-гроб), она в проекте сохранена.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// --- Кнопка (была в .grim-acts активной заметки, renderGrimDetail) -----------
// <button class="grim-act" onclick="grimDuplicate('${note.id}')" title="Сделать копию записи">${IC.twinCoffin}<span>копия</span></button>

// --- Функция -----------------------------------------------------------------
// Active note → exact copy (new uuid), dropped at the top and opened for editing.
// Mirrors duplicateTask: deep clone, fresh ids/timestamps, title gets a «(копия)» tag.
function grimDuplicate(id) {
    const note = (state.notes || []).find(n => n.id === id);
    if (!note) return;
    clearTimeout(_grimSaveT); saveState();
    grimFindClose();
    pushUndo();
    const now = Date.now();
    const baseTitle = (note.title || '').trim();
    let title = baseTitle ? baseTitle + ' (копия)' : '';
    if (title.length > 120) title = title.slice(0, 120);   // honour the title maxlength
    const copy = {
        ...JSON.parse(JSON.stringify(note)),   // deep clone body/fmt/colour/etc.
        id:        uid(),
        title,
        createdAt: now,
        updatedAt: now,
    };
    delete copy.ord;            // fall back to updatedAt so the copy sorts to the top
    delete copy.archivedAt;     // a duplicate is never born in the crypt
    if (!Array.isArray(state.notes)) state.notes = [];
    state.notes.unshift(copy);
    currentNoteId = copy.id;
    grimNoteCollapsed = false;
    notesSearchQuery = '';
    const sb = document.getElementById('notes-search-box');
    if (sb) sb.value = '';
    saveState();
    renderNotes();
    const layoutEl = document.getElementById('grim-layout');
    if (layoutEl) layoutEl.classList.add('show-detail');
    const ti = document.getElementById('grim-title-in');
    if (ti) ti.focus();
    showToast('Запись скопирована', { undo: true });
}
