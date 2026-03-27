import styles from './SectionHeader.module.css';

export default function SectionHeader({ title, linkLabel = 'See all' }) {
  return (
    <div className={styles.header}>
      <div className={styles.title}>{title}</div>
      <div className={styles.link}>{linkLabel}</div>
    </div>
  );
}
