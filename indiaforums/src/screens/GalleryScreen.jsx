import { useState } from 'react';
import styles from './GalleryScreen.module.css';
import ErrorState from '../components/ui/ErrorState';
import { GALLERY_CATS } from '../data/galleryData';
import useMediaGalleries from '../hooks/useMediaGalleries';

export default function GalleryScreen({ onGalleryPress }) {
  const [activeCat, setActiveCat] = useState('all');

  // Resolve the API categoryId for the active tab
  const activeCatDef = GALLERY_CATS.find(c => c.id === activeCat);
  const activeCatId  = activeCatDef?.catId ?? null;

  // Server-side filtering: hook re-fetches when categoryId changes
  const { galleries, pagination, loading, loadingMore, error, loadMore, refresh } =
    useMediaGalleries(activeCatId);

  const isAll     = activeCat === 'all';
  const featured  = isAll ? null : (galleries.find(g => g.featured) || galleries[0]);
  const gridItems = isAll ? galleries : galleries.filter(g => g !== featured);

  const totalAlbums = pagination?.totalItems ?? galleries.length;

  function handleCatChange(cat) {
    if (cat.id !== activeCat) setActiveCat(cat.id);
  }

  return (
    <div className={styles.screen}>

      {/* ── Category Tabs ── */}
      <div className={styles.catBar}>
        {GALLERY_CATS.map(c => (
          <button
            key={c.id}
            className={`${styles.catTab} ${activeCat === c.id ? styles.catActive : ''}`}
            onClick={() => handleCatChange(c)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={styles.scrollArea}>

        {/* ── Error state ── */}
        {error && !loading && <ErrorState message={error} onRetry={refresh} />}

        {/* ── Loading skeleton ── */}
        {loading && (
          <>
            {isAll && (
              <div className={styles.skeletonStats}>
                <div className={styles.skeletonStatItem} />
                <div className={styles.statDivider} />
                <div className={styles.skeletonStatItem} />
                <div className={styles.statDivider} />
                <div className={styles.skeletonStatItem} />
              </div>
            )}
            <div className={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={styles.skeletonThumb} />
                  <div className={styles.skeletonBody}>
                    <div className={styles.skeletonLine} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ ALL VIEW ══ */}
        {!loading && !error && isAll && (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statNum}>
                  {totalAlbums >= 1000 ? `${(totalAlbums / 1000).toFixed(0)}K+` : totalAlbums}
                </span>
                <span className={styles.statLabel}>Albums</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statNum}>{galleries.length}</span>
                <span className={styles.statLabel}>Loaded</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statNum}>{pagination?.totalPages ?? 1}</span>
                <span className={styles.statLabel}>Pages</span>
              </div>
            </div>

            <div className={styles.sectionLabel}>All Galleries</div>

            <div className={styles.grid}>
              {galleries.map((g, i) => (
                <GalleryCard
                  key={g.id}
                  gallery={g}
                  delay={i * 0.04}
                  onClick={() => onGalleryPress?.(g)}
                />
              ))}
              {loadingMore && Array.from({ length: 4 }).map((_, i) => (
                <div key={`lm-${i}`} className={styles.skeletonCard}>
                  <div className={styles.skeletonThumb} />
                  <div className={styles.skeletonBody}>
                    <div className={styles.skeletonLine} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                  </div>
                </div>
              ))}
            </div>

            {pagination?.hasNextPage && !loadingMore && (
              <button className={styles.loadMoreBtn} onClick={loadMore}>
                Load More
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2v8M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </>
        )}

        {/* ══ CATEGORY VIEW ══ */}
        {!loading && !error && !isAll && (
          <>
            {/* Featured hero — first gallery in filtered results */}
            {featured && (
              <HeroCard
                gallery={featured}
                catLabel={activeCatDef?.label}
                onClick={() => onGalleryPress?.(featured)}
              />
            )}

            {gridItems.length > 0 && (
              <>
                <div className={styles.sectionLabel}>
                  {activeCatDef?.label} · {totalAlbums >= 1000 ? `${(totalAlbums / 1000).toFixed(0)}K+` : totalAlbums} albums
                </div>
                <div className={styles.grid}>
                  {gridItems.map((g, i) => (
                    <GalleryCard
                      key={g.id}
                      gallery={g}
                      delay={i * 0.04}
                      onClick={() => onGalleryPress?.(g)}
                    />
                  ))}
                  {loadingMore && Array.from({ length: 4 }).map((_, i) => (
                    <div key={`lm-${i}`} className={styles.skeletonCard}>
                      <div className={styles.skeletonThumb} />
                      <div className={styles.skeletonBody}>
                        <div className={styles.skeletonLine} />
                        <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                      </div>
                    </div>
                  ))}
                </div>

                {pagination?.hasNextPage && !loadingMore && (
                  <button className={styles.loadMoreBtn} onClick={loadMore}>
                    Load More
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 2v8M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </>
            )}

            {galleries.length === 0 && (
              <p className={styles.onlyOne}>No galleries in this category yet.</p>
            )}
          </>
        )}

        <div className={styles.spacer} />
      </div>
    </div>
  );
}

// Hero banner for category view — handles broken thumbnail with onError fallback
function HeroCard({ gallery, catLabel, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = gallery.thumbnail && !imgFailed;

  return (
    <div
      className={styles.hero}
      style={{ background: showImg ? undefined : gallery.bg }}
      onClick={onClick}
    >
      {showImg
        ? <img
            src={gallery.thumbnail}
            alt={gallery.title}
            className={styles.heroImg}
            onError={() => setImgFailed(true)}
          />
        : <div className={styles.heroEmoji}>{gallery.emoji}</div>
      }
      <div className={styles.heroOverlay}>
        <span className={styles.heroCat}>{catLabel}</span>
        <p className={styles.heroTitle}>{gallery.title}</p>
        <div className={styles.heroMeta}>
          <span className={styles.heroCount}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <rect x="0.5" y="0.5" width="8" height="8" rx="1.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/>
              <rect x="2.5" y="2.5" width="8" height="8" rx="1.5" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/>
            </svg>
            {gallery.count} photos
          </span>
          <span className={styles.heroDot}>·</span>
          <span className={styles.heroTime}>{gallery.time}</span>
        </div>
      </div>
      <div className={styles.heroViewBtn}>
        View Gallery
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

// Gallery grid card — handles broken thumbnail with onError fallback
function GalleryCard({ gallery, delay, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = gallery.thumbnail && !imgFailed;

  return (
    <div
      className={styles.card}
      style={{ animationDelay: `${delay}s` }}
      onClick={onClick}
    >
      <div
        className={styles.cardThumb}
        style={{ background: showImg ? undefined : gallery.bg }}
      >
        {showImg
          ? <img
              src={gallery.thumbnail}
              alt={gallery.title}
              className={styles.cardImg}
              onError={() => setImgFailed(true)}
            />
          : <span className={styles.cardEmoji}>{gallery.emoji}</span>
        }
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
        <p className={styles.cardTitle}>{gallery.title}</p>
        <div className={styles.cardMeta}>
          <span className={styles.cardTime}>{gallery.time}</span>
          {gallery.views && (
            <span className={styles.cardViews}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <path d="M1 6s2.5-4 5-4 5 4 5 4-2.5 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                <circle cx="6" cy="6" r="1.8" fill="currentColor"/>
              </svg>
              {gallery.views}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
