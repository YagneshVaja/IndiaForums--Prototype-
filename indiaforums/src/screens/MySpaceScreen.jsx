import styles from './PlaceholderScreen.module.css';

export default function MySpaceScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.icon}>⬛</div>
      <div className={styles.label}>My Space</div>
      <div className={styles.sub}>Coming soon</div>
    </div>
  );
}
