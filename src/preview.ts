import type MarkdownIt from 'markdown-it';
import GithubSlugger from 'github-slugger';
import { imageEmbed } from './images';
import { findWikilinksInLine, type WikilinkMatch } from './wikilink';

type ResolvePreview = (target: string, env: unknown, kind: 'image' | 'link') => string | undefined;
type MissingMessage = (target: string, env: unknown) => string;

export interface PreviewLabels {
  /** Tooltip for block-reference links, which only open the file. */
  blockRefTooltip?: string;
}

const DEFAULT_BLOCK_REF_TOOLTIP = 'Block references open the file; exact block navigation is not supported.';

function unresolved(md: MarkdownIt, label: string, message: string): string {
  const escape = md.utils.escapeHtml;
  return `<a class="obsidian-link-unresolved" role="link" aria-disabled="true" title="${escape(message)}" aria-label="${escape(`${label}: ${message}`)}">`
    + `${escape(label)}</a>`;
}

export function extendPreview(
  md: MarkdownIt,
  resolve: ResolvePreview,
  missingMessage: MissingMessage = () => 'Target not found in the workspace index. Check the path, exclude settings, and Obsidian Linker index settings.',
  linkAttributes?: (match: WikilinkMatch, env: unknown) => Record<string, string>,
  labels?: PreviewLabels,
): MarkdownIt {
  extendImagePreview(md, (target, env) => resolve(target, env, 'image'), missingMessage);
  const wikilinkRule: Parameters<MarkdownIt['inline']['ruler']['before']>[2] = (state, silent) => {
    const embed = state.src.startsWith('![[', state.pos);
    if (!embed && !state.src.startsWith('[[', state.pos)) return false;
    const [match] = findWikilinksInLine(state.src.slice(state.pos, state.posMax));
    if (!match || match.start !== 0) return false;
    if (embed && imageEmbed(match)) return false; // Let the image rule handle it.
    if (!embed && silent) return false; // Allow native Markdown link labels to contain literal wikilinks.
    // Non-image transclusions remain literal; do not turn their inner [[...]] into links.
    if (!embed && state.pos > 0 && state.src[state.pos - 1] === '!') return false;
    if (!embed && (state as typeof state & { linkLevel: number }).linkLevel > 0) return false;
    if (!silent) {
      const token = state.push(embed ? 'text' : 'obsidian_wikilink', '', 0);
      token.content = embed ? match.raw : match.alias ?? (match.target + (match.heading ? `#${match.heading}` : match.blockId ? `#^${match.blockId}` : ''));
      token.meta = match;
      if (!embed) {
        const open = new state.Token('link_open', 'a', 1);
        const label = new state.Token('text', '', 0);
        label.content = token.content;
        token.children = [open, label, new state.Token('link_close', 'a', -1)];
      }
    }
    state.pos += match.end;
    return true;
  };
  try {
    md.inline.ruler.before('link', 'obsidian_wikilink', wikilinkRule);
  } catch {
    // Some VS Code builds ship a markdown-it whose inline ruler has no 'link' rule.
    // 'image' is always present (our own image rule anchors to it above).
    md.inline.ruler.before('image', 'obsidian_wikilink', wikilinkRule);
  }
  md.renderer.rules.obsidian_wikilink = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const match = token.meta as ReturnType<typeof findWikilinksInLine>[number];
    const href = resolve(match.target, env, 'link');
    if (!href || (!match.target && !match.heading && !match.blockId)) {
      return unresolved(md, token.content, missingMessage(match.target, env));
    }
    const anchor = match.heading ? GithubSlugger.slug(match.heading.split('#').pop()!.trim()) : undefined;
    const open = token.children![0];
    // Always re-resolve: the native preview can reuse tokens after an index/context change.
    open.attrs = [['href', anchor ? `${href.split('#')[0]}#${encodeURIComponent(anchor)}` : href]];
    for (const [name, value] of Object.entries(linkAttributes?.(match, env) ?? {})) open.attrSet(name, value);
    if (match.blockId) open.attrSet('title', labels?.blockRefTooltip ?? DEFAULT_BLOCK_REF_TOOLTIP);
    return self.renderInline(token.children!, options, env);
  };
  return md;
}

export function extendImagePreview(
  md: MarkdownIt,
  resolve: (target: string, env: unknown) => string | undefined,
  missingMessage?: MissingMessage,
): MarkdownIt {
  md.inline.ruler.before('image', 'obsidian_image', (state, silent) => {
    if (!state.src.startsWith('![[', state.pos)) {
      return false;
    }
    const [match] = findWikilinksInLine(state.src.slice(state.pos, state.posMax));
    if (!match || match.start !== 0) {
      return false;
    }
    const image = imageEmbed(match);
    if (!image) {
      return false;
    }
    if (!silent) {
      const token = state.push('image', 'img', 0);
      token.attrSet('src', '');
      token.attrSet('data-obsidian-raw', match.raw);
      token.attrSet('alt', '');
      token.attrSet('data-obsidian-target', match.target);
      if (image.width) token.attrSet('width', String(image.width));
      if (image.height) token.attrSet('height', String(image.height));
      const label = new state.Token('text', '', 0);
      label.content = image.alt;
      token.children = [label];
      token.content = image.alt;
    }
    state.pos += match.end;
    return true;
  });

  // Resolve during rendering: VS Code only supplies currentDocument at this stage.
  // Keep the native image renderer so VS Code handles webview URIs and image tracking.
  const renderInline = md.renderer.renderInline.bind(md.renderer);
  md.renderer.renderInline = (tokens, options, env: unknown) => {
    const renderedTokens = tokens.map((token) => {
      const target = token.attrGet('data-obsidian-target');
      if (target) {
        const src = resolve(target, env);
        if (!src) {
          if (missingMessage) {
            // Render feedback without changing cached image tokens or loading raw paths.
            const fallback = Object.assign(Object.create(Object.getPrototypeOf(token)), token);
            fallback.type = 'html_inline';
            fallback.content = unresolved(md, token.children?.[0]?.content ?? target, missingMessage(target, env));
            return fallback;
          }
          token.type = 'text';
          token.content = token.attrGet('data-obsidian-raw') ?? '';
          return token;
        }
        token.type = 'image';
        token.attrSet('src', src);
        token.attrs = token.attrs?.filter(([name]) => name !== 'data-src') ?? null;
      }
      return token;
    });
    return renderInline(renderedTokens, options, env);
  };
  return md;
}
