import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SearchStackParamList } from './types';

import SearchMainScreen from '../features/search/screens/SearchMainScreen';
import SearchResultsScreen from '../features/search/screens/SearchResultsScreen';
import ArticleDetailScreen from '../features/news/screens/ArticleDetailScreen';
import CelebrityDetailScreen from '../features/celebrities/screens/CelebrityDetailScreen';
import VideoDetailScreen from '../features/videos/screens/VideoDetailScreen';
import GalleryDetailScreen from '../features/galleries/screens/GalleryDetailScreen';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={SearchMainScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="CelebrityProfile" component={CelebrityDetailScreen} />
      <Stack.Screen name="VideoDetail" component={VideoDetailScreen} />
      <Stack.Screen name="GalleryDetail" component={GalleryDetailScreen} />
    </Stack.Navigator>
  );
}
