import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { VIDEO_CAT_ACCENT, type Video } from '../../../services/api';

interface Props {
  video: Video;
  onPress: (video: Video) => void;
}

function VideoGridCardImpl({ video, onPress }: Props) {
  const accent = VIDEO_CAT_ACCENT[video.cat] || VIDEO_CAT_ACCENT.all;
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
            <Ionicons name="play" size={14} color="#FFFFFF" />
          </View>
        </View>

        {video.duration ? (
          <View style={styles.duration}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={[styles.catChip, { backgroundColor: accent.bg }]}>
          <Text style={[styles.catChipText, { color: accent.text }]} numberOfLines={1}>
            {video.catLabel}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={10} color="#8A8A8A" />
          <Text style={styles.time}>{video.timeAgo}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const VideoGridCard = React.memo(VideoGridCardImpl);
export default VideoGridCard;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  pressed: { opacity: 0.75 },
  thumb: {
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  img: { width: '100%', height: '100%' },
  emoji: { fontSize: 42 },
  playWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
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
  durationText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  body: { padding: 10, gap: 6 },
  catChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  title: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', lineHeight: 17 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { fontSize: 10, color: '#8A8A8A' },
});
