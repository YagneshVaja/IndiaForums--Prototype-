import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import OnboardingScreen from '../features/onboarding/screens/OnboardingScreen';
import GetStartedScreen from '../features/onboarding/screens/GetStartedScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen
        name="OnboardingSlides"
        component={OnboardingScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="GetStarted"
        component={GetStartedScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
