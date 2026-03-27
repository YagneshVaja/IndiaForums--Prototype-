import { useState, useMemo, useRef } from 'react';
import styles from './ArticleScreen.module.css';
import { getRelatedArticles } from '../data/newsData';

// ── Reactions ─────────────────────────────────────────────────────────────────
const REACTIONS = [
  { id: 'nice',  emoji: '😊', label: 'Nice'  },
  { id: 'great', emoji: '👍', label: 'Great' },
  { id: 'loved', emoji: '❤️', label: 'Loved' },
  { id: 'lol',   emoji: '😂', label: 'LOL'   },
  { id: 'omg',   emoji: '😮', label: 'OMG'   },
  { id: 'cry',   emoji: '😢', label: 'Cry'   },
];

function seededN(seed, min, max) {
  const x = Math.sin(seed + 1) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

function fmt(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
}

// ── Article body generator ────────────────────────────────────────────────────
function buildBody(article) {
  const cat = (article.cat || '').split('·')[0].trim().toUpperCase();
  const t   = article.title;
  const src = article.source || 'IF News Desk';

  const intros = {
    TV:        `In a development that has left fans completely stunned, ${t.toLowerCase().replace(/[!?]$/, '')}. The latest episode has become the talk of every household across the country.`,
    MOVIES:    `The film industry is buzzing with excitement as ${t.toLowerCase().replace(/[!?]$/, '')}. The announcement has set social media on fire, with fans expressing their delight on every platform.`,
    SPORTS:    `In a thrilling turn of events, ${t.toLowerCase().replace(/[!?]$/, '')}. The moment has already been replayed millions of times across social media platforms nationwide.`,
    DIGITAL:   `The OTT world is witnessing a landmark moment as ${t.toLowerCase().replace(/[!?]$/, '')}. Viewers and critics alike are heaping praise on this latest development.`,
    LIFESTYLE: `Setting new trends as always, ${t.toLowerCase().replace(/[!?]$/, '')}. The internet simply cannot stop talking about this latest revelation from the world of glamour.`,
  };
  const intro = intros[cat] || `In a major development, ${t.toLowerCase().replace(/[!?]$/, '')}. Fans and industry insiders are reacting with great enthusiasm across all platforms.`;

  return [
    { type: 'para',    text: intro },
    { type: 'heading', text: 'What We Know So Far' },
    { type: 'para',    text: `According to sources close to ${src}, this has been in the works for quite some time. Multiple insiders have confirmed the development, lending credibility to what was previously only speculation. The response from the community has been overwhelmingly positive, with trending hashtags already making the rounds on X, Instagram, and WhatsApp groups across the country.` },
    { type: 'para',    text: `This is not the first time we have seen such a development in this space. Over the past year, the entertainment industry has witnessed a series of surprises — but this one clearly stands out. Experts are calling it a "game changer" that could set the tone for the rest of 2026.` },
    { type: 'heading', text: 'Fan Reactions' },
    { type: 'para',    text: `Social media has exploded with reactions from fans all over the country. The hashtag has been trending nationwide since the news broke ${article.time}. Fans are expressing emotions ranging from pure joy to complete disbelief, with many saying they had been waiting for exactly this for a very long time.` },
    { type: 'quote',   text: `"This is exactly what we needed! Absolutely cannot wait to see what happens next. India Forums breaking this first — as always!"`, author: 'Fan reaction on X (formerly Twitter)' },
    { type: 'para',    text: `As more details continue to emerge, India Forums will keep you updated with every development. Stay tuned for exclusive insights, behind-the-scenes updates, and expert analysis on this story.` },
    { type: 'tldr',    text: `${t} — reactions are pouring in and the internet is buzzing. Watch this space for more.` },
  ];
}

// ── Dummy comments ────────────────────────────────────────────────────────────
const COMMENTS = [
  { id: 1, user: 'FilmLover99',   av: 'F', color: '#3558F0', time: '2 hr ago', text: 'Absolutely love this! Cannot wait for more updates. This is exactly what fans have been wanting! Great reporting 🙌', likes: 24 },
  { id: 2, user: 'TVAddict_2026', av: 'T', color: '#7c3aed', time: '3 hr ago', text: 'Saw this coming honestly — the hints were all there last week. Brilliant work by the IF team as always!', likes: 18 },
  { id: 3, user: 'Bollywood_Fan', av: 'B', color: '#db2777', time: '5 hr ago', text: 'OMG!! Cannot believe this is happening! Already sharing with all my friends right now 😍🔥', likes: 31 },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function ArticleScreen({ article, onBack, onArticlePress }) {
  const [reaction, setReaction] = useState(null);
  const scrollRef = useRef(null);

  const seed = useMemo(() => {
    const s = String(article.id);
    return s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  }, [article.id]);

  const counts = useMemo(() =>
    REACTIONS.reduce((acc, r, i) => ({ ...acc, [r.id]: seededN(seed + i * 17, 200, 4200) }), {}),
    [seed]
  );

  const body     = useMemo(() => buildBody(article), [article]);
  const related  = useMemo(() => getRelatedArticles(article), [article]);
  const crumbs   = ['Home', ...(article.cat || '').split('·').map(s => s.trim()).filter(Boolean)];
  const commentCount = seededN(seed * 3, 14, 297);

  // Scroll back to top when article changes
  useMemo(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [article.id]);

  return (
    <div className={styles.screen}>

      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 5l-5 5 5 5" stroke="var(--dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className={styles.topTitle}>Article</span>
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

      {/* ── Scrollable body ── */}
      <div className={styles.scroll} ref={scrollRef}>

        {/* Hero */}
        <div className={styles.hero} style={{ background: article.bg }}>
          <span className={styles.heroEmoji}>{article.emoji}</span>
          <div className={styles.heroBadges}>
            {article.breaking && <span className={styles.badgeBreaking}>BREAKING</span>}
            {article.tag      && <span className={styles.badgeTag}>{article.tag}</span>}
          </div>
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
          <h1 className={styles.title}>{article.title}</h1>

          {/* Author / meta */}
          <div className={styles.metaRow}>
            <div className={styles.authorAv}>IF</div>
            <div>
              <div className={styles.authorName}>{article.source || 'IF News Desk'}</div>
              <div className={styles.authorMeta}>{article.time} · {article.readTime || '4 min read'}</div>
            </div>
          </div>

          {/* Share */}
          <div className={styles.shareRow}>
            <button className={`${styles.shareBtn} ${styles.fbBtn}`}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M7.5 2.2H9V.5H7.5C6.2.5 5.2 1.5 5.2 2.8v.9H3.8v2h1.4V12H7V5.7h1.4l.4-2H7V2.8c0-.33.27-.6.5-.6z" fill="white"/></svg>
              <span>Facebook</span>
            </button>
            <button className={`${styles.shareBtn} ${styles.xBtn}`}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 1l4.4 4.8L1 12h1.4l3.2-3.7 2.8 3.7H12L7.3 6.7 11.5 1h-1.4L6.3 4.4 4 1H1z" fill="white"/></svg>
              <span>Post</span>
            </button>
            <button className={`${styles.shareBtn} ${styles.waBtn}`}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="white" strokeWidth="1.2"/><path d="M4 4.2c.4-.4.9-.4 1.2 0l.8 1c.2.3.1.6-.1.8l-.3.3c.4.7.9 1.3 1.7 1.7l.3-.3c.2-.2.5-.2.8-.1l1 .8c.4.3.4.8 0 1.2-.7.7-1.8.9-2.8.3C5.3 9 4 7.7 3.8 6.3c-.2-.9 0-1.8.2-2.1z" fill="white"/></svg>
              <span>WhatsApp</span>
            </button>
            <button className={`${styles.shareBtn} ${styles.copyBtn}`}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="4" width="7" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.2"/><path d="M4 4V3a1.3 1.3 0 011.3-1.3H11A1.3 1.3 0 0112.3 3v6A1.3 1.3 0 0111 10.3h-1" stroke="currentColor" strokeWidth="1.2"/></svg>
              <span>Copy</span>
            </button>
          </div>

          {/* Reactions */}
          <div className={styles.reactBox}>
            <div className={styles.reactLabel}>How do you feel about this?</div>
            <div className={styles.reactRow}>
              {REACTIONS.map((r, i) => {
                const active = reaction === r.id;
                const count  = counts[r.id] + (active ? 1 : 0);
                return (
                  <button
                    key={r.id}
                    className={`${styles.reactBtn} ${active ? styles.reactActive : ''}`}
                    onClick={() => setReaction(p => p === r.id ? null : r.id)}
                  >
                    <span className={styles.reactEmoji}>{r.emoji}</span>
                    <span className={styles.reactCount}>{fmt(count)}</span>
                    <span className={styles.reactName}>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Article body */}
          <div className={styles.body}>
            {body.map((block, i) => {
              if (block.type === 'heading') return (
                <h2 key={i} className={styles.bHeading}>{block.text}</h2>
              );
              if (block.type === 'quote') return (
                <blockquote key={i} className={styles.bQuote}>
                  <p>{block.text}</p>
                  <cite>{block.author}</cite>
                </blockquote>
              );
              if (block.type === 'tldr') return (
                <div key={i} className={styles.tldr}>
                  <span className={styles.tldrBadge}>TL;DR</span>
                  <span className={styles.tldrText}>{block.text}</span>
                </div>
              );
              return <p key={i} className={styles.bPara}>{block.text}</p>;
            })}
          </div>

          <div className={styles.divider} />

          {/* Related articles */}
          {related.length > 0 && (
            <div className={styles.relatedSection}>
              <div className={styles.relatedTitle}>Related News</div>
              <div className={styles.relatedScroll}>
                {related.map(a => (
                  <div
                    key={a.id}
                    className={styles.relCard}
                    onClick={() => onArticlePress && onArticlePress(a)}
                  >
                    <div className={styles.relThumb} style={{ background: a.bg }}>
                      <span className={styles.relEmoji}>{a.emoji}</span>
                      {a.breaking && <span className={styles.relBreaking}>BREAKING</span>}
                    </div>
                    <div className={styles.relBody}>
                      <div className={styles.relCat}>{a.cat}</div>
                      <div className={styles.relTitle2}>{a.title}</div>
                      <div className={styles.relTime}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          <div className={styles.endPad} />
        </div>
      </div>
    </div>
  );
}
