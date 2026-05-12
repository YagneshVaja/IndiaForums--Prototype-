import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
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
import { hapticError, hapticSuccess } from '../../../utils/haptics';

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
import { savePronoun, pronounQueryKey, loadPronoun } from '../utils/profileLocalCache';
import { useQueryClient } from '@tanstack/react-query';

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
  const qc = useQueryClient();

  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    email: '',
    userName: '',
    pronoun: '',
    forumSignature: '',
    avatarTitle: '',
    dob: '',
    facebook: '',
    twitter: '',
    youtube: '',
    instagram: '',
  });
  // Gender: 0 = unset / prefer not to say, 1 = male, 2 = female, 3 = other.
  // Backend may use different ints; treat anything out of 1-3 as unset.
  const [gender, setGender] = useState<0 | 1 | 2 | 3>(0);
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
      pronoun?: string | null;
      avatarTitle?: string | null;
      dob?: string | null;
      gender?: number | string | null;
      facebook?: string | null;
      twitter?: string | null;
      youtube?: string | null;
      instagram?: string | null;
    };
    // Pre-fill from /me. Pronoun is overwritten right after by the local
    // cache load (the GET /me endpoint doesn't include pronoun), so the
    // user always sees the current value when re-opening this screen.
    setForm({
      displayName: raw.displayName || q.data.displayName || '',
      bio: raw.bio || '',
      email: raw.email || '',
      userName: raw.userName || q.data.userName || '',
      pronoun: raw.pronoun || '',
      forumSignature: raw.forumSignature || '',
      avatarTitle: raw.avatarTitle || '',
      // API returns DOB as a full ISO datetime; collapse to the date portion
      // for display in the YYYY-MM-DD input.
      dob: raw.dob ? String(raw.dob).slice(0, 10) : '',
      facebook: raw.facebook || '',
      twitter: raw.twitter || '',
      youtube: raw.youtube || '',
      instagram: raw.instagram || '',
    });
    const g = typeof raw.gender === 'string' ? parseInt(raw.gender, 10) : raw.gender;
    setGender(g === 1 || g === 2 || g === 3 ? g : 0);
    setAvatarUrl(q.data.avatarUrl);
    setBannerUrl(q.data.bannerUrl);
    setUpdateChecksum(q.data.updateChecksum);

    // Pull pronoun from SecureStore — the API doesn't return it, so without
    // this the field would always reset to empty even after the user has
    // previously saved it on this device.
    let cancelled = false;
    loadPronoun(q.data.userId).then((v) => {
      if (cancelled || !v) return;
      setForm((f) => ({ ...f, pronoun: v }));
    });
    return () => {
      cancelled = true;
    };
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
    const dobTrim = form.dob.trim();
    if (dobTrim && !/^\d{4}-\d{2}-\d{2}$/.test(dobTrim)) {
      setError('Date of birth must be in YYYY-MM-DD format');
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
        pronoun: form.pronoun.trim() || null,
        forumSignature: form.forumSignature.trim() || null,
        avatarTitle: form.avatarTitle.trim() || null,
        dob: dobTrim || null,
        gender: gender === 0 ? null : gender,
        facebook: form.facebook.trim() || null,
        twitter: form.twitter.trim() || null,
        youtube: form.youtube.trim() || null,
        instagram: form.instagram.trim() || null,
        updateChecksum: updateChecksum || undefined,
      };
      const res = await updateMyProfile(body);
      if (res.updateChecksum) setUpdateChecksum(res.updateChecksum);
      // Persist pronoun to SecureStore — the GET /me endpoint doesn't
      // return it, so the hero relies on this cache to re-display the
      // value. Invalidate the dedicated pronoun query so any mounted hero
      // re-reads SecureStore immediately.
      await savePronoun(q.data!.userId, form.pronoun);
      qc.invalidateQueries({ queryKey: pronounQueryKey(q.data!.userId) });
      updateAuthUser({ displayName: form.displayName.trim() });
      hapticSuccess();
      setSuccess(res.message || 'Profile updated');
      q.refetch();
    } catch (err) {
      hapticError();
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

      <Field
        label="Email"
        hint="Email can't be changed in the app — write to support to update it."
      >
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

      <Field label="Pronoun" hint="e.g. she/her, he/him, they/them">
        <TextInput
          value={form.pronoun}
          onChangeText={change('pronoun')}
          placeholder="Add your pronouns"
          placeholderTextColor={colors.textTertiary}
          maxLength={30}
          autoCapitalize="none"
          style={styles.input}
        />
      </Field>

      <Field label="Gender">
        <GenderRadio value={gender} onChange={setGender} />
      </Field>

      <Field label="Date of birth" hint="Format: YYYY-MM-DD">
        <TextInput
          value={form.dob}
          onChangeText={change('dob')}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textTertiary}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          style={styles.input}
        />
      </Field>

      <Field label="Avatar title" hint="A short title shown beside your avatar">
        <TextInput
          value={form.avatarTitle}
          onChangeText={change('avatarTitle')}
          placeholder="e.g. K-drama enthusiast"
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

      <Field
        label="Forum signature"
        hint={`Appears under your forum posts. ${form.forumSignature.length}/500`}
      >
        <TextInput
          value={form.forumSignature}
          onChangeText={change('forumSignature')}
          placeholder="A short tagline that follows your posts"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          maxLength={500}
          style={[styles.input, styles.textarea]}
        />
      </Field>

      <Text style={styles.sectionHeader}>Social links</Text>
      <SocialInput
        platform="facebook"
        value={form.facebook}
        onChange={change('facebook')}
      />
      <SocialInput
        platform="twitter"
        value={form.twitter}
        onChange={change('twitter')}
      />
      <SocialInput
        platform="instagram"
        value={form.instagram}
        onChange={change('instagram')}
      />
      <SocialInput
        platform="youtube"
        value={form.youtube}
        onChange={change('youtube')}
      />

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

// ── Gender radio group ──────────────────────────────────────────────────────

const GENDER_OPTIONS: { value: 0 | 1 | 2 | 3; label: string }[] = [
  { value: 1, label: 'Male' },
  { value: 2, label: 'Female' },
  { value: 3, label: 'Non-binary' },
  { value: 0, label: 'Prefer not to say' },
];

function GenderRadio({
  value,
  onChange,
}: {
  value: 0 | 1 | 2 | 3;
  onChange: (v: 0 | 1 | 2 | 3) => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.radioGroup}>
      {GENDER_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.radioPill,
              active && styles.radioPillActive,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.radioDot, active && styles.radioDotActive]} />
            <Text style={[styles.radioLabel, active && styles.radioLabelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Social link input ───────────────────────────────────────────────────────

const SOCIAL_META: Record<
  'facebook' | 'twitter' | 'instagram' | 'youtube',
  { label: string; icon: keyof typeof Ionicons.glyphMap; placeholder: string; color: string }
> = {
  facebook: {
    label: 'Facebook',
    icon: 'logo-facebook',
    placeholder: 'username or facebook.com/...',
    color: '#1877F2',
  },
  twitter: {
    label: 'Twitter / X',
    icon: 'logo-twitter',
    placeholder: '@handle or x.com/...',
    color: '#1DA1F2',
  },
  instagram: {
    label: 'Instagram',
    icon: 'logo-instagram',
    placeholder: '@handle or instagram.com/...',
    color: '#E4405F',
  },
  youtube: {
    label: 'YouTube',
    icon: 'logo-youtube',
    placeholder: 'channel URL or @handle',
    color: '#FF0000',
  },
};

function SocialInput({
  platform,
  value,
  onChange,
}: {
  platform: keyof typeof SOCIAL_META;
  value: string;
  onChange: (v: string) => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const meta = SOCIAL_META[platform];
  return (
    <View style={styles.socialField}>
      <View style={[styles.socialIconWrap, { backgroundColor: meta.color + '22' }]}>
        <Ionicons name={meta.icon} size={16} color={meta.color} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={meta.placeholder}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={120}
        style={styles.socialInput}
      />
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
        color={kind === 'error' ? colors.danger : colors.success}
      />
      <Text
        style={[
          styles.bannerText,
          { color: kind === 'error' ? colors.danger : colors.success },
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
    sectionHeader: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: 18,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    radioGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    radioPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    radioPillActive: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    radioDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: c.border,
      backgroundColor: 'transparent',
    },
    radioDotActive: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
    radioLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    radioLabelActive: {
      color: c.primary,
      fontWeight: '700',
    },
    socialField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    socialIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    socialInput: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: c.text,
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
      color: c.onPrimary,
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
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.dangerSoftBorder,
    },
    bannerSuccess: {
      backgroundColor: c.successSoft,
      borderWidth: 1,
      borderColor: c.successSoftBorder,
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
      backgroundColor: c.onPrimary,
    },
    thumbOn: {
      transform: [{ translateX: 16 }],
    },
  });
}
