import { useEffect, useRef, useState } from 'react';
import styles from './SocialEmbed.module.css';

// ── Platform detection ───────────────────────────────────────────────────────
function detectPlatform(url) {
  if (!url) return null;
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/reddit\.com/i.test(url)) return 'reddit';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  return null;
}

// ── Script loader (loads once per src) ───────────────────────────────────────
const loadedScripts = new Set();

function loadScript(src, id) {
  if (loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // Check if already in DOM
    if (document.getElementById(id)) {
      loadedScripts.add(src);
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.id = id;
    s.async = true;
    s.onload = () => { loadedScripts.add(src); resolve(); };
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

// ── Twitter/X Embed ──────────────────────────────────────────────────────────
function TwitterEmbed({ url }) {
  const ref = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';

    loadScript('https://platform.twitter.com/widgets.js', 'twitter-wjs')
      .then(() => {
        if (window.twttr?.widgets) {
          window.twttr.widgets.createTweet(
            extractTweetId(url),
            ref.current,
            { align: 'center', conversation: 'none', width: 340 }
          ).then(el => { if (!el) setError(true); });
        }
      })
      .catch(() => setError(true));
  }, [url]);

  if (error) return <FallbackLink url={url} platform="X" icon="𝕏" bg="#000" />;
  return <div ref={ref} className={styles.embedWrap} />;
}

function extractTweetId(url) {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : '';
}

// ── Instagram Embed ──────────────────────────────────────────────────────────
function InstagramEmbed({ url }) {
  const ref = useRef(null);
  const [error, setError] = useState(false);

  // Normalize URL: ensure it ends with /embedded/
  const embedUrl = url.replace(/\/$/, '').replace(/\/embedded\/?$/, '') + '/embedded/';

  useEffect(() => {
    // Try native oEmbed first, fall back to iframe
    loadScript('https://www.instagram.com/embed.js', 'instagram-embed')
      .then(() => {
        if (window.instgrm?.Embeds) {
          window.instgrm.Embeds.process(ref.current);
        }
      })
      .catch(() => setError(true));
  }, [url]);

  if (error) {
    return <FallbackLink url={url} platform="Instagram" icon="IG" bg="linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)" />;
  }

  return (
    <div ref={ref} className={styles.embedWrap}>
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          margin: 0,
          maxWidth: '100%',
          minWidth: '280px',
          width: '100%',
          padding: 0,
        }}
      >
        <a href={url} target="_blank" rel="noopener noreferrer">View on Instagram</a>
      </blockquote>
    </div>
  );
}

// ── Facebook Embed ───────────────────────────────────────────────────────────
function FacebookEmbed({ url }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Initialize Facebook SDK
    window.fbAsyncInit = function() {
      window.FB.init({ xfbml: true, version: 'v19.0' });
      setLoaded(true);
    };

    loadScript('https://connect.facebook.net/en_US/sdk.js', 'facebook-jssdk')
      .then(() => {
        if (window.FB) {
          window.FB.XFBML.parse(ref.current);
          setLoaded(true);
        }
      });
  }, [url]);

  return (
    <div ref={ref} className={styles.embedWrap}>
      <div
        className="fb-post"
        data-href={url}
        data-width="340"
        data-show-text="true"
      />
      {!loaded && <EmbedSkeleton platform="Facebook" />}
    </div>
  );
}

// ── TikTok Embed ─────────────────────────────────────────────────────────────
function TikTokEmbed({ url }) {
  const ref = useRef(null);
  const videoId = url.match(/video\/(\d+)/)?.[1] || '';

  useEffect(() => {
    loadScript('https://www.tiktok.com/embed.js', 'tiktok-embed');
  }, [url]);

  if (!videoId) return <FallbackLink url={url} platform="TikTok" icon="♪" bg="#000" />;

  return (
    <div ref={ref} className={styles.embedWrap}>
      <blockquote
        className="tiktok-embed"
        cite={url}
        data-video-id={videoId}
        style={{ maxWidth: '100%', minWidth: '280px' }}
      >
        <section><a href={url} target="_blank" rel="noopener noreferrer">View on TikTok</a></section>
      </blockquote>
    </div>
  );
}

// ── Reddit Embed (iframe) ────────────────────────────────────────────────────
function RedditEmbed({ url }) {
  // Reddit provides an embed URL pattern
  const embedUrl = url.replace(/\/$/, '') + '/?ref=share&ref_source=embed';

  return (
    <div className={styles.embedWrap}>
      <div className={styles.redditWrap}>
        <iframe
          src={`https://embed.reddit.com${new URL(url).pathname}?theme=light`}
          title="Reddit post"
          sandbox="allow-scripts allow-same-origin allow-popups"
          className={styles.redditFrame}
          loading="lazy"
          scrolling="no"
        />
      </div>
    </div>
  );
}

// ── Fallback link card (when embed fails) ────────────────────────────────────
function FallbackLink({ url, platform, icon, bg }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.fallback}>
      <div className={styles.fallbackIcon} style={{ background: bg }}>{icon}</div>
      <div className={styles.fallbackText}>
        <div className={styles.fallbackLabel}>View on {platform}</div>
        <div className={styles.fallbackUrl}>{url.replace(/https?:\/\/(www\.)?/, '').substring(0, 45)}...</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 4l4 4-4 4" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
function EmbedSkeleton({ platform }) {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonShimmer} />
      <span className={styles.skeletonText}>Loading {platform} embed...</span>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function SocialEmbed({ url, type }) {
  const platform = detectPlatform(url);

  if (!url || !platform) {
    return <FallbackLink url={url || '#'} platform="Link" icon="🔗" bg="var(--text3)" />;
  }

  switch (platform) {
    case 'twitter':   return <TwitterEmbed url={url} />;
    case 'instagram': return <InstagramEmbed url={url} />;
    case 'facebook':  return <FacebookEmbed url={url} />;
    case 'tiktok':    return <TikTokEmbed url={url} />;
    case 'reddit':    return <RedditEmbed url={url} />;
    default:          return <FallbackLink url={url} platform="Link" icon="🔗" bg="var(--text3)" />;
  }
}

export { detectPlatform };
