# Continuous Improvement

Run this review at the beginning and end of every invocation. It does not run as
an unsupervised background process; improvement happens when the skill is
invoked or through separately authorized CI/automation.

## Start-of-Run Review

1. Read the project's existing benchmark source, CI thresholds, performance
   budgets, and journal.
2. Check whether code, workloads, toolchain, dependencies, hardware, or product
   requirements have made prior assumptions stale.
3. Reuse validated commands and fixtures when still comparable.
4. Do not treat an old result from different hardware or build settings as a
   current baseline.

## Project-Local Lane

During authorized implementation work, maintain the project's existing
performance record. If none exists and no project convention conflicts, create
`docs/performance/benchmarks.md`.

For each experiment, record:

- date, revision, dirty state, owner/request, and target;
- performance contract and correctness invariants;
- exact commands and summarized environment;
- baseline and candidate statistics;
- profile evidence and hypothesis;
- decision and trade-offs;
- invalidated assumptions, caveats, and next hypothesis;
- paths to benchmark source and retained machine-readable artifacts.

Keep large raw outputs in the framework's artifact location or an untracked
temporary directory unless the repository explicitly versions them. Never store
secrets, private datasets, user data, or machine-specific credentials.

Allowed automatic improvements within the requested implementation scope:

- correct a biased or broken harness;
- add missing representative sizes or lifecycle states;
- add correctness guards or secondary resource metrics;
- update stale commands and journal entries with traceable evidence;
- preserve a newly discovered stack recipe for this project.

For plan, audit, or diagnosis requests, remain read-only and propose these
updates instead of writing them.

## End-of-Run Retrospective

Answer with evidence:

1. Which assumption was wrong or stale?
2. Which noise source, bias, or comparability problem appeared?
3. Which metric, workload, or correctness guard was missing?
4. Did an unknown stack require a repeatable new recipe?
5. Which lesson is project-specific, and which could help unrelated projects?

## Reusable-Skill Lane

A reusable change is eligible only when it is:

- generalizable beyond the current repository;
- supported by repeatable measurements or current authoritative guidance;
- free of project secrets, private data, and project-specific paths;
- compatible with the measurement, approval, and dependency gates;
- concise enough for the core skill or clearly routed to a focused reference;
- accompanied by activation, contract, installation, and regression validation
  appropriate to the change.

One fast result is never sufficient evidence for self-modification. Failed or
inconclusive experiments may strengthen safeguards, but cannot become
optimization advice.

Present a proposal containing:

1. observed gap and evidence;
2. exact reusable files and wording to change;
3. expected behavior and affected stacks;
4. risks, conflicts, and rollback;
5. tests or pressure scenarios that fail before the edit and pass after it.

Wait for separate explicit approval. Do not edit
`.agents/skills/performance-benchmarking/`, a personal installed copy, or a
distributed plugin copy merely because the project journal was authorized.
