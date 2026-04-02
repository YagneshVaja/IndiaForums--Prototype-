import styles from './LanguageBar.module.css';

export default function LanguageBar({ langs, activeId, onSelect }) {
  return (
    <div className={styles.bar}>
      {langs.map((item) => {
        const isObj = typeof item === 'object';
        const key   = isObj ? item.id : item.toLowerCase().replace(/\s+/g, '');
        const label = isObj ? item.label : item;
        const active = key === activeId;
        return (
          <div
            key={key}
            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            onClick={() => onSelect(key)}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
