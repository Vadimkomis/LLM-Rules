---
name: performance-benchmarking
description: Use when code performance must be measured, baselined, profiled, compared, regression-guarded, or optimized across mobile, Python, Rust, TypeScript/JavaScript, or an unfamiliar stack.
---

# Performance Benchmarking

Measure first, optimize second, and preserve enough evidence to reproduce the
decision.

## Request Modes

| Request | Writes allowed | Required gate |
|---|---|---|
| Plan or audit | None | Report evidence gaps |
| Benchmark | Benchmark and authorized project journal | Preserve production behavior |
| Optimize and verify | Approved benchmark and production files | Baseline, hypothesis, then explicit approval |

For a review or diagnosis request, remain read-only. For an implementation
request, create the benchmark and baseline first; do not treat authorization to
benchmark as authorization to edit production code.

## Required Workflow

1. Read project instructions, existing performance history, tests, benchmark
   conventions, and the relevant code.
2. Define the performance contract and correctness invariants using
   `references/methodology.md`.
3. Detect the known or unknown stack and select tooling using
   `references/stack-recipes.md`.
4. Create and validate an optimized, production-representative baseline.
5. Profile the representative workload and state a falsifiable optimization
   hypothesis.
6. Present the baseline, evidence, expected trade-offs, and test plan. Obtain
   approval before modifying production code.
7. Make the smallest approved change. Rerun the identical benchmark plus
   functional tests and an available representative higher-level check.
8. Classify and report the result using `references/report-contract.md`.
9. Persist authorized project-local learning and run the review in
   `references/continuous-improvement.md`.

## Example

For “benchmark and optimize this parser,” first preserve parser correctness,
benchmark representative inputs, and profile the baseline. Present the measured
bottleneck and proposed change. Only after approval, modify the parser and rerun
the identical contract plus parser tests.

## Safety Gates

- Project instructions and dependency policies override this skill.
- Ask before adding a production dependency; keep benchmark tooling outside
  production artifacts.
- If workload, metric, flags, or environment changes, rerun both baseline and
  candidate.
- Mark unavailable, noisy, thermally unstable, or incomparable measurements
  `inconclusive` or `blocked`.
- Never claim a microbenchmark win as a product win without an available
  representative higher-level check.
- Never edit this reusable skill or an installed equivalent without separate
  explicit approval.

## Red Flags

- “The change is obviously faster.”
- One timed run or a debug-build comparison.
- Different inputs, flags, hardware, or setup between baseline and candidate.
- Faster output with unverified correctness or hidden memory, energy, or latency
  cost.
- Editing production code or this skill before its approval gate.

Stop, restore a comparable contract, and classify unsupported evidence as
`inconclusive`.

## Common Mistakes

- Timing setup accidentally: move setup out unless it is the target.
- Letting work be optimized away: consume and validate the result.
- Chasing a local hotspot without profiling: verify dominant cost first.
- Persisting raw noise as knowledge: journal summarized reproducible evidence.

## Output

Return the performance contract, exact commands and environment, baseline,
profile evidence, approval status, candidate comparison, correctness validation,
decision, journal update, and any proposed reusable-skill improvement.
