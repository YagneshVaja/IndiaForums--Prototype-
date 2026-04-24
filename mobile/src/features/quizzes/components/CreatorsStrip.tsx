import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { QuizCreator } from '../../../services/api';

interface Props {
  creators: QuizCreator[];
}

export default function CreatorsStrip({ creators }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!creators.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.label}>🏆 Top Creators</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {creators.map((c) => (
          <View key={c.id} style={styles.item}>
            <LinearGradient
              colors={[c.avatarGradient[0], c.avatarGradient[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.initials}>{c.initials}</Text>
            </LinearGradient>
            <Text style={styles.name} numberOfLines={1}>
              {c.name.length > 10 ? `${c.name.slice(0, 9)}…` : c.name}
            </Text>
            {c.quizCount > 0 ? (
              <Text style={styles.quizCount}>{c.quizCount} quizzes</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingTop: 10,
      paddingBottom: 12,
    },
    header: {
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.2,
    },
    row: {
      paddingHorizontal: 14,
      gap: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    item: {
      alignItems: 'center',
      width: 68,
      gap: 4,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    name: {
      fontSize: 11,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
    },
    quizCount: {
      fontSize: 10,
      color: c.textTertiary,
      fontWeight: '600',
    },
  });
}
