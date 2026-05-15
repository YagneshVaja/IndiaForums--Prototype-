import React, { memo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { WebStorySummary } from '../../../services/api';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import WebStoryHomeTile from '../../home/components/WebStoryHomeTile';
import RailHeader from './RailHeader';

interface Props {
  stories: WebStorySummary[];
  // Per-story tap: opens the WebStoryPlayer at the matching index. The
  // screen owns the navigation so this component stays presentational.
  onStoryPress?: (story: WebStorySummary) => void;
  onSeeAll?: () => void;
}

// Card width + gap. Used as the snap interval so flicks always rest on a
// card edge — without it the rail can settle mid-card and crop the leading
// tile against the screen edge.
const CARD_WIDTH = 118;
const CARD_GAP = 10;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

function NewsVisualStoriesSectionImpl({ stories, onStoryPress, onSeeAll }: Props) {
  const styles = useThemedStyles(makeStyles);

  if (stories.length === 0) return null;

  return (
    <View style={styles.section}>
      <RailHeader icon="book-outline" title="Visual Stories" onSeeAll={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {stories.map((s) => (
          <WebStoryHomeTile
            key={s.id}
            story={s}
            onPress={() => onStoryPress?.(s)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const NewsVisualStoriesSection = memo(NewsVisualStoriesSectionImpl);
export default NewsVisualStoriesSection;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      paddingVertical: 14,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      marginVertical: 4,
    },
    scroll: { paddingHorizontal: 14, gap: CARD_GAP },
  });
}
