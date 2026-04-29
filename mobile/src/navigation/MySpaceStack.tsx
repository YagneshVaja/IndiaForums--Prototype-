import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MySpaceStackParamList } from './types';
import MySpaceMainScreen from '../features/myspace/screens/MySpaceMainScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import EditProfileScreen from '../features/profile/screens/EditProfileScreen';
import UsernameScreen from '../features/profile/screens/UsernameScreen';
import StatusScreen from '../features/profile/screens/StatusScreen';
import DevicesScreen from '../features/profile/screens/DevicesScreen';
import BuddiesScreen from '../features/profile/screens/BuddiesScreen';
import VerifyEmailScreen from '../features/profile/screens/VerifyEmailScreen';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import MyActivitiesScreen from '../features/activities/screens/MyActivitiesScreen';
import HelpCenterScreen from '../features/helpcenter/screens/HelpCenterScreen';
import AboutScreen from '../features/myspace/screens/AboutScreen';
import MySpaceSettingsScreen from '../features/myspace/screens/MySpaceSettingsScreen';
import ChangePasswordScreen from '../features/profile/screens/ChangePasswordScreen';
import BadgeDetailScreen from '../features/profile/screens/BadgeDetailScreen';
import EmailLogsScreen from '../features/profile/screens/EmailLogsScreen';
import MessagesInboxScreen from '../features/messages/screens/MessagesInboxScreen';
import MessageThreadScreen from '../features/messages/screens/MessageThreadScreen';
import MessageComposeScreen from '../features/messages/screens/MessageComposeScreen';
import MessageFoldersScreen from '../features/messages/screens/MessageFoldersScreen';
import ForumThreadScreen from '../features/forums/screens/ForumThreadScreen';
import TopicDetailScreen from '../features/forums/screens/TopicDetailScreen';
import ArticleDetailScreen from '../features/news/screens/ArticleDetailScreen';

const Stack = createNativeStackNavigator<MySpaceStackParamList>();

export default function MySpaceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MySpaceMain" component={MySpaceMainScreen} />
      <Stack.Screen name="MySpaceSettings" component={MySpaceSettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Username" component={UsernameScreen} />
      <Stack.Screen name="Status" component={StatusScreen} />
      <Stack.Screen name="Devices" component={DevicesScreen} />
      <Stack.Screen name="Buddies" component={BuddiesScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="EmailLogs" component={EmailLogsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="BadgeDetail" component={BadgeDetailScreen} />
      <Stack.Screen name="MyActivities" component={MyActivitiesScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Messages" component={MessagesInboxScreen} />
      <Stack.Screen name="MessageThread" component={MessageThreadScreen} />
      <Stack.Screen name="MessageFolders" component={MessageFoldersScreen} />
      <Stack.Screen name="Compose" component={MessageComposeScreen} />
      <Stack.Screen name="ForumThread" component={ForumThreadScreen} />
      <Stack.Screen name="TopicDetail" component={TopicDetailScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
    </Stack.Navigator>
  );
}
