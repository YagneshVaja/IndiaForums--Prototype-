import { useState, useMemo } from 'react';
import styles from './TopicDetailScreen.module.css';
import useTopicPosts from '../hooks/useTopicPosts';
import { replyToTopic } from '../services/api';
import SocialEmbed from '../components/ui/SocialEmbed';

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// ── Extract social-media URLs from HTML message ─────────────────────────────
const SOCIAL_URL_RE = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com|instagram\.com|facebook\.com|fb\.watch|tiktok\.com|reddit\.com|youtube\.com|youtu\.be)[^\s"'<)]+/gi;

function extractSocialUrls(html) {
  if (!html) return [];
  const matches = html.match(SOCIAL_URL_RE);
  if (!matches) return [];
  return [...new Set(matches)];
}

// ── Topic description with embedded social content ──────────────────────────
function TopicBodyWithEmbeds({ text }) {
  const socialUrls = useMemo(() => {
    if (!text) return [];
    const matches = text.match(SOCIAL_URL_RE);
    return matches ? [...new Set(matches)] : [];
  }, [text]);

  return (
    <>
      <p className={styles.topicBody}>{text}</p>
      {socialUrls.length > 0 && (
        <div className={styles.embedsRow}>
          {socialUrls.map(url => (
            <SocialEmbed key={url} url={url} />
          ))}
        </div>
      )}
    </>
  );
}

// ── Post body with embedded social content ──────────────────────────────────
function PostBodyWithEmbeds({ html }) {
  const socialUrls = useMemo(() => extractSocialUrls(html), [html]);

  return (
    <>
      <div className={styles.postBody} dangerouslySetInnerHTML={{ __html: html }} />
      {socialUrls.length > 0 && (
        <div className={styles.embedsRow}>
          {socialUrls.map(url => (
            <SocialEmbed key={url} url={url} />
          ))}
        </div>
      )}
    </>
  );
}

export default function TopicDetailScreen({ topic }) {
  const { posts, loading, loadingMore, error, hasMore, loadMore, refresh } = useTopicPosts(topic?.id);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending]     = useState(false);
  const [replyError, setReplyError] = useState(null);
  const [sortBy, setSortBy] = useState('date');

  if (!topic) return null;

  const sortedPosts = sortBy === 'likes'
    ? [...posts].sort((a, b) => (b.likes || 0) - (a.likes || 0))
    : posts;

  async function handleReply() {
    if (!replyText.trim() || sending) return;
    setSending(true);
    setReplyError(null);
    try {
      await replyToTopic(topic.id, replyText.trim());
      setReplyText('');
      refresh();
    } catch (err) {
      setReplyError(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.scrollArea}>

        {/* ── Topic card (OP) ── */}
        <div className={styles.topicCard}>

          {/* Forum breadcrumb */}
          <div className={styles.forumRow}>
            <div className={styles.forumBadge} style={{ background: topic.forumBg || 'var(--brand)' }}>
              {topic.forumEmoji || '💬'}
            </div>
            <span className={styles.forumName}>{topic.forumName || 'Forum'}</span>
          </div>

          {/* Badges */}
          {(topic.locked || topic.pinned) && (
            <div className={styles.badgeRow}>
              {topic.locked && <span className={styles.lockedBadge}>Locked</span>}
              {topic.pinned && <span className={styles.pinnedBadge}>Pinned</span>}
            </div>
          )}

          {/* Title */}
          <h2 className={styles.topicTitle}>{topic.title}</h2>

          {/* Description + embeds */}
          {topic.description && (
            <TopicBodyWithEmbeds text={topic.description} />
          )}

          {/* Tags */}
          {topic.tags?.length > 0 && (
            <div className={styles.tagRow}>
              {topic.tags.map(t => (
                <span key={t.id} className={styles.tag}>{t.name}</span>
              ))}
            </div>
          )}

          {/* Stats bar */}
          <div className={styles.topicStatsBar}>
            <div className={styles.topicStatItem}>
              <span className={styles.topicStatVal}>{formatNum(topic.replies ?? 0)}</span>
              <span className={styles.topicStatLbl}>Replies</span>
            </div>
            <div className={styles.topicStatItem}>
              <span className={styles.topicStatVal}>{formatNum(topic.views ?? 0)}</span>
              <span className={styles.topicStatLbl}>Views</span>
            </div>
            <div className={styles.topicStatItem}>
              <span className={styles.topicStatVal}>{formatNum(topic.likes ?? 0)}</span>
              <span className={styles.topicStatLbl}>Likes</span>
            </div>
          </div>

          {/* Author */}
          <div className={styles.authorChip}>
            <div className={styles.authorAvatar} style={{ background: topic.forumBg || 'var(--brand)' }}>
              {(topic.poster || 'A').charAt(0).toUpperCase()}
            </div>
            <div className={styles.authorInfo}>
              <span className={styles.authorName}>{topic.poster || 'Anonymous'}</span>
              <span className={styles.authorTime}>Created {topic.time || ''}</span>
            </div>
          </div>
        </div>

        {/* ── Sort controls ── */}
        {!loading && posts.length > 0 && (
          <div className={styles.sortRow}>
            <span className={styles.sortLabel}>Sort:</span>
            <button
              className={`${styles.sortBtn} ${sortBy === 'date' ? styles.sortBtnActive : ''}`}
              onClick={() => setSortBy('date')}
            >By Date</button>
            <button
              className={`${styles.sortBtn} ${sortBy === 'likes' ? styles.sortBtnActive : ''}`}
              onClick={() => setSortBy('likes')}
            >By Likes</button>
          </div>
        )}

        {/* ── Posts section label ── */}
        {!loading && posts.length > 0 && (
          <div className={styles.sectionLabel}>
            <span className={styles.sectionText}>Replies</span>
            <span className={styles.sectionCount}>{posts.length}</span>
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className={styles.postsList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeletonPost}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonLine} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonMed}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className={styles.errorBox}>
            <span className={styles.errorText}>{error}</span>
            <button className={styles.retryBtn} onClick={refresh}>Retry</button>
          </div>
        )}

        {/* ── Posts ── */}
        {!loading && !error && (
          <div className={styles.postsList}>
            {posts.length === 0 && (
              <div className={styles.emptyBox}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M2 2h20a1 1 0 011 1v14a1 1 0 01-1 1H6l-5 4V3a1 1 0 011-1z" stroke="var(--text3)" strokeWidth="1.6" strokeLinejoin="round"/>
                </svg>
                <span className={styles.emptyText}>No replies yet{!topic.locked ? ' — be the first!' : ''}</span>
              </div>
            )}

            {sortedPosts.map((post, i) => (
              <div key={post.id} className={styles.postCard} style={{ animationDelay: `${i * 0.04}s` }}>
                {/* Post header */}
                <div className={styles.postHeader}>
                  <div className={styles.postAvatar}>
                    {post.avatarUrl
                      ? <img src={post.avatarUrl} alt="" className={styles.postAvatarImg} />
                      : <span className={styles.postAvatarLetter}>{(post.author || 'A').charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div className={styles.postAuthorInfo}>
                    <div className={styles.postAuthorRow}>
                      <span className={styles.postAuthor}>{post.author}</span>
                      {post.isOp && <span className={styles.opBadge}>OP</span>}
                    </div>
                    <span className={styles.postTime}>{post.time}</span>
                  </div>
                  <span className={styles.postNumber}>#{i + 1}</span>
                </div>

                {/* Post content */}
                <PostBodyWithEmbeds html={post.message} />

                {/* Post footer with actions */}
                <div className={styles.postFooter}>
                  <button className={styles.postAction}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M6.5 11s-5-3.5-5-7a5 5 0 0110 0c0 3.5-5 7-5 7z" stroke="currentColor" strokeWidth="1.1"/>
                    </svg>
                    {post.likes > 0 ? formatNum(post.likes) : 'Like'}
                  </button>
                  <button className={styles.postAction}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 2h9a1 1 0 011 1v5a1 1 0 01-1 1H4l-3 2.5V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                    </svg>
                    Reply
                  </button>
                  <button className={styles.postAction}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 3h6v7H2z" stroke="currentColor" strokeWidth="1.1"/>
                      <path d="M5 1h6v7" stroke="currentColor" strokeWidth="1.1"/>
                    </svg>
                    Quote
                  </button>
                  <button className={`${styles.postAction} ${styles.postActionRight}`}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M8 1l4 4-4 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 5H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                    </svg>
                    Share
                  </button>
                </div>
              </div>
            ))}

            {loadingMore && Array.from({ length: 2 }).map((_, i) => (
              <div key={`lm-${i}`} className={styles.skeletonPost}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonLine} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && !loadingMore && !loading && (
          <button className={styles.loadMoreBtn} onClick={loadMore}>
            Load More Replies
          </button>
        )}

        <div className={styles.spacer} />
      </div>

      {/* ── Reply input (fixed at bottom) ── */}
      {!topic.locked && (
        <div className={styles.replyBar}>
          <div className={styles.replyAvatar}>Y</div>
          <input
            className={styles.replyInput}
            placeholder="Write a reply..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleReply(); }}
            disabled={sending}
          />
          <button
            className={`${styles.sendBtn} ${replyText.trim() ? styles.sendActive : ''}`}
            onClick={handleReply}
            disabled={!replyText.trim() || sending}
          >
            {sending ? (
              <span className={styles.sendSpinner} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8l5-6v4h5a2 2 0 012 2v0a2 2 0 01-2 2H7v4L2 8z" fill="currentColor"/>
              </svg>
            )}
          </button>
          {replyError && <div className={styles.replyError}>{replyError}</div>}
        </div>
      )}
      {topic.locked && (
        <div className={styles.lockedBar}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          This topic is locked
        </div>
      )}
    </div>
  );
}
