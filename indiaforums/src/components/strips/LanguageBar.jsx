import styles from './LanguageBar.module.css';

export default function LanguageBar({ langs, activeId, onSelect }) {
  return (
    <div className={styles.bar}>
      {langs.map((lang) => {
        const key = lang.toLowerCase().replace(/\s+/g, '');
        const active = key === activeId;
        return (
          <div
            key={key}
            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            onClick={() => onSelect(key)}
          >
            {lang}
          </div>
        );
      })}
    </div>
  );
}
