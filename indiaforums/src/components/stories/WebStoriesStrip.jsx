import useWebStories from '../../hooks/useWebStories';
import SectionHeader from '../ui/SectionHeader';
import ErrorState from '../ui/ErrorState';
import styles from './WebStoriesStrip.module.css';

/**
 * WebStoriesStrip — Instagram-style horizontal strip of web stories.
 *
 * Fetches the first page of /webstories and renders each as a tall portrait
 * card with a ring border. Tapping a card hands the visible list snapshot
 * + tapped index up to App.jsx via `onWebStorySelect`, which opens the
 * shared immersive player as its own top-level screen (not an overlay
 * inside whatever screen launched this strip).
 *
 * Props:
 *   onSeeAll?: () => void           — optional "See all" handler (routes
 *     to the dedicated WebStoriesScreen).
 *   onWebStorySelect?: ({stories, idx}) => void — required to actually
 *     open the player; if absent, taps are no-ops.
 *   limit?: number                  — how many stories to show (default 8).
 */
export default function WebStoriesStrip({ onSeeAll, onWebStorySelect, limit = 8 }) {
  const { stories, loading, error, refresh } = useWebStories({ pageSize: limit });

  const visible = stories.slice(0, limit);

  function openAt(i) {
    if (onWebStorySelect) onWebStorySelect({ stories: visible, idx: i });
  }

  /* ── Loading: skeleton tiles ──────────────────────────────────────────── */
  if (loading && stories.length === 0) {
    return (
      <div className={styles.wrap}>
        <SectionHeader title="Web Stories" linkLabel={null} />
        <div className={styles.row}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skelCard}>
              <div className={styles.skelShimmer} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ────────────────────────────────────────────────────────────── */
  if (error && stories.length === 0) {
    return (
      <div className={styles.wrap}>
        <SectionHeader title="Web Stories" linkLabel={null} />
        <div className={styles.errorBox}>
          <ErrorState message={error} onRetry={refresh} />
        </div>
      </div>
    );
  }

  /* ── Empty ────────────────────────────────────────────────────────────── */
  if (!loading && visible.length === 0) {
    return null;
  }

  /* ── Loaded ───────────────────────────────────────────────────────────── */
  return (
    <div className={styles.wrap}>
      <SectionHeader
        title="Web Stories"
        linkLabel={onSeeAll ? 'See all' : null}
        onLinkPress={onSeeAll}
      />

      <div className={styles.row}>
        {visible.map((s, i) => (
          <button
            key={s.id ?? i}
            className={styles.card}
            onClick={() => openAt(i)}
            aria-label={s.title}
          >
            <div className={styles.ring}>
              {s.coverImage ? (
                <img
                  className={styles.cover}
                  src={s.coverImage}
                  alt={s.title}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div
                  className={styles.coverFallback}
                  style={{ background: s.coverBg }}
                />
              )}
              <div className={styles.coverScrim} />
              <div className={styles.cardTitle}>{s.title}</div>
            </div>
            <div className={styles.cardMeta}>{s.timeAgo}</div>
          </button>
        ))}
      </div>

    </div>
  );
}
