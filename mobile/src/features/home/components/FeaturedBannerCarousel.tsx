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
      style={styles.itemContainer}
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
      {/* Text overlay — dark semi-transparent strip at the bottom */}
      <View style={styles.overlay}>
        <Text style={styles.title} numberOfLines={2}>
          {banner.title}
        </Text>
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
      />
      {/* Pagination dots */}
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
    height: 200,
  },
  itemContainer: {
    width: SCREEN_WIDTH,
    height: 200,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#CCCCCC',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#3558F0',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#C8CFEA',
  },
  empty: {
    height: 8,
  },
});
