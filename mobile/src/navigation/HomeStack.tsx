import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import { useThemeStore } from '../store/themeStore';
import HomeScreen from '../features/home/screens/HomeScreen';
import ArticleDetailScreen from '../features/news/screens/ArticleDetailScreen';
import CelebritiesScreen from '../features/celebrities/screens/CelebritiesScreen';
import CelebrityDetailScreen from '../features/celebrities/screens/CelebrityDetailScreen';
import VideosScreen from '../features/videos/screens/VideosScreen';
import VideoDetailScreen from '../features/videos/screens/VideoDetailScreen';
import GalleriesScreen from '../features/galleries/screens/GalleriesScreen';
import GalleryDetailScreen from '../features/galleries/screens/GalleryDetailScreen';
import FanFictionScreen from '../features/fanfiction/screens/FanFictionScreen';
import FanFictionDetailScreen from '../features/fanfiction/screens/FanFictionDetailScreen';
import ChapterReaderScreen from '../features/fanfiction/screens/ChapterReaderScreen';

function PlaceholderScreen({ route }: { route: { name: string } }) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 16, color: colors.textSecondary }}>{route.name}</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="CategoryFeed" component={PlaceholderScreen} />
      <Stack.Screen name="Celebrities" component={CelebritiesScreen} />
      <Stack.Screen name="CelebrityProfile" component={CelebrityDetailScreen} />
      <Stack.Screen name="FanFiction" component={FanFictionScreen} />
      <Stack.Screen name="FanFictionDetail" component={FanFictionDetailScreen} />
      <Stack.Screen name="ChapterReader" component={ChapterReaderScreen} />
      <Stack.Screen name="Videos" component={VideosScreen} />
      <Stack.Screen name="VideoDetail" component={VideoDetailScreen} />
      <Stack.Screen name="Shorts" component={PlaceholderScreen} />
      <Stack.Screen name="WebStories" component={PlaceholderScreen} />
      <Stack.Screen name="WebStoryPlayer" component={PlaceholderScreen} />
      <Stack.Screen name="Quizzes" component={PlaceholderScreen} />
      <Stack.Screen name="QuizPlayer" component={PlaceholderScreen} />
      <Stack.Screen name="QuizResult" component={PlaceholderScreen} />
      <Stack.Screen name="QuizLeaderboard" component={PlaceholderScreen} />
      <Stack.Screen name="Galleries" component={GalleriesScreen} />
      <Stack.Screen name="GalleryDetail" component={GalleryDetailScreen} />
    </Stack.Navigator>
  );
}
