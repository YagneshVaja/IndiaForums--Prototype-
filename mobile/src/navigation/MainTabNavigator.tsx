import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { useNotificationsStore } from '../store/notificationsStore';
import HomeStack from './HomeStack';
import NewsStack from './NewsStack';
import ForumsStack from './ForumsStack';
import SearchStack from './SearchStack';
import MySpaceStack from './MySpaceStack';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3558F0',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8E8E8',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? 'home' : 'home-outline') as IoniconName}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="News"
        component={NewsStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? 'newspaper' : 'newspaper-outline') as IoniconName}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Forums"
        component={ForumsStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? 'chatbubbles' : 'chatbubbles-outline') as IoniconName}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? 'search' : 'search-outline') as IoniconName}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MySpace"
        component={MySpaceStack}
        options={{
          tabBarLabel: 'My Space',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={(focused ? 'person' : 'person-outline') as IoniconName}
                size={24}
                color={color}
              />
              {unreadCount > 0 && (
                <View style={styles.badge} />
              )}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
});
