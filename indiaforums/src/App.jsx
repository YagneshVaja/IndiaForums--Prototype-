import { useState } from 'react';

import PhoneShell    from './components/layout/PhoneShell';
import DynamicIsland from './components/layout/DynamicIsland';
import StatusBar     from './components/layout/StatusBar';
import TopNav        from './components/layout/TopNav';
import BottomNav     from './components/layout/BottomNav';

import ExploreScreen      from './screens/ExploreScreen';
import NewsScreen         from './screens/NewsScreen';
import ForumScreen        from './screens/ForumScreen';
import SearchScreen       from './screens/SearchScreen';
import MySpaceScreen      from './screens/MySpaceScreen';
import ArticleScreen      from './screens/ArticleScreen';
import GalleryScreen      from './screens/GalleryScreen';
import GalleryDetailScreen from './screens/GalleryDetailScreen';

const SCREENS = {
  explore: ExploreScreen,
  news:    NewsScreen,
  forums:  ForumScreen,
  search:  SearchScreen,
  myspace: MySpaceScreen,
};

export default function App() {
  const [activeTab,        setActiveTab]        = useState('explore');
  const [selectedArticle,  setSelectedArticle]  = useState(null);
  const [showGalleries,    setShowGalleries]    = useState(false);
  const [selectedGallery,  setSelectedGallery]  = useState(null);

  const ActiveScreen = SCREENS[activeTab];

  function handleGalleryPress(gallery) {
    setSelectedGallery(gallery);
    setShowGalleries(false);
  }

  function handleGalleryBack() {
    setSelectedGallery(null);
    setShowGalleries(true);
  }

  function handleGalleriesOpen() {
    setShowGalleries(true);
  }

  function handleGalleriesBack() {
    setShowGalleries(false);
  }

  // Gallery detail takes highest priority
  if (selectedGallery) {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <GalleryDetailScreen
          gallery={selectedGallery}
          onBack={handleGalleryBack}
        />
      </PhoneShell>
    );
  }

  // Gallery list screen
  if (showGalleries) {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <GalleryScreen
          onBack={handleGalleriesBack}
          onGalleryPress={handleGalleryPress}
        />
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <DynamicIsland />
      <StatusBar />

      {selectedArticle ? (
        <ArticleScreen
          article={selectedArticle}
          onBack={() => setSelectedArticle(null)}
          onArticlePress={setSelectedArticle}
        />
      ) : (
        <>
          <TopNav />
          <ActiveScreen
            onArticlePress={setSelectedArticle}
            onGalleryPress={handleGalleryPress}
            onGalleriesOpen={handleGalleriesOpen}
          />
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </>
      )}
    </PhoneShell>
  );
}
