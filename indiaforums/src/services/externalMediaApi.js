import api from './api';

// ── External Media API ────────────────────────────────────────────────────────
// Routes (per OpenAPI spec, all under /api/v1/external-media/):
//
//   GET /external-media/giphy              — GIFs: trending or search (q optional)
//   GET /external-media/tenor              — GIFs: featured or search (q optional, pc = cursor)
//   GET /external-media/unsplash           — Photos: random or search (q optional)
//   GET /external-media/unsplash-download  — Track Unsplash download (required by ToS)
//   GET /external-media/pixabay            — Stock images (q optional)
//   GET /external-media/pixabay/videos     — Stock videos (q optional)
//   GET /external-media/pexels             — Photos from Pexels (q optional)
//   GET /external-media/pexels/videos      — Videos from Pexels (q optional)
//   GET /external-media/ifmedia            — Internal IF media library (q optional)
//
// All endpoints return `type: string` (proxied raw JSON from upstream APIs).
// All are anonymous — no auth required.
// Used primarily in the post composer's media picker panel.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = '/external-media';

// ── GIF pickers ──────────────────────────────────────────────────────────────

/**
 * Fetch GIFs from Giphy. Omit `q` for trending results.
 *
 * @param {object} [args]
 * @param {string} [args.q]     search query (omit for trending)
 * @param {number} [args.pn=1]  page number
 * @param {number} [args.ps=24] page size
 */
export function getGiphy({ q, pn = 1, ps = 24 } = {}) {
  const params = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/giphy`, { params });
}

/**
 * Fetch GIFs from Tenor. Omit `q` for featured results.
 * Tenor uses cursor-based pagination — pass `pc` from previous response.
 *
 * @param {object} [args]
 * @param {string} [args.q]     search query (omit for featured)
 * @param {number} [args.ps=24] page size
 * @param {string} [args.pc]    next-page cursor from previous response
 */
export function getTenor({ q, ps = 24, pc } = {}) {
  const params = { ps };
  if (q)  params.q  = q;
  if (pc) params.pc = pc;
  return api.get(`${BASE}/tenor`, { params });
}

// ── Photo pickers ─────────────────────────────────────────────────────────────

/**
 * Fetch photos from Unsplash. Omit `q` for random results.
 *
 * ⚠ Unsplash ToS requires calling trackUnsplashDownload() when the user
 *   inserts a photo. Pass the photo's `download_url` from the response.
 *
 * @param {object} [args]
 * @param {string} [args.q]     search query (omit for random)
 * @param {number} [args.pn=1]
 * @param {number} [args.ps=24]
 */
export function getUnsplash({ q, pn = 1, ps = 24 } = {}) {
  const params = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/unsplash`, { params });
}

/**
 * Track an Unsplash photo download. Required by Unsplash API Terms of Service.
 * Call this when the user inserts an Unsplash photo into a post.
 *
 * @param {string} url - the photo's download_location URL from the Unsplash response
 */
export function trackUnsplashDownload(url) {
  return api.get(`${BASE}/unsplash-download`, { params: { url } });
}

/**
 * Fetch stock images from Pixabay. Omit `q` for popular/random.
 *
 * @param {object} [args]
 * @param {string} [args.q]
 * @param {number} [args.pn=1]
 * @param {number} [args.ps=24]
 */
export function getPixabay({ q, pn = 1, ps = 24 } = {}) {
  const params = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/pixabay`, { params });
}

/**
 * Fetch stock videos from Pixabay. Omit `q` for popular/random.
 *
 * @param {object} [args]
 * @param {string} [args.q]
 * @param {number} [args.pn=1]
 * @param {number} [args.ps=24]
 */
export function getPixabayVideos({ q, pn = 1, ps = 24 } = {}) {
  const params = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/pixabay/videos`, { params });
}

/**
 * Fetch photos from Pexels. Omit `q` for curated results.
 *
 * @param {object} [args]
 * @param {string} [args.q]
 * @param {number} [args.pn=1]
 * @param {number} [args.ps=24]
 */
export function getPexels({ q, pn = 1, ps = 24 } = {}) {
  const params = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/pexels`, { params });
}

/**
 * Fetch videos from Pexels. Omit `q` for popular results.
 *
 * @param {object} [args]
 * @param {string} [args.q]
 * @param {number} [args.pn=1]
 * @param {number} [args.ps=24]
 */
export function getPexelsVideos({ q, pn = 1, ps = 24 } = {}) {
  const params = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/pexels/videos`, { params });
}

// ── Internal library ──────────────────────────────────────────────────────────

/**
 * Fetch photos from the IndiaForums internal media library.
 *
 * @param {object} [args]
 * @param {string} [args.q]     search query
 * @param {number} [args.pn=1]
 * @param {number} [args.ps=24]
 */
export function getIFMedia({ q, pn = 1, ps = 24 } = {}) {
  const params = { pn, ps };
  if (q) params.q = q;
  return api.get(`${BASE}/ifmedia`, { params });
}
