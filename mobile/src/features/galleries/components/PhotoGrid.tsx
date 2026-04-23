import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import type { GalleryPhoto } from '../../../services/api';
import PhotoCell from './PhotoCell';

const GAP = 4;
const H_PAD = 6;

interface Props {
  photos: GalleryPhoto[];
  onPhotoPress: (index: number) => void;
}

export default function PhotoGrid({ photos, onPhotoPress }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  // 3 equal columns, 2 column-gaps, horizontal padding on each side
  const cellSize = Math.floor((screenWidth - H_PAD * 2 - GAP * 2) / 3);
  const featuredSize = cellSize * 2 + GAP;

  if (photos.length === 0) return null;

  const featured = photos[0];
  const rightPair = photos.slice(1, 3);
  const rest = photos.slice(3);

  return (
    <View style={[styles.grid, { paddingHorizontal: H_PAD, paddingBottom: H_PAD }]}>
      {/* Top row — featured 2×2 left, two 1×1 stacked right */}
      <View style={[styles.topRow, { gap: GAP }]}>
        <View style={{ width: featuredSize, height: featuredSize }}>
          <PhotoCell photo={featured} index={0} isFeatured onPress={onPhotoPress} />
        </View>
        <View style={[styles.rightCol, { width: cellSize, gap: GAP }]}>
          {rightPair.map((p, i) => (
            <View key={String(p.id)} style={{ width: cellSize, height: cellSize }}>
              <PhotoCell photo={p} index={i + 1} isFeatured={false} onPress={onPhotoPress} />
            </View>
          ))}
        </View>
      </View>

      {/* Remaining photos — explicit pixel widths so exactly 3 fit per row */}
      {rest.length > 0 && (
        <View style={[styles.restWrap, { gap: GAP }]}>
          {rest.map((p, i) => (
            <View key={String(p.id)} style={{ width: cellSize, height: cellSize }}>
              <PhotoCell photo={p} index={i + 3} isFeatured={false} onPress={onPhotoPress} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: GAP },
  topRow: { flexDirection: 'row' },
  rightCol: { flexDirection: 'column' },
  restWrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
