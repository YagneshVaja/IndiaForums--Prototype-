import React, { useMemo } from 'react';
import { View, Text, Pressable, ImageBackground, StyleSheet } from 'react-native';
import type { Celebrity } from '../../../services/api';
import TrendBadge from './TrendBadge';
import Initials from './Initials';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  celeb: Celebrity;
  onPress: (c: Celebrity) => void;
}

export default function RunnerCard({ celeb, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isSilver = celeb.rank === 2;
  const medal = isSilver ? '🥈' : '🥉';
  const borderColor = isSilver ? '#C0C0C0' : '#CD7F32';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { borderColor }, pressed && styles.cardPressed]}
      onPress={() => onPress(celeb)}
      android_ripple={{ color: 'rgba(53,88,240,0.18)' }}
    >
      <View style={styles.imgWrap}>
        {celeb.thumbnail ? (
          <ImageBackground
            source={{ uri: celeb.thumbnail }}
            style={styles.img}
            imageStyle={styles.imgInner}
            resizeMode="cover"
          >
            <View style={styles.imgScrim} />
          </ImageBackground>
        ) : (
          <View style={[styles.img, styles.fallback]}>
            <Initials name={celeb.name} size={56} />
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{medal} #{celeb.rank}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{celeb.name}</Text>
        {celeb.shortDesc ? (
          <Text style={styles.desc} numberOfLines={2}>{celeb.shortDesc}</Text>
        ) : null}
        <View style={styles.meta}>
          <TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} compact />
          {celeb.prevRank > 0 && (
            <Text style={styles.prev}>was #{celeb.prevRank}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 2,
      backgroundColor: c.card,
      overflow: 'hidden',
    },
    cardPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.97 }],
    },
    imgWrap: {
      width: '100%',
      height: 130,
      backgroundColor: c.surface,
    },
    img:      { width: '100%', height: '100%', justifyContent: 'flex-end' },
    imgInner: {},
    imgScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
    fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary },
    badge: {
      position: 'absolute',
      top: 8,
      left: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.95)',
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: '#1A1A1A' },
    body: { padding: 10, gap: 4 },
    name: { fontSize: 14, fontWeight: '700', color: c.text },
    desc: { fontSize: 11, color: c.textSecondary, lineHeight: 15 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
    prev: { fontSize: 10, color: c.textSecondary },
  });
}
