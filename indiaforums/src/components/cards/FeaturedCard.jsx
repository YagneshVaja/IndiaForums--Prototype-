import styles from './FeaturedCard.module.css';

export default function FeaturedCard({ tag, tagColor, title, source, time, emoji, bg, onClick }) {
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.bg} style={{ background: bg }}>{emoji}</div>
      <div className={styles.overlay}/>
      <div className={styles.content}>
        <div className={styles.tag} style={{ background: tagColor }}>{tag}</div>
        <div className={styles.title}>{title}</div>
        <div className={styles.meta}>
          <span className={styles.source}>{source}</span>
          <div className={styles.dot}/>
          <span className={styles.time}>{time}</span>
        </div>
      </div>
    </div>
  );
}
