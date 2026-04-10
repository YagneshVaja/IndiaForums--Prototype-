import { useDevToolbar } from '../../contexts/DevToolbarContext';
import styles from './DynamicIsland.module.css';

export default function DynamicIsland() {
  const { os } = useDevToolbar();
  if (os === 'android') {
    return <div className={styles.punchhole} />;
  }
  return <div className={styles.island} />;
}
