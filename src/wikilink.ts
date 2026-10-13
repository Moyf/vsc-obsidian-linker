export interface WikilinkParts {
  /** Note path/name, decoded, without anchors or alias. Empty string for `[[#heading]]`. */
  target: string;
  alias?: string;
  heading?: string;
  blockId?: string;
}

export interface WikilinkMatch extends WikilinkParts {
  /** Start offset of `[[` or `![[` in the line. */
  start: number;
  /** End offset (exclusive) of `]]` in the line. */
  end: number;
  raw: string;
}

const WIKILINK_RE = /!?\[\[([^\[\]\n]+?)\]\]/g;

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export function parseWikilinkText(inside: string): WikilinkParts {
  let body = inside;
  let alias: string | undefined;

  const pipe = body.indexOf('|');
  if (pipe >= 0) {
    const rawAlias = body.slice(pipe + 1).trim();
    alias = rawAlias ? safeDecode(rawAlias) : undefined;
    // Markdown tables escape alias separators as \| to keep them inside one cell.
    body = body.slice(0, pipe).replace(/\\$/, '');
  }

  let blockId: string | undefined;
  let heading: string | undefined;

  const caret = body.indexOf('#^');
  if (caret >= 0) {
    const rawBlock = body.slice(caret + 2).trim();
    blockId = rawBlock || undefined;
    body = body.slice(0, caret);
  } else {
    const hash = body.indexOf('#');
    if (hash >= 0) {
      const rawHeading = body.slice(hash + 1).trim();
      heading = rawHeading ? safeDecode(rawHeading) : undefined;
      body = body.slice(0, hash);
    }
  }

  return { target: safeDecode(body.trim()), alias, heading, blockId };
}

export function findWikilinksInLine(line: string): WikilinkMatch[] {
  const matches: WikilinkMatch[] = [];
  WIKILINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WIKILINK_RE.exec(line)) !== null) {
    matches.push({
      ...parseWikilinkText(m[1]),
      start: m.index,
      end: m.index + m[0].length,
      raw: m[0],
    });
  }
  return matches;
}

export function wikilinkAtOffset(line: string, offset: number): WikilinkMatch | undefined {
  return findWikilinksInLine(line).find((l) => offset >= l.start && offset <= l.end);
}

export function isInsideInlineCode(line: string, index: number): boolean {
  let backticks = 0;
  for (let i = 0; i < index && i < line.length; i++) {
    if (line[i] === '`') {
      backticks++;
    }
  }
  return backticks % 2 === 1;
}

export function isFenceLine(line: string): boolean {
  return /^\s{0,3}(```|~~~)/.test(line);
}

export function fenceMarkerOf(line: string): string {
  const m = /^\s{0,3}(```|~~~)/.exec(line);
  return m ? m[1].slice(0, 3) : '';
}
