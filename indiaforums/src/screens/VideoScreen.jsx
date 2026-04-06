import { useState, useMemo } from 'react';
import styles from './VideoScreen.module.css';
import ErrorState from '../components/ui/ErrorState';
import SectionHeader from '../components/ui/SectionHeader';
import { CAT_ACCENT } from '../data/videoData';
import { VIDEO_CAT_TABS } from '../services/api';
import useVideos from '../hooks/useVideos';

// ─── Icons ────────────────────────────────────────────────────────────────────
const PlayFill = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M4 2.5l8 4.5-8 4.5V2.5z" fill="white"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M5 2.5v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCatAccent(cat) {
  return CAT_ACCENT[cat] || { bg: '#F3F4F6', text: '#6B7280', bar: '#9CA3AF' };
}

// ─── Trending card — Inshorts gradient-overlay style ─────────────────────────
function TrendingCard({ video, onClick }) {
  const accent = getCatAccent(video.cat);
  return (
    <div className={styles.trendCard} onClick={onClick}>
      <div className={styles.trendThumb} style={{ background: video.bg }}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" className={styles.trendImg} loading="lazy" />
        ) : (
          <span className={styles.trendEmoji}>{video.emoji}</span>
        )}

        <div className={styles.trendScrim} />

        <div
          className={`${styles.trendCatChip} ${video.live ? styles.liveChip : ''}`}
          style={video.live ? {} : { background: accent.bar }}
        >
          {video.live && <span className={styles.liveDot} />}
          {video.catLabel}
        </div>

        {(video.duration || video.live) && (
          <div className={styles.trendDuration}>
            {video.live ? '● LIVE' : video.duration}
          </div>
        )}

        {!video.live && (
          <div className={styles.trendPlayWrap}>
            <div className={styles.trendPlayBtn}>
              <PlayFill size={16} />
            </div>
          </div>
        )}

        <div className={styles.trendContent}>
          <div className={styles.trendTitle}>{video.title}</div>
          <div className={styles.trendMeta}>
            <ClockIcon />
            <span>{video.timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Grid card — IndiaForums / TOI / Google News 2-col card ──────────────────
function GridCard({ video, delay, onClick }) {
  const accent = getCatAccent(video.cat);
  return (
    <div className={styles.gridCard} style={{ animationDelay: `${delay}s` }} onClick={onClick}>
      <div className={styles.gridThumb} style={{ background: video.bg }}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" className={styles.gridImg} loading="lazy" />
        ) : (
          <span className={styles.gridEmoji}>{video.emoji}</span>
        )}

        <div className={styles.gridPlayOverlay}>
          <div className={styles.gridPlayBtn}><PlayFill size={10} /></div>
        </div>

        {video.duration && (
          <div className={styles.gridDuration}>{video.duration}</div>
        )}
      </div>

      <div className={styles.gridBody}>
        <span
          className={styles.gridCatChip}
          style={{ background: accent.bg, color: accent.text }}
        >
          {video.catLabel}
        </span>
        <div className={styles.gridTitle}>{video.title}</div>
        <div className={styles.gridTime}>
          <ClockIcon />
          <span>{video.timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton cards ──────────────────────────────────────────────────────────
function TrendingSkeleton() {
  return (
    <div className={styles.trendCard}>
      <div className={`${styles.trendThumb} ${styles.skelPulse}`} />
    </div>
  );
}

function GridSkeleton({ delay }) {
  return (
    <div className={styles.gridCard} style={{ animationDelay: `${delay}s` }}>
      <div className={`${styles.gridThumb} ${styles.skelPulse}`} />
      <div className={styles.gridBody}>
        <div className={`${styles.skelChip} ${styles.skelPulse}`} />
        <div className={`${styles.skelLine} ${styles.skelPulse}`} />
        <div className={`${styles.skelLineShort} ${styles.skelPulse}`} />
      </div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function VideoScreen({ onVideoPress }) {
  const [activeCat, setActiveCat] = useState('all');
  const activeCatObj = VIDEO_CAT_TABS.find(c => c.id === activeCat);
  const contentId = activeCatObj?.contentId || null;

  const { videos, loading, error, loadMore, pagination, refresh } = useVideos(20, contentId);

  // Client-side fallback for categories without a server contentId
  const filtered = useMemo(() => {
    if (activeCat === 'all' || contentId) return videos;
    return videos.filter(v => v.cat === activeCat);
  }, [videos, activeCat, contentId]);

  // Split: featured/first 4 for trending, rest for grid
  const trending = useMemo(() => {
    const featured = filtered.filter(v => v.featured);
    if (featured.length >= 2) return featured.slice(0, 4);
    return filtered.slice(0, 4);
  }, [filtered]);

  const gridVideos = useMemo(() => {
    const trendIds = new Set(trending.map(v => v.id));
    return filtered.filter(v => !trendIds.has(v.id));
  }, [filtered, trending]);

  const hasMore = pagination?.hasNextPage;

  return (
    <div className={styles.screen}>

      {/* ── Category tabs ─────────────────────────────────────────────── */}
      <div className={styles.catBar}>
        {VIDEO_CAT_TABS.map(c => (
          <button
            key={c.id}
            className={`${styles.catTab} ${activeCat === c.id ? styles.catActive : ''}`}
            style={activeCat === c.id ? { '--tab-color': getCatAccent(c.id).bar } : {}}
            onClick={() => setActiveCat(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Error state ───────────────────────────────────────────────── */}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {/* ── Loading skeleton ──────────────────────────────────────────── */}
      {loading && videos.length === 0 && !error && (
        <>
          <div className={styles.trendSection}>
            <SectionHeader title="Trending Now" linkLabel={null} />
            <div className={styles.trendStrip}>
              <TrendingSkeleton />
              <TrendingSkeleton />
            </div>
          </div>
          <SectionHeader title="Latest Videos" linkLabel={null} />
          <div className={styles.grid}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <GridSkeleton key={i} delay={i * 0.05} />
            ))}
          </div>
        </>
      )}

      {/* ── Content ───────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {/* Trending strip */}
          {trending.length > 0 && (
            <div className={styles.trendSection}>
              <SectionHeader title="Trending Now" linkLabel={null} />
              <div className={styles.trendStrip}>
                {trending.map(v => (
                  <TrendingCard key={v.id} video={v} onClick={() => onVideoPress && onVideoPress(v)} />
                ))}
              </div>
            </div>
          )}

          {/* Latest videos grid */}
          <SectionHeader
            title={activeCat === 'all' ? 'Latest Videos' : activeCatObj?.label}
            linkLabel={null}
          />

          {gridVideos.length === 0 && (
            <div className={styles.emptyText}>No videos found in this category.</div>
          )}

          <div className={styles.grid}>
            {gridVideos.map((v, i) => (
              <GridCard key={v.id} video={v} delay={i * 0.035} onClick={() => onVideoPress && onVideoPress(v)} />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <button className={styles.loadMore} onClick={loadMore}>
              Load More Videos
            </button>
          )}
        </>
      )}

      <div className={styles.spacer} />
    </div>
  );
}
