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
        {/* Left: content */}
        <View style={styles.content}>
          {article.category ? (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText} numberOfLines={1}>
                {article.category}
              </Text>
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={3}>
            {article.title}
          </Text>
          <View style={styles.metaRow}>
            {article.authorName ? (
              <Text style={styles.author} numberOfLines={1}>
                {article.authorName}
              </Text>
            ) : null}
            {article.authorName && article.timeAgo ? (
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
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    gap: 14,
  },
  containerPressed: {
    backgroundColor: '#F8F9FF',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF1FE',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3558F0',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  author: {
    fontSize: 11,
    color: '#777777',
    fontWeight: '500',
    maxWidth: 100,
  },
  bullet: {
    fontSize: 11,
    color: '#BBBBBB',
  },
  timeAgo: {
    fontSize: 11,
    color: '#AAAAAA',
  },
  thumbnail: {
    width: 90,
    height: 78,
    borderRadius: 10,
    backgroundColor: '#E8E8E8',
  },
  thumbnailPlaceholder: {
    width: 90,
    height: 78,
    borderRadius: 10,
    backgroundColor: '#EBEBEB',
  },
  separator: {
    height: 1,
    backgroundColor: '#F2F2F2',
    marginLeft: 16,
  },
});
