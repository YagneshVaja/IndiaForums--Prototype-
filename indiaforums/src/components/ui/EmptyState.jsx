import styles from './EmptyState.module.css';

export default function EmptyState({ icon, title, subtitle }) {
  return (
    <div className={styles.wrap}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.title}>{title || 'Nothing here yet'}</div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </div>
  );
}
