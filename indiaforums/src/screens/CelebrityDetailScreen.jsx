import { useState, useMemo, useCallback, useEffect } from 'react';
import styles from './CelebrityDetailScreen.module.css';
import useCelebrityBiography from '../hooks/useCelebrityBiography';
import useCelebrityFans from '../hooks/useCelebrityFans';

const TABS = [
  { id: 'biography', label: 'Biography' },
  { id: 'fans',      label: 'Fans' },
];

// ── Image lightbox overlay ──────────────────────────────────────────────────
function ImageLightbox({ images, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const img = images[index];
  const hasMultiple = images.length > 1;

  const goPrev = useCallback(() => setIndex(i => (i - 1 + images.length) % images.length), [images.length]);
  const goNext = useCallback(() => setIndex(i => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext]);

  return (
    <div className={styles.lightbox} onClick={onClose}>
      <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
        {/* Close */}
        <button className={styles.lightboxClose} onClick={onClose}>✕</button>

        {/* Counter */}
        {hasMultiple && (
          <div className={styles.lightboxCounter}>
            {index + 1} / {images.length}
          </div>
        )}

        {/* Image */}
        <img className={styles.lightboxImg} src={img.src} alt={img.alt} />

        {/* Caption */}
        {img.alt && <div className={styles.lightboxCaption}>{img.alt}</div>}

        {/* Nav arrows */}
        {hasMultiple && (
          <>
            <button className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={goPrev}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 4L7 10L13 16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={goNext}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 4L13 10L7 16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const SECTION_ICONS = {
  'Bio':                       '👤',
  'Physical Stats':            '📏',
  'Career':                    '🎬',
  'Personal Life':             '📋',
  'Relationships':             '💑',
  'Family':                    '👨‍👩‍👧‍👦',
  'Favourites':                '❤️',
  'Personal Belongings / Assets': '🏎️',
  'Money Factor':              '💰',
  'Awards/Honours':            '🏆',
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatCount(n) {
  if (!n || n === 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function joinList(arr) {
  if (!arr || arr.length === 0) return '';
  return arr.join(', ');
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanValue(raw) {
  return raw
    .replace(/<a[^>]*class="celeb-about__info-edit"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<img[^>]*icons\.svg[^>]*>/gi, '')
    .replace(/<\/?p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<h4[^>]*>/gi, '')
    .replace(/<\/h4>/gi, ': ')
    .replace(/<\/?div[^>]*>/gi, '')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

// ── Parse bio HTML into structured sections ─────────────────────────────────
function parseBioHtml(html) {
  if (!html) return [];

  const sections = [];
  const headingRegex = /<h3[^>]*class="celeb-about__info-itemtitle"[^>]*>([\s\S]*?)<\/h3>/g;
  const headings = [];
  let m;

  while ((m = headingRegex.exec(html)) !== null) {
    headings.push({ title: stripHtml(m[1]), pos: m.index });
  }

  // Extract images from a chunk of HTML
  function extractImages(chunk) {
    const imgs = [];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi;
    let im;
    while ((im = imgRegex.exec(chunk)) !== null) {
      if (!im[1].includes('icons.svg') && !im[1].includes('sign')) {
        imgs.push({ src: im[1], alt: im[2] || '' });
      }
    }
    return imgs;
  }

  // Extract label/value pairs from a chunk
  function extractItems(chunk) {
    const items = [];
    // Match subitems that have a title div
    const subRegex = /<div class="celeb-about__info-subitemtitle">\s*([\s\S]*?)\s*<\/div>\s*<div class="celeb-about__info-subitemcontent">\s*([\s\S]*?)\s*<\/div>/g;
    let sub;
    while ((sub = subRegex.exec(chunk)) !== null) {
      const label = stripHtml(sub[1]);
      const rawValue = cleanValue(sub[2]);
      const value = stripHtml(rawValue).replace(/^-\s*/, '');
      if (label && value) {
        items.push({ label, value });
      }
    }

    // Also look for h4-based sub-items (like Career/Debut has h4 sub-categories)
    const h4Regex = /<h4[^>]*>\s*([\s\S]*?)\s*<\/h4>\s*<div class="celeb-about__info-subitemcontent">\s*([\s\S]*?)\s*<\/div>/g;
    let h4;
    while ((h4 = h4Regex.exec(chunk)) !== null) {
      const label = stripHtml(h4[1]).replace(/:$/, '');
      const value = stripHtml(cleanValue(h4[2])).replace(/^-\s*/, '');
      if (label && value) {
        // Avoid duplicate if already captured via subitem regex
        const exists = items.some(i => i.label === label);
        if (!exists) items.push({ label, value });
      }
    }

    return items;
  }

  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].pos;
    const end = i + 1 < headings.length ? headings[i + 1].pos : html.length;
    const chunk = html.substring(start, end);
    const items = extractItems(chunk);
    const images = extractImages(chunk);

    if (items.length > 0 || images.length > 0) {
      sections.push({
        title: headings[i].title,
        items,
        images,
      });
    }
  }

  return sections;
}

// ── Loading / Error ─────────────────────────────────────────────────────────
function Spinner({ text = 'Loading...' }) {
  return (
    <div className={styles.stateWrap}>
      <div className={styles.spinner} />
      <span className={styles.stateText}>{text}</span>
    </div>
  );
}

function ErrorBlock({ message, onRetry }) {
  return (
    <div className={styles.stateWrap}>
      <span className={styles.stateIcon}>⚠️</span>
      <span className={styles.stateText}>{message}</span>
      {onRetry && <button className={styles.retryBtn} onClick={onRetry}>Retry</button>}
    </div>
  );
}

// ── Bio skeleton ────────────────────────────────────────────────────────────
function BioSkeleton() {
  return (
    <div className={styles.tabBody}>
      <div className={styles.statsRow}>
        {[1, 2, 3, 4].map(i => <div key={i} className={styles.skStat} />)}
      </div>
      {[1, 2].map(i => (
        <div key={i} className={styles.skCard}>
          <div className={styles.skCardHead} />
          <div className={styles.skLine} />
          <div className={styles.skLine} />
          <div className={styles.skLineShort} />
        </div>
      ))}
    </div>
  );
}

// ── Stats bar ───────────────────────────────────────────────────────────────
function StatsBar({ biography }) {
  const items = [
    biography.fanCount    > 0 && { icon: '👥', val: formatCount(biography.fanCount),    label: 'Fans' },
    biography.articleCount > 0 && { icon: '📰', val: formatCount(biography.articleCount), label: 'Articles' },
    biography.videoCount  > 0 && { icon: '🎬', val: formatCount(biography.videoCount),  label: 'Videos' },
    biography.photoCount  > 0 && { icon: '📸', val: formatCount(biography.photoCount),  label: 'Photos' },
    biography.viewCount   > 0 && { icon: '👁', val: formatCount(biography.viewCount),   label: 'Views' },
    biography.topicsCount > 0 && { icon: '💬', val: formatCount(biography.topicsCount), label: 'Topics' },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className={styles.statsRow}>
      {items.map((s) => (
        <div key={s.label} className={styles.statChip}>
          <span className={styles.statIcon}>{s.icon}</span>
          <span className={styles.statVal}>{s.val}</span>
          <span className={styles.statLabel}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Parsed bio section card ─────────────────────────────────────────────────
function BioSection({ section, onImagePress }) {
  const icon = SECTION_ICONS[section.title] || '📌';

  return (
    <div className={styles.bioSection}>
      <div className={styles.bioSectionHeader}>
        <span className={styles.bioSectionIcon}>{icon}</span>
        <span className={styles.bioSectionTitle}>{section.title}</span>
      </div>

      {section.items.length > 0 && (
        <div className={styles.bioSectionBody}>
          {section.items.map((item, i) => (
            <div key={i} className={styles.bioRow}>
              <span className={styles.bioLabel}>{item.label}</span>
              <span className={styles.bioValue}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {section.images.length > 0 && (
        <div className={styles.bioImages}>
          {section.images.map((img, i) => (
            <div
              key={i}
              className={styles.bioImageWrap}
              onClick={() => onImagePress(section.images, i)}
            >
              <img
                className={styles.bioImage}
                src={img.src}
                alt={img.alt}
                loading="lazy"
              />
              <div className={styles.bioImageZoom}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="#fff" strokeWidth="1.5"/>
                  <path d="M11 11L14.5 14.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M7 5V9M5 7H9" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quick-facts card (fallback for no bioHtml) ──────────────────────────────
function FactsCard({ title, icon, items }) {
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return null;

  return (
    <div className={styles.bioSection}>
      <div className={styles.bioSectionHeader}>
        <span className={styles.bioSectionIcon}>{icon}</span>
        <span className={styles.bioSectionTitle}>{title}</span>
      </div>
      <div className={styles.bioSectionBody}>
        {filtered.map((f) => (
          <div key={f.label} className={styles.bioRow}>
            <span className={styles.bioLabel}>{f.label}</span>
            <span className={styles.bioValue}>{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Biography tab ───────────────────────────────────────────────────────────
function BiographyTab({ personId }) {
  const { biography, loading, error } = useCelebrityBiography(personId);
  const bioSections = useMemo(
    () => parseBioHtml(biography?.bioHtml),
    [biography?.bioHtml]
  );
  const [lightbox, setLightbox] = useState(null);

  const openLightbox = useCallback((images, index) => {
    setLightbox({ images, index });
  }, []);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  if (loading) return <BioSkeleton />;
  if (error)   return <ErrorBlock message={error} />;
  if (!biography) return <ErrorBlock message="No biography found" />;

  const hasBioSections = bioSections.length > 0;

  return (
    <div className={styles.tabBody}>
      {/* Image lightbox */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={closeLightbox}
        />
      )}

      {/* Stats */}
      <StatsBar biography={biography} />

      {/* About */}
      {biography.shortDesc && (
        <div className={styles.aboutCard}>
          <p className={styles.aboutText}>{biography.shortDesc}</p>
        </div>
      )}

      {/* Parsed bio sections from HTML */}
      {hasBioSections && (
        <div className={styles.bioSections}>
          {bioSections.map((section, i) => (
            <BioSection key={i} section={section} onImagePress={openLightbox} />
          ))}
        </div>
      )}

      {/* Fallback: structured facts from personInfos */}
      {!hasBioSections && (
        <div className={styles.bioSections}>
          <FactsCard title="Personal Info" icon="👤" items={[
            biography.profession?.length > 0 && { label: 'Profession', value: joinList(biography.profession) },
            biography.nicknames?.length > 0  && { label: 'Nicknames',  value: joinList(biography.nicknames) },
            biography.birthDate   && { label: 'Date of Birth', value: formatDate(biography.birthDate) },
            biography.birthPlace  && { label: 'Birthplace',    value: biography.birthPlace },
            biography.zodiacSign  && { label: 'Zodiac Sign',   value: biography.zodiacSign },
            biography.nationality && { label: 'Nationality',   value: biography.nationality },
            biography.hometown    && { label: 'Hometown',      value: biography.hometown },
            biography.religion    && { label: 'Religion',      value: biography.religion },
          ]} />

          <FactsCard title="Physical" icon="📏" items={[
            biography.height && { label: 'Height', value: biography.height },
            biography.weight && { label: 'Weight', value: biography.weight + ' kg' },
          ]} />

          <FactsCard title="Career" icon="🎬" items={[
            biography.education   && { label: 'Qualification', value: biography.education },
            biography.debut?.length > 0 && { label: 'Debut', value: joinList(biography.debut) },
            biography.netWorth    && { label: 'Net Worth', value: biography.netWorth },
          ]} />

          <FactsCard title="Family" icon="👨‍👩‍👧‍👦" items={[
            biography.maritalStatus && { label: 'Status',   value: biography.maritalStatus },
            biography.spouse?.length > 0   && { label: 'Spouse',   value: joinList(biography.spouse) },
            biography.children?.length > 0 && { label: 'Children', value: joinList(biography.children) },
            biography.parents?.length > 0  && { label: 'Parents',  value: joinList(biography.parents) },
          ]} />

          <FactsCard title="Favorites" icon="❤️" items={[
            biography.favFilms?.length > 0  && { label: 'Films',  value: joinList(biography.favFilms) },
            biography.favActors?.length > 0 && { label: 'Actors', value: joinList(biography.favActors) },
            biography.favFood?.length > 0   && { label: 'Food',   value: joinList(biography.favFood) },
            biography.hobbies?.length > 0   && { label: 'Hobbies', value: joinList(biography.hobbies) },
          ]} />
        </div>
      )}

      {/* Social media */}
      {(biography.instagram || biography.twitter || biography.facebook) && (
        <div className={styles.bioSection}>
          <div className={styles.bioSectionHeader}>
            <span className={styles.bioSectionIcon}>🌐</span>
            <span className={styles.bioSectionTitle}>Social Media</span>
          </div>
          <div className={styles.socialList}>
            {biography.instagram && (
              <div className={styles.socialItem}>
                <div className={styles.socialBadge} style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                  <span className={styles.socialBadgeIcon}>📷</span>
                </div>
                <div className={styles.socialInfo}>
                  <span className={styles.socialPlatform}>Instagram</span>
                  <span className={styles.socialHandle}>@{biography.instagram}</span>
                </div>
              </div>
            )}
            {biography.twitter && (
              <div className={styles.socialItem}>
                <div className={styles.socialBadge} style={{ background: '#000' }}>
                  <span className={styles.socialBadgeIcon}>𝕏</span>
                </div>
                <div className={styles.socialInfo}>
                  <span className={styles.socialPlatform}>X (Twitter)</span>
                  <span className={styles.socialHandle}>@{biography.twitter}</span>
                </div>
              </div>
            )}
            {biography.facebook && (
              <div className={styles.socialItem}>
                <div className={styles.socialBadge} style={{ background: '#1877f2' }}>
                  <span className={styles.socialBadgeIcon}>f</span>
                </div>
                <div className={styles.socialInfo}>
                  <span className={styles.socialPlatform}>Facebook</span>
                  <span className={styles.socialHandle}>{biography.facebook}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.spacer} />
    </div>
  );
}

// ── Fans tab ────────────────────────────────────────────────────────────────
function FansTab({ personId }) {
  const { fans, pagination, loading, error, loadMore } = useCelebrityFans(personId);

  if (loading && fans.length === 0) return <Spinner text="Loading fans..." />;
  if (error && fans.length === 0)   return <ErrorBlock message={error} />;

  if (fans.length === 0) {
    return (
      <div className={styles.stateWrap}>
        <span className={styles.stateIcon}>👥</span>
        <span className={styles.stateText}>No fans yet</span>
      </div>
    );
  }

  return (
    <div className={styles.tabBody}>
      {pagination?.totalCount > 0 && (
        <div className={styles.fansHeader}>
          <span className={styles.fansTotal}>{pagination.totalCount.toLocaleString()}</span>
          <span className={styles.fansLabel}>fans</span>
        </div>
      )}

      <div className={styles.fansGrid}>
        {fans.map((fan) => (
          <div key={fan.id} className={styles.fanCard}>
            <div
              className={styles.fanAvatar}
              style={{ background: fan.avatarAccent || 'var(--brand)' }}
            >
              <span className={styles.fanInitial}>{fan.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className={styles.fanName}>{fan.name}</div>
            {fan.level && <div className={styles.fanLevel}>{fan.level}</div>}
          </div>
        ))}
      </div>

      {pagination?.hasNextPage && (
        <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}

      <div className={styles.spacer} />
    </div>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function CelebrityDetailScreen({ celebrity }) {
  const [activeTab, setActiveTab] = useState('biography');

  if (!celebrity) return null;

  const trendLabel = celebrity.trend === 'up'
    ? `▲ ${celebrity.rankDiff}`
    : celebrity.trend === 'down'
      ? `▼ ${celebrity.rankDiff}`
      : '—';

  const trendCls = celebrity.trend === 'up'
    ? styles.heroTrendUp
    : celebrity.trend === 'down'
      ? styles.heroTrendDown
      : styles.heroTrendNeutral;

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        {celebrity.thumbnail && (
          <img className={styles.heroImg} src={celebrity.thumbnail} alt={celebrity.name} />
        )}
        <div className={styles.heroScrim} />

        <div className={styles.heroTop}>
          <div className={styles.heroRankPill}>
            <span className={styles.heroRankNum}>#{celebrity.rank}</span>
            <span className={`${styles.heroTrendBadge} ${trendCls}`}>{trendLabel}</span>
          </div>
        </div>

        <div className={styles.heroFlex} />

        <div className={styles.heroBottom}>
          <h1 className={styles.heroName}>{celebrity.name}</h1>
          {celebrity.shortDesc && (
            <p className={styles.heroDesc}>{celebrity.shortDesc}</p>
          )}
          {celebrity.prevRank > 0 && (
            <div className={styles.heroPrevRank}>Previous rank: #{celebrity.prevRank}</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'biography' && <BiographyTab personId={celebrity.id} />}
      {activeTab === 'fans'      && <FansTab personId={celebrity.id} />}
    </div>
  );
}
