import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ImageBackground, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import type { HomeStackParamList } from '../../../navigation/types';
import type { CelebrityFan } from '../../../services/api';

import TrendBadge from '../components/TrendBadge';
import Initials from '../components/Initials';
import BiographyTab from '../components/BiographyTab';
import FansTab from '../components/FansTab';
import { useCelebrityBiography } from '../hooks/useCelebrityBiography';
import { useCelebrityFans } from '../hooks/useCelebrityFans';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Route = RouteProp<HomeStackParamList, 'CelebrityProfile'>;
type Nav   = NativeStackNavigationProp<HomeStackParamList, 'CelebrityProfile'>;
type Styles = ReturnType<typeof makeStyles>;

const TABS: { id: 'biography' | 'fans'; label: string }[] = [
  { id: 'biography', label: 'Biography' },
  { id: 'fans',      label: 'Fans' },
];

export default function CelebrityDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { celebrity } = route.params;
  const [tab, setTab] = useState<'biography' | 'fans'>('biography');
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const bioQuery = useCelebrityBiography(celebrity.id);
  const fansQuery = useCelebrityFans(celebrity.id);

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
            <HeroContent celebrity={celebrity} styles={styles} />
          </ImageBackground>
        ) : (
          <View style={[styles.heroImg, styles.heroFallback]}>
            <Initials name={celebrity.name} size={96} />
            <View style={styles.heroScrim} />
            <HeroContent celebrity={celebrity} styles={styles} />
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

function HeroContent({ celebrity, styles }: { celebrity: HomeStackParamList['CelebrityProfile']['celebrity']; styles: Styles }) {
  return (
    <View style={styles.heroContent}>
      <View style={styles.heroTop}>
        <View style={styles.rankPill}>
          <Text style={styles.rankPillText}>#{celebrity.rank} This Week</Text>
        </View>
        <TrendBadge trend={celebrity.trend} rankDiff={celebrity.rankDiff} />
      </View>
      <View style={styles.heroBottom}>
        <Text style={styles.heroName} numberOfLines={2}>{celebrity.name}</Text>
        {!!celebrity.shortDesc && (
          <Text style={styles.heroDesc} numberOfLines={2}>{celebrity.shortDesc}</Text>
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
    heroDesc:     { fontSize: 13, color: 'rgba(255,255,255,0.92)' },
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
