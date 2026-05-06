import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeColors } from '../../theme/tokens';

const LOGO_ICON = require('../../../assets/icon.png');

// ── Gem logo mark ─────────────────────────────────────────────────────────────
function LogoGem({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  return <Image source={LOGO_ICON} style={styles.gem} resizeMode="contain" />;
}

// ── Brand mode ─────────────────────────────────────────────────────────────────
interface BrandProps {
  onMenuPress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  notifCount?: number;
}

export function TopNavBrand({
  onMenuPress,
  onNotificationsPress,
  onProfilePress,
  notifCount = 0,
}: BrandProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.safeWrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {/* Hamburger */}
        <Pressable style={styles.iconBtn} onPress={onMenuPress} hitSlop={8} accessibilityLabel="Menu">
          <View style={styles.hamburger}>
            <View style={[styles.hLine, styles.hLine1]} />
            <View style={[styles.hLine, styles.hLine2]} />
            <View style={[styles.hLine, styles.hLine3]} />
          </View>
        </Pressable>

        {/* Logo */}
        <View style={styles.logoRow}>
          <LogoGem styles={styles} />
          <Text style={styles.wordmark}>indiaforums</Text>
        </View>

        {/* Right: Bell + Person */}
        <View style={styles.rightRow}>
          <Pressable
            style={styles.iconBtn}
            onPress={onNotificationsPress}
            hitSlop={8}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {notifCount > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{notifCount > 99 ? '99+' : notifCount}</Text>
              </View>
            ) : (
              <View style={styles.notifDot} />
            )}
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={onProfilePress} hitSlop={8} accessibilityLabel="Profile">
            <Ionicons name="person-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Back mode ──────────────────────────────────────────────────────────────────
interface BackProps {
  title?: string;
  onBack: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
}

export function TopNavBack({
  title, onBack, rightIcon, onRightPress, rightAccessibilityLabel,
}: BackProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.safeWrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        {title ? (
          <Text style={styles.screenTitle} numberOfLines={1}>{title}</Text>
        ) : (
          <View style={styles.flex1} />
        )}
        {rightIcon && onRightPress ? (
          <Pressable
            style={styles.backBtn}
            onPress={onRightPress}
            hitSlop={8}
            accessibilityLabel={rightAccessibilityLabel || 'Action'}
          >
            <Ionicons name={rightIcon} size={18} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safeWrap: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      zIndex: 20,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      paddingHorizontal: 14,
      gap: 8,
    },
    gem: {
      width: 24,
      height: 24,
    },
    logoRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    wordmark: {
      fontSize: 17,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.4,
    },
    hamburger: {
      gap: 4,
      width: 18,
    },
    hLine: {
      height: 2,
      borderRadius: 1,
      backgroundColor: c.text,
    },
    hLine1: { width: 18 },
    hLine2: { width: 12 },
    hLine3: { width: 7, backgroundColor: c.hamburgerAccent },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    rightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    notifDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.danger,
      borderWidth: 1.5,
      borderColor: c.card,
    },
    notifBadge: {
      position: 'absolute',
      top: 3,
      right: 3,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      borderRadius: 100,
      backgroundColor: c.danger,
      borderWidth: 1.5,
      borderColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: c.onPrimary,
      lineHeight: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    screenTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.2,
      textAlign: 'center',
    },
    flex1: { flex: 1 },
    backSpacer: { width: 36, flexShrink: 0 },
  });
}
