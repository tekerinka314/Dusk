# MASTER PROJECT QUALITY SPECIFICATION ## Comprehensive Quality Audit Specification for Fable 5

Before doing anything else, stop and treat this document as an initial draft, **not as the final specification**.

Your first responsibility is **not** to start auditing the project.

Your first responsibility is to completely redesign, improve and expand this specification itself.

You are Fable 5. Your reasoning capabilities exceed those assumed by this document. Therefore you **must not** treat this specification as a fixed instruction set.

Instead:

- identify everything that is missing;
- identify everything that is vague;
- identify weak requirements;
- identify inefficient ordering;
- identify blind spots;
- identify missing audit dimensions;
- identify missing evaluation criteria;
- identify opportunities to improve the audit methodology itself.

Then rewrite this specification into a significantly stronger version before beginning any audit work.

The rewritten specification must become your internal standard for the entire project review.

You are explicitly expected to improve this document as aggressively as possible.

---

# PHASE 0 — Specification Engineering

Before touching the project:

1. Build your own improved version of this specification.

2. Expand it wherever possible.

3. Make it stricter.

4. Increase coverage.

5. Add audit dimensions that are missing.

6. Remove duplicated work.

7. Optimize the order of analysis for maximum efficiency.

8. Balance audit depth against available context so the entire audit fits within approximately one full Claude Pro usage budget while preserving the highest practical quality.

9. Read the current strategic project context before finalizing the improved specification:

• `CLAUDE.md`

• `SYNC-SPEC.md`

• `SYNC-SPEC-PHASE2.md`

• `SYNC-SPEC-PHASE3.md`

• any later sync, migration, worker, architecture, or handoff documents present in the repository.

The improved specification must understand that sync, data durability, migration, build tooling, service worker behavior, deployment, and future platform wrappers are part of the product quality surface.

Do **not** maximize depth blindly.

Maximize **useful findings per unit of context**.

---

# PHASE 1 — Clarification

Only after the specification has been redesigned:

Begin asking me clarification questions.

Do not limit yourself to questions at the beginning.

Whenever you discover an ambiguity that can materially affect audit quality:

STOP.

Ask.

Continue only after clarification.

Your objective is maximizing audit quality, not minimizing interruptions.

---

# PHASE 2 — Repository Understanding

Treat the repository as completely unfamiliar.

Do not assume previous knowledge.

Read and understand the entire project.

Build an architectural model including:

• project structure

• application boundaries

• modules

• responsibilities

• state flow

• storage

• rendering

• communication between systems

• shared utilities

• lifecycle

• event flow

• rendering pipeline

• styling architecture

• animation architecture

• mobile architecture

• PWA architecture

Build a complete mental model before evaluating quality.

---

# PROJECT PHILOSOPHY

The repository now represents one ecosystem consisting of two tightly related applications:

• DUSK
• Grimuar

They must not be audited independently.

They must be treated as one product ecosystem.

Every audit must constantly compare them.

Whenever one application solves a problem better than the other, this is potentially a project issue.

Cross-app consistency is a first-class audit category.

The product philosophy also includes a non-negotiable data principle:

**Never lose user data.**

This applies to normal edits, undo/redo, import/export, archive/restore, note history, sync, conflict resolution, migration, storage upgrades, device replacement, offline usage, cloud failures, and partial deployments.

Any design, UX, architecture, or performance recommendation that creates a realistic risk of data loss must be rejected or redesigned.

---

# AUDIT STRATEGY

Perform the audit by **aspects**, not by files.

Each aspect is completed before moving to the next.

Each aspect becomes one audit batch.

No arbitrary splitting.

No batching by token count.

One completed aspect = one completed batch.

After each batch:

• produce a concise report;
• document every confirmed issue in memory;
• explain root causes;
• explain proposed solutions;
• record implementation guidance in enough detail that a future Sonnet 5 or Opus 4.8 session, without this audit's context, could implement the fixes to essentially the same quality as Fable.

This documentation is critical.

The implementation quality must depend on the documentation—not on your future memory.

---

# AUDIT PRIORITY

Audit in approximately this order, while allowing yourself to reorder if a different sequence produces a better result.

GLOBAL AUDIT GUARDRAILS

The following guardrails are not separate audit batches.
They are mandatory evaluation lenses applied to every priority below.

They must be evaluated throughout every audit batch, not only in one isolated section.
If they conflict with the ordinary order below, data safety and migration correctness win.

Guardrail A

SYNC, DATA DURABILITY, AND DEVICE PORTABILITY

Audit sync as a core product architecture, not as an optional feature.

Evaluate:

local-first model coherence

data-loss protection

3-way merge correctness

baseline handling

stable uid identity

updatedAt bumps on every meaningful mutation

tombstone behavior

tombstone GC safety

conflict quarantine journal integrity

recoverability of losing conflict versions

delete-vs-edit behavior

tasks / archive sync semantics

groups sync semantics

notes / notesArchive sync semantics

templates sync semantics

subtask sync semantics

sync subset extraction and application

app reload behavior

offline periods

OAuth expiry

device replacement

cloud version conflicts

pending local changes after cloud errors

manual export/import as no-login fallback

sync UI clarity

Google Drive appDataFolder boundary

Cloudflare Worker boundary

token, refresh-token, secret, and CORS safety

cross-device wake behavior

retry, debounce, and conflict retry behavior

two-device / two-profile test coverage

This priority must explicitly search for silent data-loss paths.
Silent loss is worse than a visible error.

Guardrail B

NEW ARCHITECTURE AND MIGRATION SAFETY

Audit the ongoing architectural migration as its own product risk.

Evaluate:

Vite build correctness

source / dist / service worker coherence

ES module load order

globalThis bridge contracts

classic-script assumptions that survived inside module files

TypeScript migration safety

any-based blind spots

test coverage of migration bridges

worker separation from the frontend build

deployment configuration

service worker update flow

current IndexedDB/storage-layer correctness and any remaining storage migration safety

future Android / Windows wrapper boundaries

temporary migration scaffolding

rollback points

whether architectural changes are sliced small enough to review and reverse

The audit must distinguish between current architecture, transitional architecture, target architecture, acceptable temporary migration debt, and migration debt that is already dangerous.

Do not recommend a broad rewrite unless the audit proves that incremental migration cannot meet the project's safety and quality goals.

Priority 1

MOBILE EXPERIENCE

This is the highest priority.

Audit not only responsive layout.

Audit the complete mobile product.

Primary target device:

Modern Android phones around **6.6–6.7 inches**.

Other phone sizes should be reviewed secondarily.

Evaluate:

layout

touch ergonomics

thumb reach

spacing

hit targets

gesture interactions

virtual keyboard behavior

focus behavior

scrolling

overscroll

drag and drop

long press

dropdown usability

modal usability

animations

performance

safe areas

orientation

mobile typography

readability

mobile navigation

mobile workflows

discoverability

feature parity

mobile-specific bugs

mobile visual polish

mobile interaction polish

and every other aspect that materially affects the mobile experience.

Perform an actual visual review of every important screen from a mobile perspective.

---

Priority 2

GOTHIC DESIGN LANGUAGE

This project intentionally uses a gothic visual identity.

Do not evaluate only aesthetics.

Evaluate whether it feels like a professionally art-directed product.

Look for:

generic UI

AI-looking design

bootstrap-like components

material-looking components

generic web icons

weak artistic identity

visual inconsistency

human craftsmanship

cohesion

design personality

distinctiveness

elegance

taste

timelessness

Every recommendation must preserve gothic identity while simultaneously improving usability.

Never sacrifice usability for style.

Never sacrifice style for generic usability.

---

Priority 3

GLYPHS & ICONOGRAPHY

Audit every icon.

Evaluate:

semantic clarity

recognizability

stroke consistency

weight

alignment

style

hover behavior

animation

consistency

readability

visual balance

cross-app consistency

Every icon should simultaneously:

fit the gothic language,

be immediately understandable,

and feel handcrafted rather than AI-generated.

---

Priority 4

UI

Audit every visual component.

Look for:

alignment

spacing

visual hierarchy

component consistency

density

contrast

readability

typography

grid

layout

balance

visual rhythm

proportions

color usage

hover states

focus states

disabled states

empty states

loading states

error states

success states

component reuse

visual consistency

design language consistency

---

Priority 5

UX

Audit:

discoverability

learnability

mental models

interaction cost

workflow friction

error prevention

error recovery

feedback quality

interaction consistency

keyboard workflow

mouse workflow

mobile workflow

user confidence

microinteractions

information architecture

progressive disclosure

cognitive load

overall usability

---

Priority 6

FUNCTIONAL CORRECTNESS

Audit every subsystem.

Search for:

bugs

edge cases

race conditions

broken flows

state inconsistencies

missing validation

logic contradictions

incorrect persistence

desynchronization

missing refreshes

incorrect transitions

unexpected interactions

silent failures

sync state divergence

stale baseline behavior

duplicate or missing uid

missing timestamp bumps

accidental resurrection after deletion

archive/live location conflicts

group identity translation errors

unresolved conflict journal corruption

offline edit replay failures

OAuth/session expiry edge cases

cloud version conflict retry failures

migration fallback failures

source/dist/service-worker mismatch

and every other functional weakness.

---

Priority 7

ANIMATION & MOTION

Treat motion as its own design system.

Audit:

timing

easing

anticipation

continuity

interruption

cancellation

microinteractions

motion consistency

jumpiness

layout shifts

reflow artifacts

animation interruptions

state synchronization

visual smoothness

perceived quality

---

Priority 8

PERFORMANCE

Evaluate:

DOM

layout

paint

compositing

memory

timers

storage

render cost

animation FPS

event listeners

CSS complexity

JavaScript complexity

potential bottlenecks

unnecessary recalculations

sync merge cost on large states

render cost after sync apply

debounce behavior under rapid edits

storage write frequency

localStorage / IndexedDB storage-layer cost

service worker update cost

bundle size impact from migration

worker/network round-trip behavior

---

Priority 9

ARCHITECTURE, SYNC ARCHITECTURE, AND MIGRATION ARCHITECTURE

Audit:

module boundaries

coupling

abstractions

dependency direction

responsibility separation

technical debt

maintainability

extensibility

future scalability

shared utilities

code organization

data model architecture

sync architecture

migration architecture

build architecture

deployment architecture

test architecture

Specifically evaluate:

whether sync is isolated into clear layers: model, merge, cloud transport, orchestration, UI, worker

whether core merge logic remains pure and testable

whether UI code cannot accidentally change merge semantics

whether cloud transport cannot mutate live state directly

whether worker code is kept outside the Vite frontend bundle

whether TypeScript types describe the real sync/data model

whether storage migrations are reversible or recoverable

whether source modules and generated artifacts have a clear ownership rule

whether temporary global bridge patterns are documented and constrained

whether the current IndexedDB/storage layer and planned native wrappers can be supported without rewriting sync again

---

Priority 10

CODE QUALITY

Audit:

duplication

dead code

naming

readability

complexity

large functions

repeated patterns

magic values

comments

maintainability

testability

---

Priority 11

SECURITY

Audit:

unsafe HTML

XSS

storage safety

input validation

sanitization

unsafe browser APIs

potential abuse vectors

---

Priority 12

PWA

Audit:

manifest

service worker

offline behavior

cache strategy

update flow

installation

consistency

---

Priority 13

CROSS-APP PARITY

Continuously compare DUSK and Grimuar.

Look for:

missing shared features

uneven polish

inconsistent workflows

better implementations

shared bugs

shared improvements

opportunities for unification

opportunities for shared infrastructure

---

Priority 14

PROJECT EVOLUTION

Do not only search for bugs.

Search for valuable evolution opportunities.

Propose only ideas that are:

valuable,

architecturally coherent,

reasonably implementable,

consistent with the project's philosophy.

Small but high-impact improvements are preferred over huge speculative features.

Especially search for:

features present in one application but missing in the other;

features implemented differently where one implementation is clearly superior;

small UX improvements;

workflow improvements;

animation improvements;

design refinements;

codebase simplifications;

module-level improvements.

---

# ROOT CAUSE POLICY

Finding a bug is never the endpoint.

For every confirmed issue continue asking:

Why did it happen?

Why was it possible?

Can the architecture prevent similar issues?

Can multiple issues be eliminated together?

Can the implementation become simpler?

Can UX improve simultaneously?

Can DUSK and Grimuar be unified?

Can the solution become more elegant?

Stop only after the problem has been explored exhaustively.

---

# DELIVERABLES

Each completed audit batch must produce:

• audited scope

• confirmed issues

• suspected issues

• root causes

• implementation strategy

• risks

• cross-app observations

• high-value improvement ideas

• implementation notes detailed enough for future implementation without Fable context

---

# FINAL DELIVERABLE

After all audit batches are completed:

Produce:

1. Executive summary

2. Complete issue list

3. Prioritized roadmap

4. Cross-app parity report

5. UI review

6. UX review

7. Mobile review

8. Gothic design review

9. Iconography review

10. Motion review

11. Performance review

12. Security review

13. Architecture review

14. Code quality review

15. PWA review

16. Evolution opportunities

17. Technical debt report

18. Final implementation memory

19. Sync and data durability review

20. Migration architecture review

21. Deployment and service worker coherence review

22. Test coverage map

23. Rollback and recovery map

The final implementation memory must contain every confirmed issue together with implementation guidance detailed enough that a future implementation session performed by Sonnet 5 or Opus 4.8 could reproduce the intended solution with essentially the same quality, even without access to this audit session.

The final implementation memory must explicitly preserve:

• sync invariants

• migration invariants

• known rollback points

• files that must be changed together

• tests that must be run for sync, migration, worker, service worker, and build changes

Every finding should also be tagged with evidence quality:

• confirmed by code

• confirmed by runtime test

• confirmed by visual review

• inferred but not confirmed

• hypothesis requiring clarification

Use separate severity axes:

• user impact

• data-loss risk

• regression risk

• implementation cost

• confidence

One strict rule:

**Do not implement any fixes after the audit.**

After the audit is complete, wait for my explicit approval before making any code changes.



