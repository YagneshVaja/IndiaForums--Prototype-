import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { ForumTopic } from '../../../services/api';
import type { HomeStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

interface Props {
  topic: ForumTopic;
}

function ForumTopicRowImpl({ topic }: Props) {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      onPress={() => navigation.navigate('TopicDetail', { topic })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={topic.title}
    >
      <View style={styles.accentBar} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{topic.title}</Text>
        {topic.description ? (
          <Text style={styles.description} numberOfLines={2}>{topic.description}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <Ionicons name="chatbubbles-outline" size={12} color={colors.primary} />
          <Text style={styles.metaText}>
            {topic.replies} {topic.replies === 1 ? 'reply' : 'replies'}
          </Text>
          {topic.views > 0 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{topic.views} views</Text>
            </>
          )}
          {topic.lastTime ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText} numberOfLines={1}>{topic.lastTime}</Text>
            </>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const ForumTopicRow = React.memo(ForumTopicRowImpl);
export default ForumTopicRow;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 14,
      marginBottom: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
    accentBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: c.primary },
    body: { flex: 1 },
    title: { fontSize: 14, fontWeight: '800', color: c.text, lineHeight: 19 },
    description: { marginTop: 4, fontSize: 12.5, lineHeight: 17, color: c.textSecondary },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, flexWrap: 'wrap' },
    metaText: { fontSize: 11, color: c.textSecondary, fontWeight: '600' },
    metaDot: { fontSize: 11, color: c.textTertiary },
  });
}
