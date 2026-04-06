import styles from './LoadingState.module.css';

export default function LoadingState({ variant = 'card', count = 4 }) {
  return (
    <div className={styles.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles[variant] || styles.card}>
          <div className={styles.thumb} />
          <div className={styles.body}>
            <div className={styles.line} />
            <div className={`${styles.line} ${styles.lineShort}`} />
            {variant === 'thread' && (
              <div className={`${styles.line} ${styles.lineTiny}`} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
