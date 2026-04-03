import { useState, useMemo } from 'react';
import styles from './TopicDetailScreen.module.css';
import useTopicPosts from '../hooks/useTopicPosts';
import { replyToTopic } from '../services/api';
import SocialEmbed, { detectPlatform } from '../components/ui/SocialEmbed';

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
  // dedupe
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

  if (!topic) return null;

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
            {topic.locked && <span className={styles.lockedBadge}>Locked</span>}
            {topic.pinned && <span className={styles.pinnedBadge}>Pinned</span>}
          </div>

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

          {/* Author + stats bar */}
          <div className={styles.metaBar}>
            <div className={styles.authorChip}>
              <div className={styles.authorAvatar} style={{ background: topic.forumBg || 'var(--brand)' }}>
                {(topic.poster || 'A').charAt(0).toUpperCase()}
              </div>
              <span className={styles.authorName}>{topic.poster || 'Anonymous'}</span>
              <span className={styles.dot}>·</span>
              <span className={styles.authorTime}>{topic.time || ''}</span>
            </div>

            <div className={styles.statsRow}>
              <span className={styles.stat}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {formatNum(topic.views ?? 0)}
              </span>
              <span className={styles.stat}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 10s-4.5-3-4.5-6a4.5 4.5 0 019 0c0 3-4.5 6-4.5 6z" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {formatNum(topic.likes ?? 0)}
              </span>
              <span className={styles.stat}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1.5h10a.5.5 0 01.5.5v6a.5.5 0 01-.5.5H3l-2.5 2V2a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
                {formatNum(topic.replies ?? 0)}
              </span>
            </div>
          </div>
        </div>

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

            {posts.map((post, i) => (
              <div key={post.id} className={styles.postCard} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className={styles.postHeader}>
                  <div className={styles.postAvatar}>
                    {(post.author || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.postAuthorInfo}>
                    <span className={styles.postAuthor}>{post.author}</span>
                    <span className={styles.postTime}>{post.time}</span>
                  </div>
                  {post.isOp && <span className={styles.opBadge}>OP</span>}
                </div>
                <PostBodyWithEmbeds html={post.message} />
                <div className={styles.postFooter}>
                  <button className={styles.postAction}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 10s-4.5-3-4.5-6a4.5 4.5 0 019 0c0 3-4.5 6-4.5 6z" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    {post.likes > 0 ? formatNum(post.likes) : 'Like'}
                  </button>
                  <button className={styles.postAction}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1.5h10a.5.5 0 01.5.5v6a.5.5 0 01-.5.5H3l-2.5 2V2a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                    Reply
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
