import { useState } from 'react';

import PhoneShell    from './components/layout/PhoneShell';
import DynamicIsland from './components/layout/DynamicIsland';
import StatusBar     from './components/layout/StatusBar';
import TopNav        from './components/layout/TopNav';
import BottomNav     from './components/layout/BottomNav';
import SideDrawer    from './components/layout/SideDrawer';

import ExploreScreen       from './screens/ExploreScreen';
import NewsScreen          from './screens/NewsScreen';
import ForumScreen         from './screens/ForumScreen';
import SearchScreen        from './screens/SearchScreen';
import MySpaceScreen       from './screens/MySpaceScreen';
import ArticleScreen       from './screens/ArticleScreen';
import GalleryScreen       from './screens/GalleryScreen';
import GalleryDetailScreen from './screens/GalleryDetailScreen';
import TopicDetailScreen   from './screens/TopicDetailScreen';
import CelebritiesScreen      from './screens/CelebritiesScreen';
import CelebrityDetailScreen from './screens/CelebrityDetailScreen';
import VideoScreen         from './screens/VideoScreen';
import VideoDetailScreen   from './screens/VideoDetailScreen';
import FanFictionScreen    from './screens/FanFictionScreen';
import QuizzesScreen       from './screens/QuizzesScreen';
import ShortsScreen        from './screens/ShortsScreen';
import WebStoriesScreen    from './screens/WebStoriesScreen';
import TagDetailScreen     from './screens/TagDetailScreen';

const TAB_SCREENS = {
  explore: ExploreScreen,
  news:    NewsScreen,
  forums:  ForumScreen,
  search:  SearchScreen,
  myspace: MySpaceScreen,
};

export default function App() {
  /* ── Navigation state ─────────────────────────────────────────────────────── */
  const [activeTab,       setActiveTab]       = useState('explore');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedVideo,   setSelectedVideo]   = useState(null);
  const [showGalleries,   setShowGalleries]   = useState(false);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [activeStory,     setActiveStory]     = useState(null);
  const [selectedTopic,   setSelectedTopic]   = useState(null);
  const [selectedCeleb,   setSelectedCeleb]   = useState(null);
  const [drilledForum,    setDrilledForum]    = useState(null);
  const [selectedTag,     setSelectedTag]     = useState(null);

  /* ── UI state ─────────────────────────────────────────────────────────────── */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [darkMode,   setDarkMode]   = useState(false);

  /* ── Handlers ─────────────────────────────────────────────────────────────── */
  function handleGalleryPress(gallery) { setSelectedGallery(gallery); }
  function handleGalleryBack()         { setSelectedGallery(null); }
  function handleGalleriesOpen()       { setShowGalleries(true); }
  function handleGalleriesBack()       { setShowGalleries(false); }
  function handleStoryPress(story)     { setActiveStory(story.label.toLowerCase()); }
  function handleStoryBack()           { setActiveStory(null); }

  function handleNavTabChange(tab) {
    setActiveStory(null);
    setShowGalleries(false);
    setSelectedGallery(null);
    setSelectedArticle(null);
    setSelectedVideo(null);
    setSelectedTopic(null);
    setSelectedCeleb(null);
    setDrilledForum(null);
    setSelectedTag(null);
    setActiveTab(tab);
  }

  /* Drawer navigation — maps label to app state */
  function handleDrawerNavigate(target) {
    setDrawerOpen(false);
    const storyTargets = [
      'celebrities', 'videos', 'galleries', 'fan fictions',
      'quizzes', 'shorts', 'web stories',
    ];
    if (target === 'home') {
      handleNavTabChange('explore');
    } else if (target === 'news') {
      handleNavTabChange('news');
    } else if (target === 'forums') {
      handleNavTabChange('forums');
    } else if (storyTargets.includes(target)) {
      setSelectedArticle(null);
      setSelectedGallery(null);
      setShowGalleries(false);
      setActiveStory(target);
    }
  }

  /* ── Determine current view ───────────────────────────────────────────────── */
  let topNavTitle = null;
  let topNavBack  = null;
  let content     = null;

  if (selectedGallery) {
    topNavTitle = selectedGallery.title;
    topNavBack  = handleGalleryBack;
    content     = <GalleryDetailScreen gallery={selectedGallery} onBack={handleGalleryBack} onGalleryPress={handleGalleryPress} />;

  } else if (activeStory === 'galleries' || showGalleries) {
    topNavTitle = 'Photo Gallery';
    topNavBack  = showGalleries ? handleGalleriesBack : handleStoryBack;
    content     = <GalleryScreen onBack={topNavBack} onGalleryPress={handleGalleryPress} />;

  } else if (selectedCeleb) {
    topNavTitle = selectedCeleb.name;
    topNavBack  = () => setSelectedCeleb(null);
    content     = <CelebrityDetailScreen celebrity={selectedCeleb} />;

  } else if (activeStory === 'celebrities') {
    topNavTitle = 'Celebrities';
    topNavBack  = handleStoryBack;
    content     = <CelebritiesScreen onBack={handleStoryBack} onCelebPress={setSelectedCeleb} />;

  } else if (selectedVideo) {
    topNavTitle = 'Video';
    topNavBack  = () => setSelectedVideo(null);
    content     = (
      <VideoDetailScreen
        video={selectedVideo}
        onBack={() => setSelectedVideo(null)}
        onVideoPress={setSelectedVideo}
      />
    );

  } else if (activeStory === 'videos') {
    topNavTitle = 'Videos';
    topNavBack  = handleStoryBack;
    content     = <VideoScreen onBack={handleStoryBack} onVideoPress={setSelectedVideo} />;

  } else if (activeStory === 'fan fictions') {
    topNavTitle = 'Fan Fictions';
    topNavBack  = handleStoryBack;
    content     = <FanFictionScreen onBack={handleStoryBack} />;

  } else if (activeStory === 'quizzes') {
    topNavTitle = 'Fan Quizzes';
    topNavBack  = handleStoryBack;
    content     = <QuizzesScreen onBack={handleStoryBack} />;

  } else if (activeStory === 'shorts') {
    topNavTitle = 'Shorts';
    topNavBack  = handleStoryBack;
    content     = <ShortsScreen onBack={handleStoryBack} />;

  } else if (activeStory === 'web stories') {
    topNavTitle = 'Web Stories';
    topNavBack  = handleStoryBack;
    content     = <WebStoriesScreen onBack={handleStoryBack} />;

  } else if (selectedTopic) {
    topNavBack  = () => setSelectedTopic(null);
    content     = <TopicDetailScreen topic={selectedTopic} />;

  } else if (selectedTag) {
    topNavTitle = selectedTag.name;
    topNavBack  = () => setSelectedTag(null);
    content     = (
      <TagDetailScreen
        tag={selectedTag}
        onBack={() => setSelectedTag(null)}
        onArticlePress={setSelectedArticle}
        onVideoPress={setSelectedVideo}
        onGalleryPress={handleGalleryPress}
      />
    );

  } else if (selectedArticle) {
    topNavTitle = 'Article';
    topNavBack  = () => setSelectedArticle(null);
    content     = (
      <ArticleScreen
        article={selectedArticle}
        onBack={() => setSelectedArticle(null)}
        onArticlePress={setSelectedArticle}
        onTagPress={setSelectedTag}
      />
    );

  } else if (activeTab === 'forums') {
    if (drilledForum) {
      topNavBack = () => setDrilledForum(null);
    }
    content = (
      <ForumScreen
        onTopicPress={setSelectedTopic}
        onForumDrill={setDrilledForum}
        drilledForum={drilledForum}
      />
    );

  } else {
    const ActiveScreen = TAB_SCREENS[activeTab];
    content = (
      <ActiveScreen
        onArticlePress={setSelectedArticle}
        onVideoPress={setSelectedVideo}
        onGalleryPress={handleGalleryPress}
        onGalleriesOpen={handleGalleriesOpen}
        onStoryPress={handleStoryPress}
      />
    );
  }

  /* ── Single render tree ───────────────────────────────────────────────────── */
  return (
    <PhoneShell darkMode={darkMode}>
      <DynamicIsland />
      <StatusBar />

      <TopNav
        title={topNavTitle}
        onBack={topNavBack}
        onMenuOpen={() => setDrawerOpen(true)}
      />

      {content}

      <BottomNav
        activeTab={activeTab}
        onTabChange={topNavBack ? handleNavTabChange : setActiveTab}
      />

      {/* Side drawer — rendered inside PhoneShell so it's clipped to the frame */}
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        darkMode={darkMode}
        onDarkModeToggle={() => setDarkMode((d) => !d)}
        onNavigate={handleDrawerNavigate}
      />
    </PhoneShell>
  );
}
