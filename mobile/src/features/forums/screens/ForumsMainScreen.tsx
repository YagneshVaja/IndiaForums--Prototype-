import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ForumListView from '../components/ForumListView';
import AllTopicsView from '../components/AllTopicsView';
import type { ForumsStackParamList } from '../../../navigation/types';
import type { Forum, ForumTopic } from '../../../services/api';

type Nav = NativeStackNavigationProp<ForumsStackParamList, 'ForumsMain'>;

type TopTab = 'forums' | 'all-topics';

export default function ForumsMainScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TopTab>('forums');

  const handleForumPress = (forum: Forum) => {
    navigation.navigate('ForumThread', { forum });
  };

  const handleTopicPress = (topic: ForumTopic) => {
    navigation.navigate('TopicDetail', { topic });
  };

  return (
    <View style={styles.screen}>
      {/* Back + tab bar */}
      <View style={[styles.topWrap, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.canGoBack() && navigation.goBack()}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={18} color="#0D0D0D" />
          </Pressable>
          <View style={styles.spacer} />
        </View>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, tab === 'forums' && styles.tabActive]}
            onPress={() => setTab('forums')}
          >
            <Text style={[styles.tabLabel, tab === 'forums' && styles.tabLabelActive]}>
              Forums
            </Text>
            {tab === 'forums' && <View style={styles.tabUnderline} />}
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'all-topics' && styles.tabActive]}
            onPress={() => setTab('all-topics')}
          >
            <Text style={[styles.tabLabel, tab === 'all-topics' && styles.tabLabelActive]}>
              All Topics
            </Text>
            {tab === 'all-topics' && <View style={styles.tabUnderline} />}
          </Pressable>
        </View>
      </View>

      {tab === 'forums' ? (
        <ForumListView onForumPress={handleForumPress} />
      ) : (
        <AllTopicsView onTopicPress={handleTopicPress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },
  topWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEEFF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1 },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 36,
    paddingBottom: 4,
  },
  tab: {
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {},
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  tabLabelActive: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2.5,
    backgroundColor: '#3558F0',
    borderRadius: 2,
  },
});
