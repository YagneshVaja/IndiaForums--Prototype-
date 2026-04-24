import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import type { WebStorySlide } from '../../../services/api';

interface Props {
  slide: WebStorySlide;
  /** Cover image from the summary, used while details/slides are loading */
  fallbackCover?: string;
}

function angleToStartEnd(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  return {
    start: { x: 0.5 - x / 2, y: 0.5 - y / 2 },
    end: { x: 0.5 + x / 2, y: 0.5 + y / 2 },
  };
}

let warnedVideoFallback = false;

export default function SlideRenderer({ slide, fallbackCover }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [slide.id]);

  // expo-av isn't installed, so video slides fall back to their image (if any)
  // and otherwise to the gradient. Warn once so this isn't silent in dev.
  useEffect(() => {
    if (slide.mediaType === 'video' && !warnedVideoFallback) {
      warnedVideoFallback = true;
      console.warn(
        '[webstories] inline video not supported (expo-av missing); falling back to image/gradient',
      );
    }
  }, [slide.mediaType]);

  const candidate =
    slide.mediaType === 'image'
      ? slide.imageUrl
      : slide.mediaType === 'video'
        ? slide.imageUrl || fallbackCover || ''
        : '';
  const showImage = Boolean(candidate) && !imgFailed;

  if (showImage) {
    return (
      <Image
        source={{ uri: candidate }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
        onError={() => setImgFailed(true)}
      />
    );
  }

  if (fallbackCover && slide.mediaType !== 'image') {
    // Loading-state fallback when we have a cover but no slide media yet.
    return (
      <Image
        source={{ uri: fallbackCover }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const { start, end } = angleToStartEnd(slide.bg.angle);
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={slide.bg.colors}
        start={start}
        end={end}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
