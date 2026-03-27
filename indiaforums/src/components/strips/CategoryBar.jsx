import styles from './CategoryBar.module.css';

export default function CategoryBar({ cats, activeId, onSelect }) {
  return (
    <div className={styles.container}>
      <div className={styles.bar}>
        {cats.map(({ id, label }) => {
          const active = id === activeId;
          return (
            <div
              key={id}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              onClick={() => onSelect(id)}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
