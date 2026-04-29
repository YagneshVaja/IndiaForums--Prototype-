import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '../../../../store/themeStore';
import type { ThemeColors } from '../../../../theme/tokens';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import type { CelebrityDto, MovieDto, ShowDto } from '../../types';

interface Props {
  userId: number | string;
  isOwn: boolean;
}

export default function FavoritesTab({ userId, isOwn }: Props) {
  const q = useProfileTab({ tab: 'favorites', userId, isOwn, page: 1 });
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const data = q.data && q.data.kind === 'favorites' ? q.data : null;
  const isEmpty =
    !q.isLoading &&
    !data?.celebrities?.length &&
    !data?.movies?.length &&
    !data?.shows?.length;

  return (
    <TabShell
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={q.refetch}
      isEmpty={isEmpty}
      emptyIcon="star-outline"
      emptyTitle={isOwn ? 'No favourites yet' : 'No favourites to show'}
      emptySubtitle={
        isOwn
          ? 'Celebrities, movies, and shows you mark as favourite will appear here.'
          : undefined
      }
    >
      {data?.celebrities && data.celebrities.length > 0 ? (
        <Section title="Celebrities">
          <HorizStrip>
            {data.celebrities.map((c) => (
              <CelebrityCard key={String(c.personId)} c={c} styles={styles} />
            ))}
          </HorizStrip>
        </Section>
      ) : null}
      {data?.movies && data.movies.length > 0 ? (
        <Section title="Movies">
          <HorizStrip>
            {data.movies.map((m) => (
              <MovieCard key={String(m.titleId)} m={m} styles={styles} />
            ))}
          </HorizStrip>
        </Section>
      ) : null}
      {data?.shows && data.shows.length > 0 ? (
        <Section title="Shows">
          <HorizStrip>
            {data.shows.map((s) => (
              <ShowCard key={String(s.titleId)} s={s} styles={styles} />
            ))}
          </HorizStrip>
        </Section>
      ) : null}
    </TabShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <View style={{ marginTop: 12 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          color: colors.textTertiary,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: 8,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function HorizStrip({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
      {children}
    </ScrollView>
  );
}

function CelebrityCard({ c, styles }: { c: CelebrityDto; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.posterCard}>
      {c.thumbnailUrl ? (
        <Image source={c.thumbnailUrl} style={styles.poster} contentFit="cover" />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Text style={styles.posterInitial}>{c.displayName[0]?.toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.posterLabel} numberOfLines={2}>{c.displayName}</Text>
    </View>
  );
}

function MovieCard({ m, styles }: { m: MovieDto; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.posterCard}>
      {m.posterUrl ? (
        <Image source={m.posterUrl} style={styles.poster} contentFit="cover" />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Text style={styles.posterInitial}>{m.titleName[0]?.toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.posterLabel} numberOfLines={2}>{m.titleName}</Text>
      {m.startYear ? <Text style={styles.posterSub}>{String(m.startYear)}</Text> : null}
    </View>
  );
}

function ShowCard({ s, styles }: { s: ShowDto; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.posterCard}>
      {s.posterUrl ? (
        <Image source={s.posterUrl} style={styles.poster} contentFit="cover" />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Text style={styles.posterInitial}>{s.titleName[0]?.toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.posterLabel} numberOfLines={2}>{s.titleName}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    posterCard: {
      width: 100,
    },
    poster: {
      width: 100,
      height: 140,
      borderRadius: 10,
      backgroundColor: c.surface,
    },
    posterFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    posterInitial: {
      fontSize: 28,
      fontWeight: '800',
      color: '#FFF',
    },
    posterLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
      marginTop: 6,
      lineHeight: 16,
    },
    posterSub: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 2,
    },
  });
}
