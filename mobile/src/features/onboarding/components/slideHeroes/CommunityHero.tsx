import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LOGO_ICON = require('../../../../../assets/icon.png');

const HERO_SIZE = 300;

const AVATAR_TINTS = ['#3558F0', '#EC4899', '#10B981', '#F59E0B'] as const;

export default function CommunityHero() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.glowDisc} />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={LOGO_ICON} style={styles.cardAvatar} resizeMode="contain" />
          <View style={styles.cardHeaderBars}>
            <View style={[styles.bar, { width: 90, height: 8 }]} />
            <View style={[styles.bar, { width: 56, height: 6, opacity: 0.55 }]} />
          </View>
        </View>
        <View style={[styles.bar, styles.bodyBar, { width: '92%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '88%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '60%' }]} />
        <View style={styles.cardFooter}>
          <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
          <View style={[styles.bar, { width: 18, height: 6, opacity: 0.5 }]} />
          <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" style={{ marginLeft: 12 }} />
          <View style={[styles.bar, { width: 18, height: 6, opacity: 0.5 }]} />
        </View>
      </View>

      {AVATAR_TINTS.map((tint, i) => (
        <View
          key={tint}
          style={[
            styles.avatar,
            avatarPositions[i],
            { borderColor: tint },
          ]}
        >
          <Ionicons name="person" size={18} color={tint} />
        </View>
      ))}
    </View>
  );
}

const avatarPositions = [
  { top: 4, left: 8 },
  { top: 8, right: 4 },
  { bottom: 32, left: 0 },
  { bottom: 16, right: 12 },
] as const;

const styles = StyleSheet.create({
  wrapper: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowDisc: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(53,88,240,0.10)',
    top: 10,
    left: 10,
  },
  card: {
    width: 240,
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardAvatar: {
    width: 32,
    height: 32,
  },
  cardHeaderBars: {
    flex: 1,
    gap: 4,
  },
  bar: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  bodyBar: {
    height: 7,
    marginBottom: 7,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  avatar: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
});
