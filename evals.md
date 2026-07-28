# Evals

This file defines stable evaluation contracts and their automated test mappings.
Test runners and CI are the authoritative source for pass/fail results.

## Capability distribution

- Name: Native skill and agent installation
- Description: Each platform mode installs every shared skill and thin agent adapter into the platform's auto-discovered project paths.
- Test mapping: `tests/cli.test.js`; `tests/capabilities.test.js`
- Notes: Combined mode must install both layouts and record layout version 2 in the manifest.

- Name: Compatibility-safe legacy migration
- Description: A legacy `Codex/skills/` installation is diagnosed, native copies are installed on the next init, and legacy or user-owned files are not deleted or overwritten.
- Test mapping: `tests/cli.test.js`
- Notes: `--force` remains the only opt-in overwrite mechanism.

- Name: Skill activation metadata
- Description: Every canonical skill has unique valid metadata and representative direct, indirect, incomplete, and negative activation prompts.
- Test mapping: `tests/capabilities.test.js`; `tests/fixtures/skill-activation.json`
- Notes: Fixtures define the stable activation corpus; they do not call a hosted model.

- Name: Agent safety boundaries
- Description: Reviewer agents are non-editing, writer agents have explicit workspace scope, and no agent pins a model.
- Test mapping: `tests/capabilities.test.js`
- Notes: Independent validation has a separate fresh-agent boundary check.

## Independent validation

- Name: Contract-valid candidate outcomes
- Description: Assignment and result documents enforce immutable revisions, command authorization, evidence coverage, outcome precedence, and deterministic failure signatures.
- Test mapping: `tests/independent-validator-contracts.test.js`
- Notes: The schema and semantic checker jointly define validity.
