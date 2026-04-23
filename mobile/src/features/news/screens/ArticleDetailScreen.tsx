import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, NewsStackParamList } from '../../../navigation/types';
import {
  fetchArticleDetails,
  type Article,
  type ArticleDetail,
  type ArticleItem,
} from '../../../services/api';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import SocialEmbed, { detectPlatform as detectSocialUrl } from '../../../components/ui/SocialEmbed';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Styles = ReturnType<typeof makeStyles>;

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'ArticleDetail'>
  | NativeStackScreenProps<NewsStackParamList, 'ArticleDetail'>;

// ── Reactions ────────────────────────────────────────────────────────────
const REACTIONS = [
  { id: 'nice', emoji: '😊', label: 'Nice' },
  { id: 'great', emoji: '👍', label: 'Great' },
  { id: 'loved', emoji: '❤️', label: 'Loved' },
  { id: 'lol', emoji: '😂', label: 'LOL' },
  { id: 'omg', emoji: '😮', label: 'OMG' },
  { id: 'cry', emoji: '😢', label: 'Cry' },
  { id: 'fail', emoji: '👎', label: 'Fail' },
];

// ── Static entities (fallback when API has no jsonData) ─────────────────
type Entity = { id: string; name: string; role: string; emoji: string; bg: string };

const CATEGORY_ENTITIES: Record<string, Entity[]> = {
  MOVIES: [
    { id: 'srk', name: 'Shah Rukh Khan', role: 'Actor', emoji: '🌟', bg: '#1a1a2e' },
    { id: 'dp', name: 'Deepika Padukone', role: 'Actress', emoji: '✨', bg: '#831843' },
    { id: 'stree3', name: 'Stree 3', role: 'Movie · 2026', emoji: '🎬', bg: '#7f1d1d' },
  ],
  TELEVISION: [
    { id: 'anupamaa', name: 'Anupamaa', role: 'Star Plus', emoji: '👑', bg: '#1c3a5e' },
    { id: 'yrkkh', name: 'YRKKH', role: 'Star Plus', emoji: '📺', bg: '#4a1942' },
    { id: 'bb18', name: 'Bigg Boss 18', role: 'Colors TV', emoji: '🎤', bg: '#2d1b69' },
  ],
  SPORTS: [
    { id: 'rohit', name: 'Rohit Sharma', role: 'Cricketer', emoji: '🏏', bg: '#14532d' },
    { id: 'bumrah', name: 'Jasprit Bumrah', role: 'Cricketer', emoji: '🏆', bg: '#1e3a8a' },
    { id: 'ipl', name: 'IPL 2026', role: 'Tournament', emoji: '🥇', bg: '#7f1d1d' },
  ],
  DIGITAL: [
    { id: 'netflix', name: 'Netflix India', role: 'OTT Platform', emoji: '🎞️', bg: '#7f1d1d' },
    { id: 'prime', name: 'Prime Video', role: 'OTT Platform', emoji: '📱', bg: '#1e293b' },
    { id: 'panchayat', name: 'Panchayat S4', role: 'Web Series', emoji: '🌾', bg: '#3b2f04' },
  ],
  LIFESTYLE: [
    { id: 'alia', name: 'Alia Bhatt', role: 'Actress · Fashion', emoji: '💄', bg: '#831843' },
    { id: 'ranveer', name: 'Ranveer Singh', role: 'Actor · Style Icon', emoji: '👗', bg: '#431407' },
    { id: 'deepika', name: 'Deepika Padukone', role: 'Actress · Fashion', emoji: '✨', bg: '#831843' },
  ],
};

// ── Article-type helpers ─────────────────────────────────────────────────
// articleTypeId values come from the API:
//   1 Normal · 2 Listicle Num Asc · 6 Listicle · 7 Listicle Num Desc · 8 Live News
const LISTICLE_TYPES = new Set<number>([2, 6, 7]);
const LIVE_NEWS_TYPE = 8;

// Listicle entries / live-news updates are flagged with subItem=true.
// Intro/outro items come before/after them with subItem=false.
function partitionItems(items: ArticleItem[]) {
  const header: ArticleItem[] = [];
  const entries: ArticleItem[] = [];
  const trailing: ArticleItem[] = [];
  let seenEntry = false;
  for (const it of items) {
    if (it.subItem) {
      seenEntry = true;
      entries.push(it);
    } else if (!seenEntry) {
      header.push(it);
    } else {
      trailing.push(it);
    }
  }
  return { header, entries, trailing, hasEntries: seenEntry };
}

// "just now", "14m ago", "3h ago", "2d ago", otherwise absolute short date.
function relativeAgo(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffSec = (Date.now() - d.getTime()) / 1000;
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

// "4:32 PM" same-day, "Oct 6, 4:32 PM" otherwise.
function formatExactTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return time;
  const date = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  return `${date}, ${time}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C');
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

type BodyBlock =
  | { type: 'para'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'quote'; text: string; author?: string }
  | { type: 'image'; src: string; caption?: string }
  | { type: 'embed'; url: string };

// Extract URLs from iframes + social blockquote permalinks so they can be
// surfaced as 'embed' blocks instead of stripped by the tag remover.
function extractEmbedUrls(html: string): string[] {
  const urls: string[] = [];
  const iframeRe = /<iframe\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = iframeRe.exec(html)) !== null) urls.push(m[1]);
  const tweetRe = /https?:\/\/(?:twitter\.com|x\.com)\/[^\s"'<>]+\/status\/\d+/gi;
  const igRe = /https?:\/\/(?:www\.)?instagram\.com\/p\/[\w-]+/gi;
  const fbRe = /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+\/(?:posts|videos)\/[\w-]+/gi;
  const ttRe = /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>/]+\/video\/\d+/gi;
  [tweetRe, igRe, fbRe, ttRe].forEach((re) => {
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(html)) !== null) urls.push(mm[0]);
  });
  return Array.from(new Set(urls));
}

// Extract every <img src="..."> (handles both quote styles, self-closed or not)
function extractImgSrcs(html: string): string[] {
  const srcs: string[] = [];
  const re = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) srcs.push(m[1]);
  return srcs;
}

// Parse HTML into an ordered list of blocks. Walks the string by position so
// inline <img> tags inside <p>/<div> still surface as image blocks, and text
// without recognized tags still becomes paragraphs.
function parseHtmlToBlocks(html: string): BodyBlock[] {
  if (!html) return [];
  const blocks: BodyBlock[] = [];

  // Emit a paragraph block from inner HTML, separating any <img> tags
  // so they surface as image blocks in order.
  const emitParagraphWithImages = (inner: string) => {
    const imgSplit = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let lastIdx = 0;
    let im: RegExpExecArray | null;
    while ((im = imgSplit.exec(inner)) !== null) {
      const before = inner.slice(lastIdx, im.index);
      const beforeText = stripTags(before);
      if (beforeText) blocks.push({ type: 'para', text: beforeText });
      blocks.push({ type: 'image', src: im[1] });
      lastIdx = im.index + im[0].length;
    }
    const rest = inner.slice(lastIdx);
    extractEmbedUrls(rest).forEach((url) => blocks.push({ type: 'embed', url }));
    const restText = stripTags(rest);
    if (restText) blocks.push({ type: 'para', text: restText });
  };

  // Block-level tags we care about. Order doesn't matter; we walk positions.
  const blockRe = /<(h[1-6]|p|blockquote|li|div|figure)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let lastEnd = 0;

  while ((m = blockRe.exec(html)) !== null) {
    // Emit images and embeds that appeared between the previous block and this one
    const gap = html.slice(lastEnd, m.index);
    extractImgSrcs(gap).forEach((src) => blocks.push({ type: 'image', src }));
    extractEmbedUrls(gap).forEach((url) => blocks.push({ type: 'embed', url }));

    const tag = m[1].toLowerCase();
    const inner = m[2] ?? '';
    if (/^h[1-6]$/.test(tag)) {
      const t = stripTags(inner);
      if (t) blocks.push({ type: 'heading', text: t });
    } else if (tag === 'blockquote') {
      const t = stripTags(inner);
      if (t) blocks.push({ type: 'quote', text: t });
    } else if (tag === 'li') {
      const t = stripTags(inner);
      if (t) blocks.push({ type: 'para', text: `\u2022 ${t}` });
    } else {
      // p, div, figure — may contain <img> inline alongside text
      emitParagraphWithImages(inner);
    }
    lastEnd = m.index + m[0].length;
  }

  // Trailing gap after last block element
  const tail = html.slice(lastEnd);
  if (blocks.length === 0) {
    // No block tags at all — treat as flat HTML: images + embeds + text
    extractImgSrcs(html).forEach((src) => blocks.push({ type: 'image', src }));
    extractEmbedUrls(html).forEach((url) => blocks.push({ type: 'embed', url }));
    const cleaned = stripTags(html);
    if (cleaned) {
      cleaned
        .split(/\n\n+|(?<=[.!?])\s+(?=[A-Z])/)
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => blocks.push({ type: 'para', text: t }));
    }
  } else if (tail.trim()) {
    extractImgSrcs(tail).forEach((src) => blocks.push({ type: 'image', src }));
    extractEmbedUrls(tail).forEach((url) => blocks.push({ type: 'embed', url }));
    const tailText = stripTags(tail);
    if (tailText) blocks.push({ type: 'para', text: tailText });
  }

  return blocks;
}

function seededCount(seed: number, min: number, max: number): number {
  const x = Math.sin(seed + 1) * 10_000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── Category-specific subtitle fallback (mirrors prototype getSubtitle) ──
function getFallbackSubtitle(category: string): string {
  const cat = (category || '').toUpperCase();
  const map: Record<string, string> = {
    TELEVISION:
      'The latest episode has sparked massive conversations online, with fans unable to stop discussing the unexpected twist that nobody saw coming.',
    MOVIES:
      "In the middle of an already explosive buzz, this unexpected development has added a new layer to the film's already massive online presence.",
    SPORTS:
      'This stunning moment has the entire nation talking, as fans celebrate one of the most memorable performances of the entire season.',
    DIGITAL:
      'The OTT landscape just got a whole lot more exciting, as this announcement has fans eagerly counting down the days to release.',
    LIFESTYLE:
      'Once again setting the internet on fire, this revelation is being called one of the most talked-about moments of the year.',
  };
  return (
    map[cat] ??
    'This story is rapidly gaining traction as social media buzzes non-stop about the latest twist in this unfolding narrative.'
  );
}

// ── Generated body fallback (mirrors prototype buildBody) ───────────────
function buildGeneratedBody(article: ArticleDetail): BodyBlock[] {
  const cat = (article.category || '').toUpperCase();
  const t = article.title;
  const src = article.authorName || 'IF News Desk';
  const tLower = t.toLowerCase().replace(/[!?]$/, '');
  const timeStr = article.timeAgo || 'recently';

  const intros: Record<string, string> = {
    TELEVISION: `In a development that has left fans completely stunned, the latest episode brought major shocks as ${tLower}. Audiences across the country are reacting with disbelief and excitement on every platform.`,
    MOVIES: `The film industry is buzzing with excitement as ${tLower}. This announcement has set social media on fire, with fans expressing their delight across every corner of the internet.`,
    SPORTS: `In a thrilling turn of events, ${tLower}. The moment has already been replayed millions of times and is being called one of the highlights of the entire season.`,
    DIGITAL: `The OTT world is witnessing a landmark moment as ${tLower}. Viewers and critics alike are heaping praise on this latest development that took everyone by surprise.`,
    LIFESTYLE: `Setting new trends as always, ${tLower}. The internet simply cannot stop talking about this latest revelation from the world of glamour and lifestyle.`,
  };
  const intro =
    intros[cat] ??
    `In a major development that has captured everyone's attention, ${tLower}. Fans and industry insiders are reacting with enormous enthusiasm.`;

  return [
    { type: 'para', text: intro },
    { type: 'heading', text: 'What Started It All' },
    {
      type: 'para',
      text: `According to sources close to ${src}, this has been in the works for quite some time. Multiple insiders have confirmed the development, lending credibility to what was previously only speculation. The response from the community has been overwhelmingly positive, with trending hashtags already making the rounds on X, Instagram, and WhatsApp groups across the country.`,
    },
    {
      type: 'para',
      text: `This is not the first time we have seen such a development in this space. Over the past year, the entertainment industry has witnessed a series of surprises — but this one clearly stands apart from the rest. Experts are already calling it a "game changer" that could define the direction for the rest of 2026.`,
    },
    { type: 'heading', text: 'The Internet Reacts' },
    {
      type: 'para',
      text: `Social media has exploded with reactions from fans all over the country and beyond. The hashtag has been trending nationwide since the news first broke ${timeStr}. Fans are expressing emotions ranging from pure joy to complete disbelief, with many saying they had been waiting for exactly this moment for a very long time.`,
    },
    {
      type: 'quote',
      text: `"This is exactly what we needed! Absolutely cannot wait to see what happens next. India Forums breaking this first — as always!"`,
      author: 'Fan reaction on X (formerly Twitter)',
    },
    { type: 'heading', text: 'Silence From Both Sides' },
    {
      type: 'para',
      text: `Interestingly, neither side has issued an official statement at the time of writing. Sources suggest an announcement could be imminent, but for now the silence is speaking volumes. The internet, as always, is filling in the gaps with theories, memes, and speculation.`,
    },
    {
      type: 'para',
      text: `As more details continue to emerge, India Forums will keep you updated with every single development. Stay tuned for exclusive insights, behind-the-scenes updates, and expert analysis on this story.`,
    },
  ];
}

// ── Screen ───────────────────────────────────────────────────────────────
export default function ArticleDetailScreen({ route, navigation }: Props) {
  const { id, thumbnailUrl: routeThumb } = route.params;
  const [reaction, setReaction] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: article, isLoading, isError, refetch } = useQuery({
    queryKey: ['article', id],
    queryFn: () => fetchArticleDetails(id),
    staleTime: 10 * 60 * 1000,
  });

  const seed = useMemo(() => {
    if (!article) return 0;
    return article.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  }, [article]);

  const reactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    REACTIONS.forEach((r, i) => { counts[r.id] = seededCount(seed + i * 17, 0, 120); });
    return counts;
  }, [seed]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Article" onBack={() => navigation.goBack()} />
        <LoadingState />
      </View>
    );
  }

  if (isError || !article) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Article" onBack={() => navigation.goBack()} />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  const viewCount = article.viewCount || seededCount(seed * 7, 4200, 98_000);
  const commentCount = article.commentCount || seededCount(seed * 3, 14, 297);
  const parsedBlocks = parseHtmlToBlocks(article.body);
  const hasItems = article.articleItems && article.articleItems.length > 0;
  // Fallback chain: articleItems → parsed HTML blocks → generated body
  const bodyBlocks = parsedBlocks.length > 0 ? parsedBlocks : buildGeneratedBody(article);
  const subtitle = article.subtitle || getFallbackSubtitle(article.category);
  const crumbs = buildCrumbs(article);
  const topCat = (article.category || 'MOVIES').toUpperCase();
  const entities = CATEGORY_ENTITIES[topCat] || CATEGORY_ENTITIES.MOVIES;

  const heroThumb = article.thumbnailUrl || routeThumb || '';

  const navigateToArticle = (a: Article) => {
    (navigation as NativeStackScreenProps<HomeStackParamList, 'ArticleDetail'>['navigation']).push(
      'ArticleDetail',
      { id: a.id, thumbnailUrl: a.thumbnailUrl, title: a.title },
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <TopNavBack title="Article" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {heroThumb ? (
            <Image source={{ uri: heroThumb }} style={styles.heroImg} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImg, styles.heroFallback]}>
              <Text style={styles.heroEmoji}>{article.emoji ?? '📰'}</Text>
            </View>
          )}
          <View style={styles.heroBadges}>
            {article.breaking ? (
              <View style={styles.badgeBreaking}>
                <Text style={styles.badgeBreakingText}>BREAKING</Text>
              </View>
            ) : null}
            {article.tag ? (
              <View style={styles.badgeTag}>
                <Text style={styles.badgeTagText}>{article.tag}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Hero caption */}
        <Text style={styles.heroCaption}>
          <Text style={styles.heroCaptionBold}>India Forums</Text> · Photo for representation
        </Text>

        <View style={styles.content}>
          {/* Breadcrumb */}
          <View style={styles.breadcrumb}>
            {crumbs.map((b, i) => (
              <React.Fragment key={`${b}-${i}`}>
                <Text style={i === crumbs.length - 1 ? styles.bcActive : styles.bcLink}>{b}</Text>
                {i < crumbs.length - 1 ? <Text style={styles.bcSep}> › </Text> : null}
              </React.Fragment>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Meta card */}
          <View style={styles.metaCard}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>IF</Text>
            </View>
            <View style={styles.metaInfo}>
              <Text style={styles.authorName}>{article.authorName}</Text>
              <Text style={styles.authorMeta}>
                {article.timeAgo} · {article.readTime}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Ionicons name="eye-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.statText}>{formatCount(viewCount)}</Text>
              </View>
              <View style={styles.statChip}>
                <Ionicons name="chatbubble-outline" size={11} color={colors.textTertiary} />
                <Text style={styles.statText}>{formatCount(commentCount)}</Text>
              </View>
            </View>
          </View>

          {/* Share row */}
          <View style={styles.shareRow}>
            <Text style={styles.shareLabel}>Share:</Text>
            <Pressable style={[styles.shareBtn, { backgroundColor: '#1877F2' }]} hitSlop={4}>
              <Ionicons name="logo-facebook" size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable style={[styles.shareBtn, { backgroundColor: '#000000' }]} hitSlop={4}>
              <Ionicons name="logo-twitter" size={15} color="#FFFFFF" />
            </Pressable>
            <Pressable style={[styles.shareBtn, { backgroundColor: '#25D366' }]} hitSlop={4}>
              <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable style={[styles.shareBtn, styles.shareBtnBordered]} hitSlop={4}>
              <Ionicons name="copy-outline" size={15} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Article body — branches on articleTypeId:
              8          → Live News (timeline feed)
              2 / 6 / 7  → Listicle (image-hero + numbered badge)
              default    → flat item/HTML render */}
        <View style={styles.bodyWrap}>
          {hasItems ? (
            article.articleTypeId === LIVE_NEWS_TYPE ? (
              <LiveNewsBody items={article.articleItems} styles={styles} />
            ) : article.articleTypeId && LISTICLE_TYPES.has(article.articleTypeId) ? (
              <ListicleBody
                items={article.articleItems}
                type={article.articleTypeId}
                styles={styles}
              />
            ) : (
              article.articleItems.map((it) => <ItemBlock key={it.id} item={it} styles={styles} />)
            )
          ) : (
            bodyBlocks.map((b, i) => <BodyBlockView key={i} block={b} styles={styles} />)
          )}

          {/* TL;DR */}
          {article.tldr ? (
            <View style={styles.tldr}>
              <View style={styles.tldrBadge}>
                <Text style={styles.tldrBadgeText}>TL;DR</Text>
              </View>
              <Text style={styles.tldrText}>{article.tldr}</Text>
            </View>
          ) : null}
        </View>

        {/* Divider */}
        <View style={styles.fullDivider} />

        {/* WhatsApp widget */}
        <View style={styles.contentPadded}>
          <View style={styles.waWidget}>
            <View style={styles.waIcon}>
              <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.waText}>
              <Text style={styles.waTitle}>Join Our WhatsApp Channel</Text>
              <Text style={styles.waSub}>Stay updated with the latest news, gossip, and hot discussions</Text>
            </View>
            <Pressable style={styles.waBtn}>
              <Text style={styles.waBtnText}>Join Now</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.fullDivider} />

        {/* Reactions */}
        <View style={styles.contentPadded}>
          <View style={styles.reactBox}>
            <Text style={styles.reactLabel}>Your reaction</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reactRow}
            >
              {REACTIONS.map((r) => {
                const active = reaction === r.id;
                const count = reactionCounts[r.id] + (active ? 1 : 0);
                return (
                  <Pressable
                    key={r.id}
                    style={[styles.reactBtn, active && styles.reactBtnActive]}
                    onPress={() => setReaction(active ? null : r.id)}
                  >
                    <Text style={styles.reactEmoji}>{r.emoji}</Text>
                    <Text style={styles.reactCount}>{count}</Text>
                    <Text style={styles.reactName}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.fullDivider} />

        {/* Related Topics chips OR People & Topics entities */}
        <View style={styles.contentPadded}>
          {article.jsonEntities && article.jsonEntities.length > 0 ? (
            <>
              <View style={styles.sectionLabelWrap}>
                <Text style={styles.sectionLabel}>Related Topics</Text>
              </View>
              <View style={styles.chipGrid}>
                {article.jsonEntities.slice(0, 12).map((e) => (
                  <Pressable key={e.id} style={styles.entityChip}>
                    <Text style={styles.entityChipName} numberOfLines={1}>{e.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <View style={styles.sectionLabelWrap}>
                <Text style={styles.sectionLabel}>People & Topics</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.entitiesRow}
              >
                {entities.map((e) => (
                  <Pressable key={e.id} style={styles.entityCard}>
                    <View style={[styles.entityAvatar, { backgroundColor: e.bg }]}>
                      <Text style={styles.entityEmoji}>{e.emoji}</Text>
                    </View>
                    <Text style={styles.entityName} numberOfLines={2}>{e.name}</Text>
                    <Text style={styles.entityRole} numberOfLines={1}>{e.role}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        <View style={styles.fullDivider} />

        {/* Comments section */}
        <View style={styles.contentPadded}>
          <View style={styles.sectionLabelWrap}>
            <Text style={styles.sectionLabel}>Comments ({formatCount(commentCount)})</Text>
          </View>
          <View style={styles.composer}>
            <View style={styles.composerAvatar}>
              <Ionicons name="person" size={16} color={colors.textTertiary} />
            </View>
            <TextInput
              placeholder="Write a comment..."
              placeholderTextColor={colors.textTertiary}
              style={styles.composerInput}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <Pressable
              style={[styles.composerBtn, !commentText.trim() && styles.composerBtnDisabled]}
              disabled={!commentText.trim()}
            >
              <Text style={styles.composerBtnText}>Post</Text>
            </Pressable>
          </View>
          <View style={styles.commentsEmpty}>
            <Ionicons name="chatbubbles-outline" size={28} color={colors.textTertiary} />
            <Text style={styles.commentsEmptyText}>
              Be the first to share your thoughts on this story.
            </Text>
          </View>
        </View>

        {/* Related News */}
        {article.relatedArticles.length > 0 ? (
          <>
            <View style={styles.fullDivider} />
            <View style={styles.contentPadded}>
              <View style={styles.sectionLabelWrap}>
                <Text style={styles.sectionLabel}>Related News</Text>
              </View>
              <View style={styles.relatedList}>
                {article.relatedArticles.slice(0, 4).map((a) => (
                  <Pressable
                    key={a.id}
                    style={({ pressed }) => [styles.relCard, pressed && styles.relCardPressed]}
                    onPress={() => navigateToArticle(a)}
                  >
                    <View style={styles.relThumb}>
                      {a.thumbnailUrl ? (
                        <Image source={{ uri: a.thumbnailUrl }} style={styles.relThumbImg} />
                      ) : (
                        <Text style={styles.relEmoji}>{a.emoji ?? '📰'}</Text>
                      )}
                    </View>
                    <View style={styles.relBody}>
                      <Text style={styles.relCat}>{a.category}</Text>
                      <Text style={styles.relTitle} numberOfLines={2}>{a.title}</Text>
                      <Text style={styles.relTime}>{a.timeAgo}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Body block renderers ────────────────────────────────────────────────

function BodyBlockView({ block, styles }: { block: BodyBlock; styles: Styles }) {
  if (block.type === 'heading') {
    return <Text style={styles.bHeading}>{block.text}</Text>;
  }
  if (block.type === 'quote') {
    return (
      <View style={styles.bQuote}>
        <Text style={styles.bQuoteText}>{block.text}</Text>
        {block.author ? <Text style={styles.bQuoteAuthor}>{block.author}</Text> : null}
      </View>
    );
  }
  if (block.type === 'image') {
    return (
      <View style={styles.bImageWrap}>
        <Image source={{ uri: block.src }} style={styles.bImage} resizeMode="cover" />
      </View>
    );
  }
  if (block.type === 'embed') {
    return (
      <View style={styles.bEmbedWrap}>
        <SocialEmbed url={block.url} />
      </View>
    );
  }
  return <Text style={styles.bodyPara}>{block.text}</Text>;
}

function ItemBlock({ item, styles }: { item: ArticleItem; styles: Styles }) {
  const innerBlocks = useMemo(
    () => (item.contents ? parseHtmlToBlocks(item.contents) : []),
    [item.contents],
  );

  // Last-resort fallback: if parser produced nothing but contents has text,
  // render the stripped plain text so something always shows.
  const renderInner = () => {
    if (innerBlocks.length > 0) {
      return innerBlocks.map((b, i) => <BodyBlockView key={i} block={b} styles={styles} />);
    }
    if (item.contents) {
      const plain = stripTags(item.contents);
      if (plain) return <Text style={styles.bodyPara}>{plain}</Text>;
    }
    return null;
  };

  // Type 2: Image + text
  if (item.type === 2) {
    return (
      <View style={styles.itemBlock}>
        {item.mediaUrl ? (
          <View style={styles.itemImageWrap}>
            <Image source={{ uri: item.mediaUrl }} style={styles.itemImage} resizeMode="cover" />
            {item.source ? <Text style={styles.itemCaption}>{item.source}</Text> : null}
          </View>
        ) : null}
        {renderInner()}
      </View>
    );
  }

  // Type 4: YouTube — render inline player
  if (item.type === 4 && item.mediaUrl) {
    return (
      <View style={styles.itemBlock}>
        {item.title ? <Text style={styles.itemTitle}>{item.title}</Text> : null}
        <SocialEmbed url={item.mediaUrl} platformHint="youtube" />
        {renderInner()}
      </View>
    );
  }

  // Type 6 (Instagram) / Type 7 (Twitter) / any detected social URL — inline embed
  const socialUrlPlatform = detectSocialUrl(item.mediaUrl);
  if ((item.type === 6 || item.type === 7 || socialUrlPlatform) && item.mediaUrl) {
    const hint =
      socialUrlPlatform ?? (item.type === 6 ? 'instagram' : item.type === 7 ? 'twitter' : null);
    return (
      <View style={styles.itemBlock}>
        {item.title ? <Text style={styles.itemTitle}>{item.title}</Text> : null}
        <SocialEmbed url={item.mediaUrl} platformHint={hint} />
        {renderInner()}
      </View>
    );
  }

  // Type 9: Text-only with optional title
  if (item.type === 9 && item.contents) {
    return (
      <View style={styles.itemBlock}>
        {item.title ? <Text style={styles.itemTitle}>{item.title}</Text> : null}
        {renderInner()}
      </View>
    );
  }

  // Fallback: render any available text
  if (item.contents) {
    return (
      <View style={styles.itemBlock}>
        {renderInner()}
      </View>
    );
  }

  return null;
}

// ── Live News body (articleTypeId 8) ─────────────────────────────────────
// Persistent "LIVE BLOG" banner + vertical timeline with marker dots. Newest
// update at top gets a NEW pill and red border.
function LiveNewsBody({
  items,
  styles,
}: {
  items: ArticleItem[];
  styles: Styles;
}) {
  const { header, entries, trailing, hasEntries } = partitionItems(items);

  // Fall back to flat render if the API ever returns no sub-items on a type-8
  // article, so nothing gets hidden from the user.
  if (!hasEntries) {
    return <>{items.map((it) => <ItemBlock key={it.id} item={it} styles={styles} />)}</>;
  }

  const latestRel = relativeAgo(entries[0]?.dateAdded);

  return (
    <>
      {header.length > 0
        ? header.map((it) => <ItemBlock key={it.id} item={it} styles={styles} />)
        : null}

      {/* Live-blog banner — frames the whole feed as ongoing */}
      <View style={styles.liveBanner}>
        <View style={styles.liveBannerDot} />
        <Text style={styles.liveBannerLabel}>LIVE BLOG</Text>
        <Text style={styles.liveBannerCount}>
          {entries.length} {entries.length === 1 ? 'update' : 'updates'}
        </Text>
        {latestRel ? <Text style={styles.liveBannerLatest}>Updated {latestRel}</Text> : null}
      </View>

      {/* Timeline feed */}
      <View style={styles.liveFeed}>
        {/* Vertical rail — absolute-positioned so cards render over it */}
        <View style={styles.liveRail} pointerEvents="none" />
        {entries.map((it, i) => {
          const rel = relativeAgo(it.dateAdded);
          const exact = formatExactTime(it.dateAdded);
          const isLatest = i === 0;
          return (
            <View
              key={it.id}
              style={[styles.liveCard, isLatest && styles.liveCardLatest]}
            >
              <View style={[styles.liveMarker, isLatest && styles.liveMarkerLatest]} />
              <View style={styles.liveCardHead}>
                {isLatest ? (
                  <View style={styles.liveNewPill}>
                    <Text style={styles.liveNewPillText}>NEW</Text>
                  </View>
                ) : null}
                {rel ? <Text style={styles.liveTimeRel}>{rel}</Text> : null}
                {exact ? (
                  <Text style={styles.liveTimeExact} numberOfLines={1}>
                    {exact}
                  </Text>
                ) : null}
              </View>
              {it.title ? <Text style={styles.liveTitle}>{it.title}</Text> : null}
              {it.mediaUrl && it.type === 2 ? (
                <View style={styles.liveImageWrap}>
                  <Image
                    source={{ uri: it.mediaUrl }}
                    style={styles.liveImage}
                    resizeMode="cover"
                  />
                  {it.source ? <Text style={styles.itemCaption}>{it.source}</Text> : null}
                </View>
              ) : null}
              {it.contents ? (
                <View style={styles.liveBody}>
                  {parseHtmlToBlocks(it.contents).map((b, idx) => (
                    <BodyBlockView key={idx} block={b} styles={styles} />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {trailing.length > 0
        ? trailing.map((it) => <ItemBlock key={it.id} item={it} styles={styles} />)
        : null}
    </>
  );
}

// ── Listicle body (articleTypeId 2 / 6 / 7) ──────────────────────────────
// Image-hero card with a #N badge pinned to the top-left of the image. Matches
// the card library's image-forward pattern. Countdown (type 7) #1 gets a
// taller hero + larger red badge to anchor the top of the list.
function ListicleBody({
  items,
  type,
  styles,
}: {
  items: ArticleItem[];
  type: number;
  styles: Styles;
}) {
  const { header, entries, trailing, hasEntries } = partitionItems(items);
  if (!hasEntries) {
    return <>{items.map((it) => <ItemBlock key={it.id} item={it} styles={styles} />)}</>;
  }

  const total = entries.length;
  // 2 → 1, 2, 3 …   7 → N, N-1 …   6 → no badge
  const numberAt = (i: number): number | null => {
    if (type === 2) return i + 1;
    if (type === 7) return total - i;
    return null;
  };

  return (
    <>
      {header.length > 0
        ? header.map((it) => <ItemBlock key={it.id} item={it} styles={styles} />)
        : null}

      {entries.map((it, i) => {
        const n = numberAt(i);
        const cleanTitle = it.title ? it.title.replace(/:$/, '') : '';
        const hasImage = !!(it.mediaUrl && it.type === 2);
        const isTop = type === 7 && i === 0;

        return (
          <View key={it.id} style={styles.listEntry}>
            {hasImage ? (
              <View style={[styles.listHero, isTop && styles.listHeroTop]}>
                <Image
                  source={{ uri: it.mediaUrl }}
                  style={styles.listHeroImg}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
                  locations={[0.55, 1]}
                  style={styles.listHeroShade}
                  pointerEvents="none"
                />
                {n !== null ? (
                  <View style={[styles.listBadge, isTop && styles.listBadgeTop]}>
                    <Text style={[styles.listBadgeHash, isTop && styles.listBadgeHashTop]}>#</Text>
                    <Text style={[styles.listBadgeNum, isTop && styles.listBadgeNumTop]}>{n}</Text>
                  </View>
                ) : null}
                {it.source ? (
                  <Text style={styles.listHeroCaption} numberOfLines={1}>
                    {it.source}
                  </Text>
                ) : null}
              </View>
            ) : n !== null ? (
              <View style={styles.listBadgeRow}>
                <View style={[styles.listBadgeInline, isTop && styles.listBadgeTop]}>
                  <Text style={[styles.listBadgeHash, isTop && styles.listBadgeHashTop]}>#</Text>
                  <Text style={[styles.listBadgeNum, isTop && styles.listBadgeNumTop]}>{n}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.listContent}>
              {cleanTitle ? <Text style={styles.listEntryTitle}>{cleanTitle}</Text> : null}
              {it.contents
                ? parseHtmlToBlocks(it.contents).map((b, idx) => (
                    <BodyBlockView key={idx} block={b} styles={styles} />
                  ))
                : null}
            </View>
          </View>
        );
      })}

      {trailing.length > 0
        ? trailing.map((it) => <ItemBlock key={it.id} item={it} styles={styles} />)
        : null}
    </>
  );
}

// ── Breadcrumb helper ───────────────────────────────────────────────────
function buildCrumbs(article: ArticleDetail): string[] {
  const cat = (article.category || '').trim();
  if (!cat) return ['Home'];
  // category may contain · separated subpath (matches prototype getTopCat)
  const parts = cat.split('·').map((s) => s.trim()).filter(Boolean);
  return ['Home', ...parts];
}

// ── Styles ──────────────────────────────────────────────────────────────
const CONTENT_PX = 14;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 20 },

    // Hero
    hero: { width: '100%', height: 220, position: 'relative', backgroundColor: c.surface, overflow: 'hidden' },
    heroImg: { width: '100%', height: '100%' },
    heroFallback: { backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    heroEmoji: { fontSize: 64 },
    heroBadges: { position: 'absolute', bottom: 12, left: 14, flexDirection: 'row', gap: 6 },
    badgeBreaking: { backgroundColor: c.danger, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeBreakingText: { fontSize: 9.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6 },
    badgeTag: { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeTagText: { fontSize: 9.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6, textTransform: 'uppercase' },

    // Hero caption
    heroCaption: {
      paddingHorizontal: CONTENT_PX,
      paddingTop: 6,
      paddingBottom: 10,
      fontSize: 10.5,
      color: c.textTertiary,
      fontStyle: 'italic',
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    heroCaptionBold: { fontWeight: '700', color: c.textSecondary },

    // Content wrappers
    content: { paddingHorizontal: CONTENT_PX, paddingTop: CONTENT_PX, backgroundColor: c.card },
    contentPadded: { paddingHorizontal: CONTENT_PX, paddingVertical: CONTENT_PX, backgroundColor: c.card },

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
    bcLink: { fontSize: 11, fontWeight: '600', color: c.primary },
    bcActive: { fontSize: 11, fontWeight: '600', color: c.textTertiary },
    bcSep: { fontSize: 11, color: c.textTertiary, marginHorizontal: 3 },

    // Title + subtitle
    title: { fontSize: 20, fontWeight: '800', color: c.text, lineHeight: 26, letterSpacing: -0.4, marginBottom: 10 },
    subtitle: { fontSize: 13.5, lineHeight: 22, color: c.textSecondary, marginBottom: 14 },

    // Meta card
    metaCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 14,
    },
    authorAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    authorAvatarText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    metaInfo: { flex: 1, minWidth: 0 },
    authorName: { fontSize: 13, fontWeight: '700', color: c.text },
    authorMeta: { fontSize: 11, color: c.textTertiary, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 6 },
    statChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: c.bg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    statText: { fontSize: 11, fontWeight: '700', color: c.textTertiary },

    // Share
    shareRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    shareLabel: { fontSize: 12, fontWeight: '700', color: c.textTertiary },
    shareBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    shareBtnBordered: { backgroundColor: c.card, borderWidth: 1.5, borderColor: c.border },

    // Body container
    bodyWrap: { paddingHorizontal: CONTENT_PX, paddingVertical: CONTENT_PX + 2, backgroundColor: c.card },
    bodyPara: { fontSize: 15, lineHeight: 27, color: c.text, marginBottom: 16 },

    // Body blocks
    bHeading: {
      fontSize: 17,
      fontWeight: '800',
      color: c.text,
      lineHeight: 22,
      letterSpacing: -0.3,
      marginTop: 6,
      marginBottom: 12,
      paddingLeft: 12,
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
    },
    bQuote: {
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
      backgroundColor: c.primarySoft,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginVertical: 14,
      borderTopRightRadius: 10,
      borderBottomRightRadius: 10,
    },
    bQuoteText: { fontSize: 13, fontStyle: 'italic', color: c.text, lineHeight: 21 },
    bQuoteAuthor: { fontSize: 11, fontWeight: '700', color: c.primary, marginTop: 6 },
    bImageWrap: { marginHorizontal: -CONTENT_PX, marginVertical: 12, backgroundColor: c.surface },
    bEmbedWrap: { marginVertical: 12 },
    bImage: { width: '100%', aspectRatio: 16 / 9 },

    // Article item blocks
    itemBlock: { marginBottom: 20 },
    itemImageWrap: { marginHorizontal: -CONTENT_PX, marginBottom: 14, backgroundColor: c.surface },
    itemImage: { width: '100%', aspectRatio: 16 / 9 },
    itemCaption: { paddingTop: 6, paddingHorizontal: CONTENT_PX, fontSize: 10.5, color: c.textTertiary, fontStyle: 'italic' },
    itemTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.text,
      marginBottom: 10,
      paddingLeft: 12,
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
      letterSpacing: -0.3,
      lineHeight: 22,
    },

    // TL;DR
    tldr: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      backgroundColor: c.primarySoft,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.primary,
      marginTop: 6,
    },
    tldrBadge: { backgroundColor: c.primary, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginTop: 1 },
    tldrBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    tldrText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: c.textSecondary, lineHeight: 19 },

    // Full-bleed divider
    fullDivider: { height: 6, backgroundColor: c.border, opacity: 0.5 },

    // WhatsApp (brand green preserved in both themes)
    waWidget: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: '#E8F8EF',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: '#A7E9C1',
    },
    waIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
    waText: { flex: 1, minWidth: 0 },
    waTitle: { fontSize: 13, fontWeight: '800', color: '#166534', marginBottom: 2 },
    waSub: { fontSize: 11, color: '#15803D' },
    waBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#25D366', borderRadius: 8 },
    waBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

    // Reactions
    reactBox: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
    },
    reactLabel: { fontSize: 11.5, fontWeight: '700', color: c.textSecondary, textAlign: 'center', marginBottom: 12 },
    reactRow: { gap: 6 },
    reactBtn: {
      alignItems: 'center',
      gap: 3,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: c.bg,
      borderWidth: 1.5,
      borderColor: c.border,
      minWidth: 54,
    },
    reactBtnActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    reactEmoji: { fontSize: 20, lineHeight: 22 },
    reactCount: { fontSize: 10, fontWeight: '700', color: c.textSecondary },
    reactName: { fontSize: 9, fontWeight: '600', color: c.textTertiary },

    // Section label
    sectionLabelWrap: { borderLeftWidth: 3, borderLeftColor: c.primary, paddingLeft: 11, marginBottom: 14 },
    sectionLabel: { fontSize: 16, fontWeight: '800', color: c.text, letterSpacing: -0.3 },

    // Related Topics chips
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    entityChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    entityChipName: { fontSize: 12.5, fontWeight: '600', color: c.textSecondary },

    // People & Topics entities
    entitiesRow: { gap: 10, paddingBottom: 4 },
    entityCard: { width: 88, alignItems: 'center', gap: 6 },
    entityAvatar: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    entityEmoji: { fontSize: 28 },
    entityName: { fontSize: 11.5, fontWeight: '700', color: c.text, textAlign: 'center', lineHeight: 15 },
    entityRole: { fontSize: 10, color: c.textTertiary, textAlign: 'center' },

    // Comments
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      backgroundColor: c.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 14,
    },
    composerAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    composerInput: {
      flex: 1,
      minHeight: 36,
      maxHeight: 100,
      fontSize: 13,
      color: c.text,
      paddingTop: 8,
      paddingBottom: 8,
    },
    composerBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: c.primary,
      borderRadius: 8,
      alignSelf: 'flex-end',
    },
    composerBtnDisabled: { backgroundColor: c.primarySoft },
    composerBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
    commentsEmpty: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 10,
    },
    commentsEmptyText: { fontSize: 12, color: c.textTertiary, textAlign: 'center', paddingHorizontal: 20 },

    // Related News
    relatedList: { gap: 8 },
    relCard: {
      flexDirection: 'row',
      gap: 12,
      padding: 12,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    relCardPressed: { backgroundColor: c.primarySoft, borderColor: c.primary },
    relThumb: {
      width: 80,
      height: 80,
      borderRadius: 10,
      backgroundColor: c.surface,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    relThumbImg: { width: '100%', height: '100%' },
    relEmoji: { fontSize: 24 },
    relBody: { flex: 1, minWidth: 0 },
    relCat: {
      fontSize: 9.5,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    relTitle: { fontSize: 13.5, fontWeight: '700', color: c.text, lineHeight: 19, marginBottom: 4 },
    relTime: { fontSize: 10.5, color: c.textTertiary },

    // ── Live News (articleTypeId 8) ─────────────────────────────────────
    liveBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 9,
      paddingHorizontal: 12,
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.danger,
      borderRadius: 12,
      marginTop: 4,
      marginBottom: 14,
    },
    liveBannerDot: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: c.danger,
    },
    liveBannerLabel: {
      fontSize: 10.5,
      fontWeight: '800',
      color: c.danger,
      letterSpacing: 0.7,
    },
    liveBannerCount: {
      fontSize: 11,
      fontWeight: '700',
      color: c.text,
    },
    liveBannerLatest: {
      fontSize: 10.5,
      fontWeight: '500',
      color: c.textSecondary,
      marginLeft: 'auto',
    },

    // Feed container with a vertical rail behind the marker dots
    liveFeed: {
      position: 'relative',
      marginBottom: 20,
      paddingLeft: 24,
      gap: 14,
    },
    liveRail: {
      position: 'absolute',
      left: 7,
      top: 8,
      bottom: 8,
      width: 2,
      backgroundColor: c.border,
      borderRadius: 1,
    },
    liveCard: {
      position: 'relative',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    liveCardLatest: {
      borderColor: c.danger,
    },
    // Marker sits on the rail, aligned with the card's header row
    liveMarker: {
      position: 'absolute',
      left: -24,
      top: 16,
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      backgroundColor: c.card,
      borderColor: c.border,
    },
    liveMarkerLatest: {
      backgroundColor: c.danger,
      borderColor: c.danger,
    },
    liveCardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    liveNewPill: {
      backgroundColor: c.danger,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 10,
    },
    liveNewPillText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.7,
    },
    liveTimeRel: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.2,
    },
    liveTimeExact: {
      fontSize: 10.5,
      fontWeight: '500',
      color: c.textTertiary,
      marginLeft: 'auto',
      flexShrink: 1,
    },
    liveTitle: {
      fontSize: 15.5,
      fontWeight: '800',
      color: c.text,
      lineHeight: 21,
      letterSpacing: -0.2,
      marginTop: 2,
      marginBottom: 8,
    },
    liveImageWrap: {
      marginHorizontal: -14,
      marginVertical: 8,
      backgroundColor: c.surface,
    },
    liveImage: {
      width: '100%',
      aspectRatio: 16 / 9,
    },
    liveBody: { marginTop: 4 },

    // ── Listicle (articleTypeId 2 / 6 / 7) ──────────────────────────────
    listEntry: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 18,
    },
    listHero: {
      position: 'relative',
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    // Countdown top spot — taller hero so #1 anchors the list
    listHeroTop: {
      aspectRatio: 4 / 3,
    },
    listHeroImg: {
      width: '100%',
      height: '100%',
    },
    // Bottom-only gradient for caption legibility — top of image stays clean
    listHeroShade: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    // Number badge pinned top-left on the hero image
    listBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
      backgroundColor: c.primary,
      paddingVertical: 6,
      paddingLeft: 9,
      paddingRight: 11,
      borderRadius: 8,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 4,
    },
    listBadgeInline: {
      flexDirection: 'row',
      alignItems: 'baseline',
      alignSelf: 'flex-start',
      gap: 2,
      backgroundColor: c.primary,
      paddingVertical: 6,
      paddingLeft: 9,
      paddingRight: 11,
      borderRadius: 8,
    },
    listBadgeTop: {
      backgroundColor: c.danger,
      shadowColor: c.danger,
      paddingVertical: 7,
      paddingLeft: 10,
      paddingRight: 13,
    },
    listBadgeRow: {
      paddingTop: 12,
      paddingHorizontal: 14,
    },
    listBadgeHash: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
      opacity: 0.75,
    },
    listBadgeHashTop: {
      fontSize: 13,
    },
    listBadgeNum: {
      fontSize: 19,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    listBadgeNumTop: {
      fontSize: 24,
    },
    listHeroCaption: {
      position: 'absolute',
      left: 10,
      bottom: 8,
      right: 10,
      color: '#FFFFFF',
      fontSize: 10,
      fontStyle: 'italic',
      fontWeight: '500',
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    listContent: {
      padding: 14,
    },
    listEntryTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.text,
      lineHeight: 22,
      letterSpacing: -0.3,
      marginBottom: 8,
    },
  });
}
