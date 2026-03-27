import styles from './PlaceholderScreen.module.css';

export default function SearchScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.icon}>🔍</div>
      <div className={styles.label}>Search</div>
      <div className={styles.sub}>Coming soon</div>
    </div>
  );
}
