import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  // Given: an isolated workspace with an image outside the note's directory.
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  assert.ok(root);
  const folder = vscode.Uri.joinPath(root, randomUUID());
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(folder, 'attachments'));
  const image = vscode.Uri.joinPath(folder, 'attachments', 'preview.png');
  await vscode.workspace.fs.writeFile(image, Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN3sAAAAASUVORK5CYII=', 'base64'));
  const note = vscode.Uri.joinPath(folder, 'note.md');
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, 'same.png'), await vscode.workspace.fs.readFile(image));
  await vscode.workspace.fs.writeFile(note, Buffer.from('![[preview.png|300x200]]\n\n`![[preview.png]]`'));
  const doc = await vscode.workspace.openTextDocument(note);
  const duplicate = vscode.Uri.joinPath(root, 'duplicate.png');
  await vscode.workspace.fs.writeFile(duplicate, await vscode.workspace.fs.readFile(image));
  const attachment = vscode.Uri.joinPath(folder, 'attachments', 'duplicate.png');
  await vscode.workspace.fs.writeFile(attachment, await vscode.workspace.fs.readFile(image));
  const explicitNote = vscode.Uri.joinPath(folder, 'explicit.md');
  await vscode.workspace.fs.writeFile(explicitNote, Buffer.from(`![[${folder.path.split('/').pop()}/attachments/duplicate.png]]`));
  await vscode.window.showTextDocument(doc);
  const extension = vscode.extensions.getExtension('Moy.obsidian-linker');
  assert.ok(extension);
  await extension.activate();

  // When: VS Code's real Markdown engine renders the document.
  const html = await vscode.commands.executeCommand<string>('markdown.api.render', doc);
  // Then: image paths resolve through the workspace index and code stays literal.
  assert.ok(html);
  assert.ok(html.includes(image.toString()));
  assert.match(html, /width="300"/);
  assert.match(html, /height="200"/);
  assert.match(html, /<code>!\[\[preview.png\]\]<\/code>/);

  // When: the path explicitly selects an attachment among duplicate basenames.
  const explicitDoc = await vscode.workspace.openTextDocument(explicitNote);
  const explicitHtml = await vscode.commands.executeCommand<string>('markdown.api.render', explicitDoc);
  // Then: the workspace-relative path wins over the shallower duplicate.
  assert.ok(explicitHtml?.includes(attachment.toString()));

  // When: VS Code invokes the hover provider on the embed marker.
  const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', note, new vscode.Position(0, 0));
  // Then: the hover includes a Markdown image using the resolved file URI.
  assert.ok(hovers?.some((hover) => hover.contents.some((content) =>
    content instanceof vscode.MarkdownString && content.value.includes(`${image.toString()}|width=300,height=200`))));

  // Given: 0.1.5's Markdown-only setting excludes attachments from the index.
  const config = vscode.workspace.getConfiguration('obsidian-linker');
  await config.update('indexOnlyMarkdown', true, vscode.ConfigurationTarget.Workspace);
  // When: the native preview rebuilds its plugin and renders again.
  await vscode.commands.executeCommand('vscode.executeHoverProvider', note, new vscode.Position(0, 0));
  await vscode.commands.executeCommand('markdown.api.reloadPlugins');
  const filteredHtml = await vscode.commands.executeCommand<string>('markdown.api.render', doc);
  // Then: no resolved attachment URI bypasses the user's index setting.
  assert.ok(filteredHtml && !filteredHtml.includes(image.toString()));
  const sameNote = vscode.Uri.joinPath(folder, 'same.md');
  await vscode.workspace.fs.writeFile(sameNote, Buffer.from('![[same.png]] ![[javascript:alert.png]] ![[https://example.com/image.png]]'));
  const sameDoc = await vscode.workspace.openTextDocument(sameNote);
  const sameHtml = await vscode.commands.executeCommand<string>('markdown.api.render', sameDoc);
  assert.ok(sameHtml);
  assert.doesNotMatch(sameHtml, /<img/);
  console.log('HOST QA PASSED: native Markdown preview and image hover');
}
