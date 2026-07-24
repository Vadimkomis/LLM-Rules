---
name: validate-feature-candidate
description: Independently validate a completed feature candidate at an assigned immutable Git revision. Use only in an orchestrator-supplied disposable workspace when the validator did not implement the candidate; execute exact approved argv and return schema-valid pass, fail, or error evidence without remediation.
---

# Validate Feature Candidate

Validate a completed candidate independently and report reproducible evidence. This
skill is for validation after implementation, never for implementation or repair.

## Hard Gates

Apply the independence gate before creating a result:

1. **Independent validator:** establish a stable validator identity, compare it
   with your own participation and then with
   `repositoryContext.candidateImplementerIds`. If you implemented, paired on,
   edited, generated, or remediated the candidate—or cannot truthfully establish
   that you did not—decline the assignment out of band without inspecting the
   candidate or emitting a validator result. Require another validator; never
   falsely attest `implementedCandidate: false`.
   If the assignment nevertheless lists your ID as an implementer or contains
   conflicting identity metadata, independence is not established: decline out of
   band so the orchestrator can correct the assignment and appoint an eligible
   validator.

After truthfully establishing independence, stop candidate validation and produce
an `error` result when any remaining gate fails:

1. **Truthful metadata:** emit `validatorMetadata` with
   `implementedCandidate: false` and `independenceAttested: true`.
2. **Disposable workspace:** use only
   `repositoryContext.validationWorkspace`, prepared by the orchestrator. Never
   validate in the implementer's workspace and never create, checkout, or switch
   worktrees yourself. Resolve `repositoryContext.repositoryRoot` inside the
   disposable workspace (it is commonly `"."`); use that resolved repository root
   as the base for commands and artifacts. Never access an implementer/source
   workspace.
3. **Immutable revision:** require a full Git object ID in
   `candidateRevision.commit`, verify it before checks, and verify the same
   revision and worktree state afterward.
4. **Read-only operation:** never fix, format, generate into, commit, stash, reset,
   rebase, merge, cherry-pick, checkout, switch, clean, or otherwise mutate the
   candidate, index, refs, tracked files, or untracked files.
5. **No remediation:** record defects and evidence. Do not apply or propose a
   patch as part of this workflow.

Even an approved command cannot override these gates. Reject a formatter, fixer,
VCS mutation, destructive action, dependency installation, or other command that
violates them. Dependencies must be provisioned by the orchestrator.

## Contracts

Use the shared v1 JSON Schemas:

- `.ai-playbook/contracts/independent-validator/v1/assignment.schema.json`
- `.ai-playbook/contracts/independent-validator/v1/result.schema.json`
- `.ai-playbook/contracts/independent-validator/validate.cjs` (pair-level semantic
  checker)

Their source-repository equivalents are:

- `contracts/independent-validator/v1/assignment.schema.json`
- `contracts/independent-validator/v1/result.schema.json`
- `src/independent-validator-contracts.js`

Schema-validate the assignment before candidate inspection. Accept only
`contractVersion: "1.0.0"` and treat these assignment fields as the complete
authority:

- `acceptanceCriteria`
- `approvedValidationCommands`
- `candidateRevision`
- `repositoryContext`
- `constraints`
- `relevantArtifactPaths`

Schema-validate the result before returning it. Missing, contradictory, invalid, or
insufficient contract data is `error`, not `fail`. The schema files themselves are
the only read-access exception to `relevantArtifactPaths`. If malformed input
omits or corrupts fields required even by an error result, do not invent values;
reject the assignment out of band so the orchestrator can issue a valid one.
After both documents are schema-valid, the orchestrator or result consumer should
call `validateIndependentValidatorPair` from the checker. The checker does not
authorize launching an otherwise unapproved executable.

After schema validation, require valid JSON whose strings contain only Unicode
scalar values and serialize the complete assignment with RFC 8785 JSON
Canonicalization Scheme (JCS). Hash the UTF-8 canonical JSON with SHA-256 and
prefix the lowercase hexadecimal digest with `sha256:`. Bind that
`assignmentDigest` into the result so changed criteria, constraints, commands, or
timeouts invalidate an earlier verdict.

## Authorized Operations

Read candidate files only at `relevantArtifactPaths`, using read-only file access.
Resolve each path from the repository root and reject traversal, symlink escape,
or any path outside the repository root or disposable workspace. Do not launch
discovery commands such as `find`, `ls`, `cat`, or `rg` unless their exact argv
appears in `approvedValidationCommands`.

Outside the approved list, the only executable argv allowed is this narrow,
read-only Git identity and integrity protocol:

```text
["git", "rev-parse", "--verify", "<candidateRevision.commit>^{commit}"]
["git", "rev-parse", "HEAD"]
["git", "rev-parse", "HEAD^{tree}"]
["git", "status", "--porcelain=v1", "--untracked-files=all"]
["git", "diff", "--no-ext-diff", "--quiet"]
["git", "diff", "--cached", "--quiet"]
```

Replace only the documented commit placeholder. Run these directly, without a
shell, and only from the resolved repository root inside the supplied validation
workspace during preflight and postflight. Do not add Git commands or flags.

`--untracked-files=all` reports tracked state and non-ignored untracked paths, but
does not report ignored paths. The orchestrator must place ignored caches and
generated outputs outside the candidate tree, or enforce and observe ignored
paths with a read-only mount or sandbox. Never infer ignored-path immutability
from an empty porcelain status.

For an approved validation command:

- preserve its `argv` token-for-token and in order;
- never join it into a shell string, interpolate it, expand a glob, append a flag,
  redirect output, pipe it, or wrap it in another executable;
- use exactly its `workingDirectory`, resolved from the repository root, after
  proving it remains inside that root and the disposable workspace and does not
  escape through a symlink;
- enforce its `timeoutMs`, terminating and reaping a timed-out process before
  postflight or stopping when that cannot be done safely;
- assess its exit code against `expectedExitCodes`;
- execute it at most once unless a separate assignment entry explicitly approves
  another execution; and
- capture stable IDs, argv, relative working directory, status, exit code, signal,
  duration, and evidence IDs in `commandResults`, plus `errorCode` or `skipReason`
  when required. Put bounded stdout/stderr excerpts and their complete-output
  digests in referenced `commandOutput` evidence, and map results to criteria
  through `executedChecks.commandResultIds`.

Use the orchestrator-provided environment unchanged. `networkPolicy: "forbidden"`
denies all network use; `"approved-only"` and `"unrestricted"` still do not expand
the exact argv allowlist. If an authorized, required check cannot run within these
boundaries, the outcome is `error`.

## Workflow

1. Load the assignment and both v1 schemas.
2. Validate the assignment. Do not guess missing values.
3. Apply the independence, workspace, constraint, and command-safety gates.
4. Run Git preflight:
   - require both VCS fields to identify Git;
   - reject abbreviated SHAs, refs, tags, branch names, or revision expressions;
   - use read-only filesystem metadata, not an extra executable, to require
     `repositoryRoot` to canonically resolve within the supplied validation
     workspace, and use it as the protocol working directory;
   - resolve `HEAD` and the assigned commit object and require both full IDs to
     exactly equal `candidateRevision.commit`;
   - capture `HEAD^{tree}` as the tree baseline;
   - require porcelain status for tracked files and non-ignored untracked paths
     to be empty and both worktree and cached diff checks to exit zero;
   - record `revisionVerification.method: "disposable-worktree"`,
     `preflightRevision`, `postflightRevision`, `preflightTree`,
     `postflightTree`, both porcelain-status digests, and VCS-sourced
     `revisionProof` evidence for the complete decision.
5. Build a coverage map for every required acceptance criterion. Map criterion IDs
   to approved command IDs, relevant artifact paths, and
   `evidenceRequirements`. If no authorized path can produce adequate evidence for
   a required criterion, record an error.
6. Inspect listed artifacts through read-only file access and execute approved
   validation commands in assignment order.
7. On a candidate defect, collect safe additional checks only when they are
   already approved and useful. On an infrastructure or protocol error, stop
   candidate checks.
8. Always run Git postflight:
   - repeat assigned-commit, `HEAD`, `HEAD^{tree}`, porcelain-status,
     worktree-diff, and cached-diff checks;
   - require `preflightRevision` and `postflightRevision` to equal the assigned
     revision, the tree to match preflight, status to remain empty, and both diffs
     to exit zero.
9. Construct evidence first. Then create findings or errors that reference it.
   Emit an `executedChecks` entry for every required criterion and ensure its
   referenced evidence satisfies each declared evidence kind and `minimumCount`.
10. Apply `error` > `fail` > `pass`, calculate deterministic signatures, construct
    the v1 result, and validate it against `result.schema.json`.
11. Return the result through the response channel or an orchestrator-owned sink
    outside the candidate. Do not write it into the candidate workspace.

## Evidence Standard

Every required criterion needs conclusive evidence. Each evidence record contains:

- a stable `id`, schema-defined `kind`, and concise `summary`;
- `source.type` plus a stable `source.reference` for its producing command,
  artifact, VCS step, or validator observation;
- a `sha256:` digest of the complete captured evidence bytes;
- `capturedAt`; and
- at least one of a bounded `excerpt` or repository-relative `artifactPath`.

Do not retain secrets or irrelevant sensitive output. If redaction would make
required evidence inconclusive, return `error`. Associate evidence with criteria
through `executedChecks.evidenceIds`; count only referenced evidence of the
required kind toward `minimumCount`.

Each candidate defect must be a structured finding containing:

- a stable finding ID and severity (`critical`, `high`, `medium`, or `low`);
- a schema-defined category and stable uppercase code;
- a concise title and exact description;
- affected acceptance criterion IDs;
- supporting evidence IDs;
- expected and actual behavior;
- `blocksAcceptance`; and
- a required location with a listed artifact ID, repository-relative path, and
  line when available.

Do not create unsupported findings. Infrastructure and protocol failures belong in
`errors`, not candidate findings. Errors contain a stable ID/code, schema-defined
stage, message, evidence IDs, signature IDs, and a command-result ID when
applicable. Never remediate a finding.

## Outcome Precedence

Apply precedence to the entire run: `error` > `fail` > `pass`.

- **`error`** means validation is incomplete or untrustworthy: an invalid but
  reportable assignment, missing disposable workspace, revision mismatch, dirty
  baseline, prohibited/unavailable required command, timeout, missing tool or
  permission, policy denial, insufficient evidence, or postflight mismatch. The
  schema requires error results to have an empty `findings` array; retain prior
  observations as evidence and check/command results, then record the run-level
  cause in `errors`.
- **`fail`** means no error occurred, the exact candidate was conclusively
  validated and remained unchanged, and evidence proves a required acceptance
  criterion is unmet or a required check exposes a candidate defect. Every failure
  cause needs a structured finding and evidence.
- **`pass`** means no error or failure occurred, all required criteria have
  conclusive evidence, all required commands returned an expected exit code, and
  preflight and postflight verification passed.

An unexpected exit is `fail` only when the evidence conclusively identifies a
candidate defect. A spawn failure, timeout, unavailable dependency, permission or
network problem, or ambiguous harness failure is `error`.

## Failure Signatures

Create one failure signature for every failure-causing finding and every error. A
pure pass has no failure signatures.

The signature `basis` has exactly six fields. Use
`namespace: "independent-validator/v1"`, `category: "candidate"`, and
`sourceType: "finding"` for a finding. For an error, use the appropriate
`infrastructure` or `protocol` category and `sourceType: "error"`. Copy the
source's ID and uppercase code into `sourceId` and `code`. `sourceId` is a
linkage field only and is excluded from the hash input.

Set `context` to an object containing exactly `criterionIds`, `commandIds`, and
`artifactPaths`; each value is a lexicographically sorted array with unique
entries. Sort strings by UTF-16 code units, matching RFC 8785's property-name
ordering. For a finding, use its exact criterion IDs, its exact
`location.path`, and command IDs from its referenced command evidence. For an
error, use command IDs from its linked command result and referenced command
evidence, the criterion IDs assigned to those commands, and artifact paths from
its referenced artifact evidence. Derive context from the source and evidence;
do not add free-form values, timestamps, durations, absolute workspace paths,
process IDs, random values, or volatile logs.

Derive `category` as well: findings use `candidate`; errors at `assignment`,
`independence`, `revision-verification`, or `finalization` stages use `protocol`;
errors at `execution` or `evidence-collection` stages use `infrastructure`.

Serialize `context` with RFC 8785 JCS. Join these five UTF-8 values in this exact
order with a single LF byte and no trailing LF:

```text
namespace
category
sourceType
code
<RFC 8785 canonical JSON context>
```

Hash the UTF-8 bytes with SHA-256. Set `value` to
`sha256:<lowercase-hex-digest>`, reference the signature ID from the finding/error
`failureSignatureIds`, and sort `failureSignatures` lexicographically by `value`.
The same failure must produce the same value even when `sourceId` or signature
IDs differ between runs.
Use an in-process SHA-256 implementation; do not invoke an unapproved hashing
executable.

## Required Result

Return one schema-valid v1 object containing:

- `contractVersion`, `assignmentId`, `assignmentDigest`, `outcome`, and `summary`;
- `inspectedRevision` and `revisionVerification`;
- `executedChecks` and `commandResults`;
- structured `findings`, `evidence`, and `errors`;
- `failureSignatures`;
- `validatorMetadata` with `validatorId`, `validatorKind`, `validatorVersion`,
  `implementedCandidate: false`, and `independenceAttested: true`; and
- `startedAt` and `completedAt`.

Use empty arrays for required collections. A pass has no findings, errors, or
signatures. A fail has findings and signatures but no errors. An error has errors
and signatures but no findings. Resolve every referenced ID, account for every
required criterion, and validate the final object against the shared result
schema. Every executed check included in a pass must be `passed`; do not include a
skipped optional check. If an error occurs before revision identity is
established, use `null` only in nullable revision fields—including
`preflightRevision` and `postflightRevision`—and nullable tree and status-digest
fields. Set method to `unavailable` when no disposable worktree was verified,
keep verification flags truthful, and provide evidence for the error. Return the
result only; do not change the candidate and do not append a remediation patch.
