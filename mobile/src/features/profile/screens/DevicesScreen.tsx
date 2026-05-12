import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../components/EmptyState';
import { extractApiError } from '../../../services/api';
import { getDevices, removeDevice, updateDevicePreferences } from '../services/profileApi';
import type { DeviceDto } from '../types';
import { timeAgo } from '../utils/format';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'Devices'>;

export default function DevicesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useThemedStyles(makeStyles);

  const q = useQuery({
    queryKey: ['profile', 'devices'],
    queryFn: getDevices,
    staleTime: 60_000,
  });

  const devices = q.data?.devices ?? [];
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="Devices" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
      >
        {q.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : q.isError ? (
          <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />
        ) : devices.length === 0 ? (
          <EmptyState
            icon="phone-portrait-outline"
            title="No devices registered"
            subtitle="Devices that sign in to your account will appear here."
          />
        ) : (
          <View style={styles.list}>
            {devices.map((d) => (
              <DeviceCard key={String(d.deviceTokenId)} device={d} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DeviceCard({ device }: { device: DeviceDto }) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();

  const [expanded, setExpanded] = useState(false);
  const [savingPref, setSavingPref] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [notif, setNotif] = useState(device.enableNotifications);

  const platformLower = (device.platform || '').toLowerCase();
  const icon: keyof typeof Ionicons.glyphMap = platformLower.includes('ios')
    ? 'phone-portrait-outline'
    : platformLower.includes('android')
      ? 'phone-portrait-outline'
      : platformLower.includes('web')
        ? 'globe-outline'
        : 'desktop-outline';

  const togglePush = async () => {
    const next = !notif;
    setSavingPref(true);
    try {
      await updateDevicePreferences(device.deviceTokenId, { enableNotifications: next });
      setNotif(next);
      qc.invalidateQueries({ queryKey: ['profile', 'devices'] });
    } catch (err) {
      Alert.alert('Error', extractApiError(err, 'Failed to update preference'));
    } finally {
      setSavingPref(false);
    }
  };

  const remove = () => {
    Alert.alert(
      'Remove device?',
      'This device will be signed out and will stop receiving notifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await removeDevice(device.deviceTokenId);
              qc.invalidateQueries({ queryKey: ['profile', 'devices'] });
            } catch (err) {
              Alert.alert('Error', extractApiError(err, 'Failed to remove device'));
            } finally {
              setRemoving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.card, !device.isActive && styles.cardInactive]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.cardHeader, pressed && styles.pressed]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.deviceName} numberOfLines={1}>
            {device.deviceName || device.deviceModel || 'Unknown device'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[
              device.platform,
              device.appVersion ? `v${device.appVersion}` : null,
              device.lastActiveWhen ? timeAgo(device.lastActiveWhen) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textTertiary}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.expanded}>
          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefLabel}>Push Notifications</Text>
              <Text style={styles.prefDesc}>Receive push alerts on this device</Text>
            </View>
            <Pressable
              onPress={savingPref ? undefined : togglePush}
              style={[styles.toggle, notif && styles.toggleOn, savingPref && styles.toggleBusy]}
            >
              <View style={[styles.thumb, notif && styles.thumbOn]} />
            </Pressable>
          </View>

          <Pressable
            onPress={remove}
            disabled={removing}
            style={({ pressed }) => [
              styles.removeBtn,
              pressed && styles.pressed,
              removing && { opacity: 0.6 },
            ]}
          >
            {removing ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                <Text style={styles.removeText}>Remove Device</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { paddingVertical: 48, alignItems: 'center' },
    list: { gap: 10 },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      overflow: 'hidden',
    },
    cardInactive: {
      opacity: 0.6,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    pressed: {
      opacity: 0.88,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: {
      flex: 1,
      gap: 2,
    },
    deviceName: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    meta: {
      fontSize: 12,
      color: c.textTertiary,
    },
    expanded: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      padding: 14,
      gap: 12,
    },
    prefRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    prefLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
    },
    prefDesc: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 2,
    },
    toggle: {
      width: 40,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.border,
      padding: 2,
      justifyContent: 'center',
    },
    toggleOn: {
      backgroundColor: c.primary,
    },
    toggleBusy: {
      opacity: 0.6,
    },
    thumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.onPrimary,
    },
    thumbOn: {
      transform: [{ translateX: 16 }],
    },
    removeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.dangerSoftBorder,
      backgroundColor: c.dangerSoft,
    },
    removeText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.danger,
      letterSpacing: 0.2,
    },
  });
}
