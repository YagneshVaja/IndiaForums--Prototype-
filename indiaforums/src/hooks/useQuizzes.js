import { useState, useEffect, useCallback, useRef } from 'react';
import * as quizzesApi from '../services/quizzesApi';
import { extractApiError } from '../services/api';

// ── Verified API response shapes (live-tested 2026-04-08) ────────────────────
//
// GET /quizzes
//   { data: { quizzes: Quiz[], categories: Category[] }, pagination: {...} }
//
// GET /quizzes/{id}/details
//   { data: { ...quizFields, questions: Question[], options: Option[], results: [] } }
//   NOTE: questions[].options is always [] — options are in the TOP-LEVEL options[]
//         array, linked by optionId/questionId.
//
// GET /quizzes/{id}/players
//   Plain array (no wrapper): [{ totalScore, userId, userName, realName, privacy, totalRank }]
//
// GET /quizzes/creators
//   Plain array (no wrapper): [{ userId, userName, realName, quizCount, privacy }]
//
// POST /quizzes/{id}/response
//   Payload: { answers: [{ questionId, optionId }] }
//   ⚠️ Currently 400 — "FinalResultForUser" column missing from FromSql query.
//   Tracked in docs/backend-issues-2026-04-07.md (Class D).
//   Frontend handles gracefully: shows local score on failure.

// ── Visual helpers ───────────────────────────────────────────────────────────
// API-confirmed categoryIds → gradients / emojis

const CAT_GRADIENTS = {
  1:  'linear-gradient(135deg,#7f1d1d,#ef4444)',   // Movies
  2:  'linear-gradient(135deg,#1d4ed8,#7c3aed)',   // TV Shows
  3:  'linear-gradient(135deg,#9d174d,#db2777)',   // Music
  4:  'linear-gradient(135deg,#7c3aed,#ec4899)',   // Celebrities
  5:  'linear-gradient(135deg,#78350f,#d97706)',   // Mythology
  6:  'linear-gradient(135deg,#1e3a5f,#2563eb)',   // Books & Literature
  7:  'linear-gradient(135deg,#831843,#f9a8d4)',   // Fashion & Style
  8:  'linear-gradient(135deg,#14532d,#16a34a)',   // Sports & Fitness
  9:  'linear-gradient(135deg,#f59e0b,#ef4444)',   // Fun & Random
  10: 'linear-gradient(135deg,#1e293b,#334155)',   // Business & Finance
  11: 'linear-gradient(135deg,#374151,#6b7280)',   // General Knowledge
};
const CAT_EMOJIS = {
  1: '🎬', 2: '📺', 3: '🎵', 4: '⭐', 5: '🔱',
  6: '📚', 7: '👗', 8: '🏏', 9: '🎲', 10: '💼', 11: '🌟',
};
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#ec4899)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
];
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#a78bfa)',
  'linear-gradient(135deg,#0ea5e9,#38bdf8)',
  'linear-gradient(135deg,#ec4899,#f9a8d4)',
  'linear-gradient(135deg,#f59e0b,#fcd34d)',
  'linear-gradient(135deg,#10b981,#6ee7b7)',
];

function pickGradient(categoryId, index) {
  return CAT_GRADIENTS[categoryId] || FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
}
function pickEmoji(categoryId) {
  return CAT_EMOJIS[categoryId] || '🧠';
}
function formatPublishedDate(raw) {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return null; }
}

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function getInitials(realName, userName) {
  const name = (realName || userName || '').trim();
  if (!name) return '?';
  const words = name.split(/\s+/);
  return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || '?';
}

// ── Transforms ───────────────────────────────────────────────────────────────

// Quiz type label derived from quizTypeId
function quizTypeName(quizTypeId) {
  if (quizTypeId === 4)                      return 'Range-Based';
  if (quizTypeId === 2 || quizTypeId === 3)  return 'Personality';
  return 'Trivia';
}

// Quiz list item  →  UI shape
function transformQuiz(raw, index) {
  return {
    id:            raw.quizId,
    title:         raw.title         || 'Untitled Quiz',
    description:   raw.description   || '',
    categoryId:    raw.categoryId    || 0,
    categoryLabel: '',                             // filled by caller with categories map
    quizTypeId:    raw.quizTypeId    || 1,
    quizTypeName:  quizTypeName(raw.quizTypeId || 1),
    questions:     raw.questionCount || 0,
    plays:         formatCount(raw.responseCount  || 0),
    plays_raw:     raw.responseCount || 0,
    views:         raw.viewCount     || 0,
    thumbnail:     raw.thumbnailUrl  || raw.imageUrl || null,
    pageUrl:           raw.pageUrl           || '',
    publishedWhen:     raw.publishedWhen     || '',
    publishedFormatted: formatPublishedDate(raw.publishedWhen),
    author:            raw.realName || raw.userName || raw.uploaderName || 'IndiaForums',
    bg:            pickGradient(raw.categoryId, index),
    emoji:         pickEmoji(raw.categoryId),
    // Detail-only fields (absent from list, populated by transformQuizDetail)
    quiz_questions:   null,
    estimatedTime:    0,
    directCommentCount: 0,
    tags:             [],
    results:          [],
  };
}

// Merge flat options array into each question; determine correct index.
// isCorrect: true on an option → trivia quiz (show correct/wrong feedback).
// All isCorrect: false → personality quiz (no feedback, just collect points).
function buildQuestions(questions, options) {
  // Group options by questionId
  const byQuestion = {};
  for (const opt of options) {
    (byQuestion[opt.questionId] = byQuestion[opt.questionId] || []).push(opt);
  }

  return questions
    .slice()
    .sort((a, b) => (a.orderNum || 0) - (b.orderNum || 0))
    .map((q) => {
      const opts = byQuestion[q.questionId] || [];
      const correctIdx = opts.findIndex(o => o.isCorrect === true);

      // Handle both camelCase and PascalCase field names from API
      const imgUrl = q.questionImageUrl || q.QuestionImageUrl
        || q.imageUrl || q.ImageUrl
        || q.gifUrl   || q.GifUrl
        || null;

      // Question image credit: provider name (e.g. "tenor") → "via Tenor"
      const credits = q.questionImageCredits || q.QuestionImageCredits;
      const creditLabel = credits
        ? (credits.provider || credits.uploader || credits.uploaderName || credits.source || null)
        : null;

      return {
        questionId:  q.questionId,
        question:    q.question || '',
        options:     opts.map(o => o.text || ''),
        optionIds:   opts.map(o => o.optionId),   // for submit payload
        points:      opts.map(o => o.points || 0),
        correct:     correctIdx,                   // -1 = personality quiz (no single correct)
        isTrivia:    correctIdx >= 0,
        // Question image (GIF / photo shown above options)
        questionImageUrl:    imgUrl,
        questionImageCredit: creditLabel ? `via ${creditLabel.charAt(0).toUpperCase()}${creditLabel.slice(1)}` : null,
        // Reveal content (shown after answering — optional)
        revealTitle:       q.revealTitle       || null,
        revealDescription: q.revealDescription || null,
        revealImageUrl:    q.revealThumbnailUrl || q.revealImageUrl || null,
      };
    });
}

// Full quiz detail  →  UI shape
function transformQuizDetail(raw, index) {
  const base = transformQuiz(raw, index ?? 0);
  const estimatedSec = raw.estimatedTimeInSeconds || 0;

  let tags = [];
  if (raw.tagsJsonData) {
    try {
      const parsed = JSON.parse(raw.tagsJsonData);
      tags = Array.isArray(parsed) ? parsed.map(t => t.name || t).filter(Boolean) : [];
    } catch { /* ignore malformed JSON */ }
  }

  return {
    ...base,
    countdownTimer:      raw.estimatedTimeInSeconds || 0,  // per-question time limit in seconds
    estimatedTime:       estimatedSec,
    estimatedTimeLabel:  estimatedSec > 0 ? `${Math.ceil(estimatedSec / 60)} min` : null,
    directCommentCount:  raw.directCommentCount || 0,
    tags,
    // Possible results for range-based / personality quizzes
    results: (raw.results || []).map(r => ({
      resultId:    r.resultId    ?? 0,
      title:       r.title       || '',
      description: r.description || '',
      lowerRange:  r.lowerRange  ?? 0,
      upperRange:  r.upperRange  ?? 0,
    })),
    // Merge options into questions
    quiz_questions: buildQuestions(raw.questions || [], raw.options || []),
  };
}

// Player (leaderboard row)  →  UI shape
function transformPlayer(raw, index) {
  const isPrivate = raw.privacy === 1;
  const displayName = isPrivate
    ? 'Anonymous'
    : ((raw.realName || raw.userName || '').trim() || `Player ${index + 1}`);
  return {
    id:       raw.userId    || index,
    name:     displayName,
    initials: isPrivate ? '?' : getInitials(raw.realName, raw.userName),
    score:    raw.totalScore ?? 0,
    rank:     raw.totalRank  ?? index + 1,
    avatarBg: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
  };
}

// Creator  →  UI shape
function transformCreator(raw, index) {
  const isPrivate = raw.privacy === 1;
  const displayName = isPrivate
    ? 'Anonymous'
    : ((raw.realName || raw.userName || '').trim() || `Creator ${index + 1}`);
  return {
    id:        raw.userId   || index,
    name:      displayName,
    initials:  isPrivate ? '?' : getInitials(raw.realName, raw.userName),
    quizCount: raw.quizCount || 0,
    avatarBg:  AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
    thumbnail: null,
  };
}

// ── 1. Paginated quiz list ───────────────────────────────────────────────────
// Also exposes `categories` from the list response for dynamic tab building.
export function useQuizzes(initialParams = {}) {
  const [allQuizzes,  setAllQuizzes]  = useState([]);
  const [categories,  setCategories]  = useState([]);   // [{categoryId, categoryName, quizCount}]
  const [pagination,  setPagination]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [params,      setParams]      = useState(initialParams);
  const loadingRef = useRef(false);

  const load = useCallback(async (pageNum = 1, replace = true) => {
    if (!replace && loadingRef.current) return;
    loadingRef.current = true;
    if (replace) { setLoading(true); setError(null); }
    try {
      const res = await quizzesApi.getQuizzes({ page: pageNum, pageSize: params.pageSize || 25 });
      // Confirmed shape: { data: { quizzes, categories }, pagination }
      const data       = res.data?.data || res.data || {};
      const rawQuizzes = data.quizzes   || [];
      const rawCats    = data.categories || [];
      const paginationRaw = res.data?.pagination || null;

      // Normalize pagination — API may use `pageNumber` or `currentPage`
      const pagination = paginationRaw ? {
        ...paginationRaw,
        currentPage: paginationRaw.currentPage ?? paginationRaw.pageNumber ?? pageNum,
        hasNextPage:  paginationRaw.hasNextPage  ?? false,
      } : null;

      // Build a categoryId → name lookup
      const catMap = {};
      for (const c of rawCats) catMap[c.categoryId] = c.categoryName;

      const items = rawQuizzes.map((q, i) => {
        const quiz = transformQuiz(q, i);
        quiz.categoryLabel = catMap[q.categoryId] || '';
        return quiz;
      });

      setAllQuizzes(prev => replace ? items : [...prev, ...items]);
      // Only set categories on first load
      if (replace && rawCats.length > 0) setCategories(rawCats);
      setPagination(pagination);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load quizzes'));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [params.pageSize]);

  useEffect(() => { load(1, true); }, [load]);

  const refresh  = useCallback(() => load(1, true), [load]);
  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !loadingRef.current) {
      load(pagination.currentPage + 1, false);
    }
  }, [pagination, load]);

  // Client-side filter by categoryId (null/0 = show all)
  const quizzes = params.categoryId
    ? allQuizzes.filter(q => q.categoryId === params.categoryId)
    : allQuizzes;

  return { quizzes, allQuizzes, categories, pagination, loading, error, params, setParams, refresh, loadMore };
}

// ── 2. Single quiz detail ────────────────────────────────────────────────────
export function useQuizDetails(quizId) {
  const [quiz,    setQuiz]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await quizzesApi.getQuizDetails(quizId);
      // Confirmed shape: { data: { ...quizFields, questions[], options[] } }
      const raw = res.data?.data || res.data || {};
      setQuiz(transformQuizDetail(raw));
    } catch (err) {
      setError(extractApiError(err, 'Failed to load quiz details'));
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { quiz, loading, error, refetch: fetch };
}

// ── 3. Quiz leaderboard / players ────────────────────────────────────────────
export function useQuizPlayers(quizId) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await quizzesApi.getQuizPlayers(quizId);
      // Confirmed shape: plain array (no wrapper)
      const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setPlayers(raw.map((p, i) => transformPlayer(p, i)));
    } catch (err) {
      setError(extractApiError(err, 'Failed to load leaderboard'));
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { players, loading, error, refetch: fetch };
}

// ── 4. Quiz creators ─────────────────────────────────────────────────────────
// Non-blocking — errors silently suppressed; the strip just won't render.
export function useQuizCreators() {
  const [creators, setCreators] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    let cancelled = false;
    quizzesApi.getQuizCreators({ pageSize: 10 })
      .then(res => {
        if (cancelled) return;
        // Confirmed shape: plain array (no wrapper)
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setCreators(raw.map((c, i) => transformCreator(c, i)));
      })
      .catch(err => { if (!cancelled) setError(extractApiError(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { creators, loading, error };
}

// ── 5. Submit quiz answers ───────────────────────────────────────────────────
// Payload: { answers: [{ questionId, optionId }] }
//
// ⚠️ POST /quizzes/{id}/response currently returns 400:
//   "The required column 'FinalResultForUser' was not present in the results
//    of a 'FromSql' operation." — Class D backend bug, same pattern as search/helpcenter.
// QuizResult gracefully falls back to the locally computed score on failure.
export function useSubmitQuiz() {
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);

  const submit = useCallback(async (quizId, answers) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await quizzesApi.submitQuizResponse(quizId, answers);
      setResult(res.data?.data || res.data || null);
    } catch (err) {
      // Non-fatal — result screen shows local score as fallback
      setError(extractApiError(err, 'Score could not be saved. Showing local result.'));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => { setResult(null); setError(null); }, []);

  return { submit, submitting, result, error, reset };
}
