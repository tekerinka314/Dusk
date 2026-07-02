// Deterministic sample app state (fixed timestamps, no Date.now) covering every
// synced collection incl. both pools (tasks/archive, notes/notesArchive), a
// subtask, a tombstone and a quarantine-journal entry. Used to pin the Google
// Drive wire format: getSyncSubset(state) of THIS state must keep matching the
// committed fixtures byte-for-byte (see drive-format.test.mjs).
module.exports = function sampleState() {
    return {
        tasks: [{
            id: 1, uid: 'task-live-1', createdAt: 1000, updatedAt: 2000,
            text: 'Live task', checked: false, priority: 'high', groupId: 10,
            deadline: null, note: '', color: '#8844cc', pinned: true, order: 0,
            repeat: 'none', cycleChecked: false, nextReset: null,
            subtasksOpen: false, noteOpen: false,
            subtasks: [{
                id: 1, uid: 'sub-1', updatedAt: 1500, text: 'Subtask', note: '',
                priority: 'none', order: 0, checked: false, repeat: 'none', cycleChecked: false,
            }],
        }],
        archive: [{
            id: 2, uid: 'task-arch-1', createdAt: 1000, updatedAt: 3000,
            text: 'Archived task', checked: true, priority: 'none', groupId: null,
            deadline: null, note: '', color: null, pinned: false, order: 1,
            repeat: 'none', cycleChecked: false, nextReset: null,
            subtasksOpen: false, noteOpen: false, subtasks: [],
        }],
        groups: [{ id: 10, uid: 'group-1', createdAt: 500, updatedAt: 600, name: 'Group', color: '#5522aa' }],
        notes: [{ id: 'note-uuid-1', createdAt: 100, updatedAt: 200, title: 'Note', body: '<p>hi</p>' }],
        notesArchive: [{ id: 'note-uuid-2', createdAt: 100, updatedAt: 400, title: 'Old note', body: '' }],
        templates: [{ id: 3, uid: 'tpl-1', createdAt: 50, updatedAt: 60, text: 'Template' }],
        noteTemplates: [{ id: 'ntpl-uuid-1', createdAt: 10, updatedAt: 20, title: 'Note template', body: '' }],
        tombstones: [{ uid: 'dead-1', type: 'task', deletedAt: 5000 }],
        syncJournal: [{
            uid: 'jr-1', kind: 'field', recType: 'task', recUid: 'task-live-1',
            field: 'text', loser: 'old text', winnerHint: 'Live task',
            createdAt: 1234, resolved: false, resolvedAt: null, resolution: null,
        }],
        nextId: 7, nextGroupId: 11, nextSubId: 4, nextTemplateId: 5,
    };
};
