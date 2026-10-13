# Obsidian Linker 示例库 / Examples

## 入口一：中文示例工作区（推荐先用这个）

用 VS Code 打开本目录下的 **`obsidian-linker-demo.code-workspace`**，然后打开 `demo-vault/00-截图展示.md`，按 `Ctrl+Shift+V` 查看 Preview。

从仓库根目录也可以运行：

```powershell
code examples/obsidian-linker-demo.code-workspace
```

### 三个入口文件

| 文件 | 用途 |
| --- | --- |
| `00-截图展示.md` | 干净的中文展示页，包含大图、相关笔记、标题链接和灰色未解析链接 |
| `01-功能测试.md` | 别名、锚点、图片尺寸、表格、同名文件、普通附件及未解析场景 |
| `02-补全练习.md` | 试用 `[[`、中文前缀和 `「「`，查看 Markdown 优先及同名文件的路径 |

### 截图与操作

1. 打开 `00-截图展示.md` 的 Preview，截取标题、大图和「相关笔记」。
2. 在相关笔记链接上右键，截取菜单；用鼠标中键确认在新标签页打开，原 Preview 保留。
3. 打开 `02-补全练习.md`，在指定位置输入 `[[这个`，截取候选列表。

工作区设置让 Markdown 链接默认打开 Preview。想试编辑器标签页，将 `markdown.preview.openMarkdownLinks` 改为 `inEditor`。

### 有意保留的未解析场景

- `尚未创建的笔记` 和 `不存在的图片.webp`：文件未创建，Preview 显示灰色文字，悬浮解释原因。
- `隐藏笔记/被排除的笔记.md`：文件真实存在，但示例工作区的 `indexExclude` 将其排除。临时清空该设置，可以观察链接恢复。
- 临时开启 `indexOnlyMarkdown`：图片及文本附件应变为未解析状态。完成后改回 `false`。
- 单文件窗口：用 **File → New Window** 创建空窗口，再只打开 `00-截图展示.md`，不要打开文件夹。跨文件目标不会被索引，当前文件的标题链接仍能使用。

请打开示例工作区以隔离索引。直接打开整个插件仓库时，工作区根目录和排除设置会不同。

## 入口二 / 三：双语教程库 / Bilingual tutorial vaults

Two self-contained demo vaults for trying every feature of **Obsidian Linker** in VS Code. Open one folder (File > Open Folder) and follow its start page.

两个自包含的迷你教程库，用 VS Code 打开其中一个文件夹（文件 > 打开文件夹），从首页出发即可：

- [`zh/`](./zh/开始.md) — 中文教程库
- [`en/`](./en/Start%20Here.md) — English tutorial vault

覆盖内容 / What they cover：

- Wikilink navigation: basic / alias / heading / block links, basename & path resolution, same-name priority
  双链跳转：基本 / 别名 / 标题 / 块引用，文件名与路径匹配、同名解析优先级
- Image embeds `![[...]]` with `|300` and `|300x200` sizing, hover and Markdown preview rendering
  图片嵌入 `![[...]]` 及 `|300`、`|300x200` 尺寸语法，悬浮预览与内置 Markdown 预览
- Unresolved links offering "Create note", plus links inside code that stay literal
  未创建笔记的「创建」提示，以及代码中不解析的链接

## 素材说明

示例中的 PNG、SVG 均为本仓库原创测试素材，可用于本项目演示和截图。示例文件可纳入 Git，不随 VSIX 安装包发布。
