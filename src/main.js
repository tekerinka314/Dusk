// DUSK entry point (Vite). Pure side-effect imports in the EXACT legacy
// <script>-tag order — the dusk modules don't import each other; they share
// state and functions through the globalThis bridges added in migration 2a,
// so evaluation order is the load-bearing contract here. 08 runs init() at its
// top level and must come after 09/10; 11/12 wire sync AFTER init.
import './sortable-global.js';
import '../dusk/01-core.js';
import '../dusk/02-grimoire.js';
import '../dusk/03-render.js';
import '../dusk/04-tasks.js';
import '../dusk/05-edit-notes-groups.js';
import '../dusk/06-deadlines.js';
import '../dusk/07-dnd-filter-progress.js';
import '../dusk/09-sync.ts';
import '../dusk/10-cloud.ts';
import '../dusk/08-quickadd-export-init.js';
import '../dusk/11-sync-ui.js';
import '../dusk/12-sync-wake.js';
