import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { FanFiction } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  story: FanFiction;
  onPress: (s: FanFiction) => void;
}

function StoryCard({ story, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!story.thumbnail && !imgFailed;
  const isCompleted = story.statusRaw === 1;

  return (
    <Pressable
      onPress={() => onPress(story)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.cover, { backgroundColor: story.bg }]}>
        {showImg ? (
          <Image
            source={{ uri: story.thumbnail! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Text style={styles.coverEmoji}>📖</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
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
            <Text
              style={[
                styles.statusText,
                isCompleted ? styles.statusTextComplete : styles.statusTextOngoing,
              ]}
            >
              {story.status}
            </Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {story.title}
        </Text>

        {story.synopsis ? (
          <Text style={styles.synopsis} numberOfLines={2}>
            {story.synopsis}
          </Text>
        ) : null}

        {story.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {story.tags.slice(0, 3).map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {t}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.author} numberOfLines={1}>
            {story.author}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <View style={styles.metaStat}>
            <Ionicons name="book-outline" size={10} color={colors.textTertiary} />
            <Text style={styles.metaText}>{story.chapterCount}</Text>
          </View>
          <View style={styles.metaStat}>
            <Ionicons name="eye-outline" size={10} color={colors.textTertiary} />
            <Text style={styles.metaText}>{story.views}</Text>
          </View>
          <View style={styles.metaStat}>
            <Ionicons name="heart-outline" size={10} color={colors.textTertiary} />
            <Text style={styles.metaText}>{story.likes}</Text>
          </View>
          {story.lastUpdated ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaTime}>{story.lastUpdated}</Text>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(StoryCard);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      marginHorizontal: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    pressed: { opacity: 0.9 },
    cover: {
      width: 92,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    coverEmoji: { fontSize: 32 },
    body: {
      flex: 1,
      padding: 10,
      gap: 5,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    ratingPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    ratingText: { fontSize: 9, fontWeight: '800', color: c.textSecondary, letterSpacing: 0.3 },
    statusPill: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 999,
    },
    statusOngoing: { backgroundColor: '#DBEAFE' },
    statusComplete: { backgroundColor: '#D1FAE5' },
    statusText: { fontSize: 9, fontWeight: '700' },
    statusTextOngoing: { color: '#1E40AF' },
    statusTextComplete: { color: '#065F46' },
    title: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
      lineHeight: 17,
    },
    synopsis: {
      fontSize: 11,
      color: c.textSecondary,
      lineHeight: 14,
    },
    tagsRow: {
      flexDirection: 'row',
      gap: 4,
      flexWrap: 'wrap',
    },
    tag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: c.surface,
    },
    tagText: { fontSize: 9, fontWeight: '600', color: c.textSecondary },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flexWrap: 'wrap',
      marginTop: 2,
    },
    author: { fontSize: 10, fontWeight: '700', color: c.primary, maxWidth: 100 },
    metaDot: { color: c.textTertiary, fontSize: 10 },
    metaStat: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    metaText: { fontSize: 10, fontWeight: '600', color: c.textTertiary },
    metaTime: { fontSize: 10, color: c.textTertiary },
  });
}
