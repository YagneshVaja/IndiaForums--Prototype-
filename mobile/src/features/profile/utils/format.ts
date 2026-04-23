export function fmtNum(n: number | string | null | undefined): string {
  if (n == null) return '0';
  const v = typeof n === 'number' ? n : parseInt(n, 10);
  if (!Number.isFinite(v)) return '0';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k';
  return String(v);
}

export function timeAgo(input: string | null | undefined): string {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  const diff = Math.max(0, Date.now() - d.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return sec <= 1 ? 'just now' : sec + 's ago';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  const day = Math.floor(hr / 24);
  if (day < 7) return day + 'd ago';
  const wk = Math.floor(day / 7);
  if (wk < 4) return wk + 'w ago';
  const mo = Math.floor(day / 30);
  if (mo < 12) return mo + 'mo ago';
  const yr = Math.floor(day / 365);
  return yr + 'y ago';
}

export function fmtDate(input: string | null | undefined): string {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtJoinMonthYear(input: string | null | undefined): string {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/**
 * Strip HTML tags and normalize whitespace. API comment/topic bodies often
 * contain BBCode/HTML; this yields a short preview-safe string.
 */
export function stripHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
