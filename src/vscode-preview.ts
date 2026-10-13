import * as vscode from 'vscode';
import * as path from 'path';
import type MarkdownIt from 'markdown-it';
import type { NoteIndex } from './notes';
import { extendPreview } from './preview';
import { previewLinkAttributes, registerPreviewActions } from './preview-actions';
import { t } from './i18n';

function currentDocument(env: unknown): vscode.Uri | undefined {
  return env && typeof env === 'object' && 'currentDocument' in env
    && env.currentDocument instanceof vscode.Uri ? env.currentDocument : undefined;
}

export async function createPreview(context: vscode.ExtensionContext, index: NoteIndex) {
  registerPreviewActions(context, index);
  const refreshPreview = async () => {
    await index.prepare();
    await vscode.commands.executeCommand('markdown.api.reloadPlugins');
  };
  context.subscriptions.push(
    index.onDidInvalidate(refreshPreview),
  );
  await index.prepare();
  return {
    extendMarkdownIt: (md: MarkdownIt) => extendPreview(md, (target, env, kind) => {
      const from = currentDocument(env);
      if (!target && kind === 'link') return from ? '#' : undefined;
      const uri = index.resolveCached(target, from);
      if (!uri) return undefined;
      if (kind === 'image') return uri.toString();
      if (!from || from.scheme !== uri.scheme || from.authority !== uri.authority) return undefined;
      // Relative links go through the Markdown preview's native openLink handler.
      // file: links bypass that handler in some supported VS Code versions.
      const relative = path.posix.relative(path.posix.dirname(from.path), uri.path);
      return './' + relative.split('/').map(encodeURIComponent).join('/');
    }, (target, env) => index.missingMessage(target, currentDocument(env)), (match, env) => {
      const from = currentDocument(env);
      return from ? previewLinkAttributes(context.extension.id, from, match.target, match.heading) : {};
    }, {
      blockRefTooltip: t(
        'Block references open the file; exact block navigation is not supported.',
        '块引用当前只会打开所在文件，暂不支持定位到具体块。',
      ),
    }),
  };
}
