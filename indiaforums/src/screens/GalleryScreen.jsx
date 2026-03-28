import { useState, useMemo } from 'react';
import styles from './GalleryScreen.module.css';
import { GALLERY_CATS, GALLERIES } from '../data/galleryData';

export default function GalleryScreen({ onBack, onGalleryPress }) {
  const [activeCat, setActiveCat] = useState('all');

  const filtered = useMemo(
    () => activeCat === 'all' ? GALLERIES : GALLERIES.filter(g => g.cat === activeCat),
    [activeCat]
  );

  return (
    <div className={styles.screen}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={styles.headerCenter}>
          <span className={styles.headerIcon}>🖼️</span>
          <span className={styles.headerTitle}>Galleries</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.countPill}>{GALLERIES.length} albums</span>
        </div>
      </div>

      {/* ── Category chips ── */}
      <div className={styles.catWrap}>
        <div className={styles.catScroll}>
          {GALLERY_CATS.map(c => (
            <button
              key={c.id}
              className={`${styles.catChip} ${activeCat === c.id ? styles.catActive : ''}`}
              onClick={() => setActiveCat(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className={styles.grid}>
        {filtered.map((g, i) => (
          <GalleryCard
            key={g.id}
            gallery={g}
            delay={i * 0.04}
            onPress={() => onGalleryPress(g)}
          />
        ))}
      </div>

      <div className={styles.spacer} />
    </div>
  );
}

function GalleryCard({ gallery: g, delay, onPress }) {
  const catLabel = g.cat.replace('-', ' ');
  return (
    <div
      className={styles.card}
      style={{ animationDelay: `${delay}s` }}
      onClick={onPress}
    >
      {/* Thumbnail */}
      <div className={styles.thumb} style={{ background: g.bg }}>
        <span className={styles.thumbEmoji}>{g.emoji}</span>
        {/* Overlay scrim for bottom readability */}
        <div className={styles.thumbScrim} />
        {/* Category tag */}
        <div className={styles.catTag}>{catLabel}</div>
        {/* Photo count badge */}
        <div className={styles.countBadge}>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <rect x="0.75" y="0.75" width="6.5" height="6.5" rx="1.5" stroke="white" strokeWidth="1.2"/>
            <rect x="2.75" y="2.75" width="6.5" height="6.5" rx="1.5" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.2"/>
          </svg>
          {g.count}
        </div>
      </div>
      {/* Text */}
      <div className={styles.cardMeta}>
        <p className={styles.cardTitle}>{g.title}</p>
        <span className={styles.cardTime}>{g.time}</span>
      </div>
    </div>
  );
}
