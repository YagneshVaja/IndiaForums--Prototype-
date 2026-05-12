import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Quiz } from '../../../services/api';
import { useQuizzes } from '../../quizzes/hooks/useQuizzes';
import FeaturedQuizCard, {
  type FeaturedKind,
} from '../../quizzes/components/FeaturedQuizCard';
import QuizGridCard from '../../quizzes/components/QuizGridCard';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function pickKind(quiz: Quiz, now: number = Date.now()): FeaturedKind {
  if (quiz.plays_raw > 500) return 'trending';
  const t = Date.parse(quiz.publishedWhen);
  if (!Number.isNaN(t) && now - t < SEVEN_DAYS_MS) return 'fresh';
  return 'surprise';
}

interface PreviewSelection {
  hero: Quiz | null;
  grid: Quiz[];
}

function selectPreview(quizzes: Quiz[]): PreviewSelection {
  if (!quizzes.length) return { hero: null, grid: [] };

  const sorted = [...quizzes].sort((a, b) => {
    if (b.plays_raw !== a.plays_raw) return b.plays_raw - a.plays_raw;
    return a.title.localeCompare(b.title);
  });
  const hero = sorted[0];
  const grid = quizzes.filter((q) => q.id !== hero.id).slice(0, 2);
  return { hero, grid };
}

export default function QuizzesHomeSection() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, isError } = useQuizzes();

  const allQuizzes = useMemo<Quiz[]>(
    () => (data?.pages ?? []).flatMap((p) => p.quizzes),
    [data],
  );
  const { hero, grid } = useMemo(() => selectPreview(allQuizzes), [allQuizzes]);
  const heroKind = useMemo<FeaturedKind>(
    () => (hero ? pickKind(hero) : 'trending'),
    [hero],
  );

  const handleQuizPress = useCallback(
    (quiz: Quiz) => {
      navigation.navigate('QuizDetail', {
        id: String(quiz.id),
        title: quiz.title,
        thumbnail: quiz.thumbnail,
      });
    },
    [navigation],
  );

  const handleSeeAll = useCallback(
    () => navigation.navigate('Quizzes'),
    [navigation],
  );

  if (isError && !hero) return null;
  if (!isLoading && !hero) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>FAN QUIZZES</Text>
            <Text style={styles.subtitle}>
              Test your fan score · daily picks
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleSeeAll}
          style={({ pressed }) => [
            styles.seeAll,
            pressed && styles.seeAllPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="See all quizzes"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {isLoading && !hero ? (
          <>
            <View style={[styles.skeleton, styles.skeletonHero]} />
            <View style={styles.gridRow}>
              <View style={[styles.skeleton, styles.skeletonGrid]} />
              <View style={[styles.skeleton, styles.skeletonGrid]} />
            </View>
          </>
        ) : null}

        {hero ? (
          <View style={styles.heroWrap}>
            <FeaturedQuizCard
              quiz={hero}
              kind={heroKind}
              onPress={handleQuizPress}
            />
          </View>
        ) : null}

        {grid.length ? (
          <View style={styles.gridRow}>
            {grid.map((quiz) => (
              <View key={quiz.id} style={styles.gridCell}>
                <QuizGridCard quiz={quiz} onPress={handleQuizPress} />
              </View>
            ))}
            {grid.length === 1 ? <View style={styles.gridCell} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 16,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingBottom: 14,
      gap: 10,
    },
    titleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    accentBar: {
      width: 3.5,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    titleCol: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      fontSize: 13,
      fontWeight: '900',
      color: c.text,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    subtitle: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
      marginTop: 2,
      letterSpacing: 0.2,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    seeAllPressed: { opacity: 0.6 },
    seeAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },

    body: {
      paddingHorizontal: 14,
      gap: 12,
    },
    heroWrap: {},
    gridRow: {
      flexDirection: 'row',
      gap: 10,
    },
    gridCell: {
      flex: 1,
    },

    skeleton: {
      backgroundColor: c.surface,
      borderRadius: 14,
    },
    skeletonHero: {
      width: '100%',
      aspectRatio: 16 / 10,
      borderRadius: 18,
    },
    skeletonGrid: {
      flex: 1,
      aspectRatio: 0.78,
    },
  });
}
