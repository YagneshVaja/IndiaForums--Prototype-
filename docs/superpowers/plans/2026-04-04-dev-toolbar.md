# DevToolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a developer control toolbar above the PhoneShell that lets you preview the app on different devices, toggle dark/light mode, swap orientation, and switch color themes.

**Architecture:** A React Context (`DevToolbarContext`) holds all toolbar state (device, orientation, darkMode, theme). The `DevToolbar` component renders outside the PhoneShell in the browser chrome. PhoneShell reads dimensions from context via CSS custom properties set as inline styles. Themes are applied via a `data-color-theme` attribute that triggers CSS variable overrides in `tokens.css`.

**Tech Stack:** React 19 (useState, useContext, createContext), CSS Modules, CSS custom properties

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/contexts/DevToolbarContext.jsx` | Context provider: device presets, state, helpers |
| Create | `src/components/dev/DevToolbar.jsx` | Toolbar UI: dropdowns, toggles |
| Create | `src/components/dev/DevToolbar.module.css` | Toolbar styling (lives outside PhoneShell) |
| Modify | `src/main.jsx` | Wrap app in provider, render toolbar |
| Modify | `src/components/layout/PhoneShell.jsx` | Read context, apply dynamic dimensions + theme |
| Modify | `src/components/layout/PhoneShell.module.css` | Replace hardcoded 393/852 with CSS vars |
| Modify | `src/App.jsx` | Remove local darkMode state, consume from context |
| Modify | `src/styles/tokens.css` | Add theme color overrides |
| Modify | `src/styles/global.css` | Adjust body layout for toolbar + phone stacking |

---

## Task 1: Create DevToolbarContext

**Files:**
- Create: `src/contexts/DevToolbarContext.jsx`

- [ ] **Step 1: Create the context file with device presets and state**

```jsx
import { createContext, useContext, useState, useMemo } from 'react';

/* ── Device presets ───────────────────────────────────────────────────────── */
export const DEVICES = [
  // ── Apple ──
  { name: 'iPhone 16 Pro Max',   brand: 'Apple',   w: 440, h: 956 },
  { name: 'iPhone 16 Pro',       brand: 'Apple',   w: 402, h: 874 },
  { name: 'iPhone 16',           brand: 'Apple',   w: 393, h: 852 },
  { name: 'iPhone 15 Pro Max',   brand: 'Apple',   w: 430, h: 932 },
  { name: 'iPhone 15 Pro',       brand: 'Apple',   w: 393, h: 852 },
  { name: 'iPhone 15',           brand: 'Apple',   w: 393, h: 852 },
  { name: 'iPhone 14 Pro Max',   brand: 'Apple',   w: 430, h: 932 },
  { name: 'iPhone 14 Pro',       brand: 'Apple',   w: 393, h: 852 },
  { name: 'iPhone 14',           brand: 'Apple',   w: 390, h: 844 },
  { name: 'iPhone 13/12 Pro',    brand: 'Apple',   w: 390, h: 844 },
  { name: 'iPhone 13/12',        brand: 'Apple',   w: 390, h: 844 },
  { name: 'iPhone SE (3rd Gen)', brand: 'Apple',   w: 375, h: 667 },
  { name: 'iPhone 11',           brand: 'Apple',   w: 414, h: 896 },
  { name: 'iPhone X / XS',       brand: 'Apple',   w: 375, h: 812 },
  { name: 'iPad Mini',           brand: 'Apple',   w: 744, h: 1133 },
  { name: 'iPad Air',            brand: 'Apple',   w: 820, h: 1180 },
  { name: 'iPad Pro 11"',        brand: 'Apple',   w: 834, h: 1194 },
  { name: 'iPad Pro 12.9"',      brand: 'Apple',   w: 1024, h: 1366 },
  // ── Samsung ──
  { name: 'Galaxy S24 Ultra',    brand: 'Samsung', w: 412, h: 915 },
  { name: 'Galaxy S24+',         brand: 'Samsung', w: 412, h: 915 },
  { name: 'Galaxy S24',          brand: 'Samsung', w: 360, h: 780 },
  { name: 'Galaxy S23 Ultra',    brand: 'Samsung', w: 384, h: 824 },
  { name: 'Galaxy S23',          brand: 'Samsung', w: 360, h: 780 },
  { name: 'Galaxy Z Fold5',      brand: 'Samsung', w: 373, h: 839 },
  { name: 'Galaxy Z Flip5',      brand: 'Samsung', w: 360, h: 748 },
  { name: 'Galaxy A54',          brand: 'Samsung', w: 360, h: 800 },
  { name: 'Galaxy Tab S9',       brand: 'Samsung', w: 753, h: 1193 },
  // ── Google ──
  { name: 'Pixel 9 Pro XL',     brand: 'Google',  w: 412, h: 915 },
  { name: 'Pixel 9 Pro',        brand: 'Google',  w: 412, h: 915 },
  { name: 'Pixel 9',            brand: 'Google',  w: 412, h: 915 },
  { name: 'Pixel 8 Pro',        brand: 'Google',  w: 412, h: 915 },
  { name: 'Pixel 8',            brand: 'Google',  w: 412, h: 915 },
  { name: 'Pixel 8a',           brand: 'Google',  w: 412, h: 915 },
  { name: 'Pixel 7',            brand: 'Google',  w: 412, h: 915 },
  { name: 'Pixel 7a',           brand: 'Google',  w: 412, h: 846 },
  { name: 'Pixel Fold',         brand: 'Google',  w: 884, h: 1104 },
  // ── OnePlus ──
  { name: 'OnePlus 12',         brand: 'OnePlus', w: 412, h: 915 },
  { name: 'OnePlus Nord 3',     brand: 'OnePlus', w: 412, h: 915 },
  { name: 'OnePlus 11',         brand: 'OnePlus', w: 412, h: 915 },
  // ── Xiaomi ──
  { name: 'Xiaomi 14',          brand: 'Xiaomi',  w: 393, h: 873 },
  { name: 'Redmi Note 13 Pro',  brand: 'Xiaomi',  w: 393, h: 873 },
  { name: 'POCO F5',            brand: 'Xiaomi',  w: 393, h: 873 },
  // ── Others ──
  { name: 'Nothing Phone (2)',   brand: 'Nothing',  w: 412, h: 915 },
  { name: 'Motorola Edge 40',    brand: 'Motorola', w: 360, h: 780 },
  { name: 'Sony Xperia 1 V',     brand: 'Sony',     w: 412, h: 960 },
  { name: 'Realme GT5',          brand: 'Realme',   w: 393, h: 873 },
  { name: 'Vivo X100',           brand: 'Vivo',     w: 393, h: 873 },
  { name: 'Oppo Find X6',        brand: 'Oppo',     w: 412, h: 915 },
];

export const THEMES = [
  { id: 'default',  label: 'Default',  accent: '#3558F0' },
  { id: 'warm',     label: 'Warm',     accent: '#D97706' },
  { id: 'midnight', label: 'Midnight', accent: '#7C3AED' },
  { id: 'rose',     label: 'Rose',     accent: '#E03A5C' },
];

const DevToolbarContext = createContext(null);

export function DevToolbarProvider({ children }) {
  const [deviceIndex, setDeviceIndex] = useState(2);          // iPhone 16 (393x852) — default
  const [orientation, setOrientation]  = useState('portrait'); // 'portrait' | 'landscape'
  const [darkMode,    setDarkMode]     = useState(false);
  const [themeId,     setThemeId]      = useState('default');

  const device = DEVICES[deviceIndex];
  const width  = orientation === 'portrait' ? device.w : device.h;
  const height = orientation === 'portrait' ? device.h : device.w;

  const value = useMemo(() => ({
    // state
    device,
    deviceIndex,
    orientation,
    darkMode,
    themeId,
    width,
    height,
    // setters
    setDeviceIndex,
    toggleOrientation: () => setOrientation((o) => o === 'portrait' ? 'landscape' : 'portrait'),
    toggleDarkMode:    () => setDarkMode((d) => !d),
    setThemeId,
  }), [device, deviceIndex, orientation, darkMode, themeId, width, height]);

  return (
    <DevToolbarContext.Provider value={value}>
      {children}
    </DevToolbarContext.Provider>
  );
}

export function useDevToolbar() {
  const ctx = useContext(DevToolbarContext);
  if (!ctx) throw new Error('useDevToolbar must be used within DevToolbarProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/DevToolbarContext.jsx
git commit -m "feat: add DevToolbarContext with device presets, themes, and state management"
```

---

## Task 2: Create DevToolbar component

**Files:**
- Create: `src/components/dev/DevToolbar.jsx`
- Create: `src/components/dev/DevToolbar.module.css`

- [ ] **Step 1: Create DevToolbar.jsx**

```jsx
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

export default function DevToolbar() {
  const {
    device, deviceIndex, orientation, darkMode, themeId, width, height,
    setDeviceIndex, toggleOrientation, toggleDarkMode, setThemeId,
  } = useDevToolbar();

  const grouped = useMemo(() => groupByBrand(DEVICES), []);

  return (
    <div className={styles.toolbar}>
      {/* ── Logo ─────────────────────────────────────────────────── */}
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

      {/* ── Separator ────────────────────────────────────────────── */}
      <div className={styles.sep} />

      {/* ── Device selector ──────────────────────────────────────── */}
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

      {/* ── Separator ────────────────────────────────────────────── */}
      <div className={styles.sep} />

      {/* ── Orientation toggle ───────────────────────────────────── */}
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

      {/* ── Separator ────────────────────────────────────────────── */}
      <div className={styles.sep} />

      {/* ── Dark / Light toggle ──────────────────────────────────── */}
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

      {/* ── Separator ────────────────────────────────────────────── */}
      <div className={styles.sep} />

      {/* ── Theme selector ───────────────────────────────────────── */}
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

      {/* ── Spacer ───────────────────────────────────────────────── */}
      <div className={styles.spacer} />

      {/* ── Dimensions badge ─────────────────────────────────────── */}
      <div className={styles.dims}>
        {width} &times; {height}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create DevToolbar.module.css**

```css
/* ═══════════════════════════════════════════════════════════════════════════
   DEV TOOLBAR — Lives OUTSIDE PhoneShell, in the browser chrome
   ═══════════════════════════════════════════════════════════════════════════ */

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #1a1a2e;
  border-radius: 12px 12px 0 0;
  font-family: 'Roboto', system-ui, sans-serif;
  color: #c8cad0;
  font-size: 12px;
  user-select: none;
  flex-wrap: wrap;
  min-height: 48px;
  max-width: 100%;
  box-sizing: border-box;
}

/* ── Logo ──────────────────────────────────────────────────────────────── */
.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.logoText {
  font-weight: 700;
  font-size: 13px;
  color: #ffffff;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* ── Separator ─────────────────────────────────────────────────────────── */
.sep {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

/* ── Control group ─────────────────────────────────────────────────────── */
.control {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6b7280;
  font-weight: 600;
}

/* ── Select dropdown ───────────────────────────────────────────────────── */
.select {
  background: #16162a;
  color: #e4e6ec;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  max-width: 220px;
  transition: border-color 0.2s;
}

.select:hover {
  border-color: rgba(255, 255, 255, 0.25);
}

.select:focus {
  border-color: #3558F0;
  box-shadow: 0 0 0 2px rgba(53, 88, 240, 0.25);
}

.select option {
  background: #16162a;
  color: #e4e6ec;
}

.select optgroup {
  color: #6b7280;
  font-weight: 700;
  font-style: normal;
}

/* ── Icon button ───────────────────────────────────────────────────────── */
.iconBtn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #16162a;
  color: #c8cad0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  transition: all 0.2s;
}

.iconBtn:hover {
  background: #1f1f3a;
  border-color: rgba(255, 255, 255, 0.25);
}

.iconBtnActive {
  background: #1e1e40;
  border-color: #7C3AED;
  color: #c4b5fd;
}

.btnLabel {
  font-size: 11px;
}

/* ── Theme dots ────────────────────────────────────────────────────────── */
.themeRow {
  display: flex;
  gap: 6px;
  align-items: center;
}

.themeDot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--dot-color);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.themeDot:hover {
  transform: scale(1.15);
}

.themeDotActive {
  border-color: #ffffff;
  box-shadow: 0 0 0 2px var(--dot-color), 0 0 8px var(--dot-color);
}

/* ── Spacer ────────────────────────────────────────────────────────────── */
.spacer {
  flex: 1 1 0;
  min-width: 8px;
}

/* ── Dimensions badge ──────────────────────────────────────────────────── */
.dims {
  font-family: 'Roboto Mono', ui-monospace, monospace;
  font-size: 12px;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.06);
  padding: 3px 10px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dev/DevToolbar.jsx src/components/dev/DevToolbar.module.css
git commit -m "feat: add DevToolbar component with device selector, mode/orientation toggles, and theme picker"
```

---

## Task 3: Add theme color overrides to tokens.css

**Files:**
- Modify: `src/styles/tokens.css` (append after the `[data-theme="dark"]` block, at end of file around line 227)

- [ ] **Step 1: Add theme CSS variable overrides**

Append the following at the end of `src/styles/tokens.css` (after the closing `}` of the `[data-theme="dark"]` block):

```css
/* ─────────────────────────────────────────────────────────────────────────────
   COLOR THEMES — Applied via data-color-theme on PhoneShell
   Each theme overrides brand-related tokens only.
──────────────────────────────────────────────────────────────────────────── */

/* Warm — amber/orange accent */
[data-color-theme="warm"] {
  --brand:         #D97706;
  --brand-hover:   #B45309;
  --brand-light:   #FEF3C7;
  --brand-lighter: #FFFBEB;
  --brand-border:  rgba(217,119,6,0.35);
  --brand-glow:    rgba(217,119,6,0.10);
  --shadow-brand:  0 3px 12px rgba(217,119,6,0.25);
}
[data-color-theme="warm"][data-theme="dark"] {
  --brand:         #F59E0B;
  --brand-hover:   #FBBF24;
  --brand-light:   rgba(245,158,11,0.16);
  --brand-lighter: rgba(245,158,11,0.10);
  --brand-border:  rgba(245,158,11,0.35);
  --brand-glow:    rgba(245,158,11,0.22);
  --shadow-brand:  0 3px 12px rgba(245,158,11,0.35);
}

/* Midnight — deep purple accent */
[data-color-theme="midnight"] {
  --brand:         #7C3AED;
  --brand-hover:   #6D28D9;
  --brand-light:   #EDE9FE;
  --brand-lighter: #F5F3FF;
  --brand-border:  rgba(124,58,237,0.35);
  --brand-glow:    rgba(124,58,237,0.10);
  --shadow-brand:  0 3px 12px rgba(124,58,237,0.25);
}
[data-color-theme="midnight"][data-theme="dark"] {
  --brand:         #A78BFA;
  --brand-hover:   #C4B5FD;
  --brand-light:   rgba(167,139,250,0.16);
  --brand-lighter: rgba(167,139,250,0.10);
  --brand-border:  rgba(167,139,250,0.35);
  --brand-glow:    rgba(167,139,250,0.22);
  --shadow-brand:  0 3px 12px rgba(167,139,250,0.35);
}

/* Rose — pink accent */
[data-color-theme="rose"] {
  --brand:         #E03A5C;
  --brand-hover:   #C42B4A;
  --brand-light:   #FFF1F3;
  --brand-lighter: #FFF5F7;
  --brand-border:  rgba(224,58,92,0.35);
  --brand-glow:    rgba(224,58,92,0.10);
  --shadow-brand:  0 3px 12px rgba(224,58,92,0.25);
}
[data-color-theme="rose"][data-theme="dark"] {
  --brand:         #FB7185;
  --brand-hover:   #FDA4AF;
  --brand-light:   rgba(251,113,133,0.16);
  --brand-lighter: rgba(251,113,133,0.10);
  --brand-border:  rgba(251,113,133,0.35);
  --brand-glow:    rgba(251,113,133,0.22);
  --shadow-brand:  0 3px 12px rgba(251,113,133,0.35);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat: add warm, midnight, and rose color theme overrides to tokens"
```

---

## Task 4: Update PhoneShell for dynamic dimensions and theme

**Files:**
- Modify: `src/components/layout/PhoneShell.jsx`
- Modify: `src/components/layout/PhoneShell.module.css`

- [ ] **Step 1: Update PhoneShell.jsx to read context and set inline styles**

Replace the entire content of `src/components/layout/PhoneShell.jsx` with:

```jsx
import { useDevToolbar } from '../../contexts/DevToolbarContext';
import styles from './PhoneShell.module.css';

export default function PhoneShell({ children, darkMode }) {
  const { width, height, themeId } = useDevToolbar();

  return (
    <div
      className={styles.phone}
      style={{ '--phone-w': `${width}px`, '--phone-h': `${height}px` }}
      data-theme={darkMode ? 'dark' : undefined}
      data-color-theme={themeId !== 'default' ? themeId : undefined}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Update PhoneShell.module.css to use CSS custom properties**

Replace the entire content of `src/components/layout/PhoneShell.module.css` with:

```css
.phone {
  width: var(--phone-w, 393px);
  height: var(--phone-h, 852px);
  background: var(--bg);
  border-radius: 48px;
  border: 2px solid var(--border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.03),
    0 20px 60px rgba(12,16,36,0.18),
    0 8px 20px rgba(12,16,36,0.08),
    inset 0 1px 0 rgba(255,255,255,0.6);
  transition:
    background var(--duration-med) var(--ease-out),
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/PhoneShell.jsx src/components/layout/PhoneShell.module.css
git commit -m "feat: make PhoneShell dimensions dynamic via CSS custom properties and add theme attribute"
```

---

## Task 5: Update App.jsx to consume darkMode from context

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace local darkMode state with context**

In `src/App.jsx`, make these changes:

1. Add import at top (after the existing `import { useState } from 'react';` line):
```jsx
import { useDevToolbar } from './contexts/DevToolbarContext';
```

2. In the `App()` function body, add this line after the `/* ── UI state ──` comment section:
```jsx
const { darkMode, toggleDarkMode } = useDevToolbar();
```

3. Remove the local darkMode state line:
```jsx
// DELETE this line:
const [darkMode,   setDarkMode]   = useState(false);
```

4. Update the SideDrawer's `onDarkModeToggle` prop — change:
```jsx
onDarkModeToggle={() => setDarkMode((d) => !d)}
```
to:
```jsx
onDarkModeToggle={toggleDarkMode}
```

The result for the UI state section should look like:

```jsx
  /* ── UI state ─────────────────────────────────────────────────────────────── */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useDevToolbar();
```

And the SideDrawer in the render tree:

```jsx
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        darkMode={darkMode}
        onDarkModeToggle={toggleDarkMode}
        onNavigate={handleDrawerNavigate}
      />
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "refactor: consume darkMode from DevToolbarContext instead of local state"
```

---

## Task 6: Update global.css for toolbar + phone stacking layout

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add #dev-root layout and update body**

Replace the `body` rule in `src/styles/global.css` (lines 14-20) with:

```css
body {
  font-family: var(--font-body);
  background: #D8DADC;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  padding: 20px;
}

/* ── Dev toolbar + phone wrapper ────────────────────────────────────────── */
#dev-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
}
```

Note: changed `align-items: center` to `align-items: flex-start` on body so the dev-root sits near the top with its own margin-top for spacing.

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: update body layout for dev toolbar stacking above phone shell"
```

---

## Task 7: Wire everything together in main.jsx

**Files:**
- Modify: `src/main.jsx`

- [ ] **Step 1: Update main.jsx to wrap with provider and render toolbar**

Replace the entire content of `src/main.jsx` with:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css';
import './styles/global.css';
import { DevToolbarProvider } from './contexts/DevToolbarContext';
import DevToolbar from './components/dev/DevToolbar';
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DevToolbarProvider>
      <div id="dev-root">
        <DevToolbar />
        <App />
      </div>
    </DevToolbarProvider>
  </StrictMode>,
)
```

- [ ] **Step 2: Commit**

```bash
git add src/main.jsx
git commit -m "feat: wire DevToolbarProvider and DevToolbar into app entry point"
```

---

## Task 8: Verify and fix index.css #root conflict

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Update #root styles**

The `index.css` file has a `#root` block (lines 58-67) that constrains width and adds a border. Since the app now renders inside `#dev-root`, update the `#root` rule to not constrain the layout. Replace the `#root` rule:

```css
#root {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
}
```

This removes the `1126px` width constraint, the border, the `min-height`, `text-align: center`, and `flex-direction: column` that would fight with the new layout.

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "fix: update #root styles to work with new dev toolbar layout"
```

---

## Task 9: Smoke test

- [ ] **Step 1: Start the dev server and verify**

```bash
cd indiaforums && npm run dev
```

Open the browser. Verify:
1. Dark toolbar bar appears above the PhoneShell
2. Device dropdown changes phone dimensions smoothly
3. Orientation toggle swaps width/height
4. Dark/Light mode toggle works (both toolbar toggle and side drawer toggle stay in sync)
5. Theme dots change the brand color inside the phone
6. Dimensions badge shows current width x height
7. Smooth transitions when switching devices

- [ ] **Step 2: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```
