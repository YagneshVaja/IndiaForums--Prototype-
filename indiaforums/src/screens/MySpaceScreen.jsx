import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthFlow from './auth/AuthFlow';
import VerifyEmailScreen from './auth/VerifyEmailScreen';
import ProfileScreen from './profile/ProfileScreen';
import AccountSettingsScreen from './account/AccountSettingsScreen';
import UsernameScreen from './account/UsernameScreen';
import DevicesScreen from './account/DevicesScreen';
import StatusScreen from './account/StatusScreen';
import NotificationsScreen from './account/NotificationsScreen';
import ActivitiesScreen from './account/ActivitiesScreen';
import BuddiesScreen from './buddies/BuddiesScreen';
import MessagesScreen from './messages/MessagesScreen';
import ReportsInboxScreen from './forum/ReportsInboxScreen';
import HelpCenterScreen from './help/HelpCenterScreen';
import { useUnreadCount, useUnreadMessageCount } from '../hooks/useNotifications';
import LoadingState from '../components/ui/LoadingState';
import styles from './MySpaceScreen.module.css';

/* ── SVG icon paths (Material Design) ───────────────────────────────────── */
const ICONS = {
  profile:  'M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z',
  buddies:  'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  messages: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  pen:      'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  status:   'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-12.5c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5z',
  bell:     'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  phone:    'M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z',
  activity: 'M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z',
  shield:   'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  help:     'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
  info:     'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  chevron:  'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
};

function fmtNum(n) {
  if (n == null) return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

/* ── MenuItem ────────────────────────────────────────────────────────────── */
function MenuItem({ icon, iconColor, label, subtitle, badge, onClick, last }) {
  return (
    <div
      className={`${styles.menuItem} ${last ? styles.menuItemLast : ''}`}
      onClick={onClick}
    >
      <div className={`${styles.menuIconWrap} ${styles[`icon_${iconColor}`]}`}>
        <svg viewBox="0 0 24 24" className={styles.menuSvg} fill="currentColor">
          <path d={ICONS[icon]} />
        </svg>
      </div>
      <div className={styles.menuText}>
        <span className={styles.menuLabel}>{label}</span>
        {subtitle && <span className={styles.menuSubtitle}>{subtitle}</span>}
      </div>
      {badge > 0 && <span className={styles.menuBadge}>{badge > 99 ? '99+' : badge}</span>}
      <span className={styles.menuArrow}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d={ICONS.chevron} />
        </svg>
      </span>
    </div>
  );
}

export default function MySpaceScreen() {
  const { isAuthenticated, isLoading, isModerator, user, logout } = useAuth();
  const [showVerify, setShowVerify] = useState(false);
  const [activeView, setActiveView] = useState('menu'); // 'menu' | 'profile' | 'settings' | 'username' | 'devices' | 'status' | 'notifications' | 'activities' | 'buddies' | 'messages' | 'reports' | 'help'
  const { count: unreadCount }    = useUnreadCount(null, isAuthenticated);
  const { count: unreadMessages } = useUnreadMessageCount(null, isAuthenticated);

  /* ── Derived user data ──────────────────────────────────────────────────── */
  const isOnline = useMemo(() => {
    const raw = user?.lastVisitedDate;
    if (!raw) return false;
    const d = new Date(raw);
    return !isNaN(d) && (Date.now() - d.getTime()) < 24 * 60 * 60 * 1000;
  }, [user?.lastVisitedDate]);

  const stats = useMemo(() => {
    const items = [];
    const pc = user?.postCount;
    const cc = user?.commentCount ?? user?.commentsCount ?? user?.totalComments;
    if (pc != null) items.push({ value: fmtNum(pc), label: 'Posts' });
    if (cc != null) items.push({ value: fmtNum(cc), label: 'Comments' });
    if (user?.joinDate) {
      const d = new Date(user.joinDate);
      if (!isNaN(d)) items.push({ value: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), label: 'Joined' });
    }
    return items;
  }, [user?.postCount, user?.commentCount, user?.commentsCount, user?.totalComments, user?.joinDate]);

  const rank = user?.rankName || user?.rank || user?.groupName || user?.userGroup || null;

  if (isLoading) {
    return (
      <div className={styles.screen}>
        <LoadingState variant="card" count={2} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthFlow />;
  }

  if (showVerify) {
    return <VerifyEmailScreen onNavigate={() => setShowVerify(false)} />;
  }

  if (activeView === 'profile') {
    return (
      <div className={styles.screen}>
        <div className={styles.subHeader}>
          <button className={styles.subHeaderBack} onClick={() => setActiveView('menu')}>← Back</button>
          <span className={styles.subHeaderTitle}>My Profile</span>
        </div>
        <ProfileScreen userId={null} />
      </div>
    );
  }
  if (activeView === 'settings')      return <AccountSettingsScreen onBack={() => setActiveView('menu')} />;
  if (activeView === 'username')       return <UsernameScreen         onBack={() => setActiveView('menu')} />;
  if (activeView === 'devices')        return <DevicesScreen          onBack={() => setActiveView('menu')} />;
  if (activeView === 'status')         return <StatusScreen           onBack={() => setActiveView('menu')} />;
  if (activeView === 'notifications')  return <NotificationsScreen    onBack={() => setActiveView('menu')} />;
  if (activeView === 'activities')     return <ActivitiesScreen       onBack={() => setActiveView('menu')} />;
  if (activeView === 'buddies')        return <BuddiesScreen          onBack={() => setActiveView('menu')} />;
  if (activeView === 'messages')       return <MessagesScreen         onBack={() => setActiveView('menu')} />;
  if (activeView === 'reports')        return <ReportsInboxScreen     onBack={() => setActiveView('menu')} />;
  if (activeView === 'help')           return <HelpCenterScreen       onBack={() => setActiveView('menu')} />;

  /* ── Authenticated: account dashboard ──────────────────────────────────── */
  return (
    <div className={styles.screen}>
      {/* Email verification banner */}
      {user?.emailVerified === false && (
        <button className={styles.verifyBanner} onClick={() => setShowVerify(true)}>
          <span className={styles.verifyText}>Your email is not verified.</span>
          <span className={styles.verifyAction}>Verify now →</span>
        </button>
      )}

      {/* ── Profile Hero ────────────────────────────────────────────────── */}
      <div className={styles.profileHero}>
        {/* Gradient cover with dot-pattern overlay */}
        <div className={styles.heroCover} />

        <div className={styles.heroBody}>
          {/* Avatar + online dot */}
          <div className={styles.heroAvatarRing}>
            <div className={styles.heroAvatar}>
              {user?.avatarUrl || user?.thumbnailUrl ? (
                <img
                  src={user.avatarUrl || user.thumbnailUrl}
                  alt={user?.displayName || user?.userName || 'User'}
                  className={styles.heroAvatarImg}
                />
              ) : (
                <span className={styles.heroAvatarInitial}>
                  {user?.displayName?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            {isOnline && <span className={styles.onlineDot} />}
          </div>

          <div className={styles.heroName}>{user?.displayName || user?.userName || 'User'}</div>

          {/* Rank pill */}
          {rank && <div className={styles.heroRankPill}>{rank}</div>}

          {/* Stats bar */}
          {stats.length > 0 && (
            <div className={styles.heroStats}>
              {stats.map((s, i) => (
                <div key={s.label} className={styles.heroStatItem}>
                  {i > 0 && <div className={styles.heroStatDivider} />}
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatValue}>{s.value}</span>
                    <span className={styles.heroStatLabel}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className={styles.heroActions}>
            <button className={styles.heroPrimaryBtn} onClick={() => setActiveView('profile')}>
              View Profile
            </button>
            <button className={styles.heroOutlineBtn} onClick={() => setActiveView('settings')}>
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* ── Social ────────────────────────────────────────────────────────── */}
      <div className={styles.menuSection}>
        <div className={styles.sectionLabel}>Social</div>
        <div className={styles.sectionCard}>
          <MenuItem icon="buddies"  iconColor="blue"  label="Buddies"
            subtitle="Friends & following"
            onClick={() => setActiveView('buddies')} />
          <MenuItem icon="messages" iconColor="blue"  label="Messages"
            subtitle={unreadMessages > 0 ? `${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''}` : 'Private messages'}
            badge={unreadMessages}
            onClick={() => setActiveView('messages')} last />
        </div>
      </div>

      {/* ── Account ───────────────────────────────────────────────────────── */}
      <div className={styles.menuSection}>
        <div className={styles.sectionLabel}>Account</div>
        <div className={styles.sectionCard}>
          <MenuItem icon="settings" iconColor="green" label="Account Settings"
            subtitle="Profile, privacy & theme"
            onClick={() => setActiveView('settings')} />
          <MenuItem icon="pen"      iconColor="green" label="Username"
            subtitle={user?.userName ? `@${user.userName}` : 'Change your display name'}
            onClick={() => setActiveView('username')} />
          <MenuItem icon="status"   iconColor="green" label="Status"
            subtitle="Set your online visibility"
            onClick={() => setActiveView('status')} />
          <MenuItem icon="phone"    iconColor="green" label="Devices"
            subtitle="Manage connected devices"
            onClick={() => setActiveView('devices')} last />
        </div>
      </div>

      {/* ── Activity ──────────────────────────────────────────────────────── */}
      <div className={styles.menuSection}>
        <div className={styles.sectionLabel}>Activity</div>
        <div className={styles.sectionCard}>
          <MenuItem icon="bell"     iconColor="amber" label="Notifications"
            subtitle={unreadCount > 0 ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
            badge={unreadCount}
            onClick={() => setActiveView('notifications')} />
          <MenuItem icon="activity" iconColor="amber" label="Activity"
            subtitle="Your posts, replies & history"
            onClick={() => setActiveView('activities')} last={!isModerator} />
          {isModerator && (
            <MenuItem icon="shield" iconColor="red"   label="Reports Inbox"
              subtitle="Review flagged content"
              onClick={() => setActiveView('reports')} last />
          )}
        </div>
      </div>

      {/* ── Support ───────────────────────────────────────────────────────── */}
      <div className={styles.menuSection}>
        <div className={styles.sectionLabel}>Support</div>
        <div className={styles.sectionCard}>
          <MenuItem icon="help" iconColor="neutral" label="Help Center"
            subtitle="FAQ, guidelines & contact"
            onClick={() => setActiveView('help')} />
          <MenuItem icon="info" iconColor="neutral" label="About IndiaForums"
            subtitle="Version 1.0 · Community platform"
            onClick={() => {}} last />
        </div>
      </div>

      <button className={styles.logoutBtn} onClick={logout}>Sign Out</button>
    </div>
  );
}
