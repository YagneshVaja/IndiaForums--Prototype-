import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { ComponentProps } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors, ThemeMode } from '../../../theme/tokens';

// Soft horizontal wash sitting behind the orb row. Pattern borrowed from
// Paytm / PhonePe / Tata Neu quick-action strips — a subtle warm-to-cool
// sweep grounds the icons without competing with their saturated colors.
// Dark stops are deeper than card (#1C1D22) and lighter than bg (#0E0F12)
// so the strip reads as its own zone — same warm→cool feel as light mode.
const STRIP_GRADIENT: Record<ThemeMode, readonly [string, string, string]> = {
  light: ['#FFF1E8', '#FFE2D8', '#ECE4FF'],
  dark:  ['#2B1F2E', '#1F1B28', '#1B2230'],
};

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Category = {
  id: number;
  label: string;
  icon: MciName;
  size: number;
  gradient: readonly [string, string, string];
  shadowColor: string;
};

const CATEGORIES: readonly Category[] = [
  // Saffron-to-cherry — Filmfare glamour
  { id: 1, label: 'Celebrities',  icon: 'star-face',              size: 30, gradient: ['#FFE259', '#FFA751', '#E1306C'], shadowColor: '#FF8008' },
  // Crimson cinema
  { id: 2, label: 'Movies',       icon: 'movie-open',             size: 26, gradient: ['#FF6A88', '#FF416C', '#921C30'], shadowColor: '#FF416C' },
  // Royal streaming blue
  { id: 3, label: 'Videos',       icon: 'play-circle',            size: 30, gradient: ['#56CCF2', '#2F80ED', '#1E3C72'], shadowColor: '#2F80ED' },
  // Jewel emerald
  { id: 4, label: 'Galleries',    icon: 'image-multiple',         size: 26, gradient: ['#43E97B', '#11998E', '#0B5345'], shadowColor: '#11998E' },
  // Literary royal purple
  { id: 5, label: 'Fan Fictions', icon: 'book-open-page-variant', size: 26, gradient: ['#D38CFF', '#8E2DE2', '#3B0764'], shadowColor: '#8E2DE2' },
  // Tangerine sunshine — distinct from celebrities (orange-red, not gold)
  { id: 6, label: 'Quizzes',      icon: 'head-question',          size: 28, gradient: ['#FFB75E', '#F37335', '#B33C00'], shadowColor: '#F37335' },
  // Hot magenta — Reels signature
  { id: 7, label: 'Shorts',       icon: 'lightning-bolt',         size: 28, gradient: ['#FF6FD8', '#DD2476', '#7E0E4A'], shadowColor: '#DD2476' },
  // Editorial teal
  { id: 8, label: 'Web Stories',  icon: 'newspaper-variant',      size: 26, gradient: ['#43E2F5', '#00B4DB', '#003B5E'], shadowColor: '#00B4DB' },
];

interface Props {
  onItemPress?: (category: Category) => void;
}

type Nav = NativeStackNavigationProp<HomeStackParamList>;

const AnimatedView = Animated.createAnimatedComponent(View);

interface OrbProps {
  category: Category;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
}

function CategoryOrb({ category: c, styles, onPress }: OrbProps) {
  // Reanimated spring on press — gives the orb a tactile, slightly bouncy
  // "squish" instead of a flat CSS scale. This is what makes Cred/Paytm
  // category buttons feel premium.
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 14, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 280 });
      }}
      onPress={onPress}
      style={styles.item}
    >
      <AnimatedView style={[styles.shadowWrap, { shadowColor: c.shadowColor }, animatedStyle]}>
        <View style={styles.circleClip}>
          <LinearGradient
            colors={[c.gradient[0], c.gradient[1], c.gradient[2]]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <LinearGradient
            colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
            locations={[0, 0.35, 0.65]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.22)']}
            start={{ x: 0.5, y: 0.55 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={styles.sparkleLg} pointerEvents="none" />
          <View style={styles.sparkleSm} pointerEvents="none" />

          <View style={styles.innerRim} pointerEvents="none" />

          <View style={styles.iconChip}>
            <MaterialCommunityIcons
              name={c.icon}
              size={c.size}
              color="#FFFFFF"
              style={styles.iconShadow}
            />
          </View>
        </View>
      </AnimatedView>
      <Text style={styles.label} numberOfLines={1}>{c.label}</Text>
    </Pressable>
  );
}

export default function StoriesStrip({ onItemPress }: Props) {
  const navigation = useNavigation<Nav>();
  const mode = useThemeStore((s) => s.mode);
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const stripGradient = STRIP_GRADIENT[mode];

  const handlePress = (c: Category) => {
    if (c.label === 'Celebrities') {
      navigation.navigate('Celebrities');
      return;
    }
    if (c.label === 'Movies') {
      navigation.navigate('Movies');
      return;
    }
    if (c.label === 'Videos') {
      navigation.navigate('Videos');
      return;
    }
    if (c.label === 'Galleries') {
      navigation.navigate('Galleries');
      return;
    }
    if (c.label === 'Fan Fictions') {
      navigation.navigate('FanFiction');
      return;
    }
    if (c.label === 'Shorts') {
      navigation.navigate('Shorts');
      return;
    }
    if (c.label === 'Quizzes') {
      navigation.navigate('Quizzes');
      return;
    }
    if (c.label === 'Web Stories') {
      navigation.navigate('WebStories');
      return;
    }
    onItemPress?.(c);
  };

  return (
    <View style={styles.stripWrap}>
      <LinearGradient
        colors={[stripGradient[0], stripGradient[1], stripGradient[2]]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.strip}
      >
        {CATEGORIES.map((c) => (
          <CategoryOrb
            key={c.id}
            category={c}
            styles={styles}
            onPress={() => handlePress(c)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    stripWrap: {
      backgroundColor: c.card,
    },
    strip: {
      backgroundColor: 'transparent',
    },
    row: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 14,
      gap: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    item: {
      width: 80,
      alignItems: 'center',
      gap: 7,
    },
    shadowWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      shadowOpacity: 0.5,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 7 },
      elevation: 7,
    },
    circleClip: {
      width: 72,
      height: 72,
      borderRadius: 36,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    innerRim: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 36,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    sparkleLg: {
      position: 'absolute',
      top: 12,
      right: 14,
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    sparkleSm: {
      position: 'absolute',
      top: 20,
      right: 9,
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: 'rgba(255,255,255,0.7)',
    },
    iconChip: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconShadow: {
      textShadowColor: 'rgba(0,0,0,0.25)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      textAlign: 'center',
      maxWidth: 80,
      letterSpacing: 0.1,
    },
  });
}
