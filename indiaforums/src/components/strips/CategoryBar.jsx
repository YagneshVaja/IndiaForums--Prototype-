import styles from './CategoryBar.module.css';

const ICONS = {
  grid: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor"/>
      <rect x="7.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" fillOpacity=".6"/>
      <rect x="1" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" fillOpacity=".6"/>
      <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor"/>
    </svg>
  ),
  tv: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7 10v2M4.5 12.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M3.5 5.5h7M3.5 7.5h4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  ),
  film: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="3" width="12" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1 5.5h12M1 9h12" stroke="currentColor" strokeWidth="1" strokeOpacity=".55"/>
      <path d="M4 3v8.5M10 3v8.5" stroke="currentColor" strokeWidth="1" strokeOpacity=".55"/>
      <path d="M1.5 3.5l3-1.5M6.5 3l2.5-1.5M11 2.5l1.5 .5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  digital: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 12.5h4M7 9v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M4.5 5.5a3.2 3.2 0 015 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="7" cy="5.5" r=".8" fill="currentColor"/>
    </svg>
  ),
  heart: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 12.5S1.5 8.8 1.5 5.2a3.6 3.6 0 016.5-2.1 3.6 3.6 0 016.5 2.1C14.5 8.8 7 12.5 7 12.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  trophy: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 1.5h6v5a3 3 0 01-6 0v-5z" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4 3.5H2.5a1.5 1.5 0 000 3H4M10 3.5h1.5a1.5 1.5 0 010 3H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M7 8.5v3.5M5 12.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
};

export default function CategoryBar({ cats, activeId, onSelect }) {
  return (
    <div className={styles.container}>
      <div className={styles.bar}>
        {cats.map(({ id, label, icon }) => {
          const active = id === activeId;
          return (
            <div
              key={id}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              onClick={() => onSelect(id)}
            >
              <span className={styles.icon}>{ICONS[icon]}</span>
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
