import { useState, useEffect, useRef, useCallback } from 'react';
import * as searchApi from '../services/searchApi';
import { extractApiError } from '../services/api';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import styles from './SearchScreen.module.css';

const { CONTENT_TYPE } = searchApi;

const TYPE_CHIPS = [
  { key: CONTENT_TYPE.ALL,       label: 'All'     },
  { key: CONTENT_TYPE.ARTICLE,   label: 'News'    },
  { key: CONTENT_TYPE.MOVIE,     label: 'Movies'  },
  { key: CONTENT_TYPE.SHOW,      label: 'Shows'   },
  { key: CONTENT_TYPE.CELEBRITY, label: 'Celebs'  },
  { key: CONTENT_TYPE.VIDEO,     label: 'Videos'  },
  { key: CONTENT_TYPE.PHOTO,     label: 'Photos'  },
  { key: CONTENT_TYPE.TOPIC,     label: 'Topics'  },
  { key: CONTENT_TYPE.USER,      label: 'Users'   },
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [contentType, setContentType] = useState(CONTENT_TYPE.ALL);
  const [submittedQuery, setSubmittedQuery] = useState('');

  // Results
  const [results, setResults] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Suggestions dropdown (typeahead)
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef(null);

  // Trending pills (empty state)
  const [trending, setTrending] = useState([]);
  const [trendingFailed, setTrendingFailed] = useState(false);

  // ── Load trending once on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    searchApi.getTrendingSearches()
      .then((res) => {
        if (cancelled) return;
        const d = res.data || {};
        const items = d.trending || d.queries || d.items || d.data || [];
        setTrending(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (cancelled) return;
        // Backend D-1: /search/trending currently 500s. Fail silent.
        setTrendingFailed(true);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Debounced suggestions as user types ─────────────────────────────────
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return undefined;
    }
    suggestTimer.current = setTimeout(() => {
      searchApi.searchSuggestions(query.trim())
        .then((res) => {
          const d = res.data || {};
          const items = d.suggestions || d.items || d.data || [];
          setSuggestions(Array.isArray(items) ? items : []);
        })
        .catch(() => {
          // Backend D-1: /search/suggestions currently 500s. Fail silent —
          // never surface an error banner for a typeahead.
          setSuggestions([]);
        });
    }, 250);
    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); };
  }, [query]);

  // ── Execute a search ────────────────────────────────────────────────────
  const runSearch = useCallback(async (q, type) => {
    const trimmed = (q || '').trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
    setShowSuggestions(false);
    setLoading(true);
    setError(null);
    try {
      const res = await searchApi.search({ query: trimmed, contentType: type });
      const d = res.data || {};
      setResults(Array.isArray(d.results) ? d.results : []);
      setTotalCount(d.totalCount ?? (d.results?.length || 0));
    } catch (err) {
      // Backend D-2: every contentType except 0 currently 500s.
      const detail = extractApiError(err, '');
      if (type !== CONTENT_TYPE.ALL && detail?.includes('FromSql')) {
        setError('This search filter is temporarily unavailable. Try “All” instead.');
      } else {
        setError(detail || `Search failed (${err.response?.status || err.message})`);
      }
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  function onSubmit(e) {
    e.preventDefault();
    runSearch(query, contentType);
  }

  function onPickSuggestion(text) {
    setQuery(text);
    runSearch(text, contentType);
  }

  function onPickTrending(text) {
    setQuery(text);
    runSearch(text, CONTENT_TYPE.ALL);
  }

  function onPickType(type) {
    setContentType(type);
    if (submittedQuery) runSearch(submittedQuery, type);
  }

  function onClear() {
    setQuery('');
    setSubmittedQuery('');
    setResults([]);
    setError(null);
    setSuggestions([]);
  }

  const isEmpty = !submittedQuery && !loading;

  return (
    <div className={styles.screen}>
      {/* ── Search input ─────────────────────────────────────────────── */}
      <form className={styles.searchBar} onSubmit={onSubmit} role="search">
        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M14 14l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          className={styles.input}
          type="search"
          placeholder="Search articles, movies, celebs…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          autoFocus
        />
        {query && (
          <button type="button" className={styles.clearBtn} onClick={onClear} aria-label="Clear search">
            ✕
          </button>
        )}
      </form>

      {/* ── Suggestions dropdown ─────────────────────────────────────── */}
      {showSuggestions && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.slice(0, 8).map((s, i) => {
            const text = typeof s === 'string' ? s : (s.query || s.text || s.keyword);
            if (!text) return null;
            return (
              <button
                key={i}
                type="button"
                className={styles.suggestionItem}
                onMouseDown={() => onPickSuggestion(text)}
              >
                <span className={styles.suggestionIcon}>🔍</span>
                <span>{text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Type filter chips ────────────────────────────────────────── */}
      <div className={styles.chipsRow}>
        {TYPE_CHIPS.map((chip) => (
          <button
            key={chip.key}
            className={`${styles.chip} ${contentType === chip.key ? styles.chipActive : ''}`}
            onClick={() => onPickType(chip.key)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className={styles.content}>
        {isEmpty ? (
          <EmptyStateWithTrending trending={trending} failed={trendingFailed} onPick={onPickTrending} />
        ) : loading ? (
          <LoadingState variant="card" count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => runSearch(submittedQuery, contentType)} />
        ) : results.length === 0 ? (
          <EmptyState message={`No results for "${submittedQuery}"`} />
        ) : (
          <>
            <div className={styles.countLabel}>
              {totalCount} result{totalCount === 1 ? '' : 's'} for “{submittedQuery}”
            </div>
            <div className={styles.resultsList}>
              {results.map((item, i) => (
                <ResultRow key={item.id || item.url || i} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Empty state with trending pills ───────────────────────────────────── */
function EmptyStateWithTrending({ trending, failed, onPick }) {
  return (
    <div className={styles.emptyWrap}>
      <div className={styles.emptyIcon}>🔍</div>
      <div className={styles.emptyTitle}>Search IndiaForums</div>
      <div className={styles.emptySub}>
        Find news, movies, shows, celebs, and forum topics.
      </div>

      {trending.length > 0 && (
        <div className={styles.trendingWrap}>
          <div className={styles.trendingLabel}>Trending now</div>
          <div className={styles.trendingPills}>
            {trending.slice(0, 12).map((t, i) => {
              const text = typeof t === 'string' ? t : (t.query || t.text || t.keyword);
              if (!text) return null;
              return (
                <button key={i} className={styles.trendingPill} onClick={() => onPick(text)}>
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {failed && trending.length === 0 && (
        <div className={styles.trendingWrap}>
          <div className={styles.trendingLabel}>Try searching for</div>
          <div className={styles.trendingPills}>
            {['Shah Rukh Khan', 'Bollywood', 'Anupamaa', 'Bigg Boss', 'Web Series'].map((t) => (
              <button key={t} className={styles.trendingPill} onClick={() => onPick(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Result row ────────────────────────────────────────────────────────── */
function ResultRow({ item }) {
  // Google CSE results have { title, link, snippet, displayLink, pagemap? }
  // Internal results have { id, title, name, thumbnail, type, ... }
  const title = item.title || item.name || item.headline || '—';
  const snippet = item.snippet || item.description || item.summary || '';
  const thumb = item.thumbnail
    || item.imageUrl
    || item.posterUrl
    || item.pagemap?.cse_thumbnail?.[0]?.src
    || item.pagemap?.cse_image?.[0]?.src;
  const source = item.displayLink || item.source || item.type || '';

  const handleClick = () => {
    if (item.link) window.open(item.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={styles.resultRow}
      onClick={handleClick}
      role={item.link ? 'link' : undefined}
    >
      {thumb ? (
        <img className={styles.resultThumb} src={thumb} alt={title} loading="lazy" />
      ) : (
        <div className={styles.resultThumbPlaceholder}>🔗</div>
      )}
      <div className={styles.resultBody}>
        <div className={styles.resultTitle}>{title}</div>
        {snippet && <div className={styles.resultSnippet}>{snippet}</div>}
        {source && <div className={styles.resultSource}>{source}</div>}
      </div>
    </div>
  );
}
