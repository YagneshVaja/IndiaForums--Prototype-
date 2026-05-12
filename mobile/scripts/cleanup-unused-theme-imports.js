// After migrate-themed-styles.js drops the `colors` subscription on files
// that don't reference `colors` inline, `useThemeStore` may be imported but
// never used. Same for stray `colors` declarations that survived. This pass
// removes only the lines that are confirmed unused.
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

const USE_THEME_STORE_IMPORT = /import\s*\{\s*useThemeStore\s*\}\s*from\s*['"][^'"]+themeStore['"];?\s*\n/;
const COLORS_DECL_LINE = /(\s*)const\s+colors\s*=\s*useThemeStore\(\s*\(s\)\s*=>\s*s\.colors\s*\)\s*;\s*\n/;

let cleaned = 0;
for (const file of walk(SRC, [])) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Drop the `const colors = ...` declaration if `colors` is never referenced
  // elsewhere in the file. We test against a version with the declaration
  // line removed so the declaration itself isn't counted as a reference.
  const stripped = content.replace(COLORS_DECL_LINE, '');
  const hasColorsRef = /\bcolors\b/.test(stripped);
  if (!hasColorsRef && COLORS_DECL_LINE.test(content)) {
    content = stripped;
    changed = true;
  }

  // Drop `import { useThemeStore } from '.../themeStore'` if no `useThemeStore(` call survives.
  if (USE_THEME_STORE_IMPORT.test(content)) {
    const withoutImport = content.replace(USE_THEME_STORE_IMPORT, '');
    if (!/\buseThemeStore\s*\(/.test(withoutImport)) {
      content = withoutImport;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content);
    cleaned++;
    console.log('cleaned:', path.relative(SRC, file));
  }
}

console.log(`\nDone. cleaned=${cleaned}`);
