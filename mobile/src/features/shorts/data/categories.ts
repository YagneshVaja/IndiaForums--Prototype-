export interface ShortsCategory {
  id: 'all' | 'tv' | 'movies' | 'ott' | 'sports';
  label: string;
  apiId: number | null;
}

export const SHORTS_CATEGORIES: readonly ShortsCategory[] = [
  { id: 'all',    label: 'All',    apiId: null },
  { id: 'tv',     label: 'TV',     apiId: 2    },
  { id: 'movies', label: 'Movies', apiId: 3    },
  { id: 'ott',    label: 'OTT',    apiId: 4    },
  { id: 'sports', label: 'Sports', apiId: 5    },
] as const;
