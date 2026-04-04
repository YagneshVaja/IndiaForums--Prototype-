import styles from './ThreadCard.module.css';

export default function ThreadCard({
  forumName, bg, title, description, poster, ago,
  likes, views, comments, lastBy, lastTime,
  locked, pinned, tags, topicImage,
  delay = 0,
}) {
  return (
    <div className={styles.thread} style={{ animationDelay: `${delay}s` }}>
      <div className={styles.body}>
        {/* Top row: forum name + badges */}
        <div className={styles.topRow}>
          <span className={styles.forum}>{forumName}</span>
          {pinned && (
            <span className={styles.pinnedBadge}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 1.5v2l1 1v3.5L3.5 9v1h4v5h1v-5h4V9L10.5 8V4.5l1-1v-2h-7z"/></svg>
              Pinned
            </span>
          )}
          {locked && (
            <span className={styles.lockedBadge}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
              Locked
            </span>
          )}
        </div>

        {/* Title */}
        <div className={styles.title}>{title}</div>

        {/* Topic image */}
        {topicImage && (
          <div className={styles.topicImageWrap}>
            <img src={topicImage} alt="" className={styles.topicImage} />
          </div>
        )}

        {/* Description preview */}
        {description && !topicImage && <div className={styles.desc}>{description}</div>}

        {/* Tags */}
        {tags?.length > 0 && (
          <div className={styles.tagRow}>
            {tags.map(t => (
              <span key={t.id} className={styles.tag}>{t.name}</span>
            ))}
          </div>
        )}

        {/* Author row */}
        <div className={styles.authorRow}>
          <div className={styles.authorAvatar} style={{ background: bg }}>
            {poster ? poster.charAt(0).toUpperCase() : 'A'}
          </div>
          <span className={styles.authorName}>{poster}</span>
          <span className={styles.authorDot}>·</span>
          <span className={styles.authorTime}>{ago}</span>
        </div>

        {/* Stats + last reply */}
        <div className={styles.statsRow}>
          <div className={styles.statsLeft}>
            <span className={styles.stat}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 11s-5-3.5-5-7a5 5 0 0110 0c0 3.5-5 7-5 7z" stroke="currentColor" strokeWidth="1.1"/>
              </svg>
              {likes}
            </span>
            <span className={styles.stat}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 2h9a1 1 0 011 1v5a1 1 0 01-1 1H4l-3 2.5V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
              </svg>
              {comments}
            </span>
            <span className={styles.stat}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <ellipse cx="6.5" cy="6.5" rx="5.5" ry="3.5" stroke="currentColor" strokeWidth="1.1"/>
                <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
              </svg>
              {views}
            </span>
          </div>
          {lastBy && (
            <div className={styles.lastReply}>
              {lastTime} · {lastBy}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
