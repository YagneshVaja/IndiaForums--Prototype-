import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { hasSeenOnboarding } from '../store/onboardingStore';
import { useAuthStore } from '../store/authStore';
import OnboardingStack from './OnboardingStack';
import AuthStack from './AuthStack';
import GuestStack from './GuestStack';
import MainTabNavigator from './MainTabNavigator';
import { useThemeStore } from '../store/themeStore';

const Root = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isHydrating = useAuthStore(s => s.isHydrating);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const hydrate = useAuthStore(s => s.hydrate);
  const colors = useThemeStore((s) => s.colors);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isHydrating) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
