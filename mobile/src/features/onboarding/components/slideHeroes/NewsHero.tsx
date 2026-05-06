import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Static onboarding marketing content — NOT live data.
//
// Section labels (TV / MOVIES / DIGITAL) mirror the news category nav
// on indiaforums.com's homepage. Onboarding runs offline before login,
// so nothing here implies real-time signals (no pulsing BREAKING dot,
// no "Updated every hour" claim).
//
// Last refreshed: 2026-05-06.
const SECTIONS = [
  { name: 'TV',      icon: 'tv'             as const, tint: '#3558F0', bg: '#EEF2FF' },
  { name: 'MOVIES',  icon: 'film'           as const, tint: '#EC4899', bg: '#FCE7F3' },
  { name: 'DIGITAL', icon: 'phone-portrait' as const, tint: '#10B981', bg: '#D1FAE5' },
];

export default function NewsHero() {
  return (
    <View style={styles.wrapper}>
      {/* Hero amber headline card — static content, no real-time framing */}
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headlineCard}
      >
        <Ionicons name="newspaper" size={32} color="#FFFFFF" />
        <Text style={styles.headlineTitle}>Headlines</Text>
        <Text style={styles.headlineSubtitle}>Bollywood · OTT · Television</Text>
      </LinearGradient>

      {/* Section row — real category labels from site nav */}
      <View style={styles.sectionsRow}>
        {SECTIONS.map((s) => (
          <View key={s.name} style={[styles.sectionCard, { backgroundColor: s.bg }]}>
            <Ionicons name={s.icon} size={22} color={s.tint} />
            <Text style={[styles.sectionLabel, { color: s.tint }]}>{s.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: 8,
    gap: 14,
  },
  headlineCard: {
    paddingHorizontal: 18,
    paddingVertical: 22,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 8,
    gap: 8,
  },
  headlineTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  headlineSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.4,
  },
  sectionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
