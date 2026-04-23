// Some backend responses ship raw BBCode that never got server-side translated
// to HTML — typically [QUOTE=name]…[/QUOTE] blocks along with [B]/[I]/[U]/[URL]
// and [IMG]. Rendering that via an HTML renderer shows the tags as literal
// text, which is the bug we see on the Bollywood topic screen. Convert the
// common tags to equivalent HTML so the existing blockquote/strong styles
// pick them up.
export function parseBBCode(html: string | null | undefined): string {
  if (!html) return '';
  let out = html;

  // Quote blocks can nest; run repeatedly until the innermost pair is gone.
  let prev: string;
  do {
    prev = out;
    out = out.replace(
      /\[QUOTE=([^\]]*?)\]([\s\S]*?)\[\/QUOTE\]/gi,
      (_m, name: string, body: string) =>
        `<blockquote><b>${name.trim()} said:</b><br/>${body}</blockquote>`,
    );
    out = out.replace(
      /\[QUOTE\]([\s\S]*?)\[\/QUOTE\]/gi,
      '<blockquote>$1</blockquote>',
    );
  } while (out !== prev);

  return out
    .replace(/\[B\]([\s\S]*?)\[\/B\]/gi, '<strong>$1</strong>')
    .replace(/\[I\]([\s\S]*?)\[\/I\]/gi, '<em>$1</em>')
    .replace(/\[U\]([\s\S]*?)\[\/U\]/gi, '<u>$1</u>')
    .replace(
      /\[URL=([^\]]+)\]([\s\S]*?)\[\/URL\]/gi,
      '<a href="$1">$2</a>',
    )
    .replace(/\[URL\]([\s\S]*?)\[\/URL\]/gi, '<a href="$1">$1</a>')
    .replace(/\[IMG\]([\s\S]*?)\[\/IMG\]/gi, '<img src="$1" alt="" />');
}

// Inline smiley images — backend renders shortcodes like :smiley2: as tiny
// <img src=".../smilies/smiley2.gif" alt="smiley2">. These should render as
// small inline glyphs, and if their CDN 404s we want them gone entirely
// rather than showing a broken-image box with the alt text.
const SMILEY_SRC_RE  = /smilie|smiley|emoji/i;
const SMILEY_ALT_RE  = /^(?::|smiley)/i;

export function isSmileyImage(src?: string, alt?: string): boolean {
  if (src && SMILEY_SRC_RE.test(src)) return true;
  if (alt && SMILEY_ALT_RE.test(alt)) return true;
  return false;
}

// Strip obviously-broken <img> tags from backend HTML before it reaches the
// HTML renderer. This is a belt-and-suspenders defense — the runtime
// renderer also hides broken images on load/error, but if any image slips
// past (e.g. the renderer isn't invoked for a specific tag configuration),
// this removes the worst cases up-front so they never reserve placeholder
// space for the user to stare at.
//
// We drop:
//   • <img> with no src attribute
//   • <img src=""> or <img src='   '> (empty / whitespace)
//   • <img src="about:blank">
//   • <img src="data:image/gif;base64,R0lGOD..."> — the canonical 1×1
//     transparent tracking pixel. Safe to remove for forum post rendering.
export function sanitizeHtmlImages(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<img\b(?![^>]*\bsrc=)[^>]*\/?\s*>/gi, '')
    .replace(/<img\b[^>]*\bsrc\s*=\s*(['"])\s*\1[^>]*\/?\s*>/gi, '')
    .replace(/<img\b[^>]*\bsrc\s*=\s*(['"])about:blank\1[^>]*\/?\s*>/gi, '')
    .replace(
      /<img\b[^>]*\bsrc\s*=\s*(['"])data:image\/gif;base64,R0lGOD[^'"]*\1[^>]*\/?\s*>/gi,
      '',
    );
}
