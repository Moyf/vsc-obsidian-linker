# Image Embeds

`![[...]]` embeds images. Hover over the embeds below for an inline preview, or open the built-in Markdown Preview with `Ctrl+Shift+V` to see them rendered.

## Natural size

![[attachments/gem.svg]]

## Fixed width (pipe + number)

![[attachments/orbit.svg|320]]

## Fixed width and height (pipe + width x height)

![[attachments/gem.svg|160x160]]

![[attachments/orbit.svg|320x200]]

## Alias used as alt text

![[attachments/gem.svg|gem icon]]

## Notes

- Supported formats: PNG / JPEG / GIF / WebP / SVG / BMP / AVIF
- Images may live in any attachment folder; they are found by workspace-relative path or by file name, with explicit paths taking precedence
- Embeds inside inline code or fenced code blocks are not parsed
- Keep `obsidian-linker.indexOnlyMarkdown` disabled for image previews, and make sure `indexExclude` / `indexLimit` do not exclude these images
