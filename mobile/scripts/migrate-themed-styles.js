// One-shot migration: replaces `useMemo(() => makeStyles(colors), [colors])`
// with `useThemedStyles(makeStyles)` and adds the import. Idempotent.
// Run with: node scripts/migrate-themed-styles.js
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');
const THEME_FILE = path.resolve(SRC, 'theme', 'useThemedStyles');

function walk(d, acc) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(f)) acc.push(p);
  }
  return acc;
}

function toImportPath(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.replace(/\.ts$/, '');
}

const USE_MEMO_LINE = /(\s*)const\s+styles\s*=\s*useMemo\(\s*\(\)\s*=>\s*makeStyles\(\s*colors\s*\)\s*,\s*\[\s*colors\s*\]\s*\)\s*;/g;
const THEME_STORE_IMPORT = /import\s*\{[^}]*useThemeStore[^}]*\}\s*from\s*['"][^'"]+themeStore['"]\s*;?\s*\n/;
const REACT_IMPORT = /import\s+(React\s*,\s*)?\{([^}]+)\}\s+from\s+['"]react['"]\s*;?\s*\n/;
const COLORS_INLINE_USAGE = /\bcolors\.\w/;

let migrated = 0;
let already = 0;
let skipped = 0;

const files = walk(SRC, []);
for (const file of files) {
  if (file.includes(path.join('theme', 'useThemedStyles'))) continue;
  if (file.endsWith('themeStore.ts')) continue;
  let content = fs.readFileSync(file, 'utf8');
  if (!USE_MEMO_LINE.test(content)) {
    USE_MEMO_LINE.lastIndex = 0;
    if (content.includes('useThemedStyles(makeStyles)')) already++;
    else skipped++;
    continue;
  }
  USE_MEMO_LINE.lastIndex = 0;

  const importPath = toImportPath(file, THEME_FILE);
  const importLine = `import { useThemedStyles } from '${importPath}';\n`;

  if (!content.includes("from '" + importPath + "'") && !content.includes('useThemedStyles')) {
    const m = content.match(THEME_STORE_IMPORT);
    if (m) {
      content = content.replace(THEME_STORE_IMPORT, m[0] + importLine);
    } else {
      content = importLine + content;
    }
  }

  content = content.replace(USE_MEMO_LINE, (_match, indent) => {
    return `${indent}const styles = useThemedStyles(makeStyles);`;
  });

  // If `useMemo` is no longer used anywhere else in the file, drop it from
  // the React import to avoid an unused-import lint error.
  const stillUsesUseMemo = /\buseMemo\s*\(/.test(content);
  if (!stillUsesUseMemo) {
    content = content.replace(REACT_IMPORT, (m, def, named) => {
      const keep = named
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && s !== 'useMemo');
      if (keep.length === 0 && def) {
        return `import ${def.replace(/,\s*$/, '').trim()} from 'react';\n`.replace(/\s+from/, ' from');
      }
      if (keep.length === 0) return '';
      return `import ${def || ''}{ ${keep.join(', ')} } from 'react';\n`;
    });
  }

  // If `colors` is destructured/read but never used inline (no `colors.x`),
  // drop the subscription line entirely — the styles hook handles it now.
  if (!COLORS_INLINE_USAGE.test(content.replace(/useThemedStyles\(makeStyles\)/g, ''))) {
    content = content.replace(
      /\s*const\s+colors\s*=\s*useThemeStore\(\s*\(s\)\s*=>\s*s\.colors\s*\)\s*;\s*\n/,
      '\n',
    );
  }

  fs.writeFileSync(file, content);
  migrated++;
  console.log('migrated:', path.relative(SRC, file));
}

console.log(`\nDone. migrated=${migrated}, already=${already}, skipped=${skipped}`);
