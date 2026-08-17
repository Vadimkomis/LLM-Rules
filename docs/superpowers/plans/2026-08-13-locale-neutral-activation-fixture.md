# Locale-Neutral Activation Fixture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `app-localization` direct activation example explicitly support every requested locale without implying a platform restriction.

**Architecture:** Change only the canonical activation fixture consumed by the capability test. Use a one-off assertion for the approved wording, then rely on the existing fixture-structure test and full repository suite for regression coverage.

**Tech Stack:** JSON test fixture, Node.js built-in test runner, npm

## Global Constraints

- Use exactly: `Use app-localization to add resources for every requested locale in this app.`
- Keep the `indirect`, `incomplete`, and `negative` activation prompts unchanged.
- Do not modify the `app-localization` skill because it already supports arbitrary locales and platforms.
- Add no dependencies.
- Run `npm test` before committing.
- Do not use subagents unless the user explicitly selects subagent-driven execution.

---

### Task 1: Correct the Direct Activation Example

**Files:**
- Modify: `tests/fixtures/skill-activation.json:3`
- Verify: `tests/capabilities.test.js:47-71`

**Interfaces:**
- Consumes: the `fixtures["app-localization"].direct` string loaded by the canonical capability test
- Produces: a direct activation example that names the skill while remaining locale- and platform-neutral

- [x] **Step 1: Run a one-off assertion and verify the RED phase**

Run:

```bash
node -e 'const fixture = require("./tests/fixtures/skill-activation.json"); const actual = fixture["app-localization"].direct; const expected = "Use app-localization to add resources for every requested locale in this app."; if (actual === expected) process.exit(0); console.error("Expected approved prompt, received:", actual); process.exit(1);'
```

Expected: exit 1 and print the existing French/German/iOS prompt.

- [x] **Step 2: Replace only the direct prompt**

Change the `app-localization.direct` value in
`tests/fixtures/skill-activation.json` to:

```json
"direct": "Use app-localization to add resources for every requested locale in this app."
```

Leave the other three prompts unchanged.

- [x] **Step 3: Re-run the one-off assertion and verify the GREEN phase**

Run the Step 1 command again.

Expected: exit 0 with no output.

- [x] **Step 4: Run the focused capability test**

Run:

```bash
node --test --test-name-pattern="canonical skills have valid unique metadata and activation fixtures" tests/capabilities.test.js
```

Expected: one matching test passes with zero failures.

- [x] **Step 5: Run full verification**

Run:

```bash
npm test
git diff --check
```

Expected: all 40 tests pass and the diff check exits with no output.

- [x] **Step 6: Review and commit the scoped change**

Run:

```bash
git diff -- tests/fixtures/skill-activation.json docs/superpowers/plans/2026-08-13-locale-neutral-activation-fixture.md
git add tests/fixtures/skill-activation.json docs/superpowers/plans/2026-08-13-locale-neutral-activation-fixture.md
git commit -m "test: generalize localization activation fixture"
```

Expected: the diff changes only the approved direct prompt and plan record, and
the local commit is created without pushing the branch. Push is intentionally
deferred because the preceding `check` command design commit still awaits written
spec approval.
