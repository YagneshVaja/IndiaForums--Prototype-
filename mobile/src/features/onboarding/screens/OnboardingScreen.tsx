import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingSlide } from '../components/OnboardingSlide';
import { PaginationDots } from '../components/PaginationDots';
import { ONBOARDING_SLIDES } from '../data/onboardingSlides';
import { OnboardingStackParamList } from '../../../navigation/types';
import { OnboardingSlide as SlideType } from '../types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSlides'>;

export default function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<SlideType>>(null);
  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  // Must live in a ref — passing an inline function causes a RN crash on Android
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (
        first?.isViewable &&
        first.index !== null &&
        first.index !== undefined
      ) {
        setCurrentIndex(first.index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      navigation.replace('GetStarted');
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }, [currentIndex, isLastSlide, navigation]);

  const handleSkip = useCallback(() => {
    navigation.replace('GetStarted');
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Top row: brand mark + skip */}
      <View style={styles.topRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>IF</Text>
        </View>
        {!isLastSlide && (
          <Pressable style={styles.skipButton} onPress={handleSkip} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Slide carousel */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OnboardingSlide slide={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Bottom bar: dots + next */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <PaginationDots count={ONBOARDING_SLIDES.length} activeIndex={currentIndex} />

        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            isLastSlide && styles.nextButtonWide,
            pressed && styles.nextButtonPressed,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Get Started' : 'Next →'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingBottom: 12,
    },
    brandMark: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandMarkText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    skipButton: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: c.surface,
    },
    skipText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    flatList: {
      flex: 1,
    },
    flatListContent: {
      alignItems: 'center',
    },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 28,
      paddingTop: 20,
    },
    nextButton: {
      backgroundColor: c.primary,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 14,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
    },
    nextButtonWide: {
      paddingHorizontal: 36,
    },
    nextButtonPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
    nextButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.1,
    },
  });
}
