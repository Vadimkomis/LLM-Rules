const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Ajv2020 = require("ajv/dist/2020");
const {
  canonicalJson,
  computeAssignmentDigest,
  computeEvidenceDigest,
  computeFailureSignature,
  createRevisionEvidenceExcerpt,
  validateIndependentValidatorPair
} = require("../src/independent-validator-contracts");

const contractRoot = path.resolve(
  __dirname,
  "..",
  "contracts",
  "independent-validator",
  "v1"
);
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
    assignment: ajv.compile(
      readJson(path.join(contractRoot, "assignment.schema.json"))
    ),
    result: ajv.compile(readJson(path.join(contractRoot, "result.schema.json")))
  };
}

function assertSchemaValid(validate, value) {
  assert.equal(validate(value), true, JSON.stringify(validate.errors, null, 2));
}

function assertSchemaInvalid(validate, value) {
  assert.equal(validate(value), false);
}

function assertPairValid(assignmentDocument, resultDocument) {
  const schemas = compileSchemas();
  assertSchemaValid(schemas.assignment, assignmentDocument);
  assertSchemaValid(schemas.result, resultDocument);
  assert.deepEqual(validateIndependentValidatorPair(assignmentDocument, resultDocument), {
    valid: true,
    violations: []
  });
}

function assertSemanticInvalid(
  assignmentDocument,
  resultDocument,
  expectedViolation
) {
  const schemas = compileSchemas();
  assertSchemaValid(schemas.assignment, assignmentDocument);
  assertSchemaValid(schemas.result, resultDocument);

  const validation = validateIndependentValidatorPair(
    assignmentDocument,
    resultDocument
  );
  assert.equal(validation.valid, false);
  assert.match(validation.violations.join("\n"), expectedViolation);
}

function bindResult(assignmentDocument, resultDocument) {
  resultDocument.assignmentId = assignmentDocument.assignmentId;
  resultDocument.assignmentDigest = computeAssignmentDigest(assignmentDocument);
  return resultDocument;
}

function updateEvidenceExcerpt(evidence, excerpt) {
  evidence.excerpt = excerpt;
  evidence.digest = computeEvidenceDigest(excerpt);
}

function updateRevisionEvidence(assignmentDocument, resultDocument) {
  const evidence = resultDocument.evidence.find(
    (item) => item.id === "E-REVISION"
  );
  updateEvidenceExcerpt(
    evidence,
    createRevisionEvidenceExcerpt(assignmentDocument, resultDocument)
  );
}

const assignment = readJson(path.join(exampleRoot, "assignment.json"));
const results = {
  pass: readJson(path.join(exampleRoot, "pass-result.json")),
  fail: readJson(path.join(exampleRoot, "fail-result.json")),
  error: readJson(path.join(exampleRoot, "infrastructure-error-result.json"))
};
const otherRevision = {
  vcs: "git",
  algorithm: "sha1",
  commit: "2222222222222222222222222222222222222222"
};

test("schemas compile in strict JSON Schema 2020-12 mode", () => {
  assert.doesNotThrow(() => compileSchemas());
});

test("schemas accept the published assignment and pass, fail, and error examples", () => {
  const schemas = compileSchemas();

  assertSchemaValid(schemas.assignment, assignment);
  for (const result of Object.values(results)) {
    assertSchemaValid(schemas.result, result);
  }
});

test("semantic validation accepts all three published assignment/result pairs", () => {
  for (const result of Object.values(results)) {
    assertPairValid(assignment, result);
  }
});

test("schemas pin every v1 document to contractVersion 1.0.0", () => {
  const schemas = compileSchemas();
  const futureAssignment = clone(assignment);
  const futureResult = clone(results.pass);
  futureAssignment.contractVersion = "1.1.0";
  futureResult.contractVersion = "1.1.0";

  assertSchemaInvalid(schemas.assignment, futureAssignment);
  assertSchemaInvalid(schemas.result, futureResult);
});

test("assignment schema accepts a normal repository root and rejects legacy environment fields", () => {
  const schemas = compileSchemas();
  const directContext = clone(assignment);
  directContext.repositoryContext.repositoryRoot = ".";
  assertSchemaValid(schemas.assignment, directContext);

  const legacyDocuments = [
    (() => {
      const document = clone(assignment);
      document.repositoryContext.validationWorkspace = "/tmp/validator-worktree";
      return document;
    })(),
    (() => {
      const document = clone(assignment);
      document.constraints.networkPolicy = "forbidden";
      return document;
    })(),
    (() => {
      const document = clone(assignment);
      document.repositoryContext.disposable = true;
      return document;
    })()
  ];
  for (const document of legacyDocuments) {
    assertSchemaInvalid(schemas.assignment, document);
  }

  const legacyResult = clone(results.pass);
  legacyResult.revisionVerification.method = "disposable-worktree";
  assertSchemaInvalid(schemas.result, legacyResult);
});

test("semantic validation permits an observation-only pass with no commands or artifact paths", () => {
  const observationAssignment = clone(assignment);
  observationAssignment.assignmentId = "IVA-OBSERVATION-ONLY";
  observationAssignment.acceptanceCriteria = [
    {
      id: "AC-OBSERVATION",
      description: "Read-only inspection confirms the requested behavior.",
      evidenceRequirements: {
        observation: "A recorded observation of the supplied candidate."
      }
    }
  ];
  observationAssignment.approvedValidationCommands = [];
  observationAssignment.relevantArtifactPaths = [];

  const observationResult = clone(results.pass);
  observationResult.summary = "The observation-only criterion passed.";
  observationResult.executedChecks = [
    {
      id: "CHK-OBSERVATION",
      criterionId: "AC-OBSERVATION",
      status: "pass",
      summary: "Read-only inspection confirmed the criterion.",
      commandResultIds: [],
      evidenceIds: ["E-OBSERVATION"]
    }
  ];
  observationResult.commandResults = [];
  observationResult.evidence = [
    clone(results.pass.evidence[0]),
    {
      id: "E-OBSERVATION",
      kind: "observation",
      summary: "The supplied behavior was observed directly.",
      digest: computeEvidenceDigest("The supplied behavior is present."),
      excerpt: "The supplied behavior is present."
    }
  ];
  bindResult(observationAssignment, observationResult);

  assertPairValid(observationAssignment, observationResult);
});

test("assignment schema requires full immutable Git hashes", () => {
  const schemas = compileSchemas();
  const sha256Assignment = clone(assignment);
  sha256Assignment.candidateRevision.algorithm = "sha256";
  sha256Assignment.candidateRevision.commit = "a".repeat(64);
  assertSchemaValid(schemas.assignment, sha256Assignment);

  for (const commit of ["main", "abc123", "a".repeat(39), "A".repeat(40)]) {
    const document = clone(assignment);
    document.candidateRevision.commit = commit;
    assertSchemaInvalid(schemas.assignment, document);
  }

  const wrongLengthForAlgorithm = clone(sha256Assignment);
  wrongLengthForAlgorithm.candidateRevision.commit = "a".repeat(40);
  assertSchemaInvalid(schemas.assignment, wrongLengthForAlgorithm);
});

test("schemas reject unsafe artifact paths and unknown fields", () => {
  const schemas = compileSchemas();
  for (const unsafePath of [
    "../outside",
    "contracts/../../outside",
    "/absolute/path",
    "C:/absolute/path",
    "D:drive-relative",
    "contracts\\windows-path"
  ]) {
    const document = clone(assignment);
    document.relevantArtifactPaths[0].path = unsafePath;
    assertSchemaInvalid(schemas.assignment, document);
  }

  const unknownAssignmentField = clone(assignment);
  unknownAssignmentField.unexpected = true;
  assertSchemaInvalid(schemas.assignment, unknownAssignmentField);

  const unknownResultField = clone(results.pass);
  unknownResultField.unexpected = true;
  assertSchemaInvalid(schemas.result, unknownResultField);
});

test("result schema requires the validator's non-implementation and independence attestations", () => {
  const { result: validate } = compileSchemas();
  const implementerResult = clone(results.pass);
  implementerResult.validatorMetadata.implementedCandidate = true;
  const unattestedResult = clone(results.pass);
  unattestedResult.validatorMetadata.independenceAttested = false;

  assertSchemaInvalid(validate, implementerResult);
  assertSchemaInvalid(validate, unattestedResult);
});

test("semantic binding uses the canonical assignment digest", () => {
  const changedAssignment = clone(assignment);
  changedAssignment.constraints.additionalConstraints.push(
    "Inspect one additional behavior."
  );

  assert.equal(results.pass.assignmentDigest, computeAssignmentDigest(assignment));
  assertSemanticInvalid(
    changedAssignment,
    results.pass,
    /assignmentDigest does not match/
  );
});

test("canonical JSON is object-order stable and handles Unicode scalar values", () => {
  const reorderedAssignment = {
    relevantArtifactPaths: assignment.relevantArtifactPaths,
    constraints: assignment.constraints,
    approvedValidationCommands: assignment.approvedValidationCommands,
    acceptanceCriteria: assignment.acceptanceCriteria,
    repositoryContext: {
      contextNotes: assignment.repositoryContext.contextNotes,
      repositoryRoot: assignment.repositoryContext.repositoryRoot
    },
    candidateRevision: {
      commit: assignment.candidateRevision.commit,
      algorithm: assignment.candidateRevision.algorithm,
      vcs: assignment.candidateRevision.vcs
    },
    assignmentId: assignment.assignmentId,
    contractVersion: assignment.contractVersion
  };

  assert.equal(
    computeAssignmentDigest(reorderedAssignment),
    computeAssignmentDigest(assignment)
  );
  assert.equal(
    canonicalJson({ z: "😀", a: "é" }),
    '{"a":"é","z":"😀"}'
  );
  assert.throws(() => canonicalJson({ invalid: "\ud800" }), /lone Unicode surrogate/);
});

test("revision mismatch, dirty state, and post-check drift invalidate conclusive outcomes", () => {
  const cases = [
    {
      name: "inspected revision mismatch",
      mutate(result) {
        result.inspectedRevision = clone(otherRevision);
        result.revisionVerification.status = "mismatch";
      },
      violation: /did not inspect the assigned revision/
    },
    {
      name: "dirty candidate",
      mutate(result) {
        result.revisionVerification.cleanAfterChecks = false;
        result.revisionVerification.status = "mismatch";
      },
      violation: /clean post-check candidate/
    },
    {
      name: "post-check revision drift",
      mutate(result) {
        result.revisionVerification.postCheckRevision = clone(otherRevision);
        result.revisionVerification.status = "mismatch";
      },
      violation: /post-check revision drift/
    }
  ];

  for (const scenario of cases) {
    const result = clone(results.pass);
    scenario.mutate(result);
    assertSemanticInvalid(assignment, result, scenario.violation);
  }
});

test("revision mismatch, dirty state, and post-check drift are reportable as errors", () => {
  const mutations = [
    (result) => {
      result.inspectedRevision = clone(otherRevision);
      result.revisionVerification.status = "mismatch";
    },
    (result) => {
      result.revisionVerification.cleanAfterChecks = false;
      result.revisionVerification.status = "mismatch";
    },
    (result) => {
      result.revisionVerification.postCheckRevision = clone(otherRevision);
      result.revisionVerification.status = "mismatch";
    }
  ];

  for (const mutate of mutations) {
    const result = clone(results.error);
    mutate(result);
    updateRevisionEvidence(assignment, result);
    assertPairValid(assignment, result);
  }
});

test("semantic validation permits a verified revision with an infrastructure error", () => {
  assert.equal(results.error.revisionVerification.status, "verified");
  assertPairValid(assignment, results.error);
});

test("semantic validation enforces exact approved argv, working directory, exit, and timeout", () => {
  const cases = [
    {
      mutate(result) {
        result.commandResults[0].argv.push("--update");
      },
      violation: /changed approved argv/
    },
    {
      mutate(result) {
        result.commandResults[0].workingDirectory = "src";
      },
      violation: /changed approved workingDirectory/
    },
    {
      mutate(result) {
        result.commandResults[0].exitCode = 1;
      },
      violation: /passed with an unexpected exit code/
    },
    {
      mutate(result) {
        result.commandResults[0].durationMs = 120001;
      },
      violation: /exceeded its timeout/
    }
  ];

  for (const scenario of cases) {
    const result = clone(results.pass);
    scenario.mutate(result);
    assertSemanticInvalid(assignment, result, scenario.violation);
  }

  const missingExitCode = clone(results.fail);
  missingExitCode.commandResults[1].exitCode = null;
  const schemas = compileSchemas();
  assertSchemaInvalid(schemas.result, missingExitCode);
  const semanticValidation = validateIndependentValidatorPair(
    assignment,
    missingExitCode
  );
  assert.match(
    semanticValidation.violations.join("\n"),
    /requires an integer exit code/
  );
});

test("semantic validation requires conclusive criterion and approved-command coverage", () => {
  const result = clone(results.pass);
  result.executedChecks = result.executedChecks.slice(0, 1);

  assertSemanticInvalid(assignment, result, /criterion AC-SEMANTICS lacks one conclusive check/);

  const assignmentWithUnknownCriterion = clone(assignment);
  assignmentWithUnknownCriterion.approvedValidationCommands[0].criterionIds = [
    "AC-NOT-ASSIGNED"
  ];
  const reboundResult = bindResult(
    assignmentWithUnknownCriterion,
    clone(results.pass)
  );
  assertSemanticInvalid(
    assignmentWithUnknownCriterion,
    reboundResult,
    /references unknown ID AC-NOT-ASSIGNED/
  );
});

test("semantic validation enforces evidence requirements and evidence references", () => {
  const observationAssignment = clone(assignment);
  observationAssignment.acceptanceCriteria[0].evidenceRequirements = {
    observation: "Direct observation is required."
  };
  const resultWithoutRequiredKind = bindResult(
    observationAssignment,
    clone(results.pass)
  );
  assertSemanticInvalid(
    observationAssignment,
    resultWithoutRequiredKind,
    /lacks observation evidence/
  );

  const resultWithDanglingReference = clone(results.pass);
  resultWithDanglingReference.executedChecks[0].evidenceIds = ["E-NOT-PRESENT"];
  assertSemanticInvalid(
    assignment,
    resultWithDanglingReference,
    /references unknown ID E-NOT-PRESENT/
  );
});

test("command evidence remains linked to its assigned command and criterion", () => {
  const wrongCriterion = clone(results.pass);
  wrongCriterion.executedChecks[0].commandResultIds = ["CR-SEMANTIC-TEST"];
  wrongCriterion.executedChecks[0].evidenceIds = ["E-SEMANTIC-PASS"];
  assertSemanticInvalid(
    assignment,
    wrongCriterion,
    /not assigned to its criterion/
  );

  const missingResultLink = clone(results.pass);
  missingResultLink.executedChecks[0].commandResultIds = [];
  assertSemanticInvalid(
    assignment,
    missingResultLink,
    /uses command evidence without its command result/
  );

  const unrelatedErrorEvidence = clone(results.error);
  unrelatedErrorEvidence.errors[0].evidenceIds = ["E-REVISION"];
  assertSemanticInvalid(
    assignment,
    unrelatedErrorEvidence,
    /shares no evidence with its command result/
  );

  const missingProducingResultLink = clone(results.fail);
  missingProducingResultLink.evidence[3].commandId = "CMD-SCHEMA-TEST";
  assertSemanticInvalid(
    assignment,
    missingProducingResultLink,
    /evidence E-CHECKER-SOURCE lacks its producing command result/
  );
});

test("finding schema requires severity and supporting evidence", () => {
  const { result: validate } = compileSchemas();
  const missingSeverity = clone(results.fail);
  delete missingSeverity.findings[0].severity;
  const unsupported = clone(results.fail);
  unsupported.findings[0].evidenceIds = [];

  assertSchemaInvalid(validate, missingSeverity);
  assertSchemaInvalid(validate, unsupported);
});

test("semantic validation links every finding to failed-check evidence", () => {
  const result = clone(results.fail);
  const finding = result.findings[0];
  const signature = result.failureSignatures[0];
  finding.evidenceIds = ["E-REVISION"];
  signature.basis.context = {
    criterionIds: ["AC-SEMANTICS"],
    commandIds: [],
    artifactPaths: ["src/independent-validator-contracts.js"]
  };
  signature.value = computeFailureSignature(signature.basis);

  assertSemanticInvalid(
    assignment,
    result,
    /finding F-SEMANTIC-SIGNATURE lacks failed-check supporting evidence/
  );
});

test("error records take precedence over fail and pass outcomes", () => {
  for (const outcome of ["pass", "fail"]) {
    const result = clone(results.error);
    result.outcome = outcome;
    assertSemanticInvalid(
      assignment,
      result,
      /outcome precedence requires error/
    );
  }
});

test("every error command result requires a linked validation error", () => {
  const result = clone(results.error);
  delete result.errors[0].commandResultId;

  assertSemanticInvalid(
    assignment,
    result,
    /error command result CR-SCHEMA-TEST lacks a linked validation error/
  );
});

test("semantic validation checks every evidence excerpt digest", () => {
  const result = clone(results.pass);
  result.evidence[1].excerpt += "\nmutated without updating the digest";

  assertSemanticInvalid(
    assignment,
    result,
    /evidence E-SCHEMA-PASS digest does not match its excerpt/
  );

  const contradictoryRevisionProof = clone(results.pass);
  updateEvidenceExcerpt(
    contradictoryRevisionProof.evidence[0],
    "assigned=1111111111111111111111111111111111111111 inspected=2222222222222222222222222222222222222222 post_check=2222222222222222222222222222222222222222 clean_before=false clean_after=false"
  );
  assertSemanticInvalid(
    assignment,
    contradictoryRevisionProof,
    /revisionProof evidence matching its structured state/
  );
});

test("failure signatures ignore source IDs but remain sensitive to stable context", () => {
  const basis = clone(results.fail.failureSignatures[0].basis);
  const renamedSource = clone(basis);
  renamedSource.sourceId = "F-DIFFERENT-RUN-LOCAL-ID";
  const reorderedContext = clone(basis);
  reorderedContext.context = {
    artifactPaths: basis.context.artifactPaths,
    commandIds: basis.context.commandIds,
    criterionIds: basis.context.criterionIds
  };
  const changedContext = clone(basis);
  changedContext.context.artifactPaths = [];

  assert.equal(
    computeFailureSignature(renamedSource),
    computeFailureSignature(basis)
  );
  assert.equal(
    computeFailureSignature(reorderedContext),
    computeFailureSignature(basis)
  );
  assert.notEqual(
    computeFailureSignature(changedContext),
    computeFailureSignature(basis)
  );
});

test("semantic validation rejects nondeterministic, dangling, and unreferenced signatures", () => {
  const nondeterministic = clone(results.fail);
  nondeterministic.failureSignatures[0].value = `sha256:${"0".repeat(64)}`;
  assertSemanticInvalid(
    assignment,
    nondeterministic,
    /value is not deterministic/
  );

  const danglingSource = clone(results.fail);
  danglingSource.failureSignatures[0].basis.sourceId = "F-NOT-PRESENT";
  assertSemanticInvalid(
    assignment,
    danglingSource,
    /references an unknown source/
  );

  const unreferenced = clone(results.fail);
  const extraSignature = clone(unreferenced.failureSignatures[0]);
  extraSignature.id = "SIG-UNREFERENCED";
  unreferenced.failureSignatures.push(extraSignature);
  assertSemanticInvalid(
    assignment,
    unreferenced,
    /failure signature SIG-UNREFERENCED is not referenced/
  );
});
