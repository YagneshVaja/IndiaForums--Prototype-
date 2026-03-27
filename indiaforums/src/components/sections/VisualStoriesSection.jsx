import styles from './VisualStoriesSection.module.css';

export default function VisualStoriesSection({ stories }) {
  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="2" y="1" width="11" height="13" rx="2" stroke="var(--brand)" strokeWidth="1.4"/>
            <path d="M5 5h5M5 8h3" stroke="var(--brand)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span className={styles.title}>Visual Stories</span>
        </div>
        <span className={styles.seeAll}>See All →</span>
      </div>

      <div className={styles.scroll}>
        {stories.map(s => (
          <div key={s.id} className={styles.card}>
            <div className={styles.thumb} style={{ background: s.bg }}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} />
              </div>
              <span className={styles.emoji}>{s.emoji}</span>
              <div className={styles.overlay}>
                <div className={styles.cardTitle}>{s.title}</div>
                <div className={styles.slides}>{s.subtitle}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
