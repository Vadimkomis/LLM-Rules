# Signed Relative Benchmark Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ambiguous pair of direction-dependent improvement formulas with one signed relative-change convention and direction-aware reporting.

**Architecture:** Keep calculation guidance in `references/methodology.md` and keep output fields in `references/report-contract.md`. Extend the canonical capability test first so the methodology formula, examples, and report vocabulary form one distribution contract.

**Tech Stack:** Markdown skill references, Node.js built-in test runner, CommonJS tests

## Global Constraints

- Use exactly one percentage formula: `(candidate - baseline) / baseline * 100`.
- Treat the sign as metric movement, not an improvement verdict.
- Report the metric, direction, magnitude, and whether the movement is better or worse.
- Include the approved latency and throughput examples.
- Replace the report label `Improvement` with `Relative change` and add `Interpretation`.
- Add no dependencies.
- Run `npm test` after modifying JavaScript.
- Do not use a reviewer subagent unless the user separately authorizes delegation.

---

### Task 1: Standardize Relative-Change Calculation and Reporting

**Files:**
- Modify: `tests/capabilities.test.js`
- Modify: `.agents/skills/performance-benchmarking/references/methodology.md`
- Modify: `.agents/skills/performance-benchmarking/references/report-contract.md`

**Interfaces:**
- Consumes: the `methodology` and `reportContract` strings loaded by `performance benchmarking skill ships its guarded adaptive workflow`
- Produces: one signed relative-change formula plus a report table containing `Relative change` and `Interpretation`

- [x] **Step 1: Add the failing calculation-and-report contract assertions**

Add these assertions after the existing methodology target-environment assertion in `tests/capabilities.test.js`:

```javascript
  assert.match(
    methodology,
    /relative change\s*=\s*\(candidate - baseline\) \/ baseline \* 100/i
  );
  assert.doesNotMatch(methodology, /\(baseline - candidate\) \/ baseline/);
  assert.match(
    methodology,
    /100 ms.*80 ms.*-20%.*latency decreased 20%.*better/is
  );
  assert.match(
    methodology,
    /1000.*1200 requests\/s.*\+20%.*throughput increased 20%.*better/is
  );
  assert.match(methodology, /never.*20% faster/is);
  assert.match(
    reportContract,
    /signed\s+relative change.*metric direction.*plain-language interpretation/is
  );
  assert.match(reportContract, /\| Relative change \| Interpretation \|/);
  assert.doesNotMatch(reportContract, /\| Improvement \|/);
```

- [x] **Step 2: Run the focused test and verify the RED phase**

Run:

```bash
node --test --test-name-pattern="performance benchmarking skill" tests/capabilities.test.js
```

Expected: FAIL at the relative-change formula assertion because the methodology still contains the direction-dependent formulas.

- [x] **Step 3: Replace the methodology formulas with one signed convention**

Replace the `Compute improvement with the declared direction` paragraph and its two formulas in `methodology.md` with:

```markdown
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
```

- [x] **Step 4: Align the report contract**

Replace Result field 7 in `report-contract.md` with:

```markdown
7. **Candidate:** identical-contract statistics, absolute delta, signed
   relative change, metric direction, plain-language interpretation, and
   secondary changes.
```

Replace the compact comparison shape with:

```text
Workload | Metric (unit; higher/lower is better) | Baseline | Candidate | Absolute delta | Relative change | Interpretation | Dispersion | Decision
```

Replace its following paragraph with:

```markdown
The interpretation names the metric, movement, magnitude, and whether that
movement is better or worse. Include secondary regressions even when the primary
metric improves.
```

- [x] **Step 5: Run the focused test and verify the GREEN phase**

Run:

```bash
node --test --test-name-pattern="performance benchmarking skill" tests/capabilities.test.js
```

Expected: PASS with zero failures.

- [x] **Step 6: Run full verification and distribution checks**

Run:

```bash
npm test
git diff --check
npm pack --dry-run --json
```

Expected: 40 tests pass, the diff check exits with no output, and both modified reference files appear in the npm package file list.

- [x] **Step 7: Commit the implementation**

```bash
git add tests/capabilities.test.js .agents/skills/performance-benchmarking/references/methodology.md .agents/skills/performance-benchmarking/references/report-contract.md docs/superpowers/plans/2026-08-13-signed-relative-benchmark-change.md
git commit -m "docs: clarify benchmark relative changes"
```
