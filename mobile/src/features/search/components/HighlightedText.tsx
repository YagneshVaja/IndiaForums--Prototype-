import React, { useMemo } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

interface Props {
  text: string;
  match: string;
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * Renders `text` with the substring matching `match` (case-insensitive)
 * rendered in `highlightStyle`. Source casing of `text` is preserved.
 *
 * If `match` is empty or not found, renders `text` plainly.
 */
export default function HighlightedText({
  text,
  match,
  style,
  highlightStyle,
  numberOfLines,
}: Props) {
  const segments = useMemo(() => splitOnMatch(text, match), [text, match]);

  if (segments.length === 1 && !segments[0].matched) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) => (
        <Text key={i} style={seg.matched ? highlightStyle : undefined}>
          {seg.value}
        </Text>
      ))}
    </Text>
  );
}

interface Segment { value: string; matched: boolean; }

function splitOnMatch(text: string, match: string): Segment[] {
  const trimmed = match.trim();
  if (!trimmed) return [{ value: text, matched: false }];

  const lower = text.toLowerCase();
  const needle = trimmed.toLowerCase();
  const segments: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(needle, i);
    if (idx === -1) {
      segments.push({ value: text.slice(i), matched: false });
      break;
    }
    if (idx > i) segments.push({ value: text.slice(i, idx), matched: false });
    segments.push({ value: text.slice(idx, idx + needle.length), matched: true });
    i = idx + needle.length;
  }
  return segments;
}
