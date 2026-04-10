// src/hooks/useShorts.js
//
// Actual API response (confirmed live 2026-04-09):
//   GET /api/v1/shorts?pageNumber=1&pageSize=20
//   { data: [ { shortId, title, description, pageUrl, shortUpdateChecksum,
//               statusCode, publishedWhen, credits, linkUrl } ],
//     totalCount: 1845 }
//
// No thumbnailUrl in response — built from: shortId + pageUrl + shortUpdateChecksum
// No categoryId per item — category tabs are static (SHORTS_CATEGORIES)
// No pagination envelope — compute hasNextPage from totalCount

import { useState, useEffect, useCallback, useRef } from 'react';
import { getShorts } from '../services/shortsApi';
import { extractApiError } from '../services/api';
import { SHORTS_CATEGORIES } from '../data/shorts';

// ── Visual fallbacks ──────────────────────────────────────────────────────────
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#ec4899)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
];

function pickGradient(index) {
  return FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
}

// publishedWhen is an ISO string: "2025-08-14T19:38:25.583"
function formatDate(publishedWhen) {
  if (!publishedWhen) return '';
  try {
    const d = new Date(publishedWhen);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return ''; }
}

// Thumbnail must be constructed — no thumbnailUrl field in API:
// https://img.indiaforums.com/shorts/720x0/0/{shortId}-{pageUrl}.webp?c={checksum}
function buildThumbnail(raw) {
  if (!raw.shortId || !raw.pageUrl) return null;
  const checksum = raw.shortUpdateChecksum ? `?c=${raw.shortUpdateChecksum}` : '';
  return `https://img.indiaforums.com/shorts/720x0/0/${raw.shortId}-${raw.pageUrl}.webp${checksum}`;
}

// Destination URL when tapping "Read Full Story":
// linkUrl may be a YouTube short or an IndiaForums article — use it directly.
// Fallback: construct the IndiaForums shorts page URL.
function buildTargetUrl(raw) {
  if (raw.linkUrl) return raw.linkUrl;
  return `https://www.indiaforums.com/shorts/${raw.shortId}/${raw.pageUrl}`;
}

function transformShort(raw, index) {
  return {
    id:          raw.shortId,
    title:       raw.title       || 'Untitled',
    description: raw.description || '',
    pageUrl:     buildTargetUrl(raw),
    thumbnail:   buildThumbnail(raw),
    publishedAt: formatDate(raw.publishedWhen),
    credits:     raw.credits     || '',        // author / source credit
    bg:          pickGradient(index),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// categoryId = parentCategoryId value (null = All)
export default function useShorts({ categoryId = null, pageSize: initPageSize = 20 } = {}) {
  const [allShorts,  setAllShorts]  = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const pageSize                    = initPageSize;
  const loadingRef                  = useRef(false);

  const load = useCallback(async (pageNum = 1, replace = true) => {
    if (!replace && loadingRef.current) return;
    loadingRef.current = true;
    if (replace) { setLoading(true); setError(null); }
    try {
      const res        = await getShorts({ page: pageNum, pageSize, categoryId });
      // Confirmed shape: { data: Short[], totalCount: number }
      const rawList    = Array.isArray(res.data?.data) ? res.data.data : [];
      const totalCount = res.data?.totalCount || 0;
      const hasNextPage = pageNum * pageSize < totalCount;

      const items = rawList.map((s, i) => transformShort(s, (replace ? 0 : allShorts.length) + i));
      setAllShorts(prev => replace ? items : [...prev, ...items]);
      setPagination({ currentPage: pageNum, pageSize, hasNextPage, totalCount });
    } catch (err) {
      setError(extractApiError(err, 'Failed to load shorts'));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, categoryId]);

  // Reset + reload whenever categoryId changes
  useEffect(() => { load(1, true); }, [load]);

  const refresh  = useCallback(() => load(1, true), [load]);
  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !loadingRef.current) {
      load(pagination.currentPage + 1, false);
    }
  }, [pagination, load]);

  return {
    shorts: allShorts,
    categories: SHORTS_CATEGORIES,
    pagination,
    loading,
    error,
    loadMore,
    refresh,
  };
}
