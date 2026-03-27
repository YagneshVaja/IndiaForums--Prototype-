import { useState, useMemo } from 'react';
import styles from './ExploreScreen.module.css';

import StoriesStrip from '../components/strips/StoriesStrip';
import FeaturedCarousel from '../components/strips/FeaturedCarousel';
import ChipsRow from '../components/strips/ChipsRow';
import SectionHeader from '../components/ui/SectionHeader';
import ArticleCard from '../components/cards/ArticleCard';
import ThreadCard from '../components/cards/ThreadCard';

import { ARTICLES, EXPLORE_CHIPS } from '../data/articles';
import { FORUMS, FORUM_TABS } from '../data/forums';

export default function ExploreScreen({ onArticlePress }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeForumTab, setActiveForumTab] = useState('announcements');

  const articles = useMemo(
    () => ARTICLES[activeCategory] || ARTICLES.all,
    [activeCategory]
  );

  const threads = useMemo(
    () => FORUMS[activeForumTab] || FORUMS.announcements,
    [activeForumTab]
  );

  return (
    <div className={styles.screen}>
      <StoriesStrip />

      <SectionHeader title="Trending Now" />
      <FeaturedCarousel onArticlePress={onArticlePress} />

      <ChipsRow chips={EXPLORE_CHIPS} activeId={activeCategory} onSelect={setActiveCategory} />

      <div className={styles.articles}>
        {articles.map((a, i) => (
          <ArticleCard key={a.id} {...a} delay={i * 0.06} onClick={() => onArticlePress && onArticlePress(a)} />
        ))}
      </div>

      <SectionHeader title="Forums" />
      <div className={styles.forumWrap}>
        <div className={styles.forumTabs}>
          {FORUM_TABS.map(({ id, label }) => (
            <div
              key={id}
              className={`${styles.tab} ${activeForumTab === id ? styles.tabActive : ''}`}
              onClick={() => setActiveForumTab(id)}
            >
              {label}
            </div>
          ))}
        </div>
        {threads.map((t, i) => (
          <ThreadCard key={t.id} {...t} delay={i * 0.06} />
        ))}
      </div>

      <div className={styles.spacer} />
    </div>
  );
}
