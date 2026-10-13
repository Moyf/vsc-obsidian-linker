import * as vscode from 'vscode';
import type { NoteIndex } from './notes';
import { isMarkdownCodeAt, wikilinkCompletionContext } from './completion-context';

export function registerWikilinkCompletion(context: vscode.ExtensionContext, index: NoteIndex): void {
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: 'markdown' }, {
    async provideCompletionItems(doc, position, token) {
      const match = wikilinkCompletionContext(doc.getText(), doc.offsetAt(position));
      if (!match) return undefined;
      const candidates = await index.suggest(match.query, doc.uri);
      if (token.isCancellationRequested) return undefined;
      const items = candidates.map((note, i) => {
        const item = new vscode.CompletionItem({ label: note.label, description: note.description }, vscode.CompletionItemKind.File);
        item.range = new vscode.Range(doc.positionAt(match.start), doc.positionAt(match.end));
        item.insertText = note.target + (match.close ? ']]' : '');
        item.filterText = match.query.includes('/') || match.query.includes('\\') ? note.target : note.label;
        item.sortText = i.toString().padStart(10, '0');
        item.detail = note.description;
        return item;
      });
      // Requery as the prefix changes; clients must not retain stale index results.
      return new vscode.CompletionList(items, true);
    },
  }, '[', ']'));

  let converting = false;
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
    const editor = vscode.window.activeTextEditor;
    if (converting || event.reason || editor?.document !== event.document
      || event.document.languageId !== 'markdown' || event.contentChanges.length !== 1) return;
    const change = event.contentChanges[0];
    // IME commits may replace a composition draft (rangeLength > 0); judge by the resulting text.
    if (change.text.length > 2 || !change.text.endsWith('「')) return;
    const text = event.document.getText();
    const end = change.rangeOffset + change.text.length;
    const start = end - 2;
    if (start < 0 || text.slice(start, end) !== '「「' || isMarkdownCodeAt(text, start)) return;
    if (/\\$/.test(text.slice(0, start))) return;
    converting = true;
    try {
      const changed = await editor.edit((edit) => {
        edit.replace(new vscode.Range(event.document.positionAt(start), event.document.positionAt(end)), '[[');
      }, { undoStopBefore: false, undoStopAfter: false });
      if (changed && vscode.window.activeTextEditor === editor) {
        await vscode.commands.executeCommand('editor.action.triggerSuggest');
      }
    } finally {
      converting = false;
    }
  }));

  // Show suggestions whenever the cursor sits right after `[[` with nothing typed
  // yet, so placeholder links can be filled in later: typed both closing brackets
  // first, arrowed back into one, or deleted back into one from a filled link.
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((event) => {
    const editor = event.textEditor;
    if (converting || event.selections.length !== 1 || !event.selections[0].isEmpty) return;
    if (editor.document.languageId !== 'markdown' || editor.document.uri.scheme !== 'file') return;
    const offset = editor.document.offsetAt(event.selections[0].active);
    const ctx = wikilinkCompletionContext(editor.document.getText(), offset);
    if (ctx && ctx.query === '') {
      void vscode.commands.executeCommand('editor.action.triggerSuggest');
    }
  }));
}
