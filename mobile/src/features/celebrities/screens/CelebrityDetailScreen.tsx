import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ImageBackground, Linking, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import type { HomeStackParamList } from '../../../navigation/types';
import type { CelebrityBiography, CelebrityFan, ForumTopic } from '../../../services/api';

import TrendBadge from '../components/TrendBadge';
import Initials from '../components/Initials';
import BiographyTab from '../components/BiographyTab';
import FansTab from '../components/FansTab';
// Filmography tab is built but currently hidden — the public /movies/by-mode
// API returns empty for every personId we tested. Re-enable once the backend
// exposes person→movies. Keeping the imports out for now to avoid unused-import
// noise. FilmographyTab.tsx, FilmographyRow.tsx, useCelebrityFilmography.ts,
// and fetchCelebrityFilmography are still in the tree, ready to wire back in.
import DiscussionTab from '../components/DiscussionTab';
import { useCelebrityBiography } from '../hooks/useCelebrityBiography';
import { useCelebrityFans } from '../hooks/useCelebrityFans';
import { useCelebrityDiscussion } from '../hooks/useCelebrityDiscussion';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

type Route = RouteProp<HomeStackParamList, 'CelebrityProfile'>;
type Nav   = NativeStackNavigationProp<HomeStackParamList, 'CelebrityProfile'>;
type Styles = ReturnType<typeof makeStyles>;

type TabId = 'biography' | 'discussion' | 'fans';
const TABS: { id: TabId; label: string }[] = [
  { id: 'biography',  label: 'Biography' },
  { id: 'discussion', label: 'Discussion' },
  { id: 'fans',       label: 'Fans' },
];

export default function CelebrityDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { celebrity } = route.params;
  const [tab, setTab] = useState<TabId>('biography');
  const styles = useThemedStyles(makeStyles);

  const bioQuery = useCelebrityBiography(celebrity.id);
  const fansQuery = useCelebrityFans(celebrity.id);

  const forumId         = bioQuery.data?.forumId ?? null;
  const discussionQuery = useCelebrityDiscussion(forumId);

  const topics = useMemo(() => {
    const seen = new Set<number>();
    const list: ForumTopic[] = [];
    for (const page of discussionQuery.data?.pages ?? []) {
      for (const t of page.topics) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          list.push(t);
        }
      }
    }
    return list;
  }, [discussionQuery.data]);

  const fans = useMemo(() => {
    const seen = new Set<string>();
    const list: CelebrityFan[] = [];
    for (const page of fansQuery.data?.pages ?? []) {
      for (const f of page.fans) {
        if (!seen.has(f.id)) {
          seen.add(f.id);
          list.push(f);
        }
      }
    }
    return list;
  }, [fansQuery.data]);

  return (
    <View style={styles.screen}>
      <TopNavBack title={celebrity.name} onBack={() => navigation.goBack()} />

      <View style={styles.hero}>
        {celebrity.thumbnail ? (
          <ImageBackground
            source={{ uri: celebrity.thumbnail }}
            style={styles.heroImg}
            resizeMode="cover"
          >
            <View style={styles.heroScrim} />
            <HeroContent celebrity={celebrity} biography={bioQuery.data} styles={styles} />
          </ImageBackground>
        ) : (
          <View style={[styles.heroImg, styles.heroFallback]}>
            <Initials name={celebrity.name} size={96} />
            <View style={styles.heroScrim} />
            <HeroContent celebrity={celebrity} biography={bioQuery.data} styles={styles} />
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} style={styles.tab} onPress={() => setTab(t.id)}>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              {active && <View style={styles.tabIndicator} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.body}>
        {tab === 'biography' ? (
          <BiographyTab
            biography={bioQuery.data}
            isLoading={bioQuery.isLoading}
            isError={bioQuery.isError}
            onRetry={() => bioQuery.refetch()}
          />
        ) : tab === 'discussion' ? (
          <DiscussionTab
            forumId={forumId}
            bioLoading={bioQuery.isLoading}
            topics={topics}
            isLoading={discussionQuery.isLoading}
            isError={discussionQuery.isError}
            hasNextPage={!!discussionQuery.hasNextPage}
            isFetchingNextPage={discussionQuery.isFetchingNextPage}
            onLoadMore={() => discussionQuery.fetchNextPage()}
            onRetry={() => discussionQuery.refetch()}
          />
        ) : (
          <FansTab
            fans={fans}
            isLoading={fansQuery.isLoading}
            isError={fansQuery.isError}
            hasNextPage={!!fansQuery.hasNextPage}
            isFetchingNextPage={fansQuery.isFetchingNextPage}
            onLoadMore={() => fansQuery.fetchNextPage()}
            onRetry={() => fansQuery.refetch()}
          />
        )}
      </View>
    </View>
  );
}

interface HeroContentProps {
  celebrity: HomeStackParamList['CelebrityProfile']['celebrity'];
  biography: CelebrityBiography | null | undefined;
  styles: Styles;
}

function HeroContent({ celebrity, biography, styles }: HeroContentProps) {
  const profession = biography?.profession?.[0] || '';
  const socials: { key: string; icon: 'logo-instagram' | 'logo-twitter' | 'logo-facebook'; url: string }[] = [];
  if (biography?.instagram) socials.push({ key: 'instagram', icon: 'logo-instagram', url: `https://instagram.com/${biography.instagram}` });
  if (biography?.twitter)   socials.push({ key: 'twitter',   icon: 'logo-twitter',   url: `https://twitter.com/${biography.twitter}` });
  if (biography?.facebook)  socials.push({ key: 'facebook',  icon: 'logo-facebook',  url: `https://facebook.com/${biography.facebook}` });

  return (
    <View style={styles.heroContent}>
      <View style={styles.heroTop}>
        {celebrity.rank > 0 ? (
          <View style={styles.rankPill}>
            <Text style={styles.rankPillText}>#{celebrity.rank} This Week</Text>
          </View>
        ) : <View />}
        <TrendBadge trend={celebrity.trend} rankDiff={celebrity.rankDiff} />
      </View>
      <View style={styles.heroBottom}>
        <Text style={styles.heroName} numberOfLines={2}>{celebrity.name}</Text>
        {!!profession && <Text style={styles.heroProfession}>{profession}</Text>}
        {!!celebrity.shortDesc && (
          <Text style={styles.heroDesc} numberOfLines={2}>{celebrity.shortDesc}</Text>
        )}
        {socials.length > 0 && (
          <View style={styles.heroSocials}>
            {socials.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => Linking.openURL(s.url)}
                style={styles.heroSocialBtn}
                accessibilityRole="link"
                accessibilityLabel={`${s.key} profile`}
                hitSlop={6}
              >
                <Ionicons name={s.icon} size={16} color="#FFFFFF" />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    hero: { height: 260, backgroundColor: '#1A1A1A' },
    heroImg: { width: '100%', height: '100%' },
    heroFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary },
    heroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    heroContent: { flex: 1, padding: 14, justifyContent: 'space-between' },
    heroTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroBottom:  { gap: 4 },
    rankPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.92)',
    },
    rankPillText: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
    heroName:     { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
    heroProfession: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.9 },
    heroDesc:     { fontSize: 13, color: 'rgba(255,255,255,0.92)' },
    heroSocials:  { flexDirection: 'row', gap: 8, marginTop: 8 },
    heroSocialBtn: {
      width: 30, height: 30, borderRadius: 15,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 6 },
    tabLabel: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    tabLabelActive: { color: c.primary, fontWeight: '700' },
    tabIndicator: {
      position: 'absolute',
      bottom: 0,
      width: 60, height: 3, borderRadius: 2,
      backgroundColor: c.primary,
    },
    body: { flex: 1 },
  });
}
