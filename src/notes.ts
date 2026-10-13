import * as path from 'path';
import * as vscode from 'vscode';
import { t } from './i18n';

export type OpenMode = 'default' | 'newTab' | 'split';

export function getOpenMode(): OpenMode {
  return vscode.workspace.getConfiguration('obsidian-linker').get<OpenMode>('openMode', 'default');
}

function indexOnlyMarkdown(): boolean {
  return vscode.workspace.getConfiguration('obsidian-linker').get<boolean>('indexOnlyMarkdown', false);
}

function indexExclude(): string[] {
  const patterns = vscode.workspace.getConfiguration('obsidian-linker').get<string[]>('indexExclude', []);
  return patterns.map((p) => p.trim()).filter(Boolean);
}

function indexLimit(): number {
  return Math.max(0, Math.floor(vscode.workspace.getConfiguration('obsidian-linker').get<number>('indexLimit', 0)));
}

interface Entry {
  uri: vscode.Uri;
  /** Lowercase, posix separators, workspace-folder-relative path. */
  rel: string;
  /** Lowercase basename including extension. */
  base: string;
  /** Lowercase basename without extension. */
  stem: string;
  isMd: boolean;
}

export interface NoteSuggestion {
  uri: vscode.Uri;
  label: string;
  target: string;
  description: string;
  isMd: boolean;
}

export class NoteIndex implements vscode.Disposable {
  private entries: Entry[] | undefined;
  private byBase = new Map<string, number[]>();
  private byStem = new Map<string, number[]>();
  private byRel = new Map<string, number[]>();
  private building: Promise<void> | undefined;
  private epoch = 0;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly invalidated = new vscode.EventEmitter<void>();
  readonly onDidInvalidate = this.invalidated.event;

  constructor() {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*', false, true, false);
    this.disposables.push(
      this.invalidated,
      watcher,
      watcher.onDidCreate(() => this.invalidate()),
      watcher.onDidDelete(() => this.invalidate()),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.invalidate()),
      vscode.workspace.onDidCreateFiles(() => this.invalidate()),
      vscode.workspace.onDidDeleteFiles(() => this.invalidate()),
      vscode.workspace.onDidRenameFiles(() => this.invalidate()),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration('files.exclude') ||
          e.affectsConfiguration('search.exclude') ||
          e.affectsConfiguration('obsidian-linker.indexOnlyMarkdown') ||
          e.affectsConfiguration('obsidian-linker.indexExclude') ||
          e.affectsConfiguration('obsidian-linker.indexLimit')
        ) {
          this.invalidate();
        }
      }),
    );
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  invalidate(): void {
    this.epoch++;
    this.entries = undefined;
    this.byBase.clear();
    this.byStem.clear();
    this.byRel.clear();
    this.building = undefined;
    this.invalidated.fire();
  }

  private buildOnce(): Promise<void> {
    if (this.building) {
      return this.building;
    }
    const stamp = this.epoch;
    this.building = (async () => {
      const include = indexOnlyMarkdown() ? '**/*.md' : '**/*';
      const exclude = indexExclude();
      const limit = indexLimit();
      const uris = await vscode.workspace.findFiles(
        include,
        exclude.length ? `{${exclude.join(',')}}` : undefined,
        limit > 0 ? limit : undefined,
      );
      if (stamp !== this.epoch) {
        return;
      }
      const byBase = new Map<string, number[]>();
      const byStem = new Map<string, number[]>();
      const byRel = new Map<string, number[]>();
      const entries: Entry[] = uris.map((uri) => {
        const base = path.basename(uri.fsPath);
        const lower = base.toLowerCase();
        const dot = base.lastIndexOf('.');
        return {
          uri,
          rel: this.relKey(uri),
          base: lower,
          stem: dot > 0 ? lower.slice(0, dot) : lower,
          isMd: lower.endsWith('.md'),
        };
      });
      entries.forEach((e, i) => {
        pushMap(byBase, e.base, i);
        pushMap(byStem, e.stem, i);
        pushMap(byRel, e.rel, i);
        pushMap(byRel, e.rel.replace(/\.md$/, ''), i);
      });
      this.byBase = byBase;
      this.byStem = byStem;
      this.byRel = byRel;
      this.entries = entries;
    })();
    return this.building;
  }

  async prepare(): Promise<void> {
    while (!this.entries) {
      await this.buildOnce();
      if (!this.entries) {
        // Stale build (index was invalidated while running): rebuild.
        this.building = undefined;
      }
    }
  }

  async resolve(target: string, from?: vscode.Uri): Promise<vscode.Uri | undefined> {
    await this.prepare();
    return this.resolveCached(target, from);
  }

  async suggest(prefix: string, from: vscode.Uri): Promise<NoteSuggestion[]> {
    await this.prepare();
    const query = prefix.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
    const byPath = query.includes('/');
    const suggestions: NoteSuggestion[] = [];
    const hits = this.entries!.flatMap((entry, i) =>
      (byPath ? entry.rel : entry.base).startsWith(query) ? [i] : []);
    const ranked = this.rank(hits, from);
    const entriesByUri = new Map(this.entries!.map((entry) => [entry.uri.toString(), entry]));
    for (const uri of ranked) {
      const entry = entriesByUri.get(uri.toString())!;
      const label = path.basename(uri.fsPath);
      // Wikilink syntax has no escaping for these filename characters.
      if (/[\[\]#|\r\n]/.test(label)) continue;
      const folder = vscode.workspace.getWorkspaceFolder(uri)!;
      const description = path.relative(folder.uri.fsPath, uri.fsPath).split(path.sep).join('/');
      let target = entry.isMd ? label.slice(0, -3) : label;
      if (this.resolveCached(target, from)?.toString() !== uri.toString()) target = label;
      if (byPath || this.resolveCached(target, from)?.toString() !== uri.toString()) {
        target = entry.isMd && !/\.[a-z0-9]+$/i.test(description.slice(0, -3))
          ? description.slice(0, -3) : description;
      }
      // A path can still be ambiguous across workspace roots. Never suggest the wrong file.
      if (/[\[\]#|\r\n]/.test(target) || this.resolveCached(target, from)?.toString() !== uri.toString()) continue;
      suggestions.push({ uri, label, target: target.replace(/%/g, '%25'), description: `${folder.name}/${description}`, isMd: entry.isMd });
    }
    return suggestions.filter((item) => item.isMd).concat(suggestions.filter((item) => !item.isMd));
  }

  missingMessage(_target: string, from?: vscode.Uri): string {
    if (!vscode.workspace.workspaceFolders?.length) {
      return t(
        'Open a folder or workspace containing your notes to resolve file wikilinks.',
        '请先打开包含笔记的文件夹或工作区，才能解析跨文件双链。',
      );
    }
    if (from && !vscode.workspace.getWorkspaceFolder(from)) {
      return t(
        'Only files inside the open workspace folders are indexed. Open the folder containing the target.',
        '只会索引已打开工作区内的文件。请打开目标笔记所在的文件夹。',
      );
    }
    return t(
      'Target not found in the workspace index. Check the path, exclude settings, and Obsidian Linker index settings.',
      '未在工作区索引中找到目标笔记。请检查链接路径、排除规则以及 Obsidian Linker 的索引设置。',
    );
  }

  resolveCached(target: string, from?: vscode.Uri): vscode.Uri | undefined {
    const entries = this.entries;
    if (!entries?.length) {
      return undefined;
    }

    let t = target.trim().replace(/\\/g, '/');
    t = t.replace(/^\.?\//, '');
    if (!t) {
      return undefined;
    }

    const hasExt = /\.[a-z0-9]+$/i.test(t);

    // 1) Workspace-relative path (with or without .md)
    const relKey = hasExt ? t.toLowerCase() : t.toLowerCase() + '.md';
    const relHits = this.byRel.get(relKey);
    if (relHits && relHits.length) {
      return this.rank(relHits, from)[0];
    }

    // 2) Basename match anywhere in the workspace
    const stem = (t.split('/').pop() ?? t).toLowerCase();
    if (hasExt) {
      const hits = this.byBase.get(stem);
      if (hits && hits.length) {
        return this.rank(hits, from)[0];
      }
    } else {
      const hits = this.byStem.get(stem);
      if (hits && hits.length) {
        const mdHits = hits.filter((i) => entries[i].isMd);
        return this.rank(mdHits.length ? mdHits : hits, from)[0];
      }
    }

    return undefined;
  }

  private rank(indices: number[], from?: vscode.Uri): vscode.Uri[] {
    const list = indices.map((i) => this.entries![i]);
    const fromDir = from && from.scheme === 'file' ? path.dirname(from.fsPath).toLowerCase() : undefined;
    list.sort((a, b) => {
      if (fromDir) {
        const aSame = path.dirname(a.uri.fsPath).toLowerCase() === fromDir ? 0 : 1;
        const bSame = path.dirname(b.uri.fsPath).toLowerCase() === fromDir ? 0 : 1;
        if (aSame !== bSame) {
          return aSame - bSame;
        }
      }
      const aDepth = a.rel.split('/').length;
      const bDepth = b.rel.split('/').length;
      if (aDepth !== bDepth) {
        return aDepth - bDepth;
      }
      if (a.rel.length !== b.rel.length) {
        return a.rel.length - b.rel.length;
      }
      return a.rel.localeCompare(b.rel);
    });
    return list.map((e) => e.uri);
  }

  private relKey(uri: vscode.Uri): string {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) {
      return path.basename(uri.fsPath).toLowerCase();
    }
    const rel = path.relative(folder.uri.fsPath, uri.fsPath);
    return rel.split(path.sep).join('/').toLowerCase();
  }
}

export async function openNote(
  uri: vscode.Uri,
  mode: OpenMode,
  heading?: string,
): Promise<vscode.TextEditor | undefined> {
  if (/\.(png|jpe?g|gif|webp|svg|bmp|avif|pdf)$/i.test(uri.path)) {
    await vscode.commands.executeCommand('vscode.open', uri, { viewColumn: mode === 'split' ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active, preview: mode === 'default' });
    return undefined;
  }
  const options: vscode.TextDocumentShowOptions =
    mode === 'split'
      ? { viewColumn: vscode.ViewColumn.Beside, preview: false }
      : { preview: mode === 'default' };
  const editor = await vscode.window.showTextDocument(uri, options);
  if (heading && heading.trim()) {
    revealHeading(editor, heading);
  }
  return editor;
}

function revealHeading(editor: vscode.TextEditor, heading: string): void {
  const doc = editor.document;
  const wanted = heading
    .split('#')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!wanted.length) {
    return;
  }
  const candidates = [wanted[wanted.length - 1], wanted.join('#')];

  for (const candidate of candidates) {
    for (let i = 0; i < doc.lineCount; i++) {
      const line = doc.lineAt(i).text;
      const m = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
      if (m && m[1].trim().toLowerCase() === candidate) {
        const pos = new vscode.Position(i, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        return;
      }
    }
  }
}

export async function createNote(target: string, from?: vscode.Uri): Promise<vscode.Uri | undefined> {
  const folder =
    (from ? vscode.workspace.getWorkspaceFolder(from) : undefined) ?? vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return undefined;
  }
  const rel = target
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '');
  if (!rel || rel.includes('..')) {
    return undefined;
  }
  const fileUri = vscode.Uri.joinPath(folder.uri, rel.endsWith('.md') ? rel : rel + '.md');
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(fileUri.fsPath)));
  try {
    await vscode.workspace.fs.stat(fileUri);
  } catch {
    await vscode.workspace.fs.writeFile(fileUri, new Uint8Array(0));
  }
  return fileUri;
}

function pushMap(map: Map<string, number[]>, key: string, index: number): void {
  const arr = map.get(key);
  if (arr) {
    arr.push(index);
  } else {
    map.set(key, [index]);
  }
}
