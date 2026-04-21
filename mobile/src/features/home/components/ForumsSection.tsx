import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Thread {
  id: number;
  forumName: string;
  bg: string;
  emoji: string;
  title: string;
  poster: string;
  ago: string;
  likes: string;
  views: string;
  comments: string;
  lastBy: string;
  lastTime: string;
}

const FORUM_TABS = [
  { id: 'announcements', label: 'Announcements' },
  { id: 'latest',        label: 'Latest' },
  { id: 'popular',       label: 'Popular' },
];

const FORUMS: Record<string, Thread[]> = {
  announcements: [
    { id: 1, forumName: 'Current Affairs', bg: '#1e3a8a', emoji: '🌐', title: 'US & Israel vs Iran ongoing war discussion thread', poster: 'Leprechaun', ago: '2 days ago', likes: '891', views: '9.8k', comments: '299', lastBy: 'Cynical1', lastTime: '10 min ago' },
    { id: 2, forumName: 'Forum Games',     bg: '#7c3aed', emoji: '🎮', title: 'Deal or No Deal Season 2 (R2 Leaderboard + R3 p25)', poster: 'Minionite', ago: '10 days ago', likes: '426', views: '9.6k', comments: '244', lastBy: 'Delusional_Minx', lastTime: '3 hours ago' },
    { id: 3, forumName: 'Suggestions',     bg: '#b45309', emoji: '💬', title: 'Site Updates and Issues Discussions #9', poster: 'vijay', ago: '1 year ago', likes: '2.6k', views: '381.7k', comments: '1.6k', lastBy: 'gaadiglow', lastTime: '16 hours ago' },
  ],
  latest: [
    { id: 1, forumName: 'Bollywood',       bg: '#7f1d1d', emoji: '🎬', title: "SRK's new film title officially revealed — first look drops tonight!", poster: 'FilmBuff_IN', ago: '18 min ago', likes: '142', views: '2.1k', comments: '67', lastBy: 'SRKfan2026', lastTime: '2 min ago' },
    { id: 2, forumName: 'Cricket',         bg: '#14532d', emoji: '🏏', title: 'IPL 2026 — Match Day 18 live discussion: MI vs CSK', poster: 'CricketMania', ago: '45 min ago', likes: '3.2k', views: '44k', comments: '891', lastBy: 'WankhedeRoar', lastTime: 'just now' },
    { id: 3, forumName: 'K-Drama',         bg: '#0c4a6e', emoji: '📺', title: 'Squid Game S3 episode 4 — unpacking that brutal finale twist', poster: 'KDramaLover', ago: '2 hours ago', likes: '567', views: '8.9k', comments: '203', lastBy: 'NetflixIndia_fan', lastTime: '12 min ago' },
  ],
  popular: [
    { id: 1, forumName: 'Bigg Boss',       bg: '#4a2c8a', emoji: '👁️', title: 'BB18 All-Time Ranking Megathread — vote for your winner', poster: 'BBWatcher', ago: '5 days ago', likes: '12.4k', views: '2.1M', comments: '8.7k', lastBy: 'Vote4Shilpa', lastTime: '1 min ago' },
    { id: 2, forumName: 'Celebrities',     bg: '#831843', emoji: '⭐', title: 'Deepika vs Alia — who is the true queen of Bollywood in 2026?', poster: 'StargazerIN', ago: '3 days ago', likes: '9.1k', views: '890k', comments: '4.2k', lastBy: 'BollyQueen', lastTime: '5 min ago' },
    { id: 3, forumName: 'Current Affairs', bg: '#1e3a8a', emoji: '🌐', title: 'US & Israel vs Iran ongoing war discussion thread', poster: 'Leprechaun', ago: '2 days ago', likes: '891', views: '9.8k', comments: '299', lastBy: 'Cynical1', lastTime: '10 min ago' },
  ],
};

interface Props {
  onThreadPress?: (thread: Thread) => void;
}

export default function ForumsSection({ onThreadPress }: Props) {
  const [activeTab, setActiveTab] = useState<'announcements' | 'latest' | 'popular'>('announcements');
  const threads = FORUMS[activeTab];
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Forums</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {FORUM_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={styles.tab}
              onPress={() => setActiveTab(tab.id as typeof activeTab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.tabIndicator} />}
            </Pressable>
          );
        })}
      </View>

      {/* Thread list */}
      <View style={styles.threadList}>
        {threads.map(t => (
          <Pressable
            key={t.id}
            style={({ pressed }) => [styles.thread, pressed && styles.threadPressed]}
            onPress={() => onThreadPress?.(t)}
          >
            {/* Forum name */}
            <Text style={styles.forumName}>{t.forumName}</Text>

            {/* Title */}
            <Text style={styles.threadTitle} numberOfLines={2}>{t.title}</Text>

            {/* Author row */}
            <View style={styles.authorRow}>
              <View style={[styles.authorAvatar, { backgroundColor: t.bg }]}>
                <Text style={styles.authorInitial}>{t.poster.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.authorName}>{t.poster}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.authorTime}>{t.ago}</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statsLeft}>
                <Text style={styles.stat}>♥ {t.likes}</Text>
                <Text style={styles.stat}>💬 {t.comments}</Text>
                <Text style={styles.stat}>👁 {t.views}</Text>
              </View>
              <Text style={styles.lastReply} numberOfLines={1}>
                {t.lastTime} · {t.lastBy}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    sectionHeader: {
      paddingHorizontal: 14,
      paddingTop: 16,
      paddingBottom: 4,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.5,
    },
    tabRow: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderBottomColor: c.border,
      marginBottom: 10,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 4,
      position: 'relative',
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textTertiary,
    },
    tabTextActive: {
      color: c.text,
    },
    tabIndicator: {
      position: 'absolute',
      bottom: -2,
      left: '18%',
      right: '18%',
      height: 2.5,
      backgroundColor: c.primary,
      borderRadius: 2,
    },
    threadList: {
      paddingHorizontal: 14,
      paddingBottom: 16,
      gap: 8,
    },
    thread: {
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      gap: 4,
    },
    threadPressed: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    forumName: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    threadTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: c.text,
      lineHeight: 18,
      marginBottom: 4,
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 8,
    },
    authorAvatar: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    authorInitial: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    authorName: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },
    dot: {
      fontSize: 10,
      color: c.textTertiary,
    },
    authorTime: {
      fontSize: 10,
      color: c.textTertiary,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 8,
    },
    statsLeft: {
      flexDirection: 'row',
      gap: 10,
    },
    stat: {
      fontSize: 10.5,
      fontWeight: '600',
      color: c.textTertiary,
    },
    lastReply: {
      fontSize: 9.5,
      fontWeight: '600',
      color: c.textTertiary,
      maxWidth: '45%',
      textAlign: 'right',
    },
  });
}
