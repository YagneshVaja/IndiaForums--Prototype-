import { useEffect } from 'react';
import styles from './SplashScreen.module.css';

export default function SplashScreen({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={styles.container}>
      <div className={styles.logoArea}>
        <div className={styles.logoMark}>
          <span className={styles.logoInitial}>IF</span>
        </div>
        <p className={styles.brandName}>IndiaForums</p>
        <p className={styles.tagline}>India's Premier Fan Community</p>
      </div>
      <div className={styles.loader} />
    </div>
  );
}
