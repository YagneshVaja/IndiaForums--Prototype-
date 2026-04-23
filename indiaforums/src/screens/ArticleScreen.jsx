import { useState, useMemo, useRef } from 'react';
import styles from './ArticleScreen.module.css';
import useArticleDetails from '../hooks/useArticleDetails';
import SocialEmbed from '../components/ui/SocialEmbed';
import CommentsSection from '../components/comments/CommentsSection';
import { COMMENT_CONTENT_TYPES, REACTION_TYPES, reactToContent } from '../services/commentsApi';
import { extractApiError } from '../services/api';

// ── Reactions ─────────────────────────────────────────────────────────────────
// `apiCode` maps each UI reaction to the backend REACTION_TYPES enum from
// commentsApi.js so we can call POST /content/reactions.
const REACTIONS = [
  { id: 'nice',  emoji: '😊', label: 'Nice',  apiCode: REACTION_TYPES.NICE    },
  { id: 'great', emoji: '👍', label: 'Great', apiCode: REACTION_TYPES.AWESOME },
  { id: 'loved', emoji: '❤️', label: 'Loved', apiCode: REACTION_TYPES.LOVED   },
  { id: 'lol',   emoji: '😂', label: 'LOL',   apiCode: REACTION_TYPES.LOL     },
  { id: 'omg',   emoji: '😮', label: 'OMG',   apiCode: REACTION_TYPES.OMG     },
  { id: 'cry',   emoji: '😢', label: 'Cry',   apiCode: REACTION_TYPES.CRY     },
  { id: 'fail',  emoji: '👎', label: 'Fail',  apiCode: REACTION_TYPES.FAIL    },
];

// ── Static data ───────────────────────────────────────────────────────────────

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

// Article comment content type id from spec
const COMMENT_CONTENT_TYPE = COMMENT_CONTENT_TYPES.ARTICLE;

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

// ── Article-type helpers ─────────────────────────────────────────────────────
// articleTypeId values come from the API:
//   1 Normal · 2 Listicle Num Asc · 6 Listicle · 7 Listicle Num Desc · 8 Live News
const LISTICLE_TYPES = new Set([2, 6, 7]);
const LIVE_NEWS_TYPE = 8;

// Listicle entries are the items flagged with subItem=true. Intro/outro items
// come before/after them with subItem=false. Keeps order stable.
function partitionItems(items) {
  const header = [];
  const entries = [];
  const trailing = [];
  let seenEntry = false;
  let doneEntries = false;
  for (const it of items) {
    if (it.subItem) {
      seenEntry = true;
      entries.push(it);
    } else if (!seenEntry) {
      header.push(it);
    } else {
      doneEntries = true;
      trailing.push(it);
    }
  }
  return { header, entries, trailing, hasEntries: seenEntry, _doneEntries: doneEntries };
}

// "just now", "14m ago", "3h ago", "2d ago", otherwise absolute short date.
function relativeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffSec = (Date.now() - d.getTime()) / 1000;
  if (diffSec < 60)      return 'just now';
  if (diffSec < 3600)    return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400)   return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800)  return `${Math.floor(diffSec / 86400)}d ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

// "4:32 PM" for same-day, "Oct 6, 4:32 PM" otherwise.
function formatExactTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return time;
  const date = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  return `${date}, ${time}`;
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
export default function ArticleScreen({ article, onArticlePress, onTagPress }) {
  const [reaction, setReaction] = useState(null);
  const [reactionError, setReactionError] = useState(null);
  const scrollRef = useRef(null);

  // Fire-and-forget POST to /content/reactions, with optimistic UI rollback
  // on error so the user gets immediate feedback. Toggling the same reaction
  // off is purely client-side — the spec doesn't define an "unreact" call.
  async function handleReact(r) {
    const next = reaction === r.id ? null : r.id;
    setReaction(next);
    if (next == null) return;
    setReactionError(null);
    try {
      await reactToContent({
        contentType:  COMMENT_CONTENT_TYPES.ARTICLE,
        contentId:    article.id,
        reactionType: r.apiCode,
      });
    } catch (err) {
      // Revert and surface the error inline so the user knows it didn't stick.
      setReaction(null);
      setReactionError(extractApiError(err, 'Failed to record reaction'));
    }
  }

  // Fetch enriched details from API
  const { details } = useArticleDetails(article.id);

  // Merge list-level article with fetched details
  // Skip null/undefined detail values so list-level data is preserved
  const enriched = useMemo(() => {
    if (!details) return article;
    const merged = { ...article };
    for (const [key, value] of Object.entries(details)) {
      if (value != null) merged[key] = value;
    }
    return merged;
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
  const hasArticleItems = enriched.articleItems?.length > 0;
  const apiTldr      = enriched.tldr || '';
  const related      = useMemo(() =>
    enriched.relatedArticles?.length ? enriched.relatedArticles.slice(0, 3) : [],
    [enriched.relatedArticles]
  );
  const topCat       = useMemo(() => getTopCat(enriched), [enriched]);
  const jsonEntities = enriched.jsonEntities || [];
  const entities     = useMemo(() => CATEGORY_ENTITIES[topCat] || CATEGORY_ENTITIES.MOVIES, [topCat]);
  const crumbs       = useMemo(() => ['Home', ...(enriched.cat || '').split('·').map(s => s.trim()).filter(Boolean)], [enriched.cat]);

  // Scroll to top when article changes
  useMemo(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [enriched.id]);

  return (
    <div className={styles.screen}>

      {/* ── Scroll ──────────────────────────────────────────────────────────── */}
      <div className={styles.scroll} ref={scrollRef}>

        {/* Hero */}
        <div className={styles.hero} style={{ background: enriched.bg }}>
          {enriched.thumbnail ? (
            <img src={enriched.thumbnail} alt="" className={styles.heroImg} decoding="async" />
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
            {hasArticleItems ? (
              <>
                {renderArticleBody(enriched, styles)}

                {apiTldr && (
                  <div className={styles.tldr}>
                    <span className={styles.tldrBadge}>TL;DR</span>
                    <span className={styles.tldrText}>{apiTldr}</span>
                  </div>
                )}
              </>
            ) : enriched.bodyContent ? (
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
                    onClick={() => handleReact(r)}
                  >
                    <span className={styles.reactEmoji}>{r.emoji}</span>
                    <span className={styles.reactCount}>{count}</span>
                    <span className={styles.reactName}>{r.label}</span>
                  </button>
                );
              })}
            </div>
            {reactionError && (
              <div className={styles.reactError}>{reactionError}</div>
            )}
          </div>

          <div className={styles.divider} />

          {/* Related entities from API jsonData */}
          {jsonEntities.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Related Topics</div>
              <div className={styles.chipGrid}>
                {jsonEntities.map(e => (
                  <button key={e.id} className={styles.entityChip} onClick={() => onTagPress?.(e)}>
                    <span className={styles.entityChipName}>{e.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Fallback static entities when no API data */}
          {jsonEntities.length === 0 && (
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
          )}

          <div className={styles.divider} />

          <div className={styles.divider} />

          {/* Comments */}
          <CommentsSection
            contentTypeId={COMMENT_CONTENT_TYPE}
            contentTypeValue={article.id}
          />

          <div className={styles.divider} />

          {/* Related News */}
          {related.length > 0 && (
            <div className={styles.relatedSection}>
              <div className={styles.sectionLabel}>Related News</div>
              <div className={styles.relatedList}>
                {related.map(a => (
                  <div key={a.id} className={styles.relCard} onClick={() => onArticlePress && onArticlePress(a)}>
                    <div className={styles.relThumb} style={{ background: a.bg }}>
                      {a.thumbnail
                        ? <img src={a.thumbnail} alt="" className={styles.relThumbImg} loading="lazy" />
                        : <span className={styles.relEmoji}>{a.emoji}</span>
                      }
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

// ── Body renderers ───────────────────────────────────────────────────────────
// Renders one articleItem in its standard form (image / youtube / social / text).
// No listicle or live-news framing — callers wrap this when they need it.
function renderArticleItem(item, styles) {
  // Type 2: Image + text
  if (item.type === 2) {
    return (
      <div key={item.id} className={styles.itemBlock}>
        {item.mediaUrl && (
          <div className={styles.itemImageWrap}>
            <img src={item.mediaUrl} alt={item.mediaTitle || ''} className={styles.itemImage} loading="lazy" />
            {item.source && <div className={styles.itemCaption}>{item.source}</div>}
          </div>
        )}
        {item.contents && (
          <div className={styles.apiBody} dangerouslySetInnerHTML={{ __html: item.contents }} />
        )}
      </div>
    );
  }

  // Type 4: YouTube video + text
  if (item.type === 4) {
    const ytMatch = item.mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    return (
      <div key={item.id} className={styles.itemBlock}>
        {item.title && <h3 className={styles.itemTitle}>{item.title}</h3>}
        {ytMatch && (
          <div className={styles.ytWrap}>
            <iframe
              src={`https://www.youtube.com/embed/${ytMatch[1]}`}
              title={item.title || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className={styles.ytFrame}
              loading="lazy"
            />
          </div>
        )}
        {item.contents && (
          <div className={styles.apiBody} dangerouslySetInnerHTML={{ __html: item.contents }} />
        )}
      </div>
    );
  }

  // Type 6: Instagram embed
  if (item.type === 6 && item.mediaUrl) {
    return (
      <div key={item.id} className={styles.itemBlock}>
        <SocialEmbed url={item.mediaUrl} type={item.type} />
      </div>
    );
  }

  // Type 7: Twitter/X embed
  if (item.type === 7 && item.mediaUrl) {
    return (
      <div key={item.id} className={styles.itemBlock}>
        <SocialEmbed url={item.mediaUrl} type={item.type} />
      </div>
    );
  }

  // Type 9: Text-only paragraph
  if (item.type === 9 && item.contents) {
    return (
      <div key={item.id} className={styles.itemBlock}>
        {item.title && <h3 className={styles.itemTitle}>{item.title}</h3>}
        <div className={styles.apiBody} dangerouslySetInnerHTML={{ __html: item.contents }} />
      </div>
    );
  }

  // Catch-all: any other type with a social media URL
  if (item.mediaUrl && /twitter\.com|x\.com|instagram\.com|facebook\.com|fb\.watch|tiktok\.com|reddit\.com/i.test(item.mediaUrl)) {
    return (
      <div key={item.id} className={styles.itemBlock}>
        <SocialEmbed url={item.mediaUrl} type={item.type} />
      </div>
    );
  }

  return null;
}

// Render body contents using the right template for the article's type.
// Flat pass for types that don't have a partitioned shape (Normal, or unknown).
function renderArticleBody(article, styles) {
  const items = article.articleItems || [];
  const type = article.articleTypeId;

  if (type === LIVE_NEWS_TYPE) {
    return renderLiveNewsBody(items, styles);
  }

  if (LISTICLE_TYPES.has(type)) {
    return renderListicleBody(items, type, styles);
  }

  // Default: flat render (Normal article with mixed items, or unknown type)
  return <>{items.map(it => renderArticleItem(it, styles))}</>;
}

function renderLiveNewsBody(items, styles) {
  const { header, entries, trailing, hasEntries } = partitionItems(items);

  // No live-update entries — fall back to flat render so nothing is hidden.
  if (!hasEntries) return <>{items.map(it => renderArticleItem(it, styles))}</>;

  // Most recent update drives the live-blog header timestamp.
  const latestRel = relativeAgo(entries[0]?.dateAdded);

  return (
    <>
      {/* Intro image + lede */}
      {header.length > 0 && (
        <div className={styles.liveHeader}>
          {header.map(it => renderArticleItem(it, styles))}
        </div>
      )}

      {/* Live-blog banner — frames the whole feed as live, shows update count + latest time */}
      <div className={styles.liveBanner}>
        <span className={styles.liveBannerDot} aria-hidden="true" />
        <span className={styles.liveBannerLabel}>LIVE BLOG</span>
        <span className={styles.liveBannerCount}>
          {entries.length} {entries.length === 1 ? 'update' : 'updates'}
        </span>
        {latestRel && (
          <span className={styles.liveBannerLatest}>Updated {latestRel}</span>
        )}
      </div>

      {/* Timeline feed — marker dots on a rail, latest at the top */}
      <div className={styles.liveFeed}>
        {entries.map((it, i) => {
          const rel = relativeAgo(it.dateAdded);
          const exact = formatExactTime(it.dateAdded);
          const isLatest = i === 0;
          return (
            <article
              key={it.id}
              className={`${styles.liveCard} ${isLatest ? styles.liveCardLatest : ''}`}
            >
              <span className={styles.liveMarker} aria-hidden="true" />
              <div className={styles.liveCardHead}>
                {isLatest && <span className={styles.liveNewPill}>NEW</span>}
                {rel && <span className={styles.liveTimeRel}>{rel}</span>}
                {exact && <span className={styles.liveTimeExact}>{exact}</span>}
              </div>
              {it.title && <h3 className={styles.liveTitle}>{it.title}</h3>}
              {it.mediaUrl && it.type === 2 && (
                <div className={styles.liveImageWrap}>
                  <img src={it.mediaUrl} alt={it.mediaTitle || ''} className={styles.liveImage} loading="lazy" />
                  {it.source && <div className={styles.itemCaption}>{it.source}</div>}
                </div>
              )}
              {it.contents && (
                <div className={styles.apiBody} dangerouslySetInnerHTML={{ __html: it.contents }} />
              )}
            </article>
          );
        })}
      </div>

      {/* Closing note(s) */}
      {trailing.length > 0 && (
        <div className={styles.liveOutro}>
          {trailing.map(it => renderArticleItem(it, styles))}
        </div>
      )}
    </>
  );
}

function renderListicleBody(items, type, styles) {
  const { header, entries, trailing, hasEntries } = partitionItems(items);

  if (!hasEntries) return <>{items.map(it => renderArticleItem(it, styles))}</>;

  // Numbering strategy driven by articleTypeId:
  //   2 → 1, 2, 3 …         (ascending — "top X" counting up)
  //   7 → N, N-1, N-2 …     (descending — "countdown" style)
  //   6 → no numbers        (plain ordered list)
  const total = entries.length;
  const numberAt = (i) => {
    if (type === 2) return i + 1;
    if (type === 7) return total - i;
    return null; // type 6: no number badge
  };

  return (
    <>
      {/* Intro image + lede */}
      {header.length > 0 && (
        <div className={styles.listicleHeader}>
          {header.map(it => renderArticleItem(it, styles))}
        </div>
      )}

      {/* Entries — image-hero with overlay number badge, title and body below.
          Matches the system's image-forward card pattern (ArticleCard / NewsVerticalCard). */}
      <ol className={styles.listicleList}>
        {entries.map((it, i) => {
          const n = numberAt(i);
          const cleanTitle = it.title ? it.title.replace(/:$/, '') : '';
          const hasImage = it.mediaUrl && it.type === 2;
          const isTop = type === 7 && i === 0;
          return (
            <li key={it.id} className={styles.listEntry}>
              {hasImage ? (
                <div className={styles.listHero}>
                  <img
                    src={it.mediaUrl}
                    alt={it.mediaTitle || ''}
                    className={styles.listHeroImg}
                    loading="lazy"
                  />
                  <div className={styles.listHeroShade} aria-hidden="true" />
                  {n !== null && (
                    <div className={`${styles.listBadge} ${isTop ? styles.listBadgeTop : ''}`}>
                      <span className={styles.listBadgeHash}>#</span>
                      <span className={styles.listBadgeNum}>{n}</span>
                    </div>
                  )}
                  {it.source && <div className={styles.listHeroCaption}>{it.source}</div>}
                </div>
              ) : (
                n !== null && (
                  <div className={styles.listBadgeRow}>
                    <div className={`${styles.listBadge} ${styles.listBadgeInline} ${isTop ? styles.listBadgeTop : ''}`}>
                      <span className={styles.listBadgeHash}>#</span>
                      <span className={styles.listBadgeNum}>{n}</span>
                    </div>
                  </div>
                )
              )}
              <div className={styles.listContent}>
                {cleanTitle && <h3 className={styles.listEntryTitle}>{cleanTitle}</h3>}
                {it.contents && (
                  <div className={styles.apiBody} dangerouslySetInnerHTML={{ __html: it.contents }} />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Closing paragraph */}
      {trailing.length > 0 && (
        <div className={styles.listicleOutro}>
          {trailing.map(it => renderArticleItem(it, styles))}
        </div>
      )}
    </>
  );
}
