// Runs the ported node test harnesses (tests/harness/*) as vitest cases.
// Each harness is a standalone script that prints pass/fail counts and exits
// non-zero on any failure — we spawn it and assert a clean exit, surfacing its
// stdout on failure so the broken case is visible in the vitest report.
import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));

const HARNESSES = [
    ['sync merge engine (Phase 1, 39 cases)', 'sync-merge.cjs'],
    ['sync GC (Phase 4, 13 cases)',           'sync-gc.cjs'],
    ['cloud transport (Phase 2, 24 cases)',   'cloud-transport.cjs'],
    ['worker OAuth handlers (17 cases)',      'worker-oauth.mjs'],
];

describe('node harnesses', () => {
    for (const [label, file] of HARNESSES) {
        it(label, async () => {
            let out;
            try {
                out = await run(process.execPath, [path.join(HERE, 'harness', file)]);
            } catch (e) {
                // non-zero exit → show the harness output (it names the failed cases)
                throw new Error(`${file} failed (exit ${e.code}):\n${e.stdout || ''}${e.stderr || ''}`);
            }
            expect(out.stdout).toMatch(/ 0 failed/);
        });
    }
});
