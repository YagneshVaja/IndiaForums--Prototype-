import { useState } from 'react';
import styles from './GalleryDetailScreen.module.css';
import useMediaGalleryDetails from '../hooks/useMediaGalleryDetails';

export default function GalleryDetailScreen({ gallery, onBack, onGalleryPress }) {
  const [activePhoto, setActivePhoto] = useState(null);
  const [heroFailed, setHeroFailed]   = useState(false);
  const { details, loading: detailLoading, error: detailError } = useMediaGalleryDetails(gallery?.id);

  if (!gallery) return null;

  // Use API details once loaded; fall back to prop for immediate display
  const display = details || gallery;
  const photos  = details?.photos?.length ? details.photos : (gallery.photos || []);
  const count   = details?.count ?? gallery.count;
  const heroSrc = display.thumbnail && !heroFailed ? display.thumbnail : null;

  return (
    <div className={styles.screen}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={styles.headerInfo}>
          <span className={styles.catLabel}>
            {display.catLabel || display.cat?.replace('-', ' ') || 'Gallery'}
          </span>
          <span className={styles.countLabel}>
            {count} photos{display.views ? ` · ${display.views} views` : ''}
          </span>
        </div>
        <button className={styles.shareBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="13" cy="3"  r="1.8" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="3"  cy="8"  r="1.8" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="13" cy="13" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M4.7 7.1l6.6-3.2M4.7 8.9l6.6 3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className={styles.scrollArea}>

        {/* ── Hero ── */}
        <div
          className={styles.hero}
          style={{ background: heroSrc ? undefined : (display.bg || 'linear-gradient(135deg,#667eea,#764ba2)') }}
        >
          {heroSrc
            ? <img
                src={heroSrc}
                alt={display.title}
                className={styles.heroImg}
                onError={() => setHeroFailed(true)}
              />
            : <span className={styles.heroEmoji}>{display.emoji || '📸'}</span>
          }
          <div className={styles.heroOverlay}>
            <p className={styles.heroTitle}>{display.title}</p>
            <div className={styles.heroMeta}>
              <span className={styles.heroStat}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect x="0.5" y="0.5" width="7" height="7" rx="1.2" stroke="rgba(255,255,255,0.8)" strokeWidth="0.9"/>
                  <rect x="2.5" y="2.5" width="7" height="7" rx="1.2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.8)" strokeWidth="0.9"/>
                </svg>
                {count} photos
              </span>
              {display.views && (
                <>
                  <span className={styles.heroDot}>·</span>
                  <span className={styles.heroStat}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M1 6s2.5-4 5-4 5 4 5 4-2.5 4-5 4-5-4-5-4z" stroke="rgba(255,255,255,0.8)" strokeWidth="1.1" fill="none"/>
                      <circle cx="6" cy="6" r="1.5" fill="rgba(255,255,255,0.8)"/>
                    </svg>
                    {display.views} views
                  </span>
                </>
              )}
              <span className={styles.heroDot}>·</span>
              <span className={styles.heroTime}>{display.time}</span>
            </div>
          </div>
        </div>

        {/* ── Share row ── */}
        <div className={styles.shareRow}>
          <span className={styles.shareLabel}>Share:</span>
          <button className={`${styles.shareCircle} ${styles.waBtn}`} title="WhatsApp">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="white" strokeWidth="1.2"/><path d="M4 4.2c.4-.4.9-.4 1.2 0l.8 1c.2.3.1.6-.1.8l-.3.3c.4.7.9 1.3 1.7 1.7l.3-.3c.2-.2.5-.2.8-.1l1 .8c.4.3.4.8 0 1.2-.7.7-1.8.9-2.8.3C5.3 9 4 7.7 3.8 6.3c-.2-.9 0-1.8.2-2.1z" fill="white"/></svg>
          </button>
          <button className={`${styles.shareCircle} ${styles.xBtn}`} title="X">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 1l4.4 4.8L1 12h1.4l3.2-3.7 2.8 3.7H12L7.3 6.7 11.5 1h-1.4L6.3 4.4 4 1H1z" fill="white"/></svg>
          </button>
          <button className={`${styles.shareCircle} ${styles.fbBtn}`} title="Facebook">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M7.5 2.2H9V.5H7.5C6.2.5 5.2 1.5 5.2 2.8v.9H3.8v2h1.4V12H7V5.7h1.4l.4-2H7V2.8c0-.33.27-.6.5-.6z" fill="white"/></svg>
          </button>
          <button className={`${styles.shareCircle} ${styles.copyBtn}`} title="Copy link">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="4" width="7" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.2"/><path d="M4 4V3a1.3 1.3 0 011.3-1.3H11A1.3 1.3 0 0112.3 3v6A1.3 1.3 0 0111 10.3h-1" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
        </div>

        {/* ── Description + Keywords ── */}
        {details && (details.description || details.keywords?.length > 0) && (
          <div className={styles.metaSection}>
            {details.description && details.description !== details.title && (
              <p className={styles.description}>{details.description}</p>
            )}
            {details.keywords?.length > 0 && (
              <div className={styles.keywords}>
                {details.keywords.map(kw => (
                  <span key={kw} className={styles.keyword}>{kw}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Photo grid loading skeleton ── */}
        {detailLoading && (
          <div className={styles.photoGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`${styles.skeletonPhoto} ${i === 0 ? styles.featured : ''}`}
              />
            ))}
          </div>
        )}

        {/* ── Error state ── */}
        {detailError && !detailLoading && (
          <div className={styles.errorBox}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8.5" stroke="var(--text3)" strokeWidth="1.4"/>
              <path d="M10 6v5M10 13.5v.5" stroke="var(--text3)" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <span className={styles.errorText}>{detailError}</span>
          </div>
        )}

        {/* ── Section label ── */}
        {!detailLoading && photos.length > 0 && (
          <div className={styles.gridHeader}>
            <span className={styles.gridLabel}>Photos</span>
            <span className={styles.gridCount}>{photos.length} of {count}</span>
          </div>
        )}

        {/* ── Photo grid ── */}
        {!detailLoading && photos.length > 0 && (
          <div className={styles.photoGrid}>
            {photos.map((p, i) => (
              <PhotoCell
                key={p.id ?? i}
                photo={p}
                index={i}
                isFeatured={i === 0}
                onClick={() => setActivePhoto(i)}
              />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!detailLoading && !detailError && photos.length === 0 && (
          <div className={styles.emptyBox}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="4" width="24" height="18" rx="3" stroke="var(--text3)" strokeWidth="1.6"/>
              <circle cx="9" cy="11" r="2.5" stroke="var(--text3)" strokeWidth="1.4"/>
              <path d="M2 18l6-5 4 3 6-6 8 8" stroke="var(--text3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={styles.emptyText}>No photos available</span>
          </div>
        )}

        {/* ── Related Galleries ── */}
        {details?.relatedGalleries?.length > 0 && (
          <div className={styles.relatedSection}>
            <div className={styles.relatedLabel}>More Galleries</div>
            <div className={styles.relatedScroll}>
              {details.relatedGalleries.map(g => (
                <RelatedCard
                  key={g.id}
                  gallery={g}
                  onClick={() => onGalleryPress?.(g)}
                />
              ))}
            </div>
          </div>
        )}

        <div className={styles.spacer} />
      </div>

      {/* ── Lightbox ── */}
      {activePhoto !== null && photos.length > 0 && (
        <Lightbox
          photos={photos}
          index={activePhoto}
          total={photos.length}
          onClose={() => setActivePhoto(null)}
          onChange={setActivePhoto}
        />
      )}
    </div>
  );
}

/* ── Photo cell with onError fallback ─────────────────────────────────────── */
function PhotoCell({ photo, index, isFeatured, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = photo.imageUrl && !imgFailed;

  return (
    <div
      className={`${styles.photoCell} ${isFeatured ? styles.featured : ''}`}
      style={{
        background: showImg ? undefined : (photo.bg || 'var(--surface)'),
        animationDelay: `${index * 0.03}s`,
      }}
      onClick={onClick}
    >
      {showImg
        ? <img
            src={photo.imageUrl}
            alt={photo.caption || `Photo ${index + 1}`}
            className={styles.photoImg}
            onError={() => setImgFailed(true)}
          />
        : <span className={styles.photoEmoji}>{photo.emoji || '📸'}</span>
      }
      <div className={styles.photoOverlay} />
      <span className={styles.photoNum}>{index + 1}</span>
      {photo.tags?.length > 0 && (
        <span className={styles.photoTagBadge}>
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="3.5" r="2" stroke="white" strokeWidth="1.2"/>
            <path d="M1 9c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {photo.tags.length}
        </span>
      )}
    </div>
  );
}

/* ── Related gallery card with onError fallback ───────────────────────────── */
function RelatedCard({ gallery, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = gallery.thumbnail && !imgFailed;

  return (
    <div className={styles.relatedCard} onClick={onClick}>
      <div
        className={styles.relatedThumb}
        style={{ background: showImg ? undefined : (gallery.bg || 'var(--surface)') }}
      >
        {showImg
          ? <img
              src={gallery.thumbnail}
              alt={gallery.title}
              className={styles.relatedImg}
              onError={() => setImgFailed(true)}
            />
          : <span className={styles.relatedEmoji}>{gallery.emoji || '📸'}</span>
        }
        <span className={styles.relatedCount}>{gallery.count}</span>
      </div>
      <p className={styles.relatedTitle}>{gallery.title}</p>
    </div>
  );
}

/* ── Lightbox with onError, top close, better layout ──────────────────────── */
function Lightbox({ photos, index, total, onClose, onChange }) {
  const [imgFailed, setImgFailed] = useState(false);
  const photo = photos[index];

  // Reset imgFailed when photo changes
  const showImg = photo.imageUrl && !imgFailed;

  function handleChange(newIdx) {
    setImgFailed(false);
    onChange(newIdx);
  }

  return (
    <div className={styles.lightbox} onClick={onClose}>

      {/* Top bar — counter + close */}
      <div className={styles.lightboxTop} onClick={e => e.stopPropagation()}>
        <span className={styles.lightboxCount}>{index + 1} / {total}</span>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Main photo */}
      <div
        className={styles.lightboxPhoto}
        style={{ background: showImg ? undefined : (photo.bg || 'rgba(255,255,255,0.05)') }}
        onClick={e => e.stopPropagation()}
      >
        {showImg
          ? <img
              src={photo.imageUrl}
              alt={photo.caption || ''}
              className={styles.lightboxImg}
              onError={() => setImgFailed(true)}
            />
          : <span className={styles.lightboxEmoji}>{photo.emoji || '📸'}</span>
        }
        {index > 0 && (
          <button className={`${styles.navBtn} ${styles.navPrev}`} onClick={() => handleChange(index - 1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        {index < photos.length - 1 && (
          <button className={`${styles.navBtn} ${styles.navNext}`} onClick={() => handleChange(index + 1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Caption + person tags */}
      {(photo.caption || photo.tags?.length > 0) && (
        <div className={styles.captionBar} onClick={e => e.stopPropagation()}>
          {photo.caption && (
            <p className={styles.captionText}>{photo.caption}</p>
          )}
          {photo.tags?.length > 0 && (
            <div className={styles.personTags}>
              {photo.tags.map(t => (
                <span key={t.id} className={styles.personTag}>{t.name}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Thumbnail strip */}
      <div className={styles.strip} onClick={e => e.stopPropagation()}>
        {photos.map((p, i) => (
          <StripThumb
            key={p.id ?? i}
            photo={p}
            active={i === index}
            onClick={() => handleChange(i)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Strip thumbnail with onError ─────────────────────────────────────────── */
function StripThumb({ photo, active, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = (photo.imageUrl || photo.thumbnail) && !imgFailed;

  return (
    <div
      className={`${styles.stripThumb} ${active ? styles.stripActive : ''}`}
      style={{ background: showImg ? undefined : (photo.bg || 'var(--surface)') }}
      onClick={onClick}
    >
      {showImg
        ? <img
            src={photo.thumbnail || photo.imageUrl}
            alt=""
            className={styles.stripImg}
            onError={() => setImgFailed(true)}
          />
        : <span className={styles.stripEmoji}>{photo.emoji || '📸'}</span>
      }
    </div>
  );
}
