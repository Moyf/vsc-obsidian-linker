function escaped(text: string, offset: number): boolean {
  let slashes = 0;
  while (offset > 0 && text[--offset] === '\\') slashes++;
  return slashes % 2 === 1;
}

/** Includes unfinished code spans so typing never rewrites code examples. */
export function isMarkdownCodeAt(text: string, offset: number): boolean {
  const lines = text.slice(0, offset).split(/\r?\n/);
  let fence: { marker: string; length: number } | undefined;
  let ticks = 0;
  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln];
    const marker = /^ {0,3}(?:>\s*)*(`{3,}|~{3,})(.*)$/.exec(line);
    if (marker) {
      if (!fence) {
        fence = { marker: marker[1][0], length: marker[1].length };
        ticks = 0;
      } else if (marker[1][0] === fence.marker && marker[1].length >= fence.length && !marker[2].trim()) {
        fence = undefined;
      }
      if (ln === lines.length - 1) return true;
      continue;
    }
    if (fence) continue;
    if (/^(?: {4}|\t)/.test(line)) {
      if (ln === lines.length - 1) return true;
      continue;
    }
    if (!line.trim()) ticks = 0;
    for (const match of line.matchAll(/`+/g)) {
      if (escaped(line, match.index!)) continue;
      if (!ticks) ticks = match[0].length;
      else if (ticks === match[0].length) ticks = 0;
    }
  }
  return !!fence || ticks > 0;
}

export function wikilinkCompletionContext(text: string, offset: number) {
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const before = text.slice(lineStart, offset);
  const opener = before.lastIndexOf('[[');
  if (opener < 0 || escaped(before, opener)) return undefined;
  const query = before.slice(opener + 2);
  if (/[\[\]#|\r\n]/.test(query) || isMarkdownCodeAt(text, lineStart + opener)) return undefined;
  const after = text.slice(offset).split(/\r?\n/, 1)[0];
  const tail = /^[^\[\]#|]*/.exec(after)![0];
  const suffix = after.slice(tail.length);
  return {
    query, start: lineStart + opener + 2, end: offset + tail.length,
    // No auto-close when a heading, alias, or already-typed closing bracket follows.
    close: !/^[#|\]]/.test(suffix),
  };
}
