import styles from './StoryItem.module.css';

export default function StoryItem({ emoji, label, bg, hasStory }) {
  return (
    <div className={styles.item}>
      <div className={`${styles.ring} ${!hasStory ? styles.ringEmpty : ''}`}>
        <div className={styles.img} style={{ background: bg }}>{emoji}</div>
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
