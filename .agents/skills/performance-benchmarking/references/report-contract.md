# Report Contract

Use this shape for plans, baselines, candidate comparisons, and blocked runs.
Lead with the decision, then the evidence.

## Benchmark Plan

```text
Objective:
Target and boundary:
Primary metric (unit and direction):
Secondary metrics/limits:
Workload matrix:
Correctness invariants:
Build/runtime configuration:
Existing SLO or decision threshold:
Framework and reason selected:
Baseline command:
Functional and higher-level checks:
Known limitations:
```

Do not begin production optimization until these fields are decision-complete
and the baseline has run successfully.

## Result

Report every field:

1. **Decision:** `accepted`, `rejected`, `inconclusive`, or `blocked`.
2. **Objective and contract:** target, metrics, direction, workloads, and
   correctness invariants.
3. **Environment:** stack, framework/version, revision and dirty state,
   compiler/runtime, build flags, OS, hardware/device, and relevant thermal or
   power state.
4. **Commands:** exact baseline, profile, candidate, functional, and
   higher-level commands, including failures and exit status.
5. **Baseline:** per-workload samples, central tendency, dispersion, and
   secondary resources.
6. **Profile and hypothesis:** measured bottleneck, expected mechanism, and
   approval status.
7. **Candidate:** identical-contract statistics, absolute delta, directional
   percentage improvement, and secondary changes.
8. **Validation:** correctness tests, representative higher-level result, and
   re-profile evidence.
9. **Limitations:** noise, missing tooling, nonrepresentative environments, and
   claims the evidence does not support.
10. **Learning:** project-journal update, next hypothesis, and any separately
    approval-gated reusable-skill proposal.

## Decision Semantics

| Decision | Meaning |
|---|---|
| `accepted` | Correctness passes, evidence is comparable, required checks pass, and the trade-off is approved. |
| `rejected` | The candidate is slower, violates a limit, fails correctness, or its trade-off is not justified. |
| `inconclusive` | Runs completed, but variance, environment, sample size, or scope cannot distinguish the result reliably. |
| `blocked` | Required tooling, device, permission, data, build, or dependency authorization is unavailable. |

Never silently convert `inconclusive` into `accepted`. A rejected experiment is
still useful when its evidence and lesson are recorded.

## Compact Comparison Table

```text
Workload | Metric | Baseline | Candidate | Absolute delta | Improvement | Dispersion | Decision
```

State whether higher or lower is better beside every ambiguous metric. Include
secondary regressions even when the primary metric improves.
