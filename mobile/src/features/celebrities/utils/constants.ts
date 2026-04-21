import type { CelebCategoryId } from '../../../services/api';

export const CELEB_CATEGORY_TABS: { id: CelebCategoryId; label: string }[] = [
  { id: 'bollywood',  label: 'Bollywood'  },
  { id: 'television', label: 'Television' },
  { id: 'creators',   label: 'Creators'   },
];

export const CELEB_TREND_UP    = '#059669';
export const CELEB_TREND_DOWN  = '#DC2626';
export const CELEB_TREND_FLAT  = '#9CA3AF';
