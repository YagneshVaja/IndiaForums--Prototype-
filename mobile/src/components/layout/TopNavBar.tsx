import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// ── Gem logo mark ─────────────────────────────────────────────────────────────
function LogoGem() {
  return (
    <View style={styles.gem}>
      <Text style={styles.gemText}>IF</Text>
    </View>
  );
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
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
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
        <LogoGem />
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
          <Ionicons name="notifications-outline" size={20} color="#1A1A1A" />
          {notifCount > 0 ? (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{notifCount > 99 ? '99+' : notifCount}</Text>
            </View>
          ) : (
            <View style={styles.notifDot} />
          )}
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onProfilePress} hitSlop={8} accessibilityLabel="Profile">
          <Ionicons name="person-outline" size={20} color="#1A1A1A" />
        </Pressable>
      </View>
    </View>
  );
}

// ── Back mode ──────────────────────────────────────────────────────────────────
interface BackProps {
  title?: string;
  onBack: () => void;
}

export function TopNavBack({ title, onBack }: BackProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8} accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={18} color="#0D0D0D" />
      </Pressable>
      {title ? (
        <Text style={styles.screenTitle} numberOfLines={1}>{title}</Text>
      ) : (
        <View style={styles.flex1} />
      )}
      <View style={styles.backSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 14,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
    zIndex: 20,
  },
  // ── Gem ──
  gem: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#3558F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gemText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  // ── Logo row ──
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
    color: '#0D0D0D',
    letterSpacing: -0.4,
  },
  // ── Hamburger ──
  hamburger: {
    gap: 4,
    width: 18,
  },
  hLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#1A1A1A',
  },
  hLine1: { width: 18 },
  hLine2: { width: 12 },
  hLine3: { width: 7, backgroundColor: '#3558F0' },
  // ── Icon buttons ──
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
  // ── Notif indicators ──
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#C8001E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  notifBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 100,
    backgroundColor: '#C8001E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 12,
  },
  // ── Back mode ──
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEEFF1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  screenTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0D0D0D',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  flex1: { flex: 1 },
  backSpacer: { width: 36, flexShrink: 0 },
});
