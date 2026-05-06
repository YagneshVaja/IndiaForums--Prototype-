import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Static onboarding marketing content — NOT live data.
//
// Conversation snippets are illustrative samples designed to evoke a
// real forum chat (the kind of exchange a user would find on
// indiaforums.com). Onboarding runs offline before login, so nothing
// here implies real-time signals.
//
// Refresh cadence: review every 6-12 months. Snippets reference
// long-running shows (Anupamaa) so they age slowly.
//
// Last refreshed: 2026-05-06.
const MESSAGES: Array<{
  side: 'left' | 'right';
  tint: string;
  bg: string;
  text: string;
}> = [
  { side: 'left',  tint: '#3558F0', bg: '#EEF2FF', text: "Loving Anupamaa's latest twist!" },
  { side: 'right', tint: '#10B981', bg: '#D1FAE5', text: 'Same — episode 1500 was epic' },
  { side: 'left',  tint: '#F59E0B', bg: '#FEF3C7', text: 'New Bhagya Lakshmi fan fic just dropped' },
  { side: 'right', tint: '#EC4899', bg: '#FCE7F3', text: 'Adding it to my list' },
];

export default function DiscussionHero() {
  return (
    <View style={styles.wrapper}>
      {MESSAGES.map((m, i) => (
        <View
          key={i}
          style={[styles.row, m.side === 'right' && styles.rowRight]}
        >
          <View style={[styles.avatar, { backgroundColor: m.bg }]}>
            <Ionicons name="person" size={16} color={m.tint} />
          </View>
          <View
            style={[
              styles.bubble,
              m.side === 'left' ? styles.bubbleLeft : styles.bubbleRight,
            ]}
          >
            <Text style={styles.bubbleText}>{m.text}</Text>
          </View>
        </View>
      ))}

      {/* Typing indicator — suggests ongoing conversation, not real-time */}
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: '#E2E8F0' }]}>
          <Ionicons name="person" size={16} color="#64748B" />
        </View>
        <View style={[styles.bubble, styles.bubbleLeft, styles.typingBubble]}>
          <View style={styles.typingDot} />
          <View style={[styles.typingDot, styles.typingDotMid]} />
          <View style={styles.typingDot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: 8,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  rowRight: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '78%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleLeft: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  typingBubble: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#94A3B8',
  },
  typingDotMid: {
    opacity: 0.5,
  },
});
