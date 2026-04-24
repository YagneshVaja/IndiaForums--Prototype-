import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';

import type { HomeStackParamList } from '../../../navigation/types';
import ErrorState from '../../../components/ui/ErrorState';
import type {
  WebStoryDetail,
  WebStorySlide,
} from '../../../services/api';

import PlayerHeader from '../components/PlayerHeader';
import PlayerProgressBar from '../components/PlayerProgressBar';
import SlideRenderer from '../components/SlideRenderer';
import SlideCaption from '../components/SlideCaption';
import { useWebStoryDetails } from '../hooks/useWebStoryDetails';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'WebStoryPlayer'>;
type Rt = RouteProp<HomeStackParamList, 'WebStoryPlayer'>;

const TICK_MS = 50;

export default function WebStoryPlayerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { stories, index } = route.params;

  const [storyIdx, setStoryIdx] = useState(index);
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const currentSummary = stories[storyIdx];

  const { data, isLoading, isError, refetch } = useWebStoryDetails(
    currentSummary?.id ?? null,
  );

  const story: WebStoryDetail | null = data?.story ?? null;
  const slides: WebStorySlide[] = useMemo(() => data?.slides ?? [], [data]);

  const currentSlide: WebStorySlide | null = slides[slideIdx] ?? null;
  const slideDuration = currentSlide?.durationMs || 5000;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const elapsedRef = useRef(0);
  const lastSlideKeyRef = useRef<string>('');

  // Light status bar on the player; restore on blur.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('auto');
    }, []),
  );

  // Reset slide index whenever the story changes.
  useEffect(() => {
    setSlideIdx(0);
  }, [storyIdx]);

  const goNext = useCallback(() => {
    if (slides.length === 0) {
      // No slides loaded — finishing means moving to the next story or closing.
      if (storyIdx < stories.length - 1) {
        setStoryIdx((s) => s + 1);
      } else {
        navigation.goBack();
      }
      return;
    }
    if (slideIdx < slides.length - 1) {
      setSlideIdx((i) => i + 1);
    } else if (storyIdx < stories.length - 1) {
      setStoryIdx((s) => s + 1);
    } else {
      navigation.goBack();
    }
  }, [slides.length, slideIdx, storyIdx, stories.length, navigation]);

  const goPrev = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx((i) => i - 1);
    } else if (storyIdx > 0) {
      setStoryIdx((s) => s - 1);
    }
  }, [slideIdx, storyIdx]);

  // Auto-advance ticker — reads pause from a ref so we don't tear down the
  // interval just to pause; reading freshly keeps `elapsedRef` accurate.
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (isLoading || isError || slides.length === 0) {
      return;
    }
    const slideKey = `${storyIdx}:${slideIdx}`;
    // New slide → reset elapsed and the visible progress.
    if (lastSlideKeyRef.current !== slideKey) {
      lastSlideKeyRef.current = slideKey;
      elapsedRef.current = 0;
      progressAnim.setValue(0);
    }

    let startedAt = Date.now() - elapsedRef.current;
    let lastTickAt = Date.now();

    const id = setInterval(() => {
      const now = Date.now();
      if (pausedRef.current) {
        // Don't accumulate elapsed while paused — slide back the start.
        startedAt += now - lastTickAt;
        lastTickAt = now;
        return;
      }
      lastTickAt = now;
      const e = now - startedAt;
      elapsedRef.current = e;
      const p = Math.min(1, e / slideDuration);
      progressAnim.setValue(p);
      if (p >= 1) {
        clearInterval(id);
        elapsedRef.current = 0;
        goNext();
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [
    isLoading,
    isError,
    slides.length,
    storyIdx,
    slideIdx,
    slideDuration,
    progressAnim,
    goNext,
  ]);

  const onClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  // Total slides for the progress bar — fall back to 1 while loading so the
  // bar takes a sensible shape behind the spinner.
  const totalSegments = Math.max(1, slides.length);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Media layer */}
      <View style={styles.media}>
        {currentSlide ? (
          <SlideRenderer
            slide={currentSlide}
            fallbackCover={currentSummary?.coverImage || undefined}
          />
        ) : currentSummary?.coverImage ? (
          // Loading or no slides yet — show the cover behind the chrome.
          <SlideRenderer
            slide={placeholderSlideFromCover(currentSummary.id)}
            fallbackCover={currentSummary.coverImage}
          />
        ) : (
          <SlideRenderer slide={placeholderSlideFromCover(currentSummary?.id ?? 0)} />
        )}
      </View>

      {/* Bottom scrim for caption legibility */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomScrim}
        pointerEvents="none"
      />

      {/* Tap zones — left = prev, right = next. Sit below header & caption. */}
      <View
        style={[styles.tapZones, { paddingTop: insets.top + 70 }]}
        pointerEvents="box-none"
      >
        <Pressable style={styles.tapHalfLeft} onPress={goPrev} />
        <Pressable style={styles.tapHalfRight} onPress={goNext} />
      </View>

      {/* Header chrome */}
      <View
        style={[
          styles.headerWrap,
          { paddingTop: insets.top + 10 },
        ]}
        pointerEvents="box-none"
      >
        <PlayerProgressBar
          total={totalSegments}
          currentIdx={slideIdx}
          progress={progressAnim}
        />
        <View style={styles.headerSpacer} />
        <PlayerHeader
          author={story?.author ?? null}
          timeAgo={story?.timeAgo || currentSummary?.timeAgo || ''}
          paused={paused}
          onTogglePause={togglePause}
          onClose={onClose}
        />
      </View>

      {/* Loading overlay */}
      {isLoading && !data ? (
        <View style={styles.centerOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}

      {/* Error overlay */}
      {isError && !data ? (
        <View style={styles.centerOverlay}>
          <ErrorState
            message="Couldn't load this story"
            onRetry={() => refetch()}
          />
        </View>
      ) : null}

      {/* Caption */}
      {!isLoading && !isError && currentSlide && story ? (
        <View
          style={[
            styles.captionWrap,
            { paddingBottom: insets.bottom + 24 },
          ]}
          pointerEvents="box-none"
        >
          <SlideCaption slide={currentSlide} story={story} />
        </View>
      ) : null}
    </View>
  );
}

// Build a synthetic "loading" slide so the renderer can show the cover.
function placeholderSlideFromCover(id: number): WebStorySlide {
  return {
    id: `cover-${id}`,
    order: 0,
    slideType: 'cover-slide',
    isCover: true,
    mediaType: 'image',
    imageUrl: '',
    videoUrl: '',
    title: '',
    caption: '',
    extra: null,
    mediaCredit: '',
    actionUrl: '',
    actionLabel: '',
    slideAuthor: '',
    authorByLine: false,
    attribute: '',
    pollId: null,
    quizId: null,
    durationMs: 5000,
    bg: { colors: ['#0b0b0b', '#1a1a1a'], angle: 160 },
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  media: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  tapHalfLeft: {
    width: '33%',
    height: '100%',
  },
  tapHalfRight: {
    flex: 1,
    height: '100%',
  },
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    gap: 10,
  },
  headerSpacer: {
    height: 4,
  },
  captionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

