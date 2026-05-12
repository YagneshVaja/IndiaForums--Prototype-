import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LOGO_ICON from '../../../../../assets/icon.png';

// Real channel names sourced from indiaforums.com homepage.
const CHANNELS = [
  { name: 'Star Plus', tint: '#3558F0', bg: '#EEF2FF' },
  { name: 'Zee TV',    tint: '#EC4899', bg: '#FCE7F3' },
  { name: 'Sony',      tint: '#10B981', bg: '#D1FAE5' },
  { name: 'Colors',    tint: '#F59E0B', bg: '#FEF3C7' },
  { name: 'SAB TV',    tint: '#8B5CF6', bg: '#EDE9FE' },
] as const;

export default function CommunityHero() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.glow} />

      <View style={styles.brandBadge}>
        <Image source={LOGO_ICON} style={styles.brandIcon} resizeMode="contain" />
      </View>

      <Text style={styles.label}>FANS OF</Text>

      <View style={styles.pillsRow}>
        {CHANNELS.map((c) => (
          <View key={c.name} style={[styles.pill, { backgroundColor: c.bg }]}>
            <View style={[styles.pillDot, { backgroundColor: c.tint }]} />
            <Text style={[styles.pillText, { color: c.tint }]}>{c.name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.iconRow}>
        <Ionicons name="people"     size={18} color="#3558F0" />
        <Ionicons name="heart"      size={18} color="#EC4899" />
        <Ionicons name="star"       size={18} color="#F59E0B" />
        <Ionicons name="chatbubbles" size={18} color="#10B981" />
        <Ionicons name="flame"      size={18} color="#8B5CF6" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(53,88,240,0.12)',
    top: -10,
  },
  brandBadge: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3558F0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.30,
    shadowRadius: 22,
    elevation: 10,
  },
  brandIcon: {
    width: 78,
    height: 78,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.6,
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 4,
  },
});
