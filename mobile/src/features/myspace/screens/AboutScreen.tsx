import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Linking,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LOGO_ICON from '../../../../assets/icon.png';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'About'>;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface LinkRow {
  icon: IoniconName;
  label: string;
  url: string;
}

const LINKS: LinkRow[] = [
  { icon: 'globe-outline', label: 'Website', url: 'https://www.indiaforums.com' },
  { icon: 'document-text-outline', label: 'Privacy Policy', url: 'https://www.indiaforums.com/privacy' },
  { icon: 'reader-outline', label: 'Terms of Service', url: 'https://www.indiaforums.com/terms' },
  { icon: 'mail-outline', label: 'Contact Support', url: 'https://www.indiaforums.com/contact' },
];

export default function AboutScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const version = Constants.expoConfig?.version ?? '1.0';
  const runtime = Constants.expoConfig?.runtimeVersion;
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  const open = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert('Error', `Cannot open ${url}`);
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="About" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={LOGO_ICON} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>IndiaForums</Text>
          <Text style={styles.tagline}>India's biggest entertainment community</Text>
          <View style={styles.versionPill}>
            <Text style={styles.versionText}>Version {version}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.body}>
            IndiaForums is a community-driven platform for Indian entertainment — news, forums,
            fan fiction, galleries, videos, quizzes, and celebrity coverage. Connect with fans,
            discuss your favorite shows, and discover what's trending.
          </Text>
        </View>

        {/* Links */}
        <Text style={styles.sectionLabel}>Learn more</Text>
        <View style={styles.list}>
          {LINKS.map((l, i) => (
            <Pressable
              key={l.url}
              onPress={() => open(l.url)}
              style={({ pressed }) => [
                styles.row,
                i < LINKS.length - 1 && styles.rowBorder,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={l.icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.rowLabel}>{l.label}</Text>
              <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        {/* Build info */}
        <View style={styles.meta}>
          <Text style={styles.metaText}>App version {version}</Text>
          {runtime ? <Text style={styles.metaText}>Runtime {String(runtime)}</Text> : null}
          <Text style={styles.metaText}>© IndiaForums — All rights reserved</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },

    hero: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 16,
      gap: 10,
    },
    logo: {
      width: 96,
      height: 96,
      marginBottom: 4,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.4,
    },
    tagline: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: 4,
    },
    versionPill: {
      marginTop: 4,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    versionText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
    },
    body: {
      fontSize: 14,
      color: c.textSecondary,
      lineHeight: 21,
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
    list: {
      backgroundColor: c.card,
      borderRadius: 14,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: c.text,
    },
    pressed: { opacity: 0.88 },

    meta: {
      alignItems: 'center',
      gap: 4,
      marginTop: 28,
      paddingBottom: 24,
    },
    metaText: {
      fontSize: 11,
      color: c.textTertiary,
      textAlign: 'center',
    },
  });
}
