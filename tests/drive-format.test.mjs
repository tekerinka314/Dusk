// Pins the Google Drive sync wire format. The committed fixtures were generated
// from the deterministic sample state (tests/fixtures/sample-state.cjs) at the
// pre-migration snapshot (tag v2.2-pre-migration). Any change to 09-sync.js that
// alters the subset shape, the merge output shape, or field defaults breaks this
// test — i.e. Drive-file compatibility regressions fail HERE, not silently in
// the cloud. If a format change is ever INTENTIONAL, it needs an explicit
// migration plan first (see CLAUDE.md sync invariants), then regenerated fixtures.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SYNC = require('../dusk/09-sync.js');
const sampleState = require('./fixtures/sample-state.cjs');

const FIX = p => JSON.parse(readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', p), 'utf8'));

describe('Drive sync wire format (pinned)', () => {
    it('getSyncSubset(sample) matches the committed fixture', () => {
        expect(SYNC.getSyncSubset(sampleState())).toEqual(FIX('drive-subset.json'));
    });

    it('mergeStates(null, subset, null) matches the committed fixture (first-sync path)', () => {
        const { merged, conflicts } = SYNC.mergeStates(null, SYNC.getSyncSubset(sampleState()), null);
        expect(conflicts).toEqual([]);
        expect(merged).toEqual(FIX('merged-null-base.json'));
    });

    it('collection registry is stable (names, keys, strategies)', () => {
        expect(SYNC.SYNC_COLLECTIONS.map(({ name, key, strategy, pool }) => ({ name, key, strategy, pool }))).toEqual([
            { name: 'tasks',         key: 'uid', strategy: 'task',   pool: true  },
            { name: 'groups',        key: 'uid', strategy: 'fields', pool: false },
            { name: 'notes',         key: 'id',  strategy: 'whole',  pool: true  },
            { name: 'templates',     key: 'uid', strategy: 'fields', pool: false },
            { name: 'noteTemplates', key: 'id',  strategy: 'fields', pool: false },
        ]);
    });

    it('storage keys are stable', () => {
        expect(SYNC.K_SYNC_BASELINE).toBe('dusk_sync_baseline_v1');
        expect(SYNC.K_SYNC_PREMERGE).toBe('dusk_sync_premerge_v1');
    });
});
