# Check Command Rename Design

## Goal

Make the installation diagnostic command immediately understandable by using
`check` as its canonical public name while preserving existing `doctor` calls.

## Public Interface

The canonical command becomes:

```bash
ai-playbook check [options]
```

`ai-playbook doctor [options]` remains a deprecated compatibility alias. It runs
the identical checks, preserves the same stdout and exit code, and writes this
single warning to stderr before running:

```text
Warning: 'doctor' is deprecated; use 'check'.
```

The alias has no scheduled removal. Removing it requires a separate major-version
decision.

## Implementation

- Rename the internal diagnostic function from `runDoctor` to `runCheck`.
- Route `check` directly to `runCheck`.
- Route `doctor` to the same function after emitting the deprecation warning.
- Make `check` the primary command in CLI help and active README examples.
- Retain `doctor` in help only as a labeled deprecated alias.
- Update the active migration scenario in root `features.md` to name
  `ai-playbook check --agent codex` explicitly.
- Add an Unreleased changelog entry for the new command and deprecated alias.
- Leave historical changelog entries and completed design/implementation records
  unchanged because they accurately describe the command at that time.

This command migration does not include the broader agent-adapter, validator, or
feature-status wording cleanup, and it does not include the pending localization
activation-fixture change.

## Behavior and Errors

`check` keeps the current diagnostic behavior: it prints `OK`, `MISS`, `BAD`, and
legacy-layout warnings to stdout and returns `0` only when every required check
passes. The deprecated alias returns exactly the same result. Unknown commands
continue to print an error and help text and return `1`.

## Verification

- Add tests that fail before implementation for canonical `check` help and
  dispatch.
- Verify a healthy installation returns `0` through `check`.
- Verify a corrupted installation returns `1` through `check`.
- Verify `doctor` still performs the checks, returns the same exit code, and emits
  the exact deprecation warning on stderr.
- Run `npm test` after the JavaScript changes.
- Smoke-test `init`, `check`, and the deprecated alias in a temporary project.

## Compatibility

No options, diagnostics, manifests, installed files, or validation semantics
change. Existing automation using `doctor` continues to work, while new usage and
documentation direct users to `check`.
