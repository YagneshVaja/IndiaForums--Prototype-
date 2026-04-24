import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image as RNImage,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { Short } from '../../../services/api';
import SwipeHint from './SwipeHint';

interface Props {
  short: Short;
  isActive: boolean;
  onAdvance: () => void;
  onActivate: (short: Short) => void;
  index: number;
  totalCount: number;
  showHint: boolean;
  height: number;
  topOffset: number;
}

const FALLBACK_GRADIENTS: readonly [string, string][] = [
  ['#7c3aed', '#ec4899'],
  ['#0ea5e9', '#6366f1'],
  ['#10b981', '#0ea5e9'],
  ['#f59e0b', '#ef4444'],
];

function pickFallback(id: number): readonly [string, string] {
  return FALLBACK_GRADIENTS[id % FALLBACK_GRADIENTS.length];
}

export default function ShortCard({
  short,
  isActive,
  onAdvance,
  onActivate,
  index,
  totalCount,
  showHint,
  height,
  topOffset,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(
    () => buildTheme(colors, height, topOffset),
    [colors, height, topOffset],
  );

  const [imageFailed, setImageFailed] = useState(false);
  const [flashIcon, setFlashIcon] = useState<'pause' | 'play' | null>(null);
  // Natural aspect of the thumbnail, fetched via RN's static getSize so the
  // media region can be sized to hug the image exactly (no whitespace below,
  // no crop). `null` until known — we use a sensible default in that case.
  const [imageAspect, setImageAspect] = useState<number | null>(null);

  useEffect(() => {
    if (!short.thumbnail) return;
    let cancelled = false;
    RNImage.getSize(
      short.thumbnail,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setImageAspect(w / h);
      },
      () => {
        if (!cancelled) setImageAspect(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [short.thumbnail]);

  const isPausedRef = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  // Cached progress value (0..1) — updated on pause so resume knows where
  // to continue from. Single animation drives the bar smoothly at 60fps.
  const currentValueRef = useRef(0);
  const DURATION = 6000;

  // Keep currentValueRef in sync while the animation runs so pause captures
  // the exact moment it was stopped.
  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      currentValueRef.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  // Auto-advance — one smooth Animated.timing across DURATION on active card.
  useEffect(() => {
    animRef.current?.stop();
    animRef.current = null;
    isPausedRef.current = false;

    if (!isActive) {
      progress.setValue(0);
      currentValueRef.current = 0;
      return;
    }

    progress.setValue(0);
    currentValueRef.current = 0;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) onAdvance();
    });

    return () => {
      animRef.current?.stop();
      animRef.current = null;
    };
  }, [isActive, onAdvance, progress]);

  function runFlash(kind: 'pause' | 'play') {
    setFlashIcon(kind);
    flash.setValue(1);
    Animated.sequence([
      Animated.timing(flash, {
        toValue: 1,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(flash, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => setFlashIcon(null));
  }

  function handleTap() {
    if (!isActive) return;

    if (isPausedRef.current) {
      // Resume — animate from the cached value to 1 over the remaining time.
      isPausedRef.current = false;
      const remaining = DURATION * (1 - currentValueRef.current);
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: Math.max(0, remaining),
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animRef.current = anim;
      anim.start(({ finished }) => {
        if (finished) onAdvance();
      });
      runFlash('play');
    } else {
      // Pause — stop the running animation and cache the stopped value.
      isPausedRef.current = true;
      progress.stopAnimation((value) => {
        currentValueRef.current = value;
      });
      animRef.current = null;
      runFlash('pause');
    }
  }

  function handleCTA() {
    if (!short.pageUrl) return;
    onActivate(short);
  }

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const fallback = pickFallback(short.id);
  const showImage = !!short.thumbnail && !imageFailed;

  return (
    <Pressable
      style={styles.card}
      onPress={handleTap}
      accessibilityRole="button"
      accessibilityLabel={`${short.title}. Tap to pause or resume.`}
    >
      {/* Flex column layout: [spacer][progress-strip][media][content] */}
      <View style={styles.topSpacer} />

      <View style={styles.progressStrip}>
        <View style={styles.progressTrack} pointerEvents="none">
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>

      <View
        style={[
          styles.mediaArea,
          imageAspect ? { aspectRatio: imageAspect } : styles.mediaAreaDefault,
        ]}
      >
        {showImage ? (
          <ExpoImage
            source={{ uri: short.thumbnail! }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            onError={() => setImageFailed(true)}
            transition={200}
          />
        ) : (
          <LinearGradient
            colors={fallback}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>

      {/* Content — stacks directly under the image, order matches the web layout */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.metaRow}>
          <Text style={styles.date}>{short.publishedAt}</Text>
          {totalCount > 0 ? (
            <Text style={styles.counter}>
              {index + 1} / {totalCount}
            </Text>
          ) : null}
        </View>

        <Text style={styles.title}>{short.title}</Text>

        {short.description ? (
          <Text style={styles.desc}>{short.description}</Text>
        ) : null}

        <Pressable
          onPress={handleCTA}
          accessibilityRole="button"
          accessibilityLabel={short.isYouTube ? 'Watch on YouTube' : 'Read full story'}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaLabel}>
            {short.isYouTube ? '▶  Watch on YouTube' : 'Read Full Story  →'}
          </Text>
        </Pressable>
      </View>

      {/* Absolute chrome — credit pill, flash icon */}
      {short.credits ? (
        <View style={styles.creditPill} pointerEvents="none">
          <Text style={styles.creditText}>{short.credits}</Text>
        </View>
      ) : null}

      {flashIcon ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flashWrap,
            {
              opacity: flash,
              transform: [
                {
                  scale: flash.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0.9, 1.15, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.flashCircle}>
            <Ionicons
              name={flashIcon === 'pause' ? 'pause' : 'play'}
              size={22}
              color="#FFFFFF"
            />
          </View>
        </Animated.View>
      ) : null}

      {showHint ? <SwipeHint /> : null}
    </Pressable>
  );
}

function buildTheme(c: ThemeColors, height: number, topOffset: number) {
  const isDark = c.bg === '#0E0F12';

  return StyleSheet.create({
    card: {
      height,
      width: '100%',
      backgroundColor: c.bg,
      position: 'relative',
      overflow: 'hidden',
      flexDirection: 'column',
    },
    topSpacer: {
      height: topOffset,
    },
    // Media region hugs the image's natural aspect — no whitespace below
    // landscape images, no letterbox bars. `aspectRatio` is applied inline
    // once RNImage.getSize() resolves the thumbnail's true dimensions.
    // `maxHeight` caps very tall portraits so content stays on-screen.
    mediaArea: {
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      maxHeight: Math.round((height - topOffset) * 0.6),
    },
    // Fallback slot used while the image dimensions are being fetched — a
    // reasonable 16:9 landscape so the layout doesn't jump around when the
    // aspect resolves.
    mediaAreaDefault: {
      aspectRatio: 16 / 9,
    },
    // Edge-to-edge strip hosting the progress track. No horizontal padding
    // so the bar spans the full card width, sits above the image.
    progressStrip: {
      height: 3,
      backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    },
    progressTrack: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: c.primary,
    },
    creditPill: {
      position: 'absolute',
      top: topOffset + 10,
      left: 14,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 9999,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      zIndex: 5,
    },
    creditText: {
      fontSize: 9,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.92)',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    flashWrap: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -22,
      marginTop: -22,
      zIndex: 6,
    },
    flashCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 18,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    date: {
      color: c.textTertiary,
      fontSize: 11.5,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    counter: {
      color: c.textTertiary,
      fontSize: 10.5,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    title: {
      color: c.text,
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 24,
      marginBottom: 8,
      letterSpacing: 0.1,
    },
    desc: {
      color: c.textSecondary,
      fontSize: 13.5,
      lineHeight: 20,
      marginBottom: 14,
    },
    cta: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 13,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.primary,
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    ctaPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    ctaLabel: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.3,
      textAlign: 'center',
    },
  });
}
