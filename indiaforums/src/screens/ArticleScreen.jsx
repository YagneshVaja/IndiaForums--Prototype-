import { useState, useMemo, useRef } from 'react';
import styles from './ArticleScreen.module.css';
import { getRelatedArticles } from '../data/newsData';
import useArticleDetails from '../hooks/useArticleDetails';

// ── Reactions ─────────────────────────────────────────────────────────────────
const REACTIONS = [
  { id: 'nice',  emoji: '😊', label: 'Nice'  },
  { id: 'great', emoji: '👍', label: 'Great' },
  { id: 'loved', emoji: '❤️', label: 'Loved' },
  { id: 'lol',   emoji: '😂', label: 'LOL'   },
  { id: 'omg',   emoji: '😮', label: 'OMG'   },
  { id: 'cry',   emoji: '😢', label: 'Cry'   },
  { id: 'fail',  emoji: '👎', label: 'Fail'  },
];

// ── Static data ───────────────────────────────────────────────────────────────
const SOCIAL_CHANNELS = [
  { id: 'yt1', platform: 'YouTube',   handle: '@indiaforums',      count: '3.6M', bg: '#FF0000', abbr: 'YT' },
  { id: 'yt2', platform: 'YouTube',   handle: '@indiaforumshindi', count: '1.2M', bg: '#FF0000', abbr: 'YT' },
  { id: 'ig1', platform: 'Instagram', handle: '@indiaforums',      count: '1.1M', bg: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', abbr: 'IG' },
  { id: 'ig2', platform: 'Instagram', handle: '@indiaforumsglitz', count: '58.8K',bg: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', abbr: 'IG' },
  { id: 'fb1', platform: 'Facebook',  handle: '@indiaforums',      count: '2.5M', bg: '#1877F2', abbr: 'FB' },
  { id: 'x1',  platform: 'X',         handle: '@indiaforums',      count: '280K', bg: '#000',    abbr: 'X'  },
];

const CATEGORY_ENTITIES = {
  MOVIES: [
    { id: 'srk',    name: 'Shah Rukh Khan',    role: 'Actor',           emoji: '🌟', bg: 'linear-gradient(135deg,#1a1a2e,#0f3460)' },
    { id: 'dp',     name: 'Deepika Padukone',  role: 'Actress',         emoji: '✨', bg: 'linear-gradient(135deg,#831843,#db2777)' },
    { id: 'stree3', name: 'Stree 3',           role: 'Movie · 2026',    emoji: '🎬', bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)' },
  ],
  TV: [
    { id: 'anupamaa', name: 'Anupamaa',      role: 'Star Plus',         emoji: '👑', bg: 'linear-gradient(135deg,#1c3a5e,#2563eb)' },
    { id: 'yrkkh',    name: 'YRKKH',         role: 'Star Plus',         emoji: '📺', bg: 'linear-gradient(135deg,#4a1942,#7e22ce)' },
    { id: 'bb18',     name: 'Bigg Boss 18',  role: 'Colors TV',         emoji: '🎤', bg: 'linear-gradient(135deg,#2d1b69,#7c3aed)' },
  ],
  SPORTS: [
    { id: 'rohit',   name: 'Rohit Sharma',   role: 'Cricketer',         emoji: '🏏', bg: 'linear-gradient(135deg,#14532d,#16a34a)' },
    { id: 'bumrah',  name: 'Jasprit Bumrah', role: 'Cricketer',         emoji: '🏆', bg: 'linear-gradient(135deg,#1e3a8a,#f97316)' },
    { id: 'ipl',     name: 'IPL 2026',       role: 'Tournament',        emoji: '🥇', bg: 'linear-gradient(135deg,#7f1d1d,#f59e0b)' },
  ],
  DIGITAL: [
    { id: 'netflix', name: 'Netflix India',  role: 'OTT Platform',      emoji: '🎞️', bg: 'linear-gradient(135deg,#7f1d1d,#b91c1c)' },
    { id: 'prime',   name: 'Prime Video',    role: 'OTT Platform',      emoji: '📱', bg: 'linear-gradient(135deg,#1e293b,#334155)' },
    { id: 'panchayat', name: 'Panchayat S4', role: 'Web Series',        emoji: '🌾', bg: 'linear-gradient(135deg,#3b2f04,#a16207)' },
  ],
  LIFESTYLE: [
    { id: 'alia',    name: 'Alia Bhatt',     role: 'Actress · Fashion', emoji: '💄', bg: 'linear-gradient(135deg,#831843,#db2777)' },
    { id: 'ranveer', name: 'Ranveer Singh',  role: 'Actor · Style Icon',emoji: '👗', bg: 'linear-gradient(135deg,#431407,#ea580c)' },
    { id: 'deepika', name: 'Deepika Padukone',role:'Actress · Fashion', emoji: '✨', bg: 'linear-gradient(135deg,#831843,#db2777)' },
  ],
};

const CAT_TAGS = {
  TV:        ['Television', 'Hindi TV', 'Drama', 'TRP Watch', 'Star Plus', 'Colors TV'],
  MOVIES:    ['Bollywood', 'Box Office', 'Hindi Cinema', 'Film Review', 'Celeb News'],
  SPORTS:    ['Cricket', 'IPL 2026', 'Sports News', 'India Cricket', 'BCCI'],
  DIGITAL:   ['OTT', 'Web Series', 'Streaming', 'Netflix', 'Prime Video', 'Hotstar'],
  LIFESTYLE: ['Fashion', 'Bollywood Style', 'Celebrity', 'Trending', 'Wellness'],
};

const COMMENTS = [
  { id: 1, user: 'FilmLover99',   av: 'F', color: '#3558F0', time: '2 hr ago', text: 'Absolutely love this! Cannot wait for more updates. This is exactly what fans have been wanting! Great reporting 🙌', likes: 24 },
  { id: 2, user: 'TVAddict_2026', av: 'T', color: '#7c3aed', time: '3 hr ago', text: 'Saw this coming honestly — the hints were all there last week. Brilliant work by the IF team as always!', likes: 18 },
  { id: 3, user: 'Bollywood_Fan', av: 'B', color: '#db2777', time: '5 hr ago', text: 'OMG!! Cannot believe this is happening! Already sharing with all my friends right now 😍🔥', likes: 31 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function seededN(seed, min, max) {
  const x = Math.sin(seed + 1) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

function fmt(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
}

function getTopCat(article) {
  return (article.cat || '').split('·')[0].trim().toUpperCase();
}

function getSubtitle(article) {
  const cat = getTopCat(article);
  const map = {
    TV:        `The latest episode has sparked massive conversations online, with fans unable to stop discussing the unexpected twist that nobody saw coming.`,
    MOVIES:    `In the middle of an already explosive buzz, this unexpected development has added a new layer to the film's already massive online presence.`,
    SPORTS:    `This stunning moment has the entire nation talking, as fans celebrate one of the most memorable performances of the entire season.`,
    DIGITAL:   `The OTT landscape just got a whole lot more exciting, as this announcement has fans eagerly counting down the days to release.`,
    LIFESTYLE: `Once again setting the internet on fire, this revelation is being called one of the most talked-about moments of the year.`,
  };
  return map[cat] || `This story is rapidly gaining traction as social media buzzes non-stop about the latest twist in this unfolding narrative.`;
}

function buildBody(article) {
  const cat = getTopCat(article);
  const t   = article.title;
  const src = article.source || 'IF News Desk';

  const intros = {
    TV:        `In a development that has left fans completely stunned, the latest episode brought major shocks as ${t.toLowerCase().replace(/[!?]$/, '')}. Audiences across the country are reacting with disbelief and excitement on every platform.`,
    MOVIES:    `The film industry is buzzing with excitement as ${t.toLowerCase().replace(/[!?]$/, '')}. This announcement has set social media on fire, with fans expressing their delight across every corner of the internet.`,
    SPORTS:    `In a thrilling turn of events, ${t.toLowerCase().replace(/[!?]$/, '')}. The moment has already been replayed millions of times and is being called one of the highlights of the entire season.`,
    DIGITAL:   `The OTT world is witnessing a landmark moment as ${t.toLowerCase().replace(/[!?]$/, '')}. Viewers and critics alike are heaping praise on this latest development that took everyone by surprise.`,
    LIFESTYLE: `Setting new trends as always, ${t.toLowerCase().replace(/[!?]$/, '')}. The internet simply cannot stop talking about this latest revelation from the world of glamour and lifestyle.`,
  };
  const intro = intros[cat] || `In a major development that has captured everyone's attention, ${t.toLowerCase().replace(/[!?]$/, '')}. Fans and industry insiders are reacting with enormous enthusiasm.`;

  return [
    { type: 'para',    text: intro },
    { type: 'heading', text: 'What Started It All' },
    { type: 'para',    text: `According to sources close to ${src}, this has been in the works for quite some time. Multiple insiders have confirmed the development, lending credibility to what was previously only speculation. The response from the community has been overwhelmingly positive, with trending hashtags already making the rounds on X, Instagram, and WhatsApp groups across the country.` },
    { type: 'para',    text: `This is not the first time we have seen such a development in this space. Over the past year, the entertainment industry has witnessed a series of surprises — but this one clearly stands apart from the rest. Experts are already calling it a "game changer" that could define the direction for the rest of 2026.` },
    { type: 'heading', text: 'The Internet Reacts' },
    { type: 'para',    text: `Social media has exploded with reactions from fans all over the country and beyond. The hashtag has been trending nationwide since the news first broke ${article.time}. Fans are expressing emotions ranging from pure joy to complete disbelief, with many saying they had been waiting for exactly this moment for a very long time.` },
    { type: 'quote',   text: `"This is exactly what we needed! Absolutely cannot wait to see what happens next. India Forums breaking this first — as always!"`, author: 'Fan reaction on X (formerly Twitter)' },
    { type: 'heading', text: 'Silence From Both Sides' },
    { type: 'para',    text: `Interestingly, neither side has issued an official statement at the time of writing. Sources suggest an announcement could be imminent, but for now the silence is speaking volumes. The internet, as always, is filling in the gaps with theories, memes, and speculation.` },
    { type: 'para',    text: `As more details continue to emerge, India Forums will keep you updated with every single development. Stay tuned for exclusive insights, behind-the-scenes updates, and expert analysis on this story.` },
    { type: 'tldr',    text: `${t} — reactions are pouring in from all corners and the internet is buzzing. Watch this space for the very latest.` },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ArticleScreen({ article, onBack, onArticlePress }) {
  const [reaction, setReaction] = useState(null);
  const scrollRef = useRef(null);

  // Fetch enriched details from API
  const { details, loading: detailsLoading } = useArticleDetails(article.id);

  // Merge list-level article with fetched details (details take precedence when available)
  const enriched = useMemo(() => {
    if (!details) return article;
    return { ...article, ...details };
  }, [article, details]);

  const seed = useMemo(() => {
    const s = String(enriched.id);
    return s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  }, [enriched.id]);

  const counts = useMemo(() =>
    REACTIONS.reduce((acc, r, i) => ({ ...acc, [r.id]: seededN(seed + i * 17, 0, 120) }), {}),
    [seed]
  );

  const viewCount    = useMemo(() => enriched.viewCount ? fmt(enriched.viewCount) : fmt(seededN(seed * 7, 4200, 98000)), [seed, enriched.viewCount]);
  const commentCount = useMemo(() => enriched.commentCount || seededN(seed * 3, 14, 297), [seed, enriched.commentCount]);
  const body         = useMemo(() => buildBody(enriched), [enriched]);
  const subtitle     = useMemo(() => enriched.description || getSubtitle(enriched), [enriched]);
  const related      = useMemo(() => {
    if (enriched.relatedArticles?.length) return enriched.relatedArticles.slice(0, 3);
    return getRelatedArticles(enriched);
  }, [enriched]);
  const topCat       = useMemo(() => getTopCat(enriched), [enriched]);
  const tags         = useMemo(() => {
    if (enriched.keywords) {
      const kwTags = enriched.keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 6);
      if (kwTags.length > 0) return kwTags;
    }
    const base = CAT_TAGS[topCat] || CAT_TAGS.MOVIES;
    const extra = enriched.tag ? [enriched.tag] : [];
    return [...new Set([...extra, ...base])].slice(0, 6);
  }, [topCat, enriched.tag, enriched.keywords]);
  const entities     = useMemo(() => CATEGORY_ENTITIES[topCat] || CATEGORY_ENTITIES.MOVIES, [topCat]);
  const crumbs       = ['Home', ...(enriched.cat || '').split('·').map(s => s.trim()).filter(Boolean)];

  // Scroll to top when article changes
  useMemo(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [enriched.id]);

  return (
    <div className={styles.screen}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 5l-5 5 5 5" stroke="var(--dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className={styles.topTitle}>Article{detailsLoading ? '...' : ''}</span>
        <div className={styles.topActions}>
          <button className={styles.iconBtn}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="14" cy="4"  r="1.8" stroke="var(--text2)" strokeWidth="1.4"/>
              <circle cx="4"  cy="9"  r="1.8" stroke="var(--text2)" strokeWidth="1.4"/>
              <circle cx="14" cy="14" r="1.8" stroke="var(--text2)" strokeWidth="1.4"/>
              <path d="M5.8 8l6.4-3.2M5.8 10.2l6.4 3" stroke="var(--text2)" strokeWidth="1.3"/>
            </svg>
          </button>
          <button className={styles.iconBtn}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 2h10a1 1 0 011 1v13l-6-3.5L3 16V3a1 1 0 011-1z" stroke="var(--text2)" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Scroll ──────────────────────────────────────────────────────────── */}
      <div className={styles.scroll} ref={scrollRef}>

        {/* Hero */}
        <div className={styles.hero} style={{ background: enriched.bg }}>
          {enriched.thumbnail ? (
            <img src={enriched.thumbnail} alt="" className={styles.heroImg} />
          ) : (
            <span className={styles.heroEmoji}>{enriched.emoji}</span>
          )}
          <div className={styles.heroOverlay} />
          <div className={styles.heroBadges}>
            {enriched.breaking && <span className={styles.badgeBreaking}>BREAKING</span>}
            {enriched.tag      && <span className={styles.badgeTag}>{enriched.tag}</span>}
          </div>
        </div>
        <div className={styles.heroCaption}>
          <span>{enriched.source || 'India Forums'}</span> · Photo for representation
        </div>

        <div className={styles.content}>

          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            {crumbs.map((b, i) => (
              <span key={i}>
                <span className={i === crumbs.length - 1 ? styles.bcActive : styles.bcLink}>{b}</span>
                {i < crumbs.length - 1 && <span className={styles.bcSep}> › </span>}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className={styles.title}>{enriched.title}</h1>

          {/* Subtitle */}
          <p className={styles.subtitle}>{subtitle}</p>

          {/* Author + stats */}
          <div className={styles.metaRow}>
            <div className={styles.authorAv}>IF</div>
            <div className={styles.metaInfo}>
              <div className={styles.authorName}>{enriched.source || 'IF News Desk'}</div>
              <div className={styles.authorMeta}>{enriched.time} · {enriched.readTime || '4 min read'}</div>
            </div>
            <div className={styles.statsRow}>
              <div className={styles.statChip}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="var(--text3)" strokeWidth="1.2"/>
                  <circle cx="6" cy="6" r="1.5" stroke="var(--text3)" strokeWidth="1.2"/>
                </svg>
                {viewCount}
              </div>
              <div className={styles.statChip}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1.5h10a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H3l-2.5 2.5V2a.5.5 0 01.5-.5z" stroke="var(--text3)" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
                {commentCount}
              </div>
            </div>
          </div>

          {/* Share */}
          <div className={styles.shareRow}>
            <span className={styles.shareLabel}>Share:</span>
            <button className={`${styles.shareCircle} ${styles.fbBtn}`} title="Facebook">
              <svg width="14" height="14" viewBox="0 0 13 13" fill="none"><path d="M7.5 2.2H9V.5H7.5C6.2.5 5.2 1.5 5.2 2.8v.9H3.8v2h1.4V12H7V5.7h1.4l.4-2H7V2.8c0-.33.27-.6.5-.6z" fill="white"/></svg>
            </button>
            <button className={`${styles.shareCircle} ${styles.xBtn}`} title="X / Twitter">
              <svg width="14" height="14" viewBox="0 0 13 13" fill="none"><path d="M1 1l4.4 4.8L1 12h1.4l3.2-3.7 2.8 3.7H12L7.3 6.7 11.5 1h-1.4L6.3 4.4 4 1H1z" fill="white"/></svg>
            </button>
            <button className={`${styles.shareCircle} ${styles.waBtn}`} title="WhatsApp">
              <svg width="14" height="14" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="white" strokeWidth="1.2"/><path d="M4 4.2c.4-.4.9-.4 1.2 0l.8 1c.2.3.1.6-.1.8l-.3.3c.4.7.9 1.3 1.7 1.7l.3-.3c.2-.2.5-.2.8-.1l1 .8c.4.3.4.8 0 1.2-.7.7-1.8.9-2.8.3C5.3 9 4 7.7 3.8 6.3c-.2-.9 0-1.8.2-2.1z" fill="white"/></svg>
            </button>
            <button className={`${styles.shareCircle} ${styles.copyBtn}`} title="Copy link">
              <svg width="14" height="14" viewBox="0 0 13 13" fill="none"><rect x="1" y="4" width="7" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.2"/><path d="M4 4V3a1.3 1.3 0 011.3-1.3H11A1.3 1.3 0 0112.3 3v6A1.3 1.3 0 0111 10.3h-1" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
          </div>

          {/* Article body */}
          <div className={styles.body}>
            {enriched.bodyContent ? (
              <div
                className={styles.apiBody}
                dangerouslySetInnerHTML={{ __html: enriched.bodyContent }}
              />
            ) : (
              body.map((block, idx) => {
                if (block.type === 'heading') return <h2 key={idx} className={styles.bHeading}>{block.text}</h2>;
                if (block.type === 'quote')   return (
                  <blockquote key={idx} className={styles.bQuote}>
                    <p>{block.text}</p>
                    <cite>{block.author}</cite>
                  </blockquote>
                );
                if (block.type === 'tldr') return (
                  <div key={idx} className={styles.tldr}>
                    <span className={styles.tldrBadge}>TL;DR</span>
                    <span className={styles.tldrText}>{block.text}</span>
                  </div>
                );
                return <p key={idx} className={styles.bPara}>{block.text}</p>;
              })
            )}
          </div>

          <div className={styles.divider} />

          {/* WhatsApp channel widget */}
          <div className={styles.waWidget}>
            <div className={styles.waWidgetIcon}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="10" fill="#25D366"/>
                <path d="M6.5 7c.6-.6 1.5-.6 2 0l1.2 1.6c.3.4.2 1-.2 1.3l-.4.4c.6 1.1 1.5 2 2.6 2.6l.4-.4c.3-.3.9-.4 1.3-.2l1.6 1.2c.6.4.6 1.4 0 2-1.2 1.2-3 1.5-4.4.4C8.6 14.3 6.7 12.4 6.3 10.2c-.3-1.4.1-3 .2-3.2z" fill="white"/>
              </svg>
            </div>
            <div className={styles.waWidgetText}>
              <div className={styles.waWidgetTitle}>Join Our WhatsApp Channel</div>
              <div className={styles.waWidgetSub}>Stay updated with the latest news, gossip, and hot discussions</div>
            </div>
            <button className={styles.waWidgetBtn}>Join Now</button>
          </div>

          <div className={styles.divider} />

          {/* Reactions */}
          <div className={styles.reactBox}>
            <div className={styles.reactLabel}>Your reaction</div>
            <div className={styles.reactRow}>
              {REACTIONS.map((r) => {
                const active = reaction === r.id;
                const count  = counts[r.id] + (active ? 1 : 0);
                return (
                  <button
                    key={r.id}
                    className={`${styles.reactBtn} ${active ? styles.reactActive : ''}`}
                    onClick={() => setReaction(p => p === r.id ? null : r.id)}
                  >
                    <span className={styles.reactEmoji}>{r.emoji}</span>
                    <span className={styles.reactCount}>{count}</span>
                    <span className={styles.reactName}>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.divider} />

          {/* We're Everywhere */}
          <div className={styles.socialSection}>
            <div className={styles.sectionLabel}>We're Everywhere!</div>
            <div className={styles.socialGrid}>
              {SOCIAL_CHANNELS.map(ch => (
                <div key={ch.id} className={styles.socialCard}>
                  <div className={styles.socialIcon} style={{ background: ch.bg }}>{ch.abbr}</div>
                  <div className={styles.socialInfo}>
                    <div className={styles.socialPlatform}>{ch.platform}</div>
                    <div className={styles.socialHandle}>{ch.handle}</div>
                  </div>
                  <div className={styles.socialRight}>
                    <div className={styles.socialCount}>{ch.count}</div>
                    <button className={styles.socialFollowBtn}>+ Follow</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Related entities (people / movies / shows) */}
          <div className={styles.entitiesSection}>
            <div className={styles.sectionLabel}>People & Topics</div>
            <div className={styles.entitiesRow}>
              {entities.map(e => (
                <div key={e.id} className={styles.entityCard}>
                  <div className={styles.entityAvatar} style={{ background: e.bg }}>
                    <span className={styles.entityEmoji}>{e.emoji}</span>
                  </div>
                  <div className={styles.entityName}>{e.name}</div>
                  <div className={styles.entityRole}>{e.role}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Tags */}
          <div className={styles.tagsRow}>
            {tags.map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>

          <div className={styles.divider} />

          {/* Comments */}
          <div className={styles.commentsBox}>
            <div className={styles.commentsHeader}>
              <span className={styles.commentsTitle}>Comments</span>
              <span className={styles.commentsCount}>{commentCount} comments</span>
            </div>

            <div className={styles.commentInput}>
              <div className={styles.inputAv} style={{ background: 'linear-gradient(135deg,var(--brand),#6B7FFF)' }}>Y</div>
              <div className={styles.inputPlaceholder}>Add a comment...</div>
            </div>

            {COMMENTS.map(c => (
              <div key={c.id} className={styles.comment}>
                <div className={styles.commentAv} style={{ background: c.color }}>{c.av}</div>
                <div className={styles.commentContent}>
                  <div className={styles.commentTop}>
                    <span className={styles.commentUser}>{c.user}</span>
                    <span className={styles.commentTime}>{c.time}</span>
                  </div>
                  <div className={styles.commentText}>{c.text}</div>
                  <div className={styles.commentActions}>
                    <button className={styles.likeBtn}>👍 {c.likes}</button>
                    <button className={styles.replyBtn}>Reply</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.divider} />

          {/* Related News */}
          {related.length > 0 && (
            <div className={styles.relatedSection}>
              <div className={styles.sectionLabel}>Related News</div>
              <div className={styles.relatedList}>
                {related.map(a => (
                  <div key={a.id} className={styles.relCard} onClick={() => onArticlePress && onArticlePress(a)}>
                    <div className={styles.relThumb} style={{ background: a.bg }}>
                      <span className={styles.relEmoji}>{a.emoji}</span>
                      {a.breaking && <span className={styles.relBreaking}>BREAKING</span>}
                    </div>
                    <div className={styles.relBody}>
                      <div className={styles.relCat}>{a.cat}</div>
                      <div className={styles.relTitle}>{a.title}</div>
                      <div className={styles.relTime}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.endPad} />
        </div>
      </div>
    </div>
  );
}
