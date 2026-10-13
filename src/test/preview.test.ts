import assert from 'node:assert/strict';
import { test } from 'node:test';
import MarkdownIt from 'markdown-it';
import { extendImagePreview, extendPreview } from '../preview';
import { imageEmbed } from '../images';
import { findWikilinksInLine } from '../wikilink';

test('renders an embedded image when its filename resolves to an attachment', () => {
  // Given
  const md = extendImagePreview(new MarkdownIt(), (target) =>
    target === 'image.png' ? 'file:///vault/attachments/image.png' : undefined);
  // When
  const html = md.render('![[image.png|300x200]]');
  // Then
  assert.match(html, /<img[^>]+src="file:\/\/\/vault\/attachments\/image.png"/);
  assert.match(html, /width="300"/);
  assert.match(html, /height="200"/);
});

test('uses the native image renderer when rendering an embed', () => {
  // Given
  const md = extendImagePreview(new MarkdownIt(), () => 'file:///vault/image.png');
  md.renderer.rules.image = (tokens, idx) => `<img src="webview:${tokens[idx].attrGet('src')}">`;
  // When
  const html = md.render('![[image.png]]');
  // Then
  assert.match(html, /src="webview:file:\/\/\/vault\/image.png"/);
});

test('preserves literal syntax when embeds occur in code or are not images', () => {
  // Given
  const md = extendImagePreview(new MarkdownIt(), () => undefined);
  // When
  const html = md.render('`![[image.png]]`\n\n```md\n![[image.png]]\n```\n\n![[note]] [[image.png]] \\![[image.png]]');
  // Then
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /<code>!\[\[image.png\]\]<\/code>/);
});

test('escapes image filenames and labels when rendering resolved images', () => {
  // Given
  const md = extendImagePreview(new MarkdownIt(), () => 'file:///vault/folder/a%20b.png');
  // When
  const html = md.render('![[folder/a%20b.png|<script>alert(1)</script>]]');
  // Then
  assert.match(html, /src="file:\/\/\/vault\/folder\/a%20b.png"/);
  assert.match(html, /alt="&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('keeps unresolved or excluded embeds literal instead of loading raw targets', () => {
  // Given
  const md = extendImagePreview(new MarkdownIt(), () => undefined);
  // When
  const html = md.render('![[same.png]] ![[https://example.com/image.png]] ![[javascript:alert.png]]');
  // Then
  assert.doesNotMatch(html, /<img/);
});

test('identifies image embeds when the cursor is on the exclamation mark', () => {
  // Given
  const line = 'x ![[image.PNG|240]]';
  // When
  const [match] = findWikilinksInLine(line);
  const image = imageEmbed(match);
  // Then
  assert.equal(match.start, 2);
  assert.equal(match.raw, '![[image.PNG|240]]');
  assert.deepEqual(image, { alt: 'image.PNG', width: 240 });
});

test('resolves cached tokens again when the current document changes', () => {
  // Given
  const md = extendImagePreview(new MarkdownIt(), (_target, env) =>
    typeof env === 'string' ? `file:///vault/${env}/image.png` : undefined);
  const tokens = md.parse('![[image.png]]', {});
  md.renderer.render(tokens, md.options, 'first');
  // When
  const html = md.renderer.render(tokens, md.options, 'second');
  // Then
  assert.match(html, /src="file:\/\/\/vault\/second\/image.png"/);
});

test('restores cached image tokens when an excluded attachment becomes resolvable', () => {
  // Given
  const md = extendImagePreview(new MarkdownIt(), (_target, env) => env === 'ready' ? 'file:///vault/image.png' : undefined);
  const tokens = md.parse('![[image.png]]', {});
  md.renderer.render(tokens, md.options, 'excluded');
  // When
  const html = md.renderer.render(tokens, md.options, 'ready');
  // Then
  assert.match(html, /<img[^>]+src="file:\/\/\/vault\/image.png"/);
});

test('renders wikilinks with aliases, encoded paths, and heading anchors through the native link renderer', () => {
  const md = extendPreview(new MarkdownIt(), (target) => target ? `./${encodeURIComponent(target)}.md` : '#');
  md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
    tokens[idx].attrSet('data-href', tokens[idx].attrGet('href')!);
    return self.renderToken(tokens, idx, options);
  };
  const html = md.render('[[My%20Note|oo]] [[My Note#Some Heading|section]] [[#中文标题]] [[My Note]]');
  assert.match(html, /href="\.\/My%20Note.md" data-href="\.\/My%20Note.md">oo<\/a>/);
  assert.match(html, /href="\.\/My%20Note.md#some-heading"[^>]*>section<\/a>/);
  assert.match(html, /href="#%E4%B8%AD%E6%96%87%E6%A0%87%E9%A2%98"/);
  assert.match(html, />My Note<\/a>/);
});

test('keeps code, escaped wikilinks, nested links, and non-image transclusions literal', () => {
  const md = extendPreview(new MarkdownIt(), () => './note.md');
  const html = md.render('`[[note]]`\n\n```md\n[[note]]\n```\n\n\\[[note]] \\![[image.png]] ![[note]] ![[doc.pdf]] [see [[note]]](./other.md)');
  assert.equal((html.match(/<a /g) ?? []).length, 1);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /!\[\[note\]\]/);
  assert.match(html, />see \[\[note\]\]<\/a>/);
});

test('escapes aliases and unresolved feedback and never opens raw unindexed targets', () => {
  const md = extendPreview(new MarkdownIt(), (target) => target === 'note' ? './note.md' : undefined,
    (target) => `Target not found: "${target}". Check index settings.`);
  const html = md.render('[[note|<script>x</script>]] [[javascript:alert(1)|oops]] [[https://example.com|external]] ![[same.png]]');
  assert.match(html, />&lt;script&gt;x&lt;\/script&gt;<\/a>/);
  assert.doesNotMatch(html, /<script|<img|href="(?:javascript|https):/);
  assert.match(html, /class="obsidian-link-unresolved"/);
  assert.match(html, /title="Target not found: &quot;javascript:alert\(1\)&quot;/);
  assert.match(html, /aria-disabled="true"[^>]*>oops<\/a>/);
  assert.match(html, /aria-disabled="true"[^>]*>same.png<\/a>/);
  assert.doesNotMatch(html, /\[\[|⚠/);
});

test('re-resolves cached wikilinks and images across missing and document-context changes', () => {
  const md = extendPreview(new MarkdownIt(), (target, env, kind) => env === 'missing' ? undefined
    : kind === 'image' ? `file:///vault/${env}/${target}` : `./${env}/${target}.md`);
  const tokens = md.parse('[[note|oo]] ![[image.png|300]]', {});
  const first = md.renderer.render(tokens, md.options, 'first');
  assert.match(first, /href="\.\/first\/note.md"/);
  const missing = md.renderer.render(tokens, md.options, 'missing');
  assert.doesNotMatch(missing, /<a[^>]+href=|<img|first\/note/);
  assert.match(missing, /obsidian-link-unresolved/);
  const second = md.renderer.render(tokens, md.options, 'second');
  assert.match(second, /href="\.\/second\/note.md"/);
  assert.match(second, /src="file:\/\/\/vault\/second\/image.png"/);
  assert.match(second, /width="300"/);
});

test('block references open the note with an explicit limitation tooltip', () => {
  const md = extendPreview(new MarkdownIt(), (target) => target ? './note.md' : '#');
  const html = md.render('[[note#^block|quote]] [[#^local]]');
  assert.match(html, /href="\.\/note.md" title="Block references open the file/);
  assert.match(html, /href="#" title="Block references open the file/);
});

test('renders escaped alias and image-size separators inside Markdown tables', () => {
  const md = extendPreview(new MarkdownIt(), (target, _env, kind) =>
    kind === 'image' ? `file:///vault/${target}` : `./${target}.md`);
  const html = md.render('| Link | Image |\n| --- | --- |\n| [[note\\|Alias]] | ![[image.png\\|300]] |');
  assert.match(html, /<td><a href="\.\/note.md">Alias<\/a><\/td>/);
  assert.match(html, /<img[^>]+src="file:\/\/\/vault\/image.png"[^>]+width="300"/);
});
