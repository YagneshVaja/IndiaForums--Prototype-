import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingSlide as SlideType } from '../types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import CommunityHero from './slideHeroes/CommunityHero';
import DiscussionHero from './slideHeroes/DiscussionHero';
import NewsHero from './slideHeroes/NewsHero';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HEROES: Record<string, React.ComponentType> = {
  '1': CommunityHero,
  '2': DiscussionHero,
  '3': NewsHero,
};

interface Props {
  slide: SlideType;
}

export function OnboardingSlide({ slide }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Hero = HEROES[slide.id];
  // Start fully visible so heroes always render even if animation is
  // interrupted by FlatList virtualisation. Animation just adds a subtle
  // settle from 0.96 -> 1.
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [scale]);

  return (
    <LinearGradient
      colors={slide.gradientStops}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { width: SCREEN_WIDTH }]}
    >
      <Animated.View style={[styles.heroArea, { transform: [{ scale }] }]}>
        {Hero ? <Hero /> : null}
      </Animated.View>

      <View style={styles.textArea}>
        <Text style={[styles.slideNumber, { color: slide.accent }]}>0{slide.id}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>
    </LinearGradient>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
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
