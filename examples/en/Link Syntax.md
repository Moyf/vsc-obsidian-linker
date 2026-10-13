# Link Syntax

Hold `Ctrl` / `Cmd` and click the links below. Every link is resolved by Obsidian Linker.

## Basic links

- [[Link Syntax]] — points to this file
- [[Deep Space]] — matched by file name
- [[archive/drafts/Old Ideas]] — matched by path (`.md` suffix optional)
- [[Old Ideas]] — basename-only match also works across the vault

## Aliases

- [[Deep Space|go to Deep Space]]
- [[Link Syntax|back to this page]]

## Heading links

- [[Deep Space#Observations]]
- [[Deep Space#Observations|Deep Space · Observations]]
- [[#Same-name notes|jump to the "Same-name notes" section below]] — a leading `#` means this file

## Block references

- [[Deep Space#^quasar]]
- Note: the current version jumps to the target file but not to the exact block (known limitation).

## Not parsed

- Inline code: `[[this is not a link]]`
- Fenced code blocks:

```
[[this is not a link either]]
```

## Notes that do not exist yet

- [[A Note That Does Not Exist]] — `Ctrl+Click` or `Ctrl+Alt+O` offers to create the file
- Hovering an existing link shows "Open" and "Open in Obsidian" buttons

## Same-name notes

The vault contains two notes named "Deep Space":

1. `notes/Deep Space.md` — one path segment
2. `archive/drafts/Deep Space.md` — two path segments

[[Deep Space]] resolves to the shallower one (`notes/Deep Space`). To open the deeper copy, use its path: [[archive/drafts/Deep Space]].

Resolution priority: same folder > fewer path segments > shorter path > alphabetical.
