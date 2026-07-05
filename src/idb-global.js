// idb-keyval used to back Этап 4 (localStorage -> IndexedDB primary, LS stays
// a live permanent fallback). Same reasoning as sortable-global.js: must be a
// SEPARATE module imported FIRST from main.js — dusk/01-core.ts stays
// import/export-free (a plain classic-style script) so TypeScript keeps
// merging its top-level declarations into the shared global namespace the
// other 11 dusk modules read ambiently; a real static import inside it would
// silently sever that.
import { get, set } from 'idb-keyval';
globalThis._idbKvGet = get;
globalThis._idbKvSet = set;
