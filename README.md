# Obsidian Linker

[English](README.md) | [中文说明](README.zh-CN.md)

Obsidian-style `[[wikilinks]]` for VS Code — replicate the double-link experience in the editor and jump to Obsidian with one click.

## Features

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
- `[[...]]` inside fenced or inline code is ignored
- Unresolved links offer a one-click **Create note** action on hover

**Note resolution** (similar to Obsidian):

1. Exact path relative to the workspace root first (with or without `.md`)
2. Then basename match across the whole workspace (case-insensitive)
3. Ties: same folder as the current file > fewer path segments > shorter path > alphabetical

### Configurable open behavior

Setting `obsidian-linker.openMode`:

| Value | Behavior |
| --- | --- |
| `default` | VS Code default: opens in the current editor group (may reuse a preview tab) |
| `newTab` | Opens a pinned (non-preview) tab in the current group |
| `split` | Opens in a split editor to the right |

Applies to Ctrl/Cmd+Click, the command, and the hover buttons. (After changing the setting, reopen the file or make an edit to refresh cached links.)

### Open in Obsidian

- Command palette: `Obsidian Linker: Open Current File in Obsidian`
- Editor title button (top-right book icon, visible for Markdown files)
- Status bar item `$(book) Obsidian` (bottom-right, visible for Markdown files)
- Right-click context menu
- `Open in Obsidian` button on the link hover card

The generated URI uses the official `open` action with an absolute, percent-encoded path:

```
obsidian://open?vault=<vaultName>&path=<absolute-file-path>
```

- `obsidian-linker.vaultName` is **optional**: when set it is included in the URI; when empty, Obsidian resolves the vault from the path automatically.
- Per Obsidian docs the `file` parameter is vault-relative, so absolute paths use the `path` parameter instead.

### Commands & shortcuts

| Command | Description | Default keybinding |
| --- | --- | --- |
| `Obsidian Linker: Open Note Under Cursor` | Open the note referenced by the wikilink at the cursor (uses `openMode`) | `Ctrl+Alt+O` (`Cmd+Alt+O` on macOS) |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `obsidian-linker.openMode` | `default` | How to open notes: `default` / `newTab` / `split` |
| `obsidian-linker.vaultName` | empty | Optional Obsidian vault name used by "Open in Obsidian" |

## Development

```bash
npm install
npm run check    # tsc --noEmit type check
npm run compile  # esbuild bundle to dist/
npm run test     # unit tests (node:test)
npm run watch    # watch mode
```

Press `F5` to launch the Extension Development Host for debugging. To package locally, set `publisher` / `repository` in `package.json`, then run `npx @vscode/vsce package`.

## Known limitations

- Changing `openMode` does not refresh link targets in already-open files (reopen or edit the file)
- `[[#^block-id]]` jumps to the file but not to the exact block
- Wikilinks inside YAML frontmatter are not parsed

## License

MIT
