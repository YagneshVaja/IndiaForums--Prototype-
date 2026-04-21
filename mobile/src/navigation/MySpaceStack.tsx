import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MySpaceStackParamList } from './types';
import MySpaceMainScreen from '../features/myspace/screens/MySpaceMainScreen';
import { useThemeStore } from '../store/themeStore';

function PlaceholderScreen({ route }: { route: { name: string } }) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 16, color: colors.textSecondary }}>{route.name}</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<MySpaceStackParamList>();

export default function MySpaceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MySpaceMain" component={MySpaceMainScreen} />
      <Stack.Screen name="Profile" component={PlaceholderScreen} />
      <Stack.Screen name="EditProfile" component={PlaceholderScreen} />
      <Stack.Screen name="ChangePassword" component={PlaceholderScreen} />
      <Stack.Screen name="MyArticles" component={PlaceholderScreen} />
      <Stack.Screen name="MyFanFiction" component={PlaceholderScreen} />
      <Stack.Screen name="Followers" component={PlaceholderScreen} />
      <Stack.Screen name="Following" component={PlaceholderScreen} />
      <Stack.Screen name="Notifications" component={PlaceholderScreen} />
      <Stack.Screen name="Messages" component={PlaceholderScreen} />
      <Stack.Screen name="MessageThread" component={PlaceholderScreen} />
      <Stack.Screen name="Compose" component={PlaceholderScreen} />
    </Stack.Navigator>
  );
}
