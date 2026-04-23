import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { extractApiError } from '../../../services/api';

import { useProfile } from '../hooks/useProfile';
import { usePreferences } from '../hooks/usePreferences';
import {
  updateMyProfile,
  updateMyPreferences,
} from '../services/profileApi';
import type {
  UpdateProfileCommand,
  UserPreferencesDto,
} from '../types';
import ImageUploader from '../components/ImageUploader';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'EditProfile'>;

type SectionKey = 'profile' | 'preferences';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'profile', label: 'Edit Profile' },
  { key: 'preferences', label: 'Preferences' },
];

export default function EditProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [section, setSection] = useState<SectionKey>('profile');

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <TopNavBack title="Account Settings" onBack={() => navigation.goBack()} />

      <View style={styles.tabRow}>
        {SECTIONS.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => setSection(s.key)}
            style={[styles.tab, section === s.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, section === s.key && styles.tabTextActive]}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {section === 'profile' ? <ProfileForm /> : <PreferencesForm />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Profile form ────────────────────────────────────────────────────────────

function ProfileForm() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const q = useProfile();
  const updateAuthUser = useAuthStore((s) => s.updateUser);
  const nav = useNavigation<NativeStackNavigationProp<MySpaceStackParamList>>();

  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    email: '',
    userName: '',
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [updateChecksum, setUpdateChecksum] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    const raw = q.data.raw as {
      displayName?: string | null;
      userName?: string;
      email?: string | null;
      bio?: string | null;
      forumSignature?: string | null;
    };
    setForm({
      displayName: raw.displayName || q.data.displayName || '',
      bio: raw.bio || '',
      email: raw.email || '',
      userName: raw.userName || q.data.userName || '',
    });
    setAvatarUrl(q.data.avatarUrl);
    setBannerUrl(q.data.bannerUrl);
    setUpdateChecksum(q.data.updateChecksum);
  }, [q.data]);

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (q.isError || !q.data) {
    return <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />;
  }

  const change = (field: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const save = async () => {
    if (!form.displayName.trim()) {
      setError('Display name is required');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body: UpdateProfileCommand = {
        userId: q.data!.userId,
        groupId: q.data!.groupId ?? 0,
        displayName: form.displayName.trim(),
        bio: form.bio.trim() || null,
        updateChecksum: updateChecksum || undefined,
      };
      const res = await updateMyProfile(body);
      if (res.updateChecksum) setUpdateChecksum(res.updateChecksum);
      updateAuthUser({ displayName: form.displayName.trim() });
      setSuccess(res.message || 'Profile updated');
      q.refetch();
    } catch (err) {
      setError(extractApiError(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      {error ? <Banner kind="error" text={error} /> : null}
      {success ? <Banner kind="success" text={success} /> : null}

      <Text style={styles.fieldLabel}>Cover photo</Text>
      <ImageUploader
        variant="banner"
        currentUrl={bannerUrl}
        onUploaded={(url) => {
          setBannerUrl(url);
          setSuccess('Cover photo updated');
        }}
      />

      <Text style={styles.fieldLabel}>Avatar</Text>
      <ImageUploader
        variant="avatar"
        currentUrl={avatarUrl}
        onUploaded={(url) => {
          setAvatarUrl(url);
          updateAuthUser({ avatarUrl: url } as never);
          setSuccess('Avatar updated');
        }}
      />

      <Field label="Username" hint="Change under Settings → Username">
        <TextInput
          value={form.userName}
          editable={false}
          style={[styles.input, styles.inputDisabled]}
        />
      </Field>

      <Field label="Email" hint="Contact support to change your email">
        <TextInput
          value={form.email}
          editable={false}
          keyboardType="email-address"
          style={[styles.input, styles.inputDisabled]}
        />
      </Field>

      <Field label="Display name">
        <TextInput
          value={form.displayName}
          onChangeText={change('displayName')}
          placeholder="Your display name"
          placeholderTextColor={colors.textTertiary}
          maxLength={50}
          style={styles.input}
        />
      </Field>

      <Field label="Bio" hint={`${form.bio.length}/250`}>
        <TextInput
          value={form.bio}
          onChangeText={change('bio')}
          placeholder="Tell us about yourself"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
          maxLength={250}
          style={[styles.input, styles.textarea]}
        />
      </Field>

      <Pressable
        onPress={save}
        disabled={saving}
        style={({ pressed }) => [
          styles.saveBtn,
          pressed && styles.pressed,
          saving && styles.saveBtnDisabled,
        ]}
      >
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save Changes</Text>}
      </Pressable>

      {/* Security — entry point for password change */}
      <Pressable
        onPress={() => nav.navigate('ChangePassword')}
        style={({ pressed }) => [styles.secondaryRow, pressed && styles.pressed]}
      >
        <Ionicons name="key-outline" size={16} color={colors.primary} />
        <Text style={styles.secondaryRowText}>Change password</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

// ── Preferences form ────────────────────────────────────────────────────────

const EMAIL_PREFS: { key: keyof UserPreferencesDto; label: string }[] = [
  { key: 'emailPm', label: 'New private message' },
  { key: 'emailPmReply', label: 'Reply to your PM' },
  { key: 'emailPmRead', label: 'PM read receipt' },
  { key: 'emailQuote', label: 'Quoted in a post' },
  { key: 'emailCommentReply', label: 'Reply to your comment' },
  { key: 'emailScrapbook', label: 'New scrapbook entry' },
  { key: 'emailSlambook', label: 'New slambook entry' },
  { key: 'emailSlambookReply', label: 'Slambook reply' },
  { key: 'emailTestimonial', label: 'New testimonial' },
  { key: 'emailFFNotify', label: 'Fan fiction you follow' },
  { key: 'emailFFChapterNotify', label: 'New fan fiction chapter' },
  { key: 'emailBadgeAchievement', label: 'Badge earned' },
  { key: 'emailNewsLetter', label: 'Newsletter' },
  { key: 'emailRecommendation', label: 'Content recommendations' },
  { key: 'emailPostTag', label: 'Tagged in a post' },
  { key: 'emailDailyWeeklyMonthlyNotifications', label: 'Digest emails' },
  { key: 'emailNewTopicAlert', label: 'New topic in watched forum' },
  { key: 'emailTopicDailyDigest', label: 'Topic daily digest' },
];

const VISIBILITY_PREFS: { key: keyof UserPreferencesDto; label: string }[] = [
  { key: 'showSignature', label: 'Show signature in posts' },
  { key: 'showScrapbook', label: 'Show scrapbook on profile' },
  { key: 'showSlambook', label: 'Show slambook on profile' },
  { key: 'showTestimonial', label: 'Show testimonials on profile' },
  { key: 'showFeeds', label: 'Show activity feed on profile' },
  { key: 'showCountry', label: 'Show country on profile' },
  { key: 'showMyPosts', label: 'Show my posts on profile' },
];

const PERMISSION_PREFS: { key: keyof UserPreferencesDto; label: string }[] = [
  { key: 'allowPM', label: 'Allow private messages from others' },
  { key: 'allowUserTags', label: 'Allow others to tag me in posts' },
];

function PreferencesForm() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const q = usePreferences();
  const [prefs, setPrefs] = useState<UserPreferencesDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) setPrefs(q.data);
  }, [q.data]);

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (q.isError || !prefs) {
    return <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />;
  }

  const toggle = (key: keyof UserPreferencesDto) => {
    setPrefs((p) => {
      if (!p) return p;
      const cur = p[key];
      const on = cur === 1 || cur === '1';
      return { ...p, [key]: on ? 0 : 1 };
    });
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateMyPreferences(prefs);
      setSuccess('Preferences saved');
    } catch (err) {
      setError(extractApiError(err, 'Failed to save preferences'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      {error ? <Banner kind="error" text={error} /> : null}
      {success ? <Banner kind="success" text={success} /> : null}

      <PrefGroup title="Email Notifications" items={EMAIL_PREFS} prefs={prefs} onToggle={toggle} />
      <PrefGroup title="Profile Visibility" items={VISIBILITY_PREFS} prefs={prefs} onToggle={toggle} />
      <PrefGroup title="Permissions" items={PERMISSION_PREFS} prefs={prefs} onToggle={toggle} />

      <Pressable
        onPress={save}
        disabled={saving}
        style={({ pressed }) => [
          styles.saveBtn,
          pressed && styles.pressed,
          saving && styles.saveBtnDisabled,
        ]}
      >
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save Preferences</Text>}
      </Pressable>
    </View>
  );
}

function PrefGroup({
  title,
  items,
  prefs,
  onToggle,
}: {
  title: string;
  items: { key: keyof UserPreferencesDto; label: string }[];
  prefs: UserPreferencesDto;
  onToggle: (key: keyof UserPreferencesDto) => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.prefGroup}>
      <Text style={styles.prefGroupTitle}>{title}</Text>
      <View style={styles.prefCard}>
        {items.map((it, i) => {
          const v = prefs[it.key];
          const on = v === 1 || v === '1';
          return (
            <View
              key={String(it.key)}
              style={[styles.prefRow, i < items.length - 1 && styles.prefRowBorder]}
            >
              <Text style={styles.prefLabel}>{it.label}</Text>
              <Pressable
                onPress={() => onToggle(it.key)}
                style={[styles.toggle, on && styles.toggleOn]}
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
              >
                <View style={[styles.thumb, on && styles.thumbOn]} />
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Primitives ──────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function Banner({ kind, text }: { kind: 'error' | 'success'; text: string }) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.banner, kind === 'error' ? styles.bannerError : styles.bannerSuccess]}>
      <Ionicons
        name={kind === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        size={16}
        color={kind === 'error' ? '#C8001E' : '#1F9254'}
      />
      <Text
        style={[
          styles.bannerText,
          { color: kind === 'error' ? '#C8001E' : '#1F9254' },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    tabRow: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: c.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.2,
    },
    tabTextActive: {
      color: c.primary,
    },
    center: {
      padding: 48,
      alignItems: 'center',
    },
    form: {
      gap: 4,
    },
    field: {
      marginBottom: 12,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    input: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: c.text,
    },
    inputDisabled: {
      backgroundColor: c.surface,
      color: c.textTertiary,
    },
    textarea: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    hint: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 4,
    },
    saveBtn: {
      marginTop: 8,
      backgroundColor: c.primary,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnDisabled: {
      opacity: 0.7,
    },
    saveText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    secondaryRow: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    secondaryRowText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    pressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: 10,
      marginBottom: 12,
    },
    bannerError: {
      backgroundColor: '#FDECEC',
      borderWidth: 1,
      borderColor: '#FCD4D4',
    },
    bannerSuccess: {
      backgroundColor: '#E8F5EE',
      borderWidth: 1,
      borderColor: '#C6E6D5',
    },
    bannerText: {
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    prefGroup: {
      marginTop: 16,
      marginBottom: 4,
    },
    prefGroupTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 8,
      paddingLeft: 4,
    },
    prefCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      overflow: 'hidden',
    },
    prefRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
    },
    prefRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    prefLabel: {
      flex: 1,
      fontSize: 13,
      color: c.text,
      fontWeight: '500',
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
    thumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#FFF',
    },
    thumbOn: {
      transform: [{ translateX: 16 }],
    },
  });
}
