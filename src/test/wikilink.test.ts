import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findWikilinksInLine, isFenceLine, isInsideInlineCode, parseWikilinkText, wikilinkAtOffset, fenceMarkerOf } from '../wikilink';

test('parses a simple link', () => {
  const line = 'See [[Note Name]] here.';
  const [m] = findWikilinksInLine(line);
  assert.equal(m.target, 'Note Name');
  assert.equal(m.alias, undefined);
  assert.equal(m.heading, undefined);
  assert.equal(m.start, 4);
  assert.equal(m.end, 17);
});

test('parses alias', () => {
  const [m] = findWikilinksInLine('[[Note|My Alias]]');
  assert.equal(m.target, 'Note');
  assert.equal(m.alias, 'My Alias');
});

test('parses the escaped alias separator used in Markdown tables', () => {
  const [m] = findWikilinksInLine('[[folder/Note\\|My Alias]]');
  assert.equal(m.target, 'folder/Note');
  assert.equal(m.alias, 'My Alias');
});

test('parses heading anchor and alias together', () => {
  const [m] = findWikilinksInLine('[[Note#Section|a]]');
  assert.equal(m.target, 'Note');
  assert.equal(m.heading, 'Section');
  assert.equal(m.alias, 'a');
});

test('parses block reference', () => {
  const [m] = findWikilinksInLine('[[Note#^abc123]]');
  assert.equal(m.target, 'Note');
  assert.equal(m.blockId, 'abc123');
  assert.equal(m.heading, undefined);
});

test('parses same-file heading link', () => {
  const [m] = findWikilinksInLine('[[#Top]]');
  assert.equal(m.target, '');
  assert.equal(m.heading, 'Top');
});

test('decodes percent-encoded targets', () => {
  assert.equal(parseWikilinkText('My%20Note').target, 'My Note');
});

test('finds multiple links per line', () => {
  const matches = findWikilinksInLine('[[a]] and [[b|B]]');
  assert.equal(matches.length, 2);
  assert.equal(matches[0].target, 'a');
  assert.equal(matches[1].target, 'b');
  assert.equal(matches[1].alias, 'B');
});

test('locates link at offset', () => {
  const line = 'x [[note]] y';
  assert.ok(wikilinkAtOffset(line, 4));
  assert.ok(wikilinkAtOffset(line, 9));
  assert.equal(wikilinkAtOffset(line, 0), undefined);
  assert.equal(wikilinkAtOffset(line, 11), undefined);
});

test('detects inline code spans', () => {
  assert.equal(isInsideInlineCode('`[[a]]`', 0), false);
  assert.equal(isInsideInlineCode('`[[a]]`', 1), true);
  assert.equal(isInsideInlineCode('`[[a]]`', 3), true);
  assert.equal(isInsideInlineCode('plain [[a]]', 8), false);
});

test('detects fence lines', () => {
  assert.ok(isFenceLine('```ts'));
  assert.ok(isFenceLine('  ~~~'));
  assert.ok(isFenceLine('```'));
  assert.equal(isFenceLine('text'), false);
  assert.equal(fenceMarkerOf('```ts'), '```');
  assert.equal(fenceMarkerOf('  ~~~'), '~~~');
});
