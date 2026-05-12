import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import {
  submitMovieReview,
  updateMovieReview,
  deleteMovieReview,
} from '../../../services/api';

type Route = RouteProp<HomeStackParamList, 'WriteMovieReview'>;
type Nav = NativeStackNavigationProp<HomeStackParamList, 'WriteMovieReview'>;

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 5000;

export default function WriteMovieReviewScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { titleId, titleName, existingReview } = route.params;
  const isEditing = !!existingReview;

  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  const [rating, setRating]       = useState(existingReview?.rating  ?? 0);
  const [subject, setSubject]     = useState(existingReview?.subject ?? '');
  const [message, setMessage]     = useState(existingReview?.message ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const canSubmit =
    rating > 0 &&
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    !submitting &&
    !deleting;

  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Please sign in to write a review.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = isEditing && existingReview
      ? await updateMovieReview({
          titleId,
          reviewId: existingReview.reviewId,
          rating,
          subject,
          review: message,
        })
      : await submitMovieReview({ titleId, rating, subject, review: message });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to submit review.');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['movie', titleId, 'reviews'] });
    Alert.alert(
      isEditing ? 'Review updated' : 'Review submitted',
      isEditing ? 'Your review has been updated.' : 'Thanks for sharing your thoughts!',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  }, [isAuthenticated, isEditing, existingReview, titleId, rating, subject, message, navigation, queryClient]);

  const handleDelete = useCallback(() => {
    if (!existingReview) return;
    Alert.alert(
      'Delete review?',
      'This will permanently remove your review for this movie.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setError(null);
            setDeleting(true);
            const res = await deleteMovieReview({
              titleId,
              reviewId: existingReview.reviewId,
            });
            setDeleting(false);
            if (!res.ok) {
              setError(res.error ?? 'Failed to delete review.');
              return;
            }
            await queryClient.invalidateQueries({ queryKey: ['movie', titleId, 'reviews'] });
            Alert.alert('Review deleted', 'Your review has been removed.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          },
        },
      ],
    );
  }, [existingReview, titleId, queryClient, navigation]);

  return (
    <View style={styles.screen}>
      <TopNavBack
        title={isEditing ? 'Edit Review' : 'Write a Review'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.movieTitle} numberOfLines={2}>{titleName}</Text>

          {!isAuthenticated ? (
            <View style={styles.signInBanner}>
              <Text style={styles.signInText}>You need to be signed in to {isEditing ? 'edit' : 'submit'} a review.</Text>
            </View>
          ) : null}

          {/* Rating */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Rating</Text>
              <Text style={styles.required}>Required</Text>
            </View>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= rating;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setRating(n)}
                    style={styles.starBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
                    hitSlop={6}
                  >
                    <Text style={[styles.star, filled ? styles.starFilled : styles.starEmpty]}>★</Text>
                  </Pressable>
                );
              })}
              {rating > 0 ? <Text style={styles.starHint}>{rating} of 5</Text> : null}
            </View>
          </View>

          {/* Subject */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Subject</Text>
              <Text style={styles.required}>Required</Text>
            </View>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Sum up your review in a few words"
              placeholderTextColor={colors.textTertiary}
              maxLength={SUBJECT_MAX}
              style={styles.subjectInput}
              returnKeyType="next"
            />
            <Text style={styles.charCount}>{subject.length}/{SUBJECT_MAX}</Text>
          </View>

          {/* Message */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Message</Text>
              <Text style={styles.required}>Required</Text>
            </View>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Share what you thought about the film…"
              placeholderTextColor={colors.textTertiary}
              maxLength={MESSAGE_MAX}
              multiline
              textAlignVertical="top"
              style={styles.messageInput}
            />
            <Text style={styles.charCount}>{message.length}/{MESSAGE_MAX}</Text>
          </View>

          {error ? (
            <View style={styles.errorBlock}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>{isEditing ? 'UPDATE' : 'SUBMIT'}</Text>
            )}
          </Pressable>

          {isEditing ? (
            <Pressable
              onPress={handleDelete}
              disabled={deleting || submitting}
              style={[styles.deleteBtn, (deleting || submitting) && styles.submitDisabled]}
              accessibilityRole="button"
            >
              {deleting ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <Text style={styles.deleteText}>DELETE REVIEW</Text>
              )}
            </Pressable>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },

    movieTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
      marginBottom: 16,
    },

    signInBanner: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: c.primarySoft,
      marginBottom: 16,
    },
    signInText: { color: c.primary, fontSize: 13, fontWeight: '700' },

    fieldBlock: { marginBottom: 18 },
    labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 8 },
    label:    { fontSize: 14, fontWeight: '800', color: c.text },
    required: { fontSize: 11, fontWeight: '700', color: '#E11D48', fontStyle: 'italic' },

    starsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    starBtn:  { padding: 4 },
    star:     { fontSize: 30, lineHeight: 32 },
    starEmpty:  { color: c.border },
    starFilled: { color: '#F5B400' },
    starHint:  { marginLeft: 10, color: c.textTertiary, fontSize: 12, fontWeight: '700' },

    subjectInput: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 14,
      color: c.text,
    },
    messageInput: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: c.text,
      minHeight: 180,
    },
    charCount: {
      marginTop: 4,
      alignSelf: 'flex-end',
      fontSize: 11,
      color: c.textTertiary,
    },

    errorBlock: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: '#FEE2E2',
      marginBottom: 14,
    },
    errorText: { color: '#991B1B', fontSize: 13, fontWeight: '700' },

    submitBtn: {
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitDisabled: { opacity: 0.5 },
    submitText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    deleteBtn: {
      marginTop: 12,
      paddingVertical: 13,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: '#DC2626',
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteText: {
      color: '#DC2626',
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    bottomSpacer: { height: 40 },
  });
}
