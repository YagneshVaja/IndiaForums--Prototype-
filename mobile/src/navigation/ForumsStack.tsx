import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ForumsStackParamList } from './types';

function PlaceholderScreen({ route }: { route: { name: string } }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' }}>
      <Text style={{ fontSize: 16, color: '#666' }}>{route.name}</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<ForumsStackParamList>();

export default function ForumsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ForumsMain" component={PlaceholderScreen} />
      <Stack.Screen name="ForumList" component={PlaceholderScreen} />
      <Stack.Screen name="TopicList" component={PlaceholderScreen} />
      <Stack.Screen name="TopicDetail" component={PlaceholderScreen} />
    </Stack.Navigator>
  );
}
