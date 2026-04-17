import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { hasSeenOnboarding } from '../store/onboardingStore';
import OnboardingStack from './OnboardingStack';

// ---------------------------------------------------------------------------
// Placeholder screens — replace with real stacks in subsequent phases
// ---------------------------------------------------------------------------
function PlaceholderScreen({ label }: { label: string }) {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.label}>{label}</Text>
      <Text style={placeholderStyles.hint}>Coming soon</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F7',
    gap: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  hint: {
    fontSize: 14,
    color: '#9E9E9E',
  },
});

const GuestStackPlaceholder = () => (
  <PlaceholderScreen label="Guest — Browse without signing in" />
);
const AuthStackPlaceholder = () => (
  <PlaceholderScreen label="Auth — Login / Register" />
);
const MainTabsPlaceholder = () => (
  <PlaceholderScreen label="Main — Home, Forums, My Space…" />
);

// ---------------------------------------------------------------------------

const Root = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  // Synchronous MMKV read — determines initial route before first render.
  // Replace `isAuthenticated` with `useAuthStore(s => s.isAuthenticated)`
  // once the Zustand auth store is wired up in a later phase.
  const seenOnboarding = hasSeenOnboarding();
  const isAuthenticated = false; // TODO: wire to authStore

  const initialRoute: keyof RootStackParamList = seenOnboarding
    ? isAuthenticated
      ? 'Main'
      : 'Guest'
    : 'Onboarding';

  return (
    <Root.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Root.Screen name="Onboarding" component={OnboardingStack} />
      <Root.Screen name="Guest" component={GuestStackPlaceholder} />
      <Root.Screen name="Auth" component={AuthStackPlaceholder} />
      <Root.Screen name="Main" component={MainTabsPlaceholder} />
    </Root.Navigator>
  );
}
