import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const HERO_SIZE = 300;

const CHIP_DOT_COLORS = ['#3558F0', '#EC4899', '#10B981'] as const;

function FloatingChip({
  delay,
  dotColor,
  style,
}: {
  delay: number;
  dotColor: string;
  style: object;
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -3,
          duration: 1250,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 1250,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, translateY]);

  return (
    <Animated.View style={[styles.chip, style, { transform: [{ translateY }] }]}>
      <View style={[styles.chipDot, { backgroundColor: dotColor }]} />
      <View style={[styles.bar, { width: 70, height: 5, opacity: 0.6 }]} />
    </Animated.View>
  );
}

export default function NewsHero() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.glowDisc} />

      <FloatingChip delay={0}    dotColor={CHIP_DOT_COLORS[0]} style={{ top: 4,  left: 24 }} />
      <FloatingChip delay={400}  dotColor={CHIP_DOT_COLORS[1]} style={{ top: 28, right: 16 }} />
      <FloatingChip delay={800}  dotColor={CHIP_DOT_COLORS[2]} style={{ top: 56, left: 44 }} />

      <View style={styles.card}>
        <LinearGradient
          colors={['#FFE4B5', '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardImage}
        >
          <Ionicons name="newspaper-outline" size={24} color="#FFFFFF" style={styles.cardImageIcon} />
          <View style={styles.breakingBadge}>
            <Text style={styles.breakingBadgeText}>BREAKING</Text>
          </View>
        </LinearGradient>
        <View style={styles.cardBody}>
          <View style={[styles.bar, { width: '85%', height: 11, backgroundColor: '#1F2937', opacity: 0.85 }]} />
          <View style={[styles.bar, { width: '95%', height: 6, backgroundColor: '#9CA3AF', marginTop: 8 }]} />
          <View style={[styles.bar, { width: '70%', height: 6, backgroundColor: '#9CA3AF', marginTop: 5 }]} />
          <View style={styles.cardFooter}>
            <View style={[styles.dotTiny, { backgroundColor: '#9CA3AF' }]} />
            <View style={[styles.bar, { width: 50, height: 5, backgroundColor: '#9CA3AF', opacity: 0.7 }]} />
            <Ionicons name="heart-outline" size={12} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
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
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  card: {
    width: 270,
    height: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    marginTop: 40,
  },
  cardImage: {
    height: 86,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardImageIcon: {
    opacity: 0.9,
  },
  breakingBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  breakingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardBody: {
    padding: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  bar: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  dotTiny: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  chip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 2,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
});
