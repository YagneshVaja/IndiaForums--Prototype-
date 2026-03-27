import styles from './BottomNav.module.css';

const TABS = [
  { id: 'explore',  label: 'Explore',  hasNotif: false },
  { id: 'news',     label: 'News',     hasNotif: false },
  { id: 'forums',   label: 'Forums',   hasNotif: true  },
  { id: 'search',   label: 'Search',   hasNotif: false },
  { id: 'myspace',  label: 'My Space', hasNotif: false },
];

function IconExplore({ active }) {
  const c = active ? 'var(--brand)' : '#8B95B0';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 18v-6h6v6" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}

function IconNews({ active }) {
  const c = active ? 'var(--brand)' : '#8B95B0';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="3" width="16" height="14" rx="2.5" stroke={c} strokeWidth="1.5"/>
      <path d="M2 7.5h16" stroke={c} strokeWidth="1.5"/>
      <path d="M6 2v3M14 2v3" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5.5 11.5h9M5.5 14.5h6" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconForums({ active }) {
  const c = active ? 'var(--brand)' : '#8B95B0';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 2.5h16a1 1 0 011 1v11a1 1 0 01-1 1H5l-4 4V3.5a1 1 0 011-1z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6 7.5h8M6 11h5" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconSearch({ active }) {
  const c = active ? 'var(--brand)' : '#8B95B0';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6.5" stroke={c} strokeWidth="1.5"/>
      <path d="M14 14l4.5 4.5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconMySpace({ active }) {
  const c = active ? 'var(--brand)' : '#8B95B0';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5"/>
      <rect x="11" y="2" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5"/>
      <rect x="2" y="11" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5"/>
      <rect x="11" y="11" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5"/>
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
          <div key={id} className={styles.item} onClick={() => onTabChange(id)}>
            <div className={active ? styles.pillLight : styles.wrap}>
              <Icon active={active} />
            </div>
            <div className={active ? styles.activeLbl : styles.lbl}>{label}</div>
            {hasNotif && <div className={styles.notif}/>}
          </div>
        );
      })}
    </div>
  );
}
