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
import MoviesScreen from '../features/movies/screens/MoviesScreen';
import MovieDetailScreen from '../features/movies/screens/MovieDetailScreen';
import WriteMovieReviewScreen from '../features/movies/screens/WriteMovieReviewScreen';
import TopicDetailScreen from '../features/forums/screens/TopicDetailScreen';
import FanFictionScreen from '../features/fanfiction/screens/FanFictionScreen';
import FanFictionDetailScreen from '../features/fanfiction/screens/FanFictionDetailScreen';
import ChapterReaderScreen from '../features/fanfiction/screens/ChapterReaderScreen';
import ShortsScreen from '../features/shorts/screens/ShortsScreen';
import WebStoriesScreen from '../features/webstories/screens/WebStoriesScreen';
import WebStoryPlayerScreen from '../features/webstories/screens/WebStoryPlayerScreen';
import QuizzesScreen from '../features/quizzes/screens/QuizzesScreen';
import QuizDetailScreen from '../features/quizzes/screens/QuizDetailScreen';
import QuizPlayerScreen from '../features/quizzes/screens/QuizPlayerScreen';
import QuizResultScreen from '../features/quizzes/screens/QuizResultScreen';
import QuizLeaderboardScreen from '../features/quizzes/screens/QuizLeaderboardScreen';

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
      <Stack.Screen name="Shorts" component={ShortsScreen} />
      <Stack.Screen name="WebStories" component={WebStoriesScreen} />
      <Stack.Screen name="WebStoryPlayer" component={WebStoryPlayerScreen} />
      <Stack.Screen name="Quizzes" component={QuizzesScreen} />
      <Stack.Screen name="QuizDetail" component={QuizDetailScreen} />
      <Stack.Screen name="QuizPlayer" component={QuizPlayerScreen} />
      <Stack.Screen name="QuizResult" component={QuizResultScreen} />
      <Stack.Screen name="QuizLeaderboard" component={QuizLeaderboardScreen} />
      <Stack.Screen name="Galleries" component={GalleriesScreen} />
      <Stack.Screen name="GalleryDetail" component={GalleryDetailScreen} />
      <Stack.Screen name="Movies" component={MoviesScreen} />
      <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
      <Stack.Screen name="WriteMovieReview" component={WriteMovieReviewScreen} />
      <Stack.Screen name="TopicDetail" component={TopicDetailScreen} />
    </Stack.Navigator>
  );
}
