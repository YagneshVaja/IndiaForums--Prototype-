import React, { useMemo } from 'react';
import { View, Text, Pressable, ImageBackground, StyleSheet } from 'react-native';
import type { Celebrity } from '../../../services/api';
import TrendBadge from './TrendBadge';
import Initials from './Initials';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Styles = ReturnType<typeof makeStyles>;

interface Props {
  celeb: Celebrity;
  onPress: (c: Celebrity) => void;
}

export default function HeroCard({ celeb, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const hasImage = !!celeb.thumbnail;
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(celeb)}
      android_ripple={{ color: 'rgba(53,88,240,0.18)' }}
    >
      {hasImage ? (
        <ImageBackground
          source={{ uri: celeb.thumbnail! }}
          style={styles.img}
          imageStyle={styles.imgInner}
          resizeMode="cover"
        >
          <View style={styles.scrim} />
          <Content celeb={celeb} styles={styles} />
        </ImageBackground>
      ) : (
        <View style={[styles.img, styles.fallback]}>
          <Initials name={celeb.name} size={96} />
          <View style={styles.scrim} />
          <Content celeb={celeb} styles={styles} />
        </View>
      )}
    </Pressable>
  );
}

function Content({ celeb, styles }: { celeb: Celebrity; styles: Styles }) {
  return (
    <>
      <View style={styles.top}>
        <View style={styles.crown}>
          <Text style={styles.crownIcon}>👑</Text>
          <Text style={styles.crownText}>#1 This Week</Text>
        </View>
        <TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} />
      </View>
      <View style={styles.bottom}>
        <Text style={styles.name} numberOfLines={2}>{celeb.name}</Text>
        {celeb.shortDesc ? (
          <Text style={styles.desc} numberOfLines={2}>{celeb.shortDesc}</Text>
        ) : null}
        {celeb.prevRank > 0 && (
          <Text style={styles.prev}>was #{celeb.prevRank}</Text>
        )}
      </View>
    </>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 14,
      marginTop: 12,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: c.surface,
    },
    cardPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.98 }],
    },
    img:      { width: '100%', height: 340, justifyContent: 'space-between' },
    imgInner: { borderRadius: 18 },
    fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    top: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
    },
    crown: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.92)',
    },
    crownIcon: { fontSize: 14 },
    crownText: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
    bottom: { padding: 16, gap: 4 },
    name:   { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
    desc:   { fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 18 },
    prev:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  });
}
