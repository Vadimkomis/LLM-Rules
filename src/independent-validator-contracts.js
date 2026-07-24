const { createHash } = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const members = Object.keys(value)
      .sort()
      .map((key) => {
        assertUnicodeScalarSequence(key);
        return `${JSON.stringify(key)}:${canonicalJson(value[key])}`;
      });
    return `{${members.join(",")}}`;
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

function sha256(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function computeAssignmentDigest(assignment) {
  return sha256(canonicalJson(assignment));
}

function computeEvidenceDigest(excerpt) {
  return sha256(excerpt);
}

function createRevisionEvidenceExcerpt(assignment, result) {
  const commit = (revision) => revision?.commit ?? "null";
  const flag = (value) => (value === null ? "null" : String(value));
  return [
    `assigned=${assignment.candidateRevision.commit}`,
    `inspected=${commit(result.inspectedRevision)}`,
    `post_check=${commit(result.revisionVerification.postCheckRevision)}`,
    `clean_before=${flag(result.revisionVerification.cleanBeforeChecks)}`,
    `clean_after=${flag(result.revisionVerification.cleanAfterChecks)}`
  ].join(" ");
}

function canonicalFailureSignatureInput(basis) {
  return canonicalJson({
    namespace: basis.namespace,
    sourceType: basis.sourceType,
    code: basis.code,
    context: basis.context
  });
}

function computeFailureSignature(basis) {
  return sha256(canonicalFailureSignatureInput(basis));
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function sameValue(left, right) {
  return isDeepStrictEqual(left, right);
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function addDuplicates(violations, label, values) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      violations.push(`${label} contains duplicate ${value}`);
    }
    seen.add(value);
  }
}

function addUnknownReferences(violations, label, references, validIds) {
  for (const reference of references) {
    if (!validIds.has(reference)) {
      violations.push(`${label} references unknown ID ${reference}`);
    }
  }
}

function validateAssignment(assignment, violations) {
  const criterionIds = assignment.acceptanceCriteria.map((item) => item.id);
  const commandIds = assignment.approvedValidationCommands.map((item) => item.id);
  const artifactPaths = assignment.relevantArtifactPaths.map((item) => item.path);
  const knownCriteria = new Set(criterionIds);

  addDuplicates(violations, "acceptanceCriteria", criterionIds);
  addDuplicates(violations, "approvedValidationCommands", commandIds);
  addDuplicates(violations, "relevantArtifactPaths", artifactPaths);

  for (const command of assignment.approvedValidationCommands) {
    addUnknownReferences(
      violations,
      `approved command ${command.id}`,
      command.criterionIds,
      knownCriteria
    );
  }
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
}

function validateIndependence(result, violations) {
  if (
    result.validatorMetadata.implementedCandidate !== false ||
    result.validatorMetadata.independenceAttested !== true
  ) {
    violations.push("validator independence attestation is invalid");
  }
}

function validateUniqueResultIds(result, violations) {
  for (const [label, items] of [
    ["executedChecks", result.executedChecks],
    ["commandResults", result.commandResults],
    ["findings", result.findings],
    ["evidence", result.evidence],
    ["errors", result.errors],
    ["failureSignatures", result.failureSignatures]
  ]) {
    addDuplicates(
      violations,
      label,
      items.map((item) => item.id)
    );
  }
  addDuplicates(
    violations,
    "commandResults command IDs",
    result.commandResults.map((item) => item.commandId)
  );
}

function validateRevision(assignment, result, evidenceById, violations) {
  const verification = result.revisionVerification;
  const inspected = result.inspectedRevision;
  const inspectedMatches = sameValue(inspected, assignment.candidateRevision);
  const fullyUnavailable =
    inspected === null &&
    verification.postCheckRevision === null &&
    verification.cleanBeforeChecks === null &&
    verification.cleanAfterChecks === null;
  const fullyVerified =
    inspectedMatches &&
    sameValue(verification.postCheckRevision, assignment.candidateRevision) &&
    verification.cleanBeforeChecks === true &&
    verification.cleanAfterChecks === true;
  const expectedStatus = fullyUnavailable
    ? "unavailable"
    : fullyVerified
      ? "verified"
      : "mismatch";

  if (verification.status !== expectedStatus) {
    violations.push("revisionVerification.status contradicts inspectedRevision");
  }

  const revisionEvidence = verification.evidenceIds
    .map((id) => evidenceById.get(id))
    .filter((item) => item?.kind === "revisionProof");
  const identityReported =
    verification.status !== "unavailable" ||
    verification.postCheckRevision !== null ||
    verification.cleanBeforeChecks !== null ||
    verification.cleanAfterChecks !== null;
  if (
    identityReported &&
    !revisionEvidence.some(
      (item) => item.excerpt === createRevisionEvidenceExcerpt(assignment, result)
    )
  ) {
    violations.push(
      "revision verification lacks revisionProof evidence matching its structured state"
    );
  }

  if (result.outcome === "error") {
    return;
  }
  if (!inspectedMatches || verification.status !== "verified") {
    violations.push(`${result.outcome} result did not inspect the assigned revision`);
  }
  if (!sameValue(verification.postCheckRevision, assignment.candidateRevision)) {
    violations.push(`${result.outcome} result has post-check revision drift`);
  }
  if (verification.cleanBeforeChecks !== true) {
    violations.push(`${result.outcome} result requires a clean pre-check candidate`);
  }
  if (verification.cleanAfterChecks !== true) {
    violations.push(`${result.outcome} result requires a clean post-check candidate`);
  }
}

function validateEvidence(assignment, result, violations) {
  const approvedCommands = new Set(
    assignment.approvedValidationCommands.map((item) => item.id)
  );
  const assignedArtifacts = new Set(
    assignment.relevantArtifactPaths.map((item) => item.path)
  );

  for (const evidence of result.evidence) {
    if (evidence.digest !== computeEvidenceDigest(evidence.excerpt)) {
      violations.push(`evidence ${evidence.id} digest does not match its excerpt`);
    }
    if (evidence.kind === "commandOutput" && !evidence.commandId) {
      violations.push(`command evidence ${evidence.id} lacks commandId`);
    }
    if (evidence.commandId && !approvedCommands.has(evidence.commandId)) {
      violations.push(`evidence ${evidence.id} references an unapproved command`);
    }
    if (
      evidence.commandId &&
      !result.commandResults.some(
        (item) =>
          item.commandId === evidence.commandId &&
          item.evidenceIds.includes(evidence.id)
      )
    ) {
      violations.push(
        `evidence ${evidence.id} lacks its producing command result`
      );
    }
    if (evidence.kind === "artifactContent" && !evidence.artifactPath) {
      violations.push(`artifact evidence ${evidence.id} lacks artifactPath`);
    }
    if (evidence.artifactPath && !assignedArtifacts.has(evidence.artifactPath)) {
      violations.push(`evidence ${evidence.id} references an unassigned artifact path`);
    }
  }
}

function validateReferences(assignment, result, violations) {
  const criterionIds = new Set(
    assignment.acceptanceCriteria.map((item) => item.id)
  );
  const commandResultsById = indexById(result.commandResults);
  const evidenceById = indexById(result.evidence);
  const evidenceIds = new Set(evidenceById.keys());
  const commandResultIds = new Set(commandResultsById.keys());
  const signatureIds = new Set(
    result.failureSignatures.map((item) => item.id)
  );
  const approvedById = indexById(assignment.approvedValidationCommands);

  addUnknownReferences(
    violations,
    "revision verification",
    result.revisionVerification.evidenceIds,
    evidenceIds
  );

  for (const check of result.executedChecks) {
    addUnknownReferences(
      violations,
      `check ${check.id}`,
      [check.criterionId],
      criterionIds
    );
    addUnknownReferences(
      violations,
      `check ${check.id}`,
      check.commandResultIds,
      commandResultIds
    );
    addUnknownReferences(
      violations,
      `check ${check.id}`,
      check.evidenceIds,
      evidenceIds
    );
    for (const commandResultId of check.commandResultIds) {
      const commandResult = commandResultsById.get(commandResultId);
      const approved = approvedById.get(commandResult?.commandId);
      if (approved && !approved.criterionIds.includes(check.criterionId)) {
        violations.push(`check ${check.id} cites a command not assigned to its criterion`);
      }
      if (
        check.status === "pass" &&
        commandResult &&
        commandResult.status !== "pass"
      ) {
        violations.push(`passing check ${check.id} cites a non-passing command`);
      }
      if (
        check.status !== "error" &&
        commandResult?.status === "error"
      ) {
        violations.push(`conclusive check ${check.id} cites an error command`);
      }
      if (
        commandResult &&
        !commandResult.evidenceIds.some((id) => {
          const evidence = evidenceById.get(id);
          return (
            check.evidenceIds.includes(id) &&
            evidence?.kind === "commandOutput" &&
            evidence.commandId === commandResult.commandId
          );
        })
      ) {
        violations.push(
          `check ${check.id} shares no evidence with command result ${commandResultId}`
        );
      }
    }
    for (const evidenceId of check.evidenceIds) {
      const evidence = evidenceById.get(evidenceId);
      if (!evidence?.commandId) {
        continue;
      }
      const approved = approvedById.get(evidence.commandId);
      if (approved && !approved.criterionIds.includes(check.criterionId)) {
        violations.push(
          `check ${check.id} uses command evidence not assigned to its criterion`
        );
      }
      const commandResult = result.commandResults.find(
        (item) => item.commandId === evidence.commandId
      );
      if (commandResult && !check.commandResultIds.includes(commandResult.id)) {
        violations.push(
          `check ${check.id} uses command evidence without its command result`
        );
      }
    }
  }

  for (const commandResult of result.commandResults) {
    addUnknownReferences(
      violations,
      `command result ${commandResult.id}`,
      commandResult.evidenceIds,
      evidenceIds
    );
  }

  for (const finding of result.findings) {
    addUnknownReferences(
      violations,
      `finding ${finding.id}`,
      finding.criterionIds,
      criterionIds
    );
    addUnknownReferences(
      violations,
      `finding ${finding.id}`,
      finding.evidenceIds,
      evidenceIds
    );
    addUnknownReferences(
      violations,
      `finding ${finding.id}`,
      [finding.failureSignatureId],
      signatureIds
    );
  }

  for (const error of result.errors) {
    addUnknownReferences(
      violations,
      `error ${error.id}`,
      error.evidenceIds,
      evidenceIds
    );
    addUnknownReferences(
      violations,
      `error ${error.id}`,
      [error.failureSignatureId],
      signatureIds
    );
    if (error.commandResultId) {
      addUnknownReferences(
        violations,
        `error ${error.id}`,
        [error.commandResultId],
        commandResultIds
      );
      const commandResult = commandResultsById.get(error.commandResultId);
      if (commandResult && commandResult.status !== "error") {
        violations.push(`error ${error.id} cites a non-error command result`);
      }
      if (
        commandResult &&
        !commandResult.evidenceIds.some((id) => {
          const evidence = evidenceById.get(id);
          return (
            error.evidenceIds.includes(id) &&
            evidence?.kind === "commandOutput" &&
            evidence.commandId === commandResult.commandId
          );
        })
      ) {
        violations.push(`error ${error.id} shares no evidence with its command result`);
      }
    }
  }
}

function validateCommands(assignment, result, violations) {
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
      violations.push(
        `command result ${commandResult.id} changed approved workingDirectory`
      );
    }
    if (
      ["pass", "fail"].includes(commandResult.status) &&
      commandResult.durationMs > approved.timeoutMs
    ) {
      violations.push(`command result ${commandResult.id} exceeded its timeout`);
    }
    if (
      ["pass", "fail"].includes(commandResult.status) &&
      !Number.isInteger(commandResult.exitCode)
    ) {
      violations.push(
        `command result ${commandResult.id} requires an integer exit code`
      );
    } else if (commandResult.status === "pass") {
      if (!approved.expectedExitCodes.includes(commandResult.exitCode)) {
        violations.push(
          `command result ${commandResult.id} passed with an unexpected exit code`
        );
      }
    } else if (commandResult.status === "fail") {
      if (approved.expectedExitCodes.includes(commandResult.exitCode)) {
        violations.push(
          `command result ${commandResult.id} failed with an expected exit code`
        );
      }
    } else if (commandResult.exitCode !== null) {
      violations.push(`error command result ${commandResult.id} has an exit code`);
    }

    const hasCommandEvidence = commandResult.evidenceIds
      .map((id) => evidenceById.get(id))
      .some(
        (evidence) =>
          evidence?.kind === "commandOutput" &&
          evidence.commandId === commandResult.commandId
      );
    if (!hasCommandEvidence) {
      violations.push(
        `command result ${commandResult.id} lacks matching commandOutput evidence`
      );
    }
  }

  for (const commandResult of result.commandResults.filter(
    (item) => item.status === "error"
  )) {
    if (
      !result.errors.some(
        (error) => error.commandResultId === commandResult.id
      )
    ) {
      violations.push(
        `error command result ${commandResult.id} lacks a linked validation error`
      );
    }
  }
}

function validateCoverage(assignment, result, violations) {
  if (result.outcome === "error") {
    return;
  }

  const evidenceById = indexById(result.evidence);
  for (const criterion of assignment.acceptanceCriteria) {
    const checks = result.executedChecks.filter(
      (item) => item.criterionId === criterion.id
    );
    if (checks.length !== 1 || !["pass", "fail"].includes(checks[0]?.status)) {
      violations.push(`criterion ${criterion.id} lacks one conclusive check`);
      continue;
    }
    const checkEvidence = checks[0].evidenceIds
      .map((id) => evidenceById.get(id))
      .filter(Boolean);
    for (const kind of Object.keys(criterion.evidenceRequirements)) {
      if (!checkEvidence.some((item) => item.kind === kind)) {
        violations.push(
          `check ${checks[0].id} lacks ${kind} evidence`
        );
      }
    }
  }

  for (const command of assignment.approvedValidationCommands) {
    const results = result.commandResults.filter(
      (item) => item.commandId === command.id
    );
    if (
      results.length !== 1 ||
      !["pass", "fail"].includes(results[0]?.status)
    ) {
      violations.push(`approved command ${command.id} lacks one conclusive result`);
      continue;
    }
    const linkedChecks = result.executedChecks.filter((check) =>
      check.commandResultIds.includes(results[0].id)
    );
    if (linkedChecks.length === 0) {
      violations.push(`command ${command.id} is not linked to an executed check`);
    }
    if (
      results[0].status === "fail" &&
      !linkedChecks.some((check) => check.status === "fail")
    ) {
      violations.push(`failed command ${command.id} lacks a failed check`);
    }
  }
}

function findingSupportsFailedChecks(finding, result) {
  return finding.criterionIds.every((criterionId) => {
    const failedChecks = result.executedChecks.filter(
      (check) => check.criterionId === criterionId && check.status === "fail"
    );
    return failedChecks.some((check) =>
      finding.evidenceIds.some((id) => {
        const evidence = result.evidence.find((item) => item.id === id);
        return check.evidenceIds.includes(id) && evidence?.kind !== "revisionProof";
      })
    );
  });
}

function validateOutcome(result, violations) {
  const hasError =
    result.errors.length > 0 ||
    result.executedChecks.some((item) => item.status === "error") ||
    result.commandResults.some((item) => item.status === "error");
  const hasFailure =
    result.findings.length > 0 ||
    result.executedChecks.some((item) => item.status === "fail") ||
    result.commandResults.some((item) => item.status === "fail");
  const expectedOutcome = hasError ? "error" : hasFailure ? "fail" : "pass";
  if (result.outcome !== expectedOutcome) {
    violations.push(
      `outcome precedence requires ${expectedOutcome}, not ${result.outcome}`
    );
  }

  if (result.outcome === "pass") {
    if (
      result.executedChecks.some((item) => item.status !== "pass") ||
      result.commandResults.some((item) => item.status !== "pass") ||
      result.findings.length > 0 ||
      result.errors.length > 0 ||
      result.failureSignatures.length > 0
    ) {
      violations.push("pass result contains a failure or error record");
    }
  }

  if (result.outcome === "fail") {
    const failedCriterionIds = new Set(
      result.executedChecks
        .filter((item) => item.status === "fail")
        .map((item) => item.criterionId)
    );
    if (
      failedCriterionIds.size === 0 ||
      result.errors.length > 0 ||
      result.findings.length === 0
    ) {
      violations.push("fail result lacks a failed check and finding, or contains an error");
    }
    for (const finding of result.findings) {
      if (!findingSupportsFailedChecks(finding, result)) {
        violations.push(
          `finding ${finding.id} lacks failed-check supporting evidence`
        );
      }
    }
    for (const criterionId of failedCriterionIds) {
      if (
        !result.findings.some(
          (finding) =>
            finding.criterionIds.includes(criterionId) &&
            findingSupportsFailedChecks(finding, result)
        )
      ) {
        violations.push(`failed criterion ${criterionId} lacks a finding`);
      }
    }
  }

  if (
    result.outcome === "error" &&
    (result.errors.length === 0 || result.findings.length > 0)
  ) {
    violations.push("error result must contain errors and withhold findings");
  }
}

function signatureContext(sourceType, source, assignment, result) {
  const evidenceById = indexById(result.evidence);
  const sourceEvidence = source.evidenceIds
    .map((id) => evidenceById.get(id))
    .filter(Boolean);
  const commandIds = sourceEvidence
    .map((item) => item.commandId)
    .filter(Boolean);

  if (sourceType === "error" && source.commandResultId) {
    const commandResult = result.commandResults.find(
      (item) => item.id === source.commandResultId
    );
    if (commandResult) {
      commandIds.push(commandResult.commandId);
    }
  }

  const uniqueCommandIds = sortedUnique(commandIds);
  const criterionIds =
    sourceType === "finding"
      ? sortedUnique(source.criterionIds)
      : sortedUnique(
          assignment.approvedValidationCommands
            .filter((command) => uniqueCommandIds.includes(command.id))
            .flatMap((command) => command.criterionIds)
        );
  const artifactPaths = sourceEvidence
    .map((item) => item.artifactPath)
    .filter(Boolean);
  if (sourceType === "finding" && source.location) {
    artifactPaths.push(source.location.path);
  }

  return {
    criterionIds,
    commandIds: uniqueCommandIds,
    artifactPaths: sortedUnique(artifactPaths)
  };
}

function validateSignatures(assignment, result, violations) {
  const sources = new Map([
    ...result.findings.map((item) => [`finding:${item.id}`, item]),
    ...result.errors.map((item) => [`error:${item.id}`, item])
  ]);
  const referencedSignatureIds = new Set([
    ...result.findings.map((item) => item.failureSignatureId),
    ...result.errors.map((item) => item.failureSignatureId)
  ]);

  for (const signature of result.failureSignatures) {
    const basis = signature.basis;
    const source = sources.get(`${basis.sourceType}:${basis.sourceId}`);
    if (!source) {
      violations.push(
        `failure signature ${signature.id} references an unknown source`
      );
      continue;
    }
    if (basis.code !== source.code) {
      violations.push(`failure signature ${signature.id} code differs from its source`);
    }
    const expectedContext = signatureContext(
      basis.sourceType,
      source,
      assignment,
      result
    );
    if (!sameValue(basis.context, expectedContext)) {
      violations.push(
        `failure signature ${signature.id} context is not source-derived`
      );
    }
    try {
      if (signature.value !== computeFailureSignature(basis)) {
        violations.push(
          `failure signature ${signature.id} value is not deterministic`
        );
      }
    } catch {
      violations.push(
        `failure signature ${signature.id} basis cannot be canonicalized`
      );
    }
    if (!referencedSignatureIds.has(signature.id)) {
      violations.push(`failure signature ${signature.id} is not referenced`);
    }
  }

  const signaturesById = indexById(result.failureSignatures);
  for (const [sourceType, source] of [
    ...result.findings.map((item) => ["finding", item]),
    ...result.errors.map((item) => ["error", item])
  ]) {
    const signature = signaturesById.get(source.failureSignatureId);
    if (
      signature &&
      (signature.basis.sourceType !== sourceType ||
        signature.basis.sourceId !== source.id)
    ) {
      violations.push(
        `${sourceType} ${source.id} references another source's signature`
      );
    }
  }
}

function validateIndependentValidatorPair(assignment, result) {
  const violations = [];
  validateAssignment(assignment, violations);
  validateBinding(assignment, result, violations);
  validateIndependence(result, violations);
  validateUniqueResultIds(result, violations);
  validateEvidence(assignment, result, violations);
  validateReferences(assignment, result, violations);
  validateCommands(assignment, result, violations);
  const evidenceById = indexById(result.evidence);
  validateRevision(assignment, result, evidenceById, violations);
  validateCoverage(assignment, result, violations);
  validateOutcome(result, violations);
  validateSignatures(assignment, result, violations);
  return {
    valid: violations.length === 0,
    violations
  };
}

module.exports = {
  canonicalFailureSignatureInput,
  canonicalJson,
  computeAssignmentDigest,
  computeEvidenceDigest,
  computeFailureSignature,
  createRevisionEvidenceExcerpt,
  validateIndependentValidatorPair
};
