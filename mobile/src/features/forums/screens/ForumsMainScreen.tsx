import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import ForumListView from '../components/ForumListView';
import AllTopicsView from '../components/AllTopicsView';
import MyView from '../components/MyView';
import type { ForumsStackParamList } from '../../../navigation/types';
import type { Forum, ForumTopic } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import { useSideMenuStore } from '../../../store/sideMenuStore';
import AnimatedTopBar from '../../../components/layout/chromeScroll/AnimatedTopBar';
import { useScrollChrome } from '../../../components/layout/chromeScroll/useScrollChrome';
import { useNotificationBell } from '../../../hooks/useNotificationBell';

type Nav = NativeStackNavigationProp<ForumsStackParamList, 'ForumsMain'>;

type TopTab = 'forums' | 'all-topics' | 'my';

export default function ForumsMainScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<TopTab>('forums');
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const { resetChrome } = useScrollChrome();
  const [topInset, setTopInset] = useState(0);
  const { notifCount, openNotifications } = useNotificationBell();

  useFocusEffect(
    useCallback(() => {
      resetChrome();
    }, [resetChrome]),
  );

  const handleForumPress = (forum: Forum) => {
    navigation.navigate('ForumThread', { forum });
  };

  const handleTopicPress = (
    topic: ForumTopic,
    opts?: { jumpToLast?: boolean; autoAction?: 'like' | 'reply' | 'quote' },
  ) => {
    navigation.navigate('TopicDetail', {
      topic,
      jumpToLast: opts?.jumpToLast,
      autoAction: opts?.autoAction,
    });
  };

  return (
    <View style={styles.screen}>
      <AnimatedTopBar
        onMenuPress={useSideMenuStore.getState().open}
        onNotificationsPress={openNotifications}
        notifCount={notifCount}
        onMeasure={setTopInset}
      >
        {/* Secondary tab strip — animates and measures together with the bar.
            Solid card bg so it doesn't show scrolling content underneath
            while hidden/sliding. */}
        <View style={styles.tabStrip}>
          <HeaderTab label="Forums"     active={tab === 'forums'}     onPress={() => setTab('forums')}     colors={colors} />
          <HeaderTab label="All Topics" active={tab === 'all-topics'} onPress={() => setTab('all-topics')} colors={colors} />
          <HeaderTab label="My"         active={tab === 'my'}         onPress={() => setTab('my')}         colors={colors} />
        </View>
      </AnimatedTopBar>

      {tab === 'forums' ? (
        <ForumListView onForumPress={handleForumPress} topInset={topInset} />
      ) : tab === 'all-topics' ? (
        <AllTopicsView onTopicPress={handleTopicPress} topInset={topInset} />
      ) : (
        <MyView onForumPress={handleForumPress} onTopicPress={handleTopicPress} topInset={topInset} />
      )}
    </View>
  );
}

function HeaderTab({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable style={tabStyles.tab} onPress={onPress} hitSlop={6}>
      <View style={tabStyles.labelWrap}>
        <Text
          style={[
            tabStyles.label,
            { color: active ? colors.text : colors.textTertiary },
            active && tabStyles.labelActive,
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            tabStyles.underline,
            { backgroundColor: active ? colors.primary : 'transparent' },
          ]}
        />
      </View>
    </Pressable>
  );
}

const tabStyles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
  },
  labelWrap: {
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  labelActive: {
    fontWeight: '700',
  },
  underline: {
    height: 3,
    width: 28,
    borderRadius: 999,
  },
});

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    tabStrip: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
  });
}
