import { useState } from 'react';

import PhoneShell    from './components/layout/PhoneShell';
import DynamicIsland from './components/layout/DynamicIsland';
import StatusBar     from './components/layout/StatusBar';
import TopNav        from './components/layout/TopNav';
import BottomNav     from './components/layout/BottomNav';

import ExploreScreen from './screens/ExploreScreen';
import NewsScreen    from './screens/NewsScreen';
import ForumScreen   from './screens/ForumScreen';
import SearchScreen  from './screens/SearchScreen';
import MySpaceScreen from './screens/MySpaceScreen';
import ArticleScreen from './screens/ArticleScreen';

const SCREENS = {
  explore: ExploreScreen,
  news:    NewsScreen,
  forums:  ForumScreen,
  search:  SearchScreen,
  myspace: MySpaceScreen,
};

export default function App() {
  const [activeTab,       setActiveTab]       = useState('explore');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const ActiveScreen = SCREENS[activeTab];

  function handleArticlePress(article) {
    setSelectedArticle(article);
  }

  function handleBack() {
    setSelectedArticle(null);
  }

  return (
    <PhoneShell>
      <DynamicIsland />
      <StatusBar />

      {selectedArticle ? (
        <ArticleScreen
          article={selectedArticle}
          onBack={handleBack}
          onArticlePress={handleArticlePress}
        />
      ) : (
        <>
          <TopNav />
          <ActiveScreen onArticlePress={handleArticlePress} />
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </>
      )}
    </PhoneShell>
  );
}
