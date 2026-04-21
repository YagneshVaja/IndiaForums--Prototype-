import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { GalleryPhoto } from '../../../services/api';
import PhotoCell from './PhotoCell';

interface Props {
  photos: GalleryPhoto[];
  onPhotoPress: (index: number) => void;
}

export default function PhotoGrid({ photos, onPhotoPress }: Props) {
  if (photos.length === 0) return null;

  const featured = photos[0];
  const rightPair = photos.slice(1, 3);
  const rest = photos.slice(3);

  return (
    <View style={styles.grid}>
      <View style={styles.topRow}>
        <View style={styles.featuredWrap}>
          <PhotoCell
            photo={featured}
            index={0}
            isFeatured={true}
            onPress={onPhotoPress}
          />
        </View>
        <View style={styles.rightCol}>
          {rightPair.map((p, i) => (
            <View key={String(p.id)} style={styles.smallWrap}>
              <PhotoCell
                photo={p}
                index={i + 1}
                isFeatured={false}
                onPress={onPhotoPress}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.restGrid}>
        {rest.map((p, i) => (
          <View key={String(p.id)} style={styles.restCell}>
            <PhotoCell
              photo={p}
              index={i + 3}
              isFeatured={false}
              onPress={onPhotoPress}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 6,
    paddingBottom: 6,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    gap: 4,
  },
  featuredWrap: {
    flex: 2,
    aspectRatio: 1,
  },
  rightCol: {
    flex: 1,
    gap: 4,
  },
  smallWrap: {
    flex: 1,
  },
  restGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  restCell: {
    width: '32.6%',
    aspectRatio: 1,
  },
});
