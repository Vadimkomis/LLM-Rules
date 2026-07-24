const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Ajv2020 = require("ajv/dist/2020");
const {
  canonicalJson,
  computeAssignmentDigest,
  computeFailureSignature,
  validateIndependentValidatorPair
} = require("../src/independent-validator-contracts");

const contractRoot = path.resolve(__dirname, "..", "contracts", "independent-validator", "v1");
const exampleRoot = path.join(contractRoot, "examples");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function compileSchemas() {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  return {
    assignment: ajv.compile(readJson(path.join(contractRoot, "assignment.schema.json"))),
    result: ajv.compile(readJson(path.join(contractRoot, "result.schema.json")))
  };
}

function assertSchemaValid(validate, value) {
  const valid = validate(value);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
}

const assignment = readJson(path.join(exampleRoot, "assignment.json"));
const results = {
  pass: readJson(path.join(exampleRoot, "pass-result.json")),
  fail: readJson(path.join(exampleRoot, "fail-result.json")),
  error: readJson(path.join(exampleRoot, "infrastructure-error-result.json"))
};

test("v1 schemas compile in strict JSON Schema 2020-12 mode", () => {
  assert.doesNotThrow(() => compileSchemas());
});

test("published assignment and pass, fail, and error examples satisfy their schemas", () => {
  const schemas = compileSchemas();

  assertSchemaValid(schemas.assignment, assignment);
  for (const result of Object.values(results)) {
    assertSchemaValid(schemas.result, result);
  }
});

test("published result examples satisfy cross-document contract semantics", () => {
  for (const [outcome, result] of Object.entries(results)) {
    const validation = validateIndependentValidatorPair(assignment, result);
    assert.deepEqual(validation, { valid: true, violations: [] }, outcome);
  }
});

test("assignment schema rejects mutable refs, unsafe paths, and unknown fields", () => {
  const { assignment: validate } = compileSchemas();
  const mutableRef = clone(assignment);
  mutableRef.candidateRevision.commit = "main";
  const unsafePath = clone(assignment);
  unsafePath.relevantArtifactPaths[0].path = "../outside";
  const windowsAbsolutePath = clone(assignment);
  windowsAbsolutePath.repositoryContext.repositoryRoot = "C:/candidate";
  const windowsDriveRelativePath = clone(assignment);
  windowsDriveRelativePath.repositoryContext.repositoryRoot = "D:candidate";
  const unknownField = clone(assignment);
  unknownField.extra = true;

  assert.equal(validate(mutableRef), false);
  assert.equal(validate(unsafePath), false);
  assert.equal(validate(windowsAbsolutePath), false);
  assert.equal(validate(windowsDriveRelativePath), false);
  assert.equal(validate(unknownField), false);
});

test("result schema enforces discriminated pass, fail, and error shapes", () => {
  const { result: validate } = compileSchemas();
  const invalidPass = clone(results.pass);
  invalidPass.executedChecks[0].status = "failed";
  const invalidFail = clone(results.fail);
  invalidFail.findings = [];
  const invalidError = clone(results.error);
  invalidError.errors = [];

  assert.equal(validate(invalidPass), false);
  assert.equal(validate(invalidFail), false);
  assert.equal(validate(invalidError), false);
});

test("result schema rejects a validator that admits implementing the candidate", () => {
  const { result: validate } = compileSchemas();
  const result = clone(results.pass);
  result.validatorMetadata.implementedCandidate = true;

  assert.equal(validate(result), false);
});

test("pair validation rejects implementer overlap and revision drift", () => {
  const implementerResult = clone(results.pass);
  implementerResult.validatorMetadata.validatorId = "agent-implementer-42";
  const driftedResult = clone(results.pass);
  driftedResult.inspectedRevision.commit = "2222222222222222222222222222222222222222";
  driftedResult.revisionVerification.inspectedRevision.commit =
    "2222222222222222222222222222222222222222";

  const independence = validateIndependentValidatorPair(assignment, implementerResult);
  const revision = validateIndependentValidatorPair(assignment, driftedResult);

  assert.equal(independence.valid, false);
  assert.match(independence.violations.join("\n"), /listed as a candidate implementer/);
  assert.equal(revision.valid, false);
  assert.match(revision.violations.join("\n"), /assigned immutable revision/);
});

test("error results cannot claim a mismatched revision was verified", () => {
  const result = clone(results.error);
  result.inspectedRevision.commit = "2222222222222222222222222222222222222222";
  result.revisionVerification.inspectedRevision.commit =
    "2222222222222222222222222222222222222222";

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /matchesAssignment contradicts/);
  assert.match(validation.violations.join("\n"), /despite a preflight mismatch/);
});

test("result binds the canonical assignment rather than only its ID", () => {
  const changedAssignment = clone(assignment);
  changedAssignment.constraints.additionalConstraints.push("A newly added constraint.");

  const validation = validateIndependentValidatorPair(changedAssignment, results.pass);

  assert.equal(results.pass.assignmentDigest, computeAssignmentDigest(assignment));
  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /assignmentDigest/);
});

test("revision comparison is independent of JSON object property order", () => {
  const result = clone(results.pass);
  const reorder = (revision) => ({
    commit: revision.commit,
    algorithm: revision.algorithm,
    vcs: revision.vcs
  });
  result.inspectedRevision = reorder(result.inspectedRevision);
  result.revisionVerification.assignedRevision = reorder(
    result.revisionVerification.assignedRevision
  );
  result.revisionVerification.resolvedRevision = reorder(
    result.revisionVerification.resolvedRevision
  );
  result.revisionVerification.inspectedRevision = reorder(
    result.revisionVerification.inspectedRevision
  );
  result.revisionVerification.preflightRevision = reorder(
    result.revisionVerification.preflightRevision
  );
  result.revisionVerification.postflightRevision = reorder(
    result.revisionVerification.postflightRevision
  );

  assert.equal(validateIndependentValidatorPair(assignment, result).valid, true);
});

test("pair validation rejects preflight or postflight HEAD drift", () => {
  const result = clone(results.pass);
  result.revisionVerification.postflightRevision.commit =
    "2222222222222222222222222222222222222222";

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /inspected revisions/);
  assert.match(validation.violations.join("\n"), /assigned immutable revision/);
});

test("pair validation rejects altered or unapproved commands", () => {
  const altered = clone(results.pass);
  altered.commandResults[0].argv.push("--update-snapshots");
  const unapproved = clone(results.error);
  unapproved.commandResults[1].commandId = "CMD-NOT-APPROVED";

  const alteredValidation = validateIndependentValidatorPair(assignment, altered);
  const unapprovedValidation = validateIndependentValidatorPair(assignment, unapproved);

  assert.equal(alteredValidation.valid, false);
  assert.match(alteredValidation.violations.join("\n"), /changed approved argv/);
  assert.equal(unapprovedValidation.valid, false);
  assert.match(unapprovedValidation.violations.join("\n"), /is not approved/);
});

test("executed checks cannot cite commands approved for another criterion", () => {
  const result = clone(results.pass);
  result.executedChecks[0].commandResultIds = ["CR-CLI-TEST"];

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /not approved for its criterion/);
});

test("criterion checks cannot use evidence produced by another criterion's command", () => {
  const result = clone(results.pass);
  result.commandResults[0].evidenceIds.push("E-CLI-TEST");
  result.executedChecks[0].evidenceIds = ["E-CLI-TEST"];

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, false);
  assert.match(
    validation.violations.join("\n"),
    /uses command evidence not approved for its criterion/
  );
});

test("command evidence cannot replace its omitted optional command result", () => {
  const changedAssignment = clone(assignment);
  changedAssignment.approvedValidationCommands[0].required = false;
  const result = clone(results.pass);
  result.assignmentDigest = computeAssignmentDigest(changedAssignment);
  result.commandResults = result.commandResults.slice(1);
  result.executedChecks[0].commandResultIds = [];
  const schemas = compileSchemas();

  assertSchemaValid(schemas.assignment, changedAssignment);
  assertSchemaValid(schemas.result, result);
  const validation = validateIndependentValidatorPair(changedAssignment, result);
  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /has no corresponding command result/);
});

test("pair validation requires conclusive coverage for required commands and criteria", () => {
  const missingCommand = clone(results.fail);
  missingCommand.commandResults = missingCommand.commandResults.slice(0, 1);
  missingCommand.executedChecks[1].commandResultIds = [];

  const validation = validateIndependentValidatorPair(assignment, missingCommand);

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /required command CMD-CLI-TEST/);
});

test("failed required commands cannot be orphaned from failed checks", () => {
  const changedAssignment = clone(assignment);
  changedAssignment.acceptanceCriteria[0].evidenceRequirements[0].kind =
    "artifactContent";
  const result = clone(results.fail);
  result.assignmentDigest = computeAssignmentDigest(changedAssignment);
  result.commandResults[0].status = "failed";
  result.commandResults[0].exitCode = 1;
  result.executedChecks[0].commandResultIds = [];
  result.executedChecks[0].evidenceIds = ["E-CLI-SOURCE"];

  const validation = validateIndependentValidatorPair(changedAssignment, result);

  assert.equal(validation.valid, false);
  assert.match(
    validation.violations.join("\n"),
    /required command CMD-CONTRACT-TEST is not linked/
  );
  assert.match(
    validation.violations.join("\n"),
    /failed required command CMD-CONTRACT-TEST lacks a supported blocking finding/
  );
});

test("fail outcome cannot be based only on an optional criterion", () => {
  const optionalAssignment = clone(assignment);
  optionalAssignment.acceptanceCriteria[1].required = false;
  optionalAssignment.approvedValidationCommands[1].required = false;

  const validation = validateIndependentValidatorPair(optionalAssignment, results.fail);

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /fail result lacks a failed check/);
});

test("blocking findings must share a criterion and evidence with a failed check", () => {
  const result = clone(results.fail);
  result.findings[0].criterionIds = ["AC-001"];

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, false);
  assert.match(
    validation.violations.join("\n"),
    /not supported by a failed required check/
  );
  assert.match(validation.violations.join("\n"), /fail result lacks a failed check/);
});

test("blocking findings cannot rely only on generic revision evidence", () => {
  const result = clone(results.fail);
  result.executedChecks[1].evidenceIds.push("E-REVISION");
  result.findings[0].evidenceIds = ["E-REVISION"];

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /fail result lacks a failed check/);
});

test("blocking findings cannot list a criterion whose check passed", () => {
  const result = clone(results.fail);
  result.findings[0].criterionIds = ["AC-001", "AC-002"];
  result.failureSignatures[0].basis.context.criterionIds = ["AC-001", "AC-002"];
  result.failureSignatures[0].value = computeFailureSignature(
    result.failureSignatures[0].basis
  );

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, false);
  assert.match(
    validation.violations.join("\n"),
    /not supported by a failed required check/
  );
});

test("every failed required criterion needs a supported blocking finding", () => {
  const result = clone(results.fail);
  result.executedChecks[0].status = "failed";

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, false);
  assert.match(
    validation.violations.join("\n"),
    /failed criterion AC-001 lacks a supported blocking finding/
  );
});

test("pair validation rejects dangling evidence and signature references", () => {
  const danglingEvidence = clone(results.fail);
  danglingEvidence.findings[0].evidenceIds = ["E-UNKNOWN"];
  const danglingSignature = clone(results.error);
  danglingSignature.errors[0].failureSignatureIds = ["SIG-UNKNOWN"];

  const evidenceValidation = validateIndependentValidatorPair(assignment, danglingEvidence);
  const signatureValidation = validateIndependentValidatorPair(assignment, danglingSignature);

  assert.equal(evidenceValidation.valid, false);
  assert.match(evidenceValidation.violations.join("\n"), /unknown ID E-UNKNOWN/);
  assert.equal(signatureValidation.valid, false);
  assert.match(signatureValidation.violations.join("\n"), /unknown ID SIG-UNKNOWN/);
});

test("pair validation rejects evidence attributed to unassigned sources", () => {
  const result = clone(results.pass);
  result.evidence[1].source.reference = "CMD-NOT-APPROVED";

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /unknown approved command/);
  assert.match(validation.violations.join("\n"), /lacks matching commandOutput evidence/);
});

test("revision proof must be VCS-sourced and required artifacts must be check-linked", () => {
  const wrongRevisionSource = clone(results.pass);
  wrongRevisionSource.evidence[0].source.type = "validator";
  const unlinkedArtifact = clone(results.pass);
  unlinkedArtifact.executedChecks[1].evidenceIds = ["E-CLI-TEST"];

  const sourceValidation = validateIndependentValidatorPair(assignment, wrongRevisionSource);
  const artifactValidation = validateIndependentValidatorPair(assignment, unlinkedArtifact);

  assert.equal(sourceValidation.valid, false);
  assert.match(sourceValidation.violations.join("\n"), /VCS-sourced revisionProof/);
  assert.equal(artifactValidation.valid, false);
  assert.match(artifactValidation.violations.join("\n"), /required artifact ART-CLI/);
});

test("command results obey timeouts and status-specific fields", () => {
  const { result: validate } = compileSchemas();
  const timedOutPass = clone(results.pass);
  timedOutPass.commandResults[0].durationMs = 120001;
  const contradictoryError = clone(results.error);
  contradictoryError.commandResults[1].exitCode = 1;
  contradictoryError.commandResults[1].signal = "SIGTERM";
  const pollutedPass = clone(results.pass);
  pollutedPass.commandResults[0].errorCode = "UNEXPECTED_ERROR";
  const invalidExitCode = clone(results.fail);
  invalidExitCode.commandResults[1].exitCode = -999;

  const timeoutValidation = validateIndependentValidatorPair(assignment, timedOutPass);

  assert.equal(timeoutValidation.valid, false);
  assert.match(timeoutValidation.violations.join("\n"), /exceeded its approved timeout/);
  assert.equal(validate(contradictoryError), false);
  assert.equal(validate(pollutedPass), false);
  assert.equal(validate(invalidExitCode), false);
});

test("errors cannot attribute a passed, unrelated command result", () => {
  const result = clone(results.error);
  result.errors[0].commandResultId = "CR-CONTRACT-TEST";
  const mismatchedCode = clone(results.error);
  mismatchedCode.errors[0].code = "DIFFERENT_ERROR";
  const revisionOnly = clone(results.error);
  revisionOnly.commandResults[1].evidenceIds.push("E-REVISION");
  revisionOnly.errors[0].evidenceIds = ["E-REVISION"];

  const validation = validateIndependentValidatorPair(assignment, result);
  const codeValidation = validateIndependentValidatorPair(assignment, mismatchedCode);
  const evidenceValidation = validateIndependentValidatorPair(
    assignment,
    revisionOnly
  );

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /references a non-error command result/);
  assert.equal(codeValidation.valid, false);
  assert.match(codeValidation.violations.join("\n"), /code does not match its command result/);
  assert.equal(evidenceValidation.valid, false);
  assert.match(evidenceValidation.violations.join("\n"), /shares no evidence/);
});

test("error command results require a linked validation error", () => {
  const changedAssignment = clone(assignment);
  changedAssignment.approvedValidationCommands.push({
    id: "CMD-OPTIONAL-ERROR",
    argv: ["node", "optional-error.js"],
    workingDirectory: ".",
    timeoutMs: 120000,
    expectedExitCodes: [0],
    required: false,
    criterionIds: ["AC-001"]
  });
  const result = clone(results.error);
  result.assignmentDigest = computeAssignmentDigest(changedAssignment);
  result.commandResults.push({
    id: "CR-OPTIONAL-ERROR",
    commandId: "CMD-OPTIONAL-ERROR",
    argv: ["node", "optional-error.js"],
    workingDirectory: ".",
    status: "error",
    exitCode: null,
    signal: null,
    durationMs: 1,
    errorCode: "OPTIONAL_COMMAND_ERROR",
    evidenceIds: ["E-OPTIONAL-ERROR"]
  });
  const excerpt = "optional command could not start";
  result.evidence.push({
    id: "E-OPTIONAL-ERROR",
    kind: "observation",
    summary: "The optional command encountered an infrastructure error.",
    source: {
      type: "validator",
      reference: "optional command runner"
    },
    digest: `sha256:${createHash("sha256").update(excerpt, "utf8").digest("hex")}`,
    excerpt,
    capturedAt: "2026-07-24T14:20:04Z"
  });

  const validation = validateIndependentValidatorPair(changedAssignment, result);

  assert.equal(validation.valid, false);
  assert.match(
    validation.violations.join("\n"),
    /error command result CR-OPTIONAL-ERROR has no validation error/
  );
});

test("optional failed command results cannot be orphaned from failed checks", () => {
  const changedAssignment = clone(assignment);
  changedAssignment.approvedValidationCommands.push({
    id: "CMD-OPTIONAL-FAIL",
    argv: ["node", "optional-fail.js"],
    workingDirectory: ".",
    timeoutMs: 120000,
    expectedExitCodes: [0],
    required: false,
    criterionIds: ["AC-001"]
  });
  const result = clone(results.fail);
  result.assignmentDigest = computeAssignmentDigest(changedAssignment);
  result.commandResults.push({
    id: "CR-OPTIONAL-FAIL",
    commandId: "CMD-OPTIONAL-FAIL",
    argv: ["node", "optional-fail.js"],
    workingDirectory: ".",
    status: "failed",
    exitCode: 1,
    signal: null,
    durationMs: 3,
    evidenceIds: ["E-OPTIONAL-FAIL"]
  });
  const excerpt = "optional check exited 1";
  result.evidence.push({
    id: "E-OPTIONAL-FAIL",
    kind: "commandOutput",
    summary: "The optional command returned an unexpected exit code.",
    source: {
      type: "command",
      reference: "CMD-OPTIONAL-FAIL"
    },
    digest: `sha256:${createHash("sha256").update(excerpt, "utf8").digest("hex")}`,
    excerpt,
    capturedAt: "2026-07-24T14:10:05Z"
  });

  const validation = validateIndependentValidatorPair(changedAssignment, result);

  assert.equal(validation.valid, false);
  assert.match(
    validation.violations.join("\n"),
    /failed command result CR-OPTIONAL-FAIL is not linked to a failed check/
  );
});

test("an unused optional skipped command needs evidence but not fabricated output", () => {
  const changedAssignment = clone(assignment);
  changedAssignment.approvedValidationCommands.push({
    id: "CMD-OPTIONAL",
    argv: ["node", "optional-check.js"],
    workingDirectory: ".",
    timeoutMs: 120000,
    expectedExitCodes: [0],
    required: false,
    criterionIds: ["AC-001"]
  });
  const result = clone(results.pass);
  result.assignmentDigest = computeAssignmentDigest(changedAssignment);
  result.commandResults.push({
    id: "CR-OPTIONAL",
    commandId: "CMD-OPTIONAL",
    argv: ["node", "optional-check.js"],
    workingDirectory: ".",
    status: "skipped",
    exitCode: null,
    signal: null,
    durationMs: 0,
    skipReason: "The optional check was not needed.",
    evidenceIds: ["E-OPTIONAL-SKIP"]
  });
  const excerpt = "optional command not executed";
  result.evidence.push({
    id: "E-OPTIONAL-SKIP",
    kind: "observation",
    summary: "The validator recorded why the optional command was skipped.",
    source: {
      type: "validator",
      reference: "optional command decision"
    },
    digest: `sha256:${createHash("sha256").update(excerpt, "utf8").digest("hex")}`,
    excerpt,
    capturedAt: "2026-07-24T14:00:04Z"
  });

  const validation = validateIndependentValidatorPair(changedAssignment, result);

  assert.deepEqual(validation, { valid: true, violations: [] });
});

test("a conclusive check cannot rely on a skipped command result", () => {
  const changedAssignment = clone(assignment);
  changedAssignment.approvedValidationCommands[0].required = false;
  const result = clone(results.pass);
  result.assignmentDigest = computeAssignmentDigest(changedAssignment);
  result.commandResults[0] = {
    ...result.commandResults[0],
    status: "skipped",
    exitCode: null,
    signal: null,
    durationMs: 0,
    skipReason: "Skipped despite criterion coverage.",
    evidenceIds: ["E-CONTRACT-TEST"]
  };

  const validation = validateIndependentValidatorPair(changedAssignment, result);

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /inconclusive command result/);
});

test("duplicate evidence kinds cannot satisfy distinct requirements by double counting", () => {
  const changedAssignment = clone(assignment);
  changedAssignment.acceptanceCriteria[0].evidenceRequirements.push({
    id: "ER-AC-001-COMMAND-SECOND",
    kind: "commandOutput",
    description: "A distinct second command output.",
    minimumCount: 1
  });

  const validation = validateIndependentValidatorPair(changedAssignment, results.pass);

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /duplicate kind commandOutput/);
});

test("structured findings require severity and supporting evidence", () => {
  const { result: validate } = compileSchemas();
  const missingSeverity = clone(results.fail);
  delete missingSeverity.findings[0].severity;
  const missingEvidence = clone(results.fail);
  missingEvidence.findings[0].evidenceIds = [];

  assert.equal(validate(missingSeverity), false);
  assert.equal(validate(missingEvidence), false);
});

test("pass and fail require a disposable, unchanged candidate workspace", () => {
  const { result: validate } = compileSchemas();
  const modified = clone(results.pass);
  modified.revisionVerification.workspaceUnchangedAfter = false;
  const unsupportedMethod = clone(results.pass);
  unsupportedMethod.revisionVerification.method = "clean-existing-checkout";
  const changedTree = clone(results.pass);
  changedTree.revisionVerification.postflightTree =
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const changedRevisionError = clone(results.error);
  changedRevisionError.revisionVerification.postflightRevision.commit =
    "2222222222222222222222222222222222222222";
  changedRevisionError.revisionVerification.matchesAssignment = false;
  changedRevisionError.revisionVerification.verifiedBeforeChecks = false;
  const wrongTreeLengthError = clone(results.error);
  wrongTreeLengthError.revisionVerification.preflightTree = "a".repeat(64);
  wrongTreeLengthError.revisionVerification.postflightTree = "a".repeat(64);

  assert.equal(validate(modified), false);
  assert.equal(validate(unsupportedMethod), false);
  const treeValidation = validateIndependentValidatorPair(assignment, changedTree);
  assert.equal(treeValidation.valid, false);
  assert.match(treeValidation.violations.join("\n"), /status drift/);
  const revisionValidation = validateIndependentValidatorPair(
    assignment,
    changedRevisionError
  );
  assert.equal(revisionValidation.valid, false);
  assert.match(revisionValidation.violations.join("\n"), /revision, tree, or status drift/);
  const treeLengthValidation = validateIndependentValidatorPair(
    assignment,
    wrongTreeLengthError
  );
  assert.equal(treeLengthValidation.valid, false);
  assert.match(treeLengthValidation.violations.join("\n"), /length does not match/);
});

test("unavailable revision verification cannot claim clean or source-safe state", () => {
  const result = clone(results.error);
  result.inspectedRevision = null;
  Object.assign(result.revisionVerification, {
    resolvedRevision: null,
    inspectedRevision: null,
    preflightRevision: null,
    postflightRevision: null,
    preflightTree: null,
    postflightTree: null,
    preflightStatusDigest: null,
    postflightStatusDigest: null,
    method: "unavailable",
    matchesAssignment: false,
    verifiedBeforeChecks: false,
    cleanBefore: true,
    workspaceUnchangedAfter: false,
    sourceWorkspaceUnmodified: true,
    evidenceIds: ["E-SPAWN-ERROR"]
  });

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /cleanBefore contradicts/);
  assert.match(validation.violations.join("\n"), /requires a disposable worktree/);
});

test("postflight failure does not erase truthful preflight verification", () => {
  const result = clone(results.error);
  result.revisionVerification.postflightRevision = null;
  result.revisionVerification.postflightTree = null;
  result.revisionVerification.postflightStatusDigest = null;
  result.revisionVerification.matchesAssignment = false;
  result.revisionVerification.workspaceUnchangedAfter = false;

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, true, validation.violations.join("\n"));
  assert.equal(result.revisionVerification.verifiedBeforeChecks, true);
});

test("partial revision state requires VCS revision-proof evidence", () => {
  const result = clone(results.error);
  result.inspectedRevision = null;
  Object.assign(result.revisionVerification, {
    resolvedRevision: null,
    inspectedRevision: null,
    preflightRevision: null,
    postflightRevision: null,
    preflightTree: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    postflightTree: null,
    preflightStatusDigest:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    postflightStatusDigest: null,
    method: "unavailable",
    matchesAssignment: false,
    verifiedBeforeChecks: false,
    cleanBefore: false,
    workspaceUnchangedAfter: false,
    sourceWorkspaceUnmodified: false,
    evidenceIds: ["E-SPAWN-ERROR"]
  });

  const validation = validateIndependentValidatorPair(assignment, result);

  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), /no VCS-sourced revisionProof evidence/);
});

test("failure signatures are deterministic, source-ID independent, and structurally stable", () => {
  const { result: validate } = compileSchemas();
  const basis = results.fail.failureSignatures[0].basis;
  const first = computeFailureSignature(basis);
  const second = computeFailureSignature(clone(basis));
  const changedSourceId = computeFailureSignature({
    ...clone(basis),
    sourceId: "F-RUN-LOCAL-999"
  });
  const changedContext = computeFailureSignature({
    ...clone(basis),
    context: {
      ...clone(basis.context),
      artifactPaths: ["tests/cli.test.js"]
    }
  });
  const volatile = clone(results.fail);
  volatile.failureSignatures[0].basis.context.runId = "20260724T141000Z";
  volatile.failureSignatures[0].value = computeFailureSignature(
    volatile.failureSignatures[0].basis
  );
  const nonDerived = clone(results.fail);
  nonDerived.failureSignatures[0].basis.context.artifactPaths = [
    "tests/cli.test.js"
  ];
  nonDerived.failureSignatures[0].value = computeFailureSignature(
    nonDerived.failureSignatures[0].basis
  );
  const wrongCategory = clone(results.error);
  wrongCategory.failureSignatures[0].basis.category = "protocol";
  wrongCategory.failureSignatures[0].value = computeFailureSignature(
    wrongCategory.failureSignatures[0].basis
  );
  const invalidUnicode = clone(results.fail);
  invalidUnicode.failureSignatures[0].basis.context.artifactPaths = ["\ud800"];

  assert.equal(first, results.fail.failureSignatures[0].value);
  assert.equal(second, first);
  assert.equal(changedSourceId, first);
  assert.notEqual(changedContext, first);
  assert.equal(validate(volatile), false);
  const pairValidation = validateIndependentValidatorPair(assignment, nonDerived);
  assert.equal(pairValidation.valid, false);
  assert.match(pairValidation.violations.join("\n"), /stable source-derived context/);
  const categoryValidation = validateIndependentValidatorPair(assignment, wrongCategory);
  assert.equal(categoryValidation.valid, false);
  assert.match(categoryValidation.violations.join("\n"), /wrong source category/);
  assert.doesNotThrow(() =>
    validateIndependentValidatorPair(assignment, invalidUnicode)
  );
  const unicodeValidation = validateIndependentValidatorPair(
    assignment,
    invalidUnicode
  );
  assert.equal(unicodeValidation.valid, false);
  assert.match(unicodeValidation.violations.join("\n"), /not valid RFC 8785 JSON/);
});

test("assignment digests use RFC 8785 JSON canonicalization for Unicode data", () => {
  assert.equal(
    canonicalJson({ z: "😀", a: "café", nested: { beta: 2, alpha: 1 } }),
    '{"a":"café","nested":{"alpha":1,"beta":2},"z":"😀"}'
  );
  assert.throws(() => canonicalJson({ invalid: "\ud800" }), /lone Unicode surrogate/);
});

test("pair validation rejects invalid, reversed, and out-of-run timestamps", () => {
  const invalid = clone(results.pass);
  invalid.startedAt = "2026-13-24T14:00:00Z";
  const reversed = clone(results.pass);
  reversed.completedAt = "2026-07-24T13:59:59Z";
  const fractionallyReversed = clone(results.pass);
  fractionallyReversed.startedAt = "2026-07-24T14:00:00.0009Z";
  fractionallyReversed.completedAt = "2026-07-24T14:00:00.0001Z";
  const outOfRun = clone(results.pass);
  outOfRun.evidence[0].capturedAt = "2026-07-24T15:00:00Z";

  assert.match(
    validateIndependentValidatorPair(assignment, invalid).violations.join("\n"),
    /invalid start/
  );
  assert.match(
    validateIndependentValidatorPair(assignment, reversed).violations.join("\n"),
    /earlier than/
  );
  assert.match(
    validateIndependentValidatorPair(
      assignment,
      fractionallyReversed
    ).violations.join("\n"),
    /earlier than/
  );
  assert.match(
    validateIndependentValidatorPair(assignment, outOfRun).violations.join("\n"),
    /out-of-run/
  );
});

test("example evidence digests match their excerpts", () => {
  for (const result of Object.values(results)) {
    for (const evidence of result.evidence) {
      if (!evidence.excerpt) {
        continue;
      }
      const digest = createHash("sha256").update(evidence.excerpt, "utf8").digest("hex");
      assert.equal(evidence.digest, `sha256:${digest}`, evidence.id);
    }
  }
});
