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
import CelebritiesScreen  from './screens/CelebritiesScreen';
import VideoScreen        from './screens/VideoScreen';
import FanFictionScreen   from './screens/FanFictionScreen';
import QuizzesScreen      from './screens/QuizzesScreen';

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
  const [activeStory,      setActiveStory]      = useState(null);

  const ActiveScreen = SCREENS[activeTab];

  function handleGalleryPress(gallery) {
    setSelectedGallery(gallery);
  }

  function handleGalleryBack() {
    setSelectedGallery(null);
    // Stay in whichever gallery-listing context was active
  }

  function handleGalleriesOpen() {
    setShowGalleries(true);
  }

  function handleGalleriesBack() {
    setShowGalleries(false);
  }

  function handleStoryPress(story) {
    setActiveStory(story.label.toLowerCase());
  }

  function handleStoryBack() {
    setActiveStory(null);
  }

  // Gallery detail — highest priority regardless of how we got here
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

  // Gallery listing — from Stories strip OR from See All button
  if (activeStory === 'galleries' || showGalleries) {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <GalleryScreen
          onBack={showGalleries ? handleGalleriesBack : handleStoryBack}
          onGalleryPress={handleGalleryPress}
        />
      </PhoneShell>
    );
  }

  // Story screens take priority
  if (activeStory === 'celebrities') {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <CelebritiesScreen onBack={handleStoryBack} />
      </PhoneShell>
    );
  }

  if (activeStory === 'videos') {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <VideoScreen onBack={handleStoryBack} />
      </PhoneShell>
    );
  }

  if (activeStory === 'fan fictions') {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <FanFictionScreen onBack={handleStoryBack} />
      </PhoneShell>
    );
  }

  if (activeStory === 'quizzes') {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <QuizzesScreen onBack={handleStoryBack} />
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
            onStoryPress={handleStoryPress}
          />
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </>
      )}
    </PhoneShell>
  );
}
