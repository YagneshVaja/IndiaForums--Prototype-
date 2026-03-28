import { useState } from 'react';
import styles from './GalleryDetailScreen.module.css';

export default function GalleryDetailScreen({ gallery, onBack }) {
  const [activePhoto, setActivePhoto] = useState(null);

  if (!gallery) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={styles.headerInfo}>
          <span className={styles.catLabel}>{gallery.cat.replace('-', ' ')}</span>
          <span className={styles.countLabel}>{gallery.count} photos</span>
        </div>
        <button className={styles.shareBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="13" cy="3" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="3"  cy="8" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="13" cy="13" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M4.7 7.1l6.6-3.2M4.7 8.9l6.6 3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className={styles.hero} style={{ background: gallery.bg }}>
        <span className={styles.heroEmoji}>{gallery.emoji}</span>
        <div className={styles.heroOverlay}>
          <p className={styles.heroTitle}>{gallery.title}</p>
          <span className={styles.heroTime}>{gallery.time}</span>
        </div>
      </div>

      <div className={styles.photoGrid}>
        {gallery.photos.map((p, i) => (
          <div
            key={i}
            className={`${styles.photoCell} ${i === 0 ? styles.featured : ''}`}
            style={{ background: p.bg, animationDelay: `${i * 0.03}s` }}
            onClick={() => setActivePhoto(i)}
          >
            <span className={styles.photoEmoji}>{p.emoji}</span>
            <div className={styles.photoOverlay} />
            <span className={styles.photoNum}>{i + 1}</span>
          </div>
        ))}
      </div>

      <div className={styles.spacer} />

      {activePhoto !== null && (
        <Lightbox
          photos={gallery.photos}
          index={activePhoto}
          onClose={() => setActivePhoto(null)}
          onChange={setActivePhoto}
        />
      )}
    </div>
  );
}

function Lightbox({ photos, index, onClose, onChange }) {
  const photo = photos[index];

  return (
    <div className={styles.lightbox} onClick={onClose}>
      <div
        className={styles.lightboxPhoto}
        style={{ background: photo.bg }}
        onClick={e => e.stopPropagation()}
      >
        <span className={styles.lightboxEmoji}>{photo.emoji}</span>

        {index > 0 && (
          <button className={`${styles.navBtn} ${styles.navPrev}`} onClick={() => onChange(index - 1)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L5 7l4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        {index < photos.length - 1 && (
          <button className={`${styles.navBtn} ${styles.navNext}`} onClick={() => onChange(index + 1)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      <div className={styles.lightboxBar} onClick={e => e.stopPropagation()}>
        <span className={styles.lightboxCount}>{index + 1} / {photos.length}</span>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className={styles.strip} onClick={e => e.stopPropagation()}>
        {photos.map((p, i) => (
          <div
            key={i}
            className={`${styles.stripThumb} ${i === index ? styles.stripActive : ''}`}
            style={{ background: p.bg }}
            onClick={() => onChange(i)}
          >
            <span className={styles.stripEmoji}>{p.emoji}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
