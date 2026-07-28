# Development Guidelines (Codex Mirror)

> **Source of truth:** `../Claude/CLAUDE.md`.
> This file should stay as close as possible to `../Claude/CLAUDE.md`, with one intentional difference: this file uses Codex `skills/` instead of Claude subagents.

This file mirrors the macro development rules for Codex CLI usage (open-source agentic coding interface; not the legacy OpenAI Codex model).

### Setup for new projects

1. Use `../Claude/CLAUDE.md` as the macro source of truth — use this `AGENTS.md` as the Codex mirror
2. Create an `AGENTS.md` in the project root as the Codex mirror
3. Keep this `AGENTS.md` aligned with `../Claude/CLAUDE.md`; do not diverge except for the skills/agents adaptation
4. Create a `features.md` in the project root — this is the **single source of truth** for all features (see [Feature Tracking](#feature-tracking) below)
5. Create an `evals.md` in the project root — this is the **single source of truth** for project eval contracts (see [Evals](#evals) below)
6. Set up a linter configuration appropriate to the project's language(s)

---

## Feature Tracking

Every project **must** have a `features.md` file at the repo root. This file is the **single source of truth** for all features in the project.

### Rules

- **Create `features.md` at project inception** — it should be one of the first files in any new project
- **Always consult `features.md` before implementing** — check existing features, their status, and how new work fits in
- **Update `features.md` whenever features change** — adding, modifying, or removing a feature must be reflected here
- **Write `features.md` in Gherkin style** — use `Feature:`, `Scenario:`, `Given`, `When`, and `Then` to describe behavior from the user's perspective
- **Never contradict `features.md`** — if code and `features.md` disagree, align the code to the spec (or update the spec first with the user's approval)

### Structure (Gherkin)

Features are organized using Gherkin syntax:

```gherkin
Feature: <domain or category>

  Scenario: <feature name>
    Given <precondition or context>
    When <action or trigger>
    Then <expected outcome or behavior>
    And the status is "<planned|in-progress|completed|deprecated>"
```

- **Feature** — groups related scenarios under a domain (e.g., `Feature: Authentication`)
- **Scenario** — one per feature; the scenario name is the feature name
- **Given/When/Then** — describes the feature from the user's perspective
- **Status** — tracked as `And the status is "..."` on the last line of each scenario

The exact format can be adapted per project, but every entry must at minimum have a name, status, and description.

---

## Evals

Every project **must** have an `evals.md` file at the repo root. This file is the **single source of truth** for eval contracts and their automated test mappings.

Test runners and CI are the authoritative source for pass/fail results. Do not manually record transient eval statuses in `evals.md`.

### Rules

- **Create `evals.md` at project inception** — it should be one of the first files in any new project
- **Always consult `evals.md` before implementing** — verify existing eval scenarios and identify gaps
- **Update `evals.md` whenever behavior changes** — new features, bug fixes, and behavioral changes must update eval definitions and test mappings
- **Never contradict `evals.md`** — if implementation and eval spec drift, align code to the spec (or update the spec first with the user's approval)
- When I report a bug, don't start by trying to fix it. Instead, start by writing a test that reproduces the bug. Then have subagents try to fix the bug and prove it with a passing test.

### Structure

Each eval entry should include:

- **Eval name** — short, descriptive title
- **Description** — what behavior is validated and why it matters
- **Test mapping** — automated test files or cases that enforce the contract, or the target feature/PR that will add them
- **Notes** — relevant fixtures, thresholds, datasets, and execution details

The exact format can be adapted per project, but every eval entry must at minimum have a name, description, and test mapping. Do not include a manually maintained status field.

---

## Workflow

### Pre-Commit Requirements

1. **Run the project's linter** before committing any code changes
2. Fix all errors before committing (warnings are acceptable but should be minimized)
3. **Run tests and ensure they pass before committing**
4. **Commit and push changes automatically after all tests pass locally** — do not ask for permission

**IMPORTANT:** Do not ask for permission to run linters, tests, commit, or push. Run them automatically — commit and push when tests pass.

### Code Review Checklist

- [ ] Linter passes (mandatory)
- [ ] Unit tests added/updated for all changes (mandatory)
- [ ] Tests pass before committing
- [ ] Update `features.md` when changing user-facing behavior
- [ ] Heavy work runs off the main/UI thread
- [ ] UI updates happen on the main/UI thread
- [ ] Errors are typed and have user-facing descriptions
- [ ] No hardcoded secrets or credentials
- [ ] No force unwraps, unchecked casts, or unsafe access in production code
- [ ] No strong reference cycles in closures or callbacks
- [ ] Delete unused or obsolete files when your changes make them irrelevant

---

## Code Organization

### General Principles

- Each function/method should do one thing well
- Maximum function length: ~30 lines — break longer functions into smaller, named steps
- Keep files focused on a single responsibility
- Use consistent naming conventions across the project
- Prefer composition over inheritance

### Separation of Concerns

- **UI layer**: Rendering and user interaction only — no business logic
- **Business logic layer**: Domain rules, orchestration, state management — no UI or infrastructure dependencies
- **Data/Infrastructure layer**: Persistence, networking, external integrations — abstracted behind interfaces
- Each layer should be independently testable

### State Management

- Use explicit state representations (enums, discriminated unions, finite state machines) over multiple boolean flags
- One source of truth per piece of state — avoid duplicated or derived state that can drift
- Prefer unidirectional data flow where applicable

### Dependency Management

- Dependencies should flow inward (UI -> Business Logic -> Data)
- Use dependency injection over hard-coded instantiation
- Depend on abstractions (protocols, interfaces, traits) not concrete implementations at layer boundaries

---

## Error Handling

- Never silently catch errors without proper handling
- Define domain-specific error types with user-facing descriptions
- Log meaningful error messages with context
- Validate inputs at system boundaries (user input, external APIs)
- Prefer graceful degradation over crashing — return valid empty states for "no data" scenarios
- Error boundaries should exist at layer transitions

---

## Security

- Never hardcode sensitive information (API keys, passwords, tokens)
- Sanitize user inputs to prevent injection attacks (SQL, XSS, command injection)
- Validate all external data before processing
- Implement proper authentication and authorization checks
- Follow the principle of least privilege

---

## Performance

- Never block the main/UI thread with heavy computation
- Run expensive work on background threads/queues/coroutines
- UI updates must happen on the main/UI thread only
- Cache expensive operations where appropriate
- Minimize nested loops — be aware of algorithmic complexity
- Be mindful of memory usage and potential leaks
- Progress/animation should be independent of computation work

---

## Testing

### Coverage Requirements

**Every code change MUST include corresponding unit tests.** Aim for as close to 100% coverage of business logic as possible.

1. **New code**: Write tests for all new functions, methods, and types
2. **Modified code**: Update existing tests to reflect changes; add tests for new behavior
3. **Bug fixes**: Add a regression test that would have caught the bug
4. **No exceptions**: If tests don't exist for code you're modifying, add them

**IMPORTANT:** Do not ask for permission to run tests. Just run them automatically when needed.

### Test Structure

- Follow Arrange-Act-Assert (AAA) pattern consistently
- One logical assertion per test when possible
- Descriptive test names that explain the scenario and expected outcome
- Group tests logically by functionality
- Separate unit, integration, and end-to-end tests

### Test Quality

- Test behavior and outcomes, not implementation details
- Cover the happy path, error paths, and edge cases
- Each test should be independent — no shared mutable state between tests
- Mock external dependencies consistently
- Keep tests fast and deterministic — no reliance on timing, network, or randomness
- Use fixed test data, not random generators

### Edge Cases to Always Consider

- Empty collections, zero values, maximum values, off-by-one
- Null/nil/undefined states and missing data
- Division by zero, NaN, infinity, negative numbers where positive expected
- Race conditions and state mutations during async operations
- Invalid state transitions, interrupted operations, partial completions
- Malformed input, unexpected types, truncated data
- Serialization round-trips (encode/decode consistency)

---

## Documentation

- Document the "why", not the "what" — code should be self-explanatory
- Only add comments where the logic isn't self-evident
- Document complex algorithms, thresholds, and non-obvious configuration choices
- Add TODOs for incomplete code with ticket numbers if applicable
- Don't add docstrings or comments to code you didn't change

---

## Skills

Use reusable Codex skills (stored under `skills/`) for targeted work and portability across projects.

| Skill | When to use |
|-------|-------------|
| `architecture-reviewer` | **Before** implementing significant changes — validates design, evaluates trade-offs, catches structural issues early |
| `senior-code-reviewer` | **After** completing a feature or logical chunk of code — reviews for bugs, security, performance, and maintainability |
| `red-team-analyst` | For adversarial security review of auth, permissions, payments, uploads, APIs, and other high-risk attack surfaces |
| `senior-qa-engineer` | When you need test coverage analysis, test case design, TDD workflows, or flaky test debugging |
| `validate-feature-candidate` | **After** a feature candidate is frozen at an immutable revision — independently runs approved checks without modifying the candidate and returns an evidence-backed pass, fail, or error result |
| `code-simplification-architect` | When code works but is messy — simplifies nested logic, breaks down god classes, eliminates duplication |
| `github-actions-engineer` | For creating, debugging, or optimizing GitHub Actions workflows and CI/CD pipelines |
| `devops-engineer` | When designing infrastructure and delivery beyond GitHub Actions — IaC, cloud provisioning, containers/Kubernetes, environments, and observability |
| `mobile-engineer` | When building mobile features or fixing platform issues — handles UI flows, lifecycle, offline behavior, performance, and device-specific bugs |
| `app-localization` | When adding, auditing, or validating app localization, translated copy, string catalogs, and locale coverage |

### Usage pattern

1. **Plan** — apply `skills/architecture-reviewer` to validate the approach
2. **Implement** — write the code
3. **Review** — apply `skills/senior-code-reviewer` to catch issues
4. **Attack** — apply `skills/red-team-analyst` for security-sensitive changes
5. **Localize** — apply `skills/app-localization` when adding or auditing translated app copy
6. **Test** — apply `skills/senior-qa-engineer` to ensure coverage
7. **Simplify** — apply `skills/code-simplification-architect` if the result is complex
8. **Validate** — freeze the candidate at an immutable revision, then apply `skills/validate-feature-candidate` for evidence-backed validation
