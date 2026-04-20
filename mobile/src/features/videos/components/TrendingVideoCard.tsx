import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { VIDEO_CAT_ACCENT, type Video } from '../../../services/api';

interface Props {
  video: Video;
  onPress: (video: Video) => void;
}

function TrendingVideoCardImpl({ video, onPress }: Props) {
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

        <View style={styles.scrim} />

        <View
          style={[
            styles.catChip,
            video.live ? styles.liveChip : { backgroundColor: accent.bar },
          ]}
        >
          {video.live ? <View style={styles.liveDot} /> : null}
          <Text style={styles.catChipText}>{video.catLabel}</Text>
        </View>

        {video.duration || video.live ? (
          <View style={styles.duration}>
            <Text style={styles.durationText}>{video.live ? '● LIVE' : video.duration}</Text>
          </View>
        ) : null}

        {!video.live ? (
          <View style={styles.playWrap}>
            <View style={styles.playBtn}>
              <Ionicons name="play" size={18} color="#FFFFFF" />
            </View>
          </View>
        ) : null}

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={10} color="#FFFFFF" />
            <Text style={styles.meta}>{video.timeAgo}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const TrendingVideoCard = React.memo(TrendingVideoCardImpl);
export default TrendingVideoCard;

const styles = StyleSheet.create({
  card: {
    width: 280,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 12,
  },
  pressed: { opacity: 0.85 },
  thumb: { aspectRatio: 16 / 9, position: 'relative' },
  img: { width: '100%', height: '100%' },
  emoji: {
    fontSize: 60,
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 160,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  catChip: {
    position: 'absolute',
    left: 10,
    top: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveChip: { backgroundColor: '#DC2626' },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  catChipText: { color: '#FFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  duration: {
    position: 'absolute',
    right: 10,
    top: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  durationText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  playWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { color: '#FFFFFF', fontSize: 10, opacity: 0.9 },
});
