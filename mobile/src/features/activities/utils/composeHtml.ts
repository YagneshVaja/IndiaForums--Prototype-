// Shared composer helpers — building the HTML payload for /user-activities.
// The wall API stores `content` as HTML; images are embedded inline as
// <img> tags using the filePath returned from /upload/post-image, mirroring
// how forum replies are constructed in services/api.ts.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Compose the activity HTML body from a free-text message and 0+ uploaded
 * image paths. Newlines are converted to <br>; trailing/leading whitespace
 * is dropped. Images render on their own <p> for spacing parity with web.
 */
export function buildActivityHtml(text: string, imagePaths: string[] = []): string {
  const trimmed = text.trim();
  const textPart = trimmed
    ? `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`
    : '';
  const imgPart = imagePaths
    .filter(Boolean)
    .map((p) => `<p><img src="${p}" alt="attachment" /></p>`)
    .join('');
  return textPart + imgPart;
}
