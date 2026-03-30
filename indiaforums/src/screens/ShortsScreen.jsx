import { useState } from 'react';
import styles from './ShortsScreen.module.css';
import { SHORTS, SHORTS_CATEGORIES } from '../data/shorts';

/* ── Icons ───────────────────────────────────────────────────────────────────── */
const PlayIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.45)" />
    <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="white" />
  </svg>
);

const EyeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1 5C1 5 2.8 2 5 2s4 3 4 3-1.8 3-4 3-4-3-4-3z"
      stroke="currentColor" strokeWidth="1.1" fill="none" />
    <circle cx="5" cy="5" r="1.2" fill="currentColor" />
  </svg>
);

const HeartIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M5 8.5S1 6 1 3.5A2.3 2.3 0 015 2a2.3 2.3 0 014 1.5C9 6 5 8.5 5 8.5z"
      fill="currentColor" />
  </svg>
);

const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="11" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="11" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="3"  cy="7"   r="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.3 6.3l5.3-2.8M4.3 7.7l5.3 2.8" stroke="currentColor" strokeWidth="1.2"
      strokeLinecap="round" />
  </svg>
);

/* ── Short card (2-column grid item) ─────────────────────────────────────────── */
function ShortCard({ short, onPress }) {
  return (
    <div className={styles.card} onClick={() => onPress(short)}>
      {/* Thumbnail area */}
      <div className={styles.thumb} style={{ background: short.bg }}>
        {/* Decorative emoji */}
        <span className={styles.thumbEmoji} aria-hidden="true">{short.emoji}</span>

        {/* Gradient scrim */}
        <div className={styles.thumbScrim} />

        {/* Category chip — top left */}
        <span className={styles.catChip}>{short.categoryLabel}</span>

        {/* Duration — top right */}
        <span className={styles.durBadge}>{short.duration}</span>

        {/* Play button — center */}
        <div className={styles.playWrap}>
          <PlayIcon size={32} />
        </div>

        {/* Views — bottom */}
        <div className={styles.viewsRow}>
          <EyeIcon />
          <span>{short.views}</span>
        </div>
      </div>

      {/* Card body */}
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>{short.title}</div>
        <div className={styles.cardMeta}>
          <span className={styles.cardAuthor}>{short.author}</span>
          <span className={styles.cardTime}>{short.timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Short Detail Bottom Sheet ────────────────────────────────────────────────── */
function ShortDetail({ short, onClose }) {
  if (!short) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>

        {/* Hero */}
        <div className={styles.sheetHero} style={{ background: short.bg }}>
          <div className={styles.sheetPill} />
          <div className={styles.sheetHeroScrim} />

          {/* Top row */}
          <div className={styles.sheetTopRow}>
            <button className={styles.sheetCloseBtn} onClick={onClose} aria-label="Close">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" />
              </svg>
            </button>
            <span className={styles.sheetCatBadge}>{short.categoryLabel}</span>
            <span className={styles.sheetDurBadge}>{short.duration}</span>
          </div>

          {/* Decorative emoji */}
          <span className={styles.sheetEmoji} aria-hidden="true">{short.emoji}</span>

          {/* Big play button */}
          <div className={styles.sheetPlayRow}>
            <div className={styles.sheetPlayBtn}>
              <PlayIcon size={32} />
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className={styles.sheetBody}>

          {/* Title */}
          <div className={styles.sheetTitle}>{short.title}</div>

          {/* Author row */}
          <div className={styles.authorRow}>
            <div className={styles.authorAvatar} style={{ background: short.authorBg }}>
              <span className={styles.authorInitials}>{short.authorInitials}</span>
            </div>
            <div>
              <div className={styles.authorName}>{short.author}</div>
              <div className={styles.authorTime}>{short.timeAgo}</div>
            </div>
          </div>

          {/* Stats row — mirrors QuizzesScreen stat tiles */}
          <div className={styles.statsRow}>
            <div className={styles.statTile} style={{ background: 'linear-gradient(135deg,#EFF6FF,#BFDBFE)' }}>
              <span className={styles.statVal}>{short.views}</span>
              <span className={styles.statLbl}>Views</span>
            </div>
            <div className={styles.statTile} style={{ background: 'linear-gradient(135deg,#FFF1F2,#FECDD3)' }}>
              <span className={styles.statVal}>{short.likes}</span>
              <span className={styles.statLbl}>Likes</span>
            </div>
            <div className={styles.statTile} style={{ background: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)' }}>
              <span className={styles.statVal}>{short.comments}</span>
              <span className={styles.statLbl}>Comments</span>
            </div>
          </div>

          {/* Description */}
          <p className={styles.sheetDesc}>{short.description}</p>

          {/* Tags */}
          <div className={styles.tagsRow}>
            {short.tags.map((t) => (
              <span key={t} className={styles.tag}>#{t}</span>
            ))}
          </div>

          {/* Action buttons */}
          <div className={styles.actionRow}>
            <button className={styles.ctaBtn} style={{ background: short.bg }}>
              <span className={styles.ctaScrim} />
              <span className={styles.ctaText}>▶ Watch Full Short</span>
            </button>
            <button className={styles.shareBtn}>
              <ShareIcon />
              <span>Share</span>
            </button>
          </div>

          <div className={styles.sheetSpacer} />
        </div>
      </div>
    </div>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────────────────── */
export default function ShortsScreen({ onBack }) {
  const [activeCat, setActiveCat] = useState('all');
  const [selected,  setSelected]  = useState(null);

  const shorts = activeCat === 'all'
    ? SHORTS
    : SHORTS.filter((s) => s.category === activeCat);

  return (
    <div className={styles.screen}>

      {/* Category tab bar */}
      <div className={styles.catBar}>
        <div className={styles.catScroll}>
          {SHORTS_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.catBtn} ${activeCat === cat.id ? styles.catActive : ''}`}
              onClick={() => setActiveCat(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trending label */}
      <div className={styles.feedHeader}>
        <span className={styles.feedDot} />
        <span className={styles.feedLabel}>Trending Shorts</span>
        <span className={styles.feedCount}>{shorts.length} shorts</span>
      </div>

      {/* 2-column card grid */}
      <div className={styles.grid}>
        {shorts.map((s) => (
          <ShortCard key={s.id} short={s} onPress={setSelected} />
        ))}
      </div>

      <div className={styles.spacer} />

      {/* Detail sheet */}
      {selected && (
        <ShortDetail short={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
