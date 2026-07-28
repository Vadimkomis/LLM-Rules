---
name: app-localization
description: Creates, reviews, and maintains app localization across iOS, Android, web, and cross-platform apps. Use when extracting user-facing strings, adding locale files, translating app copy, validating placeholders/plurals, auditing missing translations, or making UI safe for multiple languages.
---

# App Localization

Localize app UI without breaking formatting, placeholders, plural rules, accessibility labels, or platform conventions.

## Workflow

1. Confirm scope: target platform, source language, target locales, and whether translations should be provided now or only scaffolded.
2. Inspect the app's existing localization system before adding files or helpers.
3. Extract only user-facing strings. Do not localize identifiers, analytics events, log messages, API values, test fixture keys, or developer-only debug text unless requested.
4. Preserve interpolation placeholders, markdown/link syntax, keyboard shortcuts, product names, legal text, and branded terminology exactly unless the user provides approved wording.
5. Add or update locale resources using the platform's native format and existing naming conventions.
6. Replace hardcoded UI strings with localized lookups at the view boundary, keeping business logic and storage formats locale-neutral.
7. Validate missing keys, placeholder parity, plural/category coverage, and UI layout risk for longer translated strings.

## Platform Defaults

### iOS

- Prefer String Catalogs (`.xcstrings`) for modern SwiftUI/UIKit projects when already used or when adding localization from scratch.
- Use `Localizable.strings` / `.stringsdict` when the project already uses them.
- Keep SwiftUI code readable with `Text("key")` only when the key is stable and the project already uses implicit lookup; otherwise use explicit localized string helpers.
- Preserve `%@`, `%d`, `%lld`, `%f`, `%#@...@`, and Swift interpolation behavior.
- Add tests for localization key loading, Codable locale-neutral models, and formatter output where business logic depends on locale.

### Android

- Use `res/values/strings.xml` for the base locale and `res/values-<locale>/strings.xml` for translations.
- Use `<plurals>` for quantities and keep `%1$s`, `%2$d`, and `formatted="false"` behavior intact.
- Do not concatenate translated sentence fragments in UI code; use complete localized strings with placeholders.
- Add screenshot or UI checks for strings likely to expand significantly.

### Web

- Follow the existing i18n library and resource layout (`next-intl`, `react-i18next`, `FormatJS`, framework routes, or project-specific JSON).
- Keep route slugs, SEO metadata, and server/client boundaries consistent with the framework.
- Preserve ICU syntax (`{count, plural, ...}`), rich-text tags, and interpolation variable names exactly.
- Add tests for missing keys, fallback behavior, and pluralized copy when the project has i18n test infrastructure.

### Cross-Platform

- For Flutter, prefer ARB files and generated localization classes.
- For React Native, follow the existing JS/TS i18n setup and platform resource bridge if present.
- For shared domain packages, keep localized presentation text out of core business logic.

## Translation Rules

- Ask before using machine translation for production copy if the user has not explicitly requested it.
- For production translations, flag copy that needs native-speaker review, legal review, App Store review, or brand approval.
- Translate meaning, not code structure. Keep tone consistent with the existing product voice.
- Preserve placeholders and variable names exactly. If a placeholder needs different ordering, use the platform's positional placeholder syntax.
- Use locale-aware formatters for dates, times, numbers, percentages, currency, lists, and measurement units.
- Avoid embedding formatted numbers or dates inside translation files unless the platform explicitly supports it.

## QA Checklist

- Source locale and all target locales contain the same required keys.
- Placeholder names/counts/types match across locales.
- Plurals cover required locale categories.
- Empty, fallback, and unsupported locale behavior is intentional.
- Long translations do not truncate, overlap, or break critical controls.
- Accessibility labels, hints, error messages, paywall copy, onboarding, notifications, and permission prompts are covered.
- Tests or scripts validate localization resources where practical.

## Output

Provide:

1. Locales added or updated
2. Files and key groups changed
3. Placeholder/plural validation performed
4. Tests run and any UI/layout risks
