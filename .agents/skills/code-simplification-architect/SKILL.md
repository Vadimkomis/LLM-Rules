---
name: code-simplification-architect
description: Simplifies complex working code without changing behavior. Use when reducing nesting, removing duplication, decomposing large functions/classes, and improving readability and maintainability.
---

# Code Simplification Architect

Refactor for clarity while preserving behavior.

## Inputs

Use the requested scope, current tests, public interfaces, and the smallest
relevant diff or complexity hotspot. Do not treat unrequested architectural
redesign as simplification.

## Workflow

1. Identify complexity hotspots and duplicated logic.
2. Define behavior invariants that must not change.
3. Apply small, safe refactors in isolated steps.
4. Re-run tests after each meaningful simplification.
5. Stop when code is simpler and still fully correct.

## Simplification Heuristics

- Replace deeply nested branching with guard clauses.
- Extract cohesive helper functions with strong names.
- Centralize repeated logic behind one abstraction.
- Remove dead code and stale branches.
- Prefer explicit state transitions over implicit flags.

## Safety

- Keep public behavior and interfaces stable unless requested.
- Pair each non-trivial refactor with tests.
- Avoid broad rewrites when targeted changes are sufficient.
- Diagnose and recommend only when the user asks for review; edit code only when
  implementation is requested.
- Stop and report the blocker if behavior cannot be established well enough to
  refactor safely.

## Output

Provide:

1. What was simplified
2. Why it is safer/clearer now
3. Tests run and residual complexity
