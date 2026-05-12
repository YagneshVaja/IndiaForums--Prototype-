import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 18;
const HIT_HEIGHT = 32;
const TOOLTIP_W = 78;
const TOOLTIP_H = 26;

/**
 * Draggable page scrubber matching the pattern used by Apple Books, Kindle,
 * and modern manga readers. The thumb sits at the current page; users drag
 * to scrub through pages, with a tooltip showing the page they'll land on.
 * Single-tap on the track also jumps. Hidden when there's only one page.
 */
export default function PageScrubber({
  currentPage,
  totalPages,
  onPageChange,
}: Props) {
  const styles = useThemedStyles(makeStyles);

  const [trackWidth, setTrackWidth] = useState(0);
  const [previewPage, setPreviewPage] = useState<number | null>(null);

  const idleX = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragging = useSharedValue(false);
  // Worklet-side cache so we only fire JS callbacks on page boundaries.
  const lastReportedPage = useSharedValue(currentPage);

  // Settle the thumb to currentPage when not dragging.
  useEffect(() => {
    if (totalPages <= 1 || trackWidth === 0) return;
    const ratio = (currentPage - 1) / Math.max(1, totalPages - 1);
    idleX.value = withTiming(ratio * trackWidth, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentPage, totalPages, trackWidth, idleX]);

  const haptic = () => {
    if (Platform.OS === 'web') return;
    Haptics.selectionAsync().catch(() => {});
  };

  const handlePreviewPage = (page: number) => {
    setPreviewPage(page);
    haptic();
  };

  const handleCommit = (page: number) => {
    setPreviewPage(null);
    if (page !== currentPage) onPageChange(page);
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      if (trackWidth === 0) return;
      dragging.value = true;
      const x = Math.min(Math.max(e.x, 0), trackWidth);
      dragX.value = x;
      const page = xToPage(x, trackWidth, totalPages);
      lastReportedPage.value = page;
      runOnJS(handlePreviewPage)(page);
    })
    .onUpdate((e) => {
      if (trackWidth === 0) return;
      const x = Math.min(Math.max(e.x, 0), trackWidth);
      dragX.value = x;
      const page = xToPage(x, trackWidth, totalPages);
      if (page !== lastReportedPage.value) {
        lastReportedPage.value = page;
        runOnJS(handlePreviewPage)(page);
      }
    })
    .onEnd(() => {
      const finalPage = lastReportedPage.value;
      dragging.value = false;
      runOnJS(handleCommit)(finalPage);
    })
    .onFinalize(() => {
      dragging.value = false;
    });

  const tap = Gesture.Tap().onEnd((e) => {
    if (trackWidth === 0) return;
    const x = Math.min(Math.max(e.x, 0), trackWidth);
    const page = xToPage(x, trackWidth, totalPages);
    runOnJS(handleCommit)(page);
  });

  const composed = Gesture.Race(pan, tap);

  const thumbAnim = useAnimatedStyle(() => {
    const x = dragging.value ? dragX.value : idleX.value;
    return {
      transform: [
        { translateX: x - THUMB_SIZE / 2 },
        { scale: dragging.value ? 1.25 : 1 },
      ],
    };
  });

  const fillAnim = useAnimatedStyle(() => {
    const x = dragging.value ? dragX.value : idleX.value;
    return { width: x };
  });

  const tooltipAnim = useAnimatedStyle(() => {
    const x = dragging.value ? dragX.value : idleX.value;
    return {
      opacity: dragging.value ? 1 : 0,
      transform: [
        { translateX: x - TOOLTIP_W / 2 },
        { translateY: dragging.value ? 0 : 4 },
      ],
    };
  });

  if (totalPages <= 1) return null;

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={composed}>
        <View
          style={styles.hit}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillAnim]} />
          </View>
          <Animated.View style={[styles.thumb, thumbAnim]} />
        </View>
      </GestureDetector>

      <Animated.View style={[styles.tooltipPos, tooltipAnim]} pointerEvents="none">
        <View style={styles.tooltipBubble}>
          <Text style={styles.tooltipText}>
            Page {previewPage ?? currentPage}
          </Text>
        </View>
        <View style={styles.tooltipPointer} />
      </Animated.View>
    </View>
  );
}

function xToPage(x: number, trackWidth: number, totalPages: number) {
  'worklet';
  if (trackWidth === 0 || totalPages <= 1) return 1;
  const ratio = Math.min(1, Math.max(0, x / trackWidth));
  return Math.round(ratio * (totalPages - 1)) + 1;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: 14,
      height: HIT_HEIGHT,
      justifyContent: 'center',
    },
    hit: {
      height: HIT_HEIGHT,
      justifyContent: 'center',
    },
    track: {
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: c.border,
      overflow: 'hidden',
    },
    fill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: c.primary,
    },
    thumb: {
      position: 'absolute',
      top: (HIT_HEIGHT - THUMB_SIZE) / 2,
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      backgroundColor: c.primary,
      borderWidth: 2,
      borderColor: c.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.25,
      shadowRadius: 2,
      elevation: 3,
    },
    tooltipPos: {
      position: 'absolute',
      top: -(TOOLTIP_H + 14),
      left: 14, // matches wrap.paddingHorizontal so x maps cleanly
    },
    tooltipBubble: {
      width: TOOLTIP_W,
      height: TOOLTIP_H,
      borderRadius: 8,
      backgroundColor: c.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tooltipText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.card,
      letterSpacing: 0.2,
    },
    tooltipPointer: {
      alignSelf: 'center',
      marginTop: -1,
      width: 0,
      height: 0,
      borderLeftWidth: 5,
      borderRightWidth: 5,
      borderTopWidth: 5,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: c.text,
    },
  });
}
