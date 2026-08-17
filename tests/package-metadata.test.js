const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");

const ROOT = path.resolve(__dirname, "..");
const EXPECTED_PACKAGE = "@vadimkom/ai-playbook";
const execFileAsync = promisify(execFile);

test("dry-run package build uses the owned npm scope", async (t) => {
  const cache = await fs.mkdtemp(
    path.join(os.tmpdir(), "ai-playbook-package-test-")
  );
  t.after(() => fs.rm(cache, { recursive: true, force: true }));

  const { stdout } = await execFileAsync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["pack", "--dry-run", "--json", "--cache", cache],
    { cwd: ROOT }
  );
  const [packedArtifact] = JSON.parse(stdout);

  assert.equal(packedArtifact.name, EXPECTED_PACKAGE);
});
