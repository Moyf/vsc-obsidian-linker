# Changelog

## [0.1.6] - 2026-10-12

### Added
- Image previews for Obsidian embeds in editor hover cards and the built-in Markdown Preview.
- Image width and height syntax (`![[image.png|300]]`, `![[image.png|300x200]]`).
- Markdown rendering regression tests and a VS Code extension-host smoke test.

### Fixed
- Hover paths are displayed relative to the workspace folder.

### Changed
- Image previews reuse the 0.1.5 index settings (`indexOnlyMarkdown`, `indexExclude`, `indexLimit`). The default index remains unlimited.
