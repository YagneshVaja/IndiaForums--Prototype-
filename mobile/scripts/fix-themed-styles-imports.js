// Fixup pass for migrate-themed-styles.js: my useMemo-detection regex missed
// generic forms like `useMemo<T>(...)`, so the React import got pruned in
// some files that still use useMemo elsewhere. Same for the `colors`
// destructure — files that pass `colors` to a child or destructure it lost
// the subscription. This pass walks each file and re-adds what's needed.
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');

function walk(d, acc) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(f)) acc.push(p);
  }
  return acc;
}

const REACT_IMPORT = /import\s+(React\s*,\s*)?\{([^}]+)\}\s+from\s+['"]react['"];?\s*\n/;
const COLORS_DECL = /const\s+colors\s*=\s*useThemeStore\(\s*\(s\)\s*=>\s*s\.colors\s*\)\s*;/;
const STYLES_DECL = /(\s*)const\s+styles\s*=\s*useThemedStyles\(makeStyles\)\s*;/;

let fixed = 0;
for (const file of walk(SRC, [])) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (!content.includes('useThemedStyles(makeStyles)')) continue;

  // Detect any `useMemo` usage that survived (calls, generics, plain refs).
  const usesUseMemo = /\buseMemo\b/.test(content);
  if (usesUseMemo) {
    const m = content.match(REACT_IMPORT);
    if (m) {
      const named = m[2]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!named.includes('useMemo')) {
        named.push('useMemo');
        const rebuilt = `import ${m[1] || ''}{ ${named.join(', ')} } from 'react';\n`;
        content = content.replace(REACT_IMPORT, rebuilt);
        changed = true;
      }
    }
  }

  // Detect any `colors` reference not on the declaration line. The styles
  // declaration line itself is `const styles = useThemedStyles(makeStyles);`
  // and never reads `colors`, so any standalone `colors` usage elsewhere
  // means we wrongly dropped the subscription.
  if (!COLORS_DECL.test(content)) {
    const stripped = content
      .replace(STYLES_DECL, '')
      .replace(/from\s+['"][^'"]*colors[^'"]*['"]/g, ''); // ignore matches inside import paths
    const hasColorsRef = /\bcolors\b/.test(stripped);
    if (hasColorsRef) {
      // Add the subscription back, right after the useThemeStore import line.
      const m = content.match(STYLES_DECL);
      if (m) {
        const indent = m[1];
        // Insert just before the styles declaration to mirror the original layout.
        content = content.replace(
          STYLES_DECL,
          `${indent}const colors = useThemeStore((s) => s.colors);${m[1]}const styles = useThemedStyles(makeStyles);`,
        );
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(file, content);
    fixed++;
    console.log('fixed:', path.relative(SRC, file));
  }
}

console.log(`\nDone. fixed=${fixed}`);
