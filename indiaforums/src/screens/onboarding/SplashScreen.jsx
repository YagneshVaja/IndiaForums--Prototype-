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
        <img src="/iflogo.png" alt="IndiaForums" className={styles.logo} />
        <p className={styles.tagline}>India's Premier Fan Community</p>
      </div>
      <div className={styles.loader} />
    </div>
  );
}
