# Changelog

## [0.1.7] - 2026-10-12

### Added
- Note completion after `[[`, with prefix filtering and Markdown files first; Chinese `「「` input converts to `[[` and opens suggestions outside code.
- Clickable wikilinks in the built-in Markdown Preview, including aliases, encoded paths, and heading anchors.
- Preview wikilink context menus for opening in a new tab/to the side and copying the link address; middle-click opens the target following `markdown.preview.openMarkdownLinks`.
- Workspace guidance for single-file windows and missing-target feedback in Preview and editor hovers, with folder/settings actions.
- Gray link-style labels for unresolved wikilinks and image embeds in Preview, with hover explanations.

### Changed
- Shorten the open action to "Open in Obsidian" and add it to the Explorer file context menu.
- Move the editor context-menu action to the top navigation group alongside Open in Typora.
- Expand bilingual image-preview documentation and explain where to edit Marketplace copy and add screenshots.
- "Open in Obsidian" from the command palette or editor context menu is now cursor-aware: it opens the linked note when the cursor is on a resolvable wikilink, falling back to the current file. The editor title button, status bar item, and Explorer menu keep opening the current file.
- Add bilingual example vaults (`examples/zh`, `examples/en`) and a demo workspace (`examples/obsidian-linker-demo.code-workspace`) covering wikilink forms, completion practice, same-name resolution, and image embeds; excluded from the VSIX.

### Fixed
- Watch filesystem create/delete events (including external renames) to invalidate the link index and refresh Markdown preview caches.
- Open hover image targets with VS Code's native editor instead of trying to load binary images as text; enable the Obsidian action for local image files.
- Open standalone files with the encoded `file:` format and an optional destination vault; keep traditional `path=` opening for vault files.
- Rebuild the note index and refresh Preview when workspace folders are added or removed.
- Recognize escaped alias/image-size separators (`\|`) in Markdown tables.
- Middle-click in the Markdown Preview opens the target without blanking the preview; the unreachable URI-bridge navigation was removed.
- Reopen note suggestions whenever the cursor sits right after `[[`, including after deleting back into a filled link, and recognize IME-committed `「「` input.
- Localize workspace guidance, missing-target messages, and action buttons by VS Code display language (English/Chinese).
## [0.1.6] - 2026-10-12

### Added
- Image previews for Obsidian embeds in editor hover cards and the built-in Markdown Preview.
- Image width and height syntax (`![[image.png|300]]`, `![[image.png|300x200]]`).
- Markdown rendering regression tests and a VS Code extension-host smoke test.

### Fixed
- Hover paths are displayed relative to the workspace folder.

### Changed
- Image previews reuse the 0.1.5 index settings (`indexOnlyMarkdown`, `indexExclude`, `indexLimit`). The default index remains unlimited.
