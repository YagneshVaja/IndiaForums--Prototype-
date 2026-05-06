import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LOGO_ICON = require('../../../../../assets/icon.png');

const HERO_SIZE = 320;

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(800 - delay),
        ]),
      );
    const a = animate(dot1, 0);
    const b = animate(dot2, 200);
    const c = animate(dot3, 400);
    a.start();
    b.start();
    c.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingRow}>
      <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
      <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
      <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
    </View>
  );
}

export default function DiscussionHero() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.glowDisc} />

      {/* Bubble 1 — bottom left, real show forum thread */}
      <View style={[styles.bubble, styles.bubbleBottomLeft]}>
        <Ionicons name="book" size={20} color="#10B981" />
        <Text style={styles.bubbleLabel}>Bhagya Lakshmi</Text>
      </View>

      {/* Bubble 2 — top right, real show with REPLY badge */}
      <View style={[styles.bubble, styles.bubbleTopRight]}>
        <Ionicons name="chatbubbles" size={18} color="#10B981" />
        <Text style={styles.bubbleLabel}>Udne Ki Aasha</Text>
        <View style={styles.replyBadge}>
          <Text style={styles.replyBadgeText}>REPLY</Text>
        </View>
      </View>

      {/* Bubble 3 — center, brand icon + currently-trending show + typing dots */}
      <View style={[styles.bubble, styles.bubbleCenter]}>
        <Image source={LOGO_ICON} style={styles.bubbleAvatar} resizeMode="contain" />
        <Text style={styles.bubbleCenterLabel}>Anupamaa</Text>
        <TypingDots />
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
    backgroundColor: 'rgba(16,185,129,0.16)',
  },
  bubble: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  bubbleBottomLeft: {
    backgroundColor: '#FFFFFF',
    bottom: 60,
    left: 12,
    borderBottomLeftRadius: 6,
    transform: [{ rotate: '-4deg' }],
  },
  bubbleTopRight: {
    backgroundColor: '#FFFFFF',
    top: 50,
    right: 8,
    borderTopRightRadius: 6,
    transform: [{ rotate: '3deg' }],
  },
  bubbleCenter: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
  },
  bubbleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  bubbleCenterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  replyBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  replyBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.8,
  },
  typingRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
});
