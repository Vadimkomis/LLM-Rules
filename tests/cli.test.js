const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { detectProfilesFromProject, parseArgs, run } = require("../src/cli");

function captureIo() {
  const output = { stdout: "", stderr: "" };
  return {
    output,
    io: {
      stdout: { write: (value) => (output.stdout += value) },
      stderr: { write: (value) => (output.stderr += value) }
    }
  };
}

test("parseArgs parses init arguments", () => {
  const parsed = parseArgs([
    "init",
    "--profile",
    "mobile-ios",
    "--profile",
    "backend-rust",
    "--agent",
    "both",
    "--force",
    "--dry-run",
    "--target",
    "/tmp/example"
  ]);

  assert.equal(parsed.command, "init");
  assert.deepEqual(parsed.profiles, ["mobile-ios", "backend-rust"]);
  assert.equal(parsed.agent, "both");
  assert.equal(parsed.force, true);
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.target, "/tmp/example");
});

test("detectProfilesFromProject detects stack signals", () => {
  const profiles = detectProfilesFromProject(
    ["Cargo.toml", "pyproject.toml", "settings.gradle.kts", "Package.swift"],
    { dependencies: { react: "^19.0.0" } }
  );

  assert.deepEqual(
    profiles.sort(),
    ["backend-python", "backend-rust", "frontend-react", "mobile-android", "mobile-ios"].sort()
  );
});

test("init --agent both installs and doctor verifies the validator distributions", async (t) => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "ai-playbook-validator-"));
  t.after(() => fs.rm(target, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(target, "package.json"),
    JSON.stringify({ type: "module" }),
    "utf8"
  );
  const initCapture = captureIo();
  const doctorCapture = captureIo();

  const initExit = await run(["init", "--agent", "both", "--target", target], initCapture.io);
  const doctorExit = await run(
    ["doctor", "--agent", "both", "--target", target],
    doctorCapture.io
  );

  assert.equal(initExit, 0);
  assert.equal(doctorExit, 0);
  const installedFiles = [
    "AGENTS.md",
    "CLAUDE.md",
    path.join("skills", "validate-feature-candidate", "SKILL.md"),
    path.join(".claude", "agents", "independent-validator.md"),
    path.join(
      ".ai-playbook",
      "contracts",
      "independent-validator",
      "validate.cjs"
    ),
    path.join(
      ".ai-playbook",
      "contracts",
      "independent-validator",
      "v1",
      "assignment.schema.json"
    ),
    path.join(
      ".ai-playbook",
      "contracts",
      "independent-validator",
      "v1",
      "result.schema.json"
    )
  ];
  for (const installedFile of installedFiles) {
    await fs.access(path.join(target, installedFile));
  }
  const installedChecker = require(
    path.join(
      target,
      ".ai-playbook",
      "contracts",
      "independent-validator",
      "validate.cjs"
    )
  );
  assert.equal(
    typeof installedChecker.validateIndependentValidatorPair,
    "function"
  );

  const doctorOutput = doctorCapture.output.stdout;
  assert.match(doctorOutput, /OK\s+AGENTS\.md/);
  assert.match(doctorOutput, /OK\s+CLAUDE\.md/);
  assert.match(doctorOutput, /OK\s+skills\/validate-feature-candidate\/SKILL\.md/);
  assert.match(doctorOutput, /OK\s+\.claude\/agents\/independent-validator\.md/);
  assert.match(doctorOutput, /OK\s+independent-validator\/validate\.cjs/);
  assert.match(doctorOutput, /OK\s+independent-validator\/v1\/assignment/);
  assert.match(doctorOutput, /OK\s+independent-validator\/v1\/result/);
});

for (const [agent, workflowPattern, otherWorkflowPath] of [
  [
    "codex",
    /OK\s+skills\/validate-feature-candidate\/SKILL\.md/,
    path.join(".claude", "agents", "independent-validator.md")
  ],
  [
    "claude",
    /OK\s+\.claude\/agents\/independent-validator\.md/,
    path.join("skills", "validate-feature-candidate", "SKILL.md")
  ]
]) {
  test(`init and doctor support the ${agent} validator distribution independently`, async (t) => {
    const target = await fs.mkdtemp(
      path.join(os.tmpdir(), `ai-playbook-validator-${agent}-`)
    );
    t.after(() => fs.rm(target, { recursive: true, force: true }));
    const initCapture = captureIo();
    const doctorCapture = captureIo();

    const initExit = await run(
      ["init", "--agent", agent, "--target", target],
      initCapture.io
    );
    const doctorExit = await run(
      ["doctor", "--agent", agent, "--target", target],
      doctorCapture.io
    );

    assert.equal(initExit, 0);
    assert.equal(doctorExit, 0);
    assert.match(doctorCapture.output.stdout, workflowPattern);
    await assert.rejects(
      fs.access(path.join(target, otherWorkflowPath)),
      (error) => error.code === "ENOENT"
    );
    assert.match(
      doctorCapture.output.stdout,
      /OK\s+independent-validator\/validate\.cjs/
    );
    assert.match(
      doctorCapture.output.stdout,
      /OK\s+independent-validator\/v1\/assignment/
    );
    assert.match(
      doctorCapture.output.stdout,
      /OK\s+independent-validator\/v1\/result/
    );
  });
}

test("doctor rejects a corrupted installed validator schema", async (t) => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "ai-playbook-validator-bad-"));
  t.after(() => fs.rm(target, { recursive: true, force: true }));
  const initCapture = captureIo();
  const doctorCapture = captureIo();

  const initExit = await run(
    ["init", "--agent", "codex", "--target", target],
    initCapture.io
  );
  await fs.writeFile(
    path.join(
      target,
      ".ai-playbook",
      "contracts",
      "independent-validator",
      "v1",
      "result.schema.json"
    ),
    "",
    "utf8"
  );
  const doctorExit = await run(
    ["doctor", "--agent", "codex", "--target", target],
    doctorCapture.io
  );

  assert.equal(initExit, 0);
  assert.equal(doctorExit, 1);
  assert.match(
    doctorCapture.output.stdout,
    /BAD\s+independent-validator\/v1\/result\.schema\.json/
  );
});
