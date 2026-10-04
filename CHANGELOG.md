# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.2.3] - 2026-10-04

### Added

- Save up to 10 shared email patterns, with a selector, update, save-as-new and delete controls.
- Preserve the current email pattern when upgrading to saved formats.
- Show unsaved edits and keep them separate from the pattern used for generation.

### Changed

- Link the popup GitHub icon and extension homepage to the Teda9 fork.
- Keep long email domains from squeezing the pattern editor and allow the popup to scroll.
- Avoid rewriting unchanged synced settings when opening the popup.
- Run format migration and selection tests in the automatic release workflow.

## [0.2.2] - 2026-09-27

### Added

- Save multiple email domains and switch between them from the popup.
- Migrate the existing email format and keep its local-part pattern when switching domains.

## [0.2.1]

### Fixed

- Fix closure over email format by @simplycpu #8
- Replace all instances of `[domain]` by @simplycpu #5
- Fix text overlaps with flame icon by @simplycpu #6

### Removed

- Skiff components in favor of supporting multi-services by @pabloscloud #10

## [0.2.0] - 2023-11-28

### Added

- Option to disable on-page email generation.
- Option to exclude specific pages from being shown on-page email generation.

### Changed

- Revise UI to accommodate new options tab.
- General Improvements.
- Upgrade dependencies.
- Refactor storage code.
- Refactor store constants.
- Revise footer note to keep it minimal.
- Switch toaster to react-hot-toast.

### Removed

- Credit link from footer.

## [0.1.0] - 2023-11-16

### Fixed

- Font family to maintain consistency across all browsers.
- On-page email generation content script to use email format and correctly inject icon.

### Changed

- Improve primary domain parsing.
- Storage code to use a shared instance.
- Separate footer into its own component.
- Extension title to be consistent with extension name.
- Extension description to be consistent with extension listing.
- Upgrade dependencies.

## [0.0.1] - 2023-11-11

- Release of something awesome.

[unreleased]: https://github.com/Teda9/email-masker/commits/main
[0.2.3]: https://github.com/Teda9/email-masker/releases
[0.2.2]: https://github.com/Teda9/email-masker/compare/0.2.1...v0.2.2-build.1
[0.2.1]: https://github.com/irazasyed/email-masker/compare/0.2.0...0.2.1
[0.2.0]: https://github.com/irazasyed/email-masker/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/irazasyed/email-masker/compare/0.0.1...0.1.0
[0.0.1]: https://github.com/irazasyed/email-masker/releases/tag/0.0.1
