import { useState } from 'react';
import styles from './SideDrawer.module.css';

/* ── Collapse-arrow ──────────────────────────────────────────────────────────── */
const ChevronIcon = ({ open }) => (
  <svg
    width="12" height="12" viewBox="0 0 12 12" fill="none"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
  >
    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Expand-right arrow (Forum sub-items) ────────────────────────────────────── */
const ArrowRight = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── NEW badge ───────────────────────────────────────────────────────────────── */
const NewBadge = () => <span className={styles.newBadge}>NEW</span>;

/* ── Toggle switch ───────────────────────────────────────────────────────────── */
function Toggle({ on, onToggle }) {
  return (
    <button
      className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
      onClick={onToggle}
      aria-label="Toggle dark mode"
    >
      <span className={styles.toggleThumb} />
    </button>
  );
}

/* ── Section header (collapsible) ────────────────────────────────────────────── */
function SectionGroup({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.sectionGroup}>
      <button className={styles.sectionGroupHeader} onClick={() => setOpen((o) => !o)}>
        <span className={styles.sectionGroupIcon}>{icon}</span>
        <span className={styles.sectionGroupTitle}>{title}</span>
        <ChevronIcon open={open} />
      </button>
      {open && <div className={styles.sectionGroupBody}>{children}</div>}
    </div>
  );
}

/* ── Nav row ─────────────────────────────────────────────────────────────────── */
function NavRow({ icon, label, badge, hasArrow, onClick, indent }) {
  return (
    <button
      className={`${styles.navRow} ${indent ? styles.navRowIndent : ''}`}
      onClick={onClick}
    >
      {icon && <span className={styles.navRowIcon}>{icon}</span>}
      <span className={styles.navRowLabel}>{label}</span>
      {badge && <NewBadge />}
      {hasArrow && <span className={styles.navRowArrow}><ArrowRight /></span>}
    </button>
  );
}

/* ── Social icon button ──────────────────────────────────────────────────────── */
function SocialBtn({ color, children }) {
  return (
    <button className={styles.socialBtn} style={{ background: color }}>
      {children}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   SIDE DRAWER
   ════════════════════════════════════════════════════════════════════════════════ */
export default function SideDrawer({ open, onClose, darkMode, onDarkModeToggle, onNavigate }) {
  return (
    <>
      {/* Scrim */}
      <div
        className={`${styles.scrim} ${open ? styles.scrimVisible : ''}`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={styles.drawerHeader}>
          {/* Logo */}
          <div className={styles.headerLogo}>
            <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
              <polygon points="13,0 23,6 13,13" fill="#16A34A"/>
              <polygon points="13,0 13,13 3,6"  fill="#22C55E"/>
              <polygon points="23,6 23,20 13,13" fill="#CA8A04"/>
              <polygon points="3,6  3,20 13,13"  fill="#7C3AED"/>
              <polygon points="23,20 13,26 13,13" fill="#EA580C"/>
              <polygon points="13,26  3,20 13,13" fill="#DB2777"/>
            </svg>
            <span className={styles.headerWordmark}>indiaforums</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className={styles.drawerBody}>

          {/* Language selector */}
          <div className={styles.langSection}>
            <div className={styles.langSelect}>
              <span className={styles.langText}>Select Language</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={styles.poweredBy}>
              Powered By &nbsp;
              <span style={{ color: '#4285F4', fontWeight: 700 }}>G</span>
              <span style={{ color: '#EA4335', fontWeight: 700 }}>o</span>
              <span style={{ color: '#FBBC05', fontWeight: 700 }}>o</span>
              <span style={{ color: '#4285F4', fontWeight: 700 }}>g</span>
              <span style={{ color: '#34A853', fontWeight: 700 }}>l</span>
              <span style={{ color: '#EA4335', fontWeight: 700 }}>e</span>
              &nbsp;Translate
            </div>
          </div>

          <div className={styles.divider} />

          {/* Dark mode toggle */}
          <div className={styles.darkModeRow}>
            <span className={styles.darkModeLabel}>Dark Mode</span>
            <Toggle on={darkMode} onToggle={onDarkModeToggle} />
          </div>

          <div className={styles.divider} />

          {/* Home */}
          <NavRow
            icon="🏠"
            label="Home"
            onClick={() => { onNavigate('home'); onClose(); }}
          />

          <div className={styles.divider} />

          {/* NEWS section */}
          <SectionGroup title="NEWS" icon="📰" defaultOpen={true}>
            <NavRow icon="📺" label="Television"
              onClick={() => { onNavigate('news'); onClose(); }} indent />
            <NavRow icon="🎬" label="Movies"
              onClick={() => { onNavigate('news'); onClose(); }} indent />
            <NavRow icon="💻" label="Digital"
              onClick={() => { onNavigate('news'); onClose(); }} indent />
            <NavRow icon="💄" label="Lifestyle" badge
              onClick={() => { onNavigate('news'); onClose(); }} indent />
            <NavRow icon="⚽" label="Sports" badge
              onClick={() => { onNavigate('news'); onClose(); }} indent />
          </SectionGroup>

          <div className={styles.divider} />

          {/* FORUMS section */}
          <SectionGroup title="FORUMS" icon="💬" defaultOpen={true}>
            <NavRow icon="📋" label="All Topics"
              onClick={() => { onNavigate('forums'); onClose(); }} indent />
            <NavRow icon="🎓" label="Education" hasArrow
              onClick={() => { onNavigate('forums'); onClose(); }} indent />
            <NavRow icon="🎭" label="Entertainment" hasArrow
              onClick={() => { onNavigate('forums'); onClose(); }} indent />
            <NavRow icon="💰" label="Finance & Investments" hasArrow
              onClick={() => { onNavigate('forums'); onClose(); }} indent />
            <NavRow icon="💬" label="General Discussion" hasArrow
              onClick={() => { onNavigate('forums'); onClose(); }} indent />
            <NavRow icon="🎯" label="Hobbies & Interests" hasArrow
              onClick={() => { onNavigate('forums'); onClose(); }} indent />
            <button className={styles.seeMoreBtn}
              onClick={() => { onNavigate('forums'); onClose(); }}>
              See More
            </button>
          </SectionGroup>

          <div className={styles.divider} />

          {/* Feature links */}
          <NavRow icon="⭐" label="Celebrities"
            onClick={() => { onNavigate('celebrities'); onClose(); }} />
          <NavRow icon="🎬" label="Videos"
            onClick={() => { onNavigate('videos'); onClose(); }} />
          <NavRow icon="🖼️" label="Galleries"
            onClick={() => { onNavigate('galleries'); onClose(); }} />
          <NavRow icon="📖" label="Fan Fictions"
            onClick={() => { onNavigate('fan fictions'); onClose(); }} />
          <NavRow icon="❓" label="Quizzes" badge
            onClick={() => { onNavigate('quizzes'); onClose(); }} />
          <NavRow icon="⚡" label="Shorts" badge
            onClick={() => { onNavigate('shorts'); onClose(); }} />
          <NavRow icon="🌐" label="Web Stories" badge
            onClick={() => { onNavigate('web stories'); onClose(); }} />

          <div className={styles.divider} />

          {/* Help Center */}
          <NavRow icon="❓" label="Help Center" onClick={onClose} />

          <div className={styles.divider} />

          {/* Follow Us On */}
          <div className={styles.socialSection}>
            <div className={styles.socialLabel}>Follow Us On</div>
            <div className={styles.socialRow}>
              {/* Facebook */}
              <SocialBtn color="#1877F2">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                  <path d="M6.5 1H8V3H6.5C6.2 3 6 3.2 6 3.5V4.5H8L7.7 6.5H6V10H4V6.5H2.5V4.5H4V3.5C4 2.1 5.1 1 6.5 1Z"/>
                </svg>
              </SocialBtn>
              {/* X / Twitter */}
              <SocialBtn color="#000000">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                  <path d="M1 1.5L4.2 5.6 1 9H2L4.7 6.3 7 9H9L5.7 4.8 8.7 1.5H7.7L5.2 4 3 1.5H1Z"/>
                </svg>
              </SocialBtn>
              {/* YouTube */}
              <SocialBtn color="#FF0000">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                  <rect x="0.5" y="2" width="9" height="6" rx="1.5" fill="#FF0000"/>
                  <path d="M4 3.5l3 1.5-3 1.5V3.5Z" fill="white"/>
                </svg>
              </SocialBtn>
              {/* Instagram */}
              <SocialBtn color="linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect x="1" y="1" width="8" height="8" rx="2" stroke="white" strokeWidth="1"/>
                  <circle cx="5" cy="5" r="2" stroke="white" strokeWidth="1"/>
                  <circle cx="7.5" cy="2.5" r="0.7" fill="white"/>
                </svg>
              </SocialBtn>
              {/* Pinterest */}
              <SocialBtn color="#E60023">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                  <path d="M5 1C2.8 1 1 2.8 1 5c0 1.7 1 3.1 2.4 3.7-.03-.3-.06-.8 0-1.1L4 6c.2.4.8.8 1.3.8 1.7 0 2.9-1.6 2.9-3.5 0-1.5-1.2-2.8-3-2.8C3.2 0.5 2 2 2 3.5c0 .8.4 1.6 1 2 .07.07.1.06.09-.08l-.2-.9c0-.06-.06-.14 0-.2.2-.2.4-.6.5-.9.03-.1-.05-.2-.1-.15C2.8 3.9 2.5 4.2 2.5 4.6c0 .6.2 1 .6 1l.4-.1-1.7 7 .07.02 1.9-4.2.7 2.6.06.03C6 9 8 7.2 8 5 8 2.8 6.7 1 5 1Z"/>
                </svg>
              </SocialBtn>
              {/* LinkedIn */}
              <SocialBtn color="#0A66C2">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                  <rect x="1" y="3.5" width="1.8" height="5.5" rx="0.3"/>
                  <circle cx="1.9" cy="1.9" r="1.1"/>
                  <path d="M4 3.5h1.7v.8C6 3.8 6.6 3.3 7.5 3.3 8.9 3.3 9 4.3 9 5.4V9H7.3V5.8c0-.7-.3-1-.9-1-.7 0-1 .5-1 1.1V9H4V3.5Z"/>
                </svg>
              </SocialBtn>
            </div>
          </div>

          <div className={styles.drawerFooter} />
        </div>
      </div>
    </>
  );
}
