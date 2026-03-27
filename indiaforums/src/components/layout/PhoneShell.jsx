import styles from './PhoneShell.module.css';

export default function PhoneShell({ children }) {
  return <div className={styles.phone}>{children}</div>;
}
