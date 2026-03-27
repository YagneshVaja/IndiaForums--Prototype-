import styles from './TopNav.module.css';

export default function TopNav() {
  return (
    <div className={styles.topnav}>
      {/* Hamburger menu */}
      <div className={styles.btn}>
        <svg width="17" height="13" viewBox="0 0 17 13" fill="none">
          <rect y="0" width="17" height="2" rx="1" fill="#1A2038"/>
          <rect y="5.5" width="11" height="2" rx="1" fill="#1A2038"/>
          <rect y="11" width="7" height="2" rx="1" fill="var(--brand)"/>
        </svg>
      </div>

      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logomark}>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Faceted polygon — top half */}
            <polygon points="13,0 23,6 13,13" fill="#16A34A"/>
            <polygon points="13,0 13,13 3,6"  fill="#22C55E"/>
            {/* Faceted polygon — middle */}
            <polygon points="23,6 23,20 13,13" fill="#CA8A04"/>
            <polygon points="3,6  3,20 13,13"  fill="#7C3AED"/>
            {/* Faceted polygon — bottom half */}
            <polygon points="23,20 13,26 13,13" fill="#EA580C"/>
            <polygon points="13,26  3,20 13,13" fill="#DB2777"/>
          </svg>
        </div>
        <div className={styles.wordmark}>indiaforums</div>
      </div>

      {/* Right actions */}
      <div className={styles.right}>
        <div className={styles.btn}>
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
            <path d="M8.5 2a5.5 5.5 0 015.5 5.5c0 1.6.4 3 1 3.5H2c.6-.5 1-1.9 1-3.5A5.5 5.5 0 018.5 2z" stroke="#334155" strokeWidth="1.5"/>
            <path d="M6.5 14.5a2 2 0 004 0" stroke="#334155" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div className={styles.notifDot}/>
        </div>
        <div className={styles.btn}>
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
            <circle cx="8.5" cy="6" r="3" stroke="#334155" strokeWidth="1.5"/>
            <path d="M2 15.5a6.5 6.5 0 0113 0" stroke="#334155" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
