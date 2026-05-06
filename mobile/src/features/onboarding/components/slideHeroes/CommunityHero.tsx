import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LOGO_ICON = require('../../../../../assets/icon.png');

const HERO_SIZE = 320;
const ORBIT_RADIUS = 120;

const ORBIT_AVATARS = [
  { angle:   0, color: '#3558F0', icon: 'person' as const },
  { angle:  60, color: '#EC4899', icon: 'heart'  as const },
  { angle: 120, color: '#10B981', icon: 'person' as const },
  { angle: 180, color: '#F59E0B', icon: 'star'   as const },
  { angle: 240, color: '#8B5CF6', icon: 'person' as const },
  { angle: 300, color: '#06B6D4', icon: 'flame'  as const },
] as const;

function polarToXY(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
  };
}

export default function CommunityHero() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.outerHalo, { transform: [{ scale: pulse }] }]} />
      <View style={styles.innerHalo} />

      {ORBIT_AVATARS.map((a, i) => {
        const { x, y } = polarToXY(a.angle, ORBIT_RADIUS);
        return (
          <View
            key={i}
            style={[
              styles.avatar,
              {
                backgroundColor: '#FFFFFF',
                borderColor: a.color,
                transform: [{ translateX: x }, { translateY: y }],
              },
            ]}
          >
            <Ionicons name={a.icon} size={22} color={a.color} />
          </View>
        );
      })}

      <View style={styles.logoBadge}>
        <Image source={LOGO_ICON} style={styles.logoIcon} resizeMode="contain" />
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
  outerHalo: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(53,88,240,0.10)',
  },
  innerHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(53,88,240,0.18)',
  },
  avatar: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  logoBadge: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3558F0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 22,
    elevation: 10,
  },
  logoIcon: {
    width: 80,
    height: 80,
  },
});
