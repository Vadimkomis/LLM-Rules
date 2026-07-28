const fs = require("node:fs/promises");
const path = require("node:path");

const PROFILE_DEFINITIONS = {
  "frontend-react": {
    description: "React frontend projects"
  },
  "backend-python": {
    description: "Python backend or data projects"
  },
  "backend-rust": {
    description: "Rust services or CLI projects"
  },
  "mobile-ios": {
    description: "iOS Swift/Xcode projects"
  },
  "mobile-android": {
    description: "Android Kotlin/Gradle projects"
  }
};

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

function repoRoot() {
  return path.resolve(__dirname, "..");
}

function helpText() {
  return [
    "ai-playbook CLI",
    "",
    "Usage:",
    "  ai-playbook init [options]",
    "  ai-playbook doctor [options]",
    "  ai-playbook profiles",
    "",
    "Options:",
    "  --target <path>       Target repo root (default: current directory)",
    "  --profile <name>      Install profile (repeatable)",
    "  --agent <value>       codex | claude | both (default: codex)",
    "  --force               Overwrite existing files",
    "  --dry-run             Print changes without writing",
    "  -h, --help            Show help"
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    command: "help",
    target: process.cwd(),
    profiles: [],
    agent: "codex",
    force: false,
    dryRun: false,
    help: false
  };

  if (argv.length > 0 && !argv[0].startsWith("-")) {
    args.command = argv[0];
  }

  for (let i = args.command === "help" ? 0 : 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "-h" || token === "--help") {
      args.help = true;
      continue;
    }
    if (token === "--force") {
      args.force = true;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--target") {
      args.target = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--profile") {
      args.profiles.push(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === "--agent") {
      args.agent = argv[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.target) {
    throw new Error("--target expects a path");
  }
  if (!["codex", "claude", "both"].includes(args.agent)) {
    throw new Error("--agent must be one of codex|claude|both");
  }
  for (const profile of args.profiles) {
    if (!PROFILE_DEFINITIONS[profile]) {
      throw new Error(`Unknown profile: ${profile}`);
    }
  }

  return args;
}

function detectProfilesFromProject(files, packageJson) {
  const detected = new Set();
  const has = (name) => files.includes(name);

  if (has("Package.swift") || files.some((entry) => entry.endsWith(".xcodeproj"))) {
    detected.add("mobile-ios");
  }
  if (
    has("settings.gradle") ||
    has("settings.gradle.kts") ||
    has("build.gradle") ||
    has("build.gradle.kts")
  ) {
    detected.add("mobile-android");
  }
  if (has("pyproject.toml") || has("requirements.txt")) {
    detected.add("backend-python");
  }
  if (has("Cargo.toml")) {
    detected.add("backend-rust");
  }

  if (packageJson && packageJson.dependencies) {
    if (Object.prototype.hasOwnProperty.call(packageJson.dependencies, "react")) {
      detected.add("frontend-react");
    }
  }

  return Array.from(detected);
}

async function collectProjectSignals(target) {
  const entries = await fs.readdir(target, { withFileTypes: true });
  const files = entries.map((entry) => entry.name);
  let packageJson = null;
  if (files.includes("package.json")) {
    const packageJsonRaw = await fs.readFile(path.join(target, "package.json"), "utf8");
    try {
      packageJson = JSON.parse(packageJsonRaw);
    } catch {
      packageJson = null;
    }
  }
  return { files, packageJson };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function filesMatch(sourcePath, destinationPath) {
  try {
    const [source, destination] = await Promise.all([
      fs.readFile(sourcePath),
      fs.readFile(destinationPath)
    ]);
    return source.equals(destination);
  } catch {
    return false;
  }
}

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function frontmatterValue(content, key) {
  if (!content || !content.startsWith("---\n")) {
    return null;
  }
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) {
    return null;
  }
  const frontmatter = content.slice(4, end);
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

async function validSkill(filePath, expectedName) {
  const content = await readText(filePath);
  const name = frontmatterValue(content, "name");
  const description = frontmatterValue(content, "description");
  return (
    name === expectedName &&
    /^[a-z0-9-]+$/.test(name) &&
    Boolean(description) &&
    description.length <= 1024
  );
}

async function validClaudeAgent(filePath, expectedName) {
  const content = await readText(filePath);
  return (
    frontmatterValue(content, "name") === expectedName &&
    Boolean(frontmatterValue(content, "description")) &&
    !/^model:/m.test(content || "") &&
    /^skills:\s*$/m.test(content || "")
  );
}

async function validCodexAgent(filePath, expectedName) {
  const content = await readText(filePath);
  if (!content) {
    return false;
  }
  const nameMatch = content.match(/^name\s*=\s*"([^"]+)"$/m);
  return (
    nameMatch?.[1] === expectedName &&
    /^description\s*=\s*"[^"]+"$/m.test(content) &&
    /^developer_instructions\s*=\s*"""/m.test(content) &&
    !/^model\s*=/m.test(content)
  );
}

async function validManifest(filePath) {
  const content = await readText(filePath);
  try {
    const manifest = JSON.parse(content);
    return (
      manifest.tool === "ai-playbook" &&
      manifest.layoutVersion === 2 &&
      Array.isArray(manifest.managedPaths) &&
      manifest.capabilities &&
      Array.isArray(manifest.capabilities.skills) &&
      Array.isArray(manifest.capabilities.agents)
    );
  } catch {
    return false;
  }
}

async function copyFileSafe(sourcePath, destinationPath, options, result) {
  const alreadyExists = await exists(destinationPath);
  if (alreadyExists && !options.force) {
    result.skipped.push(destinationPath);
    return;
  }
  if (!options.dryRun) {
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.copyFile(sourcePath, destinationPath);
  }
  result.copied.push(destinationPath);
}

async function copyDirectorySafe(sourceDir, destinationDir, options, result) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirectorySafe(sourcePath, destinationPath, options, result);
    } else if (entry.isFile()) {
      await copyFileSafe(sourcePath, destinationPath, options, result);
    }
  }
}

async function ensureManifest(target, payload, options) {
  const manifestPath = path.join(target, ".ai-playbook-manifest.json");
  const content = JSON.stringify(payload, null, 2) + "\n";
  if (!options.dryRun) {
    await fs.writeFile(manifestPath, content, "utf8");
  }
  return manifestPath;
}

async function existingManagedPaths(target) {
  const manifestPath = path.join(target, ".ai-playbook-manifest.json");
  const content = await readText(manifestPath);
  try {
    const manifest = JSON.parse(content);
    return Array.isArray(manifest.managedPaths) ? manifest.managedPaths : [];
  } catch {
    return [];
  }
}

function relativeManagedPaths(target, result, previousPaths) {
  const copiedPaths = result.copied.map((filePath) => path.relative(target, filePath));
  return [...new Set([...previousPaths, ...copiedPaths])]
    .sort();
}

function capabilityPaths(agentMode) {
  const skills = [];
  const agents = [];
  if (agentMode === "codex" || agentMode === "both") {
    skills.push(...SKILL_NAMES.map((name) => path.join(".agents", "skills", name)));
    agents.push(...AGENT_NAMES.map((name) => path.join(".codex", "agents", `${name}.toml`)));
  }
  if (agentMode === "claude" || agentMode === "both") {
    skills.push(...SKILL_NAMES.map((name) => path.join(".claude", "skills", name)));
    agents.push(...AGENT_NAMES.map((name) => path.join(".claude", "agents", `${name}.md`)));
  }
  return { skills, agents };
}

async function installInit(args, io) {
  const target = path.resolve(args.target);
  const { files, packageJson } = await collectProjectSignals(target);
  const detectedProfiles = detectProfilesFromProject(files, packageJson);
  const profiles = args.profiles.length > 0 ? args.profiles : detectedProfiles;
  const selectedProfiles = profiles.length > 0 ? profiles : ["frontend-react"];
  const root = repoRoot();
  const result = { copied: [], skipped: [] };
  const previousManagedPaths = await existingManagedPaths(target);
  const legacyCodexSkills = path.join(target, "Codex", "skills");
  const hadLegacyCodexSkills = await exists(legacyCodexSkills);

  await copyFileSafe(
    path.join(root, "templates", "common", "features.md"),
    path.join(target, "features.md"),
    args,
    result
  );
  await copyFileSafe(
    path.join(root, "templates", "common", "evals.md"),
    path.join(target, "evals.md"),
    args,
    result
  );
  await copyDirectorySafe(
    path.join(root, "contracts", "independent-validator"),
    path.join(target, ".ai-playbook", "contracts", "independent-validator"),
    args,
    result
  );
  await copyFileSafe(
    path.join(root, "src", "independent-validator-contracts.js"),
    path.join(
      target,
      ".ai-playbook",
      "contracts",
      "independent-validator",
      "validate.cjs"
    ),
    args,
    result
  );

  if (args.agent === "codex" || args.agent === "both") {
    await copyFileSafe(path.join(root, "Codex", "AGENTS.md"), path.join(target, "AGENTS.md"), args, result);
    await copyDirectorySafe(
      path.join(root, ".agents", "skills"),
      path.join(target, ".agents", "skills"),
      args,
      result
    );
    await copyDirectorySafe(
      path.join(root, "Codex", "agents"),
      path.join(target, ".codex", "agents"),
      args,
      result
    );
  }
  if (args.agent === "claude" || args.agent === "both") {
    await copyFileSafe(
      path.join(root, "Claude", "CLAUDE.md"),
      path.join(target, "CLAUDE.md"),
      args,
      result
    );
    await copyDirectorySafe(
      path.join(root, ".agents", "skills"),
      path.join(target, ".claude", "skills"),
      args,
      result
    );
    await copyDirectorySafe(
      path.join(root, "Claude", "agents"),
      path.join(target, ".claude", "agents"),
      args,
      result
    );
  }

  for (const profile of selectedProfiles) {
    await copyFileSafe(
      path.join(root, "templates", "profiles", profile, "profile.md"),
      path.join(target, ".ai-playbook", "profiles", `${profile}.md`),
      args,
      result
    );
  }

  const packageJsonRaw = await fs.readFile(path.join(root, "package.json"), "utf8");
  const toolVersion = JSON.parse(packageJsonRaw).version;
  const manifestPath = await ensureManifest(
    target,
    {
      tool: "ai-playbook",
      version: toolVersion,
      layoutVersion: 2,
      installedAt: new Date().toISOString(),
      agent: args.agent,
      profiles: selectedProfiles,
      capabilities: capabilityPaths(args.agent),
      managedPaths: relativeManagedPaths(target, result, previousManagedPaths)
    },
    args
  );

  io.stdout.write(`Target: ${target}\n`);
  io.stdout.write(`Agent mode: ${args.agent}\n`);
  io.stdout.write(`Profiles: ${selectedProfiles.join(", ")}\n`);
  io.stdout.write(`Copied: ${result.copied.length}\n`);
  io.stdout.write(`Skipped: ${result.skipped.length}\n`);
  if (result.skipped.length > 0) {
    io.stdout.write("Skipped files (already existed):\n");
    for (const filePath of result.skipped) {
      io.stdout.write(`  - ${filePath}\n`);
    }
  }
  if (
    hadLegacyCodexSkills &&
    (args.agent === "codex" || args.agent === "both")
  ) {
    io.stdout.write(
      "Legacy Codex/skills retained; native copies were installed under .agents/skills.\n"
    );
  }
  io.stdout.write(`${args.dryRun ? "Would write" : "Wrote"} manifest: ${manifestPath}\n`);
  return 0;
}

function skillChecks(root, target, destinationRoot) {
  return SKILL_NAMES.map((name) => ({
    name: path.join(destinationRoot, name, "SKILL.md"),
    path: path.join(target, destinationRoot, name, "SKILL.md"),
    sourcePath: path.join(root, ".agents", "skills", name, "SKILL.md"),
    validate: (filePath) => validSkill(filePath, name)
  }));
}

function codexAgentChecks(root, target) {
  return AGENT_NAMES.map((name) => ({
    name: path.join(".codex", "agents", `${name}.toml`),
    path: path.join(target, ".codex", "agents", `${name}.toml`),
    sourcePath: path.join(root, "Codex", "agents", `${name}.toml`),
    validate: (filePath) => validCodexAgent(filePath, name)
  }));
}

function claudeAgentChecks(root, target) {
  return AGENT_NAMES.map((name) => ({
    name: path.join(".claude", "agents", `${name}.md`),
    path: path.join(target, ".claude", "agents", `${name}.md`),
    sourcePath: path.join(root, "Claude", "agents", `${name}.md`),
    validate: (filePath) => validClaudeAgent(filePath, name)
  }));
}

async function runDoctor(args, io) {
  const target = path.resolve(args.target);
  const root = repoRoot();
  const checks = [
    { name: "features.md", path: path.join(target, "features.md") },
    { name: "evals.md", path: path.join(target, "evals.md") },
    {
      name: ".ai-playbook-manifest.json",
      path: path.join(target, ".ai-playbook-manifest.json"),
      validate: validManifest
    },
    {
      name: "independent-validator/v1/assignment.schema.json",
      path: path.join(
        target,
        ".ai-playbook",
        "contracts",
        "independent-validator",
        "v1",
        "assignment.schema.json"
      ),
      sourcePath: path.join(
        root,
        "contracts",
        "independent-validator",
        "v1",
        "assignment.schema.json"
      )
    },
    {
      name: "independent-validator/v1/result.schema.json",
      path: path.join(
        target,
        ".ai-playbook",
        "contracts",
        "independent-validator",
        "v1",
        "result.schema.json"
      ),
      sourcePath: path.join(
        root,
        "contracts",
        "independent-validator",
        "v1",
        "result.schema.json"
      )
    },
    {
      name: "independent-validator/validate.cjs",
      path: path.join(
        target,
        ".ai-playbook",
        "contracts",
        "independent-validator",
        "validate.cjs"
      ),
      sourcePath: path.join(root, "src", "independent-validator-contracts.js")
    }
  ];
  const codexChecks = [
    { name: "AGENTS.md", path: path.join(target, "AGENTS.md") },
    ...skillChecks(root, target, path.join(".agents", "skills")),
    ...codexAgentChecks(root, target)
  ];
  const claudeChecks = [
    { name: "CLAUDE.md", path: path.join(target, "CLAUDE.md") },
    ...skillChecks(root, target, path.join(".claude", "skills")),
    ...claudeAgentChecks(root, target)
  ];
  const agentChecks = {
    codex: codexChecks,
    claude: claudeChecks,
    both: [...codexChecks, ...claudeChecks]
  };
  checks.push(...agentChecks[args.agent]);

  let failures = 0;
  const legacyPath = path.join(target, "Codex", "skills");
  const nativeCodexPath = path.join(target, ".agents", "skills");
  if (
    (args.agent === "codex" || args.agent === "both") &&
    (await exists(legacyPath)) &&
    !(await exists(nativeCodexPath))
  ) {
    io.stdout.write(
      "WARN legacy Codex/skills found without .agents/skills; rerun init to migrate.\n"
    );
  }
  for (const check of checks) {
    const present = await exists(check.path);
    const sourceMatches =
      present && (!check.sourcePath || (await filesMatch(check.sourcePath, check.path)));
    const metadataMatches =
      sourceMatches && (!check.validate || (await check.validate(check.path)));
    const matches = sourceMatches && metadataMatches;
    const status = !present ? "MISS" : matches ? "OK  " : "BAD ";
    io.stdout.write(`${status} ${check.name}\n`);
    if (!matches) {
      failures += 1;
    }
  }
  return failures === 0 ? 0 : 1;
}

function runProfiles(io) {
  io.stdout.write("Available profiles:\n");
  for (const [name, details] of Object.entries(PROFILE_DEFINITIONS)) {
    io.stdout.write(`- ${name}: ${details.description}\n`);
  }
  return 0;
}

async function run(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  const args = parseArgs(argv);
  if (args.help || args.command === "help") {
    io.stdout.write(`${helpText()}\n`);
    return 0;
  }
  if (args.command === "profiles") {
    return runProfiles(io);
  }
  if (args.command === "init") {
    return installInit(args, io);
  }
  if (args.command === "doctor") {
    return runDoctor(args, io);
  }

  io.stderr.write(`Unknown command: ${args.command}\n`);
  io.stderr.write(`${helpText()}\n`);
  return 1;
}

module.exports = {
  detectProfilesFromProject,
  parseArgs,
  run
};
