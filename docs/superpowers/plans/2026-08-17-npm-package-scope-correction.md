# npm Package Scope Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the unpublished CLI package to `@vadimkom/ai-playbook`, publish version `1.2.0`, verify it from a clean environment, and tag the exact published Git revision.

**Architecture:** Keep the existing `ai-playbook` executable and CLI behavior unchanged while correcting only its npm package identity and runnable documentation. Lock the identity with a repository test, complete all reversible Git work before publication, and create the release tag only after the immutable registry artifact is verified.

**Tech Stack:** Node.js CommonJS, Node test runner, npm public registry, Git, Markdown

## Global Constraints

- The canonical npm package name is exactly `@vadimkom/ai-playbook`.
- The release version remains exactly `1.2.0`; neither attempted publish created a package.
- The executable remains exactly `ai-playbook` at `bin/ai-playbook.js`.
- Do not change CLI commands, options, installed files, manifests, or runtime behavior.
- Do not add production or development dependencies.
- Run `npm test` after modifying the JavaScript test file and immediately before publication.
- Use public npm access and interactive npm two-factor authentication.
- Commit and push `audit-skills-and-agents` before publishing.
- Create and push Git tag `1.2.0` only after registry and clean-environment verification succeed.
- Never republish version `1.2.0` or unpublish it automatically after a successful registry write.
- Localization wording, instruction-file simplification, update automation, and release automation remain out of scope.

## File Structure

- Create `tests/package-metadata.test.js` to lock the owned npm scope and runnable documentation examples.
- Modify `package.json` to expose the account-owned public package name.
- Modify `README.md` so every active `npx` command uses the published package.
- Modify `docs/superpowers/plans/2026-08-11-performance-benchmarking-skill.md` because its runnable installation command otherwise points to a package that never existed.
- Modify `CHANGELOG.md` to identify the final public package name in release `1.2.0`.
- Do not modify `src/`, `bin/`, skills, agents, templates, or validator contracts.

---

### Task 1: Lock and Apply the Account-Owned Package Name

**Files:**
- Create: `tests/package-metadata.test.js`
- Modify: `package.json:2`
- Modify: `README.md:42`
- Modify: `README.md:45`
- Modify: `README.md:48`
- Modify: `README.md:70`
- Modify: `README.md:71`
- Modify: `README.md:72`
- Modify: `README.md:110`
- Modify: `README.md:154`
- Modify: `README.md:155`
- Modify: `docs/superpowers/plans/2026-08-11-performance-benchmarking-skill.md:467`
- Modify: `CHANGELOG.md:8`
- Test: `tests/package-metadata.test.js`

**Interfaces:**
- Consumes: repository `package.json`, runnable Markdown commands, and Node's built-in test modules
- Produces: package metadata `name = "@vadimkom/ai-playbook"` and runnable `npx @vadimkom/ai-playbook ...` commands

- [ ] **Step 1: Add the failing package-identity regression test**

```javascript
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const EXPECTED_PACKAGE = "@vadimkom/ai-playbook";
const FORMER_PACKAGE = "@vadim/ai-playbook";

test("package metadata and runnable commands use the owned npm scope", async () => {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(ROOT, "package.json"), "utf8")
  );
  assert.equal(packageJson.name, EXPECTED_PACKAGE);

  const runnableDocs = await Promise.all(
    [
      "README.md",
      "docs/superpowers/plans/2026-08-11-performance-benchmarking-skill.md"
    ].map((relativePath) =>
      fs.readFile(path.join(ROOT, relativePath), "utf8")
    )
  );

  for (const content of runnableDocs) {
    assert.equal(content.includes(FORMER_PACKAGE), false);
  }
  assert.match(
    runnableDocs[0],
    /npx @vadimkom\/ai-playbook init --agent codex/
  );
});
```

- [ ] **Step 2: Run the focused test and verify the old package name fails it**

Run:

```bash
node --test tests/package-metadata.test.js
```

Expected: FAIL because `package.json` still contains `@vadim/ai-playbook`.

- [ ] **Step 3: Apply the minimal package and documentation changes**

Set the package metadata to:

```json
"name": "@vadimkom/ai-playbook"
```

Replace each runnable occurrence of:

```text
npx @vadim/ai-playbook
```

with:

```text
npx @vadimkom/ai-playbook
```

Add this bullet under the `1.2.0` `Changed` section in `CHANGELOG.md`:

```markdown
- Set the public npm package name to `@vadimkom/ai-playbook`, matching the
  account that owns and publishes the package.
```

- [ ] **Step 4: Run focused identity checks**

Run:

```bash
node --test tests/package-metadata.test.js
rg -n 'npx @vadim/ai-playbook|"name": "@vadim/ai-playbook"' package.json README.md docs/superpowers/plans/2026-08-11-performance-benchmarking-skill.md
```

Expected: the focused test passes; `rg` returns no matches.

- [ ] **Step 5: Run the full suite required after the JavaScript test change**

Run:

```bash
npm test
```

Expected: 41 tests, 41 pass, 0 fail.

- [ ] **Step 6: Commit the scope correction**

```bash
git add package.json README.md CHANGELOG.md tests/package-metadata.test.js docs/superpowers/plans/2026-08-11-performance-benchmarking-skill.md
git commit -m "fix: use owned npm package scope"
```

### Task 2: Verify and Push the Release Candidate

**Files:**
- Verify only: `package.json`
- Verify only: npm publish tarball
- Verify only: Git branch `audit-skills-and-agents`

**Interfaces:**
- Consumes: committed `@vadimkom/ai-playbook@1.2.0` release candidate from Task 1
- Produces: a clean pushed Git revision and a verified unpublished npm version ready for one publication attempt

- [ ] **Step 1: Confirm the committed tree and release identity**

Run:

```bash
git status --short --branch
node -p 'require("./package.json").name + "@" + require("./package.json").version'
```

Expected: clean `audit-skills-and-agents` tree and `@vadimkom/ai-playbook@1.2.0`.

- [ ] **Step 2: Inspect the exact public publish dry run**

Run:

```bash
npm publish --dry-run --access public --json --cache /tmp/ai-playbook-npm-release-cache
```

Expected: exit 0; package id `@vadimkom/ai-playbook@1.2.0`; 53 total
files including the renamed `package.json`; no tests, local secrets, or design
documents in the tarball.

- [ ] **Step 3: Confirm the immutable version remains available**

Run:

```bash
npm view @vadimkom/ai-playbook@1.2.0 version --registry=https://registry.npmjs.org --cache /tmp/ai-playbook-npm-release-cache
```

Expected: exit 1 with npm `E404`, proving version `1.2.0` is not published. Any returned version is a hard stop.

- [ ] **Step 4: Push the corrected release candidate**

```bash
git push origin audit-skills-and-agents
```

- [ ] **Step 5: Confirm local and remote branch revisions match**

Run:

```bash
git rev-parse HEAD
git ls-remote origin refs/heads/audit-skills-and-agents
```

Expected: both commands report the same full commit hash.

### Task 3: Publish, Verify, and Tag Version 1.2.0

**Files:**
- Publish: npm package `@vadimkom/ai-playbook@1.2.0`
- Create: Git tag `1.2.0`

**Interfaces:**
- Consumes: pushed, clean, unpublished release candidate from Task 2
- Produces: public npm version `1.2.0`, `latest -> 1.2.0`, verified executable `ai-playbook`, and remote Git tag `1.2.0` at the release commit

- [ ] **Step 1: Run the full suite immediately before the irreversible publish**

Run:

```bash
npm test
```

Expected: 41 tests, 41 pass, 0 fail.

- [ ] **Step 2: Publish publicly with interactive 2FA**

Run in a TTY:

```bash
npm publish --access public --registry=https://registry.npmjs.org --cache /tmp/ai-playbook-npm-release-cache
```

Expected: complete the npm browser/security-key challenge and receive `+ @vadimkom/ai-playbook@1.2.0`. If npm returns an error, do not create a Git tag.

- [ ] **Step 3: Verify registry metadata and public access**

Run:

```bash
npm view @vadimkom/ai-playbook@1.2.0 version dist-tags bin --json --registry=https://registry.npmjs.org --cache /tmp/ai-playbook-npm-release-cache
npm access get status @vadimkom/ai-playbook --registry=https://registry.npmjs.org --cache /tmp/ai-playbook-npm-release-cache
```

Expected metadata:

```json
{
  "version": "1.2.0",
  "dist-tags": {
    "latest": "1.2.0"
  },
  "bin": {
    "ai-playbook": "bin/ai-playbook.js"
  }
}
```

Expected access: `public`.

- [ ] **Step 4: Smoke-test the exact published CLI outside the repository**

Run:

```bash
release_smoke_dir="$(mktemp -d)"
cd "$release_smoke_dir"
npm exec --yes --cache /tmp/ai-playbook-npm-smoke-cache --package=@vadimkom/ai-playbook@1.2.0 -- ai-playbook --help
```

Expected: exit 0 and output beginning with `ai-playbook CLI` followed by the usage text.

- [ ] **Step 5: Create and push the post-verification release tag**

Return to the repository, then run:

```bash
git tag -a 1.2.0 -m "Release 1.2.0"
git push origin 1.2.0
```

- [ ] **Step 6: Verify branch, tag, and registry agree**

Run:

```bash
git rev-parse HEAD
git rev-list -n 1 1.2.0
git ls-remote origin refs/heads/audit-skills-and-agents refs/tags/1.2.0^{}
npm view @vadimkom/ai-playbook@1.2.0 version --registry=https://registry.npmjs.org --cache /tmp/ai-playbook-npm-release-cache
git status --short --branch
```

Expected: the local branch, peeled tag, and remote branch resolve to the same release commit; npm returns `1.2.0`; the working tree is clean and synchronized.
