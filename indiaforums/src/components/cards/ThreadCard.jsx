import styles from './ThreadCard.module.css';

export default function ThreadCard({ forumName, bg, emoji, title, poster, ago, likes, views, comments, lastBy, lastTime, delay = 0 }) {
  return (
    <div className={styles.thread} style={{ animationDelay: `${delay}s` }}>
      <div className={styles.avatar} style={{ background: bg }}>{emoji}</div>
      <div className={styles.body}>
        <div className={styles.forum}>{forumName}</div>
        <div className={styles.title}>{title}</div>
        <div className={styles.poster}>By <b>{poster}</b> · {ago}</div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 11s-5-3.5-5-7a5 5 0 0110 0c0 3.5-5 7-5 7z" stroke="#8B95B0" strokeWidth="1.1"/>
            </svg>
            {likes}
          </div>
          <div className={styles.stat}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 2h9a1 1 0 011 1v5a1 1 0 01-1 1H4l-3 2.5V3a1 1 0 011-1z" stroke="#8B95B0" strokeWidth="1.1" strokeLinejoin="round"/>
            </svg>
            {comments}
          </div>
          <div className={styles.stat}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <ellipse cx="6.5" cy="6.5" rx="5.5" ry="3.5" stroke="#8B95B0" strokeWidth="1.1"/>
              <circle cx="6.5" cy="6.5" r="1.5" stroke="#8B95B0" strokeWidth="1.1"/>
            </svg>
            {views}
          </div>
          <div className={styles.last}>{lastTime} · {lastBy}</div>
        </div>
      </div>
      <div className={styles.arrow}>
        <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
          <path d="M1.5 1.5l5 5-5 5" stroke="#8B95B0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
