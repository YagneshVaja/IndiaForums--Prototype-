import { useState, useMemo } from 'react';
import styles from './GalleryScreen.module.css';
import { GALLERIES, GALLERY_CATS } from '../data/galleryData';

export default function GalleryScreen({ onBack, onGalleryPress }) {
  const [activeCat, setActiveCat] = useState('all');

  const filtered = useMemo(() =>
    activeCat === 'all' ? GALLERIES : GALLERIES.filter(g => g.cat === activeCat),
    [activeCat]
  );

  // Only split into featured/rest when on a specific category
  const isAll = activeCat === 'all';
  const featured = isAll ? null : (filtered.find(g => g.featured) || filtered[0]);
  const gridItems = isAll ? filtered : filtered.filter(g => g !== featured);

  const activeCatLabel = GALLERY_CATS.find(c => c.id === activeCat)?.label;

  return (
    <div className={styles.screen}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={styles.headerTitle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="11" rx="2.5" stroke="var(--brand)" strokeWidth="1.5"/>
            <circle cx="5.5" cy="7" r="1.4" stroke="var(--brand)" strokeWidth="1.2"/>
            <path d="M1 12l4-3.5 2.5 2.5 3-4L15 12" stroke="var(--brand)" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
          <span>Photo Gallery</span>
        </div>
        <div className={styles.countPill}>
          {isAll ? `${GALLERIES.length} albums` : `${filtered.length} of ${GALLERIES.length}`}
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div className={styles.catBar}>
        {GALLERY_CATS.map(c => (
          <button
            key={c.id}
            className={`${styles.catTab} ${activeCat === c.id ? styles.catActive : ''}`}
            onClick={() => setActiveCat(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={styles.scrollArea}>

        {/* ══ ALL VIEW: Stats + full grid ══ */}
        {isAll && (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statNum}>{GALLERIES.reduce((s, g) => s + g.count, 0)}</span>
                <span className={styles.statLabel}>Photos</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statNum}>{GALLERIES.length}</span>
                <span className={styles.statLabel}>Albums</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statNum}>{GALLERY_CATS.length - 1}</span>
                <span className={styles.statLabel}>Categories</span>
              </div>
            </div>

            <div className={styles.sectionLabel}>All Galleries</div>
            <div className={styles.grid}>
              {gridItems.map((g, i) => (
                <GalleryCard
                  key={g.id}
                  gallery={g}
                  delay={i * 0.04}
                  showCat
                  onClick={() => onGalleryPress && onGalleryPress(g)}
                />
              ))}
            </div>
          </>
        )}

        {/* ══ CATEGORY VIEW: Hero + grid ══ */}
        {!isAll && (
          <>
            {/* Hero */}
            {featured && (
              <div
                className={styles.hero}
                style={{ background: featured.bg }}
                onClick={() => onGalleryPress && onGalleryPress(featured)}
              >
                <div className={styles.heroEmoji}>{featured.emoji}</div>
                <div className={styles.heroOverlay}>
                  <span className={styles.heroCat}>{activeCatLabel}</span>
                  <p className={styles.heroTitle}>{featured.title}</p>
                  <div className={styles.heroMeta}>
                    <span className={styles.heroCount}>
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <rect x="0.5" y="0.5" width="8" height="8" rx="1.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/>
                        <rect x="2.5" y="2.5" width="8" height="8" rx="1.5" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/>
                      </svg>
                      {featured.count} photos
                    </span>
                    <span className={styles.heroDot}>·</span>
                    <span className={styles.heroTime}>{featured.time}</span>
                  </div>
                </div>
                <div className={styles.heroViewBtn}>
                  View Gallery
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )}

            {/* Grid of remaining */}
            {gridItems.length > 0 && (
              <>
                <div className={styles.sectionLabel}>
                  {activeCatLabel} · {filtered.length} albums
                </div>
                <div className={styles.grid}>
                  {gridItems.map((g, i) => (
                    <GalleryCard
                      key={g.id}
                      gallery={g}
                      delay={i * 0.04}
                      onClick={() => onGalleryPress && onGalleryPress(g)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Single item — no grid needed, just a note */}
            {gridItems.length === 0 && featured && (
              <p className={styles.onlyOne}>Tap the card above to explore this gallery.</p>
            )}
          </>
        )}

        <div className={styles.spacer} />
      </div>
    </div>
  );
}

function GalleryCard({ gallery, delay, onClick, showCat }) {
  return (
    <div
      className={styles.card}
      style={{ animationDelay: `${delay}s` }}
      onClick={onClick}
    >
      <div className={styles.cardThumb} style={{ background: gallery.bg }}>
        <span className={styles.cardEmoji}>{gallery.emoji}</span>
        <div className={styles.cardOverlay} />
        <span className={styles.cardCount}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <rect x="0.5" y="0.5" width="6" height="6" rx="1" stroke="white" strokeWidth="1"/>
            <rect x="2.5" y="2.5" width="6" height="6" rx="1" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1"/>
          </svg>
          {gallery.count}
        </span>
      </div>
      <div className={styles.cardBody}>
        {showCat && <span className={styles.cardCat}>{gallery.catLabel}</span>}
        <p className={styles.cardTitle}>{gallery.title}</p>
        <span className={styles.cardTime}>{gallery.time}</span>
      </div>
    </div>
  );
}
