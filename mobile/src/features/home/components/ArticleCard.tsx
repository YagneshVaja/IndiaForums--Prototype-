import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import type { Article } from '../../../services/api';

interface Props {
  article: Article;
  onPress: (article: Article) => void;
}

export default function ArticleCard({ article, onPress }: Props) {
  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.container,
          pressed && styles.containerPressed,
        ]}
        onPress={() => onPress(article)}
        accessibilityRole="button"
        accessibilityLabel={article.title}
      >
        {/* Left: title + meta */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {article.title}
          </Text>
          <View style={styles.metaRow}>
            {article.category ? (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryText} numberOfLines={1}>
                  {article.category}
                </Text>
              </View>
            ) : null}
            {article.category && article.timeAgo ? (
              <Text style={styles.bullet}>{' \u2022 '}</Text>
            ) : null}
            {article.timeAgo ? (
              <Text style={styles.timeAgo}>{article.timeAgo}</Text>
            ) : null}
          </View>
        </View>
        {/* Right: thumbnail */}
        {article.thumbnailUrl ? (
          <Image
            source={{ uri: article.thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder} />
        )}
      </Pressable>
      <View style={styles.separator} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  containerPressed: {
    opacity: 0.75,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: '#3558F0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bullet: {
    fontSize: 11,
    color: '#999999',
  },
  timeAgo: {
    fontSize: 11,
    color: '#999999',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E8E8E8',
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E8E8E8',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
});
