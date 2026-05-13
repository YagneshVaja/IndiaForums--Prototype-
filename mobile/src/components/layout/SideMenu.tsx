import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LOGO_ICON from '../../../assets/icon.png';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSideMenuStore } from '../../store/sideMenuStore';
import { useThemeStore } from '../../store/themeStore';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { ThemeColors, ThemeMode } from '../../theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type Styles = ReturnType<typeof makeStyles>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 290);
const ANIM_MS = 280;

// ── Small building blocks ─────────────────────────────────────────────────────

function NewBadge({ styles }: { styles: Styles }) {
  return (
    <View style={styles.newBadge}>
      <Text style={styles.newBadgeText}>NEW</Text>
    </View>
  );
}

function DarkModeToggle({
  on,
  onToggle,
  styles,
}: {
  on: boolean;
  onToggle: () => void;
  styles: Styles;
}) {
  const translateX = useRef(new Animated.Value(on ? 18 : 0)).current;
  const lastAnimatedTo = useRef(on);

  // The parent stages the mode synchronously, so `on` flips on the same frame
  // as the press. We just need to drive the native-driven slide on UI thread.
  useEffect(() => {
    if (lastAnimatedTo.current === on) return;
    lastAnimatedTo.current = on;
    Animated.timing(translateX, {
      toValue: on ? 18 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [on, translateX]);

  return (
    <Pressable
      onPress={onToggle}
      style={[styles.toggle, on && styles.toggleOn]}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="Toggle dark mode"
    >
      <Animated.View style={[styles.toggleThumb, { transform: [{ translateX }] }]} />
    </Pressable>
  );
}

interface NavRowProps {
  icon?: IoniconName;
  iconColor?: string;
  label: string;
  badge?: boolean;
  hasArrow?: boolean;
  indent?: boolean;
  onPress: () => void;
  styles: Styles;
  colors: ThemeColors;
}

function NavRow({
  icon,
  iconColor,
  label,
  badge,
  hasArrow,
  indent,
  onPress,
  styles,
  colors,
}: NavRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        indent && styles.navRowIndent,
        pressed && styles.navRowPressed,
      ]}
    >
      {icon ? (
        <View style={styles.navRowIcon}>
          <Ionicons name={icon} size={16} color={iconColor ?? colors.text} />
        </View>
      ) : (
        <View style={styles.navRowIcon} />
      )}
      <Text style={styles.navRowLabel}>{label}</Text>
      {badge && <NewBadge styles={styles} />}
      {hasArrow && <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />}
    </Pressable>
  );
}

interface SectionGroupProps {
  title: string;
  icon: IoniconName;
  iconColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  styles: Styles;
  colors: ThemeColors;
}

function SectionGroup({
  title,
  icon,
  iconColor,
  defaultOpen = true,
  children,
  styles,
  colors,
}: SectionGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const rotation = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(rotation, {
      toValue: open ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [open, rotation]);
  const rotateInterp = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.sectionHeaderPressed]}
      >
        <View style={styles.navRowIcon}>
          <Ionicons name={icon} size={14} color={iconColor ?? colors.textSecondary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate: rotateInterp }] }}>
          <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>
      {open && <View>{children}</View>}
    </View>
  );
}

function SocialBtn({
  background,
  iconName,
  styles,
}: {
  background: string;
  iconName: IoniconName;
  styles: Styles;
}) {
  return (
    <View style={[styles.socialBtn, { backgroundColor: background }]}>
      <Ionicons name={iconName} size={14} color="#FFFFFF" />
    </View>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export default function SideMenu() {
  const isOpen = useSideMenuStore((s) => s.isOpen);
  const close = useSideMenuStore((s) => s.close);
  const mode = useThemeStore((s) => s.mode);
  const colors = useThemeStore((s) => s.colors);
  const setMode = useThemeStore((s) => s.setMode);
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const [mounted, setMounted] = useState(false);

  const styles = useThemedStyles(makeStyles);

  // Defer the actual theme commit until the menu dismisses. Toggling stages
  // a pending mode so the switch gives instant input feedback, but the
  // ~160-component React cascade does not fire until the menu starts sliding
  // away — so the cascade happens *during* the 280ms close animation and the
  // menu + app flip together off-screen. No visible desync.
  const [pendingMode, setPendingMode] = useState<ThemeMode | null>(null);
  const stagedMode: ThemeMode = pendingMode ?? mode;

  const handleToggleTheme = () => {
    setPendingMode((prev) => {
      const current = prev ?? mode;
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      // Collapse back to no-op if the user toggled back to the committed mode.
      return next === mode ? null : next;
    });
  };

  // Commit pending mode when the menu closes (any path: scrim, X, nav item,
  // hardware back). The cascade is deferred a tick so the close-animation's
  // first frame can paint on the UI thread before JS gets blocked by the
  // ~160-component re-render. Without this, the bridge call for the native
  // slide can sit behind the cascade and the menu visibly stalls before it
  // starts moving.
  useEffect(() => {
    if (!isOpen && pendingMode !== null && pendingMode !== mode) {
      const pending = pendingMode;
      setPendingMode(null);
      const handle = setTimeout(() => setMode(pending), 0);
      return () => clearTimeout(handle);
    }
    return undefined;
  }, [isOpen, pendingMode, mode, setMode]);

  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: ANIM_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: ANIM_MS,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -PANEL_WIDTH,
          duration: ANIM_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 0,
          duration: ANIM_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [isOpen, mounted, translateX, scrimOpacity]);

  const goTab = (tab: 'Home' | 'News' | 'Forums') => {
    close();
    navigation.navigate('Main', { screen: tab });
  };

  const goHomeScreen = (screen: string) => {
    close();
    navigation.navigate('Main', { screen: 'Home', params: { screen } });
  };

  if (!mounted && !isOpen) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Scrim */}
        <Animated.View
          style={[styles.scrim, { opacity: scrimOpacity }]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        {/* Panel */}
        <Animated.View
          style={[
            styles.panel,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
            { transform: [{ translateX }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLogo}>
              <Image source={LOGO_ICON} style={styles.gem} resizeMode="contain" />
              <Text style={styles.wordmark}>indiaforums</Text>
            </View>
            <Pressable onPress={close} hitSlop={8} style={styles.closeBtn} accessibilityLabel="Close menu">
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
            {/* Language selector */}
            <View style={styles.langSection}>
              <View style={styles.langSelect}>
                <Text style={styles.langText}>Select Language</Text>
                <Ionicons name="chevron-down" size={12} color={colors.textTertiary} />
              </View>
              <Text style={styles.poweredBy}>
                Powered By{' '}
                <Text style={styles.googleBlue}>G</Text>
                <Text style={styles.googleRed}>o</Text>
                <Text style={styles.googleYellow}>o</Text>
                <Text style={styles.googleBlue}>g</Text>
                <Text style={styles.googleGreen}>l</Text>
                <Text style={styles.googleRed}>e</Text>{' '}
                Translate
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Dark mode */}
            <View style={styles.darkRow}>
              <Text style={styles.darkLabel}>Dark Mode</Text>
              <DarkModeToggle on={stagedMode === 'dark'} onToggle={handleToggleTheme} styles={styles} />
            </View>

            <View style={styles.divider} />

            <NavRow
              icon="home-outline"
              iconColor="#16A34A"
              label="Home"
              onPress={() => goTab('Home')}
              styles={styles}
              colors={colors}
            />

            <View style={styles.divider} />

            <SectionGroup title="NEWS" icon="newspaper-outline" iconColor={colors.primary} styles={styles} colors={colors}>
              <NavRow icon="tv-outline" iconColor="#8B5CF6" label="Television" indent onPress={() => goTab('News')} styles={styles} colors={colors} />
              <NavRow icon="film-outline" iconColor="#EA580C" label="Movies" indent onPress={() => goTab('News')} styles={styles} colors={colors} />
              <NavRow icon="laptop-outline" iconColor="#0EA5E9" label="Digital" indent onPress={() => goTab('News')} styles={styles} colors={colors} />
              <NavRow icon="sparkles-outline" iconColor="#EC4899" label="Lifestyle" badge indent onPress={() => goTab('News')} styles={styles} colors={colors} />
              <NavRow icon="football-outline" iconColor="#F59E0B" label="Sports" badge indent onPress={() => goTab('News')} styles={styles} colors={colors} />
            </SectionGroup>

            <View style={styles.divider} />

            <SectionGroup title="FORUMS" icon="chatbubbles-outline" iconColor={colors.primary} styles={styles} colors={colors}>
              <NavRow icon="list-outline" iconColor={colors.primary} label="All Topics" indent onPress={() => goTab('Forums')} styles={styles} colors={colors} />
              <NavRow icon="school-outline" iconColor="#16A34A" label="Education" hasArrow indent onPress={() => goTab('Forums')} styles={styles} colors={colors} />
              <NavRow icon="musical-notes-outline" iconColor="#EA580C" label="Entertainment" hasArrow indent onPress={() => goTab('Forums')} styles={styles} colors={colors} />
              <NavRow icon="cash-outline" iconColor="#F59E0B" label="Finance & Investments" hasArrow indent onPress={() => goTab('Forums')} styles={styles} colors={colors} />
              <NavRow icon="chatbox-outline" iconColor="#8B5CF6" label="General Discussion" hasArrow indent onPress={() => goTab('Forums')} styles={styles} colors={colors} />
              <NavRow icon="color-palette-outline" iconColor="#EC4899" label="Hobbies & Interests" hasArrow indent onPress={() => goTab('Forums')} styles={styles} colors={colors} />
              <Pressable onPress={() => goTab('Forums')} style={({ pressed }) => [styles.seeMore, pressed && styles.seeMorePressed]}>
                <Text style={styles.seeMoreText}>See More</Text>
              </Pressable>
            </SectionGroup>

            <View style={styles.divider} />

            {/* Feature rows */}
            <NavRow icon="star-outline" iconColor="#F59E0B" label="Celebrities" onPress={() => goHomeScreen('Celebrities')} styles={styles} colors={colors} />
            <NavRow icon="videocam-outline" iconColor="#EA580C" label="Videos" onPress={() => goHomeScreen('Videos')} styles={styles} colors={colors} />
            <NavRow icon="images-outline" iconColor="#EC4899" label="Galleries" onPress={() => goHomeScreen('Galleries')} styles={styles} colors={colors} />
            <NavRow icon="book-outline" iconColor="#8B5CF6" label="Fan Fictions" onPress={() => goHomeScreen('FanFiction')} styles={styles} colors={colors} />
            <NavRow icon="help-circle-outline" iconColor="#16A34A" label="Quizzes" badge onPress={() => goHomeScreen('Quizzes')} styles={styles} colors={colors} />
            <NavRow icon="flash-outline" iconColor={colors.primary} label="Shorts" badge onPress={() => goHomeScreen('Shorts')} styles={styles} colors={colors} />
            <NavRow icon="globe-outline" iconColor="#0EA5E9" label="Web Stories" badge onPress={() => goHomeScreen('WebStories')} styles={styles} colors={colors} />

            <View style={styles.divider} />

            <NavRow icon="help-buoy-outline" iconColor={colors.textSecondary} label="Help Center" onPress={close} styles={styles} colors={colors} />

            <View style={styles.divider} />

            {/* Follow Us On */}
            <View style={styles.socialSection}>
              <Text style={styles.socialLabel}>Follow Us On</Text>
              <View style={styles.socialRow}>
                <SocialBtn background="#1877F2" iconName="logo-facebook" styles={styles} />
                <SocialBtn background="#000000" iconName="logo-twitter" styles={styles} />
                <SocialBtn background="#FF0000" iconName="logo-youtube" styles={styles} />
                <SocialBtn background="#E1306C" iconName="logo-instagram" styles={styles} />
                <SocialBtn background="#E60023" iconName="logo-pinterest" styles={styles} />
                <SocialBtn background="#0A66C2" iconName="logo-linkedin" styles={styles} />
              </View>
            </View>

            <View style={styles.drawerFooter} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.scrim,
    },
    panel: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: PANEL_WIDTH,
      backgroundColor: c.card,
      shadowColor: '#000',
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerLogo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    gem: {
      width: 22,
      height: 22,
    },
    wordmark: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.3,
    },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1 },
    langSection: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 8,
    },
    langSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: c.surface,
    },
    langText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    poweredBy: {
      fontSize: 10,
      color: c.textTertiary,
      marginTop: 5,
      textAlign: 'center',
    },
    googleBlue: { color: '#4285F4', fontWeight: '700' },
    googleRed: { color: '#EA4335', fontWeight: '700' },
    googleYellow: { color: '#FBBC05', fontWeight: '700' },
    googleGreen: { color: '#34A853', fontWeight: '700' },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 2,
    },
    darkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    darkLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: c.text,
    },
    toggle: {
      width: 42,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.border,
      padding: 3,
      justifyContent: 'center',
    },
    toggleOn: {
      backgroundColor: c.primary,
    },
    toggleThumb: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.onPrimary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
    },
    sectionHeaderPressed: {
      backgroundColor: c.surface,
    },
    sectionTitle: {
      flex: 1,
      fontSize: 11,
      fontWeight: '800',
      color: c.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 9,
      gap: 10,
    },
    navRowIndent: {
      paddingLeft: 24,
    },
    navRowPressed: {
      backgroundColor: c.surface,
    },
    navRowIcon: {
      width: 18,
      alignItems: 'center',
    },
    navRowLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: c.text,
    },
    newBadge: {
      backgroundColor: c.danger,
      borderRadius: 3,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    newBadgeText: {
      fontSize: 8.5,
      fontWeight: '800',
      letterSpacing: 0.4,
      color: c.onPrimary,
    },
    seeMore: {
      paddingLeft: 24,
      paddingRight: 14,
      paddingVertical: 7,
    },
    seeMorePressed: {
      opacity: 0.6,
    },
    seeMoreText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.danger,
    },
    socialSection: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 4,
    },
    socialLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    socialRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },
    socialBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    drawerFooter: {
      height: 24,
    },
  });
}
