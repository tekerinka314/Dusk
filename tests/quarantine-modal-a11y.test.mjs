// V2-B5-04 — the quarantine conflict overlay was built by hand outside the shared
// modal helper: no id, no accessible name, focus never entered it, Tab escaped into
// the page behind it, and Esc was a no-op (the global handler called
// dismissModalById(undefined) because the overlay had no id).
//
// Source contract lock (same shape as floatmenu-disabled / contrast-tokens): the
// overlay is a template literal built at runtime by dusk/11-sync-ui.ts, and booting
// the sync UI needs all 12 modules + a signed-in Drive stub, so the runtime proof
// lives in the dist probe (D:/tmp/pw/b1/w2_b504_quar.mjs). This file pins the wiring
// that makes the runtime behaviour possible.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const syncUi = readFileSync(join(ROOT, 'dusk', '11-sync-ui.ts'), 'utf8');
const modals = readFileSync(join(ROOT, 'dusk', '05-edit-notes-groups.ts'), 'utf8');

// the whole openQuarantine body — every assertion below reads from it
const openBody = syncUi.slice(
    syncUi.indexOf('function openQuarantine()'),
    syncUi.indexOf('function _refreshQuarOverlay()')
);

describe('V2-B5-04 — quarantine overlay joins the modal machinery', () => {
    it('the overlay carries an id (Esc routes through dismissModalById(id))', () => {
        expect(openBody).toMatch(/overlay\.id\s*=\s*'quar-overlay'/);
    });

    it('the dialog has an accessible name wired to its visible title', () => {
        expect(openBody).toMatch(/aria-labelledby'?\s*,\s*'quar-title'/);
        expect(openBody).toMatch(/<h3[^>]*id="quar-title"/);
    });

    it('open routes through openModalWithFocus (focus-in + Tab trap)', () => {
        expect(openBody).toMatch(/openModalWithFocus\('quar-overlay'\)/);
    });

    it('focus returns to the sync FAB when the trigger row is gone', () => {
        // closeFloatMenu() removes the focused menu item before the dialog opens, so
        // document.activeElement is <body> by the time openModalWithFocus records it.
        expect(openBody).toMatch(/_returnFocus/);
        expect(openBody).toMatch(/_glyph\(\)/);
    });

    it('close animates + returns focus through closeModalWithAnim', () => {
        const closeBody = syncUi.slice(syncUi.indexOf('function closeQuarantine('));
        expect(closeBody).toMatch(/closeModalWithAnim\('quar-overlay'/);
    });

    it('the overlay is registered in MODAL_CLOSERS so Esc and the backdrop find it', () => {
        expect(syncUi).toMatch(/MODAL_CLOSERS\[\s*'quar-overlay'\s*\]\s*=/);
        // the registry itself must stay a mutable object exposed to later modules
        expect(modals).toMatch(/const MODAL_CLOSERS = \{/);
        expect(modals).toMatch(/MODAL_CLOSERS,/);
    });

    it('refresh rebuilds the list in place instead of tearing the dialog down', () => {
        // close+open on every Restore/Dismiss would drop the focus trap, re-run the
        // open animation and bounce focus to the FAB mid-review.
        const refresh = syncUi.slice(
            syncUi.indexOf('function _refreshQuarOverlay()'),
            syncUi.indexOf('function closeQuarantine(')
        );
        expect(refresh).not.toMatch(/openQuarantine\(\)/);
        expect(refresh).toMatch(/\.sync-quar-list/);
    });
});
