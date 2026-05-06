import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Static onboarding marketing content — NOT live data.
//
// Show names + content-type labels are sourced from indiaforums.com's
// homepage trending shows section. Onboarding runs before login and
// needs to work offline, so nothing here implies real-time signals
// (no "Live now", no pulsing dots, no broadcast badges). Each row is
// purely a sample card showing what type of forum the user will find.
//
// Refresh cadence: review every 3-4 months. Top shows on Indian TV churn
// faster than the rest of the brand content.
//
// Last refreshed: 2026-05-06.
const SHOWS = [
  { name: 'Anupamaa',       channel: 'Star Plus', kind: 'Show forum',   icon: 'chatbubbles' as const, tint: '#3558F0' },
  { name: 'Bhagya Lakshmi', channel: 'Zee TV',    kind: 'Fan fiction',  icon: 'book'        as const, tint: '#10B981' },
  { name: 'Udne Ki Aasha',  channel: 'Star Plus', kind: 'Show forum',   icon: 'chatbubble'  as const, tint: '#F59E0B' },
];

export default function DiscussionHero() {
  return (
    <View style={styles.wrapper}>
      {SHOWS.map((s) => (
        <View key={s.name} style={styles.row}>
          <View style={[styles.iconBadge, { backgroundColor: s.tint + '22' }]}>
            <Ionicons name={s.icon} size={20} color={s.tint} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.showName}>{s.name}</Text>
            <Text style={styles.channelName}>{s.channel} · {s.kind}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: 8,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  showName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  channelName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.1,
  },
});
