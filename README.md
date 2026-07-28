<p align="center"> <img src="assets/banner.png?v=3" alt="ai-playbook banner" /> </p>

Shared AI coding workflows for
[Claude Code](https://code.claude.com/docs/en/overview) and
[Codex](https://developers.openai.com/codex/).

The playbook uses a hybrid model:

- **Skills** contain reusable methods, guardrails, and output contracts.
- **Agents** preload those skills in isolated contexts with task-appropriate
  permissions.
- **Project instructions** contain durable repository-wide expectations.

## Structure

```text
.agents/skills/             # Canonical, platform-neutral skill sources
Claude/
  CLAUDE.md                 # Claude project guidance
  agents/                   # Thin Claude agent adapters
Codex/
  AGENTS.md                 # Codex project guidance
  agents/                   # Thin Codex custom-agent adapters
contracts/
  independent-validator/    # Shared validation schemas and examples
templates/
  common/                   # features.md and evals.md starters
  profiles/                 # Stack-specific guidance
```

The canonical skill collection includes architecture review, code review, QA,
independent candidate validation, red-team analysis, simplification, GitHub
Actions, DevOps, mobile engineering, and app localization.

## Quick Start

Install into a target repository:

```bash
# Codex
npx @vadim/ai-playbook init --agent codex

# Claude Code
npx @vadim/ai-playbook init --agent claude

# Both
npx @vadim/ai-playbook init --agent both
```

Native destinations are installed automatically:

| Mode | Skills | Agents | Instructions |
|------|--------|--------|--------------|
| `codex` | `.agents/skills/` | `.codex/agents/` | `AGENTS.md` |
| `claude` | `.claude/skills/` | `.claude/agents/` | `CLAUDE.md` |
| `both` | Both skill trees | Both agent trees | Both files |

Every mode also installs `features.md`, `evals.md`, selected stack profiles,
and the independent-validator contracts under
`.ai-playbook/contracts/independent-validator/`.

Existing files are preserved unless `--force` is supplied.

## Profiles

The CLI detects supported stacks or accepts explicit profiles:

```bash
npx @vadim/ai-playbook profiles
npx @vadim/ai-playbook init --profile frontend-react --agent both
npx @vadim/ai-playbook init --profile mobile-ios --agent codex
```

Available profiles:

- `frontend-react`
- `backend-python`
- `backend-rust`
- `mobile-ios`
- `mobile-android`

## Skills and Agents

Use a skill directly when the workflow should stay in the current
conversation. Use an agent adapter when the task benefits from independent
criticism, parallel work, a smaller context, noisy-output isolation, or
restricted permissions.

| Skill | Agent adapter | Typical use |
|-------|---------------|-------------|
| `architecture-reviewer` | `architecture-reviewer` | Pre-implementation design review |
| `senior-code-reviewer` | `senior-code-reviewer` | Read-only change review |
| `red-team-analyst` | `red-team-analyst` | Adversarial security analysis |
| `senior-qa-engineer` | `senior-qa-engineer` | Test strategy and implementation |
| `validate-feature-candidate` | `independent-validator` | Independent immutable-revision validation |
| `code-simplification-architect` | `code-simplification-architect` | Behavior-preserving refactoring |
| `github-actions-engineer` | `github-actions-engineer` | CI workflow engineering |
| `devops-engineer` | — | Infrastructure and delivery |
| `mobile-engineer` | — | Mobile platform work |
| `app-localization` | — | Localization and translation resources |

Reviewer agents are non-editing. QA, simplification, and GitHub Actions agents
may edit the workspace when implementation is requested.

Independent validation must run through a fresh `independent-validator` agent.
Invoking `validate-feature-candidate` in the implementing conversation provides
the method but does not create independence.

## Workflow

1. Plan significant work with `architecture-reviewer`.
2. Implement in the main conversation or a scoped writer agent.
3. Delegate code review to `senior-code-reviewer`.
4. Use `red-team-analyst` for security-sensitive changes.
5. Use `senior-qa-engineer` for test gaps or flaky checks.
6. Simplify when complexity remains.
7. Freeze the candidate and use a fresh `independent-validator`.

## Doctor and Legacy Migration

Verify an installation:

```bash
npx @vadim/ai-playbook doctor --agent codex
npx @vadim/ai-playbook doctor --agent both
```

`doctor` checks the layout-v2 manifest, every installed skill and agent,
managed validator integrity, and capability metadata.

Versions before layout v2 installed Codex skills under `Codex/skills/`, which
Codex does not auto-discover as repository skills. Rerun `init --agent codex`
to install native `.agents/skills/` copies. Legacy files are retained and never
deleted automatically.

## Independent-Validation Contracts

The `independent-validator` agents and `validate-feature-candidate` skill share
the versioned assignment and result contracts under
`contracts/independent-validator/v1`.

Assignments bind acceptance criteria, approved commands, immutable revisions,
constraints, and artifact paths. Results record revision evidence, executed
checks, command results, findings, evidence, deterministic failure signatures,
and validator metadata.

- `pass`: all assigned criteria and checks conclusively pass.
- `fail`: candidate behavior conclusively violates an assigned criterion.
- `error`: validation is incomplete or untrustworthy because of assignment,
  revision, cleanliness, infrastructure, or evidence problems.

The installed zero-dependency checker is
`.ai-playbook/contracts/independent-validator/validate.cjs`.

## Development

```bash
npm test

# Test the CLI locally from another repository
npm link
ai-playbook init --agent both
```

The tests cover native installation layouts, legacy migration, file
preservation, doctor integrity checks, skill metadata and activation fixtures,
agent permissions, and independent-validator contracts.

## License

MIT — see [LICENSE](LICENSE).
