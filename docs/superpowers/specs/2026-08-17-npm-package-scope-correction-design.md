# npm Package Scope Correction Design

## Goal

Publish version `1.2.0` as the public package
`@vadimkom/ai-playbook`, using the npm scope owned by the authenticated
`vadimkom` account.

## Context

The repository currently names the package `@vadim/ai-playbook`. The npm
`@vadim` scope belongs to a different account, so npm rejects publication even
after successful login and two-factor authentication. No version of either
package name has been published, and no `1.2.0` Git tag has been created.

## Public Interface

The canonical package and `npx` name becomes:

```text
@vadimkom/ai-playbook
```

The installed executable remains `ai-playbook`, and its commands, options,
installed files, manifests, and runtime behavior do not change.

## Repository Changes

- Change `package.json` from `@vadim/ai-playbook` to
  `@vadimkom/ai-playbook` without changing version `1.2.0`.
- Replace every repository command that names the unavailable npm package,
  including README examples and implementation records. The old scope was
  never published, so retaining it would leave unusable commands rather than
  preserve a released interface.
- Record the final public package name in the `1.2.0` changelog entry.
- Commit and push the correction on `audit-skills-and-agents` before publishing.

## Release Flow

1. Confirm the old scope no longer appears in package metadata or runnable
   repository commands. Explanatory design history may still name it.
2. Run `npm test` and a public `npm publish --dry-run`.
3. Confirm `@vadimkom/ai-playbook@1.2.0` is not already present.
4. Publish with public access and npm's interactive two-factor authentication.
5. Query the registry for the exact version, `latest` tag, package visibility,
   and executable mapping.
6. Smoke-test the published CLI from a temporary directory.
7. Create and push Git tag `1.2.0` at the verified release commit.

The Git tag is created only after registry verification. If publication fails,
the branch remains ready for another attempt and no tag claims a release that
does not exist. If publication succeeds but tagging fails, retry only the tag;
never republish the immutable npm version.

## Verification

- `npm test` reports zero failures.
- The publish dry run contains the expected package files and identifies itself
  as `@vadimkom/ai-playbook@1.2.0`.
- The registry reports `1.2.0` as `latest` with the `ai-playbook` executable.
- A clean `npx` invocation of the exact published version prints CLI help.
- Local and remote `audit-skills-and-agents` point to the release commit, and
  remote tag `1.2.0` resolves to that same commit.

## Out of Scope

This correction does not change localization wording, simplify the Codex or
Claude instruction files, add automatic consumer updates, or add automated npm
publishing.
