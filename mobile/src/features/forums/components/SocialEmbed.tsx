import React, { useMemo, useState } from 'react';
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
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
  const html = buildTweetHtml(url);
  return <AutoHeightWebView html={html} width={width} platform="twitter" />;
}

function buildTweetHtml(url: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>html,body{margin:0;padding:0;background:transparent;font-family:-apple-system,system-ui,sans-serif;}blockquote.twitter-tweet{margin:0 !important;}</style>
</head><body>
<blockquote class="twitter-tweet" data-conversation="none" data-dnt="true">
  <a href="${escapeAttr(url)}"></a>
</blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
${HEIGHT_REPORTER}
</body></html>`;
}

// ── Instagram ────────────────────────────────────────────────────────────────
function InstagramEmbed({ url, width }: { url: string; width?: number }) {
  const html = buildInstagramHtml(url);
  return <AutoHeightWebView html={html} width={width} platform="instagram" />;
}

function buildInstagramHtml(url: string): string {
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

// ── Facebook ─────────────────────────────────────────────────────────────────
function FacebookEmbed({ url, width }: { url: string; width?: number }) {
  const html = buildFacebookHtml(url);
  return <AutoHeightWebView html={html} width={width} platform="facebook" />;
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
  return <AutoHeightWebView html={html} width={width} platform="tiktok" />;
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
  return <AutoHeightWebView html={html} width={width} platform="reddit" />;
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
function AutoHeightWebView({
  html, width, platform,
}: {
  html: string;
  width?: number;
  platform: SocialPlatform;
}) {
  const [height, setHeight] = useState(DEFAULT_HEIGHTS[platform]);
  const [loading, setLoading] = useState(true);
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  function handleMessage(e: WebViewMessageEvent) {
    const n = Number(e.nativeEvent.data);
    if (Number.isFinite(n) && n > 60 && n < 3000) {
      setHeight(n);
    }
  }

  return (
    <View style={[styles.wrap, width ? { width } : null]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={[styles.webview, { height }]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        startInLoadingState={false}
        androidLayerType="hardware"
      />
      {loading && (
        <View style={[styles.loading, { height }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading {platform}…</Text>
        </View>
      )}
    </View>
  );
}

// ── Fallback link card (when embed fails or platform unknown) ────────────────
function FallbackLink({ url, platform }: { url: string; platform: string }) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
const HEIGHT_REPORTER = `<script>
(function(){
  function send(){
    try {
      var h = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      if (window.ReactNativeWebView && h > 0) {
        window.ReactNativeWebView.postMessage(String(h));
      }
    } catch(_) {}
  }
  if (document.readyState === 'complete') setTimeout(send, 400);
  else window.addEventListener('load', function(){ setTimeout(send, 400); });
  setTimeout(send, 1500);
  setTimeout(send, 3000);
  try { new ResizeObserver(send).observe(document.body); } catch(_) {}
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
