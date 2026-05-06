import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { hasSeenOnboarding } from '../store/onboardingStore';
import { useAuthStore } from '../store/authStore';
import OnboardingStack from './OnboardingStack';
import AuthStack from './AuthStack';
import GuestStack from './GuestStack';
import MainTabNavigator from './MainTabNavigator';
import BrandSplash from '../components/BrandSplash';

const Root = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isHydrating = useAuthStore(s => s.isHydrating);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const hydrate = useAuthStore(s => s.hydrate);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Splash gate: render BrandSplash until BOTH the auth store has finished
  // hydrating AND the splash hold duration has elapsed. This guarantees every
  // user (first-time, returning guest, returning authed) sees the branded
  // moment, not just first-time users on the onboarding stack.
  if (isHydrating || !splashDone) {
    return <BrandSplash onReady={() => setSplashDone(true)} holdMs={2000} />;
  }

  const seenOnboarding = hasSeenOnboarding();
  const initialRoute: keyof RootStackParamList = isAuthenticated
    ? 'Main'
    : seenOnboarding
      ? 'Guest'
      : 'Onboarding';

  return (
    <Root.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Root.Screen name="Onboarding" component={OnboardingStack} />
      <Root.Screen name="Guest" component={GuestStack} />
      <Root.Screen name="Auth" component={AuthStack} />
      <Root.Screen name="Main" component={MainTabNavigator} />
    </Root.Navigator>
  );
}
