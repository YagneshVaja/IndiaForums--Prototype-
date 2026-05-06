import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LOGO_ICON = require('../../../../../assets/icon.png');

const HERO_SIZE = 300;

export default function DiscussionHero() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.glowDisc} />

      <View style={[styles.card, styles.cardBottom]}>
        <View style={styles.iconRow}>
          <Ionicons name="book-outline" size={16} color="#10B981" />
          <View style={[styles.bar, { width: 60, height: 6, opacity: 0.55 }]} />
        </View>
        <View style={[styles.bar, styles.bodyBar, { width: '95%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '88%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '70%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '40%' }]} />
      </View>

      <View style={[styles.card, styles.cardMiddle]}>
        <View style={styles.iconRow}>
          <Image source={LOGO_ICON} style={styles.cardAvatar} resizeMode="contain" />
          <View style={styles.headerBars}>
            <View style={[styles.bar, { width: 70, height: 7 }]} />
            <View style={[styles.bar, { width: 40, height: 5, opacity: 0.5 }]} />
          </View>
        </View>
        <View style={[styles.bar, styles.bodyBar, { width: '90%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '75%' }]} />
        <View style={styles.miniFooter}>
          <Ionicons name="heart" size={12} color="#EC4899" />
          <View style={[styles.bar, { width: 14, height: 5, opacity: 0.5 }]} />
        </View>
      </View>

      <View style={[styles.card, styles.cardTop]}>
        <View style={styles.iconRow}>
          <Ionicons name="chatbubble-ellipses" size={16} color="#10B981" />
          <View style={[styles.bar, { width: 50, height: 6, opacity: 0.55 }]} />
        </View>
        <View style={[styles.bar, styles.bodyBar, { width: '85%' }]} />
        <View style={styles.replyRow}>
          <View style={styles.replyBadge}>
            <Text style={styles.replyBadgeText}>REPLY</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowDisc: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.10)',
  },
  card: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
  },
  cardBottom: {
    width: 220,
    height: 130,
    bottom: 30,
    left: 18,
    transform: [{ rotate: '-8deg' }],
  },
  cardMiddle: {
    width: 230,
    height: 130,
    top: 80,
    transform: [{ rotate: '4deg' }],
    zIndex: 2,
  },
  cardTop: {
    width: 210,
    height: 100,
    top: 24,
    right: 12,
    transform: [{ rotate: '-3deg' }],
    zIndex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardAvatar: {
    width: 26,
    height: 26,
  },
  headerBars: {
    flex: 1,
    gap: 3,
  },
  bar: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  bodyBar: {
    height: 6,
    marginBottom: 6,
  },
  miniFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  replyRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  replyBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  replyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 1,
  },
});
