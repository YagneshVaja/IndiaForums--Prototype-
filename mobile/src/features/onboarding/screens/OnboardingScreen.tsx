import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  ViewToken,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingSlide } from '../components/OnboardingSlide';
import { PaginationDots } from '../components/PaginationDots';
import { ONBOARDING_SLIDES } from '../data/onboardingSlides';
import { OnboardingStackParamList } from '../../../navigation/types';
import { OnboardingSlide as SlideType } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
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
    <View style={styles.container}>
      {/* Skip — hidden on the last slide */}
      {!isLastSlide && (
        <Pressable
          style={styles.skipButton}
          onPress={handleSkip}
          hitSlop={12}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

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

      {/* Bottom bar: dots + next/get-started */}
      <View style={styles.bottomBar}>
        <PaginationDots
          count={ONBOARDING_SLIDES.length}
          activeIndex={currentIndex}
        />

        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.nextButtonPressed,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9E9E9E',
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
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 24,
  },
  nextButton: {
    backgroundColor: '#3558F0',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  nextButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
});
