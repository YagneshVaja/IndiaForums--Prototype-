import { memo } from 'react';
import styles from './TopicCard.module.css';

function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function TopicCard({ forumName, forumBg, forumEmoji, title, poster, ago, likes, views, comments, preview, lastBy, lastTime, delay = 0 }) {
  return (
    <div className={styles.card} style={{ animationDelay: `${delay}s` }}>

      {/* Forum badge row */}
      <div className={styles.forumRow}>
        <div className={styles.forumAvatar} style={{ background: forumBg }}>
          {forumEmoji}
        </div>
        <span className={styles.forumName}>{forumName}</span>
      </div>

      {/* Title */}
      <div className={styles.title}>{title}</div>

      {/* Meta */}
      <div className={styles.meta}>
        Posted by: <span className={styles.poster}>{poster}</span>
        <span className={styles.dot}>·</span>
        {ago}
      </div>

      {/* Preview card */}
      {preview && (
        <div className={styles.preview}>
          <div className={styles.previewAuthor}>{preview.author}</div>
          <div className={styles.previewText}>{preview.text}</div>
        </div>
      )}

      {/* Stats footer */}
      <div className={styles.footer}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 11.5S1 7.8 1 4.6a3.5 3.5 0 016.5-1.8A3.5 3.5 0 0114 4.6c0 3.2-5 6.9-5 6.9H1"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
                fill="none"/>
              <path d="M1 4.5s.5 2.5 3 3.5" stroke="none"/>
            </svg>
            <path d="M6.5 2C4.6 2 3 3.6 3 5.5c0 2.9 3.5 5.5 3.5 5.5S10 8.4 10 5.5C10 3.6 8.4 2 6.5 2z"
              stroke="currentColor" strokeWidth="1.2" fill="none"/>
            {likes > 0 ? formatNum(likes) : '0'}
          </div>
          <div className={styles.stat}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1" y="2" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4 11l2-2h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {formatNum(views)}
          </div>
          <div className={styles.stat}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 1.5h10a1 1 0 011 1v5a1 1 0 01-1 1H4l-3 2.5V2.5a1 1 0 011-1z"
                stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            {formatNum(comments)}
          </div>
          <div className={styles.shareBtn}>Share</div>
        </div>

        <div className={styles.lastActive}>
          <span>{lastTime} by {lastBy}</span>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
            <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default memo(TopicCard);
