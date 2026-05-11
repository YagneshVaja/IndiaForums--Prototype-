import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { MainTabParamList } from './types';
import { useNotificationsStore } from '../store/notificationsStore';
import { useThemeStore } from '../store/themeStore';
import HomeStack from './HomeStack';
import NewsStack from './NewsStack';
import ForumsStack from './ForumsStack';
import SearchStack from './SearchStack';
import MySpaceStack from './MySpaceStack';
import SideMenu from '../components/layout/SideMenu';
import { ChromeScrollProvider } from '../components/layout/chromeScroll/ChromeScrollContext';
import AnimatedTabBar from '../components/layout/chromeScroll/AnimatedTabBar';

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
  const colors = useThemeStore((s) => s.colors);
  return (
    <View style={tabIconStyles.wrapper}>
      {focused && <View style={[tabIconStyles.indicator, { backgroundColor: colors.primary }]} />}
      <View style={[
        tabIconStyles.pill,
        focused && { backgroundColor: colors.primarySoft },
      ]}>
        <Ionicons
          name={focused ? iconFocused : iconUnfocused}
          size={22}
          color={focused ? colors.primary : colors.textTertiary}
        />
        {hasNotif && <View style={[tabIconStyles.notifDot, { backgroundColor: colors.danger, borderColor: colors.card }]} />}
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
  },
  pill: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 2,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const colors = useThemeStore((s) => s.colors);

  return (
    <ChromeScrollProvider>
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          paddingHorizontal: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
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
    {/* Status-bar backdrop — keeps the safe-area-top region opaque so scrolling
        content never bleeds through the status bar when AnimatedTopBar hides.
        Drawn after Tab.Navigator (so it covers AnimatedTopBar's transparent
        safe-area strip on the way down) and before SideMenu (so the drawer
        renders on top when open). */}
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: insets.top,
        backgroundColor: colors.card,
      }}
    />
    <SideMenu />
    </ChromeScrollProvider>
  );
}
