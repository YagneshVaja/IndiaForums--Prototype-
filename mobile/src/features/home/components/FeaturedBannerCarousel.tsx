import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  ViewToken,
} from 'react-native';
import type { Banner } from '../../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;
const CARD_HEIGHT = 220;

interface Props {
  banners: Banner[];
  onPress: (banner: Banner) => void;
}

function BannerItem({
  banner,
  onPress,
}: {
  banner: Banner;
  onPress: (b: Banner) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.itemContainer, pressed && styles.itemPressed]}
      onPress={() => onPress(banner)}
      accessibilityRole="button"
      accessibilityLabel={banner.title}
    >
      {banner.imageUrl ? (
        <Image
          source={{ uri: banner.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder} />
      )}

      {/* Category badge — top left */}
      {banner.category ? (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{banner.category.toUpperCase()}</Text>
        </View>
      ) : null}

      {/* Bottom gradient overlay */}
      <View style={styles.overlay}>
        <Text style={styles.title} numberOfLines={2}>
          {banner.title}
        </Text>
        {banner.source ? (
          <Text style={styles.source} numberOfLines={1}>{banner.source}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function FeaturedBannerCarousel({ banners, onPress }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (
        first?.isViewable &&
        first.index !== null &&
        first.index !== undefined
      ) {
        setActiveIndex(first.index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const keyExtractor = useCallback((item: Banner) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Banner }) => (
      <BannerItem banner={item} onPress={onPress} />
    ),
    [onPress],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<Banner> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  if (banners.length === 0) {
    return <View style={styles.empty} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={banners}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        snapToAlignment="center"
      />

      {/* Pagination dots — inside container, overlapping carousel */}
      {banners.length > 1 && (
        <View style={styles.dotsContainer}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  flatList: {
    height: CARD_HEIGHT,
  },
  flatListContent: {
    paddingHorizontal: CARD_MARGIN,
    gap: 12,
  },
  itemContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  itemPressed: {
    opacity: 0.92,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D0D5E8',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#3558F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 21,
  },
  source: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    gap: 5,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: '#3558F0',
  },
  dotInactive: {
    width: 5,
    backgroundColor: '#C8CFEA',
  },
  empty: {
    height: 8,
  },
});
