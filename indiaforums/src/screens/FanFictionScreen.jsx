import { useState, useMemo } from 'react';
import styles from './FanFictionScreen.module.css';
import { FF_GENRES, FF_SHOWS, FF_SORT_TABS } from '../data/fanFictionData';
import { useFanFictionList } from '../hooks/useFanFictions';
import LoadingState from '../components/ui/LoadingState';
import ErrorState   from '../components/ui/ErrorState';

// ─── JSON-string field parser ────────────────────────────────────────────────
// The API returns tags/genres/entities as JSON strings shaped like
// `{"json":[{id,name,pu,uc,ct,tt}]}`. Parse defensively — any failure yields
// an empty array rather than crashing the render.
function parseTagsJson(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.json)) return parsed.json;
    return [];
  } catch {
    return [];
  }
}

function tagNames(raw) {
  return parseTagsJson(raw)
    .map(t => (typeof t === 'string' ? t : (t?.name || t?.tag || t?.label)))
    .filter(Boolean);
}

// ─── Display formatters ───────────────────────────────────────────────────────
function formatCount(n) {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return '0';
  if (num >= 10000000) return (num / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
  if (num >= 100000)   return (num / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  if (num >= 1000)     return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

function timeAgoShort(dateStr) {
  if (!dateStr) return '';
  const past = new Date(dateStr).getTime();
  if (Number.isNaN(past)) return '';
  const diff = Date.now() - past;
  const mins   = Math.floor(diff / 60000);
  const hours  = Math.floor(diff / 3600000);
  const days   = Math.floor(diff / 86400000);
  const months = Math.floor(diff / (86400000 * 30));
  if (mins < 60)   return `${Math.max(mins, 1)}m`;
  if (hours < 24)  return `${hours}h`;
  if (days < 30)   return `${days}d`;
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

// statusCode: 0 = Ongoing, 1 = Completed (confirmed live 2026-04-07).
function statusLabel(code) {
  return Number(code) === 1 ? 'Completed' : 'Ongoing';
}

// rating integer → letter grade. Backend stores 1..5.
// Observed live: 1 = G, 2 = PG. 3/4/5 follow the standard FF rating ladder.
const RATING_LABELS = { 1: 'G', 2: 'PG', 3: 'T', 4: 'M', 5: 'MA' };
function ratingLabel(r) {
  const n = Number(r);
  return RATING_LABELS[n] || (n ? `R${n}` : null);
}

// ─── Author name fallback ─────────────────────────────────────────────────────
// API returns both `realName` and `userName` as null in the list endpoint, so
// show "User #<userId>" as a consistent fallback — better than "Unknown".
function authorDisplay(raw) {
  return raw?.realName || raw?.userName || (raw?.userId ? `User #${raw.userId}` : 'Unknown');
}

// ─── Map a raw API story → display shape ─────────────────────────────────────
// Uses the REAL field names discovered from the live API on 2026-04-07.
function transformStory(raw) {
  const tags    = tagNames(raw?.tagsJsonData);
  const genres  = tagNames(raw?.genreJsonData);
  // Combine tags + genres for the card pills — they're semantically the same
  // chip-level metadata, just stored in two columns on the backend.
  const allTags = [...new Set([...genres, ...tags])];

  return {
    id:        raw?.fanFictionId,
    title:     raw?.title || 'Untitled',
    author:    authorDisplay(raw),
    authorId:  raw?.userId,
    fandom:    '', // not in list payload — derived from entityJsonData on detail
    status:    statusLabel(raw?.statusCode),
    statusRaw: raw?.statusCode,
    synopsis:  raw?.summary || '',
    tags:      allTags,
    genres,
    chapters:  raw?.chapterCount || 0,
    views:     formatCount(raw?.totalViewCount),
    likes:     formatCount(raw?.totalLikeCount),
    comments:  formatCount(raw?.totalCommentCount),
    followers: formatCount(raw?.totalFollowers ?? raw?.followCount),
    rating:    ratingLabel(raw?.rating),
    lastUpdated: raw?.lastUpdatedWhen ? `${timeAgoShort(raw.lastUpdatedWhen)} ago` : '',
    thumbnailUrl: raw?.ffThumbnail || null,
  };
}

// ─── Show filter — match against tag/genre names client-side ─────────────────
// The list endpoint doesn't accept a fandom param. These patterns are matched
// case-insensitively against the combined tag+genre list.
const SHOW_PATTERNS = {
  yrkkh:      /yrkkh|yeh\s*rishta/i,
  anupamaa:   /anupamaa|anupama/i,
  'ghum-hai': /ghum\s*hai|ghkpm/i,
  kundali:    /kundali\s*bhagya/i,
  imlie:      /imlie/i,
  bollywood:  /bollywood/i,
};

// ─── Shorten "2 hours ago" → "2h" for compact stats row ──────────────────────
function shortTime(str) {
  if (!str) return '';
  return str
    .replace(/(\d+) hours? ago/,   '$1h')
    .replace(/(\d+) days? ago/,    '$1d')
    .replace(/(\d+) months? ago/,  '$1mo')
    .replace(/(\d+) minutes? ago/, '$1m');
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
const BookmarkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 2h8a.5.5 0 01.5.5v10l-4-2-4 2V2.5A.5.5 0 013 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);
const HeartIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 10.5S1 7.3 1 4.3a2.9 2.9 0 015-2 2.9 2.9 0 015 2c0 3-5 6.2-5 6.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1 6S3 2 6 2s5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const ChapterIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="2" y="1" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4 4h4M4 6h4M4 8h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
const CommentIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1.5 2h9v6h-5l-2.5 2.5V8h-1.5V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
);

// ─── Featured Card ─────────────────────────────────────────────────────────────
// Magazine-editorial hero. Clean hierarchy:
//   TOP     → ✦ Featured (left) + Rating + Status stack (right)
//   MIDDLE  → gradient vignette (empty, lets the cover breathe)
//   BOTTOM  → #RANK label → big title → single meta row → prominent CTA
function FeaturedCard({ item, rank, rankLabel, onPress }) {
  const hasImage = !!item.thumbnailUrl;
  return (
    <div
      className={styles.featuredCard}
      onClick={() => onPress?.(item)}
      role="button"
      tabIndex={0}
    >
      <div
        className={styles.featuredBg}
        style={hasImage
          ? { backgroundImage: `url(${item.thumbnailUrl})` }
          : undefined}
      >
        {!hasImage && <div className={styles.featuredFallback} />}
        <div className={styles.featuredOverlay} />

        {/* Top-left: Featured badge */}
        <div className={styles.featuredBadge}>✦ Featured</div>

        {/* Top-right: Rating + Status stacked */}
        <div className={styles.featuredTopRight}>
          {item.rating && <span className={styles.featuredRating}>{item.rating}</span>}
          <span
            className={`${styles.featuredStatusBadge} ${
              item.statusRaw === 1 ? styles.statusComplete : styles.statusOngoing
            }`}
          >
            <span className={styles.statusDot} />
            {item.status}
          </span>
        </div>

        {/* Bottom content block */}
        <div className={styles.featuredContent}>
          {rank && rankLabel && (
            <div className={styles.featuredRank}>
              <span className={styles.rankNumber}>#{rank}</span>
              <span className={styles.rankLabel}>{rankLabel}</span>
            </div>
          )}

          <h2 className={styles.featuredTitle}>{item.title}</h2>

          <div className={styles.featuredMetaRow}>
            <span className={styles.featuredAuthor}>by {item.author}</span>
            <span className={styles.metaDivider} />
            <span className={styles.featuredStatInline}><EyeIcon />{item.views}</span>
            <span className={styles.featuredStatInline}><HeartIcon />{item.likes}</span>
            <span className={styles.featuredStatInline}><ChapterIcon />{item.chapters}</span>
          </div>

          <button
            className={styles.featuredReadBtn}
            onClick={(e) => { e.stopPropagation(); onPress?.(item); }}
          >
            Read story
            <span className={styles.ctaArrow}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Story Card ────────────────────────────────────────────────────────────────
function StoryCard({ story, delay = 0, onPress }) {
  const hasImage = !!story.thumbnailUrl;
  return (
    <div
      className={styles.storyCard}
      style={{ animationDelay: `${delay}s` }}
      onClick={() => onPress?.(story)}
      role="button"
      tabIndex={0}
    >
      <div
        className={styles.storyCover}
        style={hasImage
          ? { backgroundImage: `url(${story.thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(135deg,#4c1d95,#6d28d9)' }}
      >
        {!hasImage && <span className={styles.storyCoverEmoji}>📖</span>}
      </div>

      <div className={styles.storyBody}>
        <div className={styles.storyTopRow}>
          {story.rating && <span className={styles.storyFandom}>{story.rating}</span>}
          <span className={`${styles.storyStatus} ${story.statusRaw === 1 ? styles.statusComplete : styles.statusOngoing}`}>
            {story.status}
          </span>
          <button className={styles.bookmarkBtn} aria-label="Save story" onClick={(e) => e.stopPropagation()}>
            <BookmarkIcon />
          </button>
        </div>

        <div className={styles.storyTitle}>{story.title}</div>

        {story.synopsis && (
          <div className={styles.storySynopsis}>{story.synopsis}</div>
        )}

        {story.tags.length > 0 && (
          <div className={styles.storyTags}>
            {story.tags.slice(0, 3).map(t => (
              <span key={t} className={styles.storyTag}>{t}</span>
            ))}
          </div>
        )}

        <div className={styles.storyMeta}>
          <span className={styles.metaAuthor}>{story.author}</span>
          <span className={styles.metaDot}>·</span>
          <span className={styles.metaStat}><ChapterIcon />{story.chapters}</span>
          <span className={styles.metaStat}><EyeIcon />{story.views}</span>
          <span className={styles.metaStat}><HeartIcon />{story.likes}</span>
          <span className={styles.metaStat}><CommentIcon />{story.comments}</span>
          {story.lastUpdated && (
            <span className={styles.metaTime}><ClockIcon />{shortTime(story.lastUpdated)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function FanFictionScreen({ onStoryPress, onAuthorsPress }) {
  const [activeGenre,   setActiveGenre]   = useState('all');
  const [activeShow,    setActiveShow]    = useState('all');
  const [activeSortTab, setActiveSortTab] = useState('trending');
  const [featuredIdx,   setFeaturedIdx]   = useState(0);

  // Backend only accepts `page` + `pageSize` — filters are applied client-side.
  const {
    stories: rawStories,
    loading,
    error,
    refresh,
    pagination,
    loadMore,
  } = useFanFictionList({ pageSize: 20 });

  // Transform API → display shape once per response.
  const allStories = useMemo(
    () => (rawStories || []).map(transformStory),
    [rawStories]
  );

  // Client-side filtering by genre chip and show chip.
  const filteredStories = useMemo(() => {
    let out = allStories;
    if (activeGenre !== 'all') {
      const rx = new RegExp(activeGenre, 'i');
      out = out.filter(s => s.tags.some(t => rx.test(t)) || s.genres.some(g => rx.test(g)));
    }
    if (activeShow !== 'all') {
      const rx = SHOW_PATTERNS[activeShow];
      if (rx) {
        out = out.filter(s => s.tags.some(t => rx.test(t)) || rx.test(s.title) || rx.test(s.synopsis));
      }
    }
    return out;
  }, [allStories, activeGenre, activeShow]);

  // Client-side sort. The backend returns stories in an opaque default order
  // — we re-rank locally per the active tab so the UI stays interactive.
  const stories = useMemo(() => {
    const arr = [...filteredStories];
    if (activeSortTab === 'latest') {
      arr.sort((a, b) => {
        const da = rawStories?.find(r => r.fanFictionId === a.id)?.lastUpdatedWhen || '';
        const db = rawStories?.find(r => r.fanFictionId === b.id)?.lastUpdatedWhen || '';
        return db.localeCompare(da);
      });
    } else if (activeSortTab === 'popular') {
      arr.sort((a, b) => {
        const va = rawStories?.find(r => r.fanFictionId === a.id)?.totalViewCount || 0;
        const vb = rawStories?.find(r => r.fanFictionId === b.id)?.totalViewCount || 0;
        return vb - va;
      });
    } else {
      // trending = likes + followers composite
      arr.sort((a, b) => {
        const ra = rawStories?.find(r => r.fanFictionId === a.id);
        const rb = rawStories?.find(r => r.fanFictionId === b.id);
        const sa = (ra?.totalLikeCount || 0) + (ra?.totalFollowers || 0) * 2;
        const sb = (rb?.totalLikeCount || 0) + (rb?.totalFollowers || 0) * 2;
        return sb - sa;
      });
    }
    return arr;
  }, [filteredStories, activeSortTab, rawStories]);

  // Featured carousel = first 3 stories from current sort tab.
  const featured = useMemo(() => stories.slice(0, 3), [stories]);

  // "#1 TRENDING NOW", "#2 LATEST", etc — derives from the active sort tab.
  const rankLabel = useMemo(() => {
    if (activeSortTab === 'trending') return 'Trending now';
    if (activeSortTab === 'latest')   return 'Fresh update';
    if (activeSortTab === 'popular')  return 'All-time favourite';
    return 'Featured';
  }, [activeSortTab]);

  function handleFeaturedScroll(e) {
    const idx = Math.round(e.target.scrollLeft / e.target.offsetWidth);
    setFeaturedIdx(idx);
  }

  function clearFilters() {
    setActiveGenre('all');
    setActiveShow('all');
  }

  return (
    <div className={styles.screen}>

      {/* ── 1. Show / Fandom Filter ── */}
      <div className={styles.showWrap}>
        <div className={styles.showScroll}>
          {FF_SHOWS.map(s => (
            <button
              key={s.id}
              className={`${styles.showChip} ${activeShow === s.id ? styles.showChipActive : ''}`}
              onClick={() => setActiveShow(s.id)}
            >
              {s.label}
            </button>
          ))}
          {/* "Top Authors" entry point — taps into /fan-fictions/authors */}
          <button
            className={`${styles.showChip} ${styles.showChipAuthors}`}
            onClick={() => onAuthorsPress?.()}
          >
            🏆 Top Authors
          </button>
        </div>
        <div className={styles.rowFade} />
      </div>

      {/* ── 2. Featured Carousel — derived from first 3 API results ── */}
      {featured.length > 0 && (
        <div className={styles.featuredSection}>
          <div className={styles.featuredScroll} onScroll={handleFeaturedScroll}>
            {featured.map((item, i) => (
              <FeaturedCard
                key={item.id}
                item={item}
                rank={i + 1}
                rankLabel={rankLabel}
                onPress={onStoryPress}
              />
            ))}
          </div>
          <div className={styles.dotsOverlay}>
            {featured.map((_, i) => (
              <div key={i} className={`${styles.dot} ${i === featuredIdx ? styles.dotActive : ''}`} />
            ))}
          </div>
        </div>
      )}

      {/* ── 3. Genre Chips ── */}
      <div className={styles.genreWrap}>
        <div className={styles.genreScroll}>
          {FF_GENRES.map(g => (
            <button
              key={g.id}
              className={`${styles.genreChip} ${activeGenre === g.id ? styles.genreChipActive : ''}`}
              onClick={() => setActiveGenre(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className={styles.rowFade} />
      </div>

      {/* ── 4. Sort Tabs — sticky below header ── */}
      <div className={styles.sortTabs}>
        {FF_SORT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.sortTab} ${activeSortTab === tab.id ? styles.sortTabActive : ''}`}
            onClick={() => setActiveSortTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 4b. Result count — surfaces pagination.totalItems from the API ── */}
      {pagination?.totalItems > 0 && (
        <div className={styles.resultCount}>
          Showing <strong>{stories.length.toLocaleString()}</strong>
          {' of '}
          <strong>{pagination.totalItems.toLocaleString()}</strong> stories
        </div>
      )}

      {/* ── 5. Story List (loading / error / data / empty) ── */}
      <div className={styles.storyList}>
        {loading && stories.length === 0 ? (
          <LoadingState count={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : stories.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📭</span>
            <p className={styles.emptyText}>No stories match this filter.</p>
            <button className={styles.clearBtn} onClick={clearFilters}>Clear filters</button>
          </div>
        ) : (
          stories.map((s, i) => (
            <StoryCard key={s.id} story={s} delay={i * 0.05} onPress={onStoryPress} />
          ))
        )}

        {/* Load more — drives pagination.hasNextPage from the hook */}
        {pagination?.hasNextPage && stories.length > 0 && (
          <button
            className={styles.loadMoreBtn}
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading…' : `Load more (${(pagination.totalItems - stories.length).toLocaleString()} more)`}
          </button>
        )}
      </div>

      <div className={styles.spacer} />
    </div>
  );
}
