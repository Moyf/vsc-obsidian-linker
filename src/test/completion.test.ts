import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isMarkdownCodeAt, wikilinkCompletionContext } from '../completion-context';

test('wikilink completion replaces only the target and preserves anchors and aliases', () => {
  for (const suffix of [']]', '#标题|名字]]', '|名字]]']) {
    const text = '正文 [[这个名称' + suffix;
    assert.deepEqual(wikilinkCompletionContext(text, 7), { query: '这个', start: 5, end: 9, close: false });
  }
  assert.deepEqual(wikilinkCompletionContext('![[这个', 5), { query: '这个', start: 3, end: 5, close: true });
  assert.deepEqual(wikilinkCompletionContext('[[', 2), { query: '', start: 2, end: 2, close: true });
});

test('completion ignores closed links, anchors, aliases, escaped syntax, and code', () => {
  for (const text of ['[[这个]]', '[[这个#标题', '[[这个|名字', '\\[[这个', '`[[这个', '``[[这个', '```md\n[[这个', '~~~\n[[这个', '    [[这个']) {
    assert.equal(wikilinkCompletionContext(text, text.length), undefined, text);
  }
  assert.ok(wikilinkCompletionContext('`代码` [[这个', 10));
  assert.ok(wikilinkCompletionContext('``代码`示例`` [[这个', 14));
});

test('Chinese bracket conversion ignores code with matching fence lengths and escaped backticks', () => {
  for (const text of ['``code`「「', '````md\n```\n「「', '> ```\n> 「「', '    「「']) {
    assert.equal(isMarkdownCodeAt(text, text.indexOf('「「')), true, text);
  }
  for (const text of ['```md\n```\n「「', '``示例`代码`` 「「', '\\`不是代码 「「']) {
    assert.equal(isMarkdownCodeAt(text, text.indexOf('「「')), false, text);
  }
});
