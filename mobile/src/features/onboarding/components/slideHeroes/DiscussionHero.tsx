import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LOGO_ICON = require('../../../../../assets/icon.png');

// Real top-discussed shows sourced from indiaforums.com homepage.
const SHOWS = [
  { name: 'Anupamaa',       channel: 'Star Plus', activity: 'Live now',     icon: 'chatbubbles' as const, tint: '#3558F0', isLive: true  },
  { name: 'Bhagya Lakshmi', channel: 'Zee TV',    activity: 'Fan fiction',  icon: 'book'        as const, tint: '#10B981', isLive: false },
  { name: 'Udne Ki Aasha',  channel: 'Star Plus', activity: 'New replies',  icon: 'chatbubble'  as const, tint: '#F59E0B', isLive: false },
];

function LiveDot() {
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
  return <Animated.View style={[styles.liveDot, { opacity }]} />;
}

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
            <Text style={styles.channelName}>{s.channel} · {s.activity}</Text>
          </View>
          {s.isLive ? (
            <View style={styles.liveBadge}>
              <LiveDot />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : (
            <Image source={LOGO_ICON} style={styles.brandIcon} resizeMode="contain" />
          )}
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  brandIcon: {
    width: 28,
    height: 28,
  },
});
