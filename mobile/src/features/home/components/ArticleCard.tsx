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

function ArticleCardImpl({ article, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(article)}
      accessibilityRole="button"
      accessibilityLabel={article.title}
    >
      {/* Thumbnail — LEFT side, matches prototype */}
      <View style={styles.thumb}>
        {article.thumbnailUrl ? (
          <Image
            source={{ uri: article.thumbnailUrl }}
            style={styles.thumbImg}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[styles.thumbImg, styles.thumbFallback]}>
            <Text style={styles.thumbEmoji}>{article.emoji ?? '📰'}</Text>
          </View>
        )}
        {article.tag ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{article.tag}</Text>
          </View>
        ) : null}
      </View>

      {/* Body — RIGHT side */}
      <View style={styles.body}>
        <View style={styles.catRow}>
          <Text style={styles.cat}>{article.category ?? ''}</Text>
          {article.breaking ? (
            <View style={styles.breakingBadge}>
              <Text style={styles.breaking}>BREAKING</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
        <View style={styles.timeRow}>
          {/* Clock icon (inline SVG via border trick) */}
          <View style={styles.clockIcon}>
            <View style={styles.clockOuter} />
            <View style={styles.clockHand} />
          </View>
          <Text style={styles.time}>{article.timeAgo ?? ''}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const ArticleCard = React.memo(ArticleCardImpl);
export default ArticleCard;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      marginBottom: 2,
      backgroundColor: 'transparent',
    },
    cardPressed: {
      backgroundColor: c.primarySoft,
    },
    thumb: {
      width: 84,
      height: 76,
      borderRadius: 12,
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
      backgroundColor: c.surface,
    },
    thumbImg: {
      width: '100%',
      height: '100%',
    },
    thumbFallback: {
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbEmoji: {
      fontSize: 28,
    },
    badge: {
      position: 'absolute',
      top: 5,
      left: 5,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: 7.5,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    cat: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    breakingBadge: {
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    breaking: {
      fontSize: 8.5,
      fontWeight: '800',
      color: c.danger,
    },
    title: {
      fontSize: 13.5,
      fontWeight: '700',
      color: c.text,
      lineHeight: 19,
      letterSpacing: -0.2,
      marginBottom: 5,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clockIcon: {
      width: 12,
      height: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clockOuter: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.2,
      borderColor: c.textTertiary,
    },
    clockHand: {
      position: 'absolute',
      width: 1.2,
      height: 3.5,
      backgroundColor: c.textTertiary,
      top: 2,
      left: 5,
      borderRadius: 1,
    },
    time: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '500',
    },
  });
}
