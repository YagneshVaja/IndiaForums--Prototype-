import { useState } from 'react';

import PhoneShell    from './components/layout/PhoneShell';
import DynamicIsland from './components/layout/DynamicIsland';
import StatusBar     from './components/layout/StatusBar';
import TopNav        from './components/layout/TopNav';
import BottomNav     from './components/layout/BottomNav';

import ExploreScreen       from './screens/ExploreScreen';
import NewsScreen          from './screens/NewsScreen';
import ForumScreen         from './screens/ForumScreen';
import SearchScreen        from './screens/SearchScreen';
import MySpaceScreen       from './screens/MySpaceScreen';
import ArticleScreen       from './screens/ArticleScreen';
import GalleryScreen       from './screens/GalleryScreen';
import GalleryDetailScreen from './screens/GalleryDetailScreen';
import CelebritiesScreen   from './screens/CelebritiesScreen';
import VideoScreen         from './screens/VideoScreen';
import FanFictionScreen    from './screens/FanFictionScreen';
import QuizzesScreen       from './screens/QuizzesScreen';
import ShortsScreen        from './screens/ShortsScreen';
import WebStoriesScreen    from './screens/WebStoriesScreen';

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
  const [showGalleries,   setShowGalleries]   = useState(false);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [activeStory,     setActiveStory]     = useState(null);

  const ActiveScreen = SCREENS[activeTab];

  function handleGalleryPress(gallery) { setSelectedGallery(gallery); }
  function handleGalleryBack()         { setSelectedGallery(null); }
  function handleGalleriesOpen()       { setShowGalleries(true); }
  function handleGalleriesBack()       { setShowGalleries(false); }
  function handleStoryPress(story)     { setActiveStory(story.label.toLowerCase()); }
  function handleStoryBack()           { setActiveStory(null); }

  // Closes any sub-screen and switches bottom tab
  function handleNavTabChange(tab) {
    setActiveStory(null);
    setShowGalleries(false);
    setSelectedGallery(null);
    setSelectedArticle(null);
    setActiveTab(tab);
  }

  // ── Gallery detail ────────────────────────────────────────────────────────────
  if (selectedGallery) {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <TopNav title={selectedGallery.title} onBack={handleGalleryBack} />
        <GalleryDetailScreen gallery={selectedGallery} onBack={handleGalleryBack} />
        <BottomNav activeTab={activeTab} onTabChange={handleNavTabChange} />
      </PhoneShell>
    );
  }

  // ── Gallery listing ───────────────────────────────────────────────────────────
  if (activeStory === 'galleries' || showGalleries) {
    const backFn = showGalleries ? handleGalleriesBack : handleStoryBack;
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <TopNav title="Photo Gallery" onBack={backFn} />
        <GalleryScreen onBack={backFn} onGalleryPress={handleGalleryPress} />
        <BottomNav activeTab={activeTab} onTabChange={handleNavTabChange} />
      </PhoneShell>
    );
  }

  // ── Celebrity rankings ────────────────────────────────────────────────────────
  if (activeStory === 'celebrities') {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <TopNav title="Celebrity Rankings" onBack={handleStoryBack} />
        <CelebritiesScreen onBack={handleStoryBack} />
        <BottomNav activeTab={activeTab} onTabChange={handleNavTabChange} />
      </PhoneShell>
    );
  }

  // ── Videos ───────────────────────────────────────────────────────────────────
  if (activeStory === 'videos') {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <TopNav title="Videos" onBack={handleStoryBack} />
        <VideoScreen onBack={handleStoryBack} />
        <BottomNav activeTab={activeTab} onTabChange={handleNavTabChange} />
      </PhoneShell>
    );
  }

  // ── Fan Fictions ──────────────────────────────────────────────────────────────
  if (activeStory === 'fan fictions') {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <TopNav title="Fan Fictions" onBack={handleStoryBack} />
        <FanFictionScreen onBack={handleStoryBack} />
        <BottomNav activeTab={activeTab} onTabChange={handleNavTabChange} />
      </PhoneShell>
    );
  }

  // ── Quizzes ───────────────────────────────────────────────────────────────────
  if (activeStory === 'quizzes') {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <TopNav title="Fan Quizzes" onBack={handleStoryBack} />
        <QuizzesScreen onBack={handleStoryBack} />
        <BottomNav activeTab={activeTab} onTabChange={handleNavTabChange} />
      </PhoneShell>
    );
  }

  // ── Web Stories ───────────────────────────────────────────────────────────────
  if (activeStory === 'web stories') {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <TopNav title="Web Stories" onBack={handleStoryBack} />
        <WebStoriesScreen onBack={handleStoryBack} />
        <BottomNav activeTab={activeTab} onTabChange={handleNavTabChange} />
      </PhoneShell>
    );
  }

  // ── Shorts ────────────────────────────────────────────────────────────────────
  if (activeStory === 'shorts') {
    return (
      <PhoneShell>
        <DynamicIsland />
        <StatusBar />
        <TopNav title="Shorts" onBack={handleStoryBack} />
        <ShortsScreen onBack={handleStoryBack} />
        <BottomNav activeTab={activeTab} onTabChange={handleNavTabChange} />
      </PhoneShell>
    );
  }

  // ── Main shell (tab screens + article) ───────────────────────────────────────
  return (
    <PhoneShell>
      <DynamicIsland />
      <StatusBar />

      {selectedArticle ? (
        <>
          <TopNav title="Article" onBack={() => setSelectedArticle(null)} />
          <ArticleScreen
            article={selectedArticle}
            onBack={() => setSelectedArticle(null)}
            onArticlePress={setSelectedArticle}
          />
          <BottomNav activeTab={activeTab} onTabChange={handleNavTabChange} />
        </>
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
