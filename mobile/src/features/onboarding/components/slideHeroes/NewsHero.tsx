import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Real news section labels sourced from indiaforums.com homepage nav.
const SECTIONS = [
  { name: 'TV',       icon: 'tv'         as const, tint: '#3558F0', bg: '#EEF2FF' },
  { name: 'MOVIES',   icon: 'film'       as const, tint: '#EC4899', bg: '#FCE7F3' },
  { name: 'DIGITAL',  icon: 'phone-portrait' as const, tint: '#10B981', bg: '#D1FAE5' },
];

function PulsingDot() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return <Animated.View style={[styles.breakingDot, { opacity }]} />;
}

export default function NewsHero() {
  return (
    <View style={styles.wrapper}>
      {/* Hero amber headline card */}
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headlineCard}
      >
        <View style={styles.headlineRow}>
          <Ionicons name="newspaper" size={28} color="#FFFFFF" />
          <View style={styles.breakingBadge}>
            <PulsingDot />
            <Text style={styles.breakingText}>BREAKING</Text>
          </View>
        </View>
        <Text style={styles.headlineTitle}>Latest from indiaforums.com</Text>
        <Text style={styles.headlineSubtitle}>Updated every hour</Text>
      </LinearGradient>

      {/* Section row — real category labels from site */}
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
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 8,
    gap: 10,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  breakingDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },
  breakingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.8,
  },
  headlineTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headlineSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
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
