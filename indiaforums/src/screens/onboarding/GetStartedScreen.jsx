import styles from './GetStartedScreen.module.css';

export default function GetStartedScreen({ onCreateAccount, onSignIn, onGuest }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <img src="/iflogo.png" alt="IndiaForums" className={styles.logo} />
        <p className={styles.tagline}>{'Join millions of fans.\nYour community awaits.'}</p>
      </div>

      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={onCreateAccount}>
          Create Account
        </button>
        <button className={styles.outlineBtn} onClick={onSignIn}>
          Sign In
        </button>
        <button className={styles.ghostBtn} onClick={onGuest}>
          Continue as Guest
        </button>
      </div>
    </div>
  );
}
