import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingSlide as SlideType } from '../types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  slide: SlideType;
}

const SLIDE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  '1': 'people',
  '2': 'chatbubbles',
  '3': 'newspaper',
};

export function OnboardingSlide({ slide }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const iconName = SLIDE_ICONS[slide.id] ?? 'star';

  return (
    <View style={[styles.container, { width: SCREEN_WIDTH }]}>
      {/* Illustration card */}
      <View style={[styles.illustrationCard, { backgroundColor: slide.accentColor }]}>
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circleLg, { backgroundColor: `${slide.accentColor}CC` }]} />
        <View style={[styles.circle, styles.circleSm, { backgroundColor: `${slide.accentColor}99` }]} />

        <View style={styles.iconWrapper}>
          <Text style={styles.emoji}>{slide.emoji}</Text>
        </View>

        {/* Mini content cards for visual richness */}
        <View style={styles.miniCardsRow}>
          <View style={styles.miniCard}>
            <Ionicons name={iconName} size={13} color={colors.primary} />
            <View style={styles.miniCardBar} />
            <View style={[styles.miniCardBar, { width: '60%' }]} />
          </View>
          <View style={[styles.miniCard, styles.miniCardTall]}>
            <Ionicons name="heart" size={13} color="#E53935" />
            <View style={styles.miniCardBar} />
          </View>
        </View>
      </View>

      {/* Text area */}
      <View style={styles.textArea}>
        <Text style={styles.slideNumber}>0{slide.id}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>
    </View>
  );
}

const CARD_SIZE = SCREEN_WIDTH * 0.74;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 28,
    },
    illustrationCard: {
      width: CARD_SIZE,
      height: CARD_SIZE,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
      overflow: 'hidden',
      position: 'relative',
    },
    circle: {
      position: 'absolute',
      borderRadius: 999,
    },
    circleLg: {
      width: CARD_SIZE * 0.7,
      height: CARD_SIZE * 0.7,
      top: -CARD_SIZE * 0.15,
      right: -CARD_SIZE * 0.15,
    },
    circleSm: {
      width: CARD_SIZE * 0.4,
      height: CARD_SIZE * 0.4,
      bottom: -CARD_SIZE * 0.1,
      left: -CARD_SIZE * 0.1,
    },
    iconWrapper: {
      width: 110,
      height: 110,
      borderRadius: 30,
      backgroundColor: 'rgba(255,255,255,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    emoji: {
      fontSize: 64,
    },
    miniCardsRow: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-end',
    },
    miniCard: {
      backgroundColor: 'rgba(255,255,255,0.85)',
      borderRadius: 10,
      padding: 10,
      width: 68,
      gap: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    miniCardTall: {
      height: 72,
    },
    miniCardBar: {
      height: 6,
      borderRadius: 3,
      backgroundColor: '#E8E8E8',
      width: '100%',
    },
    textArea: {
      alignItems: 'flex-start',
      width: '100%',
      gap: 10,
    },
    slideNumber: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 1,
      opacity: 0.7,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: c.text,
      lineHeight: 38,
      letterSpacing: -0.6,
    },
    description: {
      fontSize: 15,
      fontWeight: '400',
      color: c.textSecondary,
      lineHeight: 23,
    },
  });
}
