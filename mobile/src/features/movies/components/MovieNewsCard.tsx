import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { Article } from '../../../services/api';
import type { HomeStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

interface Props {
  article: Article;
}

function MovieNewsCardImpl({ article }: Props) {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handlePress = () => {
    navigation.navigate('ArticleDetail', {
      id: article.id,
      thumbnailUrl: article.thumbnailUrl,
      title: article.title,
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={article.title}
    >
      {article.thumbnailUrl ? (
        <Image
          source={{ uri: article.thumbnailUrl }}
          style={styles.thumb}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={styles.thumbFallbackEmoji}>{article.emoji ?? '📰'}</Text>
        </View>
      )}
      <View style={styles.body}>
        {article.category ? (
          <Text style={styles.category} numberOfLines={1}>
            {article.category.toUpperCase()}
            {article.breaking ? <Text style={styles.breaking}>  · Breaking</Text> : null}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={3}>{article.title}</Text>
        {article.timeAgo ? <Text style={styles.time}>{article.timeAgo}</Text> : null}
      </View>
    </Pressable>
  );
}

const MovieNewsCard = React.memo(MovieNewsCardImpl);
export default MovieNewsCard;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    pressed: { opacity: 0.7 },
    thumb: {
      width: 100,
      aspectRatio: 16 / 9,
      borderRadius: 8,
      backgroundColor: c.cardElevated,
    },
    thumbFallback: { alignItems: 'center', justifyContent: 'center' },
    thumbFallbackEmoji: { fontSize: 22 },
    body: { flex: 1, justifyContent: 'space-between' },
    category: {
      fontSize: 10.5,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 0.4,
    },
    breaking: { color: '#E11D48' },
    title: {
      fontSize: 13.5,
      fontWeight: '700',
      color: c.text,
      lineHeight: 18,
      marginTop: 3,
    },
    time: {
      marginTop: 4,
      fontSize: 11,
      color: c.textTertiary,
    },
  });
}
