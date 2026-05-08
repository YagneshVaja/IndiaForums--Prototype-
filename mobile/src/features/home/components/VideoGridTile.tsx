import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { Video } from '../../../services/api';

interface Props {
  video: Video;
  onPress: (video: Video) => void;
}

function VideoGridTileImpl({ video, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const metaParts: string[] = [];
  if (video.views) metaParts.push(`${video.views} views`);
  if (video.timeAgo) metaParts.push(video.timeAgo);
  const meta = metaParts.join(' · ');

  return (
    <Pressable
      onPress={() => onPress(video)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Play video: ${video.title}`}
    >
      <View style={[styles.thumb, { backgroundColor: video.bg }]}>
        {video.thumbnail ? (
          <Image
            source={{ uri: video.thumbnail }}
            style={styles.img}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <Text style={styles.emoji}>{video.emoji}</Text>
        )}

        <View style={styles.scrim} />

        <View style={styles.playWrap}>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={14} color="#FFFFFF" />
          </View>
        </View>

        {video.live ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : null}

        {video.duration ? (
          <View style={styles.duration}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const VideoGridTile = React.memo(VideoGridTileImpl);
export default VideoGridTile;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    tile: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    pressed: { opacity: 0.78 },
    thumb: {
      aspectRatio: 16 / 9,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    img: { width: '100%', height: '100%' },
    emoji: { fontSize: 38 },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.22)',
    },
    playWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 2,
    },
    liveBadge: {
      position: 'absolute',
      top: 6,
      left: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: '#E11D48',
    },
    liveDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: '#FFFFFF',
    },
    liveText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.6,
    },
    duration: {
      position: 'absolute',
      right: 6,
      bottom: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: 'rgba(0,0,0,0.75)',
    },
    durationText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    body: {
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 10,
      gap: 4,
    },
    title: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      lineHeight: 17,
      letterSpacing: -0.1,
    },
    meta: {
      fontSize: 10.5,
      color: c.textTertiary,
      fontWeight: '500',
    },
  });
}
