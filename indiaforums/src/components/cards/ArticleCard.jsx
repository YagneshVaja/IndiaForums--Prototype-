import styles from './ArticleCard.module.css';

export default function ArticleCard({ cat, tag, breaking, title, time, bg, emoji, thumbnail, delay = 0, onClick }) {
  return (
    <div className={styles.card} style={{ animationDelay: `${delay}s` }} onClick={onClick}>
      <div className={styles.thumb}>
        {thumbnail ? (
          <img src={thumbnail} alt="" className={styles.thumbImg} loading="lazy" />
        ) : (
          <div className={styles.thumbInner} style={{ background: bg }}>{emoji}</div>
        )}
        {tag && <div className={styles.badge}>{tag}</div>}
      </div>
      <div className={styles.body}>
        <div className={styles.cat}>
          {cat}
          {breaking && <span className={styles.breaking}>BREAKING</span>}
        </div>
        <div className={styles.title}>{title}</div>
        <div className={styles.time}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="#8B95B0" strokeWidth="1.2"/>
            <path d="M6 3.5v3l2 1.5" stroke="#8B95B0" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {time}
        </div>
      </div>
    </div>
  );
}
