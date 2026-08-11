const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SKILLS_ROOT = path.join(ROOT, ".agents", "skills");
const CLAUDE_AGENTS_ROOT = path.join(ROOT, "Claude", "agents");
const CODEX_AGENTS_ROOT = path.join(ROOT, "Codex", "agents");

const SKILL_NAMES = [
  "app-localization",
  "architecture-reviewer",
  "code-simplification-architect",
  "devops-engineer",
  "github-actions-engineer",
  "mobile-engineer",
  "performance-benchmarking",
  "red-team-analyst",
  "senior-code-reviewer",
  "senior-qa-engineer",
  "validate-feature-candidate"
];

const AGENT_SKILLS = {
  "architecture-reviewer": "architecture-reviewer",
  "code-simplification-architect": "code-simplification-architect",
  "github-actions-engineer": "github-actions-engineer",
  "independent-validator": "validate-feature-candidate",
  "red-team-analyst": "red-team-analyst",
  "senior-code-reviewer": "senior-code-reviewer",
  "senior-qa-engineer": "senior-qa-engineer"
};

const READ_ONLY_AGENTS = [
  "architecture-reviewer",
  "red-team-analyst",
  "senior-code-reviewer"
];

function metadataValue(content, key) {
  const end = content.indexOf("\n---\n", 4);
  const frontmatter = content.slice(4, end);
  return frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim();
}

test("canonical skills have valid unique metadata and activation fixtures", async () => {
  const fixturePath = path.join(__dirname, "fixtures", "skill-activation.json");
  const fixtures = JSON.parse(await fs.readFile(fixturePath, "utf8"));
  const discovered = (await fs.readdir(SKILLS_ROOT)).sort();
  assert.deepEqual(discovered, [...SKILL_NAMES].sort());

  const names = new Set();
  for (const skill of SKILL_NAMES) {
    const content = await fs.readFile(path.join(SKILLS_ROOT, skill, "SKILL.md"), "utf8");
    const name = metadataValue(content, "name");
    const description = metadataValue(content, "description");
    assert.equal(name, skill);
    assert.match(name, /^[a-z0-9-]+$/);
    assert.ok(description.length > 20 && description.length <= 1024);
    assert.equal(names.has(name), false);
    names.add(name);

    assert.deepEqual(Object.keys(fixtures[skill]).sort(), [
      "direct",
      "incomplete",
      "indirect",
      "negative"
    ]);
    for (const prompt of Object.values(fixtures[skill])) {
      assert.ok(prompt.length >= 10);
    }
  }
});

test("performance benchmarking skill ships its guarded adaptive workflow", async () => {
  const skillRoot = path.join(SKILLS_ROOT, "performance-benchmarking");
  const skill = await fs.readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  const referenceRoot = path.join(skillRoot, "references");

  assert.match(metadataValue(skill, "description"), /^Use when /);
  assert.deepEqual((await fs.readdir(referenceRoot)).sort(), [
    "continuous-improvement.md",
    "methodology.md",
    "report-contract.md",
    "stack-recipes.md"
  ]);
  assert.match(skill, /approval before modifying production code/i);
  assert.match(skill, /known or unknown stack/i);
  assert.match(skill, /inconclusive/i);

  const [continuousImprovement, methodology, reportContract, stackRecipes] =
    await Promise.all(
      [
        "continuous-improvement.md",
        "methodology.md",
        "report-contract.md",
        "stack-recipes.md"
      ].map((name) => fs.readFile(path.join(referenceRoot, name), "utf8"))
    );

  assert.match(continuousImprovement, /project-local lane/i);
  assert.match(continuousImprovement, /explicit approval/i);
  assert.match(continuousImprovement, /does not run.*background/is);
  assert.match(methodology, /rationalization check/i);
  assert.match(reportContract, /accepted.*rejected.*inconclusive.*blocked/is);
  assert.match(stackRecipes, /unknown or unlisted stack/i);
});

test("Claude agents are thin skill adapters without pinned models", async () => {
  const discovered = (await fs.readdir(CLAUDE_AGENTS_ROOT)).sort();
  assert.deepEqual(
    discovered,
    Object.keys(AGENT_SKILLS).map((name) => `${name}.md`).sort()
  );

  for (const [agent, skill] of Object.entries(AGENT_SKILLS)) {
    const content = await fs.readFile(path.join(CLAUDE_AGENTS_ROOT, `${agent}.md`), "utf8");
    assert.equal(metadataValue(content, "name"), agent);
    assert.doesNotMatch(content, /^model:/m);
    assert.match(content, new RegExp(`^\\s+- ${skill}$`, "m"));
    if (READ_ONLY_AGENTS.includes(agent)) {
      assert.doesNotMatch(metadataValue(content, "tools"), /\b(?:Edit|Write)\b/);
      assert.equal(metadataValue(content, "permissionMode"), "plan");
    }
  }
});

test("Codex agents are thin skill adapters with explicit sandboxes", async () => {
  const discovered = (await fs.readdir(CODEX_AGENTS_ROOT)).sort();
  assert.deepEqual(
    discovered,
    Object.keys(AGENT_SKILLS).map((name) => `${name}.toml`).sort()
  );

  for (const [agent, skill] of Object.entries(AGENT_SKILLS)) {
    const content = await fs.readFile(path.join(CODEX_AGENTS_ROOT, `${agent}.toml`), "utf8");
    assert.match(content, new RegExp(`^name = "${agent}"$`, "m"));
    assert.match(content, new RegExp(`\\.agents/skills/${skill}/SKILL\\.md`));
    assert.doesNotMatch(content, /^model\s*=/m);
    if (READ_ONLY_AGENTS.includes(agent)) {
      assert.match(content, /^sandbox_mode = "read-only"$/m);
    }
  }
});

test("independent validation requires a fresh agent boundary on both platforms", async () => {
  const skill = await fs.readFile(
    path.join(SKILLS_ROOT, "validate-feature-candidate", "SKILL.md"),
    "utf8"
  );
  const claude = await fs.readFile(
    path.join(CLAUDE_AGENTS_ROOT, "independent-validator.md"),
    "utf8"
  );
  const codex = await fs.readFile(
    path.join(CODEX_AGENTS_ROOT, "independent-validator.toml"),
    "utf8"
  );

  assert.match(skill, /fresh `independent-validator` agent/);
  assert.match(skill, /does not create independence/);
  assert.match(claude, /Attest independence only/);
  assert.match(codex, /attest independence only/);
});
