import React, { memo, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { WebStorySummary } from '../../../services/api';

interface Props {
  story: WebStorySummary;
  onPress: (story: WebStorySummary) => void;
}

const FALLBACK_COLORS: [string, string] = ['#3558F0', '#7C3AED'];

function angleToStartEnd(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  return {
    start: { x: 0.5 - x / 2, y: 0.5 - y / 2 },
    end: { x: 0.5 + x / 2, y: 0.5 + y / 2 },
  };
}

function WebStoryHomeTileImpl({ story, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = !!story.coverImage && !imgFailed;
  const fallback = story.coverBg ?? { colors: FALLBACK_COLORS, angle: 160 };
  const { start, end } = angleToStartEnd(fallback.angle);

  return (
    <Pressable
      onPress={() => onPress(story)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Play web story: ${story.title}`}
    >
      <View style={styles.cover}>
        {showImage ? (
          <Image
            source={{ uri: story.coverImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={140}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <LinearGradient
            colors={fallback.colors}
            start={start}
            end={end}
            style={StyleSheet.absoluteFill}
          />
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topScrim}
          pointerEvents="none"
        />

        <View style={styles.dots} pointerEvents="none">
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.78)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomScrim}
          pointerEvents="none"
        />

        <View style={styles.captionWrap} pointerEvents="none">
          <Text style={styles.title} numberOfLines={2}>
            {story.title}
          </Text>
          {story.timeAgo ? (
            <View style={styles.timePill}>
              <Text style={styles.timeText}>{story.timeAgo}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default memo(WebStoryHomeTileImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    tile: {
      width: 118,
      borderRadius: 14,
      backgroundColor: c.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.985 }],
    },
    cover: {
      width: '100%',
      aspectRatio: 9 / 16,
      backgroundColor: '#0B0B0B',
    },
    topScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 60,
    },
    dots: {
      position: 'absolute',
      top: 8,
      left: 8,
      right: 8,
      flexDirection: 'row',
      gap: 3,
    },
    dot: {
      flex: 1,
      maxWidth: 22,
      height: 2.5,
      borderRadius: 1.5,
      backgroundColor: 'rgba(255,255,255,0.65)',
    },
    bottomScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '55%',
    },
    captionWrap: {
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: 8,
      gap: 6,
    },
    title: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.2,
      lineHeight: 15,
      textShadowColor: 'rgba(0,0,0,0.45)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    timePill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    timeText: {
      fontSize: 9.5,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
  });
}
