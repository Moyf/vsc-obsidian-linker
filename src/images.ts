import type { WikilinkMatch } from './wikilink';

export interface ImageEmbed {
  readonly alt: string;
  readonly width?: number;
  readonly height?: number;
}

export function imageEmbed(match: WikilinkMatch): ImageEmbed | undefined {
  if (!match.raw.startsWith('!') || !/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(match.target)) {
    return undefined;
  }
  const size = /^([1-9]\d{0,4})(?:x([1-9]\d{0,4}))?$/.exec(match.alias ?? '');
  if (size) {
    return {
      alt: match.target,
      width: Number(size[1]),
      ...(size[2] ? { height: Number(size[2]) } : {}),
    };
  }
  return { alt: match.alias ?? match.target };
}
