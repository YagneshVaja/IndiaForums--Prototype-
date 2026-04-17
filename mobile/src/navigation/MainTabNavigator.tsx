import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { MainTabParamList } from './types';
import { useNotificationsStore } from '../store/notificationsStore';
import HomeStack from './HomeStack';
import NewsStack from './NewsStack';
import ForumsStack from './ForumsStack';
import SearchStack from './SearchStack';
import MySpaceStack from './MySpaceStack';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Tab icon with active pill wrap + top indicator ─────────────────────────────
function TabIcon({
  iconFocused,
  iconUnfocused,
  focused,
  hasNotif,
}: {
  iconFocused: IoniconName;
  iconUnfocused: IoniconName;
  focused: boolean;
  hasNotif?: boolean;
}) {
  return (
    <View style={tabIconStyles.wrapper}>
      {/* Top indicator line */}
      {focused && <View style={tabIconStyles.indicator} />}
      {/* Icon pill */}
      <View style={[tabIconStyles.pill, focused && tabIconStyles.pillActive]}>
        <Ionicons
          name={focused ? iconFocused : iconUnfocused}
          size={22}
          color={focused ? '#3558F0' : '#9E9E9E'}
        />
        {hasNotif && <View style={tabIconStyles.notifDot} />}
      </View>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    position: 'relative',
    marginTop: -2,
  },
  indicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 2.5,
    borderRadius: 3,
    backgroundColor: '#3558F0',
  },
  pill: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pillActive: {
    backgroundColor: '#EBF0FF',
  },
  notifDot: {
    position: 'absolute',
    top: 2,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#C8001E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderTopColor: '#E2E2E2',
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          paddingHorizontal: 4,
        },
        tabBarActiveTintColor: '#3558F0',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconFocused="home"
              iconUnfocused="home-outline"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="News"
        component={NewsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconFocused="newspaper"
              iconUnfocused="newspaper-outline"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Forums"
        component={ForumsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconFocused="chatbubbles"
              iconUnfocused="chatbubbles-outline"
              focused={focused}
              hasNotif
            />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconFocused="search"
              iconUnfocused="search-outline"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MySpace"
        component={MySpaceStack}
        options={{
          tabBarLabel: 'My Space',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconFocused="grid"
              iconUnfocused="grid-outline"
              focused={focused}
              hasNotif={unreadCount > 0}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
