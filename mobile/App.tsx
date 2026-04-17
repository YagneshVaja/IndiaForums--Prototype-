import React, { useEffect, useState, Component, ReactNode } from 'react';
import { View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { RobotoCondensed_700Bold } from '@expo-google-fonts/roboto-condensed';
import * as SplashScreen from 'expo-splash-screen';
import { hydrateTokens } from './src/services/tokenStorage';
import RootNavigator from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   2 * 60_000,
      gcTime:      30 * 60_000,
      retry:       1,
      networkMode: 'offlineFirst',
    },
    mutations: { retry: 0 },
  },
});

class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6F7' }}>
          <Text style={{ fontSize: 16, color: '#1A1A1A' }}>Something went wrong. Please restart the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [tokensReady, setTokensReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
    RobotoCondensed_700Bold,
  });

  useEffect(() => {
    hydrateTokens().finally(() => setTokensReady(true));
  }, []);

  const ready = tokensReady && fontsLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
