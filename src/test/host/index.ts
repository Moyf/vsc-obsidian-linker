import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import * as vscode from 'vscode';
import { buildObsidianUri, isInsideVault } from '../../obsidian';

async function waitUntil(check: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!check()) {
    assert.ok(Date.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

export async function run(): Promise<void> {
  if (process.env.OBSIDIAN_LINKER_SINGLE_NOTE) {
    assert.equal(vscode.workspace.workspaceFolders, undefined);
    const note = vscode.Uri.file(process.env.OBSIDIAN_LINKER_SINGLE_NOTE);
    const doc = await vscode.workspace.openTextDocument(note);
    await vscode.window.showTextDocument(doc);
    await vscode.extensions.getExtension('Moy.obsidian-linker')!.activate();
    const html = await vscode.commands.executeCommand<string>('markdown.api.render', doc);
    assert.ok(html);
    assert.match(html, /Open a folder or workspace/);
    assert.doesNotMatch(html, /href="[^#][^"]*target/);
    assert.match(html, /href="#local-heading"/);
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', note, new vscode.Position(0, 3));
    assert.ok(hovers?.some((hover) => hover.contents.some((content) =>
      content instanceof vscode.MarkdownString && content.value.includes('Open Folder')
      && !content.value.includes('Create note'))));
    console.log('HOST QA PASSED: single-file workspace guidance and local heading');
    return;
  }
  const examplePath = 'H:\\Docs\\Obsinote\\中文 空格.md';
  const exampleUri = buildObsidianUri(vscode.Uri.file(examplePath), '');
  assert.ok(exampleUri);
  const serialized = encodeURI(vscode.Uri.parse(exampleUri).toString(true));
  assert.equal(new URL(serialized).searchParams.get('path'), vscode.Uri.file(examplePath).fsPath.replace(/\\/g, '/'));
  const outside = vscode.Uri.file('D:/Apps/Su/读我.md');
  const standalone = buildObsidianUri(outside, 'obsinote', false);
  assert.ok(standalone);
  assert.equal(new URL(standalone).searchParams.get('vault'), 'obsinote');
  assert.equal(new URL(standalone).searchParams.get('file'), `file:${outside.fsPath.replace(/\\/g, '/')}`);
  assert.equal(new URL(standalone).searchParams.has('path'), false);
  const withoutVault = buildObsidianUri(outside, '', false);
  assert.ok(withoutVault);
  assert.equal(new URL(withoutVault).searchParams.has('vault'), false);
  assert.equal(new URL(withoutVault).searchParams.get('file'), `file:${outside.fsPath.replace(/\\/g, '/')}`);
  // Given: an isolated workspace with an image outside the note's directory.
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  assert.ok(root);
  const folder = vscode.Uri.joinPath(root, randomUUID());
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(folder, 'attachments'));
  const image = vscode.Uri.joinPath(folder, 'attachments', 'preview.png');
  await vscode.workspace.fs.writeFile(image, Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN3sAAAAASUVORK5CYII=', 'base64'));
  const note = vscode.Uri.joinPath(folder, 'note.md');
  const targetNote = vscode.Uri.joinPath(folder, 'attachments', 'target note.md');
  await vscode.workspace.fs.writeFile(targetNote, Buffer.from('# Some Heading\n\n# 中文标题！'));
  for (const rel of ['这个笔记.md', '这个图片.png', '这个有.dot.md', '这个百分%20.md', '这个重复.md', 'attachments/这个重复.md']) {
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, rel), Buffer.from('# Test'));
  }
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, 'same.png'), await vscode.workspace.fs.readFile(image));
  await vscode.workspace.fs.writeFile(note, Buffer.from(
    '![[preview.png|300x200]]\n\n`![[preview.png]]`\n\n[[target%20note|oo]] [[target note#Some Heading|section]] [[#Local Heading]] [[missing|gone]]\n\n# Local Heading'));
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
  const external = vscode.Uri.joinPath(folder, 'external-created.md');
  const watcher = vscode.workspace.createFileSystemWatcher('**/external-created.md');
  const created = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('External file creation was not detected')), 10000);
    const subscription = watcher.onDidCreate(() => {
      clearTimeout(timeout);
      subscription.dispose();
      resolve();
    });
  });
  await writeFile(external.fsPath, 'External note');
  await created;
  watcher.dispose();
  const externalLink = await vscode.workspace.openTextDocument({ language: 'markdown', content: '[[external-created.md]]' });
  const externalLinks = await vscode.commands.executeCommand<vscode.DocumentLink[]>('vscode.executeLinkProvider', externalLink.uri);
  assert.ok(externalLinks?.some((link) => link.target?.toString() === external.toString()));

  // When: VS Code's real Markdown engine renders the document.
  const html = await vscode.commands.executeCommand<string>('markdown.api.render', doc);
  // Then: image paths resolve through the workspace index and code stays literal.
  assert.ok(html);
  assert.ok(html.includes(image.toString()));
  assert.match(html, /width="300"/);
  assert.match(html, /height="200"/);
  assert.match(html, /<code>!\[\[preview.png\]\]<\/code>/);
  assert.match(html, /href="\.\/attachments\/target%20note.md"[^>]*>oo<\/a>/);
  assert.match(html, /data-href="\.\/attachments\/target%20note.md#some-heading"/);
  assert.match(html, /href="#local-heading"/);
  assert.match(html, /id="local-heading"/);
  assert.match(html, /Target not found in the workspace index/);
  const contextAttr = /data-vscode-context="([^"]+)"/.exec(html)!;
  assert.ok(contextAttr);
  const linkContext = JSON.parse(contextAttr[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'"));
  assert.equal(linkContext.obsidianTarget, 'target note');
  assert.equal(linkContext.webviewSection, 'obsidianWikilink');
  assert.match(html, /data-obsidian-new-tab="vscode[^:]*:\/\/moy.obsidian-linker\/preview-link/i);
  const bridgeUri = vscode.Uri.parse(/data-obsidian-new-tab="([^"]+)"/.exec(html)![1]);
  const bridgeQuery = new URLSearchParams(bridgeUri.query);
  assert.equal(bridgeQuery.get('obsidianSource'), doc.uri.toString());
  assert.equal(bridgeQuery.get('obsidianTarget'), 'target note');
  await vscode.commands.executeCommand('markdown.showPreview', note);
  const previews = () => vscode.window.tabGroups.all.flatMap((group) => group.tabs)
    .filter((tab) => tab.input instanceof vscode.TabInputWebview);
  await waitUntil(() => previews().length === 1, 'Source Preview did not open');
  await vscode.commands.executeCommand('obsidian-linker.previewOpenInNewTab', linkContext);
  await waitUntil(() => previews().length === 2, 'New tab replaced the source Preview');
  assert.equal(previews().at(-1)?.isPreview, false, 'Target Preview should be pinned');
  const markdownConfig = vscode.workspace.getConfiguration('markdown');
  await markdownConfig.update('preview.openMarkdownLinks', 'inEditor', vscode.ConfigurationTarget.Workspace);
  await vscode.commands.executeCommand('obsidian-linker.previewOpenInNewTab', { ...linkContext, obsidianHeading: 'Some Heading' });
  assert.equal(vscode.window.activeTextEditor?.document.uri.toString(), targetNote.toString());
  assert.equal(vscode.window.activeTextEditor?.selection.active.line, 0);
  assert.equal(vscode.window.tabGroups.activeTabGroup.activeTab?.isPreview, false);
  await markdownConfig.update('preview.openMarkdownLinks', undefined, vscode.ConfigurationTarget.Workspace);

  const completionDoc = await vscode.workspace.openTextDocument({ language: 'markdown', content: '[[这个\n`[[这个\n[[这个笔记#标题|别名]]' });
  const completionEditor = await vscode.window.showTextDocument(completionDoc);
  const suggestions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', completionDoc.uri, new vscode.Position(0, 4));
  const ours = suggestions!.items.filter((item) => item.kind === vscode.CompletionItemKind.File);
  const label = (item: vscode.CompletionItem) => typeof item.label === 'string' ? item.label : item.label.label;
  assert.equal(ours.length, 6);
  assert.equal(label(ours.at(-1)!), '这个图片.png');
  assert.ok(ours.filter((item) => label(item) === '这个重复.md').some((item) => String(item.insertText).includes('/attachments/')));
  assert.ok(ours.every((item) => String(item.insertText).endsWith(']]')));
  assert.ok(ours.some((item) => item.insertText === '这个有.dot.md]]'));
  assert.ok(ours.some((item) => item.insertText === '这个百分%2520]]'));
  const codeSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', completionDoc.uri, new vscode.Position(1, 5));
  assert.ok(!codeSuggestions?.items.some((item) => item.kind === vscode.CompletionItemKind.File));
  const anchorSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', completionDoc.uri, new vscode.Position(2, 4));
  assert.ok(anchorSuggestions?.items.some((item) => item.insertText === '这个笔记'));

  // Simulate committed Chinese input through VS Code's real typing command.
  await completionEditor.edit((edit) => edit.replace(new vscode.Range(0, 0, completionDoc.lineCount - 1,
    completionDoc.lineAt(completionDoc.lineCount - 1).text.length), ''));
  completionEditor.selection = new vscode.Selection(0, 0, 0, 0);
  await vscode.commands.executeCommand('default:type', { text: '「' });
  await vscode.commands.executeCommand('default:type', { text: '「' });
  await waitUntil(() => completionDoc.getText() === '[[', 'Chinese brackets were not converted');
  assert.equal(completionEditor.selection.active.character, 2);
  const chineseSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', completionDoc.uri, new vscode.Position(0, 2));
  assert.ok(chineseSuggestions?.items.some((item) => label(item) === '这个笔记.md'));
  await vscode.commands.executeCommand('hideSuggestWidget');
  await vscode.commands.executeCommand('undo');
  assert.notEqual(completionDoc.getText(), '[[', 'Undo reconverted Chinese brackets');
  await vscode.window.showTextDocument(doc);
  const missingHovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', note, new vscode.Position(4, doc.lineAt(4).text.indexOf('[[missing') + 3));
  assert.ok(missingHovers?.some((hover) => hover.contents.some((content) =>
    content instanceof vscode.MarkdownString && content.value.includes('Index Settings'))));

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
  await vscode.commands.executeCommand('obsidian-linker.openLink', image.toString(), 'default');
  assert.ok(vscode.window.tabGroups.all.some((group) => group.tabs.some((tab) =>
    tab.input instanceof vscode.TabInputCustom && tab.input.uri.toString() === image.toString())));
  await vscode.commands.executeCommand('obsidian-linker.openLink', image.toString(), 'split');
  assert.ok(vscode.window.tabGroups.all.length > 1);

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
  assert.match(sameHtml, /Check the path, exclude settings, and Obsidian Linker index settings\./);
  // Reuse VS Code's cached tokens while a link is excluded and then restored.
  await config.update('indexExclude', ['**/target note.md'], vscode.ConfigurationTarget.Workspace);
  const excludedDoc = await vscode.workspace.openTextDocument({ language: 'markdown', content: '[[target' });
  const excludedSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', excludedDoc.uri, new vscode.Position(0, 8));
  assert.ok(!excludedSuggestions?.items.some((item) => label(item) === 'target note.md'));
  await vscode.commands.executeCommand('vscode.executeHoverProvider', note, new vscode.Position(4, 3));
  await vscode.commands.executeCommand('markdown.api.reloadPlugins');
  const missingHtml = await vscode.commands.executeCommand<string>('markdown.api.render', doc);
  assert.ok(missingHtml);
  assert.doesNotMatch(missingHtml, /href="\.\/attachments\/target%20note.md/);
  await config.update('indexExclude', [], vscode.ConfigurationTarget.Workspace);
  const restoredSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', excludedDoc.uri, new vscode.Position(0, 8));
  assert.ok(restoredSuggestions?.items.some((item) => label(item) === 'target note.md'));
  await vscode.commands.executeCommand('vscode.executeHoverProvider', note, new vscode.Position(4, 3));
  await vscode.commands.executeCommand('markdown.api.reloadPlugins');
  const restoredHtml = await vscode.commands.executeCommand<string>('markdown.api.render', doc);
  assert.match(restoredHtml!, /href="\.\/attachments\/target%20note.md"/);
  // A second workspace root is the only place this target exists.
  const extra = vscode.Uri.joinPath(root, '..', 'extra');
  await vscode.workspace.fs.createDirectory(extra);
  const extraTarget = `extra-${randomUUID()}`;
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(extra, extraTarget + '.md'), Buffer.from('# Extra'));
  const multiNote = vscode.Uri.joinPath(folder, 'multi.md');
  await vscode.workspace.fs.writeFile(multiNote, Buffer.from(`[[${extraTarget}|other root]]`));
  const multiDoc = await vscode.workspace.openTextDocument(multiNote);
  const beforeAdd = await vscode.commands.executeCommand<string>('markdown.api.render', multiDoc);
  assert.doesNotMatch(beforeAdd!, /<a[^>]+href=/);
  async function changeFolders(start: number, deleteCount: number, ...folders: { uri: vscode.Uri }[]) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { listener.dispose(); reject(new Error('Workspace folder change timed out')); }, 10000);
      const listener = vscode.workspace.onDidChangeWorkspaceFolders(() => { clearTimeout(timer); listener.dispose(); resolve(); });
      assert.ok(vscode.workspace.updateWorkspaceFolders(start, deleteCount, ...folders));
    });
    // Wait for the same index used by Preview, without manually invalidating it.
    await vscode.commands.executeCommand('vscode.executeHoverProvider', multiNote, new vscode.Position(0, 3));
  }
  await changeFolders(1, 0, { uri: extra });
  const afterAdd = await vscode.commands.executeCommand<string>('markdown.api.render', multiDoc);
  assert.match(afterAdd!, /<a [^>]*>other root<\/a>/);
  await changeFolders(1, 1);
  const afterRemove = await vscode.commands.executeCommand<string>('markdown.api.render', multiDoc);
  assert.doesNotMatch(afterRemove!, /<a[^>]+href=/);
  assert.equal(await isInsideVault(vscode.Uri.joinPath(folder, 'outside.md')), false);
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(folder, '.obsidian'));
  assert.equal(await isInsideVault(vscode.Uri.joinPath(folder, 'attachments', 'inside.md')), true);
  console.log('HOST QA PASSED: Preview tabs, note completion, Chinese input, links, headings, missing-target feedback, and image hover');
}
