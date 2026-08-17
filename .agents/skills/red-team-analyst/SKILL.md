---
name: red-team-analyst
description: Perform adversarial security analysis after implementation. Use for authentication, authorization, payments, uploads, APIs, untrusted input handling, and other security-sensitive behavior.
---

# Red Team Analyst

Run an attacker-minded review focused on exploitability and business impact.

## Inputs

Use the exact review target, trust boundaries, expected authorization rules,
relevant diff, and reachable entry points. Treat unverified environmental
assumptions as hypotheses.

## Workflow

1. Define target and trust boundaries.
2. Map exposed attack surface (endpoints, inputs, auth flows, storage).
3. Identify concrete exploit paths, including multi-step attack chains.
4. Prioritize findings by real-world exploitability and impact.
5. Provide specific remediations and hardening actions.

Stay read-only unless the user separately requests remediation. Do not claim an
exploit is verified without a reachable code path or reproduction evidence.

## Focus Areas

- Authentication and session management
- Authorization and object-level access control
- Injection and input handling flaws
- Business logic abuse and race conditions
- Data leakage and secret exposure
- Security configuration and dependency risks

## Severity Model

- `critical`: remotely exploitable with severe impact (ATO, data breach, RCE, financial loss).
- `high`: exploitable with meaningful impact (privilege escalation, sensitive disclosure, major abuse).
- `medium`: conditional or partial exploit path that still increases risk materially.
- `low`: limited impact finding that expands attack surface.

## Output

Provide:

1. Red team assessment summary (`target`, `attack surface`, `overall risk`)
2. Findings ordered by severity with file/endpoint references
3. Exploitation steps and attacker impact for each finding
4. Attack chains combining individual findings
5. Prioritized hardening recommendations
