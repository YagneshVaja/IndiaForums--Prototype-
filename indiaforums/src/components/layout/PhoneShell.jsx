import { useDevToolbar } from '../../contexts/DevToolbarContext';
import styles from './PhoneShell.module.css';

export default function PhoneShell({ children, darkMode }) {
  const { width, height, themeId, zoom, fontScale, showGrid, slowAnimations, os } = useDevToolbar();

  /* When fontScale !== 1, use CSS zoom to scale all content (including px values).
     Compensate dimensions so the phone stays visually the same size. */
  const compensatedW = fontScale !== 1 ? width / fontScale : width;
  const compensatedH = fontScale !== 1 ? height / fontScale : height;

  const phoneStyle = {
    '--phone-w': `${compensatedW}px`,
    '--phone-h': `${compensatedH}px`,
    '--anim-mult': slowAnimations ? 5 : 1,
  };

  if (fontScale !== 1) {
    phoneStyle.zoom = fontScale;
  }

  return (
    <div
      className={styles.zoomWrap}
      style={{ transform: `scale(${zoom})` }}
    >
      <div
        className={styles.phone}
        style={phoneStyle}
        data-os={os}
        data-theme={darkMode ? 'dark' : undefined}
        data-color-theme={themeId !== 'default' ? themeId : undefined}
        data-slow-anim={slowAnimations ? '' : undefined}
      >
        {children}
        {/* OS-specific bottom chrome */}
        {os === 'ios'
          ? <div className={styles.homeIndicator}><div className={styles.homeIndicatorPill} /></div>
          : <div className={styles.gestureBar}><div className={styles.gesturePill} /></div>
        }
        {showGrid && <div className={styles.gridOverlay} />}
      </div>
    </div>
  );
}
