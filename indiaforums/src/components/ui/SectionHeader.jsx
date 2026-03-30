import styles from './SectionHeader.module.css';

export default function SectionHeader({ title, linkLabel = 'See all', onLinkPress }) {
  return (
    <div className={styles.header}>
      <div className={styles.title}>{title}</div>
      {linkLabel && (
        <div className={styles.link} onClick={onLinkPress}>{linkLabel}</div>
      )}
    </div>
  );
}
