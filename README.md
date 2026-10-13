# Obsidian Linker

[English](README.md) | [中文说明](README.zh-CN.md)

Obsidian-style `[[wikilinks]]` for VS Code — replicate the double-link experience in the editor and jump to Obsidian with one click.

## Features

- Type `[[` for workspace file suggestions, filtered by filename/path prefix with Markdown files first. Chinese `「「` input converts to `[[` and opens the list. Code spans and blocks are left alone; existing headings, aliases, and closing brackets are preserved.
- Preview wikilinks support a context menu (open in a new tab/to the side, copy link address); middle-click opens the link following `markdown.preview.openMarkdownLinks`. Markdown targets follow that setting: a separate Preview for `inPreview`, or a pinned editor tab for `inEditor`.

### Wikilink navigation (Ctrl/Cmd + Click)

Write Obsidian-style double links in Markdown files, then hold `Ctrl` (`Cmd` on macOS) and click to open the target note:

```markdown
[[Note Name]]
[[Note Name|Alias]]
[[Note Name#Some Heading]]
[[#Heading In This File]]
![[embedded-image.png]]
```

- Links render as clickable, with a hover card showing the resolved path plus action buttons
- Supports `#heading` anchors (auto-scrolls after opening), `#^block-id` references, `|aliases`, and percent-encoded paths
- Supports embeds `![[...]]`, including non-Markdown files such as images
- Image embeds render in editor hover cards and the built-in Markdown Preview (`Ctrl+Shift+V`). Supports PNG, JPEG, GIF, WebP, SVG, BMP, AVIF, and `![[image.png|300]]` / `![[image.png|300x200]]` sizing. Attachment lookup respects the index settings below.
- Markdown Preview also renders `[[Note]]`, `[[Note|Alias]]`, `[[Note#Heading]]`, and `[[#Heading]]` as native links. Link text uses the alias when supplied; clicks follow VS Code's Markdown Preview link behavior (`markdown.preview.openMarkdownLinks` and `markdown.links.openLocation`).
- In Markdown tables, escape the separator: `[[Note\|Alias]]` / `![[image.png\|300]]`.
- `[[...]]` inside fenced or inline code is ignored
- Unresolved links and images appear as gray, dotted-underlined labels in Preview (alias or filename), without a clickable destination; hover for workspace/path/index guidance. Editor hovers offer **Index Settings** and **Create note** when a workspace is open.

**Workspace required:** cross-file links and image previews resolve against an in-memory file index built from the open workspace folders (including multi-root workspaces). Opening a single file does not index its siblings automatically. In that case, the status bar and unresolved-link hovers offer **Open Folder**. Same-file heading links continue to work. Adding/removing workspace folders refreshes the index and Preview automatically; the index is not stored on disk.

**Note resolution** (similar to Obsidian):

1. Exact path relative to the workspace root first (with or without `.md`)
2. Then basename match across the whole workspace (case-insensitive)
3. Ties: same folder as the current file > fewer path segments > shorter path > alphabetical

The index is invalidated on file creation, deletion, rename, and workspace-folder changes, including changes made by Obsidian or other external programs. The next lookup rebuilds it; Markdown previews refresh after the rebuild.

### Image previews (new in 0.1.6)

Hover over an image embed in the source editor to see a preview, or open the built-in Markdown Preview with `Ctrl+Shift+V` (`Cmd+Shift+V` on macOS):

```markdown
![[image.png]]
![[attachments/image.png|300]]
![[image.png|300x200]]
```

- `|300` sets the width; `|300x200` sets width and height. Hover previews are limited to 640 px wide and 480 px high when dimensions are specified.
- Supports PNG, JPEG, GIF, WebP, SVG, BMP, and AVIF. Images may live in an attachment folder; explicit workspace-relative paths take precedence over matching filenames.
- Code spans and fenced code blocks stay literal. Missing or excluded images also stay literal instead of loading a raw path or remote URL.
- Keep `indexOnlyMarkdown` disabled for image previews, and ensure `indexExclude` / `indexLimit` do not omit the attachment.

### Configurable open behavior

Setting `obsidian-linker.openMode`:

| Value | Behavior |
| --- | --- |
| `default` | VS Code default: opens in the current editor group (may reuse a preview tab) |
| `newTab` | Opens a pinned (non-preview) tab in the current group |
| `split` | Opens in a split editor to the right |

Applies to Ctrl/Cmd+Click, the command, and the hover buttons. (After changing the setting, reopen the file or make an edit to refresh cached links.)

### Open in Obsidian

- Command palette: `Open in Obsidian`
- Right-click context menu in the editor
- Editor title button (top-right book icon, visible for Markdown files)
- Status bar item `$(ruby) Obsidian` (bottom-right, visible for Markdown files)
- Explorer file context menu (top navigation group)
- `Open in Obsidian` button on the link hover card

Cursor-aware behavior: triggered from the command palette or the editor context menu, it opens the **linked note** when the cursor is on a resolvable wikilink, and falls back to the current file otherwise. The editor title button, status bar item, and Explorer menu always open the current file; the hover-card button always opens the linked note.

The generated URI uses the official `open` action with an absolute, percent-encoded path:

```
obsidian://open?vault=<vaultName>&path=<absolute-file-path>
```

- `obsidian-linker.vaultName` is **optional**: when set it is included in the URI; when empty, Obsidian resolves the vault from the path automatically.
- Files inside a vault (an ancestor has a `.obsidian` directory) use the traditional `path=` format above.
- Standalone files outside a vault use Obsidian 1.14.2+'s `file=<encoded-file:-path>` format. `vaultName` is optional here too; when configured, its encoded value is included as `vault=`. Paths use forward slashes and the entire `file:D:/Apps/Su/读我.md` value is URL-encoded.

```text
obsidian://open?vault=obsinote&file=file%3AD%3A%2FApps%2FSu%2F%E8%AF%BB%E6%88%91.md
```

### Commands & shortcuts

| Command | Description | Default keybinding |
| --- | --- | --- |
| `Obsidian Linker: Open Note Under Cursor` | Open the note referenced by the wikilink at the cursor (uses `openMode`) | `Ctrl+Alt+O` (`Cmd+Alt+O` on macOS) |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `obsidian-linker.openMode` | `default` | How to open notes: `default` / `newTab` / `split` |
| `obsidian-linker.vaultName` | empty | Optional Obsidian vault name used by "Open in Obsidian" |
| `obsidian-linker.indexOnlyMarkdown` | `false` | Index only `.md` files. Saves memory for large vaults, but links to images / PDFs / canvases will not resolve |
| `obsidian-linker.indexExclude` | `[]` | Glob patterns excluded from the index, relative to the workspace root (e.g. `[".trash/**"]`). Settable per project in `.vscode/settings.json` |
| `obsidian-linker.indexLimit` | `0` | Max files to index. `0` = unlimited (memory grows with vault size, ~1KB per file). If set too low, notes beyond the limit are not indexed and their links show "Note not found" |

## Development

For testing and screenshots, open the [demo workspace](examples/obsidian-linker-demo.code-workspace) (Chinese demo vault), or the bilingual tutorial vaults under [`examples/zh`](examples/zh) / [`examples/en`](examples/en):

```bash
npm install
npm run check    # tsc --noEmit type check
npm run compile  # esbuild bundle to dist/
npm run test     # unit tests (node:test)
npm run test:host # native Markdown preview and hover integration tests
npm run watch    # watch mode
```

Press `F5` to launch the Extension Development Host for debugging. To package locally, set `publisher` / `repository` in `package.json`, then run `npx @vscode/vsce package`.

## Known limitations

- Changing `openMode` does not refresh link targets in already-open files (reopen or edit the file)
- `[[#^block-id]]` jumps to the file but not to the exact block
- Non-image transclusions (`![[note]]`, `![[file.pdf]]`, audio/video embeds) remain literal in Preview. Ordinary file links such as `[[file.pdf|PDF]]` are clickable when indexed.
- Preview heading links follow native Markdown heading IDs. Nested heading paths use the final heading name and do not disambiguate repeated titles.
- Wikilinks inside YAML frontmatter are not parsed

## Editing This Description

Edit `README.md` for the Marketplace description and `README.zh-CN.md` for the Chinese guide in the maintained checkout (`D:\Codes\vsc-obsidian-linker`). Do not edit the AI Playground archive or the installed extension directory.

Put screenshots in `docs/images/` and reference them with relative Markdown links, for example `![Image hover preview](docs/images/image-hover.png)`. The directory is included in the VSIX. Commit/push images to this repository so Marketplace relative image links can resolve, then package and upload a new VSIX to refresh the installed description.

## License

MIT
