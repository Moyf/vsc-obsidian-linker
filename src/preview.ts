import type MarkdownIt from 'markdown-it';
import { imageEmbed } from './images';
import { findWikilinksInLine } from './wikilink';

export function extendImagePreview(
  md: MarkdownIt,
  resolve: (target: string, env: unknown) => string | undefined,
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
      token.attrSet('src', md.normalizeLink(match.target.replace(/\\/g, '/')));
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
    for (const token of tokens) {
      const target = token.attrGet('data-obsidian-target');
      if (target) {
        token.attrSet('src', resolve(target, env) ?? md.normalizeLink(target.replace(/\\/g, '/')));
        token.attrs = token.attrs?.filter(([name]) => name !== 'data-src') ?? null;
      }
    }
    return renderInline(tokens, options, env);
  };
  return md;
}
