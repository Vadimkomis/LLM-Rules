# App Localization Activation Fixture Design

## Problem

The direct `app-localization` activation example names only French, German, and
iOS. Although the skill itself supports arbitrary target locales across iOS,
Android, web, and cross-platform apps, the example can be mistaken for a scope
restriction.

## Design

Replace the direct activation prompt with:

> Use app-localization to add resources for every requested locale in this app.

The example remains an explicit skill invocation while becoming independent of
specific languages and platforms. The other activation examples and the skill
instructions remain unchanged.

## Verification

- Confirm the fixture remains valid JSON and retains the required `direct`,
  `indirect`, `incomplete`, and `negative` fields.
- Run the focused capability test and the full `npm test` suite.
- Parse the fixture directly and confirm its `direct` prompt exactly matches the
  approved locale- and platform-neutral wording.

## Scope

This change updates only the misleading activation example and its design and
implementation records. It adds no dependencies and does not alter localization
behavior.
