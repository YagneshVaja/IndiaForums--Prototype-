import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import SplashScreen from '../features/onboarding/screens/SplashScreen';
import OnboardingScreen from '../features/onboarding/screens/OnboardingScreen';
import GetStartedScreen from '../features/onboarding/screens/GetStartedScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen
        name="Onboarding"
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
