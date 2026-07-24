# Independent Validator Contracts

These contracts separate feature implementation from feature acceptance. An
orchestrator assigns one immutable Git revision to a validator that did not
implement it, and the validator returns a machine-readable `pass`, `fail`, or
`error` result without changing the candidate.

## Versioning

The current contract is in [`v1/`](v1/). Both documents carry
`contractVersion: "1.0.0"` and use JSON Schema 2020-12. Additive, compatible
changes may increment the minor or patch version while remaining in `v1`.
Breaking field or semantic changes require a new `v2/` directory and new schema
identifiers.

The CLI installs the contracts at:

```text
.ai-playbook/contracts/independent-validator/v1/
```

## Assignment

`v1/assignment.schema.json` requires:

- a stable assignment ID;
- a full 40-character SHA-1 or 64-character SHA-256 Git commit, never a branch,
  tag, symbolic ref, or abbreviated hash;
- repository and disposable validation-workspace context, including the
  candidate implementer IDs;
- nonempty acceptance criteria with explicit evidence requirements;
- exact approved commands represented as argument arrays, working directories,
  timeouts, expected exit codes, and covered criterion IDs;
- immutable-candidate and independent-validator constraints fixed to `true`;
- relevant repository-relative artifact paths.

An orchestrator must provide the disposable validation workspace. Creating or
switching worktrees is not validator work because it can mutate repository
metadata.

Every result binds the exact assignment with `assignmentDigest`. First require
valid JSON whose strings contain only Unicode scalar values, then serialize the
entire assignment with the RFC 8785 JSON Canonicalization Scheme (JCS). Hash the
UTF-8 bytes of that canonical JSON with SHA-256 and prefix the lowercase hexadecimal
digest with `sha256:`. Changing criteria, constraints, commands, timeouts, or any
other assignment field therefore invalidates an old result even when
`assignmentId` is reused.

## Read-only validation protocol

The validator must:

1. Reject the assignment if its identity appears in `candidateImplementerIds`
   or it otherwise implemented the candidate.
2. Validate the assignment before inspecting candidate behavior.
3. Resolve the assigned commit and prove the inspected `HEAD` is exactly that
   commit before running checks.
4. Confirm tracked files and non-ignored untracked paths are clean before
   validation.
5. Run only the exact `argv` and working directory in
   `approvedValidationCommands`, without a shell or command rewriting.
6. Collect the evidence required by every criterion. Command evidence records
   the exact arguments, working directory, exit code or signal, output excerpt
   or retained artifact, and a SHA-256 digest.
7. Recheck `HEAD`, its tree, the index, tracked files, and non-ignored untracked
   paths after validation.
8. Emit a result; never edit, format, fix, install into, commit, merge, rebase,
   reset, stash, or otherwise remediate the candidate.

The protocol permits only these additional read-only Git identity and integrity
operations:

```text
git rev-parse --verify <assigned-commit>^{commit}
git rev-parse HEAD
git rev-parse HEAD^{tree}
git status --porcelain=v1 --untracked-files=all
git diff --no-ext-diff --quiet
git diff --cached --quiet
```

The validator records the preflight and postflight commit as
`preflightRevision` and `postflightRevision`, in addition to `assignedRevision`,
`resolvedRevision`, and `inspectedRevision`. It also records both tree object IDs
and the SHA-256 of the full porcelain output in `revisionVerification` and
revision evidence. A clean status uses the SHA-256 of empty bytes. Any other
command must be explicitly present in the assignment.

`--untracked-files=all` covers tracked state and non-ignored untracked paths; Git
porcelain does not report ignored paths. The orchestrator must place ignored
caches and generated outputs outside the candidate tree, or independently enforce
and observe those paths with a read-only mount or sandbox. Porcelain status alone
is not evidence that ignored paths remained unchanged.

## Outcome semantics

Outcome precedence is `error`, then `fail`, then `pass`.

- `pass` means the validator is independent, the assigned revision was verified
  and remained unchanged, every required criterion and approved command passed,
  all required evidence was collected, and there are no findings, errors, or
  failure signatures.
- `fail` is a candidate verdict. The exact revision was validated reliably, all
  required work reached a candidate conclusion, and at least one acceptance
  criterion failed. It requires a blocking finding with severity, expected and
  actual behavior, repository location, supporting evidence, and a deterministic
  candidate failure signature.
- `error` withholds a candidate verdict. Use it for an invalid assignment,
  unresolved or mismatched revision, dirty or mutated candidate, unapproved
  command, process spawn failure, missing tool, timeout, permission or network
  failure, or insufficient evidence. It requires a structured error, evidence,
  and an infrastructure or protocol signature, and it must not contain candidate
  findings.

A nonzero command exit is `failed` only when the process ran reliably and the
exit demonstrates candidate behavior. Failure to start, timeout, signal,
unavailable dependency, or untrustworthy output is `error`.

## Evidence and references

Every executed check, command result, revision verification, finding, and error
references evidence IDs. Evidence is typed, timestamped, digest-backed, and
contains either a minimal excerpt or a retained repository-relative artifact.
Findings reference acceptance criteria and relevant artifact locations. IDs must
be unique within their collection, and every reference must resolve.

JSON Schema validates each document's shape. After both documents pass their
schemas, the zero-dependency pair-level checker additionally verifies
cross-document bindings and the canonical assignment digest, reference integrity,
command authorization, criterion coverage, independence, outcome semantics, and
signature hashes. Its source-checkout path is
`src/independent-validator-contracts.js`; CLI installations place the same module
at `.ai-playbook/contracts/independent-validator/validate.cjs`. Consumers call its
exported `validateIndependentValidatorPair(assignment, result)` only after
schema-validating both inputs.

## Enforcement boundary

Contracts can make claims internally consistent, but they cannot prove who
implemented code, that a process actually ran with the reported argv, that a
command had no hidden filesystem or network side effects, or that retained
evidence bytes are truthful. The orchestrator must provide authenticated validator
and implementer identities, a fresh disposable workspace, process-level argv and
network enforcement, and an external result sink. A read-only mount is preferred
when approved checks can run on one. Because Git porcelain omits ignored paths,
the orchestrator must keep ignored caches and generated outputs outside the
candidate tree or enforce their immutability through the sandbox.

The pair-level checker deliberately does not guess whether an arbitrary executable
is mutating or networked. The validator rejects such an assignment under the hard
read-only and network gates before execution, and the orchestrator sandbox is the
authoritative enforcement layer.

## Deterministic failure signatures

Each signature has a `basis` containing:

1. `namespace`
2. `category`
3. `sourceType`
4. `sourceId`
5. `code`
6. `context`

`sourceId` links the signature to its finding or error, but it is deliberately
excluded from the hash so a run-local record ID cannot destabilize the failure
signature. `context` is an object containing exactly three sorted, unique arrays:
`criterionIds`, `commandIds`, and `artifactPaths`. Sort array strings
lexicographically by UTF-16 code units, matching RFC 8785's property-name ordering.

Derive finding context from the finding's exact criterion IDs and location path,
plus command evidence sources referenced by the finding. Derive error context
from its linked command result and command evidence sources, the acceptance
criterion IDs assigned to those commands, and referenced artifact-evidence paths.
Do not add free-form or run-specific context.

The signature category is also derived, not chosen per run: findings use
`candidate`; errors at `assignment`, `independence`, `revision-verification`, or
`finalization` stages use `protocol`; errors at `execution` or
`evidence-collection` stages use `infrastructure`.

Serialize `context` with RFC 8785 JCS, then compute `value` from these five UTF-8
values in this exact order, joined by one LF byte with no trailing LF:

```text
namespace
category
sourceType
code
<RFC 8785 canonical JSON context>
```

Hash those bytes with SHA-256 and prefix the lowercase hexadecimal digest with
`sha256:`. Never include `sourceId`, timestamps, durations, absolute workspace
paths, random values, or raw output in the hash input. Sort `failureSignatures`
lexicographically by `value`. The same underlying failure then produces the same
signature across validation runs even when result-record IDs differ.

## Examples and validation

`v1/examples/` contains one assignment and three result examples:

- `pass-result.json`
- `fail-result.json`
- `infrastructure-error-result.json`

From an ai-playbook source checkout, run `npm test` to compile both schemas in
strict mode, validate all examples, and exercise pair-level semantic invariants.
