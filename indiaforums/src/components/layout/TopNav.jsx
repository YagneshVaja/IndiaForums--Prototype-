import styles from './TopNav.module.css';

export default function TopNav({ title, onBack, onMenuOpen, notifCount = 0, onNotificationsPress }) {

  // ── Back-navigation mode ───────────────────────────────────────────────────
  if (onBack) {
    return (
      <div className={styles.topnav}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Go back">
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M7.5 1.5L1.5 7.5l6 6" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {title
          ? <div className={styles.screenTitle}>{title}</div>
          : <div className={styles.flex1} />
        }

        <div className={styles.backSpacer} />
      </div>
    );
  }

  // ── Default brand nav ──────────────────────────────────────────────────────
  return (
    <div className={styles.topnav}>

      {/* Hamburger */}
      <button className={styles.iconBtn} onClick={onMenuOpen} aria-label="Open menu">
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <rect y="0"   width="18" height="2" rx="1" fill="currentColor"/>
          <rect y="6"   width="12" height="2" rx="1" fill="currentColor"/>
          <rect y="12"  width="7"  height="2" rx="1" fill="var(--brand)"/>
        </svg>
      </button>

      {/* Logo */}
      <div className={styles.logo}>
        <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
          <polygon points="13,0 23,6 13,13" fill="#16A34A"/>
          <polygon points="13,0 13,13 3,6"  fill="#22C55E"/>
          <polygon points="23,6 23,20 13,13" fill="#CA8A04"/>
          <polygon points="3,6  3,20 13,13"  fill="#7C3AED"/>
          <polygon points="23,20 13,26 13,13" fill="#EA580C"/>
          <polygon points="13,26  3,20 13,13" fill="#DB2777"/>
        </svg>
        <span className={styles.wordmark}>indiaforums</span>
      </div>

      {/* Right actions */}
      <div className={styles.right}>
        <button
          className={styles.iconBtn}
          aria-label="Notifications"
          style={{ position: 'relative' }}
          onClick={onNotificationsPress}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a5.5 5.5 0 015.5 5.5c0 1.8.5 3.2 1.1 3.8H2.4c.6-.6 1.1-2 1.1-3.8A5.5 5.5 0 019 2z"
              stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M7 15a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {notifCount > 0 ? (
            <span className={styles.notifBadge}>
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          ) : (
            <span className={styles.notifDot} />
          )}
        </button>

        <button className={styles.iconBtn} aria-label="Profile">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2.5 16a6.5 6.5 0 0113 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

    </div>
  );
}
