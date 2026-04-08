import { useState } from 'react';
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

export default function MySpaceScreen() {
  const { isAuthenticated, isLoading, isModerator, user, logout } = useAuth();
  const [showVerify, setShowVerify] = useState(false);
  const [activeView, setActiveView] = useState('menu'); // 'menu' | 'profile' | 'settings' | 'username' | 'devices' | 'status' | 'notifications' | 'activities' | 'buddies' | 'messages' | 'reports'
  const { count: unreadCount } = useUnreadCount();
  const { count: unreadMessages } = useUnreadMessageCount();

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
        <button className={styles.backBtn} onClick={() => setActiveView('menu')}>
          ← Back
        </button>
        <ProfileScreen userId={null} />
      </div>
    );
  }

  if (activeView === 'settings') {
    return <AccountSettingsScreen onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'username') {
    return <UsernameScreen onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'devices') {
    return <DevicesScreen onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'status') {
    return <StatusScreen onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'notifications') {
    return <NotificationsScreen onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'activities') {
    return <ActivitiesScreen onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'buddies') {
    return <BuddiesScreen onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'messages') {
    return <MessagesScreen onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'reports') {
    return <ReportsInboxScreen onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'help') {
    return <HelpCenterScreen onBack={() => setActiveView('menu')} />;
  }

  /* ── Authenticated: account dashboard ──────────────────────────────────── */
  return (
    <div className={styles.screen}>
      {/* Email verification banner */}
      {user && user.emailVerified === false && (
        <button className={styles.verifyBanner} onClick={() => setShowVerify(true)}>
          <span className={styles.verifyText}>Your email is not verified.</span>
          <span className={styles.verifyAction}>Verify now</span>
        </button>
      )}

      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user?.displayName || user?.userName || 'User'}
              className={styles.avatarImg}
            />
          ) : (
            user?.displayName?.[0]?.toUpperCase() || 'U'
          )}
        </div>
        <div className={styles.profileInfo}>
          <div className={styles.username}>{user?.displayName || user?.userName || 'User'}</div>
          <div className={styles.email}>{user?.email || ''}</div>
        </div>
      </div>

      <div className={styles.menuList}>
        <div className={styles.menuItem} onClick={() => setActiveView('profile')}>
          <span className={styles.menuIcon}>👤</span>
          <span className={styles.menuLabel}>My Profile</span>
          <span className={styles.menuArrow}>›</span>
        </div>
        <div className={styles.menuItem} onClick={() => setActiveView('buddies')}>
          <span className={styles.menuIcon}>👥</span>
          <span className={styles.menuLabel}>Buddies</span>
          <span className={styles.menuArrow}>›</span>
        </div>
        <div className={styles.menuItem} onClick={() => setActiveView('messages')}>
          <span className={styles.menuIcon}>✉️</span>
          <span className={styles.menuLabel}>Messages</span>
          {unreadMessages > 0 && <span className={styles.menuBadge}>{unreadMessages}</span>}
          <span className={styles.menuArrow}>›</span>
        </div>
        <div className={styles.menuItem} onClick={() => setActiveView('settings')}>
          <span className={styles.menuIcon}>⚙️</span>
          <span className={styles.menuLabel}>Account Settings</span>
          <span className={styles.menuArrow}>›</span>
        </div>
        <div className={styles.menuItem} onClick={() => setActiveView('username')}>
          <span className={styles.menuIcon}>✏️</span>
          <span className={styles.menuLabel}>Username</span>
          <span className={styles.menuArrow}>›</span>
        </div>
        <div className={styles.menuItem} onClick={() => setActiveView('status')}>
          <span className={styles.menuIcon}>🟢</span>
          <span className={styles.menuLabel}>Status</span>
          <span className={styles.menuArrow}>›</span>
        </div>
        <div className={styles.menuItem} onClick={() => setActiveView('notifications')}>
          <span className={styles.menuIcon}>🔔</span>
          <span className={styles.menuLabel}>Notifications</span>
          {unreadCount > 0 && <span className={styles.menuBadge}>{unreadCount}</span>}
          <span className={styles.menuArrow}>›</span>
        </div>
        <div className={styles.menuItem} onClick={() => setActiveView('devices')}>
          <span className={styles.menuIcon}>📱</span>
          <span className={styles.menuLabel}>Devices</span>
          <span className={styles.menuArrow}>›</span>
        </div>
        <div className={styles.menuItem} onClick={() => setActiveView('activities')}>
          <span className={styles.menuIcon}>📋</span>
          <span className={styles.menuLabel}>Activity</span>
          <span className={styles.menuArrow}>›</span>
        </div>
        {isModerator && (
          <div className={styles.menuItem} onClick={() => setActiveView('reports')}>
            <span className={styles.menuIcon}>🛡️</span>
            <span className={styles.menuLabel}>Reports Inbox</span>
            <span className={styles.menuArrow}>›</span>
          </div>
        )}
        <div className={styles.menuItem} onClick={() => setActiveView('help')}>
          <span className={styles.menuIcon}>❓</span>
          <span className={styles.menuLabel}>Help Center</span>
          <span className={styles.menuArrow}>›</span>
        </div>
      </div>

      <button className={styles.logoutBtn} onClick={logout}>
        Sign Out
      </button>
    </div>
  );
}
