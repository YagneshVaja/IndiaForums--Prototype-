import { useMemo } from 'react';
import { useDevToolbar, DEVICES, THEMES } from '../../contexts/DevToolbarContext';
import styles from './DevToolbar.module.css';

/* ── Group devices by brand for the optgroup dropdown ────────────────────── */
function groupByBrand(devices) {
  const groups = [];
  const seen = new Set();
  for (const d of devices) {
    if (!seen.has(d.brand)) {
      seen.add(d.brand);
      groups.push({ brand: d.brand, items: [] });
    }
    groups[groups.length - 1].items.push(d);
  }
  return groups;
}

/* ── Inline SVG icons ────────────────────────────────────────────────────── */
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const PortraitIcon = () => (
  <svg width="14" height="18" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1" width="12" height="16" rx="2"/>
    <line x1="5" y1="15" x2="9" y2="15"/>
  </svg>
);

const LandscapeIcon = () => (
  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1" width="16" height="12" rx="2"/>
    <line x1="15" y1="5" x2="15" y2="9"/>
  </svg>
);

/* ── Additional icons ────────────────────────────────────────────────────── */
const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
  </svg>
);

const SlowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
  </svg>
);

const ZoomIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);

const FontIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
  </svg>
);

export default function DevToolbar() {
  const {
    device, deviceIndex, orientation, darkMode, themeId, width, height,
    zoom, fontScale, showGrid, slowAnimations,
    setDeviceIndex, toggleOrientation, toggleDarkMode, setThemeId,
    setZoom, setFontScale, toggleGrid, toggleSlowAnimations, resetNav,
  } = useDevToolbar();

  const grouped = useMemo(() => groupByBrand(DEVICES), []);

  return (
    <div className={styles.toolbarWrap}>
      {/* ── Row 1: Device & Appearance ───────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.logo}>
          <svg width="18" height="18" viewBox="0 0 26 26" fill="none">
            <polygon points="13,0 23,6 13,13" fill="#16A34A"/>
            <polygon points="13,0 13,13 3,6"  fill="#22C55E"/>
            <polygon points="23,6 23,20 13,13" fill="#CA8A04"/>
            <polygon points="3,6  3,20 13,13"  fill="#7C3AED"/>
            <polygon points="23,20 13,26 13,13" fill="#EA580C"/>
            <polygon points="13,26  3,20 13,13" fill="#DB2777"/>
          </svg>
          <span className={styles.logoText}>DevTools</span>
        </div>

        <div className={styles.sep} />

        <div className={styles.control}>
          <label className={styles.label}>Device</label>
          <select
            className={styles.select}
            value={deviceIndex}
            onChange={(e) => setDeviceIndex(Number(e.target.value))}
          >
            {grouped.map((g) => (
              <optgroup key={g.brand} label={g.brand}>
                {g.items.map((d) => {
                  const idx = DEVICES.indexOf(d);
                  return (
                    <option key={idx} value={idx}>
                      {d.name} ({d.w}&times;{d.h})
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </div>

        <div className={styles.sep} />

        <div className={styles.control}>
          <label className={styles.label}>Orientation</label>
          <button
            className={styles.iconBtn}
            onClick={toggleOrientation}
            title={orientation === 'portrait' ? 'Switch to landscape' : 'Switch to portrait'}
          >
            {orientation === 'portrait' ? <PortraitIcon /> : <LandscapeIcon />}
            <span className={styles.btnLabel}>
              {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
            </span>
          </button>
        </div>

        <div className={styles.sep} />

        <div className={styles.control}>
          <label className={styles.label}>Mode</label>
          <button
            className={`${styles.iconBtn} ${darkMode ? styles.iconBtnActive : ''}`}
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <MoonIcon /> : <SunIcon />}
            <span className={styles.btnLabel}>
              {darkMode ? 'Dark' : 'Light'}
            </span>
          </button>
        </div>

        <div className={styles.sep} />

        <div className={styles.control}>
          <label className={styles.label}>Theme</label>
          <div className={styles.themeRow}>
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`${styles.themeDot} ${themeId === t.id ? styles.themeDotActive : ''}`}
                style={{ '--dot-color': t.accent }}
                onClick={() => setThemeId(t.id)}
                title={t.label}
                aria-label={`${t.label} theme`}
              />
            ))}
          </div>
        </div>

        <div className={styles.spacer} />

        <div className={styles.dims}>
          {width} &times; {height}
        </div>
      </div>

      {/* ── Row 2: Zoom, Font Scale, Utilities ───────────────────── */}
      <div className={styles.toolbar}>
        {/* Zoom */}
        <div className={styles.control}>
          <ZoomIcon />
          <label className={styles.label}>Zoom</label>
          <input
            type="range"
            className={styles.slider}
            min="0.5"
            max="1.5"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <span className={styles.sliderValue}>{Math.round(zoom * 100)}%</span>
        </div>

        <div className={styles.sep} />

        {/* Font Scale */}
        <div className={styles.control}>
          <FontIcon />
          <label className={styles.label}>Font</label>
          <input
            type="range"
            className={styles.slider}
            min="0.8"
            max="1.4"
            step="0.1"
            value={fontScale}
            onChange={(e) => setFontScale(Number(e.target.value))}
          />
          <span className={styles.sliderValue}>{Math.round(fontScale * 100)}%</span>
        </div>

        <div className={styles.sep} />

        {/* Grid Overlay */}
        <button
          className={`${styles.iconBtn} ${showGrid ? styles.iconBtnActive : ''}`}
          onClick={toggleGrid}
          title="Toggle grid overlay"
        >
          <GridIcon />
          <span className={styles.btnLabel}>Grid</span>
        </button>

        {/* Slow Animations */}
        <button
          className={`${styles.iconBtn} ${slowAnimations ? styles.iconBtnActive : ''}`}
          onClick={toggleSlowAnimations}
          title="Slow down animations (5x)"
        >
          <SlowIcon />
          <span className={styles.btnLabel}>Slow</span>
        </button>

        <div className={styles.spacer} />

        {/* Article type test shortcuts — open sample articles to verify
            Live News (type 8) and Listicle (type 7) rendering. */}
        <button
          className={styles.iconBtn}
          onClick={() => window.openArticleById?.(212479)}
          title="Open sample Live News article (articleTypeId 8)"
        >
          <span className={styles.btnLabel} style={{ color: 'var(--red)', fontWeight: 800 }}>● LIVE</span>
        </button>
        <button
          className={styles.iconBtn}
          onClick={() => window.openArticleById?.(226008)}
          title="Open sample Listicle article (articleTypeId 7)"
        >
          <span className={styles.btnLabel} style={{ color: 'var(--brand)', fontWeight: 800 }}>≡ LIST</span>
        </button>

        {/* Reset Navigation */}
        <button
          className={styles.resetBtn}
          onClick={resetNav}
          title="Reset navigation to home"
        >
          <ResetIcon />
          <span className={styles.btnLabel}>Reset Nav</span>
        </button>
      </div>
    </div>
  );
}
