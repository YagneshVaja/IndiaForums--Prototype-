import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';

function PlaceholderScreen({ route }: { route: { name: string } }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' }}>
      <Text style={{ fontSize: 16, color: '#666' }}>{route.name}</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={PlaceholderScreen} />
      <Stack.Screen name="ArticleDetail" component={PlaceholderScreen} />
      <Stack.Screen name="CategoryFeed" component={PlaceholderScreen} />
      <Stack.Screen name="CelebrityProfile" component={PlaceholderScreen} />
      <Stack.Screen name="FanFiction" component={PlaceholderScreen} />
      <Stack.Screen name="FanFictionDetail" component={PlaceholderScreen} />
      <Stack.Screen name="ChapterReader" component={PlaceholderScreen} />
      <Stack.Screen name="FanFictionAuthors" component={PlaceholderScreen} />
      <Stack.Screen name="AuthorFollowers" component={PlaceholderScreen} />
      <Stack.Screen name="Shorts" component={PlaceholderScreen} />
      <Stack.Screen name="WebStories" component={PlaceholderScreen} />
      <Stack.Screen name="WebStoryPlayer" component={PlaceholderScreen} />
      <Stack.Screen name="Quizzes" component={PlaceholderScreen} />
      <Stack.Screen name="QuizPlayer" component={PlaceholderScreen} />
      <Stack.Screen name="QuizResult" component={PlaceholderScreen} />
      <Stack.Screen name="QuizLeaderboard" component={PlaceholderScreen} />
    </Stack.Navigator>
  );
}
