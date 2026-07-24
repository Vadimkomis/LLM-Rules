const { createHash } = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");

const SIGNATURE_HASH_FIELDS = [
  "namespace",
  "category",
  "sourceType",
  "code"
];
const PROTOCOL_ERROR_STAGES = new Set([
  "assignment",
  "independence",
  "revision-verification",
  "finalization"
]);
const EMPTY_SHA256 = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function canonicalFailureSignatureInput(basis) {
  return [
    ...SIGNATURE_HASH_FIELDS.map((field) => basis[field]),
    canonicalJson(basis.context)
  ].join("\n");
}

function computeFailureSignature(basis) {
  const input = canonicalFailureSignatureInput(basis);
  const digest = createHash("sha256").update(input, "utf8").digest("hex");
  return `sha256:${digest}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.keys(value)
      .sort()
      .map((key) => {
        assertUnicodeScalarSequence(key);
        return `${JSON.stringify(key)}:${canonicalJson(value[key])}`;
      });
    return `{${entries.join(",")}}`;
  }
  if (typeof value === "string") {
    assertUnicodeScalarSequence(value);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("RFC 8785 rejects non-finite numbers");
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError("value is not valid RFC 8785 JSON");
  }
  return serialized;
}

function assertUnicodeScalarSequence(value) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TypeError("RFC 8785 rejects lone Unicode surrogates");
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new TypeError("RFC 8785 rejects lone Unicode surrogates");
    }
  }
}

function computeAssignmentDigest(assignment) {
  const digest = createHash("sha256").update(canonicalJson(assignment), "utf8").digest("hex");
  return `sha256:${digest}`;
}

function sameValue(left, right) {
  return isDeepStrictEqual(left, right);
}

function indexById(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function addDuplicateViolations(violations, label, items, field = "id") {
  const seen = new Set();
  for (const item of items || []) {
    if (seen.has(item[field])) {
      violations.push(`${label} contains duplicate ${field} ${item[field]}`);
    }
    seen.add(item[field]);
  }
}

function addReferenceViolations(violations, label, references, validIds) {
  for (const reference of references || []) {
    if (!validIds.has(reference)) {
      violations.push(`${label} references unknown ID ${reference}`);
    }
  }
}

function validateAssignmentReferences(assignment, violations) {
  const criterionIds = new Set(assignment.acceptanceCriteria.map((item) => item.id));
  for (const command of assignment.approvedValidationCommands) {
    addReferenceViolations(
      violations,
      `approved command ${command.id}`,
      command.criterionIds,
      criterionIds
    );
  }
}

function validateResultReferences(assignment, result, violations) {
  const criterionIds = new Set(assignment.acceptanceCriteria.map((item) => item.id));
  const artifactsById = indexById(assignment.relevantArtifactPaths);
  const approvedCommandsById = indexById(assignment.approvedValidationCommands);
  const evidenceIds = new Set(result.evidence.map((item) => item.id));
  const commandResultsById = indexById(result.commandResults);
  const commandResultIds = new Set(commandResultsById.keys());
  const signatureIds = new Set(result.failureSignatures.map((item) => item.id));

  addReferenceViolations(
    violations,
    "revision verification",
    result.revisionVerification.evidenceIds,
    evidenceIds
  );
  for (const check of result.executedChecks) {
    addReferenceViolations(violations, `check ${check.id}`, [check.criterionId], criterionIds);
    addReferenceViolations(
      violations,
      `check ${check.id}`,
      check.commandResultIds,
      commandResultIds
    );
    for (const commandResultId of check.commandResultIds) {
      const commandResult = commandResultsById.get(commandResultId);
      const approved = approvedCommandsById.get(commandResult?.commandId);
      if (approved && !approved.criterionIds.includes(check.criterionId)) {
        violations.push(`check ${check.id} cites a command not approved for its criterion`);
      }
      if (
        commandResult &&
        ["passed", "failed"].includes(check.status) &&
        !["passed", "failed"].includes(commandResult.status)
      ) {
        violations.push(`check ${check.id} cites an inconclusive command result`);
      }
      if (
        commandResult &&
        check.status === "passed" &&
        commandResult.status === "failed"
      ) {
        violations.push(`passed check ${check.id} cites a failed command result`);
      }
      const sharesEvidence = commandResult?.evidenceIds.some((id) =>
        check.evidenceIds.includes(id)
      );
      if (commandResult && !sharesEvidence) {
        violations.push(
          `check ${check.id} shares no evidence with command result ${commandResultId}`
        );
      }
    }
    addReferenceViolations(violations, `check ${check.id}`, check.evidenceIds, evidenceIds);
    for (const evidenceId of check.evidenceIds) {
      const evidence = result.evidence.find((item) => item.id === evidenceId);
      const evidenceCommand = approvedCommandsById.get(evidence?.source.reference);
      if (
        evidence?.source.type === "command" &&
        (!evidenceCommand || !evidenceCommand.criterionIds.includes(check.criterionId))
      ) {
        violations.push(`check ${check.id} uses command evidence not approved for its criterion`);
      }
      if (evidence?.source.type === "command") {
        const sourceResult = result.commandResults.find(
          (item) => item.commandId === evidence.source.reference
        );
        if (sourceResult && !check.commandResultIds.includes(sourceResult.id)) {
          violations.push(
            `check ${check.id} uses command evidence without its command result`
          );
        }
      }
    }
  }
  validateFindingReferences(
    result,
    criterionIds,
    artifactsById,
    evidenceIds,
    signatureIds,
    violations
  );
  validateErrorReferences(result, commandResultIds, evidenceIds, signatureIds, violations);
  for (const commandResult of result.commandResults) {
    addReferenceViolations(
      violations,
      `command result ${commandResult.id}`,
      commandResult.evidenceIds,
      evidenceIds
    );
  }
  validateEvidenceSources(assignment, result, violations);
  const revisionEvidence = result.revisionVerification.evidenceIds
    .map((id) => result.evidence.find((item) => item.id === id))
    .filter((item) => item?.kind === "revisionProof" && item.source.type === "vcs");
  const verification = result.revisionVerification;
  const identityAttempted =
    verification.method !== "unavailable" ||
    verification.verifiedBeforeChecks ||
    verification.resolvedRevision !== null ||
    verification.inspectedRevision !== null ||
    verification.preflightRevision !== null ||
    verification.postflightRevision !== null ||
    verification.preflightTree !== null ||
    verification.postflightTree !== null ||
    verification.preflightStatusDigest !== null ||
    verification.postflightStatusDigest !== null;
  if (identityAttempted && revisionEvidence.length === 0) {
    violations.push("revision verification has no VCS-sourced revisionProof evidence");
  }
}

function validateEvidenceSources(assignment, result, violations) {
  const commandIds = new Set(assignment.approvedValidationCommands.map((item) => item.id));
  const commandResultsByCommandId = new Map(
    result.commandResults.map((item) => [item.commandId, item])
  );
  const artifactsById = indexById(assignment.relevantArtifactPaths);
  const artifactPaths = new Set(assignment.relevantArtifactPaths.map((item) => item.path));
  for (const evidence of result.evidence) {
    if (evidence.source.type === "command" && !commandIds.has(evidence.source.reference)) {
      violations.push(`evidence ${evidence.id} references an unknown approved command`);
    }
    if (evidence.source.type === "command") {
      const commandResult = commandResultsByCommandId.get(evidence.source.reference);
      if (!commandResult) {
        violations.push(`evidence ${evidence.id} has no corresponding command result`);
      } else if (!commandResult.evidenceIds.includes(evidence.id)) {
        violations.push(`evidence ${evidence.id} is not linked from its command result`);
      }
    }
    if (evidence.source.type === "artifact" && !artifactsById.has(evidence.source.reference)) {
      violations.push(`evidence ${evidence.id} references an unknown assigned artifact`);
    }
    if (evidence.artifactPath && !artifactPaths.has(evidence.artifactPath)) {
      violations.push(`evidence ${evidence.id} uses an unassigned artifact path`);
    }
    const artifact = artifactsById.get(evidence.source.reference);
    if (artifact && evidence.artifactPath && artifact.path !== evidence.artifactPath) {
      violations.push(`evidence ${evidence.id} path does not match its source artifact`);
    }
  }
}

function validateFindingReferences(
  result,
  criterionIds,
  artifactsById,
  evidenceIds,
  signatureIds,
  violations
) {
  for (const finding of result.findings) {
    addReferenceViolations(
      violations,
      `finding ${finding.id}`,
      finding.criterionIds,
      criterionIds
    );
    addReferenceViolations(
      violations,
      `finding ${finding.id}`,
      [finding.location.artifactId],
      new Set(artifactsById.keys())
    );
    const artifact = artifactsById.get(finding.location.artifactId);
    if (artifact && artifact.path !== finding.location.path) {
      violations.push(`finding ${finding.id} location does not match its assigned artifact`);
    }
    addReferenceViolations(violations, `finding ${finding.id}`, finding.evidenceIds, evidenceIds);
    addReferenceViolations(
      violations,
      `finding ${finding.id}`,
      finding.failureSignatureIds,
      signatureIds
    );
  }
}

function validateErrorReferences(
  result,
  commandResultIds,
  evidenceIds,
  signatureIds,
  violations
) {
  for (const error of result.errors) {
    if (error.commandResultId) {
      addReferenceViolations(
        violations,
        `error ${error.id}`,
        [error.commandResultId],
        commandResultIds
      );
      const commandResult = result.commandResults.find(
        (item) => item.id === error.commandResultId
      );
      if (commandResult && commandResult.status !== "error") {
        violations.push(`error ${error.id} references a non-error command result`);
      }
      if (commandResult && commandResult.errorCode !== error.code) {
        violations.push(`error ${error.id} code does not match its command result`);
      }
      const sharesEvidence = commandResult?.evidenceIds.some((id) => {
        const evidence = result.evidence.find((item) => item.id === id);
        return error.evidenceIds.includes(id) && evidence?.kind !== "revisionProof";
      });
      if (commandResult && !sharesEvidence) {
        violations.push(`error ${error.id} shares no evidence with its command result`);
      }
    }
    addReferenceViolations(violations, `error ${error.id}`, error.evidenceIds, evidenceIds);
    addReferenceViolations(
      violations,
      `error ${error.id}`,
      error.failureSignatureIds,
      signatureIds
    );
  }
  for (const commandResult of result.commandResults.filter(
    (item) => item.status === "error"
  )) {
    if (!result.errors.some((error) => error.commandResultId === commandResult.id)) {
      violations.push(`error command result ${commandResult.id} has no validation error`);
    }
  }
}

function validateUniqueIds(assignment, result, violations) {
  const collections = [
    ["acceptanceCriteria", assignment.acceptanceCriteria],
    ["approvedValidationCommands", assignment.approvedValidationCommands],
    ["relevantArtifactPaths", assignment.relevantArtifactPaths],
    ["executedChecks", result.executedChecks],
    ["commandResults", result.commandResults],
    ["findings", result.findings],
    ["evidence", result.evidence],
    ["errors", result.errors],
    ["failureSignatures", result.failureSignatures]
  ];
  for (const [label, items] of collections) {
    addDuplicateViolations(violations, label, items);
  }
  const requirements = assignment.acceptanceCriteria.flatMap(
    (criterion) => criterion.evidenceRequirements
  );
  addDuplicateViolations(violations, "evidenceRequirements", requirements);
  for (const criterion of assignment.acceptanceCriteria) {
    addDuplicateViolations(
      violations,
      `criterion ${criterion.id} evidenceRequirements`,
      criterion.evidenceRequirements,
      "kind"
    );
  }
  addDuplicateViolations(violations, "commandResults", result.commandResults, "commandId");
}

function validateBinding(assignment, result, violations) {
  if (result.contractVersion !== assignment.contractVersion) {
    violations.push("result contractVersion does not match assignment");
  }
  if (result.assignmentId !== assignment.assignmentId) {
    violations.push("result assignmentId does not match assignment");
  }
  try {
    if (result.assignmentDigest !== computeAssignmentDigest(assignment)) {
      violations.push("result assignmentDigest does not match the canonical assignment");
    }
  } catch {
    violations.push("assignment cannot be canonicalized using RFC 8785");
  }
  if (!sameValue(result.revisionVerification.assignedRevision, assignment.candidateRevision)) {
    violations.push("revisionVerification.assignedRevision does not match assignment");
  }
  if (!sameValue(result.inspectedRevision, result.revisionVerification.inspectedRevision)) {
    violations.push("top-level inspectedRevision does not match revision verification");
  }
}

function validateIndependence(assignment, result, violations) {
  const metadata = result.validatorMetadata;
  if (metadata.implementedCandidate || !metadata.independenceAttested) {
    violations.push("validator independence attestation is invalid");
  }
  if (assignment.repositoryContext.candidateImplementerIds.includes(metadata.validatorId)) {
    violations.push("validatorId is listed as a candidate implementer");
  }
}

function validateCommandAuthorization(assignment, result, violations) {
  const approvedById = indexById(assignment.approvedValidationCommands);
  const evidenceById = indexById(result.evidence);
  for (const commandResult of result.commandResults) {
    const approved = approvedById.get(commandResult.commandId);
    if (!approved) {
      violations.push(`command result ${commandResult.id} is not approved`);
      continue;
    }
    if (!sameValue(commandResult.argv, approved.argv)) {
      violations.push(`command result ${commandResult.id} changed approved argv`);
    }
    if (commandResult.workingDirectory !== approved.workingDirectory) {
      violations.push(`command result ${commandResult.id} changed approved workingDirectory`);
    }
    const matchingOutput = commandResult.evidenceIds
      .map((id) => evidenceById.get(id))
      .some(
        (evidence) =>
          evidence?.kind === "commandOutput" &&
          evidence.source.type === "command" &&
          evidence.source.reference === commandResult.commandId
      );
    if (["passed", "failed"].includes(commandResult.status) && !matchingOutput) {
      violations.push(`command result ${commandResult.id} lacks matching commandOutput evidence`);
    }
    validateCommandStatus(approved, commandResult, violations);
    if (
      commandResult.status === "failed" &&
      !result.executedChecks.some(
        (check) =>
          check.status === "failed" && check.commandResultIds.includes(commandResult.id)
      )
    ) {
      violations.push(`failed command result ${commandResult.id} is not linked to a failed check`);
    }
  }
}

function validateCommandStatus(approved, commandResult, violations) {
  const expected = approved.expectedExitCodes.includes(commandResult.exitCode);
  if (commandResult.status === "passed" && !expected) {
    violations.push(`command result ${commandResult.id} passed with an unexpected exit code`);
  }
  if (commandResult.status === "failed" && expected) {
    violations.push(`command result ${commandResult.id} failed with an expected exit code`);
  }
  if (["passed", "failed"].includes(commandResult.status) && commandResult.durationMs > approved.timeoutMs) {
    violations.push(`command result ${commandResult.id} exceeded its approved timeout`);
  }
  if (commandResult.status === "error" && commandResult.exitCode !== null && commandResult.signal) {
    violations.push(`command result ${commandResult.id} has both an exit code and a signal`);
  }
  if (["passed", "failed"].includes(commandResult.status) && commandResult.errorCode) {
    violations.push(`command result ${commandResult.id} has errorCode without error status`);
  }
  if (commandResult.status !== "skipped" && commandResult.skipReason) {
    violations.push(`command result ${commandResult.id} has skipReason without skipped status`);
  }
}

function validateRevisionForVerdict(assignment, result, violations) {
  const verification = result.revisionVerification;
  const preflightRevisions = [
    result.inspectedRevision,
    verification.resolvedRevision,
    verification.inspectedRevision,
    verification.preflightRevision
  ];
  const preflightMatches = preflightRevisions.every((revision) =>
    sameValue(revision, assignment.candidateRevision)
  );
  const allMatch =
    preflightMatches &&
    sameValue(verification.postflightRevision, assignment.candidateRevision);
  if (verification.matchesAssignment !== allMatch) {
    violations.push("revisionVerification.matchesAssignment contradicts the inspected revisions");
  }
  if (verification.verifiedBeforeChecks && !preflightMatches) {
    violations.push("revision was marked verified before checks despite a preflight mismatch");
  }
  validateWorkspaceIntegrity(assignment, verification, result.outcome, violations);
  if (result.outcome === "error") {
    return;
  }
  if (!allMatch) {
    violations.push(`${result.outcome} result did not inspect the assigned immutable revision`);
  }
  const requiredFlags = [
    "matchesAssignment",
    "verifiedBeforeChecks",
    "cleanBefore",
    "workspaceUnchangedAfter",
    "sourceWorkspaceUnmodified"
  ];
  for (const flag of requiredFlags) {
    if (verification[flag] !== true) {
      violations.push(`${result.outcome} result requires revisionVerification.${flag} to be true`);
    }
  }
}

function validateWorkspaceIntegrity(assignment, verification, outcome, violations) {
  const revisionsMatch =
    verification.preflightRevision !== null &&
    sameValue(verification.preflightRevision, verification.postflightRevision);
  const treesMatch =
    verification.preflightTree !== null &&
    verification.preflightTree === verification.postflightTree;
  const statusesMatch =
    verification.preflightStatusDigest !== null &&
    verification.preflightStatusDigest === verification.postflightStatusDigest;
  if (
    verification.workspaceUnchangedAfter &&
    (!revisionsMatch || !treesMatch || !statusesMatch)
  ) {
    violations.push("workspace was marked unchanged despite revision, tree, or status drift");
  }
  if (verification.cleanBefore !== (verification.preflightStatusDigest === EMPTY_SHA256)) {
    violations.push("revisionVerification.cleanBefore contradicts preflightStatusDigest");
  }
  for (const flag of [
    "verifiedBeforeChecks",
    "cleanBefore",
    "workspaceUnchangedAfter",
    "sourceWorkspaceUnmodified"
  ]) {
    if (verification[flag] && verification.method !== "disposable-worktree") {
      violations.push(`revisionVerification.${flag} requires a disposable worktree`);
    }
  }
  const expectedLength = assignment.candidateRevision.algorithm === "sha1" ? 40 : 64;
  const treeIds = [verification.preflightTree, verification.postflightTree].filter(
    (tree) => tree !== null
  );
  if (treeIds.some((tree) => tree.length !== expectedLength)) {
    violations.push("revisionVerification tree object ID length does not match revision algorithm");
  }
  if (outcome === "error") {
    return;
  }
  const validTreeLength =
    verification.preflightTree?.length === expectedLength &&
    verification.postflightTree?.length === expectedLength;
  const cleanStatuses =
    verification.preflightStatusDigest === EMPTY_SHA256 &&
    verification.postflightStatusDigest === EMPTY_SHA256;
  if (!treesMatch || !statusesMatch || !validTreeLength || !cleanStatuses) {
    violations.push(`${outcome} result lacks matching clean preflight and postflight state`);
  }
}

function validateRequiredCoverage(assignment, result, violations) {
  if (result.outcome === "error") {
    return;
  }
  const checksByCriterion = groupBy(result.executedChecks, "criterionId");
  const commandsById = groupBy(result.commandResults, "commandId");
  for (const criterion of assignment.acceptanceCriteria.filter((item) => item.required)) {
    const checks = checksByCriterion.get(criterion.id) || [];
    if (checks.length !== 1 || !["passed", "failed"].includes(checks[0]?.status)) {
      violations.push(`required criterion ${criterion.id} lacks one conclusive check`);
      continue;
    }
    validateEvidenceRequirements(criterion, checks[0], result, violations);
  }
  for (const command of assignment.approvedValidationCommands.filter((item) => item.required)) {
    const commandResults = commandsById.get(command.id) || [];
    if (commandResults.length !== 1 || !["passed", "failed"].includes(commandResults[0]?.status)) {
      violations.push(`required command ${command.id} lacks one conclusive result`);
      continue;
    }
    const linkedChecks = result.executedChecks.filter((check) =>
      check.commandResultIds.includes(commandResults[0].id)
    );
    if (linkedChecks.length === 0) {
      violations.push(`required command ${command.id} is not linked to an executed check`);
    }
    if (
      commandResults[0].status === "failed" &&
      !linkedChecks.some((check) => check.status === "failed")
    ) {
      violations.push(`failed required command ${command.id} is not linked to a failed check`);
    }
    if (
      commandResults[0].status === "failed" &&
      !commandFailureHasBlockingFinding(result, commandResults[0], linkedChecks)
    ) {
      violations.push(`failed required command ${command.id} lacks a supported blocking finding`);
    }
  }
  validateRequiredArtifacts(assignment, result, violations);
}

function commandFailureHasBlockingFinding(result, commandResult, linkedChecks) {
  const commandEvidence = new Set(commandResult.evidenceIds);
  return linkedChecks
    .filter((check) => check.status === "failed")
    .some((check) =>
      result.findings.some(
        (finding) =>
          finding.blocksAcceptance &&
          finding.criterionIds.includes(check.criterionId) &&
          finding.evidenceIds.some((evidenceId) => {
            const evidence = result.evidence.find((item) => item.id === evidenceId);
            return (
              commandEvidence.has(evidenceId) &&
              check.evidenceIds.includes(evidenceId) &&
              evidence?.kind !== "revisionProof"
            );
          })
      )
    );
}

function validateRequiredArtifacts(assignment, result, violations) {
  const checkEvidenceIds = new Set(result.executedChecks.flatMap((check) => check.evidenceIds));
  for (const artifact of assignment.relevantArtifactPaths.filter((item) => item.required)) {
    const inspected = result.evidence.some(
      (evidence) =>
        checkEvidenceIds.has(evidence.id) &&
        evidence.kind === "artifactContent" &&
        evidence.source.type === "artifact" &&
        evidence.source.reference === artifact.id &&
        evidence.artifactPath === artifact.path
    );
    if (!inspected) {
      violations.push(`required artifact ${artifact.id} lacks check-linked artifactContent evidence`);
    }
  }
}

function groupBy(items, field) {
  const groups = new Map();
  for (const item of items) {
    const group = groups.get(item[field]) || [];
    group.push(item);
    groups.set(item[field], group);
  }
  return groups;
}

function validateEvidenceRequirements(criterion, check, result, violations) {
  const evidenceById = indexById(result.evidence);
  const evidence = check.evidenceIds.map((id) => evidenceById.get(id)).filter(Boolean);
  for (const requirement of criterion.evidenceRequirements) {
    const count = evidence.filter((item) => item.kind === requirement.kind).length;
    if (count < requirement.minimumCount) {
      violations.push(
        `check ${check.id} lacks ${requirement.minimumCount} ${requirement.kind} evidence item(s)`
      );
    }
  }
}

function validateSignatures(assignment, result, violations) {
  const signaturesById = indexById(result.failureSignatures);
  const sourceByKey = new Map([
    ...result.findings.map((item) => [`finding:${item.id}`, item]),
    ...result.errors.map((item) => [`error:${item.id}`, item])
  ]);
  const values = result.failureSignatures.map((item) => item.value);
  addDuplicateViolations(violations, "failureSignatures", result.failureSignatures, "value");
  if (!sameValue(values, [...values].sort())) {
    violations.push("failureSignatures are not sorted lexicographically by value");
  }
  for (const signature of result.failureSignatures) {
    validateSignature(signature, sourceByKey, assignment, result, violations);
  }
  validateSourceSignatures(result.findings, "finding", signaturesById, violations);
  validateSourceSignatures(result.errors, "error", signaturesById, violations);
  const referencedIds = new Set([
    ...result.findings.flatMap((item) => item.failureSignatureIds),
    ...result.errors.flatMap((item) => item.failureSignatureIds)
  ]);
  for (const signature of result.failureSignatures) {
    if (!referencedIds.has(signature.id)) {
      violations.push(`failure signature ${signature.id} is not referenced by its source`);
    }
  }
}

function validateSignature(signature, sourceByKey, assignment, result, violations) {
  let expectedValue;
  try {
    expectedValue = computeFailureSignature(signature.basis);
  } catch {
    violations.push(`failure signature ${signature.id} basis is not valid RFC 8785 JSON`);
  }
  if (expectedValue && signature.value !== expectedValue) {
    violations.push(`failure signature ${signature.id} does not match its canonical basis`);
  }
  const sourceKey = `${signature.basis.sourceType}:${signature.basis.sourceId}`;
  const source = sourceByKey.get(sourceKey);
  if (!source) {
    violations.push(`failure signature ${signature.id} references unknown source ${sourceKey}`);
    return;
  }
  if (source.code !== signature.basis.code) {
    violations.push(`failure signature ${signature.id} code does not match its source`);
  }
  const expectedCategory =
    signature.basis.sourceType === "finding"
      ? "candidate"
      : PROTOCOL_ERROR_STAGES.has(source.stage)
        ? "protocol"
        : "infrastructure";
  if (signature.basis.category !== expectedCategory) {
    violations.push(`failure signature ${signature.id} has the wrong source category`);
  }
  validateSignatureContext(signature, source, assignment, result, violations);
}

function validateSignatureContext(signature, source, assignment, result, violations) {
  const evidenceById = indexById(result.evidence);
  const sourceEvidence = source.evidenceIds
    .map((evidenceId) => evidenceById.get(evidenceId))
    .filter(Boolean);
  const commandIds = new Set(
    sourceEvidence
      .filter((evidence) => evidence.source.type === "command")
      .map((evidence) => evidence.source.reference)
  );
  if (signature.basis.sourceType === "error" && source.commandResultId) {
    const commandResult = result.commandResults.find(
      (item) => item.id === source.commandResultId
    );
    if (commandResult) {
      commandIds.add(commandResult.commandId);
    }
  }
  const sortedCommandIds = [...commandIds].sort();
  const criterionIds =
    signature.basis.sourceType === "finding"
      ? [...source.criterionIds].sort()
      : [
          ...new Set(
            assignment.approvedValidationCommands
              .filter((command) => commandIds.has(command.id))
              .flatMap((command) => command.criterionIds)
          )
        ].sort();
  const artifactPaths =
    signature.basis.sourceType === "finding"
      ? [source.location.path]
      : [
          ...new Set(
            sourceEvidence
              .filter(
                (evidence) =>
                  evidence.source.type === "artifact" && evidence.artifactPath
              )
              .map((evidence) => evidence.artifactPath)
          )
        ].sort();
  const expectedContext = {
    criterionIds,
    commandIds: sortedCommandIds,
    artifactPaths
  };
  if (!sameValue(signature.basis.context, expectedContext)) {
    violations.push(
      `failure signature ${signature.id} context does not match its stable source-derived context`
    );
  }
}

function validateSourceSignatures(sources, sourceType, signaturesById, violations) {
  for (const source of sources) {
    if (sourceType === "finding" && !source.blocksAcceptance) {
      continue;
    }
    if (source.failureSignatureIds.length === 0) {
      violations.push(`${sourceType} ${source.id} has no failure signature`);
    }
    for (const signatureId of source.failureSignatureIds) {
      const signature = signaturesById.get(signatureId);
      if (
        signature &&
        (signature.basis.sourceType !== sourceType || signature.basis.sourceId !== source.id)
      ) {
        violations.push(`${sourceType} ${source.id} references a signature for another source`);
      }
    }
  }
}

function validateOutcome(assignment, result, violations) {
  if (result.outcome === "pass") {
    const allPassed = result.executedChecks.every((check) => check.status === "passed");
    const cleanResult =
      result.findings.length === 0 &&
      result.errors.length === 0 &&
      result.failureSignatures.length === 0;
    if (!allPassed || !cleanResult) {
      violations.push("pass result contains a non-passing check, finding, error, or signature");
    }
  }
  if (result.outcome === "fail") {
    const requiredCriterionIds = new Set(
      assignment.acceptanceCriteria.filter((item) => item.required).map((item) => item.id)
    );
    for (const finding of result.findings.filter((item) => item.blocksAcceptance)) {
      if (!findingHasFailedCheckSupport(result, finding, requiredCriterionIds)) {
        violations.push(
          `blocking finding ${finding.id} is not supported by a failed required check`
        );
      }
    }
    const failedCriterionIds = new Set(
      result.executedChecks
        .filter((check) => check.status === "failed" && requiredCriterionIds.has(check.criterionId))
        .map((check) => check.criterionId)
    );
    const criteriaWithoutFindings = [...failedCriterionIds].filter(
      (criterionId) => !hasBlockingFindingForCriterion(result, criterionId)
    );
    for (const criterionId of criteriaWithoutFindings) {
      violations.push(`failed criterion ${criterionId} lacks a supported blocking finding`);
    }
    if (
      failedCriterionIds.size === 0 ||
      criteriaWithoutFindings.length > 0 ||
      result.errors.length > 0
    ) {
      violations.push("fail result lacks a failed check or blocking finding, or contains an error");
    }
  }
  if (result.outcome === "error" && (result.errors.length === 0 || result.findings.length > 0)) {
    violations.push("error result must contain errors and withhold candidate findings");
  }
}

function findingHasFailedCheckSupport(result, finding, requiredCriterionIds) {
  const supportsCriterion = (criterionId) => {
    if (!requiredCriterionIds.has(criterionId)) {
      const optionalCheck = result.executedChecks.find(
        (check) => check.criterionId === criterionId && check.status === "failed"
      );
      if (!optionalCheck) {
        return false;
      }
    }
    const checkEvidence = new Set(
      result.executedChecks
        .filter((check) => check.criterionId === criterionId && check.status === "failed")
        .flatMap((check) => check.evidenceIds)
    );
    return finding.evidenceIds.some((evidenceId) => {
      const evidence = result.evidence.find((item) => item.id === evidenceId);
      return checkEvidence.has(evidenceId) && evidence?.kind !== "revisionProof";
    });
  };
  return (
    finding.criterionIds.some((criterionId) => requiredCriterionIds.has(criterionId)) &&
    finding.criterionIds.every(supportsCriterion)
  );
}

function hasBlockingFindingForCriterion(result, criterionId) {
  const checkEvidence = new Set(
    result.executedChecks
      .filter((check) => check.criterionId === criterionId && check.status === "failed")
      .flatMap((check) => check.evidenceIds)
  );
  return result.findings.some(
    (finding) =>
      finding.blocksAcceptance &&
      finding.criterionIds.includes(criterionId) &&
      finding.evidenceIds.some((evidenceId) => {
        const evidence = result.evidence.find((item) => item.id === evidenceId);
        return checkEvidence.has(evidenceId) && evidence?.kind !== "revisionProof";
      })
  );
}

function parseTimestamp(timestamp) {
  const match =
    /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})(?:\.(?<fraction>\d+))?Z$/.exec(
      timestamp
    );
  if (!match) {
    return null;
  }
  const wholeSecond = timestamp.replace(/\.\d+Z$/, "Z");
  const value = Date.parse(wholeSecond);
  if (!Number.isFinite(value)) {
    return null;
  }
  const date = new Date(value);
  const expected = match.groups;
  const componentsMatch =
    date.getUTCFullYear() === Number(expected.year) &&
    date.getUTCMonth() + 1 === Number(expected.month) &&
    date.getUTCDate() === Number(expected.day) &&
    date.getUTCHours() === Number(expected.hour) &&
    date.getUTCMinutes() === Number(expected.minute) &&
    date.getUTCSeconds() === Number(expected.second);
  if (!componentsMatch) {
    return null;
  }
  return {
    epochSecond: BigInt(value) / 1000n,
    fraction: expected.fraction || ""
  };
}

function compareTimestamps(left, right) {
  if (left.epochSecond !== right.epochSecond) {
    return left.epochSecond < right.epochSecond ? -1 : 1;
  }
  const width = Math.max(left.fraction.length, right.fraction.length);
  const leftFraction = left.fraction.padEnd(width, "0");
  const rightFraction = right.fraction.padEnd(width, "0");
  if (leftFraction === rightFraction) {
    return 0;
  }
  return leftFraction < rightFraction ? -1 : 1;
}

function validateTimestamps(result, violations) {
  const startedAt = parseTimestamp(result.startedAt);
  const completedAt = parseTimestamp(result.completedAt);
  if (startedAt === null || completedAt === null) {
    violations.push("result contains an invalid start or completion timestamp");
    return;
  }
  if (compareTimestamps(startedAt, completedAt) > 0) {
    violations.push("result completedAt is earlier than startedAt");
  }
  for (const evidence of result.evidence) {
    const capturedAt = parseTimestamp(evidence.capturedAt);
    if (
      capturedAt === null ||
      compareTimestamps(capturedAt, startedAt) < 0 ||
      compareTimestamps(capturedAt, completedAt) > 0
    ) {
      violations.push(`evidence ${evidence.id} has an invalid or out-of-run capturedAt`);
    }
  }
}

function validateIndependentValidatorPair(assignment, result) {
  const violations = [];
  validateBinding(assignment, result, violations);
  validateIndependence(assignment, result, violations);
  validateUniqueIds(assignment, result, violations);
  validateAssignmentReferences(assignment, violations);
  validateResultReferences(assignment, result, violations);
  validateCommandAuthorization(assignment, result, violations);
  validateRevisionForVerdict(assignment, result, violations);
  validateRequiredCoverage(assignment, result, violations);
  validateSignatures(assignment, result, violations);
  validateOutcome(assignment, result, violations);
  validateTimestamps(result, violations);
  return {
    valid: violations.length === 0,
    violations
  };
}

module.exports = {
  canonicalFailureSignatureInput,
  canonicalJson,
  computeAssignmentDigest,
  computeFailureSignature,
  validateIndependentValidatorPair
};
