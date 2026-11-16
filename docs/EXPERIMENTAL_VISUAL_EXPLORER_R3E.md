# HITO Phase 3 — Visual Project Explorer: bounded R3E laboratory evidence

> **Development report, not a release announcement.** The R3E code described here is **not** included in public `main` or the published `v0.1.0-rc.1` distribution. The results below refer to a separately staged, isolated Windows development-host trial. This page does not provide a reproducible public build of R3E.

## Purpose and authority boundary

The Visual Project Explorer experiment asks whether HITO can present *observed physical files*, *qualified semantic source-path facts*, *bounded physical source coverage*, and *static structural relationships* in one VS Code interface without converting an observed relationship into a claim of runtime, causation, intent, completion, or canonical project truth.

The project model remains IDEA / WHAT / HOW / RESULT with continuity and contradiction rails. The `.maat/` canonical namespace was not migrated. A derived graph remains **noncanonical**, **read-only**, and **not executed**; UNKNOWN is displayed explicitly.

## Staged experiment (maintainer-reported, November 2026)

| Gate | Narrow result | Evidence boundary |
| --- | --- | --- |
| R3A | 11 qualified facts visible in the accepted semantic projection | Source-path facts, not inferred ownership or behavior |
| R3B | Facts linked by exact recorded source paths | Evidence-chain links, not causal dependencies |
| R3C | 4/4 physical `.cjs` source files observed within the selected `core` and `live` scopes | Not a census of the full original repository; `docs` and `tests` were missing from the shadow |
| R3D | Isolated six-file shadow project, GUI parity passed within its scope | The original HITO worktree remained outside this experiment |
| R3E provider audit | 18/18 regression tests passed; 6 nodes, 1 observed edge, 7 UNKNOWN observations | Existing static provider, no execution or canonical authority |
| R3E Visual Explorer stage | 64/64 regression tests passed; 11/11 source locks and 6/6 shadow canonical hashes preserved | Isolated stage, not a published VSIX |
| R3E native VS Code inspection | Human-reviewed screenshot and Inspector show the same static relation and uncertainty labels | One host/session and synthetic cohort, not general UX or cross-platform qualification |

These results were supplied by the project maintainer from an isolated Windows environment. They have **not** been independently reproduced by a fresh external reviewer against a public R3E source bundle. The full local evidence/receipts were not published with this documentation-only change.

## Exact supported example

```text
CONFIGURATION  package.json :: <configuration>
         -- CONFIGURES / SOURCE_OBSERVATION -->
TEST_DEFINITION package.json :: scripts.test
```

- Source provenance: `package.json`, line 1, offset 0.
- Observed source SHA-256: `1a4f32c0332b45b42f5241952ec376e87f081df1f4e067927bd367a58dae63e2`.
- Relationship currentness label: `CURRENT_WITHIN_REPORTED_SCOPE`.
- Graph: **6 structural nodes, 1 observed `CONFIGURES` relationship, 7 UNKNOWN observations**.
- UNKNOWN reasons: `ENTRYPOINT_NOT_OBSERVED` ×2; `UNSUPPORTED_OR_AMBIGUOUS_SOURCE` ×4; `UNSUPPORTED_SLASH_SCAN_TAIL` ×1.
- The GUI kept this static relation visually distinct from the qualified R3A/R3B source-path fact links.
- Optional Graphify separately reported `GRAPHIFY_NOT_PRESENT`; this does not undo the observed relation from the existing structural provider.

**Not inferred:** module import/call/dependency chains, runtime execution, behavioral correctness, whole-repository coverage, ownership, whether nonobserved edges exist, or verified project intent. In this cohort the four-coordinate semantic presentation still reported IDEA as UNKNOWN and WHAT/HOW/RESULT as partially established.

## What public RC1 users can and cannot do

The public `main` source and `v0.1.0-rc.1` describe the existing CLI and bounded VS Code projections. **They do not ship the R3A–R3E Visual Project Explorer shown in the isolated trial.** Do not follow this document as installation instructions for a new release. Keep using the existing [Quick Start](QUICKSTART.md) and [Limitations](LIMITATIONS.md) for RC1.

The successful R3E lab output did not qualify production readiness. Visible host indicators such as `HITO // Not known yet` and an unrelated VS Code Problems count were not adjudicated as part of the visual relationship gate.

## Required gates before proposing a public feature version

1. Recover the **exact** source payloads from the accepted isolated R3E stage (the visual entry/Explorer/template/semantic/relations/coverage/structural modules and matching tests). Verify each file against the accepted stage or payload manifest, retaining all provenance and not copying `.maat/` data or private host paths.
2. Compare the isolated stage against public `main`, including locally repaired core provider files that differ from public Git blobs. **Do not overwrite the published baseline or silently promote a local version.** Review and adjudicate each diff independently.
3. Integrate on a dedicated non-`main` branch; run complete existing tests, R3A–R3E regression, source/hash and canonical namespace postflight, and checks for secret/path leakage.
4. Build a fresh VSIX from that branch; inspect the package contents; install it in a clean VS Code profile; repeat real GUI checks on controlled fixtures and record explicit failures/UNKNOWN. Include a real-source bounded trial before broad usefulness claims.
5. Only then review/merge a code pull request and separately decide whether a new prerelease is justified. No automatic marketplace release or migration.

## Decision for this documentation change

**Documentation-only / no runtime behavior change / no new installation surface.** It exposes an evidence-bounded milestone and the remaining qualification gap, without implying that the experimental code was merged or that the release candidate changed.
