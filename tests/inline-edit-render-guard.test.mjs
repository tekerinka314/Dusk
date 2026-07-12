// @vitest-environment happy-dom
//
// V2-B6-07 regression — an async render (sync merge landing, periodic, wake,
// cycle-reset) must NOT rebuild the task list while an inline editor (task
// title / note / subtask text) is focused: doing so tears down the
// contenteditable node, killing focus and discarding keystrokes typed since
// the last debounce commit. Two guards:
//   (i)  render()/renderListOnly() defer while _inlineEditActive();
//   (ii) scheduleSyncPush() doesn't arm the push timer while editing.
import { it, expect, vi, beforeEach } from 'vitest';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

import '../src/idb-global.js';
import '../dusk/01-core.ts';
import '../dusk/02-grimoire.ts';
import '../dusk/03-render.ts';
import '../dusk/09-sync.ts';
import '../dusk/11-sync-ui.ts';
const S = globalThis;

function focusedEditorInItem() {
    document.body.innerHTML = '<li class="task-item" data-id="1"><div class="task-content">'
        + '<div class="task-note-text" contenteditable="true">черновик заметки</div></div></li>';
    const ed = document.querySelector('.task-note-text');
    ed.focus();
    return ed;
}

beforeEach(() => { document.body.innerHTML = ''; });

it('_inlineEditActive: true only for a focused contenteditable inside .task-item', () => {
    expect(S._inlineEditActive()).toBe(false);                 // nothing focused
    const ed = focusedEditorInItem();
    expect(document.activeElement).toBe(ed);
    expect(S._inlineEditActive()).toBe(true);                  // editor focused
    ed.setAttribute('contenteditable', 'false'); ed.blur();
    expect(S._inlineEditActive()).toBe(false);                 // blurred / not editable

    // a contenteditable OUTSIDE the task list (e.g. Grimuar) must not trip it
    document.body.innerHTML = '<div class="grim-page" contenteditable="true">note body</div>';
    document.querySelector('.grim-page').focus();
    expect(S._inlineEditActive()).toBe(false);
});

it('(i) render() defers while editing — renderTasks never runs, a retry is armed', () => {
    vi.useFakeTimers();
    focusedEditorInItem();
    S._liCache = null;                       // renderTasks would set this to a Map on entry
    S._renderDeferT = null;
    S.render();
    expect(S._liCache).toBe(null);           // renderTasks did NOT run
    expect(S._rendering).toBe(false);        // never entered the render body
    expect(S._renderDeferT).not.toBe(null);  // a deferred retry was scheduled
    vi.useRealTimers();
});

it('(ii) scheduleSyncPush stays pending (no debounce armed) while editing, arms once editing ends', () => {
    // NB: the debounce callback calls the lexical `syncNow` in module 11, so a
    // globalThis spy can't intercept it — assert on the armed timer instead.
    S.cloudIsConfigured = () => true;
    S.cloudStatus = () => ({ signedIn: true });
    S.refreshStatus = () => {};
    S._syncing = false; S._applyingMerge = false; S._pendingPush = false;

    focusedEditorInItem();
    S._debounceTimer = null;
    S.scheduleSyncPush();
    expect(S._pendingPush).toBe(true);       // marked dirty…
    expect(S._debounceTimer).toBe(null);     // …but the push debounce is NOT armed while editing

    // editing ends → next scheduleSyncPush arms the debounce
    document.querySelector('.task-note-text').setAttribute('contenteditable', 'false');
    document.querySelector('.task-note-text').blur();
    S._debounceTimer = null;
    S.scheduleSyncPush();
    expect(S._debounceTimer).not.toBe(null); // armed
    clearTimeout(S._debounceTimer);          // cleanup: keep the real syncNow from firing
});
