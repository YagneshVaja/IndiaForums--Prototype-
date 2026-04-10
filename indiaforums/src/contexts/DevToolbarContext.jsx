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
  const [deviceIndex,     setDeviceIndex]     = useState(2);          // iPhone 16 (393x852)
  const [orientation,     setOrientation]     = useState('portrait'); // 'portrait' | 'landscape'
  const [darkMode,        setDarkMode]        = useState(false);
  const [themeId,         setThemeId]         = useState('default');
  const [zoom,            setZoom]            = useState(1);          // 0.5 – 1.5
  const [fontScale,       setFontScale]       = useState(1);          // 0.8 – 1.4
  const [showGrid,        setShowGrid]        = useState(false);
  const [slowAnimations,  setSlowAnimations]  = useState(false);
  const [navResetTrigger, setNavResetTrigger] = useState(0);

  const device = DEVICES[deviceIndex];
  const width  = orientation === 'portrait' ? device.w : device.h;
  const height = orientation === 'portrait' ? device.h : device.w;
  const os     = device.brand === 'Apple' ? 'ios' : 'android';

  const value = useMemo(() => ({
    // state
    device,
    deviceIndex,
    orientation,
    darkMode,
    themeId,
    width,
    height,
    zoom,
    fontScale,
    showGrid,
    slowAnimations,
    navResetTrigger,
    os,
    // setters
    setDeviceIndex,
    toggleOrientation: () => setOrientation((o) => o === 'portrait' ? 'landscape' : 'portrait'),
    toggleDarkMode:    () => setDarkMode((d) => !d),
    setThemeId,
    setZoom,
    setFontScale,
    toggleGrid:           () => setShowGrid((g) => !g),
    toggleSlowAnimations: () => setSlowAnimations((s) => !s),
    resetNav:             () => setNavResetTrigger((n) => n + 1),
  }), [device, deviceIndex, orientation, darkMode, themeId, width, height, zoom, fontScale, showGrid, slowAnimations, navResetTrigger, os]);

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
