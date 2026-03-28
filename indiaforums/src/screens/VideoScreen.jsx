import { useState, useMemo } from 'react';
import styles from './VideoScreen.module.css';
import { VIDEO_CATS, VIDEO_FEATURED, VIDEOS } from '../data/videoData';

// ── Icons ─────────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="19" height="19" viewBox="0 0 19 19" fill="none">
    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const PlayIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M5.5 3.5l8 4.5-8 4.5V3.5z" fill="#3558F0"/>
  </svg>
);
const PlayWhiteIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M4.5 3l7 4-7 4V3z" fill="#1A2038"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtViews(v) {
  return v; // already formatted in data
}

// ── Featured hero card ────────────────────────────────────────────────────────
function FeaturedVideo({ video }) {
  return (
    <div className={styles.featured}>
      <div className={styles.featuredThumb} style={{ background: video.bg }}>
        <span className={styles.featuredEmoji}>{video.emoji}</span>
        <div className={styles.featuredPlay}>
          <div className={styles.playCircle}>
            <PlayIcon size={20} />
          </div>
        </div>
        {video.tag && <div className={styles.featuredTag}>{video.tag}</div>}
        <div className={styles.featuredDuration}>{video.duration}</div>
      </div>
      <div className={styles.featuredInfo}>
        <div className={styles.featuredTitle}>{video.title}</div>
        <div className={styles.featuredMeta}>
          <span>{video.channel}</span>
          <span className={styles.metaDot}>•</span>
          <span>{video.views} views</span>
        </div>
      </div>
    </div>
  );
}

// ── Video grid card ───────────────────────────────────────────────────────────
function VideoCard({ video, delay }) {
  return (
    <div className={styles.card} style={{ animationDelay: `${delay}s` }}>
      <div className={styles.thumb} style={{ background: video.bg }}>
        <span className={styles.thumbEmoji}>{video.emoji}</span>
        <div className={styles.thumbPlay}>
          <div className={styles.playDot}>
            <PlayWhiteIcon size={12} />
          </div>
        </div>
        {video.isNew && <div className={styles.newBadge}>NEW</div>}
        <div className={styles.thumbDuration}>{video.duration}</div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>{video.title}</div>
        <div className={styles.cardMeta}>
          <span>{video.channel}</span>
          <span className={styles.metaDot}>·</span>
          <span>{fmtViews(video.views)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function VideoScreen({ onBack }) {
  const [activecat, setActivecat] = useState('all');

  const filtered = useMemo(() => {
    if (activecat === 'all') return VIDEOS;
    return VIDEOS.filter(v => v.cat === activecat);
  }, [activecat]);

  return (
    <div className={styles.screen}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Go back">
          <BackIcon />
        </button>
        <div className={styles.headerTitle}>Videos</div>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} aria-label="Search videos">
            <SearchIcon />
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className={styles.catBar}>
        {VIDEO_CATS.map(c => (
          <div
            key={c.id}
            className={`${styles.catTab} ${activecat === c.id ? styles.active : ''}`}
            onClick={() => setActivecat(c.id)}
          >
            {c.label}
          </div>
        ))}
      </div>

      {/* Featured hero — only shown on "All" */}
      {activecat === 'all' && <FeaturedVideo video={VIDEO_FEATURED} />}

      {/* Grid section */}
      <div className={styles.sectionHead}>
        <div className={styles.sectionTitle}>
          {activecat === 'all' ? 'Latest Videos' : VIDEO_CATS.find(c => c.id === activecat)?.label}
        </div>
        <div className={styles.seeAll}>See All</div>
      </div>

      <div className={styles.grid}>
        {filtered.map((v, i) => (
          <VideoCard key={v.id} video={v} delay={i * 0.04} />
        ))}
      </div>

      <div className={styles.spacer} />
    </div>
  );
}
