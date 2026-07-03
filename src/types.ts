// Shared record shapes — SYNC-SPEC.md §4, matched to the RUNTIME shapes pinned
// by tests/fixtures/sample-state.cjs + drive-format.test.mjs. Types only, zero
// runtime code. Deliberately loose in places (string unions deferred) — the
// point of Этап 3 is coverage first, strictness ratchets later.

/** Deadline meta on a task. Modes: 'date' | 'time' | 'weektime' | 'monthday'…
 *  — shape varies per mode, pinned only loosely for now. */
export interface Deadline {
    mode: string;
    value?: unknown;
    [k: string]: unknown;
}

export interface DuskSubtask {
    id: number;                 // device-local DOM key
    uid: string;                // stable sync identity
    updatedAt: number;
    text: string;
    note: string;
    priority: string;
    order: number;
    checked: boolean;
    repeat: string;
    cycleChecked: boolean;
}

export interface DuskTask {
    id: number;                 // device-local DOM key (NOT shipped as identity)
    uid: string;                // stable sync identity
    createdAt: number;
    updatedAt: number;
    text: string;
    checked: boolean;
    priority: string;
    groupId: number | null;     // device-local int — crosses the wire as _groupUid
    deadline: Deadline | null;
    note: string;
    color: string | null;
    pinned: boolean;
    order: number;
    repeat: string;
    cycleChecked: boolean;
    nextReset: number | null;
    subtasksOpen: boolean;
    noteOpen: boolean;
    subtasks: DuskSubtask[];
    archivedAt?: number;
    /** subset-only location marker: true = lives in state.archive */
    _arch?: boolean;
    /** merge-internal annotation (groupId → group.uid); stripped from output */
    _groupUid?: string | null;
}

export interface DuskGroup {
    id: number;
    uid: string;
    createdAt: number;
    updatedAt: number;
    name: string;
    color: string | null;
}

export interface DuskNote {
    id: string;                 // uuid — notes never had int ids
    createdAt: number;
    updatedAt: number;
    title: string;
    body: string;               // HTML (merged whole-record, never text-merged)
    fmt?: boolean;
    color?: string | null;
    /** subset-only location marker: true = lives in state.notesArchive */
    _arch?: boolean;
}

export interface DuskTemplate {
    id: number;
    uid: string;
    createdAt: number;
    updatedAt: number;
    text: string;
    [k: string]: unknown;       // template snapshot carries task content fields
}

export interface DuskNoteTemplate {
    id: string;
    createdAt: number;
    updatedAt: number;
    title: string;
    body: string;
}

export interface Tombstone {
    uid: string;
    type: string;               // 'task' | 'group' | 'note' | 'template' | 'noteTemplate'
    parentUid?: string | null;
    deletedAt: number;
}

export type ConflictKind = 'field' | 'subtask' | 'delete-vs-edit' | 'note-both';

/** Quarantine journal entry — append-only, immutable except resolved/…;
 *  `loser` holds the FULL losing record/value so it stays restorable. */
export interface JournalEntry {
    uid: string;
    kind: ConflictKind;
    recType: string;
    recUid: string;
    parentUid?: string | null;
    field?: string;
    loser: unknown;
    winnerHint?: unknown;
    createdAt: number;
    resolved: boolean;
    resolvedAt: number | null;
    resolution: string | null;
}

export interface SyncAlloc {
    nextId: number;
    nextGroupId: number;
    nextSubId: number;
    nextTemplateId: number;
}

/** The synced payload — what getSyncSubset() builds and mergeStates() merges.
 *  Wire shape is PINNED by tests/drive-format.test.mjs; changing it needs an
 *  explicit migration plan first. */
export interface SyncSubset {
    tasks: DuskTask[];          // live + archived, flagged by _arch
    groups: DuskGroup[];
    notes: DuskNote[];          // live + archived, flagged by _arch
    templates: DuskTemplate[];
    noteTemplates: DuskNoteTemplate[];
    tombstones: Tombstone[];
    syncJournal: JournalEntry[];
    _alloc: SyncAlloc;
}

export interface MergeStats {
    gcTombstones: number;
    gcJournal: number;
    [k: string]: number;
}

export interface MergeResult {
    merged: SyncSubset;
    conflicts: JournalEntry[];
    stats: MergeStats;
}

/** The Drive file content (SYNC-SPEC §5 wrapper around the subset). */
export interface DriveFilePayload {
    schema: 1;
    subset: SyncSubset;
    _meta: { updatedAt: number; device: string };
}
