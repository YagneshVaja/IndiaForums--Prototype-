import React, { createContext, useContext, useMemo } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

interface ChromeScrollContextValue {
  /** 0 = chrome fully visible, 1 = chrome fully hidden. UI-thread shared value. */
  chromeProgress: SharedValue<number>;
  /** Force the chrome back to visible (used on tab focus, pull-to-refresh, etc.). */
  resetChrome: () => void;
}

const ChromeScrollContext = createContext<ChromeScrollContextValue | null>(null);

export function ChromeScrollProvider({ children }: { children: React.ReactNode }) {
  const chromeProgress = useSharedValue(0);

  const value = useMemo<ChromeScrollContextValue>(
    () => ({
      chromeProgress,
      resetChrome: () => {
        chromeProgress.value = withTiming(0, { duration: 180 });
      },
    }),
    [chromeProgress],
  );

  return (
    <ChromeScrollContext.Provider value={value}>
      {children}
    </ChromeScrollContext.Provider>
  );
}

export function useChromeScroll(): ChromeScrollContextValue {
  const ctx = useContext(ChromeScrollContext);
  if (!ctx) {
    throw new Error('useChromeScroll must be used inside <ChromeScrollProvider>.');
  }
  return ctx;
}
