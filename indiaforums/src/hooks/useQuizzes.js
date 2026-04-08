import { useState, useEffect, useCallback, useRef } from 'react';
import * as quizzesApi from '../services/quizzesApi';
import { extractApiError } from '../services/api';

// ── Envelope helpers ─────────────────────────────────────────────────────────
// API response shapes are assumed (see design spec §7 — verify once live).
// Multiple envelope patterns handled so hook works across API shape variants.

function unwrapList(data, ...keys) {
  if (!data) return [];
  const root = data?.data || data;
  for (const key of keys) {
    if (Array.isArray(root?.[key])) return root[key];
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (Array.isArray(root?.items))   return root.items;
  if (Array.isArray(root?.results)) return root.results;
  if (Array.isArray(root))          return root;
  return [];
}

function unwrapPagination(data) {
  return data?.pagination || null;
}

function unwrapObject(data, ...keys) {
  if (!data) return null;
  for (const key of keys) {
    if (data?.[key] && typeof data[key] === 'object' && !Array.isArray(data[key]))
      return data[key];
  }
  const root = data?.data || data;
  for (const key of keys) {
    if (root?.[key] && typeof root[key] === 'object' && !Array.isArray(root[key]))
      return root[key];
  }
  return root;
}

// ── Visual helpers ───────────────────────────────────────────────────────────
// The API does not return CSS gradients — generate them from the category.

const QUIZ_GRADIENTS = {
  bollywood: 'linear-gradient(135deg,#7c3aed,#ec4899)',
  tv:        'linear-gradient(135deg,#1d4ed8,#7c3aed)',
  reality:   'linear-gradient(135deg,#0891b2,#10b981)',
  general:   'linear-gradient(135deg,#374151,#6b7280)',
  movies:    'linear-gradient(135deg,#7f1d1d,#ef4444)',
  sports:    'linear-gradient(135deg,#14532d,#16a34a)',
};
const QUIZ_GRADIENT_FALLBACKS = [
  'linear-gradient(135deg,#7c3aed,#ec4899)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
];
const QUIZ_EMOJIS = {
  bollywood: '🎬', tv: '📺', reality: '🎤', general: '🌟',
  movies: '🎬', sports: '🏏',
};
const QUIZ_EMOJI_FALLBACKS = ['🧠', '💡', '⚡', '🔥', '🎯', '🏆'];
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#a78bfa)',
  'linear-gradient(135deg,#0ea5e9,#38bdf8)',
  'linear-gradient(135deg,#ec4899,#f9a8d4)',
  'linear-gradient(135deg,#f59e0b,#fcd34d)',
  'linear-gradient(135deg,#10b981,#6ee7b7)',
];

function pickGradient(cat, index) {
  const key = (cat || '').toLowerCase();
  return QUIZ_GRADIENTS[key] || QUIZ_GRADIENT_FALLBACKS[index % QUIZ_GRADIENT_FALLBACKS.length];
}

function pickEmoji(cat, index) {
  const key = (cat || '').toLowerCase();
  return QUIZ_EMOJIS[key] || QUIZ_EMOJI_FALLBACKS[(index || 0) % QUIZ_EMOJI_FALLBACKS.length];
}

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Transforms ───────────────────────────────────────────────────────────────
// Field names are assumed — adjust once API response shape is confirmed.

function transformQuiz(raw, index) {
  const cat = (raw.categoryName || raw.category || '').toString().toLowerCase();
  const playsRaw = raw.playCount || raw.plays_raw || raw.playsRaw || 0;
  return {
    id:            raw.quizId       || raw.id,
    title:         raw.title        || raw.quizTitle    || 'Untitled Quiz',
    category:      cat,
    categoryLabel: raw.categoryName || raw.categoryLabel || cat || 'General',
    difficulty:    (raw.difficulty  || raw.level         || 'medium').toLowerCase(),
    questions:     raw.totalQuestions || raw.questionCount || raw.questions || 0,
    plays:         raw.playCountFormatted || raw.plays || formatCount(playsRaw),
    plays_raw:     playsRaw,
    rating:        raw.rating       || '0.0',
    thumbnail:     raw.thumbnailUrl || raw.thumbnail    || null,
    bg:            pickGradient(cat, index),
    emoji:         pickEmoji(cat, index),
  };
}

function transformQuestion(q, index) {
  const rawOptions = q.options || q.answers || [];
  const options = rawOptions.map(o =>
    typeof o === 'string' ? o : (o.optionText || o.text || o.option || o.answer || '')
  );
  return {
    questionId:    q.questionId  || q.id    || index,
    question:      q.questionText || q.question || q.title || '',
    options,
    correct:       q.correctOptionIndex ?? q.correctAnswerIndex ?? q.correct ?? 0,
  };
}

function transformQuizDetail(raw, index) {
  const base = transformQuiz(raw, index ?? 0);
  return {
    ...base,
    author:        raw.creatorName  || raw.author         || 'IndiaForums',
    avg_score:     raw.avgScore     || raw.averageScore    || 0,
    time_limit:    raw.timeLimitMinutes || raw.timeLimit   || 10,
    points:        raw.totalPoints  || raw.points          || 0,
    description:   raw.description  || raw.about           || '',
    tags:          Array.isArray(raw.tags) ? raw.tags : [],
    comments:      Array.isArray(raw.comments) ? raw.comments : [],
    quiz_questions: (raw.questions || raw.quizQuestions || []).map(transformQuestion),
  };
}

function transformPlayer(p, index) {
  const name = p.displayName || p.userName || p.name || `Player ${index + 1}`;
  const words = name.trim().split(/\s+/);
  const initials = (words[0]?.[0] || '') + (words[1]?.[0] || '');
  return {
    id:       p.userId    || p.playerId   || index,
    name,
    initials: initials.toUpperCase() || 'P',
    score:    p.score     || p.correctAnswers || 0,
    totalQ:   p.totalQuestions || 0,
    time:     p.timeTaken || p.completionTime || p.time || '',
    rank:     p.rank      || index + 1,
    avatarBg: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
  };
}

function transformCreator(c, index) {
  const name = c.displayName || c.userName || c.name || `Creator ${index + 1}`;
  const words = name.trim().split(/\s+/);
  const initials = (words[0]?.[0] || '') + (words[1]?.[0] || '');
  return {
    id:       c.userId    || c.creatorId  || index,
    name,
    initials: initials.toUpperCase() || 'C',
    quizCount: c.quizCount || c.totalQuizzes || 0,
    avatarBg:  AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
    thumbnail: c.thumbnailUrl || c.avatar || null,
  };
}

// ── 1. Paginated quiz list ───────────────────────────────────────────────────
export function useQuizzes(initialParams = {}) {
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [params, setParams]         = useState(initialParams);
  const loadingRef = useRef(false);

  const load = useCallback(async (pageNum = 1, replace = true) => {
    if (!replace && loadingRef.current) return;
    loadingRef.current = true;
    if (replace) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await quizzesApi.getQuizzes({ page: pageNum, pageSize: params.pageSize || 20 });
      const raw = unwrapList(res.data, 'quizzes', 'items', 'data');
      const items = raw.map((q, i) => transformQuiz(q, i));
      setAllQuizzes(prev => replace ? items : [...prev, ...items]);
      setPagination(unwrapPagination(res.data));
    } catch (err) {
      setError(extractApiError(err, 'Failed to load quizzes'));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [params.pageSize]);

  useEffect(() => {
    load(1, true);
  }, [load]);

  const refresh = useCallback(() => load(1, true), [load]);

  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !loadingRef.current) {
      load(pagination.currentPage + 1, false);
    }
  }, [pagination, load]);

  // Client-side category filter (decision B from design spec)
  const quizzes = params.category && params.category !== 'all'
    ? allQuizzes.filter(q => q.category === params.category)
    : allQuizzes;

  return { quizzes, allQuizzes, pagination, loading, error, params, setParams, refresh, loadMore };
}

// ── 2. Single quiz detail ────────────────────────────────────────────────────
export function useQuizDetails(quizId) {
  const [quiz, setQuiz]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await quizzesApi.getQuizDetails(quizId);
      const raw = unwrapObject(res.data, 'quiz', 'quizDetails', 'data');
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
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await quizzesApi.getQuizPlayers(quizId);
      const raw = unwrapList(res.data, 'players', 'leaderboard', 'items');
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
// Non-blocking — error is suppressed; the creators strip simply won't render.
export function useQuizCreators() {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    let cancelled = false;
    quizzesApi.getQuizCreators({ pageSize: 10 })
      .then(res => {
        if (cancelled) return;
        const raw = unwrapList(res.data, 'creators', 'users', 'items');
        setCreators(raw.map((c, i) => transformCreator(c, i)));
      })
      .catch(err => {
        if (!cancelled) setError(extractApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { creators, loading, error };
}

// ── 5. Submit quiz answers ───────────────────────────────────────────────────
export function useSubmitQuiz() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);

  const submit = useCallback(async (quizId, answers) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await quizzesApi.submitQuizResponse(quizId, answers);
      // Assumed response shape: { score, totalQuestions, rank }
      // Falls back gracefully if server returns different shape.
      setResult(res.data?.data || res.data || null);
    } catch (err) {
      // Non-fatal — QuizResult falls back to locally computed score
      setError(extractApiError(err, 'Could not save your score. Local result shown.'));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { submit, submitting, result, error, reset };
}
