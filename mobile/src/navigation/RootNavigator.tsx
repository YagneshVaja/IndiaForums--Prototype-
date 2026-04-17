import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { hasSeenOnboarding } from '../store/onboardingStore';
import { useAuthStore } from '../store/authStore';
import OnboardingStack from './OnboardingStack';
import AuthStack from './AuthStack';
import GuestStack from './GuestStack';

const Root = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const seenOnboarding  = hasSeenOnboarding();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const initialRoute: keyof RootStackParamList = seenOnboarding
    ? isAuthenticated ? 'Main' : 'Guest'
    : 'Onboarding';

  return (
    <Root.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Root.Screen name="Onboarding" component={OnboardingStack} />
      <Root.Screen name="Guest" component={GuestStack} />
      <Root.Screen name="Auth" component={AuthStack} />
      {/* Main wired in Task 8 */}
      <Root.Screen name="Main" component={GuestStack} />
    </Root.Navigator>
  );
}
