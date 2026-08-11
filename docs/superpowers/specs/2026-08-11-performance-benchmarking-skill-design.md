# Performance Benchmarking Skill Design

## Context

The playbook needs a reusable skill that can create trustworthy benchmarks for
application, library, service, and mobile code. It must work across known stacks
such as iOS, Android, Python, Rust, and TypeScript/JavaScript while remaining
useful for languages that are not named in advance.

The skill follows the measurement-first principles in Abseil's
[Performance Hints](https://abseil.io/fast/hints.html): estimate where
performance matters, profile before optimizing, use representative
microbenchmarks carefully, and validate local wins in a broader workload.

## Goals

- Create or improve reproducible performance benchmarks for any runnable stack.
- Establish a trustworthy baseline before production optimization begins.
- Diagnose bottlenecks and form evidence-backed optimization hypotheses.
- Require user approval before changing production code.
- Prove or disprove each optimization with comparable before-and-after results.
- Preserve useful project knowledge between invocations.
- Continuously identify improvements to the reusable skill without allowing it
  to rewrite itself without approval.
- Integrate the skill into the playbook's Codex and Claude installation paths,
  metadata checks, activation fixtures, documentation, and evals.

## Non-goals

- A permanently running background performance service.
- A single benchmark framework imposed on every ecosystem.
- Fabricated results when a compiler, runtime, device, workload, or profiler is
  unavailable.
- Automatic changes to production code, production dependencies, public APIs,
  or the reusable skill's own instructions.
- Replacing end-to-end performance validation with microbenchmarks.

## User-visible capability

The canonical skill is named `performance-benchmarking`. It activates when a
user asks to benchmark code, establish a performance baseline, diagnose a hot
path, compare implementations, prevent performance regressions, or optimize
code with measured evidence.

The skill supports three request modes:

1. **Plan or audit:** remain read-only and return a benchmark design or an
   assessment of existing benchmarks.
2. **Benchmark:** create or improve benchmark code, execute it, and record a
   baseline without modifying production behavior.
3. **Optimize and verify:** benchmark and profile first, present the proposed
   production change, wait for approval, implement it, run correctness checks,
   and compare it with the unchanged baseline.

The default for an implementation request is optimize and verify. Approval is
still required at the production-change boundary.

## Skill architecture

The skill will live at:

```text
.agents/skills/performance-benchmarking/
  SKILL.md
  references/
    methodology.md
    stack-recipes.md
    continuous-improvement.md
    report-contract.md
```

`SKILL.md` contains the compact activation rules, workflow, safety gates, and
reference routing. The reference files keep detailed material out of the main
context until it is relevant:

- `methodology.md` defines benchmark design, measurement hygiene, comparison,
  profiling, and validation rules.
- `stack-recipes.md` provides first-class routing for iOS, Android, Python,
  Rust, and TypeScript/JavaScript, followed by the unknown-stack protocol.
- `continuous-improvement.md` defines persistent project learning and the
  approval-gated process for proposing changes to the reusable skill.
- `report-contract.md` defines the required benchmark plan, result summary, and
  optimization decision fields.

The skill remains platform-neutral. The existing installer copies the canonical
directory into `.agents/skills/` for Codex and `.claude/skills/` for Claude.
No custom agent adapter is needed because benchmarking and optimization occur
in the active implementation conversation.

## Benchmark workflow

### 1. Establish the performance contract

Before writing a harness, the skill identifies:

- the code path and user-visible or system-level reason it matters;
- the primary metric, units, direction of improvement, and any secondary
  metrics or resource constraints;
- representative inputs, sizes, concurrency, cache state, and lifecycle state;
- correctness invariants that both baseline and candidate must satisfy;
- the required optimization/build configuration;
- the comparison threshold or project SLO, when one exists.

The skill does not invent a universal percentage threshold. When the project
has no performance budget, it reports the measured effect and uncertainty
without relabeling a small change as meaningful.

### 2. Inspect and estimate

The skill inspects the relevant code, build configuration, existing benchmarks,
tests, profiles, and project instructions. It performs a back-of-the-envelope
cost estimate to identify likely dominant work before reaching for local code
tweaks. It distinguishes initialization, hot-path, batch, interactive, and
library behavior.

The methodology reference includes the rough operation-cost table from
Abseil's Performance Hints beside its canonical source link. The table is an
offline order-of-magnitude aid for ranking likely costs and forming hypotheses;
it is never a benchmark result, baseline, performance budget, or SLO. The skill
must identify the values as illustrative and hardware-dependent, encourage a
project-specific cost model where useful, and require measurement on the target
runtime, device, workload, and environment before making an optimization claim.
Keeping the table in `references/methodology.md` preserves the compact core
skill while making the estimation guidance available when that reference is
loaded.

### 3. Resolve the benchmark tooling

The resolution order is:

1. Reuse the project's existing benchmark framework and conventions.
2. Use an official or established ecosystem framework already available in the
   project.
3. Consult current official documentation for an unfamiliar or changing stack.
4. Propose a development-only benchmark dependency when it materially improves
   reliability and project policy permits it.
5. Build a minimal generic harness when no suitable framework exists.

Project dependency policy always wins. A new production dependency requires
explicit confirmation. Benchmark tooling must never leak into the production
runtime or artifact unintentionally.

### 4. Build a trustworthy baseline

The harness must:

- use optimized, production-representative build settings unless the target is
  specifically debug-only behavior;
- separate setup, teardown, and data generation from the timed region unless
  they are deliberately part of the metric;
- warm up JITs, caches, runtimes, and devices when the framework requires it;
- run enough independent samples to expose variance;
- use deterministic, representative inputs and document their provenance;
- consume results so compilers cannot remove the measured work;
- verify correctness before or after timing without contaminating the timed
  region;
- reset mutable state between samples when required;
- record toolchain, dependency, OS, hardware/device, build, revision, and
  benchmark-command metadata;
- capture allocation, memory, I/O, energy, frame, or hardware-counter data when
  those resources are relevant and available.

The baseline is immutable for a candidate comparison. If the workload or
harness changes, both baseline and candidate must be rerun under the revised
contract.

### 5. Profile and form a hypothesis

The skill profiles the representative workload before altering production
code. It favors algorithmic and structural opportunities before local
micro-optimizations and checks whether the observed hotspot agrees with the
initial cost estimate.

Each proposed change states:

- the measured bottleneck;
- the mechanism expected to improve it;
- the metric expected to move;
- correctness, complexity, API, memory, battery, and maintainability trade-offs;
- the benchmark and functional checks that could falsify the hypothesis.

### 6. Approval gate and implementation

The skill presents the baseline and hypothesis and requests approval before it
edits production code. It separately requests confirmation for new production
dependencies and any API or behavior change not already authorized.

After approval, the skill makes the smallest coherent change. It preserves the
baseline benchmark and correctness checks so the comparison is not biased by a
candidate-specific harness.

### 7. Compare and validate

The skill reruns the same benchmark in the same environment and reports sample
count, central tendency, dispersion, percentage and absolute delta, and any
confidence or significance calculation supplied by the framework. It does not
hide regressions in secondary metrics.

A microbenchmark improvement must also pass relevant functional tests and, when
available, a representative macrobenchmark, integration workload, UI metric,
or production-like profile. Noisy, thermally throttled, cross-machine, or
otherwise incomparable results are marked inconclusive and rerun or reported as
such.

### 8. Record and improve

The skill writes benchmark source in the project's existing conventional
location. If the project has no performance journal, implementation-mode runs
create `docs/performance/benchmarks.md`. The journal records the performance
contract, commands, environment, revisions, summarized results, decisions,
caveats, and next hypotheses. Large raw output remains in existing tool artifact
locations or an untracked temporary location unless the project explicitly
version-controls it.

At the start of later invocations, the skill reads this journal and checks
whether its benchmark assumptions are stale. At the end, it runs the controlled
self-improvement review described below.

## Stack resolution

### iOS and Swift

Prefer existing XCTest performance tests, Swift package benchmark conventions,
or Instruments/xctrace according to the target. Capture device, OS, thermal
state, build configuration, and simulator limitations. UI responsiveness,
launch, scrolling, memory, and energy work should be validated on a
representative physical device when reliable device results are required.

### Android and Kotlin/Java

Prefer existing Jetpack Microbenchmark or Macrobenchmark infrastructure and the
project's benchmark build variant. Capture device, API level, compilation mode,
thermal state, animation settings, and emulator limitations. Use macrobenchmarks
for startup, frame, scrolling, and user-journey performance.

### Python

Prefer existing pyperf, pytest-benchmark, or project conventions, with `timeit`
as a narrow standard-library fallback. Make interpreter, environment, garbage
collection, process isolation, warmup, and input construction explicit.

### Rust

Prefer the project's existing Cargo benchmark setup or established harness.
Use optimized builds, black-box result consumption, stable inputs, and explicit
allocation or throughput metrics where relevant.

### TypeScript and JavaScript

Prefer existing Vitest bench, Tinybench, Benchmark.js, or project tooling, with
Node performance APIs as a minimal fallback. Account for transpilation,
production bundles, JIT warmup, event-loop effects, garbage collection, browser
versus Node runtimes, and result consumption.

### Unknown languages and runtimes

For an unlisted stack, the skill:

1. Detects the compiler/interpreter, build system, test runner, target runtime,
   and existing performance-related files.
2. Looks for an already installed benchmark facility.
3. Checks current official documentation and established ecosystem practice.
4. Maps the common performance contract and measurement rules onto that tool.
5. If no framework is viable, creates a minimal harness using a monotonic clock,
   warmup when applicable, repeated independent samples, setup isolation,
   correctness checks, result consumption, and environment capture.
6. Records the project-specific recipe and proposes generalizing it only when
   the evidence is reusable.

If the required toolchain, runtime, device, permissions, or representative data
is unavailable, the skill stops with an explicit blocked or inconclusive result.

## Controlled self-improvement

Continuous improvement occurs on every invocation, not as an unsupervised
background process.

The skill automatically maintains project-local knowledge during authorized
implementation work. It may improve benchmark coverage, correct a flawed
harness, add a missing workload dimension, and update the project performance
journal when those changes are within the user's requested scope.

At the end of a run it asks:

- Which assumption was wrong or stale?
- Which source of noise or bias was discovered?
- Which metric, workload, or correctness guard was missing?
- Did an unfamiliar stack require a repeatable new recipe?
- Would a change improve future projects rather than only this repository?

A proposed reusable-skill change must be generalizable, supported by repeatable
evidence or authoritative ecosystem guidance, free of project secrets and
project-specific paths, consistent with existing safety gates, and covered by
skill validation. The skill presents the proposed change and evidence to the
user. It does not edit `.agents/skills/performance-benchmarking/` or an installed
equivalent until the user explicitly approves that edit.

A single fast result is not sufficient evidence for self-modification. Failed
or inconclusive experiments may improve safeguards, but they cannot be promoted
as optimization advice.

## Failure handling

The skill reports instead of concealing:

- missing compilers, profilers, devices, permissions, or benchmark dependencies;
- incorrect, crashing, or optimized-away benchmark work;
- excessive variance, thermal throttling, background interference, or too few
  samples;
- mismatched build flags, workloads, environments, or revisions;
- improvements that trade unacceptable correctness, memory, energy, latency,
  API, or maintainability costs for the primary metric;
- microbenchmark wins that do not survive representative higher-level checks.

It never deletes a user's existing benchmark suite or overwrites benchmark
artifacts without inspecting ownership and scope.

## Output contract

Every completed run reports:

1. Objective and performance contract
2. Stack, framework, environment, revisions, and exact commands
3. Workloads, correctness guards, and benchmark limitations
4. Baseline statistics
5. Profiling evidence and optimization hypothesis
6. Approval status and production changes, if any
7. Candidate statistics and baseline delta
8. Functional and macro-level validation
9. Decision: accepted, rejected, inconclusive, or blocked
10. Project-journal update and any reusable-skill improvement proposal

## Repository integration

Implementation updates:

- `.agents/skills/performance-benchmarking/` with the canonical skill and
  references;
- the canonical skill lists in `src/cli.js`, `tests/cli.test.js`, and
  `tests/capabilities.test.js`;
- `tests/fixtures/skill-activation.json` with direct, indirect, incomplete, and
  negative prompts;
- `README.md`, `features.md`, and `evals.md` to advertise and specify the new
  capability.

No new package dependency is required.

## Verification

Automated tests will verify that:

- the skill has valid, unique metadata and activation fixtures;
- Codex, Claude, and combined installs include the full skill directory;
- `doctor` validates the installed canonical files;
- the skill includes an unknown-stack fallback;
- production edits and skill self-edits are approval-gated;
- project learning and inconclusive-result behavior are explicit;
- the Abseil rough-cost table retains its source and cannot be presented as a
  measured baseline or universal target;
- installation remains preservation-safe.

Because implementation changes JavaScript files, `npm test` must pass after the
changes.

## Acceptance criteria

- A direct or implicit performance request activates `performance-benchmarking`.
- The skill can route first-class stacks and discover unlisted stacks.
- It creates comparable baselines and candidates without changing the benchmark
  contract mid-comparison.
- It never claims an improvement from incomparable or inconclusive evidence.
- Production optimization requires approval after the baseline is available.
- Rough operation costs are available for estimation but never substitute for
  target-environment measurements.
- Project-specific benchmark knowledge persists across invocations.
- Reusable-skill edits require separate explicit approval and validation.
- Installation and doctor flows include the complete skill for both supported
  platforms.
- All repository tests pass without a new dependency.
