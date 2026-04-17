import api from './api';

// ── External Media API ────────────────────────────────────────────────────────

const BASE = '/external-media';

// ── GIF pickers ──────────────────────────────────────────────────────────────

/**
 * Fetch GIFs from Giphy. Omit `q` for trending results.
 */
export function getGiphy({ q, pn = 1, ps = 24 }: { q?: string; pn?: number; ps?: number } = {}) {
  const params: any = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/giphy`, { params });
}

/**
 * Fetch GIFs from Tenor. Omit `q` for featured results.
 * Tenor uses cursor-based pagination — pass `pc` from previous response.
 */
export function getTenor({ q, ps = 24, pc }: { q?: string; ps?: number; pc?: string } = {}) {
  const params: any = { ps };
  if (q)  params.q  = q;
  if (pc) params.pc = pc;
  return api.get(`${BASE}/tenor`, { params });
}

// ── Photo pickers ─────────────────────────────────────────────────────────────

/**
 * Fetch photos from Unsplash. Omit `q` for random results.
 *
 * Unsplash ToS requires calling trackUnsplashDownload() when the user inserts a photo.
 */
export function getUnsplash({ q, pn = 1, ps = 24 }: { q?: string; pn?: number; ps?: number } = {}) {
  const params: any = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/unsplash`, { params });
}

/**
 * Track an Unsplash photo download. Required by Unsplash API Terms of Service.
 */
export function trackUnsplashDownload(url: string) {
  return api.get(`${BASE}/unsplash-download`, { params: { url } });
}

/**
 * Fetch stock images from Pixabay. Omit `q` for popular/random.
 */
export function getPixabay({ q, pn = 1, ps = 24 }: { q?: string; pn?: number; ps?: number } = {}) {
  const params: any = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/pixabay`, { params });
}

/**
 * Fetch stock videos from Pixabay. Omit `q` for popular/random.
 */
export function getPixabayVideos({ q, pn = 1, ps = 24 }: { q?: string; pn?: number; ps?: number } = {}) {
  const params: any = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/pixabay/videos`, { params });
}

/**
 * Fetch photos from Pexels. Omit `q` for curated results.
 */
export function getPexels({ q, pn = 1, ps = 24 }: { q?: string; pn?: number; ps?: number } = {}) {
  const params: any = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/pexels`, { params });
}

/**
 * Fetch videos from Pexels. Omit `q` for popular results.
 */
export function getPexelsVideos({ q, pn = 1, ps = 24 }: { q?: string; pn?: number; ps?: number } = {}) {
  const params: any = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/pexels/videos`, { params });
}

// ── Internal library ──────────────────────────────────────────────────────────

/**
 * Fetch photos from the IndiaForums internal media library.
 */
export function getIFMedia({ q, pn = 1, ps = 24 }: { q?: string; pn?: number; ps?: number } = {}) {
  const params: any = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/ifmedia`, { params });
}
