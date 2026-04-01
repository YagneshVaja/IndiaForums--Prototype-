import styles from './NewsHorizontalCard.module.css';

export default function NewsHorizontalCard({ cat, tag, breaking, title, time, bg, emoji, thumbnail, source, delay = 0, onClick }) {
  return (
    <div className={styles.card} style={{ animationDelay: `${delay}s` }} onClick={onClick}>
      <div className={styles.thumb} style={{ background: bg }}>
        {thumbnail ? (
          <img src={thumbnail} alt="" className={styles.thumbImg} loading="lazy" />
        ) : (
          emoji
        )}
        {tag && !breaking && <div className={styles.tag}>{tag}</div>}
        {breaking && <div className={`${styles.tag} ${styles.tagBreaking}`}>Breaking</div>}
      </div>
      <div className={styles.body}>
        <div className={styles.cat}>{cat}</div>
        <div className={styles.title}>{title}</div>
        <div className={styles.meta}>{source || 'IF News Desk'} · {time}</div>
      </div>
    </div>
  );
}
