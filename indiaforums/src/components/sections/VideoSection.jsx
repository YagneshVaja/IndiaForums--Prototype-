import styles from './VideoSection.module.css';

export default function VideoSection({ videos, onVideoPress }) {
  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="6.5" stroke="var(--brand)" strokeWidth="1.4"/>
            <path d="M6 4.8l5 2.7-5 2.7V4.8z" fill="var(--brand)"/>
          </svg>
          <span className={styles.title}>Videos</span>
        </div>
        <span className={styles.seeAll}>See All →</span>
      </div>

      <div className={styles.scroll}>
        {videos.map(v => (
          <div key={v.id} className={styles.card} onClick={() => onVideoPress && onVideoPress(v)}>
            <div className={styles.thumb} style={{ background: v.bg }}>
              {v.thumbnail ? (
                <img src={v.thumbnail} alt="" className={styles.thumbImg} loading="lazy" />
              ) : (
                <span className={styles.emoji}>{v.emoji}</span>
              )}
              <div className={styles.playOverlay}>
                <div className={styles.playBtn}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3.5l6 3.5-6 3.5V3.5z" fill="white"/>
                  </svg>
                </div>
              </div>
              {v.duration && <div className={styles.duration}>{v.duration}</div>}
            </div>
            <div className={styles.cardTitle}>{v.title}</div>
            <div className={styles.views}>{v.views ? `${v.views} views` : v.timeAgo || ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
