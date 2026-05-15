import React, { useMemo, useState } from 'react';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import RenderHtml, {
  defaultSystemFonts,
  HTMLContentModel,
  HTMLElementModel,
  type CustomBlockRenderer,
  type CustomTagRendererRecord,
  type MixedStyleDeclaration,
  type MixedStyleRecord,
} from 'react-native-render-html';

import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { isSmileyImage, parseBBCode, sanitizeHtmlImages } from '../utils/bbcode';

// Forum HTML contains non-HTML5 tags (e.g. <edited>) that the renderer would
// otherwise warn about and skip. Register them as plain block containers so
// their content displays, matching the browser's default unknown-tag behavior.
// `<font>` is deprecated HTML4 but still appears in legacy posts — model it as
// textual so its children render inline; we drop its color/face/size attrs.
const CUSTOM_ELEMENT_MODELS: Record<string, HTMLElementModel<string, HTMLContentModel>> = {
  edited: HTMLElementModel.fromCustomModel({
    tagName: 'edited',
    contentModel: HTMLContentModel.block,
  }),
  quote: HTMLElementModel.fromCustomModel({
    tagName: 'quote',
    contentModel: HTMLContentModel.block,
  }),
  spoiler: HTMLElementModel.fromCustomModel({
    tagName: 'spoiler',
    contentModel: HTMLContentModel.block,
  }),
  font: HTMLElementModel.fromCustomModel({
    tagName: 'font',
    contentModel: HTMLContentModel.textual,
  }),
};

// `react-native-render-html`'s default <img> renderer uses RN's Image
// component with no error handling. Our replacement:
//   • Smileys render as small inline glyphs.
//   • Block images render at 100% width with an aspect ratio. We seed it from
//     the HTML width/height attribs if the backend supplied them, otherwise
//     from a safe default (1.5) so the image has reserved space and actually
//     paints. Once expo-image's onLoad fires with real dimensions we refine
//     the ratio to match the asset.
//   • We hide ONLY on an explicit onError — the previous "hide until onLoad
//     reports dimensions" pattern silently swallowed images on Android /
//     inside the render-html context, since onLoad's source dims aren't
//     always populated. That's what was making forum post images invisible.
const DEFAULT_ASPECT_RATIO = 1.5;

function parseDim(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const HtmlImage: CustomBlockRenderer = ({ tnode }) => {
  const domNode = (tnode as { domNode?: { attribs?: Record<string, string> } }).domNode;
  const attrs =
    domNode?.attribs ||
    (tnode as { attributes?: Record<string, string> }).attributes ||
    {};
  const src = attrs.src || '';
  const alt = attrs.alt || '';

  // Seed the aspect ratio from HTML attribs (if present), fall back to a
  // sensible default; expo-image's onLoad can refine it once the asset lands.
  const initialAspect = useMemo(() => {
    const w = parseDim(attrs.width);
    const h = parseDim(attrs.height);
    if (w && h) return w / h;
    return DEFAULT_ASPECT_RATIO;
  }, [attrs.width, attrs.height]);

  const [aspectRatio, setAspectRatio] = useState<number>(initialAspect);
  const [failed, setFailed] = useState(false);

  // Proactively drop obviously-broken sources without wasting a network hit.
  if (!src) return null;
  if (src === 'about:blank') return null;
  if (/^data:image\/gif;base64,R0lGOD/i.test(src)) return null;
  if (failed) return null;

  const handleError = () => setFailed(true);
  const handleLoad = (e: { source?: { width?: number; height?: number } }) => {
    const w = e?.source?.width;
    const h = e?.source?.height;
    if (w && h) setAspectRatio(w / h);
  };

  if (isSmileyImage(src, alt)) {
    return (
      <Image
        source={{ uri: src }}
        style={styles.smiley}
        contentFit="contain"
        cachePolicy="memory-disk"
        onError={handleError}
        onLoad={handleLoad}
        accessibilityLabel={alt}
      />
    );
  }

  return (
    <Image
      source={{ uri: src }}
      style={[styles.image, { aspectRatio }]}
      contentFit="contain"
      cachePolicy="memory-disk"
      transition={150}
      onError={handleError}
      onLoad={handleLoad}
      accessibilityLabel={alt}
    />
  );
};

const RENDERERS: CustomTagRendererRecord = {
  img: HtmlImage,
};

// Metadata-only tags the backend embeds inside <edited>…</edited> to carry
// the editor's user id and timestamp. We already render the "Edited by …"
// line separately on PostCard, so suppress these to avoid render warnings
// and stray content.
const IGNORED_DOM_TAGS = ['editid', 'editdate'];

interface Props {
  html: string;
  /** Outer horizontal padding of the container rendering this HTML. */
  horizontalPadding?: number;
}

const SYSTEM_FONTS = defaultSystemFonts;

const RENDERERS_PROPS = {
  a: {
    onPress: (_e: unknown, href: string) => {
      if (!href) return;
      Linking.openURL(href).catch(() => {});
    },
  },
  img: {
    enableExperimentalPercentWidth: true,
  },
};

function PostHtmlImpl({ html, horizontalPadding = 24 }: Props) {
  const { width } = useWindowDimensions();
  const colors = useThemeStore((s) => s.colors);
  const contentWidth = Math.max(200, width - horizontalPadding);

  const baseStyle = useMemo<MixedStyleDeclaration>(
    () => ({
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    }),
    [colors.text],
  );

  const tagsStyles = useMemo<MixedStyleRecord>(
    () => makeTagsStyles(colors),
    [colors],
  );

  const source = useMemo(
    () => ({ html: sanitizeHtmlImages(parseBBCode(html)) }),
    [html],
  );

  if (!html || !html.trim()) return null;

  return (
    <View style={styles.wrap}>
      <RenderHtml
        contentWidth={contentWidth}
        source={source}
        baseStyle={baseStyle}
        tagsStyles={tagsStyles}
        renderers={RENDERERS}
        renderersProps={RENDERERS_PROPS}
        customHTMLElementModels={CUSTOM_ELEMENT_MODELS}
        ignoredDomTags={IGNORED_DOM_TAGS}
        systemFonts={SYSTEM_FONTS}
        enableExperimentalMarginCollapsing
        defaultTextProps={{ selectable: true }}
      />
    </View>
  );
}

const PostHtml = React.memo(PostHtmlImpl);
export default PostHtml;

function makeTagsStyles(c: ThemeColors): MixedStyleRecord {
  return {
    p: { marginTop: 0, marginBottom: 8, color: c.text },
    a: { color: c.primary, textDecorationLine: 'underline' },
    b: { fontWeight: '800', color: c.text },
    strong: { fontWeight: '800', color: c.text },
    i: { fontStyle: 'italic', color: c.text },
    em: { fontStyle: 'italic', color: c.text },
    u: { textDecorationLine: 'underline' },
    s: { textDecorationLine: 'line-through', color: c.textSecondary },
    strike: { textDecorationLine: 'line-through', color: c.textSecondary },
    del: { textDecorationLine: 'line-through', color: c.textSecondary },
    h1: { fontSize: 20, fontWeight: '800', color: c.text, marginTop: 6, marginBottom: 6 },
    h2: { fontSize: 18, fontWeight: '800', color: c.text, marginTop: 6, marginBottom: 6 },
    h3: { fontSize: 16, fontWeight: '700', color: c.text, marginTop: 4, marginBottom: 4 },
    ul: { marginTop: 4, marginBottom: 8, paddingLeft: 20 },
    ol: { marginTop: 4, marginBottom: 8, paddingLeft: 20 },
    li: { marginBottom: 4, color: c.text },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
      backgroundColor: c.surface,
      paddingLeft: 10,
      paddingRight: 10,
      paddingVertical: 6,
      marginVertical: 8,
      borderRadius: 6,
      color: c.textSecondary,
      fontStyle: 'italic',
    },
    code: {
      fontFamily: 'monospace',
      fontSize: 13,
      backgroundColor: c.surface,
      color: c.text,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
    },
    pre: {
      fontFamily: 'monospace',
      fontSize: 13,
      backgroundColor: c.surface,
      color: c.text,
      padding: 10,
      borderRadius: 8,
      marginVertical: 8,
    },
    img: {
      marginTop: 6,
      marginBottom: 6,
      borderRadius: 8,
    },
    hr: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 10,
    },
    edited: {
      fontSize: 11,
      fontStyle: 'italic',
      color: c.textTertiary,
      marginTop: 6,
    },
    quote: {
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
      backgroundColor: c.surface,
      paddingLeft: 10,
      paddingRight: 10,
      paddingVertical: 6,
      marginVertical: 8,
      borderRadius: 6,
      color: c.textSecondary,
      fontStyle: 'italic',
    },
    spoiler: {
      backgroundColor: c.surface,
      color: c.textSecondary,
      padding: 8,
      borderRadius: 6,
      marginVertical: 6,
    },
  };
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
  },
  image: {
    width: '100%',
    borderRadius: 8,
    marginVertical: 6,
    backgroundColor: 'transparent',
  },
  smiley: {
    width: 18,
    height: 18,
    marginHorizontal: 2,
  },
});
