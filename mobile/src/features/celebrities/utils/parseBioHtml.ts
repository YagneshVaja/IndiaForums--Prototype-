export interface BioImage {
  src: string;
  alt: string;
}

export interface BioItem {
  label: string;
  value: string;
}

export interface BioSection {
  title: string;
  items: BioItem[];
  images: BioImage[];
}

const IMG_REGEX = /<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanValue(raw: string): string {
  return raw
    .replace(/<a[^>]*class="celeb-about__info-edit"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<img[^>]*icons\.svg[^>]*>/gi, '')
    .replace(/<\/?p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<h4[^>]*>/gi, '')
    .replace(/<\/h4>/gi, ': ')
    .replace(/<\/?div[^>]*>/gi, '')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function extractImages(chunk: string): BioImage[] {
  const imgs: BioImage[] = [];
  IMG_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMG_REGEX.exec(chunk)) !== null) {
    if (!m[1].includes('icons.svg') && !m[1].includes('sign')) {
      imgs.push({ src: m[1], alt: m[2] || '' });
    }
  }
  return imgs;
}

function extractItems(chunk: string): BioItem[] {
  const items: BioItem[] = [];
  const subRegex = /<div class="celeb-about__info-subitemtitle">\s*([\s\S]*?)\s*<\/div>\s*<div class="celeb-about__info-subitemcontent">\s*([\s\S]*?)\s*<\/div>/g;
  let sub: RegExpExecArray | null;
  while ((sub = subRegex.exec(chunk)) !== null) {
    const label = stripHtml(sub[1]);
    const rawValue = cleanValue(sub[2]);
    const value = stripHtml(rawValue).replace(/^-\s*/, '');
    if (label && value) items.push({ label, value });
  }
  const h4Regex = /<h4[^>]*>\s*([\s\S]*?)\s*<\/h4>\s*<div class="celeb-about__info-subitemcontent">\s*([\s\S]*?)\s*<\/div>/g;
  let h4: RegExpExecArray | null;
  while ((h4 = h4Regex.exec(chunk)) !== null) {
    const label = stripHtml(h4[1]).replace(/:$/, '');
    const value = stripHtml(cleanValue(h4[2])).replace(/^-\s*/, '');
    if (label && value && !items.some((i) => i.label === label)) {
      items.push({ label, value });
    }
  }
  return items;
}

export function parseBioHtml(html: string): BioSection[] {
  if (!html) return [];
  const sections: BioSection[] = [];
  const headingRegex = /<h3[^>]*class="celeb-about__info-itemtitle"[^>]*>([\s\S]*?)<\/h3>/g;
  const headings: { title: string; pos: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(html)) !== null) {
    headings.push({ title: stripHtml(m[1]), pos: m.index });
  }

  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].pos;
    const end = i + 1 < headings.length ? headings[i + 1].pos : html.length;
    const chunk = html.substring(start, end);
    const items = extractItems(chunk);
    const images = extractImages(chunk);
    if (items.length > 0 || images.length > 0) {
      sections.push({ title: headings[i].title, items, images });
    }
  }

  return sections;
}

export const SECTION_ICONS: Record<string, string> = {
  'Bio':                          '👤',
  'Physical Stats':               '📏',
  'Career':                       '🎬',
  'Personal Life':                '📋',
  'Relationships':                '💑',
  'Family':                       '👨‍👩‍👧‍👦',
  'Favourites':                   '❤️',
  'Personal Belongings / Assets': '🏎️',
  'Money Factor':                 '💰',
  'Awards/Honours':               '🏆',
};

export function formatDateString(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function joinList(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) return '';
  return arr.join(', ');
}

export function computeAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthdayThisYear =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthdayThisYear) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}
