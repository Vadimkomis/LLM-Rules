# Benchmark Methodology

Apply these rules to every stack. They adapt the measurement-first guidance in
Abseil's [Performance Hints](https://abseil.io/fast/hints.html) without assuming
C++ or a particular benchmark library.

## 1. Define the Performance Contract

Record the contract before writing or changing a harness:

| Field | Required content |
|---|---|
| Target | Exact path, operation, and boundary being measured |
| Impact | Why latency, throughput, memory, energy, frames, launch, or another metric matters |
| Primary metric | Name, unit, and whether lower or higher is better |
| Secondary metrics | Resource limits and regressions that could invalidate a win |
| Workloads | Representative inputs, sizes, concurrency, cache state, and lifecycle state |
| Correctness | Observable invariants baseline and candidate must both satisfy |
| Build | Optimization mode, runtime, target, and relevant flags |
| Budget | Existing SLO, regression tolerance, or “report effect without a preset threshold” |

Do not invent a universal improvement percentage. Estimate call frequency and
dominant costs so benchmark effort matches real impact.

## 2. Inspect Before Measuring

1. Read project instructions and dependency policy.
2. Find existing benchmarks, profiles, performance budgets, tests, and result
   history.
3. Determine whether the target is initialization, a hot path, a batch,
   interactive UI, library code, I/O, concurrency, or a whole user journey.
4. Make a back-of-the-envelope estimate for the expected dominant operations:
   bytes moved, allocations, calls, locks, disk/network trips, rendering work,
   or algorithmic complexity.
5. Choose micro-, component-, or macrobenchmark scope. Use more than one when a
   local measurement cannot represent user-visible behavior.

### Rough Operation-Cost Reference

For back-of-the-envelope estimation, Abseil's
[Performance Hints](https://abseil.io/fast/hints.html) provides these rough
operation costs:

| Operation | Illustrative rough cost |
|---|---:|
| L1 cache reference | 0.5 ns |
| L2 cache reference | 3 ns |
| Branch mispredict | 5 ns |
| Mutex lock/unlock (uncontended) | 15 ns |
| Main memory reference | 50 ns |
| Compress 1K bytes with Snappy | 1,000 ns |
| Read 4KB from SSD | 20,000 ns |
| Round trip within same datacenter | 50,000 ns |
| Read 1MB sequentially from memory | 64,000 ns |
| Read 1MB over 100 Gbps network | 100,000 ns |
| Read 1MB from SSD | 1,000,000 ns |
| Disk seek | 5,000,000 ns |
| Read 1MB sequentially from disk | 10,000,000 ns |
| Send packet CA->Netherlands->CA | 150,000,000 ns |

These are illustrative, rough, hardware-dependent estimates for comparing
orders of magnitude and prioritizing hypotheses. They are not a measured
baseline, performance budget, SLO, or acceptance threshold. Measure the target
runtime, device, workload, and environment before making an optimization claim.
Where higher-level operations dominate, build a current project-specific cost
model from representative measurements.

## 3. Build a Trustworthy Baseline

- Use optimized, production-representative builds unless debug-only behavior is
  the explicit target.
- Keep data generation, setup, teardown, logging, and assertions outside the
  timed region unless the contract includes them.
- Warm JITs, caches, runtimes, processes, and devices according to the selected
  framework. Do not discard samples ad hoc after seeing the answer.
- Use deterministic inputs that preserve realistic distributions and boundary
  cases. Record generated-data seeds.
- Consume outputs and validate them so compilers or runtimes cannot remove the
  work.
- Reset mutable state between samples when reuse would change the operation.
- Avoid benchmark-order bias. Randomize or interleave candidates when the
  framework supports it; otherwise run order reversals and compare stability.
- Collect enough independent samples to expose variance. Prefer the framework's
  calibration and stability checks over hand-written sleep loops.
- Record revision, dirty state, exact command, tool/framework version,
  compiler/interpreter, dependencies, build flags, OS, hardware/device, power
  mode, and thermal state when relevant.

The baseline contract becomes immutable for the candidate comparison. If any
contract field changes, rerun both versions under the revised contract.

## 4. Measure Relevant Resources

Wall time alone is insufficient when the hypothesis concerns CPU time,
allocations, peak/resident memory, garbage collection, I/O, network calls,
locks, cache misses, energy, app launch, hitches, frame time, or binary size.
Collect the metric closest to the claimed mechanism when tools permit it.

Separate steady-state throughput from cold start. Separate single-thread from
contention workloads. For asynchronous work, measure the intended completion
boundary rather than task submission.

## 5. Profile and State a Falsifiable Hypothesis

Profile the representative baseline before selecting a production edit. Check
that the observed hotspot agrees with the cost estimate. Favor algorithmic,
structural, batching, allocation, copying, and API-boundary improvements before
local instruction tweaks.

Each hypothesis states:

- measured bottleneck and supporting profile;
- mechanism expected to change;
- primary and secondary metrics expected to move;
- workload where the effect should appear;
- correctness, memory, energy, API, complexity, and maintenance trade-offs;
- benchmark and functional result that would disprove it.

Present this evidence and obtain approval before production edits.

## 6. Compare Baseline and Candidate

Run the identical contract on the same environment. Report raw units as well as
relative change, sample count, central tendency, and dispersion. Include
framework-provided percentiles, confidence intervals, significance, or relative
margin of error when available; do not manufacture precision the framework did
not produce.

Compute one signed relative change for every metric:

`relative change = (candidate - baseline) / baseline * 100`

The sign describes movement from the baseline; interpret it using the declared
metric direction:

| Metric direction | Example | Relative change | Report |
|---|---|---:|---|
| Lower is better | `100 ms -> 80 ms` | `-20%` | Latency decreased 20% (better). |
| Higher is better | `1000 -> 1200 requests/s` | `+20%` | Throughput increased 20% (better). |

Always name the metric, movement, magnitude, and whether the movement is better
or worse. Never report a bare claim such as “20% faster.”

Never hide secondary regressions behind the primary percentage. Compare against
the predeclared SLO or tolerance when one exists. Otherwise describe the effect
and uncertainty and let the user decide whether complexity is justified.

## 7. Validate Beyond the Microbenchmark

Before accepting a candidate:

1. Run the target's functional and regression tests.
2. Recheck every correctness invariant.
3. Run an available component, macro, UI, end-to-end, or production-like
   workload.
4. Re-profile to confirm the intended mechanism changed and work was not merely
   displaced.
5. Inspect secondary resource metrics and supported-platform behavior.

If no representative higher-level check exists, label that limitation; do not
translate the microbenchmark result into a product claim.

## Rationalization Check

| Claim | Required response |
|---|---|
| “This is too small to benchmark.” | Estimate call frequency and cost; measure if it can affect the contract. |
| “One run is enough.” | Collect independent samples and report dispersion. |
| “The profiler is unnecessary.” | Profile before choosing the production edit. |
| “The harness had to change for the candidate.” | Rerun both versions under the revised contract. |
| “The microbenchmark improved, so ship it.” | Run correctness and an available representative higher-level workload. |
| “The result is close enough.” | Report uncertainty and classify it as inconclusive when noise covers the effect. |

## Invalid or Inconclusive Evidence

Reject or rerun measurements with:

- incorrect output, crashes, dead-code elimination, or unconsumed results;
- mismatched inputs, builds, flags, revisions, hardware, devices, or runtimes;
- insufficient samples, excessive variance, thermal throttling, background load,
  or unstable power/frequency behavior;
- cross-machine results without an explicit calibrated design;
- a candidate-specific timed region or setup;
- instrumentation overhead used as if it were normal timing;
- a local win that fails functional or representative higher-level checks.

Return `blocked` when required tooling, permissions, devices, or representative
data are unavailable. Return `inconclusive` when execution completed but the
evidence cannot distinguish the candidate reliably.
