import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { MovieCastMember } from '../../../services/api';

interface Props {
  cast: MovieCastMember[];
}

function MovieCastStripImpl({ cast }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {cast.map((m, i) => (
        <View
          key={`${m.personId || 'p'}-${m.name || 'n'}-${i}`}
          style={styles.item}
        >
          {m.imageUrl ? (
            <Image
              source={{ uri: m.imageUrl }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={120}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{(m.name?.[0] ?? '?').toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name} numberOfLines={2}>{m.name}</Text>
          {m.characterName ? (
            <Text style={styles.role} numberOfLines={1}>as {m.characterName}</Text>
          ) : m.role ? (
            <Text style={styles.role} numberOfLines={1}>{m.role}</Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const MovieCastStrip = React.memo(MovieCastStripImpl);
export default MovieCastStrip;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      gap: 14,
    },
    item: {
      width: 78,
      alignItems: 'center',
    },
    avatar: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: c.cardElevated,
    },
    avatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      color: c.textSecondary,
      fontWeight: '800',
      fontSize: 22,
    },
    name: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
    },
    role: {
      marginTop: 1,
      fontSize: 10.5,
      color: c.textTertiary,
      textAlign: 'center',
    },
  });
}
