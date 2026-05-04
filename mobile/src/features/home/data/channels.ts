/**
 * Channels & their show rankings — snapshot of the
 * "POPULAR INDIAN TV SHOWS" section on https://www.indiaforums.com/
 *
 * **Why static?** The dev API endpoint that serves this section
 * (`GET /home/channels`) returns HTTP 400 on every param combo we've tried,
 * and `/shows/by-mode?mode=7&id=…` returns `totalCount=0` for every channel
 * we've probed. The production website server-renders this whole section
 * into HTML with the data inline, which is what we mirror here.
 *
 * **When to remove this file:** as soon as `/home/channels` returns a 200
 * with populated `channels[].shows[]`. The shape below maps cleanly onto the
 * `HomeChannelDto` / `HomeChannelShowDto` schemas in the OpenAPI spec, so the
 * UI rewrite will be limited to swapping this data source for a hook.
 *
 * Snapshot date: 2026-05-04.
 */

export type ChannelTrend = 'up' | 'down' | 'equal';

export interface ChannelShow {
  /** Forum slug — used to deep-link into the show's forum thread. */
  forumSlug: string;
  title: string;
  /** Direction of rank movement vs previous week. */
  trend: ChannelTrend;
  /** Magnitude of rank movement; `0` indicates a new entry. */
  delta: number;
}

export interface Channel {
  channelId: number;
  channelSlug: string;
  channelName: string;
  /** CDN-hosted channel logo on a white-ish background. */
  logoUrl: string;
  shows: ChannelShow[];
}

export const CHANNELS_DATA: Channel[] = [
  {
    channelId: 1,
    channelSlug: 'star-plus',
    channelName: 'Star Plus',
    logoUrl: 'https://img.indiaforums.com/channel/320x180/0/001-star-plus.webp',
    shows: [
      { forumSlug: 'mr-and-mrs-parshuram',         title: 'Mr. and Mrs. Parshuram',     trend: 'up',    delta: 0  },
      { forumSlug: 'o-humnava-tum-dena-saath-mera',title: 'O Humnava Tum Dena Saath Mera', trend: 'up', delta: 0  },
      { forumSlug: 'yeh-rishta-kya-kehlata-hai',   title: 'Yeh Rishta Kya Kehlata Hai', trend: 'equal', delta: 1  },
      { forumSlug: 'kyunki-saas-bhi-kabhi-bahu-thi-2', title: 'Kyunki Saas Bhi Kabhi Bahu Thi 2', trend: 'equal', delta: 4 },
      { forumSlug: 'jhanak',                       title: 'Jhanak',                     trend: 'up',    delta: 9  },
      { forumSlug: 'anupamaa',                     title: 'Anupamaa',                   trend: 'up',    delta: 15 },
      { forumSlug: 'udne-ki-aasha',                title: 'Udne Ki Aasha',              trend: 'down',  delta: 19 },
      { forumSlug: 'advocate-anjali-awasthi',      title: 'Advocate Anjali Awasthi',    trend: 'down',  delta: 22 },
      { forumSlug: 'ishaani',                      title: 'Ishani',                     trend: 'down',  delta: 25 },
    ],
  },
  {
    channelId: 4,
    channelSlug: 'zee-tv',
    channelName: 'Zee TV',
    logoUrl: 'https://img.indiaforums.com/channel/320x180/0/004-zee-tv.webp?c=8dHFA5',
    shows: [
      { forumSlug: 'kumkum-bhagya',          title: 'Kumkum Bhagya',          trend: 'equal', delta: 3  },
      { forumSlug: 'tum-se-tum-tak',         title: 'Tumm Se Tumm Tak',       trend: 'equal', delta: 7  },
      { forumSlug: 'vasudha',                title: 'Vasudha',                trend: 'up',    delta: 10 },
      { forumSlug: 'jaane-anjaane-hum-mile', title: 'Jaane Anjaane Hum Mile', trend: 'up',    delta: 11 },
      { forumSlug: 'jagrati',                title: 'Jagriti-Ek Nayi Subah',  trend: 'up',    delta: 17 },
      { forumSlug: 'bhagya-lakshmi',         title: 'Bhagya Lakshmi',         trend: 'up',    delta: 38 },
    ],
  },
  {
    channelId: 70,
    channelSlug: 'colors',
    channelName: 'Colors',
    logoUrl: 'https://img.indiaforums.com/channel/320x180/0/070-colors.webp',
    shows: [
      { forumSlug: 'dr-aarambhi',                title: 'Dr. Aarambhi',                trend: 'up',    delta: 0  },
      { forumSlug: 'mahadev-and-sons',           title: 'Mahadev & Sons',              trend: 'up',    delta: 0  },
      { forumSlug: 'naagin-7',                   title: 'Naagin 7',                    trend: 'up',    delta: 0  },
      { forumSlug: 'seher-hone-ko-hai',          title: 'Seher Hone Ko Hai',           trend: 'up',    delta: 0  },
      { forumSlug: 'mannat-har-khushi-paane-ki', title: 'Mannat Har Khushi Paane Ki',  trend: 'equal', delta: 5  },
      { forumSlug: 'noyontara',                  title: 'Noyontara',                   trend: 'up',    delta: 13 },
      { forumSlug: 'mangal-lakshmi',             title: 'Mangal Lakshmi',              trend: 'down', delta: 23 },
      { forumSlug: 'bindi',                      title: 'Bindi',                       trend: 'down', delta: 33 },
    ],
  },
  {
    channelId: 2,
    channelSlug: 'sony-tv',
    channelName: 'Sony TV',
    logoUrl: 'https://img.indiaforums.com/channel/320x180/0/002-sony-tv.webp',
    shows: [
      { forumSlug: 'indias-got-talent-11',                          title: "India's Got Talent 11",            trend: 'up', delta: 0  },
      { forumSlug: 'indian-idol-16',                                title: 'Indian Idol 16',                   trend: 'up', delta: 0  },
      { forumSlug: 'masterchef-india-season-9',                     title: 'Master Chef India 9',              trend: 'up', delta: 0  },
      { forumSlug: 'cid',                                           title: 'CID',                              trend: 'up', delta: 8  },
      { forumSlug: 'bade-achche-lagte-hain-naya-season',            title: 'Bade Acche Lagte Hain Naya Season', trend: 'up', delta: 16 },
      { forumSlug: 'chakravarti-samrat-prithviraj-chauhan',         title: 'Chakravarti Samrat Prithviraj Chauhan', trend: 'up', delta: 31 },
      { forumSlug: 'indias-best-dancer-vs-super-dancer-champions-ka-tashan', title: "India's Best Dancer Vs Super Dancer Champions Ka Tashan", trend: 'up', delta: 41 },
    ],
  },
  {
    channelId: 25,
    channelSlug: 'sony-sab',
    channelName: 'Sony SAB',
    logoUrl: 'https://img.indiaforums.com/channel/320x180/0/025-sony-sab.webp?c=0wPD8D',
    shows: [
      { forumSlug: 'ganesh-kartikeya',           title: 'Ganesh Kartikey',                          trend: 'up',    delta: 0  },
      { forumSlug: 'hui-ghum-yaadein',           title: 'Hui Gumm Yaadein Ek Doctor, Do Zindagiyaan', trend: 'up',  delta: 0  },
      { forumSlug: 'itti-si-khushi-sab-tv',      title: 'Itti Si Khushi',                           trend: 'equal', delta: 6  },
      { forumSlug: 'ufff-yeh-love-hai-mushkil',  title: 'Uff Yeh Love Hai Mushkil',                 trend: 'down',  delta: 14 },
      { forumSlug: 'taarak-mehta-ka-ooltah-chashmah', title: 'Taarak Mehta Ka Ooltah Chashmah',     trend: 'up',    delta: 18 },
      { forumSlug: 'pushpa-impossible',          title: 'Pushpa Impossible',                        trend: 'up',    delta: 24 },
      { forumSlug: 'tenali-rama',                title: 'Tenali Rama Season 2',                     trend: 'up',    delta: 43 },
    ],
  },
];
