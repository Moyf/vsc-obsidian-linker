import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('Preview middle click opens the link bridge without intercepting left or right clicks', () => {
  const handlers = new Map<string, (event: any) => void>();
  const opened: string[] = [];
  class Element {
    constructor(private readonly bridge?: string) {}
    closest() { return this.bridge ? this : null; }
    getAttribute() { return this.bridge; }
  }
  runInNewContext(readFileSync('media/preview.js', 'utf8'), {
    Element,
    window: { open: (url: string) => { opened.push(url); return {}; } },
    document: {
      addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler),
      createElement: () => ({ href: '', click() { opened.push(this.href); }, remove() {} }),
      body: { append() {} },
    },
  });
  const event = (button: number, target: Element) => ({
    button, target, prevented: false, stopped: false,
    preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; },
  });
  const link = new Element('vscode://Moy.obsidian-linker/preview-link?obsidianTarget=note');
  for (const button of [0, 2]) {
    const e = event(button, link);
    handlers.get('auxclick')!(e);
    assert.equal(e.prevented, false);
  }
  const plain = event(1, new Element());
  handlers.get('auxclick')!(plain);
  assert.equal(plain.prevented, false);
  const down = event(1, link);
  handlers.get('mousedown')!(down);
  assert.equal(down.prevented, true);
  const middle = event(1, link);
  handlers.get('auxclick')!(middle);
  assert.equal(middle.prevented, true);
  assert.equal(middle.stopped, true);
  assert.deepEqual(opened, ['vscode://Moy.obsidian-linker/preview-link?obsidianTarget=note']);
});

test('Preview middle click falls back to a synthetic left click when popups are unavailable', () => {
  const handlers = new Map<string, (event: any) => void>();
  const clicked: string[] = [];
  class Element {
    constructor(private readonly bridge?: string) {}
    closest() { return this.bridge ? this : null; }
    getAttribute() { return this.bridge; }
    dispatchEvent(e: any) { clicked.push(e.type); return true; }
  }
  class MouseEvent {
    constructor(public type: string, public init: object) {}
  }
  runInNewContext(readFileSync('media/preview.js', 'utf8'), {
    Element,
    MouseEvent,
    window: { open: () => null },
    document: {
      addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler),
      createElement: () => ({ href: '', click() { throw new Error('must not synthesize an anchor'); }, remove() {} }),
      body: { append() {} },
    },
  });
  const link = new Element('vscode://Moy.obsidian-linker/preview-link?obsidianTarget=note');
  const middle = {
    button: 1, target: link, prevented: false, stopped: false,
    preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; },
  };
  handlers.get('auxclick')!(middle);
  assert.equal(middle.prevented, true);
  assert.equal(middle.stopped, true);
  assert.deepEqual(clicked, ['click']);
});
