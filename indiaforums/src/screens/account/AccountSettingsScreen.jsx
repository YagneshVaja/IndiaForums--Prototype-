import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as profileApi from '../../services/userProfileApi';
import { extractApiError } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import AvatarUploader from '../../components/account/AvatarUploader';
import styles from './AccountSettingsScreen.module.css';

const SECTIONS = [
  { key: 'profile',     label: 'Edit Profile' },
  { key: 'preferences', label: 'Preferences' },
];

export default function AccountSettingsScreen({ onBack }) {
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Account Settings</h1>
      </div>

      <div className={styles.tabs}>
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            className={`${styles.tab} ${activeSection === s.key ? styles.tabActive : ''}`}
            onClick={() => setActiveSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeSection === 'profile' && <ProfileSection />}
        {activeSection === 'preferences' && <PreferencesSection />}
      </div>
    </div>
  );
}

/* ── Profile Section ──────────────────────────────────────────────────────── */
function ProfileSection() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    userName: user?.userName || '',
    email: user?.email || '',
    bio: '',
  });
  // groupId + updateChecksum are required by UpdateProfileCommand for
  // optimistic concurrency. We populate them from /users/{userId}/profile
  // when we can; if it fails the form still works (we just won't send them).
  const [meta, setMeta] = useState({ groupId: null, updateChecksum: null });
  // Image URLs are persisted directly by the upload endpoints — we just
  // mirror them locally for the preview and to update auth context.
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null);
  const [bannerUrl, setBannerUrl] = useState(user?.bannerUrl || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      if (!user?.userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // GET /me is broken backend-side. Fall back to /users/{id}/profile
        // which returns { user, loggedInUser }.
        const res = await profileApi.getProfile(user.userId);
        const d = res.data?.user || res.data || {};
        setForm((prev) => ({
          displayName: d.displayName || prev.displayName,
          userName:    d.userName    || prev.userName,
          email:       d.email       || prev.email,
          bio:         d.bio         || '',
        }));
        setMeta({
          groupId: d.groupId ?? null,
          updateChecksum: d.updateChecksum ?? null,
        });
        // The profile DTO doesn't expose a URL field directly, but some
        // tenants put it on `thumbnailUrl` / `bannerUrl`. Pick whichever
        // shape is present so the preview reflects what's currently saved.
        if (d.thumbnailUrl || d.avatarUrl) setAvatarUrl(d.thumbnailUrl || d.avatarUrl);
        if (d.bannerUrl) setBannerUrl(d.bannerUrl);
      } catch (err) {
        // Silently use the auth context fields we already seeded above.
        // No banner — the form is still usable, just less detail.
        console.warn('Profile load fallback:', err.response?.status, err.response?.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError(null);
    if (success) setSuccess('');
  }

  // Upload endpoints persist directly — we just mirror the new URL into local
  // state and the auth context so other screens (MySpace header, etc.) update.
  function handleAvatarUploaded(url) {
    setAvatarUrl(url);
    updateUser({ avatarUrl: url });
  }

  function handleBannerUploaded(url) {
    setBannerUrl(url);
    updateUser({ bannerUrl: url });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (!user?.userId) {
      setError('You must be logged in to update your profile.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess('');

    // Build the payload — only include groupId/updateChecksum if we actually
    // loaded them. Sending nulls makes the model binder reject the request.
    const payload = {
      userId: user.userId,
      displayName: form.displayName.trim(),
      bio: form.bio.trim(),
    };
    if (meta.groupId != null)        payload.groupId = meta.groupId;
    if (meta.updateChecksum != null) payload.updateChecksum = meta.updateChecksum;

    try {
      const res = await profileApi.updateMyProfile(payload);
      // Server returns a fresh updateChecksum — store it for the next save.
      const newChecksum = res.data?.updateChecksum;
      if (newChecksum) setMeta((m) => ({ ...m, updateChecksum: newChecksum }));
      updateUser({ displayName: form.displayName.trim() });
      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Profile update error:', err.response?.status, err.response?.data);
      setError(extractApiError(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState variant="card" count={2} />;

  return (
    <form className={styles.form} onSubmit={handleSave}>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <AvatarUploader
        variant="banner"
        currentUrl={bannerUrl}
        onUploaded={handleBannerUploaded}
      />

      <AvatarUploader
        variant="avatar"
        currentUrl={avatarUrl}
        onUploaded={handleAvatarUploaded}
      />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="acc-email">Email</label>
        <input
          id="acc-email"
          className={`${styles.input} ${styles.inputDisabled}`}
          type="email"
          value={form.email}
          disabled
        />
        <span className={styles.hint}>Contact support to change your email</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="acc-displayname">Display Name</label>
        <input
          id="acc-displayname"
          className={styles.input}
          type="text"
          name="displayName"
          placeholder="Your display name"
          value={form.displayName}
          onChange={handleChange}
          maxLength={50}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="acc-bio">Bio</label>
        <textarea
          id="acc-bio"
          className={styles.textarea}
          name="bio"
          placeholder="Tell us about yourself"
          value={form.bio}
          onChange={handleChange}
          rows={3}
          maxLength={250}
        />
        <span className={styles.hint}>{form.bio.length}/250</span>
      </div>

      <button className={styles.saveBtn} type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}

/* ── Preferences Section ──────────────────────────────────────────────────── */
function PreferencesSection() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await profileApi.getMyPreferences();
        setPrefs(res.data || {});
      } catch {
        setFetchError('Could not load preferences');
        setPrefs({});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function togglePref(key) {
    // API stores as uint8 (0/1). Treat any truthy value as "on".
    setPrefs((p) => ({ ...p, [key]: p[key] ? 0 : 1 }));
    if (error) setError(null);
    if (success) setSuccess('');
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess('');
    try {
      await profileApi.updateMyPreferences(prefs);
      setSuccess('Preferences saved');
    } catch (err) {
      setError(extractApiError(err, 'Failed to save preferences'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState variant="card" count={2} />;

  if (fetchError && !prefs) {
    return <ErrorState message={fetchError} onRetry={() => window.location.reload()} />;
  }

  // Groups match UserPreferencesDto from the API spec
  const EMAIL_PREFS = [
    { key: 'emailPm',                              label: 'New private message' },
    { key: 'emailPmReply',                         label: 'Reply to your PM' },
    { key: 'emailPmRead',                          label: 'PM read receipt' },
    { key: 'emailQuote',                           label: 'Quoted in a post' },
    { key: 'emailCommentReply',                    label: 'Reply to your comment' },
    { key: 'emailScrapbook',                       label: 'New scrapbook entry' },
    { key: 'emailSlambook',                        label: 'New slambook entry' },
    { key: 'emailSlambookReply',                   label: 'Slambook reply' },
    { key: 'emailTestimonial',                     label: 'New testimonial' },
    { key: 'emailFFNotify',                        label: 'Fan fiction you follow' },
    { key: 'emailFFChapterNotify',                 label: 'New fan fiction chapter' },
    { key: 'emailBadgeAchievement',                label: 'Badge earned' },
    { key: 'emailNewsLetter',                      label: 'Newsletter' },
    { key: 'emailRecommendation',                  label: 'Content recommendations' },
    { key: 'emailPostTag',                         label: 'Tagged in a post' },
    { key: 'emailDailyWeeklyMonthlyNotifications', label: 'Digest emails' },
    { key: 'emailNewTopicAlert',                   label: 'New topic in watched forum' },
    { key: 'emailTopicDailyDigest',                label: 'Topic daily digest' },
  ];

  const VISIBILITY_PREFS = [
    { key: 'showSignature',  label: 'Show signature in posts' },
    { key: 'showScrapbook',  label: 'Show scrapbook on profile' },
    { key: 'showSlambook',   label: 'Show slambook on profile' },
    { key: 'showTestimonial',label: 'Show testimonials on profile' },
    { key: 'showFeeds',      label: 'Show activity feed on profile' },
    { key: 'showCountry',    label: 'Show country on profile' },
    { key: 'showMyPosts',    label: 'Show my posts on profile' },
  ];

  const PERMISSION_PREFS = [
    { key: 'allowPM',       label: 'Allow private messages from others' },
    { key: 'allowUserTags', label: 'Allow others to tag me in posts' },
  ];

  function PrefGroup({ title, items }) {
    return (
      <div className={styles.prefGroup}>
        <div className={styles.prefGroupTitle}>{title}</div>
        {items.map((item) => (
          <div key={item.key} className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <div className={styles.prefLabel}>{item.label}</div>
            </div>
            <button
              className={`${styles.toggle} ${prefs?.[item.key] ? styles.toggleOn : ''}`}
              onClick={() => togglePref(item.key)}
              type="button"
              aria-label={`Toggle ${item.label}`}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.prefSection}>
      {fetchError && <div className={styles.warning}>{fetchError}</div>}
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <PrefGroup title="Email Notifications" items={EMAIL_PREFS} />
      <PrefGroup title="Profile Visibility"  items={VISIBILITY_PREFS} />
      <PrefGroup title="Permissions"         items={PERMISSION_PREFS} />

      <button className={`${styles.saveBtn} ${styles.prefSaveBtn}`} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}
