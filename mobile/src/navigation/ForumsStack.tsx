import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ForumsStackParamList } from './types';
import ForumsMainScreen from '../features/forums/screens/ForumsMainScreen';
import ForumThreadScreen from '../features/forums/screens/ForumThreadScreen';
import TopicDetailScreen from '../features/forums/screens/TopicDetailScreen';
import ReportsInboxScreen from '../features/forums/screens/ReportsInboxScreen';

const Stack = createNativeStackNavigator<ForumsStackParamList>();

export default function ForumsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ForumsMain" component={ForumsMainScreen} />
      <Stack.Screen name="ForumThread" component={ForumThreadScreen} />
      <Stack.Screen name="TopicDetail" component={TopicDetailScreen} />
      <Stack.Screen name="ReportsInbox" component={ReportsInboxScreen} />
    </Stack.Navigator>
  );
}
