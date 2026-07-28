const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { detectProfilesFromProject, parseArgs, run } = require("../src/cli");

const SKILL_NAMES = [
  "app-localization",
  "architecture-reviewer",
  "code-simplification-architect",
  "devops-engineer",
  "github-actions-engineer",
  "mobile-engineer",
  "red-team-analyst",
  "senior-code-reviewer",
  "senior-qa-engineer",
  "validate-feature-candidate"
];

const AGENT_NAMES = [
  "architecture-reviewer",
  "code-simplification-architect",
  "github-actions-engineer",
  "independent-validator",
  "red-team-analyst",
  "senior-code-reviewer",
  "senior-qa-engineer"
];

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

async function temporaryTarget(t, prefix) {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rm(target, { recursive: true, force: true }));
  return target;
}

async function assertExists(target, relativePath) {
  await fs.access(path.join(target, relativePath));
}

async function assertMissing(target, relativePath) {
  await assert.rejects(
    fs.access(path.join(target, relativePath)),
    (error) => error.code === "ENOENT"
  );
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

test("init --agent both installs native skills, agents, and validator contracts", async (t) => {
  const target = await temporaryTarget(t, "ai-playbook-both-");
  const initCapture = captureIo();
  const doctorCapture = captureIo();

  const initExit = await run(["init", "--agent", "both", "--target", target], initCapture.io);
  const doctorExit = await run(
    ["doctor", "--agent", "both", "--target", target],
    doctorCapture.io
  );

  assert.equal(initExit, 0);
  assert.equal(doctorExit, 0);
  for (const skill of SKILL_NAMES) {
    await assertExists(target, path.join(".agents", "skills", skill, "SKILL.md"));
    await assertExists(target, path.join(".claude", "skills", skill, "SKILL.md"));
  }
  for (const agent of AGENT_NAMES) {
    await assertExists(target, path.join(".codex", "agents", `${agent}.toml`));
    await assertExists(target, path.join(".claude", "agents", `${agent}.md`));
  }
  await assertExists(target, "AGENTS.md");
  await assertExists(target, "CLAUDE.md");
  await assertExists(
    target,
    path.join(".ai-playbook", "contracts", "independent-validator", "validate.cjs")
  );
  await assertMissing(
    target,
    path.join("Codex", "skills", "validate-feature-candidate", "SKILL.md")
  );

  const manifest = JSON.parse(
    await fs.readFile(path.join(target, ".ai-playbook-manifest.json"), "utf8")
  );
  assert.equal(manifest.layoutVersion, 2);
  assert.equal(manifest.capabilities.skills.length, SKILL_NAMES.length * 2);
  assert.equal(manifest.capabilities.agents.length, AGENT_NAMES.length * 2);
  assert.ok(
    manifest.managedPaths.includes(
      path.join(".agents", "skills", "validate-feature-candidate", "SKILL.md")
    )
  );

  assert.match(doctorCapture.output.stdout, /OK\s+\.agents\/skills\/app-localization/);
  assert.match(doctorCapture.output.stdout, /OK\s+\.claude\/skills\/app-localization/);
  assert.match(doctorCapture.output.stdout, /OK\s+\.codex\/agents\/independent-validator/);
  assert.match(doctorCapture.output.stdout, /OK\s+\.claude\/agents\/independent-validator/);
});

for (const platform of ["codex", "claude"]) {
  test(`init and doctor install only the ${platform} native capability layout`, async (t) => {
    const target = await temporaryTarget(t, `ai-playbook-${platform}-`);
    const initCapture = captureIo();
    const doctorCapture = captureIo();

    assert.equal(
      await run(["init", "--agent", platform, "--target", target], initCapture.io),
      0
    );
    assert.equal(
      await run(["doctor", "--agent", platform, "--target", target], doctorCapture.io),
      0
    );

    if (platform === "codex") {
      await assertExists(
        target,
        path.join(".agents", "skills", "validate-feature-candidate", "SKILL.md")
      );
      await assertExists(
        target,
        path.join(".codex", "agents", "independent-validator.toml")
      );
      await assertMissing(target, path.join(".claude", "skills"));
      await assertMissing(target, path.join(".claude", "agents"));
      await assertMissing(target, "CLAUDE.md");
    } else {
      await assertExists(
        target,
        path.join(".claude", "skills", "validate-feature-candidate", "SKILL.md")
      );
      await assertExists(
        target,
        path.join(".claude", "agents", "independent-validator.md")
      );
      await assertMissing(target, path.join(".agents", "skills"));
      await assertMissing(target, path.join(".codex", "agents"));
      await assertMissing(target, "AGENTS.md");
    }
  });
}

test("init preserves existing user capability files unless --force is used", async (t) => {
  const target = await temporaryTarget(t, "ai-playbook-preserve-");
  const customSkill = path.join(
    target,
    ".agents",
    "skills",
    "senior-code-reviewer",
    "SKILL.md"
  );
  await fs.mkdir(path.dirname(customSkill), { recursive: true });
  await fs.writeFile(customSkill, "user-owned\n", "utf8");
  const capture = captureIo();

  assert.equal(await run(["init", "--agent", "codex", "--target", target], capture.io), 0);
  assert.equal(await fs.readFile(customSkill, "utf8"), "user-owned\n");
  assert.match(capture.output.stdout, /Skipped files \(already existed\)/);
  const firstManifest = JSON.parse(
    await fs.readFile(path.join(target, ".ai-playbook-manifest.json"), "utf8")
  );
  assert.equal(
    firstManifest.managedPaths.includes(
      path.join(".agents", "skills", "senior-code-reviewer", "SKILL.md")
    ),
    false
  );
  assert.ok(
    firstManifest.managedPaths.includes(
      path.join(".agents", "skills", "architecture-reviewer", "SKILL.md")
    )
  );

  assert.equal(await run(["init", "--agent", "codex", "--target", target], captureIo().io), 0);
  const secondManifest = JSON.parse(
    await fs.readFile(path.join(target, ".ai-playbook-manifest.json"), "utf8")
  );
  assert.ok(
    secondManifest.managedPaths.includes(
      path.join(".agents", "skills", "architecture-reviewer", "SKILL.md")
    )
  );

  const doctorCapture = captureIo();
  assert.equal(
    await run(["doctor", "--agent", "codex", "--target", target], doctorCapture.io),
    1
  );
  assert.match(
    doctorCapture.output.stdout,
    /BAD\s+\.agents\/skills\/senior-code-reviewer\/SKILL\.md/
  );
});

test("init migrates legacy Codex skills without deleting them", async (t) => {
  const target = await temporaryTarget(t, "ai-playbook-legacy-");
  const legacySkill = path.join(
    target,
    "Codex",
    "skills",
    "validate-feature-candidate",
    "SKILL.md"
  );
  await fs.mkdir(path.dirname(legacySkill), { recursive: true });
  await fs.writeFile(legacySkill, "legacy\n", "utf8");

  const beforeCapture = captureIo();
  assert.equal(
    await run(["doctor", "--agent", "codex", "--target", target], beforeCapture.io),
    1
  );
  assert.match(beforeCapture.output.stdout, /WARN legacy Codex\/skills/);

  const initCapture = captureIo();
  assert.equal(await run(["init", "--agent", "codex", "--target", target], initCapture.io), 0);
  assert.equal(await fs.readFile(legacySkill, "utf8"), "legacy\n");
  await assertExists(
    target,
    path.join(".agents", "skills", "validate-feature-candidate", "SKILL.md")
  );
  assert.match(initCapture.output.stdout, /Legacy Codex\/skills retained/);

  const afterCapture = captureIo();
  assert.equal(
    await run(["doctor", "--agent", "codex", "--target", target], afterCapture.io),
    0
  );
});

test("init --dry-run reports native files without writing them", async (t) => {
  const target = await temporaryTarget(t, "ai-playbook-dry-run-");
  const capture = captureIo();

  assert.equal(
    await run(["init", "--agent", "both", "--dry-run", "--target", target], capture.io),
    0
  );
  assert.match(capture.output.stdout, /Would write manifest/);
  await assertMissing(target, "features.md");
  await assertMissing(target, ".ai-playbook-manifest.json");
  await assertMissing(target, path.join(".agents", "skills"));
  await assertMissing(target, path.join(".claude", "skills"));
});

test("doctor rejects a corrupted installed validator schema", async (t) => {
  const target = await temporaryTarget(t, "ai-playbook-validator-bad-");
  const initCapture = captureIo();
  const doctorCapture = captureIo();

  assert.equal(
    await run(["init", "--agent", "codex", "--target", target], initCapture.io),
    0
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
  assert.equal(
    await run(["doctor", "--agent", "codex", "--target", target], doctorCapture.io),
    1
  );
  assert.match(
    doctorCapture.output.stdout,
    /BAD\s+independent-validator\/v1\/result\.schema\.json/
  );
});
