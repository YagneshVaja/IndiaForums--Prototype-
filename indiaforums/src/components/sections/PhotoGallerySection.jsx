import styles from './PhotoGallerySection.module.css';

export default function PhotoGallerySection({ galleries }) {
  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="1" y="3" width="13" height="10" rx="2" stroke="var(--brand)" strokeWidth="1.4"/>
            <circle cx="5.5" cy="6.5" r="1.3" stroke="var(--brand)" strokeWidth="1.2"/>
            <path d="M1 10.5l3.5-3 2.5 2.5 2.5-3L14 10.5" stroke="var(--brand)" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          <span className={styles.title}>Photo Galleries</span>
        </div>
        <span className={styles.seeAll}>See All →</span>
      </div>

      <div className={styles.scroll}>
        {galleries.map(g => (
          <div key={g.id} className={styles.card}>
            <div className={styles.thumb} style={{ background: g.bg }}>
              <span className={styles.emoji}>{g.emoji}</span>
              <div className={styles.countBadge}>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <rect x="0.5" y="0.5" width="6" height="6" rx="1" stroke="white" strokeWidth="1"/>
                  <rect x="2.5" y="2.5" width="6" height="6" rx="1" fill="rgba(255,255,255,0.3)" stroke="white" strokeWidth="1"/>
                </svg>
                {g.count}
              </div>
            </div>
            <div className={styles.cardTitle}>{g.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
