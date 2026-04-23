import React, { useMemo } from 'react';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import RenderHtml, {
  defaultSystemFonts,
  HTMLContentModel,
  HTMLElementModel,
  type CustomTagRendererRecord,
  type MixedStyleDeclaration,
  type MixedStyleRecord,
} from 'react-native-render-html';

import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

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

const RENDERERS: CustomTagRendererRecord = {};

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

  const source = useMemo(() => ({ html: html || '' }), [html]);

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
});
