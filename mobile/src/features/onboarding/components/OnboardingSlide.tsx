import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { OnboardingSlide as SlideType } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  slide: SlideType;
}

export function OnboardingSlide({ slide }: Props) {
  return (
    <View style={[styles.container, { width: SCREEN_WIDTH }]}>
      {/* Illustration area */}
      <View
        style={[
          styles.illustrationWrapper,
          { backgroundColor: slide.accentColor },
        ]}
      >
        <Text style={styles.emoji}>{slide.emoji}</Text>
      </View>

      {/* Text area */}
      <View style={styles.textArea}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  illustrationWrapper: {
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 96,
  },
  textArea: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: '#5F5F5F',
    textAlign: 'center',
    lineHeight: 24,
  },
});
