# Obsidian Linker

[English](README.md) | [中文说明](README.zh-CN.md)

在 VS Code 中复刻 Obsidian 的 `[[wikilink]]` 体验，并支持一键在 Obsidian 中打开当前文件。

## 功能

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
- 代码块 / 行内代码中的 `[[...]]` 不会被识别为链接
- 未找到目标笔记时，悬浮提示可一键 **Create note**（在当前工作区根目录下创建）

**笔记查找规则**（与 Obsidian 类似）：

1. 先按「相对工作区根目录的路径」精确匹配（带/不带 `.md` 均可）
2. 再按「文件名（不含扩展名）」全工作区匹配，不区分大小写
3. 多个同名文件时优先：与当前文件同目录 > 路径层级更浅 > 路径更短 > 字典序

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

- 命令面板：`Obsidian Linker: Open Current File in Obsidian`
- 编辑器右上角书籍图标按钮（仅 Markdown 文件显示）
- 状态栏右下角 `$(ruby) Obsidian` 按钮（仅 Markdown 文件显示）
- 右键菜单 → `Obsidian Linker: Open Current File in Obsidian`
- 悬浮链接上的 `Open in Obsidian` 按钮

生成的 URI 为官方 `open` 动作格式，使用绝对路径并做 URL 编码：

```
obsidian://open?vault=<库名>&path=<文件绝对路径>
```

- `obsidian-linker.vaultName` 为**可选项**：配置了就带 `vault=` 参数；不配置时 Obsidian 会根据绝对路径自动定位所属仓库
- 按 Obsidian 官方文档，`file` 参数是仓库相对路径，因此绝对路径使用 `path` 参数

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

```bash
npm install
npm run check    # tsc --noEmit 类型检查
npm run compile  # esbuild 打包到 dist/
npm run test     # 纯函数单元测试（node:test）
npm run watch    # 监听模式
```

按 `F5` 启动「扩展开发主机」调试；打包发布需先修改 `package.json` 中的 `publisher` / `repository`，然后 `npx @vscode/vsce package`。

## 已知限制

- 修改 `openMode` 配置后，已打开文件中的链接目标不会立即刷新（重新打开或编辑一次即可）
- `[[#^block-id]]` 块引用只跳转到文件，不定位到具体块
- 不解析 frontmatter（YAML）中的双链

## License

MIT
