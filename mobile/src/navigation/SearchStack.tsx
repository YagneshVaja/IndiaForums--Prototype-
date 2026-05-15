import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SearchStackParamList } from './types';

import SearchScreen from '../features/search/screens/SearchScreen';
import ArticleDetailScreen from '../features/news/screens/ArticleDetailScreen';
import CelebrityDetailScreen from '../features/celebrities/screens/CelebrityDetailScreen';
import VideoDetailScreen from '../features/videos/screens/VideoDetailScreen';
import GalleryDetailScreen from '../features/galleries/screens/GalleryDetailScreen';
import TopicDetailScreen from '../features/forums/screens/TopicDetailScreen';
import ForumThreadScreen from '../features/forums/screens/ForumThreadScreen';
import MovieDetailScreen from '../features/movies/screens/MovieDetailScreen';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={SearchScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="CelebrityProfile" component={CelebrityDetailScreen} />
      <Stack.Screen name="VideoDetail" component={VideoDetailScreen} />
      <Stack.Screen name="GalleryDetail" component={GalleryDetailScreen} />
      <Stack.Screen name="TopicDetail" component={TopicDetailScreen} />
      <Stack.Screen name="ForumThread" component={ForumThreadScreen} />
      <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
    </Stack.Navigator>
  );
}
