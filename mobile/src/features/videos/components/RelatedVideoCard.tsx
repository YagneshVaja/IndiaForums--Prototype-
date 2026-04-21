import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Video } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  video: Video;
  onPress: (video: Video) => void;
}

function RelatedVideoCardImpl({ video, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={() => onPress(video)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
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
        <View style={styles.playWrap}>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={12} color="#FFF" />
          </View>
        </View>
        {video.duration ? (
          <View style={styles.duration}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.cat} numberOfLines={1}>{video.catLabel}</Text>
        <Text style={styles.title} numberOfLines={3}>{video.title}</Text>
        <Text style={styles.time}>{video.timeAgo}</Text>
      </View>
    </Pressable>
  );
}

const RelatedVideoCard = React.memo(RelatedVideoCardImpl);
export default RelatedVideoCard;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    pressed: { opacity: 0.7 },
    thumb: {
      width: 140,
      aspectRatio: 16 / 9,
      borderRadius: 8,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    img: { width: '100%', height: '100%' },
    emoji: { fontSize: 30 },
    playWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playBtn: {
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center', justifyContent: 'center',
    },
    duration: {
      position: 'absolute', right: 5, bottom: 5,
      paddingHorizontal: 5, paddingVertical: 1,
      borderRadius: 3,
      backgroundColor: 'rgba(0,0,0,0.75)',
    },
    durationText: { color: '#FFF', fontSize: 9, fontWeight: '600' },
    body: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
    cat: { fontSize: 10, fontWeight: '700', color: c.primary, letterSpacing: 0.3 },
    title: { fontSize: 13, fontWeight: '600', color: c.text, lineHeight: 17 },
    time: { fontSize: 10, color: c.textTertiary },
  });
}
