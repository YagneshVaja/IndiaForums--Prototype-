import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ForumListView from '../components/ForumListView';
import AllTopicsView from '../components/AllTopicsView';
import MyView from '../components/MyView';
import type { ForumsStackParamList } from '../../../navigation/types';
import type { Forum, ForumTopic } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Nav = NativeStackNavigationProp<ForumsStackParamList, 'ForumsMain'>;

type TopTab = 'forums' | 'all-topics' | 'my';

export default function ForumsMainScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TopTab>('forums');
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleForumPress = (forum: Forum) => {
    navigation.navigate('ForumThread', { forum });
  };

  const handleTopicPress = (topic: ForumTopic) => {
    navigation.navigate('TopicDetail', { topic });
  };

  const canGoBack = navigation.canGoBack();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {/* Top bar: back button + screen title, symmetric so title stays centered */}
        <View style={styles.titleRow}>
          <View style={styles.sideSlot}>
            {canGoBack && (
              <Pressable
                style={styles.iconBtn}
                onPress={() => navigation.goBack()}
                hitSlop={10}
              >
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>
            )}
          </View>
          <Text style={styles.title}>Forums</Text>
          <View style={styles.sideSlot} />
        </View>

        {/* Tab strip */}
        <View style={styles.tabStrip}>
          <HeaderTab label="Forums"     active={tab === 'forums'}     onPress={() => setTab('forums')}     colors={colors} />
          <HeaderTab label="All Topics" active={tab === 'all-topics'} onPress={() => setTab('all-topics')} colors={colors} />
          <HeaderTab label="My"         active={tab === 'my'}         onPress={() => setTab('my')}         colors={colors} />
        </View>
      </View>

      {tab === 'forums' ? (
        <ForumListView onForumPress={handleForumPress} />
      ) : tab === 'all-topics' ? (
        <AllTopicsView onTopicPress={handleTopicPress} />
      ) : (
        <MyView onForumPress={handleForumPress} onTopicPress={handleTopicPress} />
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
            { color: active ? colors.primary : colors.textSecondary },
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
    paddingVertical: 10,
  },
  labelWrap: {
    alignItems: 'center',
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
    marginTop: 8,
    height: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
});

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    header: {
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 48,
      paddingHorizontal: 4,
    },
    sideSlot: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '700',
      color: c.text,
      letterSpacing: 0.2,
    },
    tabStrip: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
  });
}
