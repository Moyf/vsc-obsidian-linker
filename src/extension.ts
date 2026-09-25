import * as path from 'path';
import * as vscode from 'vscode';
import { buildObsidianUri } from './obsidian';
import { createNote, getOpenMode, NoteIndex, OpenMode, openNote } from './notes';
import {
  fenceMarkerOf,
  findWikilinksInLine,
  isFenceLine,
  isInsideInlineCode,
  wikilinkAtOffset,
  WikilinkMatch,
} from './wikilink';

const CMD_OPEN = 'obsidian-linker.open';
const CMD_OPEN_LINK = 'obsidian-linker.openLink';
const CMD_CREATE = 'obsidian-linker.createNote';
const CMD_OBSIDIAN = 'obsidian-linker.openInObsidian';

let index: NoteIndex;

export function activate(context: vscode.ExtensionContext): void {
  index = new NoteIndex();

  context.subscriptions.push(
    index,
    vscode.languages.registerDocumentLinkProvider({ language: 'markdown' }, new WikilinkLinkProvider()),
    vscode.languages.registerHoverProvider({ language: 'markdown' }, new WikilinkHoverProvider()),
    vscode.commands.registerCommand(CMD_OPEN, openUnderCursor),
    vscode.commands.registerCommand(CMD_OPEN_LINK, openLinkArgs),
    vscode.commands.registerCommand(CMD_CREATE, createNoteArgs),
    vscode.commands.registerCommand(CMD_OBSIDIAN, openInObsidian),
  );
}

export function deactivate(): void {
  // nothing to clean up
}

async function resolveMatch(match: WikilinkMatch, doc: vscode.TextDocument): Promise<vscode.Uri | undefined> {
  if (!match.target) {
    return doc.uri; // [[#heading]] points to the current note
  }
  return index.resolve(match.target, doc.uri);
}

async function openUnderCursor(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    return;
  }
  const pos = editor.selection.active;
  const line = editor.document.lineAt(pos.line);
  const match = wikilinkAtOffset(line.text, pos.character);
  if (!match) {
    vscode.window.setStatusBarMessage('No [[wikilink]] at cursor', 2000);
    return;
  }
  const uri = await resolveMatch(match, editor.document);
  if (!uri) {
    await offerCreate(match, editor.document.uri);
    return;
  }
  await openNote(uri, getOpenMode(), match.heading);
}

async function openLinkArgs(uriStr?: string, mode?: string, heading?: string): Promise<void> {
  if (typeof uriStr !== 'string' || !uriStr) {
    return;
  }
  let uri: vscode.Uri;
  try {
    uri = vscode.Uri.parse(uriStr);
  } catch {
    return;
  }
  if (uri.scheme !== 'file') {
    return;
  }
  const openMode: OpenMode =
    mode === 'newTab' || mode === 'split' || mode === 'default' ? (mode as OpenMode) : getOpenMode();
  await openNote(uri, openMode, heading || undefined);
}

async function createNoteArgs(target?: string, fromUriStr?: string): Promise<void> {
  if (typeof target !== 'string' || !target.trim()) {
    return;
  }
  const from = argToUri(fromUriStr);
  const uri = await createNote(target, from);
  if (uri) {
    await openNote(uri, getOpenMode());
  }
}

async function offerCreate(match: WikilinkMatch, fromUri: vscode.Uri): Promise<void> {
  const label = match.target || match.heading || 'note';
  const pick = await vscode.window.showWarningMessage(`Note not found: "${label}"`, 'Create note');
  if (pick === 'Create note') {
    await createNoteArgs(match.target || label, fromUri.toString());
  }
}

export async function openInObsidian(fileArg?: unknown): Promise<void> {
  const uri = argToUri(fileArg) ?? argToUri(vscode.window.activeTextEditor?.document.uri);
  if (!uri) {
    vscode.window.showInformationMessage('Open in Obsidian: the current file must be a file on disk.');
    return;
  }
  const vaultName = vscode.workspace.getConfiguration('obsidian-linker').get<string>('vaultName', '');
  if (!vaultName.trim()) {
    const pick = await vscode.window.showErrorMessage(
      '"obsidian-linker.vaultName" is not configured. Set your Obsidian vault name first.',
      'Open Settings',
    );
    if (pick === 'Open Settings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'obsidian-linker.vaultName');
    }
    return;
  }
  const url = buildObsidianUri(uri, vaultName);
  if (!url) {
    vscode.window.showInformationMessage(
      'Open in Obsidian: cannot determine the path of this file inside the workspace.',
    );
    return;
  }
  await vscode.env.openExternal(vscode.Uri.parse(url));
}

function argToUri(arg: unknown): vscode.Uri | undefined {
  let uri: vscode.Uri | undefined;
  if (typeof arg === 'string' && arg) {
    try {
      uri = vscode.Uri.parse(arg);
    } catch {
      return undefined;
    }
  } else if (arg instanceof vscode.Uri) {
    uri = arg;
  } else if (arg && typeof arg === 'object' && typeof (arg as vscode.Uri).fsPath === 'string') {
    uri = arg as vscode.Uri;
  }
  return uri && uri.scheme === 'file' ? uri : undefined;
}

class WikilinkLinkProvider implements vscode.DocumentLinkProvider {
  async provideDocumentLinks(doc: vscode.TextDocument): Promise<vscode.DocumentLink[]> {
    const links: vscode.DocumentLink[] = [];
    let inFence = false;
    let fenceMarker = '';

    for (let ln = 0; ln < doc.lineCount; ln++) {
      const text = doc.lineAt(ln).text;

      if (isFenceLine(text)) {
        const marker = fenceMarkerOf(text);
        if (!inFence) {
          inFence = true;
          fenceMarker = marker;
        } else if (marker[0] === fenceMarker[0]) {
          inFence = false;
        }
        continue;
      }
      if (inFence) {
        continue;
      }

      for (const match of findWikilinksInLine(text)) {
        if (isInsideInlineCode(text, match.start)) {
          continue;
        }
        if (!match.target && !match.heading) {
          continue;
        }
        const range = new vscode.Range(ln, match.start, ln, match.end);
        const target = await this.targetFor(match, doc);
        links.push(new vscode.DocumentLink(range, target));
      }
    }
    return links;
  }

  private async targetFor(match: WikilinkMatch, doc: vscode.TextDocument): Promise<vscode.Uri | undefined> {
    const uri = await resolveMatch(match, doc);
    if (!uri) {
      return undefined;
    }
    const mode = getOpenMode();
    if (mode === 'default') {
      return uri;
    }
    // command: URIs are allowed as DocumentLink targets; VS Code executes them on
    // Ctrl/Cmd+Click (opener service is called with allowCommands: true).
    const args = encodeURIComponent(JSON.stringify([uri.toString(), mode, match.heading ?? '']));
    return vscode.Uri.parse(`command:${CMD_OPEN_LINK}?${args}`);
  }
}

class WikilinkHoverProvider implements vscode.HoverProvider {
  async provideHover(doc: vscode.TextDocument, pos: vscode.Position): Promise<vscode.Hover | undefined> {
    const line = doc.lineAt(pos.line);
    const match = wikilinkAtOffset(line.text, pos.character);
    if (!match || (!match.target && !match.heading)) {
      return undefined;
    }

    const uri = await resolveMatch(match, doc);
    const md = new vscode.MarkdownString();
    md.isTrusted = { enabledCommands: [CMD_OPEN_LINK, CMD_OBSIDIAN, CMD_CREATE] };

    if (uri) {
      const title = match.alias ?? (match.target || '(this note)');
      md.appendMarkdown(`**${escapeMd(title)}**`);
      if (match.heading) {
        md.appendMarkdown(` → ${escapeMd(match.heading)}`);
      }
      md.appendMarkdown(`\n\n\`${escapeMd(relPathFor(uri))}\`\n\n`);
      md.appendMarkdown(this.openButton(uri.toString(), 'Open', 'default'));
      md.appendMarkdown(' · ');
      md.appendMarkdown(this.openButton(uri.toString(), 'Open to the Side', 'split'));
      md.appendMarkdown(' · ');
      md.appendMarkdown(
        `[Open in Obsidian](command:${CMD_OBSIDIAN}?${enc([uri.toString()])} "Open in Obsidian")`,
      );
    } else {
      md.appendMarkdown(`Note not found: **${escapeMd(match.target)}**\n\n`);
      md.appendMarkdown(
        `[Create note](command:${CMD_CREATE}?${enc([match.target, doc.uri.toString()])} "Create note")`,
      );
    }
    return new vscode.Hover(md, new vscode.Range(pos.line, match.start, pos.line, match.end));
  }

  private openButton(uriStr: string, label: string, mode: OpenMode): string {
    return `[${label}](command:${CMD_OPEN_LINK}?${enc([uriStr, mode])} "${label}")`;
  }
}

function enc(args: unknown[]): string {
  return encodeURIComponent(JSON.stringify(args));
}

function escapeMd(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+.!])/g, '\\$1');
}

function relPathFor(uri: vscode.Uri): string {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    return uri.fsPath;
  }
  return path.relative(path.dirname(folder.uri.fsPath), uri.fsPath).split(path.sep).join('/');
}
