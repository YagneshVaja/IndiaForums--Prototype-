import styles from './SectionHeader.module.css';

export default function SectionHeader({ title, linkLabel = 'See all', onLinkPress }) {
  return (
    <div className={styles.header}>
      <div className={styles.title}>{title}</div>
      {linkLabel && (
        <button className={styles.link} onClick={onLinkPress}>{linkLabel}</button>
      )}
    </div>
  );
}
