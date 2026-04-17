import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchStackParamList } from './types';

function PlaceholderScreen({ route }: { route: { name: string } }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' }}>
      <Text style={{ fontSize: 16, color: '#666' }}>{route.name}</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={PlaceholderScreen} />
      <Stack.Screen name="ArticleDetail" component={PlaceholderScreen} />
      <Stack.Screen name="CelebrityProfile" component={PlaceholderScreen} />
    </Stack.Navigator>
  );
}
