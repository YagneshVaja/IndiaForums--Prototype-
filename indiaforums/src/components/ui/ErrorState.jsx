import styles from './ErrorState.module.css';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>!</div>
      <div className={styles.text}>{message || 'Something went wrong'}</div>
      {onRetry && (
        <button className={styles.retryBtn} onClick={onRetry}>Retry</button>
      )}
    </div>
  );
}
