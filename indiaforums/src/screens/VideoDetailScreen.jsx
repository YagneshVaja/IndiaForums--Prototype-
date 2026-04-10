import { useState, useMemo, useRef } from 'react';
import styles from './VideoDetailScreen.module.css';
import useVideoDetails from '../hooks/useVideoDetails';

// ── Static data ──────────────────────────────────────────────────────────────
const REACTIONS = [
  { id: 'nice',  emoji: '😊', label: 'Nice'  },
  { id: 'great', emoji: '👍', label: 'Great' },
  { id: 'loved', emoji: '❤️', label: 'Loved' },
  { id: 'lol',   emoji: '😂', label: 'LOL'   },
  { id: 'omg',   emoji: '😮', label: 'OMG'   },
];

const COMMENTS = [
  { id: 1, user: 'TVFan_2026',    av: 'T', color: '#3558F0', time: '1 hr ago', text: 'Amazing episode! The twist was so unexpected 🔥', likes: 18 },
  { id: 2, user: 'ShowLover99',   av: 'S', color: '#7c3aed', time: '2 hr ago', text: 'Been following this show since day one. Never disappoints!', likes: 12 },
  { id: 3, user: 'DramaQueen_IF', av: 'D', color: '#db2777', time: '3 hr ago', text: 'Can someone explain the ending? I missed the last 5 minutes 😅', likes: 7 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function seededN(seed, min, max) {
  const x = Math.sin(seed + 1) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

// ── Component ────────────────────────────────────────────────────────────────
export default function VideoDetailScreen({ video, onBack, onVideoPress }) {
  const [reaction, setReaction] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const scrollRef = useRef(null);

  // Fetch enriched details from API
  const { details, loading: detailsLoading } = useVideoDetails(video.id);

  const enriched = useMemo(() => {
    if (!details) return video;
    return { ...video, ...details };
  }, [video, details]);

  const seed = useMemo(() => {
    const s = String(enriched.id);
    return s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  }, [enriched.id]);

  const reactionCounts = useMemo(() =>
    REACTIONS.reduce((acc, r, i) => ({ ...acc, [r.id]: seededN(seed + i * 13, 5, 85) }), {}),
    [seed]
  );

  const viewCount    = enriched.viewCount > 0 ? fmt(enriched.viewCount) : fmt(seededN(seed * 7, 1200, 45000));
  const commentCount = enriched.commentCount > 0 ? enriched.commentCount : seededN(seed * 3, 8, 180);

  // YouTube embed URL
  const youtubeUrl = enriched.contentId
    ? `https://www.youtube.com/embed/${enriched.contentId}?rel=0&modestbranding=1`
    : null;

  // Description
  const desc = enriched.description || '';
  const shortDesc = desc.length > 150 ? desc.slice(0, 150) + '...' : desc;

  // Keywords as tags
  const tags = useMemo(() => {
    if (enriched.keywords) {
      return enriched.keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 8);
    }
    return [];
  }, [enriched.keywords]);

  // Related videos
  const related = enriched.relatedVideos || [];

  // Scroll to top on video change
  useMemo(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [enriched.id]);

  return (
    <div className={styles.screen}>

      {/* ── Scroll ───────────────────────────────────────────────────── */}
      <div className={styles.scroll} ref={scrollRef}>

        {/* ── Video player area ─────────────────────────────────────── */}
        <div className={styles.playerWrap}>
          {youtubeUrl ? (
            <iframe
              className={styles.player}
              src={youtubeUrl}
              title={enriched.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className={styles.playerFallback} style={{ background: enriched.bg }}>
              {enriched.thumbnail ? (
                <img src={enriched.thumbnail} alt="" className={styles.playerImg} decoding="async" />
              ) : (
                <span className={styles.playerEmoji}>{enriched.emoji}</span>
              )}
              <div className={styles.playBtnLarge}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M8 5v14l11-7-11-7z" fill="white"/>
                </svg>
              </div>
            </div>
          )}
        </div>

        <div className={styles.content}>

          {/* ── Breadcrumb ────────────────────────────────────────────── */}
          <div className={styles.breadcrumb}>
            <span className={styles.bcLink}>Home</span>
            <span className={styles.bcSep}> › </span>
            <span className={styles.bcLink}>{enriched.catLabel || 'TV'}</span>
            <span className={styles.bcSep}> › </span>
            <span className={styles.bcActive}>Videos</span>
          </div>

          {/* ── Title ─────────────────────────────────────────────────── */}
          <h1 className={styles.title}>{enriched.title}</h1>

          {/* ── Meta row ──────────────────────────────────────────────── */}
          <div className={styles.metaRow}>
            <div className={styles.metaChip}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="var(--text3)" strokeWidth="1.2"/>
                <circle cx="6" cy="6" r="1.5" stroke="var(--text3)" strokeWidth="1.2"/>
              </svg>
              {viewCount} views
            </div>
            <div className={styles.metaDot} />
            <div className={styles.metaChip}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="var(--text3)" strokeWidth="1.2"/>
                <path d="M6 3.5v3l2 1.5" stroke="var(--text3)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {enriched.timeAgo || enriched.time}
            </div>
            {enriched.duration && (
              <>
                <div className={styles.metaDot} />
                <div className={styles.metaChip}>{enriched.duration}</div>
              </>
            )}
          </div>

          {/* ── Share row ─────────────────────────────────────────────── */}
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

          <div className={styles.divider} />

          {/* ── Description ───────────────────────────────────────────── */}
          {desc && (
            <>
              <div className={styles.descSection}>
                <div className={styles.sectionLabel}>Description</div>
                <p className={styles.descText}>
                  {descExpanded ? desc : shortDesc}
                </p>
                {desc.length > 150 && (
                  <button className={styles.showMoreBtn} onClick={() => setDescExpanded(e => !e)}>
                    {descExpanded ? 'Show Less' : 'Read More'}
                  </button>
                )}
              </div>
              <div className={styles.divider} />
            </>
          )}

          {/* ── Reactions ─────────────────────────────────────────────── */}
          <div className={styles.reactBox}>
            <div className={styles.reactLabel}>Your reaction</div>
            <div className={styles.reactRow}>
              {REACTIONS.map(r => {
                const active = reaction === r.id;
                const count  = reactionCounts[r.id] + (active ? 1 : 0);
                return (
                  <button
                    key={r.id}
                    className={`${styles.reactBtn} ${active ? styles.reactActive : ''}`}
                    onClick={() => setReaction(p => p === r.id ? null : r.id)}
                  >
                    <span className={styles.reactEmoji}>{r.emoji}</span>
                    <span className={styles.reactCount}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.divider} />

          {/* ── Tags ──────────────────────────────────────────────────── */}
          {tags.length > 0 && (
            <>
              <div className={styles.tagsRow}>
                {tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
              <div className={styles.divider} />
            </>
          )}

          {/* ── Comments ──────────────────────────────────────────────── */}
          <div className={styles.commentsBox}>
            <div className={styles.commentsHeader}>
              <span className={styles.commentsTitle}>Comments</span>
              <span className={styles.commentsCount}>{commentCount} comments</span>
            </div>

            <div className={styles.commentInput}>
              <div className={styles.inputAv} style={{ background: 'linear-gradient(135deg,var(--brand),#6B7FFF)' }}>Y</div>
              <div className={styles.inputPlaceholder}>Post Your Comment...</div>
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

          {/* ── Related Videos ────────────────────────────────────────── */}
          {related.length > 0 && (
            <div className={styles.relatedSection}>
              <div className={styles.sectionLabel}>Related Videos</div>
              <div className={styles.relatedList}>
                {related.map(v => (
                  <div key={v.id} className={styles.relCard} onClick={() => onVideoPress && onVideoPress(v)}>
                    <div className={styles.relThumb} style={{ background: v.bg }}>
                      {v.thumbnail ? (
                        <img src={v.thumbnail} alt="" className={styles.relThumbImg} loading="lazy" decoding="async" />
                      ) : (
                        <span className={styles.relEmoji}>{v.emoji}</span>
                      )}
                      <div className={styles.relPlayBtn}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M4 2l6 4-6 4V2z" fill="white"/>
                        </svg>
                      </div>
                      {v.duration && <div className={styles.relDuration}>{v.duration}</div>}
                    </div>
                    <div className={styles.relBody}>
                      <div className={styles.relCat}>{v.catLabel}</div>
                      <div className={styles.relTitle}>{v.title}</div>
                      <div className={styles.relTime}>{v.timeAgo}</div>
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
