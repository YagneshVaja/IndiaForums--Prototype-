import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import { OnboardingSlide as SlideType } from '../types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import CommunityHero from './slideHeroes/CommunityHero';
import DiscussionHero from './slideHeroes/DiscussionHero';
import NewsHero from './slideHeroes/NewsHero';

const HEROES: Record<string, React.ComponentType> = {
  '1': CommunityHero,
  '2': DiscussionHero,
  '3': NewsHero,
};

interface Props {
  slide: SlideType;
}

export function OnboardingSlide({ slide }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Hero = HEROES[slide.id];
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [scale]);

  // Approximate vertical chrome (top row + bottom bar + safe areas) so each
  // slide fills the FlatList's full height. Explicit pixels — bulletproof
  // against alignItems-center collapse on horizontal FlatLists.
  const slideHeight = screenHeight - 220;

  return (
    <View style={[styles.container, { width: screenWidth, height: slideHeight }]}>
      <Animated.View style={[styles.heroArea, { transform: [{ scale }] }]}>
        {Hero ? <Hero /> : null}
      </Animated.View>

      <View style={styles.textArea}>
        <Text style={[styles.slideNumber, { color: slide.accent }]}>0{slide.id}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 28,
      paddingTop: 16,
      paddingBottom: 24,
    },
    heroArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textArea: {
      alignItems: 'flex-start',
      width: '100%',
      gap: 10,
      paddingTop: 8,
    },
    slideNumber: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      opacity: 0.9,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: c.text,
      lineHeight: 40,
      letterSpacing: -0.6,
    },
    description: {
      fontSize: 15,
      fontWeight: '400',
      color: c.textSecondary,
      lineHeight: 23,
      maxWidth: 320,
    },
  });
}
