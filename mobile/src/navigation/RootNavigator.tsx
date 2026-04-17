import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { hasSeenOnboarding } from '../store/onboardingStore';
import OnboardingStack from './OnboardingStack';
import AuthStack from './AuthStack';
import GuestStack from './GuestStack';
import MainTabNavigator from './MainTabNavigator';

const Root = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const seenOnboarding = hasSeenOnboarding();

  const initialRoute: keyof RootStackParamList = seenOnboarding ? 'Guest' : 'Onboarding';

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
