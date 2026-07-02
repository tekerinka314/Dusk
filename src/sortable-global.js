// SortableJS used to arrive via a classic CDN <script> that set window.Sortable.
// Now bundled from npm (pinned 1.15.2 — same version the CDN tag carried).
// Must be a SEPARATE module imported FIRST from main.js: an entry module's own
// body runs AFTER its dependencies, so assigning the global inside main.js
// would happen after the dusk modules (and init()) already executed.
import Sortable from 'sortablejs';
globalThis.Sortable = Sortable;
