# Performance Benchmarking Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cross-stack `performance-benchmarking` skill that creates trustworthy baselines, approval-gates production optimization and self-edits, learns from project history, and installs correctly for Codex and Claude.

**Architecture:** Keep the main `SKILL.md` compact and route detailed benchmark methodology, stack selection, continuous improvement, and reporting to four focused reference files. Extend the existing static skill registry and doctor checks so the installer copies and validates the entire skill directory, then document explicit `$performance-benchmarking` and implicit CLI usage.

**Tech Stack:** Markdown Agent Skills, Node.js CommonJS CLI, `node:test`, JSON activation fixtures, Git.

## Global Constraints

- Do not add a package dependency.
- Ask for confirmation before adding any new production dependency in target projects.
- Prefer each target project's existing benchmark framework and conventions.
- Require a measured baseline and explicit approval before editing target production code.
- Allow automatic project-local learning only during authorized implementation work.
- Require separate explicit approval before editing the reusable skill itself.
- Treat unavailable or incomparable measurements as blocked or inconclusive, never as improvements.
- Always run `npm test` after modifying JavaScript files.
- Preserve existing user files unless `--force` is supplied.

## File map

- `.agents/skills/performance-benchmarking/SKILL.md`: activation, modes, core workflow, approval gates, and reference routing.
- `.agents/skills/performance-benchmarking/references/methodology.md`: benchmark contracts, baseline hygiene, profiling, statistical comparison, and failure rules.
- `.agents/skills/performance-benchmarking/references/stack-recipes.md`: iOS, Android, Python, Rust, TypeScript/JavaScript, and unknown-stack routing.
- `.agents/skills/performance-benchmarking/references/continuous-improvement.md`: project journal and approval-gated reusable-skill proposal process.
- `.agents/skills/performance-benchmarking/references/report-contract.md`: required plan and result fields.
- `tests/capabilities.test.js`: canonical metadata, reference, safety, fallback, and documentation contracts.
- `tests/fixtures/skill-activation.json`: direct, indirect, incomplete, and negative activation examples.
- `src/cli.js`: canonical registry plus recursive doctor checks for skill references.
- `tests/cli.test.js`: Codex/Claude installation and reference-corruption coverage.
- `README.md`: capability catalog and CLI usage examples.
- `features.md`: completed cross-stack performance benchmarking scenarios.
- `evals.md`: stable evaluation contract and test mapping.

---

### Task 1: Canonical skill and behavioral contract

**Files:**
- Create: `.agents/skills/performance-benchmarking/SKILL.md`
- Create: `.agents/skills/performance-benchmarking/references/methodology.md`
- Create: `.agents/skills/performance-benchmarking/references/stack-recipes.md`
- Create: `.agents/skills/performance-benchmarking/references/continuous-improvement.md`
- Create: `.agents/skills/performance-benchmarking/references/report-contract.md`
- Modify: `tests/capabilities.test.js`
- Modify: `tests/fixtures/skill-activation.json`

**Interfaces:**
- Consumes: Codex/Claude Agent Skills discovery and the repository's existing `SKILL_NAMES` metadata contract.
- Produces: a canonical skill named `performance-benchmarking` with four required reference files and explicit safety semantics.

- [ ] **Step 1: Add the failing capability contract**

Add `"performance-benchmarking"` to `SKILL_NAMES` in `tests/capabilities.test.js`, then add this test:

```js
test("performance benchmarking skill is adaptive and approval gated", async () => {
  const skillRoot = path.join(SKILLS_ROOT, "performance-benchmarking");
  const skill = await fs.readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  const referenceNames = [
    "continuous-improvement.md",
    "methodology.md",
    "report-contract.md",
    "stack-recipes.md"
  ];

  assert.deepEqual(
    (await fs.readdir(path.join(skillRoot, "references"))).sort(),
    referenceNames
  );
  assert.match(skill, /approval before (?:editing|modifying) production code/i);
  assert.match(skill, /unknown|unlisted stack/i);
  assert.match(skill, /inconclusive/i);

  const continuousImprovement = await fs.readFile(
    path.join(skillRoot, "references", "continuous-improvement.md"),
    "utf8"
  );
  assert.match(continuousImprovement, /project-local/i);
  assert.match(continuousImprovement, /explicit approval/i);
  assert.match(continuousImprovement, /does not run.*background/is);
});
```

Add this exact activation fixture entry:

```json
"performance-benchmarking": {
  "direct": "Use performance-benchmarking to baseline and optimize this Rust parser with before-and-after evidence.",
  "indirect": "Create a representative benchmark for this hot path, profile it, and prove whether the proposed optimization helps.",
  "incomplete": "Make this code faster and measure it.",
  "negative": "Refactor these variable names without changing or measuring performance."
}
```

- [ ] **Step 2: Run the capability test and verify the red state**

Run:

```bash
node --test tests/capabilities.test.js
```

Expected: FAIL because `.agents/skills/performance-benchmarking/SKILL.md` does not exist.

- [ ] **Step 3: Create the compact core skill**

Create `SKILL.md` with this metadata and section contract:

```markdown
---
name: performance-benchmarking
description: Use when code performance must be measured, baselined, profiled, compared, regression-guarded, or optimized across mobile, Python, Rust, TypeScript/JavaScript, or an unfamiliar stack.
---

# Performance Benchmarking

Measure first, optimize second, and preserve enough evidence to reproduce the decision.

## Request modes

- Plan or audit: remain read-only.
- Benchmark: create or improve benchmark code without changing production behavior.
- Optimize and verify: establish the baseline, profile, request approval before editing production code, then compare the candidate against the unchanged contract.

## Quick reference

| Request | Writes allowed | Required gate |
|---|---|---|
| Plan or audit | None | Report evidence gaps |
| Benchmark | Benchmark and authorized project journal | Preserve production behavior |
| Optimize and verify | Approved benchmark and production files | Baseline, hypothesis, then explicit approval |

## Required workflow

1. Read project instructions, existing performance history, tests, benchmark conventions, and the relevant code.
2. Define the performance contract and correctness invariants.
3. Detect the known or unknown stack and select tooling using `references/stack-recipes.md`.
4. Design and validate the baseline using `references/methodology.md`.
5. Profile the representative workload and state a falsifiable optimization hypothesis.
6. Present baseline evidence and obtain approval before modifying production code.
7. Implement the smallest approved change and rerun the identical benchmark plus functional and representative higher-level checks.
8. Classify the result and report it using `references/report-contract.md`.
9. Persist authorized project-local learning and run `references/continuous-improvement.md`.

## Example

For “benchmark and optimize this parser,” first preserve parser correctness, benchmark representative inputs, and profile the baseline. Present the measured bottleneck and proposed change. Only after approval, modify the parser and rerun the identical contract plus parser tests.

## Safety gates

- Project instructions and dependency policies override this skill.
- Ask before adding a production dependency; keep benchmark tooling outside production artifacts.
- Do not change the workload, environment, or metric between baseline and candidate without rerunning both.
- Mark unavailable, noisy, thermally unstable, or incomparable measurements inconclusive or blocked.
- Never claim a microbenchmark win as a product win without an available representative higher-level check.
- Never edit this reusable skill or an installed equivalent without separate explicit approval.

## Red flags

- “The change is obviously faster.”
- One timed run or a debug-build comparison.
- Different inputs, flags, hardware, or setup between baseline and candidate.
- A faster result with unverified output or hidden memory, energy, or latency cost.
- Editing production code or this skill before the required approval.

Stop, restore a comparable contract, and classify unsupported evidence as inconclusive.

## Common mistakes

- Timing setup accidentally: move setup out unless it is the target.
- Letting work be optimized away: consume and validate the result.
- Chasing a local hotspot without profiling: verify dominant cost first.
- Persisting raw noise as knowledge: journal summarized reproducible evidence.

## Output

Return the performance contract, exact commands and environment, baseline, profile evidence, approved change, candidate comparison, correctness validation, decision, journal update, and proposed reusable-skill improvement.
```

- [ ] **Step 4: Create the methodology reference**

Create `references/methodology.md` with imperative sections that require:

```markdown
# Benchmark Methodology

## Performance contract

Record the target path, user/system impact, primary metric and units, improvement direction, secondary resource limits, workload matrix, correctness invariants, build configuration, and any project SLO. Do not invent a universal percentage threshold.

## Baseline construction

Use optimized production-representative builds unless debug behavior is the target. Keep setup outside timing unless it is part of the metric. Warm runtimes and devices when applicable, use independent repeated samples, consume results, reset mutable state, and record revision, command, toolchain, OS, hardware/device, dependency versions, and thermal state when relevant.

## Profiling and hypothesis

Estimate dominant costs, profile the representative workload, prefer algorithmic or structural opportunities, and state a falsifiable mechanism with expected metrics and trade-offs.

## Comparison

Keep baseline and candidate contracts identical. Report sample count, central tendency, dispersion, absolute delta, percentage delta, and framework-provided confidence. Run functional tests and an available macrobenchmark or production-like workload. Report regressions in secondary metrics.

## Invalid and inconclusive evidence

Reject optimized-away work, incorrect outputs, mismatched environments, insufficient samples, thermal throttling, excessive variance, cross-machine comparisons without calibration, and candidate-specific harness changes. Rerun when possible; otherwise return inconclusive or blocked.

## Rationalization check

| Claim | Required response |
|---|---|
| “This is too small to benchmark.” | Estimate call frequency and cost; measure if it can affect the performance contract. |
| “One run is enough.” | Collect independent samples and report dispersion. |
| “The profiler is unnecessary.” | Profile before choosing the production edit. |
| “The benchmark had to change for the candidate.” | Rerun both baseline and candidate under the revised contract. |
| “The microbenchmark improved, so ship it.” | Run correctness checks and an available representative higher-level workload. |
```

- [ ] **Step 5: Create the stack-routing reference**

Create `references/stack-recipes.md` with explicit routes for:

```markdown
# Stack Recipes

Resolve tooling in this order: existing project framework, installed official or established framework, current official documentation, approved development-only benchmark dependency, then a guarded generic harness.

## iOS and Swift
Route between XCTest performance tests, Swift package benchmark conventions, and Instruments/xctrace. Record device, OS, build, and thermal state; use physical devices for reliable launch, UI, energy, and memory claims.

## Android and Kotlin/Java
Prefer existing Jetpack Microbenchmark or Macrobenchmark infrastructure and benchmark build variants. Record device, API, compilation mode, animations, and thermal state.

## Python
Prefer existing pyperf or pytest-benchmark conventions, with `timeit` only as a narrow fallback. Make interpreter, isolation, garbage collection, warmup, and input construction explicit.

## Rust
Prefer the existing Cargo benchmark setup or established harness. Use optimized builds, black-box result consumption, stable inputs, and relevant throughput/allocation metrics.

## TypeScript and JavaScript
Prefer existing Vitest bench, Tinybench, Benchmark.js, browser tooling, or Node performance APIs. Account for production builds, JIT warmup, event-loop effects, garbage collection, and runtime choice.

## Unknown or unlisted stack
Detect the compiler/interpreter, build system, test runner, runtime, and existing performance files. Consult current official documentation for unstable or unfamiliar tooling. If no framework is viable, use a monotonic clock, isolated setup, warmup when applicable, independent repeated samples, deterministic inputs, correctness checks, result consumption, and full environment capture. Stop as blocked when the toolchain, device, permissions, or representative data is unavailable.
```

- [ ] **Step 6: Create continuous-improvement and report references**

Create `references/continuous-improvement.md` with two lanes:

```markdown
# Continuous Improvement

This review runs at the end of every invocation; it does not run as an unsupervised background process.

## Project-local lane
During authorized implementation work, read and maintain the existing performance journal or create `docs/performance/benchmarks.md`. Record contracts, environments, revisions, commands, summarized results, decisions, caveats, and next hypotheses. Improve stale or biased harnesses within the requested scope.

## Reusable-skill lane
Identify wrong assumptions, noise sources, missing metrics, missing correctness guards, and reusable unknown-stack recipes. A reusable change must be generalizable, supported by repeatable evidence or authoritative guidance, contain no project secrets or paths, preserve safety gates, and include validation. Present the patch and evidence, then wait for explicit approval before editing the reusable skill.

One fast result is never sufficient evidence for self-modification. Failed or inconclusive work may strengthen safeguards but cannot become optimization advice.
```

Create `references/report-contract.md` with this required result shape:

```markdown
# Report Contract

Report these fields for each completed run:

1. Objective and performance contract
2. Stack, framework, environment, revisions, and exact commands
3. Workloads, correctness guards, and limitations
4. Baseline statistics
5. Profile evidence and optimization hypothesis
6. Approval status and production changes
7. Candidate statistics and baseline delta
8. Functional and higher-level validation
9. Decision: accepted, rejected, inconclusive, or blocked
10. Project-journal update and reusable-skill proposal

Never omit failed commands, secondary regressions, or evidence limitations.
```

- [ ] **Step 7: Run tests and commit the canonical skill**

Run:

```bash
node --test tests/capabilities.test.js
npm test
```

Expected: both commands PASS.

Commit:

```bash
git add .agents/skills/performance-benchmarking tests/capabilities.test.js tests/fixtures/skill-activation.json
git commit -m "feat: add adaptive performance benchmarking skill"
```

---

### Task 2: Installer and doctor integration

**Files:**
- Modify: `src/cli.js`
- Modify: `tests/cli.test.js`

**Interfaces:**
- Consumes: canonical skill directory from Task 1 and existing `copyDirectorySafe`, `skillChecks`, and manifest behavior.
- Produces: Codex and Claude installations containing all five files, with `doctor` comparing every canonical file.

- [ ] **Step 1: Add failing installation and integrity assertions**

Add `"performance-benchmarking"` to `SKILL_NAMES` in `tests/cli.test.js`. Define:

```js
const PERFORMANCE_BENCHMARKING_REFERENCES = [
  "continuous-improvement.md",
  "methodology.md",
  "report-contract.md",
  "stack-recipes.md"
];
```

In the combined-install test, assert each reference exists under both platform paths:

```js
for (const reference of PERFORMANCE_BENCHMARKING_REFERENCES) {
  await assertExists(
    target,
    path.join(".agents", "skills", "performance-benchmarking", "references", reference)
  );
  await assertExists(
    target,
    path.join(".claude", "skills", "performance-benchmarking", "references", reference)
  );
}
```

Add this doctor regression test:

```js
test("doctor rejects a corrupted installed skill reference", async (t) => {
  const target = await temporaryTarget(t, "ai-playbook-skill-reference-bad-");
  assert.equal(
    await run(["init", "--agent", "codex", "--target", target], captureIo().io),
    0
  );
  await fs.writeFile(
    path.join(
      target,
      ".agents",
      "skills",
      "performance-benchmarking",
      "references",
      "methodology.md"
    ),
    "corrupted\n",
    "utf8"
  );

  const doctorCapture = captureIo();
  assert.equal(
    await run(["doctor", "--agent", "codex", "--target", target], doctorCapture.io),
    1
  );
  assert.match(
    doctorCapture.output.stdout,
    /BAD\s+\.agents\/skills\/performance-benchmarking\/references\/methodology\.md/
  );
});
```

- [ ] **Step 2: Run the CLI test and verify the red state**

Run:

```bash
node --test tests/cli.test.js
```

Expected: FAIL because `src/cli.js` does not install or check the new registered skill and its references.

- [ ] **Step 3: Register the skill and generalize doctor checks**

Add `"performance-benchmarking"` to `SKILL_NAMES` in `src/cli.js`. Add:

```js
const SKILL_REFERENCE_FILES = {
  "performance-benchmarking": [
    "continuous-improvement.md",
    "methodology.md",
    "report-contract.md",
    "stack-recipes.md"
  ]
};
```

Replace `skillChecks` with a flat map over `SKILL.md` and configured references:

```js
function skillChecks(root, target, destinationRoot) {
  return SKILL_NAMES.flatMap((name) => {
    const files = [
      "SKILL.md",
      ...(SKILL_REFERENCE_FILES[name] || []).map((reference) =>
        path.join("references", reference)
      )
    ];
    return files.map((relativePath) => ({
      name: path.join(destinationRoot, name, relativePath),
      path: path.join(target, destinationRoot, name, relativePath),
      sourcePath: path.join(root, ".agents", "skills", name, relativePath),
      validate:
        relativePath === "SKILL.md"
          ? (filePath) => validSkill(filePath, name)
          : undefined
    }));
  });
}
```

- [ ] **Step 4: Run tests and commit installer integration**

Run:

```bash
node --test tests/cli.test.js
npm test
```

Expected: both commands PASS.

Commit:

```bash
git add src/cli.js tests/cli.test.js
git commit -m "feat: distribute performance benchmarking skill"
```

---

### Task 3: Usage documentation, feature contract, and eval mapping

**Files:**
- Modify: `README.md`
- Modify: `features.md`
- Modify: `evals.md`

**Interfaces:**
- Consumes: installed skill name and CLI behavior from Tasks 1 and 2.
- Produces: discoverable usage instructions and stable feature/eval documentation.

- [ ] **Step 1: Document installation and invocation**

Update the README canonical skill summary and skill table with
`performance-benchmarking`. Add a short CLI example using these exact commands:

```bash
npx @vadimkom/ai-playbook init --agent codex
codex
```

```text
$performance-benchmarking Benchmark the parser, establish a baseline, and ask before optimizing production code.
```

Add the non-interactive example:

```bash
codex exec --sandbox workspace-write \
  '$performance-benchmarking Benchmark the image pipeline and record the baseline.'
```

Explain that Codex discovers the repository skill under `.agents/skills/`, that
plain-language matching is also supported, and that single quotes prevent shell
expansion of `$performance-benchmarking` in non-interactive mode.

- [ ] **Step 2: Add feature and eval contracts**

Add this scenario to `features.md`:

```gherkin
  Scenario: Performance Benchmarking Skill
    Given code performance needs to be measured or improved in a known or unfamiliar stack
    When the performance benchmarking skill is used
    Then it creates a trustworthy baseline, approval-gates production optimization, verifies comparable results, and preserves project learning
    And reusable skill changes require separate explicit approval
    And the status is "completed"
```

Add this eval to `evals.md`:

```markdown
- Name: Cross-stack performance benchmarking
- Description: The performance benchmarking skill routes known and unknown stacks, rejects incomparable evidence, approval-gates production and reusable-skill edits, and persists project-local learning.
- Test mapping: `tests/capabilities.test.js`; `tests/cli.test.js`; `tests/fixtures/skill-activation.json`
- Notes: Installation checks cover Codex and Claude reference files; content checks cover fallback, approval, and inconclusive-result semantics.
```

- [ ] **Step 3: Review prose, run tests, and commit documentation**

Review the three documents directly. Human-facing prose does not receive a
brittle source-text test; executable discovery, installation, and integrity
behavior is already covered by Tasks 1 and 2.

Run:

```bash
npm test
```

Expected: both commands PASS.

Commit:

```bash
git add README.md features.md evals.md docs/superpowers/plans/2026-08-11-performance-benchmarking-skill.md
git commit -m "docs: explain performance benchmarking workflow"
```

---

### Task 4: Final validation and delivery

**Files:**
- Verify: all files changed by Tasks 1-3
- Verify: `docs/superpowers/specs/2026-08-11-performance-benchmarking-skill-design.md`
- Verify: `docs/superpowers/plans/2026-08-11-performance-benchmarking-skill.md`

**Interfaces:**
- Consumes: the complete implementation and repository test suite.
- Produces: a clean, pushed branch whose upstream includes the design, plan, implementation, tests, and documentation.

- [ ] **Step 1: Run skill metadata and placeholder checks**

Run:

```bash
rg -n "T[B]D|T[O]DO|F[I]XME|X[X]X|i[m]plement later|f[i]ll in" \
  .agents/skills/performance-benchmarking \
  docs/superpowers/specs/2026-08-11-performance-benchmarking-skill-design.md \
  docs/superpowers/plans/2026-08-11-performance-benchmarking-skill.md
```

Expected: no matches.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
git diff --check
git status --short
```

Expected: tests PASS, `git diff --check` prints nothing, and status contains no uncommitted implementation files.

- [ ] **Step 3: Inspect the delivered commits and branch relationship**

Run:

```bash
git log --oneline --decorate origin/audit-skills-and-agents..HEAD
git status -sb
```

Expected: the design, plan, skill, installer, and documentation commits are listed and the branch is ahead of its upstream.

- [ ] **Step 4: Push the authorized branch**

Run:

```bash
git push origin audit-skills-and-agents
```

Expected: push succeeds and `git status -sb` no longer reports the branch ahead of upstream.
