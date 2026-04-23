import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { Article } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  article: Article;
  onPress: (article: Article) => void;
}

function NewsHeroCardImpl({ article, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(article)}
      accessibilityRole="button"
      accessibilityLabel={article.title}
    >
      <View style={styles.imageWrap}>
        {article.thumbnailUrl ? (
          <Image
            source={{ uri: article.thumbnailUrl }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.fallbackEmoji}>{article.emoji ?? '📰'}</Text>
          </View>
        )}
        <View style={styles.overlay} />
        <View style={styles.badges}>
          {article.breaking ? (
            <View style={styles.breakingBadge}>
              <Text style={styles.breakingText}>BREAKING</Text>
            </View>
          ) : null}
          {article.tag ? (
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{article.tag}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.cat}>{article.category ?? ''}</Text>
        <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.source}>{article.authorName ?? 'IF News Desk'}</Text>
          <Text style={styles.dot}> · </Text>
          <Text style={styles.time}>{article.timeAgo ?? ''}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const NewsHeroCard = React.memo(NewsHeroCardImpl);
export default NewsHeroCard;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 14,
      marginBottom: 2,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardPressed: { opacity: 0.88 },
    imageWrap: {
      width: '100%',
      height: 200,
      position: 'relative',
    },
    image: { width: '100%', height: '100%' },
    imageFallback: {
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackEmoji: { fontSize: 56 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.15)',
    },
    badges: {
      position: 'absolute',
      bottom: 10,
      left: 12,
      flexDirection: 'row',
      gap: 6,
    },
    breakingBadge: {
      backgroundColor: c.danger,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    breakingText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.6,
    },
    tagBadge: {
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    tagText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    body: { padding: 12 },
    cat: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 5,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
      lineHeight: 22,
      letterSpacing: -0.3,
      marginBottom: 8,
    },
    meta: { flexDirection: 'row', alignItems: 'center' },
    source: { fontSize: 11, fontWeight: '600', color: c.textSecondary },
    dot: { fontSize: 11, color: c.textTertiary },
    time: { fontSize: 11, color: c.textTertiary },
  });
}
