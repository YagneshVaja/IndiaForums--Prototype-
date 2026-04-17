import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MySpaceStackParamList } from './types';

function PlaceholderScreen({ route }: { route: { name: string } }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' }}>
      <Text style={{ fontSize: 16, color: '#666' }}>{route.name}</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<MySpaceStackParamList>();

export default function MySpaceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MySpaceMain" component={PlaceholderScreen} />
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
