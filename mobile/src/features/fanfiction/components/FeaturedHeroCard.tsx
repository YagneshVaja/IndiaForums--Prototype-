import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { FanFiction } from '../../../services/api';

interface Props {
  story: FanFiction;
  rank?: number;
  rankLabel: string;
  width?: number;
  onPress: (s: FanFiction) => void;
}

export default function FeaturedHeroCard({ story, rank = 1, rankLabel, width, onPress }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!story.thumbnail && !imgFailed;
  const isCompleted = story.statusRaw === 1;

  return (
    <Pressable
      onPress={() => onPress(story)}
      style={({ pressed }) => [
        styles.hero,
        { backgroundColor: story.bg },
        width != null && { width },
        pressed && styles.pressed,
      ]}
    >
      {showImg ? (
        <Image
          source={{ uri: story.thumbnail! }}
          style={styles.img}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Text style={styles.emoji}>📖</Text>
      )}
      <View style={styles.overlay} />

      {/* Top-right: rating + status */}
      <View style={styles.topRight}>
        {story.rating ? (
          <View style={styles.ratingPill}>
            <Text style={styles.ratingText}>{story.rating}</Text>
          </View>
        ) : null}
        <View
          style={[
            styles.statusPill,
            isCompleted ? styles.statusComplete : styles.statusOngoing,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isCompleted ? styles.dotComplete : styles.dotOngoing,
            ]}
          />
          <Text style={styles.statusText}>{story.status}</Text>
        </View>
      </View>

      {/* Top-left: featured badge */}
      <View style={styles.featuredBadge}>
        <Text style={styles.featuredBadgeText}>✦ Featured</Text>
      </View>

      {/* Bottom content */}
      <View style={styles.content}>
        <View style={styles.rankRow}>
          <Text style={styles.rankNum}>#{rank}</Text>
          <Text style={styles.rankLabel}>{rankLabel.toUpperCase()}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {story.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.author}>by {story.author}</Text>
          <Text style={styles.dot}>·</Text>
          <View style={styles.metaItem}>
            <Ionicons name="eye-outline" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={styles.metaText}>{story.views}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="heart-outline" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={styles.metaText}>{story.likes}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="book-outline" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={styles.metaText}>{story.chapterCount}</Text>
          </View>
        </View>

        <View style={styles.readBtn}>
          <Text style={styles.readBtnText}>Read story</Text>
          <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.94 },
  img: { position: 'absolute', width: '100%', height: '100%' },
  emoji: { fontSize: 72 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  topRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'flex-end',
    gap: 6,
  },
  ratingPill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusOngoing: { backgroundColor: 'rgba(59, 130, 246, 0.85)' },
  statusComplete: { backgroundColor: 'rgba(16, 185, 129, 0.85)' },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOngoing: { backgroundColor: '#FFFFFF' },
  dotComplete: { backgroundColor: '#FFFFFF' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  content: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  rankNum: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  rankLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 23,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  author: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.95)' },
  dot: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  metaText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 9,
    borderRadius: 10,
  },
  readBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
});
