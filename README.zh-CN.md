# Obsidian Linker

[English](README.md) | [中文说明](README.zh-CN.md)

在 VS Code 中复刻 Obsidian 的 `[[wikilink]]` 体验，并支持一键在 Obsidian 中打开当前文件。

## 功能

- 在编辑器中输入 `[[` 即显示候选文件，继续输入按文件名或路径前缀筛选，优先 `.md`；同名文件用路径区分。选择后自动补全闭合括号，已有标题、别名和括号会保留。中文输入 `「「` 自动转换为 `[[` 并显示候选；代码块和行内代码中不会转换或补全。
- Preview 中的双链支持右键菜单（在新标签页打开 / 在侧边打开 / 复制链接地址），鼠标中键按同一设置打开链接。Markdown 目标遵循 `markdown.preview.openMarkdownLinks`：`inPreview` 打开独立预览，`inEditor` 打开固定的编辑器标签页。

### 1. 双链跳转（Ctrl/Cmd + Click）

在 Markdown 文件中书写 Obsidian 风格的双链，按住 `Ctrl`（macOS 为 `Cmd`）点击即可打开对应笔记：

```markdown
[[笔记名称]]
[[笔记名称|别名]]
[[笔记名称#某个标题]]
[[#当前文件内的标题]]
![[嵌入图片.png]]
```

- 链接自动渲染为可点击样式，悬浮显示目标路径与操作按钮
- 支持 `#标题` 锚点（打开后自动滚动到对应标题）、`#^block-id` 块引用、`|别名`、URL 编码路径
- 支持嵌入语法 `![[...]]`（含图片等非 Markdown 文件）
- 图片嵌入会在编辑器悬浮卡片和内置 Markdown Preview（`Ctrl+Shift+V`）中显示。支持 PNG、JPEG、GIF、WebP、SVG、BMP、AVIF 和 `![[image.png|300]]` / `![[image.png|300x200]]` 尺寸写法；附件查找遵循下方索引配置。
- Markdown Preview 同样支持 `[[笔记]]`、`[[笔记|别名]]`、`[[笔记#标题]]` 和 `[[#标题]]`：有别名时显示别名，点击使用 VS Code 原生预览的链接行为（`markdown.preview.openMarkdownLinks`、`markdown.links.openLocation`）。
- 在 Markdown 表格中需要转义分隔符：`[[笔记\|别名]]` / `![[image.png\|300]]`。
- 代码块 / 行内代码中的 `[[...]]` 不会被识别为链接
- Preview 中未找到的链接和图片显示为灰色、带点状下划线的文字（别名或文件名），不提供可点击的目标；悬浮可查看工作区、路径及索引设置提示。已打开工作区时，编辑器悬浮提示提供 **Index Settings** 和 **Create note**（在当前工作区根目录下创建）。

**需要打开工作区文件夹：**跨文件双链和图片预览依赖已打开文件夹中的文件索引，支持多根工作区。索引保存在内存中，不写入磁盘缓存；只打开单个文件时，不会自动扫描同目录文件，此时状态栏和未解析链接的悬浮提示提供 **Open Folder**。当前文件内的标题链接仍可使用。添加或移除工作区文件夹后会自动刷新索引和 Preview。

**笔记查找规则**（与 Obsidian 类似）：

1. 先按「相对工作区根目录的路径」精确匹配（带/不带 `.md` 均可）
2. 再按「文件名（不含扩展名）」全工作区匹配，不区分大小写
3. 多个同名文件时优先：与当前文件同目录 > 路径层级更浅 > 路径更短 > 字典序

新建、删除、重命名文件及工作区目录变化会使索引失效，包括 Obsidian 或其他外部程序产生的磁盘变化。下次查找会重建索引，Markdown 预览会在重建后刷新。

### 图片预览（0.1.6 新增）

在源码编辑器中将鼠标移到图片嵌入链接上即可查看悬浮预览；按 `Ctrl+Shift+V`（macOS 为 `Cmd+Shift+V`）打开内置 Markdown Preview，也能直接显示图片：

```markdown
![[image.png]]
![[attachments/image.png|300]]
![[image.png|300x200]]
```

- `|300` 指定宽度，`|300x200` 指定宽高。悬浮预览的指定尺寸最多为宽 640 px、高 480 px。
- 支持 PNG、JPEG、GIF、WebP、SVG、BMP、AVIF；可按文件名查找附件目录中的图片，显式工作区相对路径优先。
- 行内代码和代码块保持原样；找不到或被索引排除的图片也保留为文本，不会回退加载原始路径或远程 URL。
- 使用图片预览时请关闭 `indexOnlyMarkdown`，并确认 `indexExclude` / `indexLimit` 没有排除图片。

### 2. 打开方式配置

设置项 `obsidian-linker.openMode`：

| 值 | 行为 |
| --- | --- |
| `default` | VS Code 默认：当前编辑器组打开（可复用预览标签页） |
| `newTab` | 当前编辑器组打开固定（非预览）标签页 |
| `split` | 右侧分屏打开 |

对 Ctrl/Cmd+Click、命令、悬浮按钮全部生效。
（修改配置后需重新打开文件或做一次编辑以刷新链接缓存。）

### 3. 在 Obsidian 中打开

- 命令面板：`Open in Obsidian`
- 编辑器内右键菜单 → `Open in Obsidian`
- 编辑器右上角书籍图标按钮（仅 Markdown 文件显示）
- 状态栏右下角 `$(ruby) Obsidian` 按钮（仅 Markdown 文件显示）
- Explorer 文件右键菜单 → `Open in Obsidian`（顶部导航分组，不显示在文件夹上）
- 悬浮链接上的 `Open in Obsidian` 按钮

光标感知：从命令面板或编辑器右键菜单触发时，若光标位于可解析的 wikilink 上，会打开**链接对应的笔记**，否则回退为当前文件。编辑器右上角按钮、状态栏按钮和 Explorer 菜单始终打开当前文件；悬浮卡片按钮始终打开链接对应笔记。

生成的 URI 为官方 `open` 动作格式，使用绝对路径并做 URL 编码：

```
obsidian://open?vault=<库名>&path=<文件绝对路径>
```

- `obsidian-linker.vaultName` 为**可选项**：配置了就带 `vault=` 参数；不配置时 Obsidian 会根据绝对路径自动定位所属仓库
- 库内文件（祖先目录含 `.obsidian`）使用上面的传统 `path=` 格式。
- 库外独立文件使用 Obsidian 1.14.2+ 的 `file=<编码后的file:路径>` 格式。`vaultName` 在此场景也可省略；填写后会附加编码后的 `vault=` 参数。路径统一用正斜杠，整个 `file:D:/Apps/Su/读我.md` 做 URL 编码。

```text
obsidian://open?vault=obsinote&file=file%3AD%3A%2FApps%2FSu%2F%E8%AF%BB%E6%88%91.md
```

### 4. 其他命令 / 快捷键

| 命令 | 说明 | 默认快捷键 |
| --- | --- | --- |
| `Obsidian Linker: Open Note Under Cursor` | 打开光标处双链指向的笔记（按 `openMode` 配置打开） | `Ctrl+Alt+O`（macOS `Cmd+Alt+O`） |

## 设置项

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| `obsidian-linker.openMode` | `default` | 打开笔记的方式：`default` / `newTab` / `split` |
| `obsidian-linker.vaultName` | 空 | 可选。Obsidian 库名，用于「在 Obsidian 中打开」 |
| `obsidian-linker.indexOnlyMarkdown` | `false` | 仅索引 `.md` 文件。省内存，但图片 / PDF / canvas 等链接将无法解析 |
| `obsidian-linker.indexExclude` | `[]` | 索引时排除的 glob 模式，相对于工作区根目录（如 `[".trash/**"]`）。可在 `.vscode/settings.json` 中按项目配置 |
| `obsidian-linker.indexLimit` | `0` | 索引文件数上限。`0` = 不限制（内存随库大小增长，约 1KB/文件）。设置过低时，超限的笔记不会被索引，其链接会提示「Note not found」 |

## 开发

需要测试或截图时，可打开仓库中的 [示例工作区](examples/obsidian-linker-demo.code-workspace)（中文示例库），或双语教程库 [`examples/zh`](examples/zh) / [`examples/en`](examples/en)：

```bash
npm install
npm run check    # tsc --noEmit 类型检查
npm run compile  # esbuild 打包到 dist/
npm run test     # 纯函数单元测试（node:test）
npm run test:host # 真实 VS Code 预览与悬浮集成测试
npm run watch    # 监听模式
```

按 `F5` 启动「扩展开发主机」调试；打包发布需先修改 `package.json` 中的 `publisher` / `repository`，然后 `npx @vscode/vsce package`。

## 已知限制

- 修改 `openMode` 配置后，已打开文件中的链接目标不会立即刷新（重新打开或编辑一次即可）
- `[[#^block-id]]` 块引用只跳转到文件，不定位到具体块
- Preview 中的笔记嵌入 `![[note]]`、PDF 嵌入以及音视频嵌入仍保留原文；普通文件链接（如 `[[file.pdf|PDF]]`）在文件已被索引时可以点击。
- Preview 标题链接使用原生 Markdown 标题 ID；多级标题路径按最后一级标题名称跳转，暂不区分同名标题。
- 不解析 frontmatter（YAML）中的双链

## 编辑介绍与添加配图

请在独立维护目录 `D:\Codes\vsc-obsidian-linker` 编辑：`README.md` 是 Marketplace 默认介绍，`README.zh-CN.md` 是中文说明。不要编辑 AI Playground 的归档副本或 VS Code 已安装扩展的目录。

建议将截图放在 `docs/images/`，然后用相对 Markdown 链接引用，例如 `![图片悬浮预览](docs/images/image-hover.png)`。该目录会包含在 VSIX 中；请将图片提交并推送到独立仓库，让 Marketplace 能解析相对图片链接。修改后重新打包并上传新版 VSIX，安装包中的介绍才会更新。

## License

MIT
