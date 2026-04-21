import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NewsStackParamList } from './types';
import NewsScreen from '../features/news/screens/NewsScreen';
import ArticleDetailScreen from '../features/news/screens/ArticleDetailScreen';
import { useThemeStore } from '../store/themeStore';

function PlaceholderScreen({ route }: { route: { name: string } }) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 16, color: colors.textSecondary }}>{route.name}</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<NewsStackParamList>();

export default function NewsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NewsMain" component={NewsScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="CategoryFeed" component={PlaceholderScreen} />
    </Stack.Navigator>
  );
}
