import styles from './ChipsRow.module.css';

export default function ChipsRow({ chips, activeId, onSelect }) {
  return (
    <div className={styles.strip}>
      <div className={styles.row}>
        {chips.map(({ id, label }) => (
          <button
            key={id}
            className={`${styles.chip} ${id === activeId ? styles.chipActive : styles.chipInactive}`}
            onClick={() => onSelect(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
