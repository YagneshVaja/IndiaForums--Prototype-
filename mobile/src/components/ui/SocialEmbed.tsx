import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Linking, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeColors } from '../../theme/tokens';

export type SocialPlatform =
  | 'youtube'
  | 'twitter'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'reddit';

export function detectPlatform(url?: string): SocialPlatform | null {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/reddit\.com/i.test(url)) return 'reddit';
  return null;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

function extractTweetId(url: string): string | null {
  const m = url.match(/status\/(\d+)/);
  return m?.[1] ?? null;
}

function extractTikTokId(url: string): string | null {
  const m = url.match(/video\/(\d+)/);
  return m?.[1] ?? null;
}

// ---------------------------------------------------------------------------
// HTML templates
// Each template is a complete self-contained page. The viewport is locked
// and a MutationObserver + polling loop posts the rendered content height
// back to the native side so the View can resize.
// ---------------------------------------------------------------------------

const HEIGHT_SCRIPT = `
  (function(){
    let last = 0;
    function post() {
      const b = document.body;
      const h = Math.max(
        b ? b.scrollHeight : 0,
        b ? b.offsetHeight : 0,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      if (h && Math.abs(h - last) > 4) {
        last = h;
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', value: h }));
        }
      }
    }
    try {
      new MutationObserver(post).observe(document.documentElement, {
        childList: true, subtree: true, attributes: true
      });
    } catch (e) {}
    window.addEventListener('load', function(){ post(); setTimeout(post, 600); setTimeout(post, 1500); setTimeout(post, 3000); });
    window.addEventListener('resize', post);
    setInterval(post, 1200);
    // signal ready
    setTimeout(function(){
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
      }
    }, 800);
  })();
`;

const HEAD = `<!DOCTYPE html><html><head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <style>
    html,body { margin:0; padding:0; background:#FFFFFF; overflow:hidden; -webkit-text-size-adjust:100%; }
    body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
    * { box-sizing:border-box; max-width:100%; }
    iframe { border:0; width:100% !important; max-width:100% !important; }
    .twitter-tweet, .instagram-media, .fb-post, .tiktok-embed { margin:0 auto !important; }
  </style>
</head>`;

function twitterHtml(tweetId: string) {
  return `${HEAD}<body>
    <blockquote class="twitter-tweet" data-conversation="none" data-dnt="true" data-theme="light">
      <a href="https://twitter.com/x/status/${tweetId}">Loading tweet…</a>
    </blockquote>
    <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
    <script>${HEIGHT_SCRIPT}</script>
  </body></html>`;
}

function instagramHtml(url: string) {
  return `${HEAD}<body>
    <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="margin:0;padding:0;max-width:100%;width:100%;min-width:280px;background:#FFF;border:0;">
      <a href="${url}">Loading post…</a>
    </blockquote>
    <script async src="//www.instagram.com/embed.js"></script>
    <script>
      (function retry(){
        if (window.instgrm && window.instgrm.Embeds) { window.instgrm.Embeds.process(); }
        else { setTimeout(retry, 300); }
      })();
    </script>
    <script>${HEIGHT_SCRIPT}</script>
  </body></html>`;
}

function facebookHtml(url: string) {
  return `${HEAD}<body>
    <div id="fb-root"></div>
    <div class="fb-post" data-href="${url}" data-width="500" data-show-text="true"></div>
    <script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0"></script>
    <script>${HEIGHT_SCRIPT}</script>
  </body></html>`;
}

function tiktokHtml(videoId: string, url: string) {
  return `${HEAD}<body>
    <blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}" style="max-width:605px;min-width:280px;margin:0 auto;">
      <section>
        <a target="_blank" title="@user" href="${url}">Loading TikTok…</a>
      </section>
    </blockquote>
    <script async src="https://www.tiktok.com/embed.js"></script>
    <script>${HEIGHT_SCRIPT}</script>
  </body></html>`;
}


// ---------------------------------------------------------------------------
// Auto-sizing WebView wrapper
// Key point: `baseUrl` gives the page a real HTTPS origin so embed scripts
// (which check document.location.origin for CORS/referrer policy) can run.
// ---------------------------------------------------------------------------

interface EmbedWebViewProps {
  html: string;
  initialHeight?: number;
  maxHeight?: number;
  originUrl?: string;
  /** External URL to open when the user taps a link inside the embed */
  externalUrl?: string;
}

function EmbedWebView({
  html,
  initialHeight = 300,
  maxHeight = 1200,
  originUrl = 'https://www.indiaforums.com/',
  externalUrl,
}: EmbedWebViewProps) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [height, setHeight] = useState(initialHeight);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'height' && typeof data.value === 'number' && data.value > 80) {
        setHeight(Math.min(Math.ceil(data.value) + 12, maxHeight));
      }
      if (data.type === 'ready') setReady(true);
    } catch {
      // ignore
    }
  };

  if (failed) {
    return (
      <FallbackLink
        url={externalUrl || originUrl}
        label="Open post"
        icon="open-outline"
      />
    );
  }

  return (
    <View style={[styles.embedWrap, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: originUrl }}
        style={styles.webview}
        containerStyle={styles.webviewContainer}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled={false}
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        setSupportMultipleWindows={false}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        onMessage={onMessage}
        onError={() => setFailed(true)}
        onHttpError={(e) => {
          // 4xx/5xx on the embed itself shouldn't nuke it — scripts retry.
          if (e.nativeEvent.statusCode >= 500) setFailed(true);
        }}
        onShouldStartLoadWithRequest={(req) => {
          // Allow the initial about-url load; open any real navigation externally.
          if (req.url === 'about:blank' || req.url.startsWith(originUrl)) return true;
          if (req.url.startsWith('http')) {
            Linking.openURL(req.url).catch(() => {});
            return false;
          }
          return true;
        }}
      />
      {!ready ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

// YouTube: the iframe MUST live inside a real HTML document served with a
// valid top-level referrer, or YouTube's embed guard throws Error 153
// ("player configuration error"). Loading /embed/VIDEO_ID directly as the
// top-level URL fails that check because the page sees itself as a
// navigation, not an embed.
function youtubeHtml(videoId: string) {
  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
    <style>
      html,body { margin:0; padding:0; background:#000; height:100%; width:100%; overflow:hidden; }
      #player { position:absolute; inset:0; width:100%; height:100%; border:0; }
    </style>
  </head><body>
    <iframe
      id="player"
      src="https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1&enablejsapi=0"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      allowfullscreen
      webkitallowfullscreen
      mozallowfullscreen></iframe>
  </body></html>`;
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.youtubeWrap}>
      <WebView
        originWhitelist={['*']}
        source={{
          html: youtubeHtml(videoId),
          // A real https baseUrl so the iframe's parent referrer satisfies
          // YouTube's embed policy. Use a well-known domain that allows
          // embedding by default.
          baseUrl: 'https://www.google.com/',
        }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        androidLayerType="hardware"
        userAgent={
          Platform.OS === 'android'
            ? 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            : undefined
        }
      />
    </View>
  );
}

// Fallback pill when URL is unparseable / unsupported / embed failed
function FallbackLink({
  url,
  label,
  icon,
}: {
  url: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.fallback} onPress={() => Linking.openURL(url).catch(() => {})}>
      <View style={styles.fallbackIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.fallbackText}>
        <Text style={styles.fallbackLabel}>{label}</Text>
        <Text style={styles.fallbackUrl} numberOfLines={1}>
          {url.replace(/^https?:\/\/(www\.)?/, '')}
        </Text>
      </View>
      <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface SocialEmbedProps {
  url: string;
  platformHint?: SocialPlatform | null;
}

export default function SocialEmbed({ url, platformHint }: SocialEmbedProps) {
  const platform = platformHint ?? detectPlatform(url);

  if (!url) return null;
  if (!platform) return <FallbackLink url={url} label="View link" icon="link" />;

  if (platform === 'youtube') {
    const id = extractYouTubeId(url);
    if (!id) return <FallbackLink url={url} label="Watch on YouTube" icon="logo-youtube" />;
    return <YouTubeEmbed videoId={id} />;
  }

  if (platform === 'twitter') {
    const id = extractTweetId(url);
    if (!id) return <FallbackLink url={url} label="View on X (Twitter)" icon="logo-twitter" />;
    return (
      <EmbedWebView
        html={twitterHtml(id)}
        initialHeight={360}
        maxHeight={800}
        originUrl="https://twitter.com/"
        externalUrl={url}
      />
    );
  }

  if (platform === 'instagram') {
    return (
      <EmbedWebView
        html={instagramHtml(url)}
        initialHeight={540}
        maxHeight={900}
        originUrl="https://www.instagram.com/"
        externalUrl={url}
      />
    );
  }

  if (platform === 'facebook') {
    return (
      <EmbedWebView
        html={facebookHtml(url)}
        initialHeight={420}
        maxHeight={900}
        originUrl="https://www.facebook.com/"
        externalUrl={url}
      />
    );
  }

  if (platform === 'tiktok') {
    const id = extractTikTokId(url);
    if (!id) return <FallbackLink url={url} label="View on TikTok" icon="musical-notes" />;
    return (
      <EmbedWebView
        html={tiktokHtml(id, url)}
        initialHeight={640}
        maxHeight={900}
        originUrl="https://www.tiktok.com/"
        externalUrl={url}
      />
    );
  }

  if (platform === 'reddit') {
    return <FallbackLink url={url} label="View on Reddit" icon="logo-reddit" />;
  }

  return <FallbackLink url={url} label="View link" icon="link" />;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    embedWrap: {
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
      position: 'relative',
    },
    webview: {
      backgroundColor: 'transparent',
      flex: 1,
    },
    webviewContainer: {
      backgroundColor: 'transparent',
    },
    loading: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    youtubeWrap: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: '#000000',
      borderRadius: 12,
      overflow: 'hidden',
    },
    fallback: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    fallbackIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackText: { flex: 1 },
    fallbackLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
    },
    fallbackUrl: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 2,
    },
  });
}
