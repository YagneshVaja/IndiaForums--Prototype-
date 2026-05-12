import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../profile/components/EmptyState';
import { extractApiError } from '../../../services/api';
import { stripHtml } from '../../profile/utils/format';

import { getHelpCenterHome, getHelpCenterQuestion } from '../services/helpCenterApi';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'HelpCenter'>;

export default function HelpCenterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const home = useQuery({
    queryKey: ['helpcenter', 'home'],
    queryFn: () => getHelpCenterHome({ pageSize: 30 }),
    staleTime: 5 * 60 * 1000,
  });

  const [activeCategoryId, setActiveCategoryId] = useState<number | string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | string | null>(null);

  const categories = useMemo(() => home.data?.categories ?? [], [home.data]);
  const questions = useMemo(() => home.data?.questionsByCategory ?? [], [home.data]);

  // Default to first category once data loads
  React.useEffect(() => {
    if (activeCategoryId == null && categories.length > 0) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  const visibleQuestions = questions.filter(
    (q) => String(q.categoryId) === String(activeCategoryId),
  );

  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  if (selectedQuestionId != null) {
    return (
      <QuestionDetailView
        questionId={selectedQuestionId}
        onBack={() => setSelectedQuestionId(null)}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="Help Center" onBack={() => navigation.goBack()} />

      {home.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : home.isError ? (
        <View style={styles.center}>
          <ErrorState message={extractApiError(home.error)} onRetry={home.refetch} />
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon="help-circle-outline"
            title="No help topics yet"
            subtitle="Check back later."
          />
        </View>
      ) : (
        <>
          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {categories.map((c) => {
              const active = String(c.id) === String(activeCategoryId);
              return (
                <Pressable
                  key={String(c.id)}
                  onPress={() => setActiveCategoryId(c.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Questions for active category */}
          <ScrollView
            contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 40 }}
          >
            {visibleQuestions.length === 0 ? (
              <EmptyState
                icon="help-circle-outline"
                title="No questions in this category"
              />
            ) : (
              <View style={styles.list}>
                {visibleQuestions.map((q) => (
                  <Pressable
                    key={String(q.questionId)}
                    onPress={() => setSelectedQuestionId(q.questionId)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <Ionicons
                      name="help-circle-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.question} numberOfLines={3}>
                      {q.question}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textTertiary}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

// ── Question detail ─────────────────────────────────────────────────────────

function QuestionDetailView({
  questionId,
  onBack,
}: {
  questionId: number | string;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const q = useQuery({
    queryKey: ['helpcenter', 'question', questionId],
    queryFn: () => getHelpCenterQuestion(questionId),
    staleTime: 5 * 60 * 1000,
  });

  const detail = q.data?.questionDetails;
  const answers = q.data?.answers ?? [];
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="Question" onBack={onBack} />

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 40 }}
      >
        {q.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : q.isError ? (
          <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />
        ) : !detail ? (
          <EmptyState icon="help-circle-outline" title="Question not found" />
        ) : (
          <>
            <View style={styles.questionCard}>
              {detail.name ? (
                <Text style={styles.categoryLabel}>{detail.name}</Text>
              ) : null}
              <Text style={styles.questionTitle}>{detail.question}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.metaText}>Asked by {detail.questionCreator}</Text>
                <Text style={styles.metaText}>· {String(detail.voteCount)} votes</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>
              {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
            </Text>
            {answers.length === 0 ? (
              <EmptyState
                icon="chatbox-ellipses-outline"
                title="No answers yet"
                subtitle="Be the first to answer on the website."
              />
            ) : (
              <View style={styles.list}>
                {answers.map((a) => (
                  <View key={String(a.answerId)} style={styles.answerCard}>
                    <Text style={styles.answerAuthor}>{a.answeredBy}</Text>
                    <Text style={styles.answerBody}>{stripHtml(a.answer)}</Text>
                    <Text style={styles.metaText}>♥ {String(a.likeCount)} likes</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },

    chipRow: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
    chipTextActive: { color: c.onPrimary },

    list: { gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
    },
    pressed: { opacity: 0.88 },
    question: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: c.text,
      lineHeight: 19,
    },

    // Detail view
    questionCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      gap: 8,
    },
    categoryLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    questionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.text,
      lineHeight: 24,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    answerCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      gap: 6,
    },
    answerAuthor: {
      fontSize: 12,
      fontWeight: '800',
      color: c.primary,
    },
    answerBody: {
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
    },
  });
}
