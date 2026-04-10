import { memo } from 'react';
import styles from './FeaturedCard.module.css';

function FeaturedCard({ tag, tagColor, title, source, time, emoji, bg, thumbnail, onClick }) {
  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick?.()}>
      {thumbnail ? (
        <img src={thumbnail} alt="" className={styles.thumb} loading="lazy" decoding="async" />
      ) : (
        <div className={styles.bg} style={{ background: bg }}>{emoji}</div>
      )}
      <div className={styles.overlay}/>
      <div className={styles.content}>
        {tag && <div className={styles.tag} style={{ background: tagColor }}>{tag}</div>}
        <div className={styles.title}>{title}</div>
        <div className={styles.meta}>
          {source && <span className={styles.source}>{source}</span>}
          {source && <div className={styles.dot}/>}
          <span className={styles.time}>{time}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(FeaturedCard);
