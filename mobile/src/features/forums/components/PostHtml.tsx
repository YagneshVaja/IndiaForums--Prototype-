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
};

// `react-native-render-html`'s default <img> renderer uses RN's Image
// component with no error handling AND reserves placeholder space from the
// HTML-attribute dimensions. Backend posts on Bollywood topics often have:
//   • broken <img> tags (404 smilies, images that return empty bodies) — the
//     default shows a giant gray box with the alt text
//   • slow images whose HTML-attribute width/height reserve a huge placeholder
//     card for seconds before anything paints
// Our replacement:
//   • starts every image hidden (height:0, opacity:0) so there is no reserved
//     space before the image actually has content
//   • reveals only after onLoad fires with real dimensions — sizes the image
//     at 100% width with the loaded image's own aspect ratio
//   • on error OR onLoad with 0-dim source, returns null so nothing shows
type ImgState =
  | { status: 'pending' }
  | { status: 'loaded'; aspectRatio: number }
  | { status: 'failed' };

const HtmlImage: CustomBlockRenderer = ({ tnode }) => {
  const domNode = (tnode as { domNode?: { attribs?: Record<string, string> } }).domNode;
  const attrs =
    domNode?.attribs ||
    (tnode as { attributes?: Record<string, string> }).attributes ||
    {};
  const src = attrs.src || '';
  const alt = attrs.alt || '';

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [state, setState] = useState<ImgState>({ status: 'pending' });

  // Proactively drop obviously-broken sources without wasting a network hit.
  if (!src) return null;
  if (src === 'about:blank') return null;
  if (/^data:image\/gif;base64,R0lGOD/i.test(src)) return null;
  if (state.status === 'failed') return null;

  const handleError = () => setState({ status: 'failed' });
  const handleLoad = (e: { source?: { width?: number; height?: number } }) => {
    const w = e?.source?.width;
    const h = e?.source?.height;
    if (!w || !h) {
      setState({ status: 'failed' });
    } else {
      setState({ status: 'loaded', aspectRatio: w / h });
    }
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

  const style =
    state.status === 'pending'
      ? [styles.image, styles.imageHidden]
      : [styles.image, { aspectRatio: state.aspectRatio }];

  return (
    <Image
      source={{ uri: src }}
      style={style}
      contentFit="cover"
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
  },
  // Applied while the image has not finished loading — collapses it fully so
  // no placeholder box / reserved space appears. Overrides marginVertical so
  // there's no residual gap either.
  imageHidden: {
    height: 0,
    opacity: 0,
    marginVertical: 0,
  },
  smiley: {
    width: 18,
    height: 18,
    marginHorizontal: 2,
  },
});
