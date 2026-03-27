import { useState, useMemo } from 'react';
import styles from './NewsScreen.module.css';

import CategoryBar from '../components/strips/CategoryBar';
import LanguageBar from '../components/strips/LanguageBar';
import NewsVerticalCard from '../components/cards/NewsVerticalCard';
import NewsHorizontalCard from '../components/cards/NewsHorizontalCard';

import { NEWS_CATS, NS_LANGS, getNewsArticles } from '../data/newsData';

export default function NewsScreen() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeLang, setActiveLang] = useState('all');

  const langs = NS_LANGS[activeCategory] || [];

  const articles = useMemo(
    () => getNewsArticles(activeCategory, activeLang),
    [activeCategory, activeLang]
  );

  function handleCategoryChange(cat) {
    setActiveCategory(cat);
    setActiveLang('all'); // reset language when category changes
  }

  return (
    <div className={styles.screen}>
      <div className={styles.tabContainer}>
        <CategoryBar cats={NEWS_CATS} activeId={activeCategory} onSelect={handleCategoryChange} />
        <LanguageBar langs={langs} activeId={activeLang} onSelect={setActiveLang} />
      </div>

      <div className={styles.feed}>
        <div className={styles.articles}>
          {articles.length === 0 ? (
            <div className={styles.empty}>No articles found for this selection.</div>
          ) : (
            articles.map((a, i) =>
              i === 0 ? (
                <NewsVerticalCard key={a.id} {...a} />
              ) : (
                <NewsHorizontalCard key={a.id} {...a} delay={i * 0.05} />
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}
