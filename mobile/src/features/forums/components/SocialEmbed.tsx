import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Linking, ActivityIndicator,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import YoutubeIframe from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';

import {
  detectPlatform,
  extractYouTubeId,
  extractTweetId,
  extractTikTokId,
  extractRedditPath,
  type SocialPlatform,
} from '../utils/socialUrls';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  url: string;
  /** Width the embed is allowed to occupy; defaults to card width. */
  width?: number;
}

const DEFAULT_HEIGHTS: Record<SocialPlatform, number> = {
  youtube:   210,
  twitter:   420,
  instagram: 560,
  facebook:  480,
  tiktok:    720,
  reddit:    420,
};

/**
 * Self-sizing social-media embed. Detects the platform from the URL and
 * renders it inside a WebView (or native YouTube player). The embed reports
 * its rendered height via postMessage so it doesn't clip or waste space.
 */
export default function SocialEmbed({ url, width }: Props) {
  const platform = detectPlatform(url);
  if (!platform) return <FallbackLink url={url} platform="Link" />;

  switch (platform) {
    case 'youtube':   return <YouTubeEmbed   url={url} width={width} />;
    case 'twitter':   return <TwitterEmbed   url={url} width={width} />;
    case 'instagram': return <InstagramEmbed url={url} width={width} />;
    case 'facebook':  return <FacebookEmbed  url={url} width={width} />;
    case 'tiktok':    return <TikTokEmbed    url={url} width={width} />;
    case 'reddit':    return <RedditEmbed    url={url} width={width} />;
  }
}

// ── YouTube ──────────────────────────────────────────────────────────────────
function YouTubeEmbed({ url, width }: { url: string; width?: number }) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const videoId = extractYouTubeId(url);
  if (!videoId) return <FallbackLink url={url} platform="YouTube" />;
  const h = width ? Math.round(width * (9 / 16)) : DEFAULT_HEIGHTS.youtube;
  return (
    <View style={styles.wrap}>
      <YoutubeIframe height={h} videoId={videoId} />
    </View>
  );
}

// ── Twitter / X ──────────────────────────────────────────────────────────────
function TwitterEmbed({ url, width }: { url: string; width?: number }) {
  const tweetId = extractTweetId(url);
  if (!tweetId) return <FallbackLink url={url} platform="X" />;
  const html = buildTweetHtml(tweetId);
  return <AutoHeightWebView html={html} url={url} width={width} platform="twitter" />;
}

// The blockquote+auto-scan approach is flaky: Twitter's widgets.js scans the
// DOM on load and uses IntersectionObserver to decide when to hydrate each
// blockquote into an iframe. That's the "sometimes works / sometimes doesn't"
// pathology — it depends on script load order, DOM readyState, viewport
// intersection, and cached widgets.js version. Any of those can misfire.
//
// The deterministic path is `twttr.widgets.createTweet(id, container, opts)`
// which skips auto-scan and IntersectionObserver entirely: we explicitly tell
// widgets.js which tweet id to render into which element, and it returns a
// Promise that resolves with the iframe when the tweet is actually mounted,
// or rejects if it can't be rendered (deleted, protected, not found).
function buildTweetHtml(tweetId: string): string {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
  html,body{margin:0;padding:0;background:transparent;font-family:-apple-system,system-ui,sans-serif;}
  #tweet{min-width:0;display:flex;justify-content:center;}
  #tweet iframe{max-width:100% !important;}
</style>
</head><body>
<div id="tweet"></div>
<script>
(function(){
  var tweetId = ${JSON.stringify(tweetId)};
  var container = document.getElementById('tweet');
  function fail(){
    try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage('fail'); } catch(_){}
  }
  function measure(){
    try {
      var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      if (window.ReactNativeWebView && h > 0) window.ReactNativeWebView.postMessage(String(h));
    } catch(_){}
  }
  function renderTweet(){
    if (!window.twttr || !window.twttr.widgets || typeof window.twttr.widgets.createTweet !== 'function') {
      fail();
      return;
    }
    try {
      window.twttr.widgets.createTweet(tweetId, container, {
        theme: 'light',
        dnt: true,
        conversation: 'none',
        align: 'center'
      }).then(function(el){
        if (!el) { fail(); return; }
        // The iframe is mounted; Twitter may still be resizing it for a few
        // hundred ms. Measure now and again a beat later.
        measure();
        setTimeout(measure, 400);
        setTimeout(measure, 1200);
        setTimeout(measure, 2500);
      }).catch(function(){ fail(); });
    } catch (_) { fail(); }
  }
  var s = document.createElement('script');
  s.src = 'https://platform.twitter.com/widgets.js';
  s.async = true;
  s.charset = 'utf-8';
  s.onload = renderTweet;
  s.onerror = fail;
  document.head.appendChild(s);
  // Safety net: if widgets.js takes too long, give up so RN can show fallback.
  setTimeout(function(){
    if (!window.twttr) fail();
  }, 10000);
})();
</script>
${HEIGHT_REPORTER}
</body></html>`;
}

// ── Instagram ────────────────────────────────────────────────────────────────
// Instagram's blockquote + embed.js approach is unreliable for Reels and for
// URLs carrying tracking query params like ?igsh=... (the script's lazy
// hydrator silently drops these). The official iframe embed URL — append
// "embed/" to the post path — works for posts, reels, and IGTV without any
// JS dependency, so we use it directly.
function InstagramEmbed({ url, width }: { url: string; width?: number }) {
  const html = buildInstagramHtml(url);
  return <AutoHeightWebView html={html} url={url} width={width} platform="instagram" />;
}

function extractInstagramEmbedSrc(url: string): string | null {
  const m = url.match(/instagram\.com\/(p|reel|reels|tv)\/([\w-]+)/i);
  if (!m) return null;
  const type = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase();
  return `https://www.instagram.com/${type}/${m[2]}/embed/captioned/`;
}

function buildInstagramHtml(url: string): string {
  const src = extractInstagramEmbedSrc(url);
  if (!src) {
    // Fallback to legacy blockquote approach if path can't be parsed.
    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>html,body{margin:0;padding:0;background:transparent;font-family:-apple-system,system-ui,sans-serif;}blockquote.instagram-media{margin:0 !important;min-width:0 !important;width:100% !important;}</style>
</head><body>
<blockquote class="instagram-media" data-instgrm-permalink="${escapeAttr(url)}" data-instgrm-version="14">
  <a href="${escapeAttr(url)}">View on Instagram</a>
</blockquote>
<script async src="https://www.instagram.com/embed.js"></script>
${HEIGHT_REPORTER}
</body></html>`;
  }
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>html,body{margin:0;padding:0;background:transparent;}iframe{width:100%;border:0;display:block;}</style>
</head><body>
<iframe src="${escapeAttr(src)}" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="no" height="560" onload="setTimeout(function(){try{var h=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(String(h));}catch(_){}},200);"></iframe>
${HEIGHT_REPORTER}
</body></html>`;
}

// ── Facebook ─────────────────────────────────────────────────────────────────
function FacebookEmbed({ url, width }: { url: string; width?: number }) {
  const html = buildFacebookHtml(url);
  return <AutoHeightWebView html={html} url={url} width={width} platform="facebook" />;
}

function buildFacebookHtml(url: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>html,body{margin:0;padding:0;background:transparent;font-family:-apple-system,system-ui,sans-serif;}.fb-post,.fb-video{width:100% !important;}</style>
</head><body>
<div id="fb-root"></div>
<script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0"></script>
<div class="fb-post" data-href="${escapeAttr(url)}" data-show-text="true"></div>
${HEIGHT_REPORTER}
</body></html>`;
}

// ── TikTok ───────────────────────────────────────────────────────────────────
function TikTokEmbed({ url, width }: { url: string; width?: number }) {
  const videoId = extractTikTokId(url);
  if (!videoId) return <FallbackLink url={url} platform="TikTok" />;
  const html = buildTikTokHtml(url, videoId);
  return <AutoHeightWebView html={html} url={url} width={width} platform="tiktok" />;
}

function buildTikTokHtml(url: string, videoId: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>html,body{margin:0;padding:0;background:transparent;font-family:-apple-system,system-ui,sans-serif;}blockquote.tiktok-embed{margin:0 !important;max-width:100% !important;}</style>
</head><body>
<blockquote class="tiktok-embed" cite="${escapeAttr(url)}" data-video-id="${escapeAttr(videoId)}">
  <section><a target="_blank" href="${escapeAttr(url)}">View on TikTok</a></section>
</blockquote>
<script async src="https://www.tiktok.com/embed.js"></script>
${HEIGHT_REPORTER}
</body></html>`;
}

// ── Reddit ───────────────────────────────────────────────────────────────────
function RedditEmbed({ url, width }: { url: string; width?: number }) {
  const path = extractRedditPath(url);
  if (!path) return <FallbackLink url={url} platform="Reddit" />;
  const html = buildRedditHtml(path);
  return <AutoHeightWebView html={html} url={url} width={width} platform="reddit" />;
}

function buildRedditHtml(path: string): string {
  const src = `https://embed.reddit.com${path}?theme=light&showmedia=true`;
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>html,body{margin:0;padding:0;background:transparent;}iframe{width:100%;border:0;}</style>
</head><body>
<iframe src="${escapeAttr(src)}" sandbox="allow-scripts allow-same-origin allow-popups" scrolling="no" height="420"></iframe>
${HEIGHT_REPORTER}
</body></html>`;
}

// ── Generic auto-sizing WebView wrapper ──────────────────────────────────────
//
// Two bugs the current design fixes:
//
// (1) "Big empty white box" — the previous version reserved
//     DEFAULT_HEIGHTS[platform] (420–720 px) on mount. If the embed script
//     failed to run (scripts blocked, no network, ad-blocker, etc.) the
//     webview never posted a height message, so that reserved box stayed
//     visible as an empty bordered card.
//
// (2) "Instagram/Twitter never load" — even when the embed script could run,
//     setting the WebView's native height to 1 px (to hide it while pending)
//     gives the inner web page a 1-px viewport. Twitter's widgets.js and
//     Instagram's embed.js both use IntersectionObserver to lazy-load their
//     embeds, so with a 1-px viewport they consider the blockquote off-screen
//     and never inject the iframe. No DOM change ⇒ no height report ⇒
//     timeout ⇒ fallback card. Embeds simply could not render.
//
// How this fixes both:
//   • The WebView is given a real viewport height (PENDING_VIEWPORT_HEIGHT)
//     so embed scripts see the blockquote as visible and actually inject
//     their iframe.
//   • The WebView sits inside a clip container (height:0, overflow:hidden)
//     while pending, so nothing is visible to the user during that time.
//   • Once a valid height arrives, the clip is removed and the WebView
//     expands to match the embed's reported height.
//   • If no height arrives within EMBED_TIMEOUT_MS or the webview errors,
//     we render the existing FallbackLink card (clickable, opens in native
//     app/browser).
const EMBED_TIMEOUT_MS = 12000;
const HEIGHT_MIN = 40;
const HEIGHT_MAX = 3000;
const PENDING_VIEWPORT_HEIGHT = 300;

function AutoHeightWebView({
  html, url, width, platform,
}: {
  html: string;
  url: string;
  width?: number;
  platform: SocialPlatform;
}) {
  const [height, setHeight] = useState(0);
  const [failed, setFailed] = useState(false);
  const hasMeasuredRef = useRef(false);
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasMeasuredRef.current) setFailed(true);
    }, EMBED_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [url]);

  function handleMessage(e: WebViewMessageEvent) {
    const raw = e.nativeEvent.data;
    // Explicit failure signal from the embed (e.g. Twitter's createTweet
    // Promise rejected, widgets.js failed to load, tweet is deleted) —
    // short-circuit the timeout and show the fallback card immediately.
    if (raw === 'fail') {
      setFailed(true);
      return;
    }
    const n = Number(raw);
    if (Number.isFinite(n) && n >= HEIGHT_MIN && n <= HEIGHT_MAX) {
      hasMeasuredRef.current = true;
      setHeight(n);
    }
  }

  if (failed) {
    return <FallbackLink url={url} platform={platformLabel(platform)} />;
  }

  const pending = height === 0;
  const platformName = platformLabel(platform);
  const webViewHeight = pending ? PENDING_VIEWPORT_HEIGHT : height;

  return (
    <View
      style={[
        styles.wrap,
        width ? { width } : null,
        pending ? styles.wrapPending : null,
      ]}
    >
      <View
        style={pending ? styles.webviewClip : null}
        pointerEvents={pending ? 'none' : 'auto'}
      >
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={[styles.webview, { height: webViewHeight }]}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          onMessage={handleMessage}
          onError={() => setFailed(true)}
          onHttpError={() => setFailed(true)}
          startInLoadingState={false}
          androidLayerType="hardware"
          mixedContentMode="always"
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
        />
      </View>
      {pending && (
        <View style={styles.pendingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.loadingText}>Loading {platformName}…</Text>
        </View>
      )}
    </View>
  );
}

function platformLabel(p: SocialPlatform): string {
  switch (p) {
    case 'twitter':   return 'X';
    case 'instagram': return 'Instagram';
    case 'facebook':  return 'Facebook';
    case 'tiktok':    return 'TikTok';
    case 'reddit':    return 'Reddit';
    case 'youtube':   return 'YouTube';
  }
}

// ── Fallback link card (when embed fails or platform unknown) ────────────────
function FallbackLink({ url, platform }: { url: string; platform: string }) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={styles.fallback} onPress={() => Linking.openURL(url).catch(() => {})}>
      <View style={styles.fallbackIcon}>
        <Ionicons name="link-outline" size={14} color="#FFFFFF" />
      </View>
      <View style={styles.fallbackText}>
        <Text style={styles.fallbackLabel}>View on {platform}</Text>
        <Text style={styles.fallbackUrl} numberOfLines={1}>
          {url.replace(/^https?:\/\/(www\.)?/, '')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

// ── Shared JS snippet that reports body height back to RN ────────────────────
// Twitter/Instagram/Facebook/TikTok embed scripts work by injecting an
// <iframe> into the DOM, which then loads the embed. We need to re-measure:
//   • after initial page load (for static content)
//   • when the embed script inserts its iframe (MutationObserver childList)
//   • once the inserted iframe itself finishes loading (iframe 'load' event)
//   • whenever layout changes at any time (ResizeObserver)
// We also dedupe consecutive identical values so we don't spam RN with the
// same number every time a child layout shifts by a pixel.
const HEIGHT_REPORTER = `<script>
(function(){
  var last = -1;
  function send(){
    try {
      var h = Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.documentElement ? document.documentElement.scrollHeight : 0
      );
      if (window.ReactNativeWebView && h > 0 && h !== last) {
        last = h;
        window.ReactNativeWebView.postMessage(String(h));
      }
    } catch(_) {}
  }
  function hookIframe(node) {
    if (node && node.tagName === 'IFRAME') {
      try { node.addEventListener('load', function(){ setTimeout(send, 120); }); } catch(_) {}
    }
  }
  function scanForIframes(root) {
    if (!root) return;
    if (root.tagName === 'IFRAME') hookIframe(root);
    if (root.querySelectorAll) {
      var frames = root.querySelectorAll('iframe');
      for (var i = 0; i < frames.length; i++) hookIframe(frames[i]);
    }
  }
  // Initial + staggered samples to catch embed progress
  [100, 400, 1000, 2500, 5000, 8000, 11000].forEach(function(ms){ setTimeout(send, ms); });
  window.addEventListener('load', function(){ setTimeout(send, 300); });
  // Observe layout changes
  try { new ResizeObserver(send).observe(document.documentElement); } catch(_) {}
  try { new ResizeObserver(send).observe(document.body); } catch(_) {}
  // Observe DOM changes — embed scripts insert iframes here
  try {
    new MutationObserver(function(mutations){
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) scanForIframes(added[j]);
      }
      send();
    }).observe(document.body, { childList: true, subtree: true });
  } catch(_) {}
  // Hook any iframes already present at boot (unlikely, but cheap)
  scanForIframes(document.body);
})();
</script>`;

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginTop: 10,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    // While waiting for the embed to report its height, collapse the wrapper:
    // no borders, no background, no margin — nothing visible until content is
    // ready (or we time out and replace with FallbackLink).
    wrapPending: {
      marginTop: 0,
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    // Clips the WebView to zero visible height while pending. The WebView
    // itself is rendered at a non-zero height (PENDING_VIEWPORT_HEIGHT) so
    // the inner web page has a real viewport — otherwise Twitter/Instagram's
    // IntersectionObserver-based lazy loaders refuse to inject their embed
    // iframes. This clip hides it from the user until the embed reports a
    // real size.
    webviewClip: {
      height: 0,
      overflow: 'hidden',
    },
    pendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    webview: {
      backgroundColor: 'transparent',
      width: '100%',
    },
    loading: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.surface,
    },
    loadingText: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    fallback: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
    },
    fallbackIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackText: {
      flex: 1,
      minWidth: 0,
    },
    fallbackLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: c.text,
    },
    fallbackUrl: {
      fontSize: 10,
      color: c.textTertiary,
      marginTop: 1,
    },
  });
}
