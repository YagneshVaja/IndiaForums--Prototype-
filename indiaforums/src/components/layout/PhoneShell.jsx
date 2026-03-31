import styles from './PhoneShell.module.css';

export default function PhoneShell({ children, darkMode }) {
  return (
    <div
      className={styles.phone}
      data-theme={darkMode ? 'dark' : undefined}
    >
      {children}
    </div>
  );
}
