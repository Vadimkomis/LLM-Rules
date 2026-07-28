# Features (Gherkin)

Feature: Claude Code integration

  Scenario: CLAUDE.md Macro
    Given the repository includes the Claude Code baseline guidelines
    When a new project is initialized
    Then universal development rules are available through CLAUDE.md
    And the status is "completed"

  Scenario: Settings Configuration
    Given Claude Code is configured for project use
    When security and tooling settings are applied
    Then permission controls, status line settings, and LSP plugins are configured
    And the status is "completed"

  Scenario: Status Line Display
    Given Claude Code is running in the repository
    When the status line is rendered
    Then it shows directory, git branch and status, model, output style, and context window usage
    And the status is "completed"

  Scenario: Architecture Reviewer Agent
    Given implementation work is being planned
    When the architecture reviewer is used
    Then design trade-offs and structural risks are evaluated before coding
    And the status is "completed"

  Scenario: Senior Code Reviewer Agent
    Given implementation work has been completed
    When the senior code reviewer is used
    Then bugs, security issues, performance risks, and maintainability concerns are identified
    And the status is "completed"

  Scenario: Senior QA Engineer Agent
    Given test strategy is required
    When the senior QA engineer is used
    Then coverage analysis, test design, TDD workflows, and flaky test debugging are supported
    And the status is "completed"

  Scenario: Independent Validator Agent
    Given a feature candidate is frozen at an immutable revision
    When the independent validator is assigned approved validation work
    Then a validator who did not implement the candidate checks that revision without modifying it and returns evidence-backed results
    And the status is "completed"

  Scenario: Code Simplification Architect Agent
    Given existing code is complex or hard to maintain
    When the code simplification architect is used
    Then nested logic is simplified, large classes are decomposed, and duplication is reduced
    And the status is "completed"

  Scenario: GitHub Actions Engineer Agent
    Given CI/CD workflows need to be created or improved
    When the GitHub Actions engineer is used
    Then workflows are created, debugged, and optimized
    And the status is "completed"

  Scenario: Red Team Analyst Agent
    Given security-sensitive code has been implemented
    When the red team analyst is used
    Then an adversarial review simulates how a hacker would break, exploit, or abuse the system
    And the status is "completed"

Feature: Codex integration

  Scenario: AGENTS.md
    Given Codex is used in this repository
    When project macro rules are needed
    Then AGENTS.md provides a Codex-compatible mirror of CLAUDE.md
    And the status is "completed"

  Scenario: Architecture Reviewer Skill
    Given significant implementation changes are being considered
    When the architecture reviewer skill is used
    Then boundaries, design options, and migration strategy are validated
    And the status is "completed"

  Scenario: Senior Code Reviewer Skill
    Given code changes are ready for review
    When the senior code reviewer skill is used
    Then diffs are inspected and findings are prioritized by severity
    And the status is "completed"

  Scenario: Senior QA Engineer Skill
    Given verification planning is needed
    When the senior QA engineer skill is used
    Then test matrices and coverage gaps are assessed with flaky test triage
    And the status is "completed"

  Scenario: Validate Feature Candidate Skill
    Given a Codex feature candidate is frozen at an immutable revision
    When the validate feature candidate skill is used by an independent validator
    Then approved checks produce a structured, evidence-backed result without changing the candidate
    And the status is "completed"

  Scenario: Code Simplification Architect Skill
    Given refactoring is needed without changing behavior
    When the code simplification architect skill is used
    Then complexity hotspots are identified and safe simplifications are applied
    And the status is "completed"

  Scenario: GitHub Actions Engineer Skill
    Given GitHub Actions workflows are part of delivery
    When the GitHub Actions engineer skill is used
    Then workflow syntax, permissions, performance, and failure diagnostics are improved
    And the status is "completed"

  Scenario: DevOps Engineer Skill
    Given infrastructure and deployment workflows are required
    When the devops engineer skill is used
    Then IaC, container orchestration, deployment automation, and observability are supported
    And the status is "completed"

  Scenario: Mobile Engineer Skill
    Given mobile product work is in scope
    When the mobile engineer skill is used
    Then iOS and Android workflows, lifecycle behavior, offline behavior, and performance are addressed
    And the status is "completed"

  Scenario: App Localization Skill
    Given app localization work is required
    When the app localization skill is used
    Then string extraction, translation resources, placeholders, plurals, and layout validation are handled
    And the status is "completed"

Feature: Independent feature validation

  Scenario: Tool-neutral versioned contracts and outcome semantics
    Given Claude and Codex validators share versioned assignment and result contracts
    When an immutable feature candidate is independently validated
    Then the canonical assignment digest, assigned and inspected revisions, checks, command results, findings, evidence, failure signatures, and validator metadata are recorded
    And pass means the acceptance criteria are satisfied, fail means the candidate violates them, and error means validation could not complete reliably
    And the status is "completed"

Feature: Hybrid skills and agents

  Scenario: Install skills into native discovery paths
    Given the playbook contains platform-neutral workflow skills
    When a project is initialized for Codex, Claude, or both
    Then skills are installed under each selected platform's native project path
    And all selected skills are available for direct or implicit invocation
    And the status is "completed"

  Scenario: Install thin platform agent adapters
    Given a workflow benefits from isolation, delegation, or constrained permissions
    When a project is initialized
    Then platform-native agents load the corresponding shared skills
    And reviewer agents remain non-editing
    And writer agents receive explicit workspace scope
    And the status is "completed"

  Scenario: Preserve compatibility during layout migration
    Given an older installation contains Codex skills under Codex/skills
    When the installation is diagnosed or initialized again
    Then doctor reports the non-native legacy layout
    And init installs native copies without deleting legacy or user-owned files
    And the status is "completed"

  Scenario: Require a fresh independent validator
    Given an implementing conversation loads the validation workflow
    When an independence-attested result is required
    Then validation runs through a fresh independent-validator agent
    And the implementing conversation does not attest its own independence
    And the status is "completed"

Feature: Documentation and metadata

  Scenario: README
    Given contributors need setup and usage documentation
    When they open the repository README
    Then setup instructions, structure, and getting started guidance are available
    And the status is "completed"

  Scenario: CHANGELOG
    Given release history needs to be tracked
    When contributors review version history
    Then the changelog records project versions and notable changes
    And the status is "completed"

  Scenario: Repository Assets
    Given repository branding artifacts are required
    When GitHub surfaces the project visually
    Then banner and social preview assets are available
    And the status is "completed"

  Scenario: MIT License
    Given users need licensing terms
    When they inspect repository licensing
    Then MIT license terms are provided
    And the status is "completed"
