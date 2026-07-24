# Changelog

All notable changes to this project are documented in this file.

This project follows Semantic Versioning. The structure below is inspired by Keep a Changelog.

## [Unreleased]

## [1.1.0] - 2026-07-24

### Added
- Added an independent validation capability shared across Claude and Codex:
  - `Claude/agents/independent-validator.md` for evidence-backed validation by a role that did not implement or modify the candidate.
  - `Codex/skills/validate-feature-candidate/SKILL.md` for the equivalent reusable workflow.
  - Versioned v1 assignment and result JSON Schemas with pass/fail/error examples and deterministic failure signatures under `contracts/independent-validator/v1`.
  - Automated schema validation and contract tests.

### Changed
- Added independent validation as the final documented workflow gate.
- Updated `ai-playbook init` to install the shared contracts and pair-level
  checker without changing its established Codex or Claude destinations.
  Updated `doctor` to integrity-check the schemas, checker, and installed Codex
  validator skill and to reject altered managed files.
- Excluded machine-local Claude permission overrides from published packages.

## [1.0.5] - 2026-05-19

### Added
- Added the `app-localization` Codex skill for string extraction, translation
  resources, placeholders, plurals, locale coverage, and layout validation.

### Changed
- Documented the localization skill in the Codex workflow, README, and feature
  inventory.
- Clarified that Claude and its specialist agents push completed changes
  immediately after committing.

## [1.0.4] - 2026-03-31

### Changed
- Updated the bug-fix workflow guidance in both agent instruction sets:
  - `Claude/CLAUDE.md` now requires starting bug work by writing a reproducing test before attempting a fix.
  - `Codex/AGENTS.md` now mirrors the same bug-fix-first-by-test guidance.

## [1.0.3] - 2026-03-02

### Added
- Introduced `red-team-analyst` agent for adversarial security review:
  - `Claude/agents/red-team-analyst.md` — Claude agent definition simulating attacker perspective on security-sensitive code.
  - `Codex/skills/red-team-analyst/SKILL.md` — corresponding Codex skill.

### Changed
- Updated `Claude/CLAUDE.md` to include `red-team-analyst` in the agents table with usage guidance.
- Updated `Codex/AGENTS.md` to document the new skill.
- Updated `README.md` to reflect the addition.
- Updated `features.md` to track the new feature.
- Refreshed `assets/banner.png` and `assets/social-preview.png`.

## [1.0.2] - 2026-02-26

### Added
- Introduced an npm CLI scaffold for fast project bootstrapping:
  - `package.json` with `ai-playbook` binary entry.
  - `bin/ai-playbook.js` command entrypoint.
  - `src/cli.js` with `init`, `doctor`, and `profiles` commands.
- Added stack profile templates for:
  - `mobile-ios`, `mobile-android`, `frontend-react`, `backend-python`, and `backend-rust`.
- Added common templates for:
  - `features.md` (Gherkin starter) and `evals.md`.
- Added basic Node test coverage for CLI argument parsing and profile detection.

### Changed
- Updated `Claude/CLAUDE.md` macro to require `features.md` at project inception (Gherkin style) and `evals.md` in new project setup.
- Updated `README.md` with CLI quick start and profile-specific commands for iOS, Android, React, Python, and Rust.

## [1.0.1] - 2026-02-16

### Added
- Introduced `CHANGELOG.md`.
- Added SKILL documentation files under `Codex/skills/` for all seven skills:
  - `architecture-reviewer/`, `senior-code-reviewer/`, `senior-qa-engineer/`,
    `code-simplification-architect/`, `github-actions-engineer/`,
    `mobile-engineer/`, and `devops-engineer/`.
  - Note: The skills directories were created in 1.0.0; this release adds their `SKILL.md` content.

### Changed
- Updated README to reflect the latest Codex changes: documented `Codex/skills/`, clarified the AGENTS mirror, and added a "Getting Started with Codex Skills" section.
- Added a Table of Contents and converted the title to an H1 in README.
- Expanded `Codex/AGENTS.md` substantially (from ~37 lines to 200+), added usage guidance, completed the Skills table (including `mobile-engineer` and `devops-engineer`), and standardized punctuation to match Claude.
- Corrected references to `../Claude/CLAUDE.md` (uppercase) where applicable.
 - Updated `Claude/CLAUDE.md` with macro/micro guidance and a feature tracking section; fixed source link casing and direct GitHub blob link.

### Notes
- Documentation-focused release with substantial additions (new SKILL docs, expanded AGENTS, updated CLAUDE macro guidance); no functional/code changes.

## [1.0.0] - 2026-02-10

### Added
- Initial public release establishing the structure and guidelines:
  - `Claude/CLAUDE.md`, `settings.json`, `statusline.sh`, and core agent definitions under `Claude/agents/`.
  - `Codex/AGENTS.md` with skills-based mirror of Claude guidance.
  - Reusable skills under `Codex/skills/`.
  - Repository assets and MIT license.
