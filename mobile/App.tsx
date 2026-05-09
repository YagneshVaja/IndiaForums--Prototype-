import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import axios from 'axios';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { useThemeStore } from './src/store/themeStore';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';

// preventAutoHideAsync rejects on web (no native splash). Swallow.
SplashScreen.preventAutoHideAsync().catch(() => {});
// setOptions is unsupported in Expo Go (warns to console). Only call it
// in standalone / dev builds where the native splash module is wired up.
if (Constants.appOwnership !== 'expo') {
  SplashScreen.setOptions({ duration: 400, fade: true });
}

// Queries should fail fast when the user is offline — don't sit through 3
// automatic retries × 15s axios timeout. Retry only for transient 5xx/timeouts.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, err) => {
        if (failureCount >= 1) return false;
        if (axios.isAxiosError(err)) {
          // Offline / unreachable host: no point retrying.
          if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !err.response) {
            return false;
          }
          const status = err.response.status;
          // 4xx won't succeed on retry (auth/permission/not-found).
          if (status >= 400 && status < 500) return false;
        }
        return true;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    },
  },
});

function ThemedNavigation() {
  const mode = useThemeStore((s) => s.mode);
  const colors = useThemeStore((s) => s.colors);
  const navTheme = useMemo(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.card,
        text: colors.text,
        primary: colors.primary,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [mode, colors]);
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const onLayoutReady = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayoutReady}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemedNavigation />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
