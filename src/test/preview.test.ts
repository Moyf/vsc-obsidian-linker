import assert from 'node:assert/strict';
import { test } from 'node:test';
import MarkdownIt from 'markdown-it';
import { extendImagePreview } from '../preview';
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
