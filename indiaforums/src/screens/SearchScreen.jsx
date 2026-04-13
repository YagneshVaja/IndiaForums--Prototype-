import { useState, useEffect, useRef, useCallback } from 'react';
import * as searchApi from '../services/searchApi';
import { extractApiError } from '../services/api';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';
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

const CATEGORY_TILES = [
  { type: CONTENT_TYPE.ARTICLE,   label: 'News',    emoji: '📰', bg: 'var(--brand-light)',   accent: 'var(--brand)'  },
  { type: CONTENT_TYPE.MOVIE,     label: 'Movies',  emoji: '🎬', bg: 'var(--red-surface)',   accent: 'var(--red)'    },
  { type: CONTENT_TYPE.SHOW,      label: 'Shows',   emoji: '📺', bg: '#EDE9FE',              accent: '#7C3AED'       },
  { type: CONTENT_TYPE.CELEBRITY, label: 'Celebs',  emoji: '⭐', bg: 'var(--amber-surface)', accent: 'var(--amber)'  },
  { type: CONTENT_TYPE.VIDEO,     label: 'Videos',  emoji: '▶️', bg: 'var(--green-surface)', accent: 'var(--green)'  },
  { type: CONTENT_TYPE.TOPIC,     label: 'Topics',  emoji: '💬', bg: '#E0F2FE',              accent: '#0891B2'       },
];

const STATIC_TRENDING = [
  'Shah Rukh Khan', 'Bigg Boss 18', 'Anupamaa', 'Stree 3', 'IPL 2026',
  'Ranveer Singh', 'Panchayat Season 4', 'Deepika Padukone', 'Rohit Sharma', 'KGF Chapter 3',
];

const RECENT_KEY = 'if_recent_searches';
const MAX_RECENT = 6;

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}
function saveRecent(query) {
  const prev = loadRecent().filter(q => q !== query);
  const next = [query, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}
function deleteRecent(query) {
  const next = loadRecent().filter(q => q !== query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}
function clearRecent() {
  localStorage.removeItem(RECENT_KEY);
  return [];
}

export default function SearchScreen() {
  const [query, setQuery]               = useState('');
  const [contentType, setContentType]   = useState(CONTENT_TYPE.ALL);
  const [submittedQuery, setSubmittedQuery] = useState('');

  const [results, setResults]       = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  // true when filter failed and we auto-fell back to ALL results
  const [filterFallback, setFilterFallback] = useState(false);

  const [suggestions, setSuggestions]         = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef(null);

  const [trending, setTrending] = useState([]);
  const [recentSearches, setRecentSearches] = useState(loadRecent);

  useEffect(() => {
    let cancelled = false;
    searchApi.getTrendingSearches()
      .then((res) => {
        if (cancelled) return;
        const d = res.data || {};
        // Handle multiple possible response shapes from the backend
        const raw = d.trending ?? d.queries ?? d.items ?? d.data ?? d.results ?? [];
        const items = Array.isArray(raw) ? raw : [];
        // Normalise: backend may return strings or objects { query/text/keyword }
        const texts = items
          .map(t => (typeof t === 'string' ? t : (t.query || t.text || t.keyword || t.name || '')))
          .filter(Boolean);
        if (texts.length > 0) setTrending(texts);
        // If empty array comes back, STATIC_TRENDING stays active via trendingToShow
      })
      .catch(() => { /* STATIC_TRENDING fallback active — no error to surface */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!query || query.trim().length < 2) { setSuggestions([]); return undefined; }
    suggestTimer.current = setTimeout(() => {
      searchApi.searchSuggestions(query.trim())
        .then((res) => {
          const d = res.data || {};
          const raw = d.suggestions ?? d.items ?? d.data ?? d.results ?? [];
          const items = Array.isArray(raw) ? raw : [];
          const texts = items
            .map(t => (typeof t === 'string' ? t : (t.query || t.text || t.keyword || t.name || '')))
            .filter(Boolean);
          setSuggestions(texts);
        })
        .catch(() => { setSuggestions([]); });
    }, 250);
    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); };
  }, [query]);

  const runSearch = useCallback(async (q, type) => {
    const trimmed = (q || '').trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
    setShowSuggestions(false);
    setLoading(true);
    setError(null);
    setFilterFallback(false);
    setRecentSearches(saveRecent(trimmed));
    try {
      const res = await searchApi.search({ query: trimmed, contentType: type });
      const d = res.data || {};
      setResults(Array.isArray(d.results) ? d.results : []);
      setTotalCount(d.totalCount ?? (d.results?.length || 0));
    } catch (err) {
      const detail = extractApiError(err, '');
      const isFilterBroken = type !== CONTENT_TYPE.ALL && (
        detail?.includes('FromSql') || err.response?.status === 500
      );

      if (isFilterBroken) {
        // Auto-fallback: silently retry with ALL (Google CSE) and show a soft notice
        try {
          const res2 = await searchApi.search({ query: trimmed, contentType: CONTENT_TYPE.ALL });
          const d2 = res2.data || {};
          setResults(Array.isArray(d2.results) ? d2.results : []);
          setTotalCount(d2.totalCount ?? (d2.results?.length || 0));
          setFilterFallback(true);
        } catch {
          setError('Search is temporarily unavailable. Please try again.');
          setResults([]);
          setTotalCount(0);
        }
      } else {
        setError(detail || `Search failed (${err.response?.status || err.message})`);
        setResults([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function onSubmit(e) { e.preventDefault(); runSearch(query, contentType); }
  function onPickSuggestion(text) { setQuery(text); runSearch(text, contentType); }
  function onPickTrending(text) { setQuery(text); runSearch(text, CONTENT_TYPE.ALL); }
  function onPickType(type) { setContentType(type); if (submittedQuery) runSearch(submittedQuery, type); }
  function onPickCategory(type) { setContentType(type); }
  function onClear() { setQuery(''); setSubmittedQuery(''); setResults([]); setError(null); setSuggestions([]); setFilterFallback(false); }
  function onRemoveRecent(text, e) { e.stopPropagation(); setRecentSearches(deleteRecent(text)); }
  function onClearAllRecent() { setRecentSearches(clearRecent()); }

  const isEmpty = !submittedQuery && !loading;
  // trending state already holds normalised strings (see useEffect above)
  const trendingToShow = trending.length > 0 ? trending : STATIC_TRENDING;

  return (
    <div className={styles.screen}>

      {/* ── Search bar ──────────────────────────────────────────────── */}
      <div className={styles.searchBarWrap}>
        <form className={styles.searchBar} onSubmit={onSubmit} role="search">
          <div className={styles.searchIconWrap}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M14 14l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
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
            <button type="button" className={styles.clearBtn} onClick={onClear} aria-label="Clear">
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </form>
      </div>

      {/* ── Suggestions ─────────────────────────────────────────────── */}
      {showSuggestions && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.slice(0, 8).map((text, i) => (
            <button key={i} type="button" className={styles.suggestionItem} onMouseDown={() => onPickSuggestion(text)}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className={styles.sugIcon}>
                <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M14 14l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <span>{text}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Type chips ──────────────────────────────────────────────── */}
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

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className={styles.content}>
        {isEmpty ? (
          <EmptyStatePanel
            recentSearches={recentSearches}
            trending={trendingToShow}
            onPick={onPickTrending}
            onPickCategory={onPickCategory}
            onRemoveRecent={onRemoveRecent}
            onClearAllRecent={onClearAllRecent}
          />
        ) : loading ? (
          <LoadingState variant="card" count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => runSearch(submittedQuery, contentType)} />
        ) : results.length === 0 ? (
          <NoResultsState query={submittedQuery} onTrySuggestion={onPickTrending} trending={trendingToShow} />
        ) : (
          <>
            {filterFallback && (
              <div className={styles.fallbackNotice}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 6v5M10 13.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                This filter is temporarily unavailable — showing all results
              </div>
            )}
            <div className={styles.countLabel}>
              {totalCount} result{totalCount === 1 ? '' : 's'} for &ldquo;{submittedQuery}&rdquo;
            </div>
            <div className={styles.resultsList}>
              {results.map((item, i) => (
                <ResultRow key={item.id || item.url || i} item={item} contentType={contentType} />
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   No results state — shown when search succeeds but returns 0 items
──────────────────────────────────────────────────────────────────────────── */
function NoResultsState({ query, onTrySuggestion, trending }) {
  const suggestions = trending.slice(0, 6);
  return (
    <div className={styles.noResultsWrap}>
      <div className={styles.noResultsIcon}>
        <svg width="40" height="40" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.2" opacity="0.3"/>
          <path d="M14 14l4.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3"/>
          <path d="M7 9h4M9 7v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
        </svg>
      </div>
      <p className={styles.noResultsTitle}>No results for &ldquo;{query}&rdquo;</p>
      <p className={styles.noResultsSub}>
        Search results are loading. Try a different spelling,{'\u00A0'}or pick a trending topic below.
      </p>

      <div className={styles.noResultsTips}>
        <span className={styles.noResultsTip}>✓ Check spelling</span>
        <span className={styles.noResultsTip}>✓ Try broader terms</span>
        <span className={styles.noResultsTip}>✓ Use English</span>
      </div>

      {suggestions.length > 0 && (
        <div className={styles.noResultsSuggest}>
          <p className={styles.noResultsSuggestLabel}>Try searching for</p>
          <div className={styles.noResultsPills}>
            {suggestions.map((text) => (
              <button key={text} className={styles.noResultsPill} onClick={() => onTrySuggestion(text)}>
                {text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Empty state panel
──────────────────────────────────────────────────────────────────────────── */
function EmptyStatePanel({ recentSearches, trending, onPick, onPickCategory, onRemoveRecent, onClearAllRecent }) {
  const base = recentSearches.length > 0 ? 1 : 0;

  return (
    <div className={styles.emptyPanel}>

      {/* ── Recent Searches ── */}
      {recentSearches.length > 0 && (
        <section className={styles.section} style={{ animationDelay: '0.03s' }}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Recent</span>
            <button className={styles.sectionClear} onClick={onClearAllRecent}>Clear all</button>
          </div>
          <div className={styles.recentChips}>
            {recentSearches.map((text) => (
              <div key={text} className={styles.recentChip} onClick={() => onPick(text)}>
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none" className={styles.recentClockIcon}>
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                <span className={styles.recentChipText}>{text}</span>
                <button className={styles.recentRemove} onClick={(e) => onRemoveRecent(text, e)} aria-label={`Remove ${text}`}>
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Trending Now ── */}
      <section className={styles.section} style={{ animationDelay: `${0.03 + base * 0.08}s` }}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionLabel}>Trending Now</span>
          <span className={styles.hotBadge}>🔥 Hot</span>
        </div>

        {/* #1 hero card */}
        {trending.length > 0 && (
          <button className={styles.trendHero} onClick={() => onPick(trending[0])}>
            <span className={styles.trendHeroRank}>#1</span>
            <span className={styles.trendHeroText}>{trending[0]}</span>
            <span className={styles.trendHeroFire}>🔥</span>
          </button>
        )}

        {/* #2 & #3 side-by-side */}
        {trending.length > 1 && (
          <div className={styles.trendDuoRow}>
            {trending.slice(1, 3).map((text, i) => (
              <button key={text} className={styles.trendDuoCard} onClick={() => onPick(text)}>
                <span className={styles.trendDuoRank}>#{i + 2}</span>
                <span className={styles.trendDuoText}>{text}</span>
              </button>
            ))}
          </div>
        )}

        {/* #4–10 compact two-column grid */}
        {trending.length > 3 && (
          <div className={styles.trendCompactGrid}>
            {trending.slice(3, 10).map((text, i) => (
              <button key={text} className={styles.trendCompactItem} onClick={() => onPick(text)}>
                <span className={styles.trendCompactRank}>{i + 4}</span>
                <span className={styles.trendCompactText}>{text}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Browse Categories ── */}
      <section className={styles.section} style={{ animationDelay: `${0.03 + (base + 1) * 0.08}s` }}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionLabel}>Browse</span>
        </div>
        <div className={styles.categoryGrid}>
          {CATEGORY_TILES.map((tile) => (
            <button
              key={tile.type}
              className={styles.categoryTile}
              style={{ '--tile-bg': tile.bg, '--tile-accent': tile.accent }}
              onClick={() => onPickCategory(tile.type)}
            >
              <div className={styles.categoryIconBox}>{tile.emoji}</div>
              <span className={styles.categoryLabel}>{tile.label}</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Result row
──────────────────────────────────────────────────────────────────────────── */
function ResultRow({ item, contentType }) {
  const title    = item.title || item.name || item.headline || '—';
  const snippet  = item.snippet || item.description || item.summary || '';
  const thumb    = item.thumbnail || item.imageUrl || item.posterUrl
    || item.pagemap?.cse_thumbnail?.[0]?.src
    || item.pagemap?.cse_image?.[0]?.src;
  const source   = item.displayLink || item.source || item.type || '';
  const isCeleb  = contentType === CONTENT_TYPE.CELEBRITY || item.type === 'celebrity';
  const isVideo  = contentType === CONTENT_TYPE.VIDEO     || item.type === 'video';
  const isTopic  = contentType === CONTENT_TYPE.TOPIC     || item.type === 'topic';
  const duration   = item.duration || item.length || null;
  const replyCount = item.replyCount || item.replies || item.postCount || null;
  const category   = item.category || item.cat || null;

  function handleClick() {
    if (item.link) window.open(item.link, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      className={`${styles.resultRow} ${isCeleb ? styles.resultRowCeleb : ''}`}
      onClick={handleClick}
      role={item.link ? 'link' : undefined}
    >
      {thumb ? (
        <img
          className={`${styles.resultThumb} ${isCeleb ? styles.resultThumbRound : ''}`}
          src={thumb} alt={title} loading="lazy"
        />
      ) : (
        <div className={`${styles.resultThumbPlaceholder} ${isCeleb ? styles.resultThumbRound : ''}`}>
          {isCeleb ? '👤' : isVideo ? '▶️' : isTopic ? '💬' : '🔗'}
        </div>
      )}

      <div className={styles.resultBody}>
        {category && <span className={styles.resultCategory}>{category}</span>}
        <div className={styles.resultTitle}>{title}</div>
        {snippet && <div className={styles.resultSnippet}>{snippet}</div>}
        <div className={styles.resultMeta}>
          {source && <span className={styles.resultSource}>{source}</span>}
          {isVideo && duration && <span className={styles.resultBadge}>{duration}</span>}
          {isTopic && replyCount != null && <span className={styles.resultBadge}>{replyCount} replies</span>}
        </div>
      </div>

      <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className={styles.resultChevron}>
        <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}
