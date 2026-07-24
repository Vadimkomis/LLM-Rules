# Independent Validator Contract

This contract lets an independent validator assess a completed candidate at one
immutable Git revision without changing it. The assignment supplies the candidate
context and acceptance requirements; the result reports a `pass`, `fail`, or
`error` with evidence.

This README is normative for semantics that JSON Schema cannot express. The
schemas are normative for document shape.

## Versioning

[`v1/`](v1/) is permanently `contractVersion: "1.0.0"`. Its schemas and semantics
must not be changed to mean another version. Every later shape or semantic version
requires a new version directory, schema identifiers, examples, and validation
rules. Consumers select a directory explicitly; compatibility is never inferred
from a shared major version.

Source checkouts provide:

```text
contracts/independent-validator/v1/
src/independent-validator-contracts.js
```

Installed copies provide:

```text
.ai-playbook/contracts/independent-validator/v1/
.ai-playbook/contracts/independent-validator/validate.cjs
```

## Assignment

`v1/assignment.schema.json` defines:

- `contractVersion` and a stable `assignmentId`;
- `candidateRevision`, containing a full 40-character SHA-1 or 64-character
  SHA-256 Git commit rather than a branch, tag, symbolic ref, or abbreviation;
- `repositoryContext.repositoryRoot`, which may be relative or absolute, and
  repository context notes;
- acceptance criteria and an `evidenceRequirements` map from each required
  evidence kind to its description;
- approved validation commands, including exact `argv`, working directory,
  timeout, expected exit codes, and criterion coverage;
- constraints that require an unchanged candidate and a validator who did not
  implement it; and
- relevant artifact paths and their purpose.

`approvedValidationCommands` and `relevantArtifactPaths` may be empty. Empty
commands are valid when read-only inspection can satisfy every criterion. Empty
artifact paths are valid when commands or other permitted read-only observations
can supply the required evidence. If the assignment does not authorize a
conclusive validation, the result is `error`.

Resolve a relative `repositoryRoot` from the validator's current directory. Use
an absolute root as supplied. Validate that the resolved directory is the Git
repository being assigned, then operate on that repository directly. Do not
create or select another worktree, clone, checkout, or repository copy.

## Validator behavior

The validator MUST NOT have implemented, edited, generated, paired on, or
remediated the candidate. It MUST truthfully report
`implementedCandidate: false` and `independenceAttested: true`. A validator that
cannot make both attestations MUST abstain rather than emit false metadata.

The validator MUST:

1. schema-validate the assignment;
2. resolve the assigned commit and `HEAD`, require exact equality, and require a
   clean Git status before candidate checks;
3. inspect repository content only through safe read-only operations;
4. execute each approved validation command through the available command
   interface while preserving its exact `argv`, working directory, timeout, and
   expected exit codes;
5. collect evidence for every acceptance criterion;
6. resolve `HEAD` and check Git status again after candidate checks;
7. emit a schema-valid result and validate the assignment/result pair; and
8. leave the candidate, index, refs, and repository state unchanged.

Safe read-only file listing, searching, and reading are permitted, as are the
schema checker, canonicalization and hashing utilities, and read-only Git commands
needed to resolve `HEAD`, resolve the assigned commit, and inspect status. These
operations do not expand the approved validation-command list. When a host
command interface accepts a shell string, preserve the assigned argument tokens
with safe quoting; do not add interpolation, operators, redirection, pipelines,
wrappers, flags, or extra commands.

The validator MUST NOT edit or format source, update fixtures, install
dependencies, clean, stash, commit, merge, rebase, reset, cherry-pick, switch, or
check out the candidate. It MUST NOT execute an approved command whose stated
purpose is to alter candidate source, the index, or refs; that is an `error`.
Incidental ignored build outputs are outside the Git-status claim described
below. Findings are reported, never remediated.

## Assignment binding

Every result binds the complete schema-valid assignment with
`assignmentDigest`:

1. serialize the assignment with RFC 8785 JSON Canonicalization Scheme (JCS);
2. hash the canonical JSON's UTF-8 bytes with SHA-256; and
3. encode the value as `sha256:` followed by lowercase hexadecimal.

Changing any assignment field invalidates the earlier result.

## Revision verification

Before candidate checks, resolve the full assigned commit and the repository's
full `HEAD`. A candidate verdict requires both values to equal
`candidateRevision` and requires an empty Git status. Record the resolved `HEAD`
as `inspectedRevision`.

After candidate checks, resolve `HEAD` again and record it as
`revisionVerification.postCheckRevision`; check Git status again. Record:

- `status`: `verified`, `mismatch`, or `unavailable`;
- `postCheckRevision`: the resolved revision or `null`;
- `cleanBeforeChecks` and `cleanAfterChecks`: booleans or `null`; and
- `evidenceIds` supporting the decision.

`verified` means `inspectedRevision` and `postCheckRevision` both equal the
assigned revision and both cleanliness checks are `true`. `unavailable` means no
revision or cleanliness state was established: both revisions and both
cleanliness values are `null`. Every other combination is `mismatch`, including a
different revision, dirty state, drift, or partial verification. Only `verified`
permits `pass` or `fail`; an execution or evidence `error` may still report
`verified` when the full repository check succeeded.

When any revision or cleanliness state is reported, `evidenceIds` must reference
`revisionProof` evidence whose excerpt has this exact space-separated form:

```text
assigned=<commit> inspected=<commit|null> post_check=<commit|null> clean_before=<true|false|null> clean_after=<true|false|null>
```

The values must exactly match the assignment and structured result fields. Digest
the excerpt using the normal evidence rule.

Git status reports tracked files and non-ignored untracked files. It does not
prove anything about ignored files. The result must not claim broader coverage
than its evidence supports.

## Outcome semantics

Outcome precedence is `error`, then `fail`, then `pass`.

- `pass` means revision verification is `verified`, every acceptance criterion
  passed with sufficient evidence, and every approved command passed. It has no
  findings, errors, or failure signatures.
- `fail` is a candidate verdict. Revision verification is `verified`, validation
  completed conclusively, and at least one acceptance criterion failed. Every
  failed criterion has a blocking structured finding, supporting evidence, and a
  deterministic failure signature. It has no errors.
- `error` withholds a candidate verdict because validation was incomplete or
  untrustworthy. Examples include inaccessible repository context, revision
  mismatch, dirty repository, prohibited command, missing executable, timeout,
  permission failure, insufficient evidence, or post-check drift. It has a
  structured error and deterministic failure signature, and no findings.

A schema-invalid assignment is rejected before this result contract applies. Do
not fabricate a v1 result for an input that is not a v1 assignment.

An unexpected command exit is `fail` only when reliable evidence shows candidate
behavior that violates a criterion. Failure to start, timeout, missing tooling,
or ambiguous output is `error`.

## Result, evidence, and findings

`v1/result.schema.json` reports the assignment binding, outcome, inspected
revision, revision verification, executed checks, command results, findings,
evidence, errors, failure signatures, and validator metadata.

Each executed check identifies its acceptance criterion and references the
command results and evidence supporting its `pass`, `fail`, or `error` status.
Each command result repeats the exact approved command identity, arguments, and
working directory and reports its status, exit code, duration, and evidence.

Evidence is typed and digest-backed. Its `digest` is the SHA-256 of the UTF-8
bytes of its exact `excerpt`, encoded with the `sha256:` prefix. Evidence may also
identify its producing command or relevant artifact.

Each candidate finding has a severity, stable code, expected and actual behavior,
affected criterion IDs, supporting evidence IDs, an optional repository location,
and one failure-signature reference. Infrastructure and protocol problems belong
in `errors`, not findings. Every reference ID must resolve.

The documents are attestations. Schemas and pair validation establish their
shape, binding, references, and internal consistency; they do not independently
prove that reported events occurred. A consumer may apply its own trust controls
without changing this contract or the validator workflow.

## Deterministic failure signatures

Each failure-causing finding and each error has one signature. Its `basis`
contains exactly:

1. `namespace`
2. `sourceType`
3. `sourceId`
4. `code`
5. `context`

`sourceId` links the signature to its finding or error but is deliberately
excluded from the hash. Derive the `context` arrays as follows, then sort and
deduplicate each one lexicographically by UTF-16 code units:

- For a finding, `criterionIds` is the finding's exact `criterionIds`.
- For an error, `criterionIds` contains the criteria assigned to the derived
  command IDs.
- `commandIds` contains `commandId` values from evidence referenced by the source,
  plus the assigned command reached through an error's `commandResultId`.
- `artifactPaths` contains `artifactPath` values from evidence referenced by the
  source, plus a finding's `location.path` when present.

Do not include timestamps, durations, absolute repository paths, random values,
or raw output.

Compute `value` as the SHA-256 of the UTF-8 JCS serialization of:

```json
{
  "namespace": "independent-validator/v1",
  "sourceType": "finding",
  "code": "SOURCE_CODE",
  "context": {
    "criterionIds": [],
    "commandIds": [],
    "artifactPaths": []
  }
}
```

Use `sourceType: "error"` for an error. Hash the basis's actual `sourceType`,
`code`, and `context`, then encode the digest as `sha256:` followed by lowercase
hexadecimal. The same underlying problem therefore keeps the same signature even
when run-local source IDs change.

## Validation and examples

`v1/examples/` contains one assignment and pass, fail, and
infrastructure-error results. After both documents pass their schemas, call
`validateIndependentValidatorPair(assignment, result)` to verify the assignment
digest, approved-command fidelity, reference integrity, outcome semantics,
revision requirements, evidence digests, independence attestations, and failure
signatures.

From a source checkout, `npm test` validates the schemas, examples, and pair-level
semantic rules.
