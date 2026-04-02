import styles from './BottomNav.module.css';

const TABS = [
  { id: 'explore',  label: 'Explore',  hasNotif: false },
  { id: 'news',     label: 'News',     hasNotif: false },
  { id: 'forums',   label: 'Forums',   hasNotif: true  },
  { id: 'search',   label: 'Search',   hasNotif: false },
  { id: 'myspace',  label: 'My Space', hasNotif: false },
];

function IconExplore({ active }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1z"
        fill="var(--brand)" stroke="var(--brand)" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M7 18v-6h6v6" stroke="var(--card)" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1z"
        stroke="var(--text3)" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 18v-6h6v6" stroke="var(--text3)" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function IconNews({ active }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="3" width="16" height="14" rx="2.5"
        fill="var(--brand)" stroke="var(--brand)" strokeWidth="1.2"/>
      <path d="M2 7.5h16" stroke="var(--card)" strokeWidth="1.4"/>
      <path d="M6 2v3M14 2v3" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5.5 11.5h9M5.5 14.5h6" stroke="var(--card)" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="3" width="16" height="14" rx="2.5" stroke="var(--text3)" strokeWidth="1.5"/>
      <path d="M2 7.5h16" stroke="var(--text3)" strokeWidth="1.4"/>
      <path d="M6 2v3M14 2v3" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5.5 11.5h9M5.5 14.5h6" stroke="var(--text3)" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconForums({ active }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <path d="M2 2.5h16a1 1 0 011 1v11a1 1 0 01-1 1H5l-4 4V3.5a1 1 0 011-1z"
        fill="var(--brand)" stroke="var(--brand)" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M6 7.5h8M6 11h5" stroke="var(--card)" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <path d="M2 2.5h16a1 1 0 011 1v11a1 1 0 01-1 1H5l-4 4V3.5a1 1 0 011-1z"
        stroke="var(--text3)" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6 7.5h8M6 11h5" stroke="var(--text3)" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconSearch({ active }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" fill="var(--brand)" stroke="var(--brand)" strokeWidth="1.2"/>
      <path d="M6 9h6M9 6v6" stroke="var(--card)" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M13.5 13.5l4 4" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6.5" stroke="var(--text3)" strokeWidth="1.5"/>
      <path d="M14 14l4.5 4.5" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconMySpace({ active }) {
  return active ? (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <rect x="2"  y="2"  width="7" height="7" rx="2" fill="var(--brand)"/>
      <rect x="11" y="2"  width="7" height="7" rx="2" fill="var(--brand)" opacity="0.65"/>
      <rect x="2"  y="11" width="7" height="7" rx="2" fill="var(--brand)" opacity="0.65"/>
      <rect x="11" y="11" width="7" height="7" rx="2" fill="var(--brand)" opacity="0.35"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <rect x="2"  y="2"  width="7" height="7" rx="2" stroke="var(--text3)" strokeWidth="1.5"/>
      <rect x="11" y="2"  width="7" height="7" rx="2" stroke="var(--text3)" strokeWidth="1.5"/>
      <rect x="2"  y="11" width="7" height="7" rx="2" stroke="var(--text3)" strokeWidth="1.5"/>
      <rect x="11" y="11" width="7" height="7" rx="2" stroke="var(--text3)" strokeWidth="1.5"/>
    </svg>
  );
}

const ICONS = {
  explore: IconExplore,
  news:    IconNews,
  forums:  IconForums,
  search:  IconSearch,
  myspace: IconMySpace,
};

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <div className={styles.bottomnav}>
      {TABS.map(({ id, label, hasNotif }) => {
        const active = activeTab === id;
        const Icon = ICONS[id];
        return (
          <button key={id} className={`${styles.item} ${active ? styles.itemActive : ''}`}
            onClick={() => onTabChange(id)}>
            <div className={styles.iconWrap}>
              <Icon active={active} />
              {hasNotif && <span className={styles.notifDot} />}
            </div>
            <span className={active ? styles.activeLbl : styles.lbl}>{label}</span>
            {active && <span className={styles.indicator} />}
          </button>
        );
      })}
    </div>
  );
}
