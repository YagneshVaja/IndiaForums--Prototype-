import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useThemeStore } from '../../../store/themeStore';
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
  const brand = useThemeStore((s) => s.colors.primary);
  const styles = useMemo(() => makeStyles(brand, height, topOffset), [brand, height, topOffset]);

  const [imageFailed, setImageFailed] = useState(false);
  const [flashIcon, setFlashIcon] = useState<'pause' | 'play' | null>(null);

  const isPausedRef = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance timer — only runs on the active card
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    isPausedRef.current = false;

    if (!isActive) {
      progress.setValue(0);
      return;
    }

    progress.setValue(0);
    const DURATION = 6000;
    const TICK = 100;
    let elapsed = 0;

    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      elapsed += TICK;
      const pct = Math.min(elapsed / DURATION, 1);
      progress.setValue(pct);
      if (pct >= 1) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onAdvance();
      }
    }, TICK);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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
    isPausedRef.current = !isPausedRef.current;
    runFlash(isPausedRef.current ? 'pause' : 'play');
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
      {/* Media */}
      {showImage ? (
        <>
          <ExpoImage
            source={{ uri: short.thumbnail! }}
            style={styles.thumbBg}
            contentFit="cover"
            blurRadius={24}
            transition={200}
          />
          <View style={styles.thumbBgTint} pointerEvents="none" />
          <ExpoImage
            source={{ uri: short.thumbnail! }}
            style={styles.thumb}
            contentFit="contain"
            onError={() => setImageFailed(true)}
            transition={200}
          />
        </>
      ) : (
        <LinearGradient
          colors={fallback}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Gradient scrim */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0)',
          'rgba(0,0,0,0)',
          'rgba(0,0,0,0.18)',
          'rgba(0,0,0,0.60)',
          'rgba(0,0,0,0.92)',
        ]}
        locations={[0, 0.28, 0.45, 0.65, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Progress bar */}
      <View style={styles.progressTrack} pointerEvents="none">
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      {/* Source credit pill */}
      {short.credits ? (
        <View style={styles.creditPill} pointerEvents="none">
          <Text style={styles.creditText}>{short.credits}</Text>
        </View>
      ) : null}

      {/* Flash icon on tap */}
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

      {/* Bottom overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.title} numberOfLines={3}>
          {short.title}
        </Text>

        {short.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {short.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.date}>{short.publishedAt}</Text>
          {totalCount > 0 ? (
            <Text style={styles.counter}>
              {index + 1} / {totalCount}
            </Text>
          ) : null}
        </View>

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

      {/* Swipe hint */}
      {showHint ? <SwipeHint /> : null}
    </Pressable>
  );
}

function makeStyles(brand: string, height: number, topOffset: number) {
  return StyleSheet.create({
    card: {
      height,
      width: '100%',
      backgroundColor: '#0a0a0a',
      position: 'relative',
      overflow: 'hidden',
    },
    thumbBg: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.4,
    },
    thumbBgTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    thumb: {
      ...StyleSheet.absoluteFillObject,
    },
    progressTrack: {
      position: 'absolute',
      top: topOffset + 4,
      left: 14,
      right: 14,
      height: 2.5,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 2,
    },
    creditPill: {
      position: 'absolute',
      top: topOffset + 4 + 10,
      left: 14,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 9999,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    creditText: {
      fontSize: 9,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.88)',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    flashWrap: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -22,
      marginTop: -22,
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
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingBottom: 22,
    },
    title: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      lineHeight: 21,
      marginBottom: 6,
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
      letterSpacing: 0.1,
    },
    desc: {
      color: 'rgba(255,255,255,0.68)',
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 10,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    date: {
      color: 'rgba(255,255,255,0.4)',
      fontSize: 10.5,
    },
    counter: {
      color: 'rgba(255,255,255,0.38)',
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    cta: {
      backgroundColor: brand,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    ctaPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    ctaLabel: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
      textAlign: 'center',
    },
  });
}
