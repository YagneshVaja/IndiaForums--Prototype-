import styles from './NewsVerticalCard.module.css';

export default function NewsVerticalCard({ cat, tag, breaking, title, time, bg, emoji, thumbnail, source, readTime, onClick }) {
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.img} style={{ background: bg }}>
        {thumbnail ? (
          <img src={thumbnail} alt="" className={styles.thumbImg} loading="lazy" />
        ) : (
          emoji
        )}
        {breaking && <div className={styles.breaking}>Breaking</div>}
        {tag && <div className={styles.tag}>{tag}</div>}
      </div>
      <div className={styles.body}>
        <div className={styles.cat}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="var(--brand)" strokeWidth="1.3"/>
            <path d="M6 3.5v3l2 1.5" stroke="var(--brand)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {cat}
        </div>
        <div className={styles.title}>{title}</div>
        <div className={styles.footer}>
          <div className={styles.av}>IF</div>
          <div className={styles.author}>{source || 'IF News Desk'}</div>
          <div className={styles.dot}/>
          <div className={styles.time}>{time}</div>
          <div className={styles.read}>{readTime || '5 min read'}</div>
        </div>
      </div>
    </div>
  );
}
