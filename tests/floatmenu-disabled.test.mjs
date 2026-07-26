// V2-B4-05 — dead items in the float-menu family (.snooze-menu popovers and the
// coarse action-sheet) looked identical to live ones: the shared popover skin had
// NO disabled rule at all, so «Синхронизировать сейчас» while signed out rendered
// at full strength and swallowed the click silently.
//
// This is a source contract lock (same shape as contrast-tokens / icon-ratchet):
// the skin lives in style.css and the markup in a template literal, so there is no
// unit-testable seam short of booting all 12 modules.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'style.css'), 'utf8');
const syncUi = readFileSync(join(ROOT, 'dusk', '11-sync-ui.ts'), 'utf8');

describe('V2-B4-05 — disabled state in the float-menu family', () => {
    it('the shared popover skin carries a disabled rule (dim + not-allowed)', () => {
        // the rule block that owns `.snooze-menu button:disabled`
        const m = css.match(/\.snooze-menu button:disabled[^{]*\{([^}]*)\}/);
        expect(m, '.snooze-menu button:disabled rule missing from style.css').toBeTruthy();
        const body = m[1];
        expect(body).toMatch(/cursor:\s*not-allowed/);
        expect(body).toMatch(/opacity:\s*0?\.\d+/);
    });

    it('hover/active affordances in the popover skin exclude disabled items', () => {
        // a bare `:hover` still matches a disabled button — the dim would be
        // cancelled by the hover background and the item would read as live.
        const hovers = css.match(/^\.snooze-menu[^\n{]*:(?:hover|active)[^\n{]*\{/gm) || [];
        expect(hovers.length).toBeGreaterThan(0);
        for (const sel of hovers) {
            expect(sel, `unguarded hover/active selector: ${sel.trim()}`)
                .toMatch(/:not\(:disabled\)/);
        }
    });

    it('sync panel emits aria-disabled alongside the native disabled attribute', () => {
        // native `disabled` blocks the click and keeps _apMenuKeyNav from landing
        // on a dead row; aria-disabled makes the state announceable in browse mode.
        const emits = syncUi.match(/'\s+disabled[^']*'/g) || [];
        expect(emits.length, 'no disabled attribute emitted by the sync panel').toBeGreaterThan(0);
        for (const e of emits) {
            expect(e, `disabled emitted without aria-disabled: ${e}`)
                .toMatch(/aria-disabled="true"/);
        }
    });
});
