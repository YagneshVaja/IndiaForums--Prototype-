import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const LOGO_ICON = require('../../../../../assets/icon.png');

const HERO_SIZE = 320;

function PulsingBadge() {
  const pulse = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const badgePulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const dotPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    badgePulse.start();
    dotPulse.start();
    return () => {
      badgePulse.stop();
      dotPulse.stop();
    };
  }, [pulse, dotOpacity]);

  return (
    <Animated.View style={[styles.badge, { transform: [{ scale: pulse }] }]}>
      <Animated.View style={[styles.badgeDot, { opacity: dotOpacity }]} />
      <Text style={styles.badgeText}>BREAKING</Text>
    </Animated.View>
  );
}

export default function NewsHero() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.glowDisc} />

      {/* Main news headline card with newspaper icon + real category labels */}
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headlineCard}
      >
        <Ionicons name="newspaper" size={56} color="#FFFFFF" style={{ opacity: 0.95 }} />
        <View style={styles.categoryRow}>
          <View style={styles.categoryPill}><Text style={styles.categoryPillText}>TV</Text></View>
          <View style={styles.categoryPill}><Text style={styles.categoryPillText}>MOVIES</Text></View>
          <View style={styles.categoryPill}><Text style={styles.categoryPillText}>DIGITAL</Text></View>
        </View>
        <Text style={styles.cardSubtitle}>Updated every hour</Text>
      </LinearGradient>

      {/* Pulsing BREAKING badge */}
      <View style={styles.badgeWrap}>
        <PulsingBadge />
      </View>

      {/* Brand mark anchored bottom-right */}
      <View style={styles.brandMark}>
        <Image source={LOGO_ICON} style={styles.brandIcon} resizeMode="contain" />
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
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.18)',
  },
  headlineCard: {
    width: 220,
    height: 220,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.40,
    shadowRadius: 24,
    elevation: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  categoryPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.4,
    marginTop: 8,
  },
  badgeWrap: {
    position: 'absolute',
    top: 36,
    right: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 1,
  },
  brandMark: {
    position: 'absolute',
    bottom: 24,
    right: 28,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  brandIcon: {
    width: 38,
    height: 38,
  },
});
