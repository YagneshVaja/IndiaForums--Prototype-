export type SocialPlatform =
  | 'twitter' | 'instagram' | 'facebook' | 'tiktok' | 'reddit' | 'youtube';

const SOCIAL_URL_RE = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com|instagram\.com|facebook\.com|fb\.watch|tiktok\.com|reddit\.com|youtube\.com|youtu\.be)[^\s"'<)]+/gi;

export function detectPlatform(url: string): SocialPlatform | null {
  if (!url) return null;
  if (/twitter\.com|x\.com/i.test(url))      return 'twitter';
  if (/instagram\.com/i.test(url))           return 'instagram';
  if (/facebook\.com|fb\.watch/i.test(url))  return 'facebook';
  if (/tiktok\.com/i.test(url))              return 'tiktok';
  if (/reddit\.com/i.test(url))              return 'reddit';
  if (/youtube\.com|youtu\.be/i.test(url))   return 'youtube';
  return null;
}

/**
 * Find every social-media URL in a block of text or HTML. Trailing sentence
 * punctuation is trimmed so "https://youtu.be/abc." resolves to the valid URL.
 * Duplicates are removed so the same video doesn't embed twice.
 */
export function extractSocialUrls(text?: string | null): string[] {
  if (!text) return [];
  const raw = text.match(SOCIAL_URL_RE) || [];
  const out = new Set<string>();
  for (const m of raw) {
    const cleaned = m.replace(/[.,;:!?]+$/, '');
    if (detectPlatform(cleaned)) out.add(cleaned);
  }
  return [...out];
}

/**
 * Remove any social-media URLs from plain text so they render as embeds
 * only (not both as a raw URL and an embed).
 */
export function stripSocialUrlsFromText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(SOCIAL_URL_RE, (m) => {
      const cleaned = m.replace(/[.,;:!?]+$/, '');
      return detectPlatform(cleaned) ? '' : m;
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function extractTweetId(url: string): string | null {
  const m = url.match(/status\/(\d+)/);
  return m ? m[1] : null;
}

export function extractTikTokId(url: string): string | null {
  const m = url.match(/video\/(\d+)/);
  return m ? m[1] : null;
}

export function extractRedditPath(url: string): string | null {
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return null;
  }
}
