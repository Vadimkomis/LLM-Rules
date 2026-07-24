<p align="center"> <img src="assets/banner.png?v=3" alt="ai-playbook banner" /> </p>

Centralized AI coding assistant configuration for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Codex CLI](https://developers.openai.com/codex/cli/).

## Table of Contents

- [Structure](#structure)
- [CLI Quick Start](#cli-quick-start)
- [Profiles by Stack](#profiles-by-stack)
- [Setup](#setup)
  - [Claude Code](#claude-code)
  - [Codex](#codex)
- [What's Inside](#whats-inside)
- [Getting Started with Codex Skills](#getting-started-with-codex-skills)
- [Shared Independent-Validation Contracts](#shared-independent-validation-contracts)
- [Updating + Sanity Check](#updating--sanity-check)
- [Changelog](#changelog)
- [License](#license)

## Structure

```
Claude/
  ├── CLAUDE.md          # Universal development guidelines (symlinked to ~/.claude/)
  ├── settings.json      # Claude Code settings
  ├── statusline.sh      # Status line configuration
  └── agents/            # Custom agent definitions
        ├── architecture-reviewer.md
        ├── code-simplification-architect.md
        ├── github-actions-engineer.md
        ├── independent-validator.md
        ├── red-team-analyst.md
        ├── senior-code-reviewer.md
        └── senior-qa-engineer.md

Codex/
  ├── AGENTS.md          # Codex agent and workflow instructions
  └── skills/            # Reusable Codex skills (plug-and-play)
        ├── architecture-reviewer/
        ├── code-simplification-architect/
        ├── app-localization/
        ├── github-actions-engineer/
        ├── devops-engineer/
        ├── mobile-engineer/
        ├── red-team-analyst/
        ├── senior-code-reviewer/
        ├── senior-qa-engineer/
        └── validate-feature-candidate/

contracts/
  └── independent-validator/
        └── v1/          # Shared assignment/result schemas and examples
```

## CLI Quick Start

Install into any repository with `npx`:

```bash
# from your target repository root
npx @vadim/ai-playbook init --agent codex
```

Use `--agent codex` to install `AGENTS.md` and project-local `skills`, `--agent claude`
to install `CLAUDE.md` and `.claude/agents`, or `--agent both` to install both
distributions. Every mode also installs the shared validator contracts under
`.ai-playbook/contracts/independent-validator/v1` and their pair-level semantic
checker at `.ai-playbook/contracts/independent-validator/validate.cjs`.

Useful commands:

```bash
# list available stack profiles
npx @vadim/ai-playbook profiles

# install with explicit profile(s)
npx @vadim/ai-playbook init --profile frontend-react --agent codex

# verify expected files and managed validator-file integrity
npx @vadim/ai-playbook doctor --agent codex
```

Optional local linking during development:

```bash
npm link
ai-playbook init --profile frontend-react --agent codex
```

## Profiles by Stack

```bash
# iOS
npx @vadim/ai-playbook init --profile mobile-ios --agent codex

# Android
npx @vadim/ai-playbook init --profile mobile-android --agent codex

# React
npx @vadim/ai-playbook init --profile frontend-react --agent codex

# Python
npx @vadim/ai-playbook init --profile backend-python --agent codex

# Rust
npx @vadim/ai-playbook init --profile backend-rust --agent codex
```

## Setup

### Claude Code

For a project-local installation, the CLI copies `CLAUDE.md`, the complete Claude
agent collection under `.claude/agents`, and the shared validation contracts:

```bash
# from the target repository root
npx @vadim/ai-playbook init --agent claude
npx @vadim/ai-playbook doctor --agent claude
```

The CLI does not alter your home-level Claude settings. To share the rules,
settings, and agents globally, symlink them manually:

```bash
# Link shared CLAUDE.md (applies to all projects)
ln -sf /path/to/ai-playbook/Claude/CLAUDE.md ~/.claude/CLAUDE.md

# Link settings
ln -sf /path/to/ai-playbook/Claude/settings.json ~/.claude/settings.json

# Link custom agents
ln -sf /path/to/ai-playbook/Claude/agents ~/.claude/agents
```

The independent validator still needs its versioned contracts in each target
repository when using the manual setup:

```bash
mkdir -p /path/to/your-project/.ai-playbook/contracts/independent-validator
rsync -a /path/to/ai-playbook/contracts/independent-validator/v1 \
          /path/to/your-project/.ai-playbook/contracts/independent-validator/
cp /path/to/ai-playbook/src/independent-validator-contracts.js \
   /path/to/your-project/.ai-playbook/contracts/independent-validator/validate.cjs
```

Tip: keep ai-playbook in a stable location (e.g. ~/dev/ai-playbook) so symlinks don’t break.

### Codex

Use the Codex playbook in two parts:

1) Project rules: copy or symlink `Codex/AGENTS.md` into your project root so Codex can pick up the shared workflow and guidelines.

```bash
ln -sf /path/to/ai-playbook/Codex/AGENTS.md /path/to/your-project/AGENTS.md
```

2) Skills: copy the skills you want into your project (or point Codex to them). Each skill is a small, focused brief you can apply during a session.

```bash
# Example: bring in a few common skills
mkdir -p /path/to/your-project/skills
rsync -a /path/to/ai-playbook/Codex/skills/architecture-reviewer \
          /path/to/ai-playbook/Codex/skills/red-team-analyst \
          /path/to/ai-playbook/Codex/skills/senior-code-reviewer \
          /path/to/ai-playbook/Codex/skills/senior-qa-engineer \
          /path/to/ai-playbook/Codex/skills/validate-feature-candidate \
          /path/to/your-project/skills/

# Install the shared validation contracts expected by the validator
mkdir -p /path/to/your-project/.ai-playbook/contracts/independent-validator
rsync -a /path/to/ai-playbook/contracts/independent-validator/v1 \
          /path/to/your-project/.ai-playbook/contracts/independent-validator/
cp /path/to/ai-playbook/src/independent-validator-contracts.js \
   /path/to/your-project/.ai-playbook/contracts/independent-validator/validate.cjs
```

## What's Inside

- **CLAUDE.md** — Universal development guidelines: pre-commit workflow, code organization principles, testing requirements, error handling, and code review checklist. Project-specific details (stack, architecture, build commands) belong in each project's own `CLAUDE.md`.
- **agents/** — Specialized agent definitions for architecture review, code simplification, QA, independent feature validation, code review, red-team security analysis, and GitHub Actions.
- **AGENTS.md** — Codex-compatible agent and workflow instructions (mirrors Claude guidance, adapted for skills).
- **skills/** — Reusable Codex skills for targeted tasks (architecture reviews, adversarial security reviews, code reviews, QA, independent feature validation, simplification, GitHub Actions, DevOps, mobile, localization).
- **contracts/** — Tool-neutral, versioned JSON Schemas and examples shared by the Claude validator role and Codex validation skill.

## Getting Started with Codex Skills

Follow the same usage pattern as in Claude:

1. Plan — apply `skills/architecture-reviewer` to validate the approach
2. Implement — write the code
3. Review — apply `skills/senior-code-reviewer` to catch issues
4. Attack — apply `skills/red-team-analyst` for security-sensitive changes
5. Localize — apply `skills/app-localization` when adding or auditing translated app copy
6. Test — apply `skills/senior-qa-engineer` to ensure coverage
7. Simplify — apply `skills/code-simplification-architect` if the result is complex
8. Validate — freeze the candidate at an immutable revision, then apply `skills/validate-feature-candidate` for evidence-backed validation

In Codex CLI, reference the skill by path or name when creating a Task, e.g., "Use skills/architecture-reviewer on module X; focus on boundaries and failure modes."

## Shared Independent-Validation Contracts

The Claude `independent-validator` role and Codex `validate-feature-candidate` skill use the same v1 assignment and result contracts under `contracts/independent-validator/v1`. Assignments supply acceptance criteria, approved commands, the immutable candidate revision, repository context, constraints, and artifact paths. Results bind the canonical assignment digest and record the inspected revision, outcome, executed checks and command results, structured findings and evidence, deterministic failure signatures, and validator metadata. CLI installations also include the zero-dependency pair-level checker as `.ai-playbook/contracts/independent-validator/validate.cjs`.

`pass` means the candidate satisfies the assigned criteria, `fail` means candidate behavior violates them, and `error` means validation could not complete reliably because of an assignment, revision, infrastructure, or tooling problem. The validator must neither have implemented nor modify the candidate. `ai-playbook init` installs the contracts into `.ai-playbook/contracts/independent-validator/v1` in the target repository.

## Updating + Sanity Check

After updating rules, agents, or skills:

```bash
# Confirm symlinks resolve correctly
ls -la ~/.claude

# Optional: verify the target file exists and is readable
cat ~/.claude/CLAUDE.md | head

# If you vendored Codex skills into a project, re-sync updated skills
rsync -a /path/to/ai-playbook/Codex/skills/ /path/to/your-project/skills/
```

If a symlink is broken, it usually means you moved the repo. Put it somewhere stable and relink.

## Changelog

See `CHANGELOG.md` for version history and release notes.

## License

MIT License — See LICENSE file for details.
