import React, { memo, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';

import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { Quiz } from '../../../services/api';
import FeaturedQuizCard, { type FeaturedKind } from './FeaturedQuizCard';

export interface FeaturedSlide {
  kind: FeaturedKind;
  quiz: Quiz;
}

interface Props {
  slides: FeaturedSlide[];
  freshnessLabel?: string;     // e.g. "Updated 2m ago"
  onPress: (quiz: Quiz) => void;
  onReroll?: () => void;       // shown on the "surprise" slide when provided
}

const SCREEN_W = Dimensions.get('window').width;
const SIDE_PAD = 12;
const SLIDE_W  = SCREEN_W - SIDE_PAD * 2;

const AUTO_ADVANCE_MS = 5000;
const PAUSE_AFTER_TOUCH_MS = 8000;

function FeaturedCarouselImpl({ slides, freshnessLabel, onPress, onReroll }: Props) {
  const styles = useThemedStyles(makeStyles);
  const listRef = useRef<FlatList<FeaturedSlide>>(null);
  const [index, setIndex] = useState(0);
  const pausedUntilRef = useRef<number>(0);

  // Auto-advance — only if there's more than one slide, paused briefly after touch.
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      const next = (index + 1) % slides.length;
      listRef.current?.scrollToOffset({ offset: next * SLIDE_W, animated: true });
      setIndex(next);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [index, slides.length]);

  if (slides.length === 0) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / SLIDE_W);
    if (i !== index && i >= 0 && i < slides.length) setIndex(i);
  };

  const pauseAuto = () => {
    pausedUntilRef.current = Date.now() + PAUSE_AFTER_TOUCH_MS;
  };

  const activeKind = slides[index]?.kind;

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => `${s.kind}-${s.quiz.id}`}
        renderItem={({ item }) => (
          <View style={{ width: SLIDE_W }}>
            <FeaturedQuizCard quiz={item.quiz} kind={item.kind} onPress={onPress} />
          </View>
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={SLIDE_W}
        decelerationRate="fast"
        onScroll={onScroll}
        onScrollBeginDrag={pauseAuto}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}
      />

      <View style={styles.metaRow}>
        <View style={styles.dotsRow}>
          {slides.map((s, i) => (
            <View
              key={`${s.kind}-${i}`}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.rightCluster}>
          {onReroll && activeKind === 'surprise' ? (
            <Pressable
              onPress={() => {
                pauseAuto();
                onReroll();
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.rerollBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.rerollText}>🎲  Reroll</Text>
            </Pressable>
          ) : null}

          {freshnessLabel ? (
            <View style={styles.freshness}>
              <View style={styles.livePulse} />
              <Text style={styles.freshnessText}>{freshnessLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default memo(FeaturedCarouselImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingTop: 14,
      paddingBottom: 4,
    },
    metaRow: {
      marginTop: 10,
      paddingHorizontal: SIDE_PAD,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.border,
    },
    dotActive: {
      width: 18,
      backgroundColor: c.text,
    },
    rightCluster: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rerollBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    rerollText: {
      fontSize: 11,
      fontWeight: '900',
      color: c.text,
      letterSpacing: 0.2,
    },
    freshness: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    livePulse: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    freshnessText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 0.3,
    },
  });
}
