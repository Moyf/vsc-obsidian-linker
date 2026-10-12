import * as vscode from 'vscode';
import type MarkdownIt from 'markdown-it';
import type { NoteIndex } from './notes';
import { extendImagePreview } from './preview';

export async function createPreview(context: vscode.ExtensionContext, index: NoteIndex) {
  const refreshPreview = async () => {
    await index.prepare();
    await vscode.commands.executeCommand('markdown.api.reloadPlugins');
  };
  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles(refreshPreview),
    vscode.workspace.onDidDeleteFiles(refreshPreview),
    vscode.workspace.onDidRenameFiles(refreshPreview),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('files.exclude') || e.affectsConfiguration('search.exclude')
        || e.affectsConfiguration('obsidian-linker.indexOnlyMarkdown')
        || e.affectsConfiguration('obsidian-linker.indexExclude')
        || e.affectsConfiguration('obsidian-linker.indexLimit')) {
        void refreshPreview();
      }
    }),
  );
  await index.prepare();
  return {
    extendMarkdownIt: (md: MarkdownIt) => extendImagePreview(md, (target, env) => {
      const from = env && typeof env === 'object' && 'currentDocument' in env
        && env.currentDocument instanceof vscode.Uri ? env.currentDocument : undefined;
      return index.resolveCached(target, from)?.toString();
    }),
  };
}
