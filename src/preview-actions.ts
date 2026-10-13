import * as vscode from 'vscode';
import GithubSlugger from 'github-slugger';
import type { NoteIndex } from './notes';
import { openNote } from './notes';

interface PreviewLinkContext {
  obsidianSource: string;
  obsidianTarget: string;
  obsidianHeading: string;
}

export function previewLinkAttributes(
  extensionId: string, source: vscode.Uri, target: string, heading = '',
): Record<string, string> {
  const data: PreviewLinkContext = {
    obsidianSource: source.toString(), obsidianTarget: target, obsidianHeading: heading,
  };
  const bridge = vscode.Uri.from({
    scheme: vscode.env.uriScheme, authority: extensionId, path: '/preview-link',
    query: new URLSearchParams(data as unknown as Record<string, string>).toString(),
  });
  return {
    'data-vscode-context': JSON.stringify({ webviewSection: 'obsidianWikilink', preventDefaultContextMenuItems: true, ...data }),
    'data-obsidian-new-tab': bridge.toString(),
  };
}

export function registerPreviewActions(context: vscode.ExtensionContext, index: NoteIndex): void {
  async function resolveContext(value: unknown) {
    if (!value || typeof value !== 'object') return undefined;
    const data = value as Partial<PreviewLinkContext>;
    if (typeof data.obsidianSource !== 'string' || typeof data.obsidianTarget !== 'string'
      || typeof data.obsidianHeading !== 'string') return undefined;
    let source: vscode.Uri;
    try { source = vscode.Uri.parse(data.obsidianSource); } catch { return undefined; }
    // Context attributes and deep links can be forged: resolve against the live index.
    if (!vscode.workspace.textDocuments.some((doc) => doc.uri.toString() === source.toString())) return undefined;
    const uri = data.obsidianTarget ? await index.resolve(data.obsidianTarget, source) : source;
    return uri ? { source, uri, heading: data.obsidianHeading } : undefined;
  }

  async function open(value: unknown, beside: boolean) {
    const resolved = await resolveContext(value);
    if (!resolved) return;
    const { source, uri, heading } = resolved;
    const fragment = heading ? GithubSlugger.slug(heading.split('#').pop()!.trim()) : '';
    const inPreview = vscode.workspace.getConfiguration('markdown', source)
      .get('preview.openMarkdownLinks', 'inPreview') === 'inPreview';
    if (inPreview && /\.md$/i.test(uri.path)) {
      // A locked preview opens independently instead of replacing the source preview.
      await vscode.commands.executeCommand(beside ? 'markdown.showPreviewToSide' : 'markdown.showPreview',
        uri.with({ fragment }), undefined, { locked: true });
      await vscode.commands.executeCommand('workbench.action.keepEditor');
    } else if (/\.md$/i.test(uri.path)) {
      await openNote(uri, beside ? 'split' : 'newTab', heading);
    } else {
      await vscode.commands.executeCommand('vscode.open', uri, {
        preview: false, viewColumn: beside ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active,
      });
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('obsidian-linker.previewOpenInNewTab', (data) => open(data, false)),
    vscode.commands.registerCommand('obsidian-linker.previewOpenToSide', (data) => open(data, true)),
    vscode.commands.registerCommand('obsidian-linker.previewCopyLink', async (data) => {
      const resolved = await resolveContext(data);
      if (resolved) {
        const fragment = resolved.heading ? GithubSlugger.slug(resolved.heading.split('#').pop()!.trim()) : '';
        await vscode.env.clipboard.writeText(resolved.uri.with({ fragment }).toString());
      }
    }),
    vscode.window.registerUriHandler({
      handleUri: async (uri) => {
        if (uri.path !== '/preview-link') return;
        const query = new URLSearchParams(uri.query);
        await open({
          obsidianSource: query.get('obsidianSource'), obsidianTarget: query.get('obsidianTarget'),
          obsidianHeading: query.get('obsidianHeading'),
        }, false);
      },
    }),
  );
}
