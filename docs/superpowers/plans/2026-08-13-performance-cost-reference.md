# Performance Cost Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Abseil's rough operation-cost table to the performance-benchmarking methodology without allowing its illustrative values to be treated as measured targets.

**Architecture:** Keep the compact `SKILL.md` unchanged and place the heavy reference beside the existing Abseil link in `references/methodology.md`. Extend the canonical capability test so every published row, its source, and its non-normative safeguards remain part of the distributed skill contract.

**Tech Stack:** Markdown skill references, Node.js built-in test runner, CommonJS tests

## Global Constraints

- Preserve all 14 operation names and costs exactly as approved.
- Label the values illustrative, rough, and hardware-dependent.
- State that the values are not baselines, performance budgets, SLOs, or acceptance thresholds.
- Require target-runtime, target-device, target-workload, and target-environment measurements for optimization claims.
- Keep the canonical source link `https://abseil.io/fast/hints.html` adjacent to the table.
- Add no dependencies.
- Run `npm test` after modifying JavaScript.
- Do not use a reviewer subagent unless the user separately authorizes delegation.

---

### Task 1: Publish and Guard the Rough-Cost Reference

**Files:**
- Modify: `tests/capabilities.test.js`
- Modify: `.agents/skills/performance-benchmarking/references/methodology.md`

**Interfaces:**
- Consumes: the existing `methodology` string loaded by `performance benchmarking skill ships its guarded adaptive workflow`
- Produces: a Markdown table whose rows use the exact shape `| <operation> | <cost> |`, with source and usage safeguards validated by the capability test

- [x] **Step 1: Add the failing reference-contract assertions**

Add these assertions after the existing methodology rationalization assertion in `tests/capabilities.test.js`:

```javascript
  const roughCosts = [
    ["L1 cache reference", "0.5 ns"],
    ["L2 cache reference", "3 ns"],
    ["Branch mispredict", "5 ns"],
    ["Mutex lock/unlock (uncontended)", "15 ns"],
    ["Main memory reference", "50 ns"],
    ["Compress 1K bytes with Snappy", "1,000 ns"],
    ["Read 4KB from SSD", "20,000 ns"],
    ["Round trip within same datacenter", "50,000 ns"],
    ["Read 1MB sequentially from memory", "64,000 ns"],
    ["Read 1MB over 100 Gbps network", "100,000 ns"],
    ["Read 1MB from SSD", "1,000,000 ns"],
    ["Disk seek", "5,000,000 ns"],
    ["Read 1MB sequentially from disk", "10,000,000 ns"],
    ["Send packet CA->Netherlands->CA", "150,000,000 ns"]
  ];
  for (const [operation, cost] of roughCosts) {
    assert.ok(methodology.includes(`| ${operation} | ${cost} |`));
  }
  assert.match(methodology, /https:\/\/abseil\.io\/fast\/hints\.html/);
  assert.match(methodology, /illustrative.*rough.*hardware-dependent/is);
  assert.match(methodology, /not.*baseline.*performance budget.*SLO.*acceptance threshold/is);
  assert.match(
    methodology,
    /target\s+runtime.*device.*workload.*environment.*optimization claim/is
  );
```

- [x] **Step 2: Run the focused test and verify the RED phase**

Run:

```bash
node --test --test-name-pattern="performance benchmarking skill" tests/capabilities.test.js
```

Expected: FAIL at the first `roughCosts` assertion because the table has not been added.

- [x] **Step 3: Add the minimal sourced reference**

Insert a `### Rough Operation-Cost Reference` section after `## 2. Inspect Before Measuring` and before `## 3. Build a Trustworthy Baseline` in `methodology.md`. Include:

```markdown
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
```

- [x] **Step 4: Run the focused test and verify the GREEN phase**

Run:

```bash
node --test --test-name-pattern="performance benchmarking skill" tests/capabilities.test.js
```

Expected: PASS with zero failures.

- [x] **Step 5: Run the full repository verification**

Run:

```bash
npm test
git diff --check
```

Expected: all tests pass and `git diff --check` exits with no output.

- [x] **Step 6: Verify distribution and commit**

Run:

```bash
npm pack --dry-run --json
```

Confirm `.agents/skills/performance-benchmarking/references/methodology.md` appears in the package file list, then commit:

```bash
git add tests/capabilities.test.js .agents/skills/performance-benchmarking/references/methodology.md docs/superpowers/plans/2026-08-13-performance-cost-reference.md
git commit -m "docs: add benchmark cost reference"
```
