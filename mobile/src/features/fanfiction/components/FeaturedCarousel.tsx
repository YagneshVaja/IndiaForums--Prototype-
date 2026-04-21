import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import type { FanFiction } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import FeaturedHeroCard from './FeaturedHeroCard';

interface Props {
  stories: FanFiction[];
  rankLabel: string;
  onPress: (s: FanFiction) => void;
}

const H_PADDING = 12;
const CARD_GAP = 10;
const PEEK = 24;

export default function FeaturedCarousel({ stories, rankLabel, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - H_PADDING * 2 - PEEK;
  const snapInterval = cardWidth + CARD_GAP;

  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / snapInterval);
    if (idx !== activeIdx && idx >= 0 && idx < stories.length) {
      setActiveIdx(idx);
    }
  };

  return (
    <View style={styles.section}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: H_PADDING }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {stories.map((s, i) => (
          <View
            key={s.id}
            style={[styles.cardWrap, { width: cardWidth, marginRight: i === stories.length - 1 ? 0 : CARD_GAP }]}
          >
            <FeaturedHeroCard
              story={s}
              rank={i + 1}
              rankLabel={rankLabel}
              width={cardWidth}
              onPress={onPress}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {stories.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIdx && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: { paddingTop: 14 },
    scrollContent: { alignItems: 'center' },
    cardWrap: {},
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 5,
      paddingTop: 10,
      paddingBottom: 4,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.border,
    },
    dotActive: {
      width: 22,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.primary,
    },
  });
}
