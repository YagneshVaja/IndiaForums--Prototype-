import { useDevToolbar } from '../../contexts/DevToolbarContext';
import styles from './StatusBar.module.css';

function IOSIcons() {
  return (
    <>
      {/* Signal bars */}
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <rect x="0" y="4" width="3" height="8" rx="1" fill="currentColor"/>
        <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" fill="currentColor"/>
        <rect x="9" y="1" width="3" height="11" rx="1" fill="currentColor"/>
        <rect x="13.5" y="0" width="2.5" height="12" rx="1" fill="currentColor" opacity=".3"/>
      </svg>
      {/* WiFi */}
      <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
        <path d="M7.5 3C9.8 3 11.8 4 13.2 5.6L14.5 4.2C12.7 2.2 10.2 1 7.5 1S2.3 2.2.5 4.2L1.8 5.6C3.2 4 5.2 3 7.5 3z" fill="currentColor"/>
        <path d="M7.5 6c1.4 0 2.7.6 3.6 1.5L12.4 6C11.1 4.8 9.4 4 7.5 4S3.9 4.8 2.6 6l1.3 1.5C4.8 6.6 6.1 6 7.5 6z" fill="currentColor"/>
        <circle cx="7.5" cy="10" r="1.5" fill="currentColor"/>
      </svg>
      {/* iOS battery — pill with curved cap on right */}
      <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
        <rect x=".5" y=".5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity=".35"/>
        <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"/>
        <path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor" opacity=".4"/>
      </svg>
    </>
  );
}

function AndroidIcons() {
  return (
    <>
      {/* Signal bars — same shape, slightly different fill pattern */}
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <rect x="0" y="4" width="3" height="8" rx="1" fill="currentColor"/>
        <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" fill="currentColor"/>
        <rect x="9" y="1" width="3" height="11" rx="1" fill="currentColor"/>
        <rect x="13.5" y="0" width="2.5" height="12" rx="1" fill="currentColor"/>
      </svg>
      {/* WiFi */}
      <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
        <path d="M7.5 3C9.8 3 11.8 4 13.2 5.6L14.5 4.2C12.7 2.2 10.2 1 7.5 1S2.3 2.2.5 4.2L1.8 5.6C3.2 4 5.2 3 7.5 3z" fill="currentColor"/>
        <path d="M7.5 6c1.4 0 2.7.6 3.6 1.5L12.4 6C11.1 4.8 9.4 4 7.5 4S3.9 4.8 2.6 6l1.3 1.5C4.8 6.6 6.1 6 7.5 6z" fill="currentColor"/>
        <circle cx="7.5" cy="10" r="1.5" fill="currentColor"/>
      </svg>
      {/* Android battery — sharp corners, no curved cap */}
      <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
        <rect x=".5" y=".5" width="20" height="11" rx="2" stroke="currentColor" strokeOpacity=".4"/>
        <rect x="2" y="2" width="15" height="8" rx="1" fill="currentColor"/>
        <rect x="21.5" y="4" width="2.5" height="4" rx="1" fill="currentColor" opacity=".5"/>
      </svg>
    </>
  );
}

export default function StatusBar() {
  const { os } = useDevToolbar();
  return (
    <div className={`${styles.statusbar} ${os === 'android' ? styles.android : ''}`}>
      <div className={styles.time}>9:41</div>
      <div className={styles.icons}>
        {os === 'android' ? <AndroidIcons /> : <IOSIcons />}
      </div>
    </div>
  );
}
