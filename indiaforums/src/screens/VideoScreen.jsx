import { useState, useMemo } from 'react';
import styles from './VideoScreen.module.css';
import SectionHeader from '../components/ui/SectionHeader';
import { VIDEO_CATS, CAT_ACCENT, TRENDING_VIDEOS, VIDEOS } from '../data/videoData';

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
// Wide horizontal-scroll card inspired by NDTV/HT "Trending Now" strip
function TrendingCard({ video }) {
  const accent = getCatAccent(video.cat);
  return (
    <div className={styles.trendCard}>
      {/* Full bleed gradient thumbnail */}
      <div className={styles.trendThumb} style={{ background: video.bg }}>
        {/* Decorative emoji — faded, large */}
        <span className={styles.trendEmoji}>{video.emoji}</span>

        {/* Bottom gradient scrim (Inshorts pattern) */}
        <div className={styles.trendScrim} />

        {/* Category chip — top-left (NDTV badge style) */}
        <div
          className={`${styles.trendCatChip} ${video.live ? styles.liveChip : ''}`}
          style={video.live ? {} : { background: accent.bar }}
        >
          {video.live && <span className={styles.liveDot} />}
          {video.catLabel}
        </div>

        {/* Duration or LIVE — bottom-right */}
        <div className={styles.trendDuration}>
          {video.live ? '● LIVE' : video.duration}
        </div>

        {/* Play button — center (YouTube style) */}
        {!video.live && (
          <div className={styles.trendPlayWrap}>
            <div className={styles.trendPlayBtn}>
              <PlayFill size={16} />
            </div>
          </div>
        )}

        {/* Title overlaid at bottom (Inshorts / Reels style) */}
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
function GridCard({ video, delay }) {
  const accent = getCatAccent(video.cat);
  return (
    <div className={styles.gridCard} style={{ animationDelay: `${delay}s` }}>
      {/* 16:9 thumbnail */}
      <div className={styles.gridThumb} style={{ background: video.bg }}>
        <span className={styles.gridEmoji}>{video.emoji}</span>

        {/* Subtle play overlay (always visible) */}
        <div className={styles.gridPlayOverlay}>
          <div className={styles.gridPlayBtn}><PlayFill size={10} /></div>
        </div>

        {/* Duration chip — YouTube convention */}
        <div className={styles.gridDuration}>{video.duration}</div>
      </div>

      {/* Card body */}
      <div className={styles.gridBody}>
        {/* Coloured category chip (HT / Indian Express pattern) */}
        <span
          className={styles.gridCatChip}
          style={{ background: accent.bg, color: accent.text }}
        >
          {video.catLabel}
        </span>

        {/* Title — 2-line clamp */}
        <div className={styles.gridTitle}>{video.title}</div>

        {/* Timestamp — Google News / Inshorts style */}
        <div className={styles.gridTime}>
          <ClockIcon />
          <span>{video.timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function VideoScreen() {
  const [activeCat, setActiveCat] = useState('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = useMemo(() => {
    setPage(1);
    if (activeCat === 'all') return VIDEOS;
    return VIDEOS.filter(v => v.cat === activeCat);
  }, [activeCat]);

  const trendingVisible = activeCat === 'all'
    ? TRENDING_VIDEOS
    : TRENDING_VIDEOS.filter(v => v.cat === activeCat);

  const gridVisible = filtered.slice(0, page * PER_PAGE);
  const hasMore     = gridVisible.length < filtered.length;

  const activeCatData = VIDEO_CATS.find(c => c.id === activeCat);

  return (
    <div className={styles.screen}>

      {/* ── Category tabs — NDTV / Google News style ─────────────────────── */}
      <div className={styles.catBar}>
        {VIDEO_CATS.map(c => (
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

      {/* ── Trending strip — NDTV / HT "Top Stories" horizontal scroll ──── */}
      {trendingVisible.length > 0 && (
        <div className={styles.trendSection}>
          <SectionHeader title="Trending Now" linkLabel={null} />
          <div className={styles.trendStrip}>
            {trendingVisible.map(v => (
              <TrendingCard key={v.id} video={v} />
            ))}
          </div>
        </div>
      )}

      {/* ── Latest videos grid ────────────────────────────────────────────── */}
      <SectionHeader
        title={activeCat === 'all' ? 'Latest Videos' : activeCatData?.label}
        linkLabel={null}
      />

      <div className={styles.grid}>
        {gridVisible.map((v, i) => (
          <GridCard key={v.id} video={v} delay={i * 0.035} />
        ))}
      </div>

      {/* ── Load more — mirrors site pagination concept ───────────────────── */}
      {hasMore && (
        <button className={styles.loadMore} onClick={() => setPage(p => p + 1)}>
          Load More Videos
        </button>
      )}

      <div className={styles.spacer} />
    </div>
  );
}
