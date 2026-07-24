---
name: validate-feature-candidate
description: Independently validate a completed candidate at an assigned immutable Git revision. Use when the validator did not implement the candidate and must return a contract-defined pass, fail, or error with evidence, without modifying or remediating the candidate.
---

# Validate Feature Candidate

Validate the supplied candidate independently. Do not implement or repair it.

## Contract

Use:

- `contracts/independent-validator/v1/assignment.schema.json`
- `contracts/independent-validator/v1/result.schema.json`
- `contracts/independent-validator/README.md`
- `src/independent-validator-contracts.js`

Installed copies are under
`.ai-playbook/contracts/independent-validator/`. The README is normative for
semantics; do not reproduce or improvise its digest or signature algorithms.
Version `v1/` accepts exactly `contractVersion: "1.0.0"`.

## Workflow

1. Confirm that you did not implement, edit, generate, pair on, or remediate the
   candidate. If you cannot truthfully attest independence, abstain.
2. Schema-validate the assignment and honor its constraints.
3. Resolve `repositoryContext.repositoryRoot` as supplied: relative to the current
   directory when relative, unchanged when absolute. Use that repository directly;
   do not create or select another worktree, clone, checkout, or repository copy.
4. Before candidate checks, resolve the assigned commit and `HEAD`, require both
   full revisions to match, and require clean Git status. Record revision evidence.
5. Inspect files with safe read-only operations. Execute approved validation
   commands in assignment order through the available command interface while
   preserving the assigned argument tokens. Do not add shell operators,
   interpolation, redirection, pipelines, wrappers, flags, retries, or a
   different working directory.
6. Collect sufficient evidence for every criterion. Build command results and
   executed checks that reference that evidence.
7. Resolve `HEAD` and check Git status again. Any revision mismatch, dirty state,
   or unavailable check makes the outcome `error`.
8. Build structured findings or errors, apply `error` > `fail` > `pass`, and
   compute assignment, evidence, and signature digests exactly as the normative
   contract specifies.
9. Schema-validate the result, validate the assignment/result pair, and return the
   result.

## Invariants

- Set `validatorMetadata.implementedCandidate` to `false` and
  `independenceAttested` to `true` only when both are truthful.
- Never edit or format source, update fixtures, install dependencies, clean,
  stash, commit, merge, rebase, reset, cherry-pick, switch, or check out the
  candidate.
- Never execute an approved command whose stated purpose is to alter candidate
  source, the index, or refs; report `error`.
- Safe read-only listing, searching, file inspection, contract utilities, and Git
  revision/status checks are permitted.
- Empty command or artifact lists are valid when the remaining authorized
  evidence can conclusively cover every criterion.
- Record defects with evidence. Do not remediate them or append a patch.

## Outcomes

- `pass`: the revision is verified and clean before and after, every criterion and
  approved command passed, and no findings or errors exist.
- `fail`: validation is conclusive and a criterion failed with a supported
  structured finding and deterministic signature.
- `error`: validation is invalid, incomplete, or untrustworthy, including
  assignment, revision, cleanliness, execution, or evidence problems.

Return a schema-valid result containing all required collections and reference
links. Use the normative README for detailed evidence, finding, revision, digest,
and deterministic-signature rules.
