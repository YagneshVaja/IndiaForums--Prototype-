import styles from './WebStoriesScreen.module.css';
import useWebStories from '../hooks/useWebStories';
import SectionHeader from '../components/ui/SectionHeader';
import ErrorState from '../components/ui/ErrorState';

/* ── Icons ────────────────────────────────────────────────────────────────── */
/* Clock icon for the timestamp footer — mirrors the live site's
   `ico-xs ico-clock` on /webstory item cards. */
const ClockIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M6 3v3l2 1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/* Webstory SVG badge — mirrors the live site's `.webstories-icon` corner
   mark (a stack-of-slides glyph) that flags a card as a multi-slide story. */
const WebStoryBadge = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="1"   y="2" width="8"  height="10" rx="1.4"
          stroke="currentColor" strokeWidth="1.3" />
    <rect x="3.5" y="4" width="8"  height="10" rx="1.4"
          fill="currentColor" fillOpacity="0.3"
          stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/* ── Story card ──────────────────────────────────────────────────────────── */
/* Card shape mirrors the live site's `.webstories-item`:
     ┌─────────────────┐
     │  ●●●●●          │   ← 5 progress dots (webstory marker)
     │    [cover img]  │
     │           [ico] │   ← webstory badge bottom-right
     ├─────────────────┤
     │  Title (3 ln)   │
     │  🕐 3 months... │
     └─────────────────┘
   The /webstories list endpoint is sparse — we render only the fields it
   returns (title, cover, timeAgo) and the static visual furniture. */
function StoryCard({ story, onPress }) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onPress(story)}
      aria-label={story.title}
    >
      <div
        className={styles.cardCover}
        style={story.coverImage ? undefined : { background: story.coverBg }}
      >
        {story.coverImage && (
          <img
            className={styles.cardImage}
            src={story.coverImage}
            alt={story.title}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        {/* Top gradient scrim — so the progress dots stay legible on
            bright thumbnails without tinting the whole image. */}
        <div className={styles.topScrim} />

        {/* 5 progress dots — the live site's signature webstory marker */}
        <div className={styles.progressDots}>
          <span /><span /><span /><span /><span />
        </div>

        {/* Corner webstory badge */}
        <div className={styles.storyBadge}>
          <WebStoryBadge />
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>{story.title}</div>
        <div className={styles.cardFooter}>
          <ClockIcon />
          <span className={styles.cardTime}>{story.timeAgo}</span>
        </div>
      </div>
    </button>
  );
}

/* ── Grid skeleton (matches the real card shape exactly) ─────────────────── */
function GridSkeleton({ count = 6 }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.cardSkeleton} aria-hidden="true">
          <div className={styles.cardCoverSkel} />
          <div className={styles.cardBody}>
            <div className={styles.skelLineLg} />
            <div className={styles.skelLineSm} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main screen ──────────────────────────────────────────────────────────── */
/* Tapping a card hands the current list snapshot + index up to App.jsx via
   `onWebStorySelect`, which opens the immersive player as its own top-level
   screen (see App.jsx) — not as an overlay inside this scroll container. */
export default function WebStoriesScreen({ onWebStorySelect }) {
  const { stories, pagination, loading, error, refresh, loadMore } = useWebStories({
    pageSize: 24,
  });

  function openStory(story) {
    if (!onWebStorySelect) return;
    const idx = stories.findIndex((s) => s.id === story.id);
    if (idx >= 0) onWebStorySelect({ stories, idx });
  }

  const showingCount = stories.length;
  const totalCount = pagination?.totalItems ?? showingCount;

  return (
    <div className={styles.screen}>
      {/* Intro block — mirrors the live site's stacked "WebStories" header
          with a brief explanatory tagline underneath. */}
      <div className={styles.introBlock}>
        <div className={styles.introTitle}>Web Stories</div>
        <div className={styles.introSubtitle}>
          Tap any card to play an immersive, auto-advancing story.
        </div>
      </div>

      {/* Section header for the feed — uses the shared SectionHeader per
          design-system rules. `linkLabel={null}` because this screen is
          already the "See all" destination. */}
      <div className={styles.sectionWrap}>
        <SectionHeader title="Latest Stories" linkLabel={null} />
        {!loading && showingCount > 0 && (
          <span className={styles.feedCount}>
            {showingCount} of {totalCount}
          </span>
        )}
      </div>

      {/* Initial loading skeleton */}
      {loading && showingCount === 0 && <GridSkeleton count={6} />}

      {/* Error */}
      {error && showingCount === 0 && (
        <div className={styles.errorWrap}>
          <ErrorState message={error} onRetry={refresh} />
        </div>
      )}

      {/* Grid of cards */}
      {showingCount > 0 && (
        <div className={styles.grid}>
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} onPress={openStory} />
          ))}
        </div>
      )}

      {/* Load more */}
      {pagination?.hasNextPage && !error && (
        <div className={styles.loadMoreWrap}>
          <button
            className={styles.loadMoreBtn}
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Load more stories'}
          </button>
        </div>
      )}

      <div className={styles.spacer} />
    </div>
  );
}
