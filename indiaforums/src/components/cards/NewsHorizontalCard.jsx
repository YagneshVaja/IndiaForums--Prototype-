import styles from './NewsHorizontalCard.module.css';

export default function NewsHorizontalCard({ cat, tag, breaking, title, time, bg, emoji, source, delay = 0 }) {
  return (
    <div className={styles.card} style={{ animationDelay: `${delay}s` }}>
      <div className={styles.thumb} style={{ background: bg }}>
        {emoji}
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
