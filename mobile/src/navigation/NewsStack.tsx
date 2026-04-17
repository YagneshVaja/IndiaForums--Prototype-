import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NewsStackParamList } from './types';

function PlaceholderScreen({ route }: { route: { name: string } }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' }}>
      <Text style={{ fontSize: 16, color: '#666' }}>{route.name}</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<NewsStackParamList>();

export default function NewsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NewsMain" component={PlaceholderScreen} />
      <Stack.Screen name="ArticleDetail" component={PlaceholderScreen} />
      <Stack.Screen name="CategoryFeed" component={PlaceholderScreen} />
    </Stack.Navigator>
  );
}
