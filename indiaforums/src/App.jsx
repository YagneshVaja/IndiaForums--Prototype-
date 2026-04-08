import { useEffect } from 'react';
import { useDevToolbar } from './contexts/DevToolbarContext';
import useAppNavigation from './hooks/useAppNavigation';

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
import FanFictionDetailScreen   from './screens/fanfiction/FanFictionDetailScreen';
import ChapterReaderScreen      from './screens/fanfiction/ChapterReaderScreen';
import FanFictionAuthorsScreen  from './screens/fanfiction/FanFictionAuthorsScreen';
import AuthorFollowersScreen    from './screens/fanfiction/AuthorFollowersScreen';
import QuizzesScreen       from './screens/quizzes/QuizzesScreen';
import ShortsScreen        from './screens/ShortsScreen';
import WebStoriesScreen    from './screens/WebStoriesScreen';
import WebStoryPlayer      from './components/stories/WebStoryPlayer';
import TagDetailScreen     from './screens/TagDetailScreen';

const TAB_SCREENS = {
  explore: ExploreScreen,
  news:    NewsScreen,
  forums:  ForumScreen,
  search:  SearchScreen,
  myspace: MySpaceScreen,
};

export default function App() {
  const nav = useAppNavigation();
  const { darkMode, toggleDarkMode, navResetTrigger } = useDevToolbar();

  /* ── Reset all navigation when toolbar reset button is pressed ────────── */
  useEffect(() => {
    if (navResetTrigger === 0) return;
    nav.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navResetTrigger]);

  /* ── Handlers ─────────────────────────────────────────────────────────────── */
  function handleStoryPress(story) { nav.setStory(story.label.toLowerCase()); }

  /* Open the immersive web-story player. Callers pass the full list snapshot
     plus the index of the tapped story so the player can navigate sideways
     between siblings without re-fetching. */
  function handleWebStorySelect({ stories, idx }) {
    if (!stories || stories.length === 0 || idx == null) return;
    nav.openWebStory({ stories, idx });
  }

  /* Drawer navigation — maps label to app state */
  function handleDrawerNavigate(target) {
    nav.closeDrawer();
    const storyTargets = [
      'celebrities', 'videos', 'galleries', 'fan fictions',
      'quizzes', 'shorts', 'web stories',
    ];
    if (target === 'home') {
      nav.setTab('explore');
    } else if (target === 'news') {
      nav.setTab('news');
    } else if (target === 'forums') {
      nav.setTab('forums');
    } else if (storyTargets.includes(target)) {
      nav.setStory(target);
    }
  }

  /* ── Determine current view ───────────────────────────────────────────────── */
  let topNavTitle = null;
  let topNavBack  = null;
  let content     = null;

  if (nav.selectedWebStory) {
    // Highest priority — the immersive web-story player owns the entire
    // content slot so it isn't clipped by whichever screen launched it.
    const { stories, idx } = nav.selectedWebStory;
    const currentStory = stories[idx];
    topNavTitle = 'Web Stories';
    topNavBack  = nav.closeWebStory;
    content = currentStory ? (
      <WebStoryPlayer
        key={currentStory.id}
        story={currentStory}
        allStories={stories}
        storyIdx={idx}
        onClose={nav.closeWebStory}
        onNavigateStory={nav.setWebStoryIdx}
      />
    ) : null;

  } else if (nav.selectedGallery) {
    topNavTitle = nav.selectedGallery.title;
    topNavBack  = nav.clearGallery;
    content     = <GalleryDetailScreen gallery={nav.selectedGallery} onBack={nav.clearGallery} onGalleryPress={nav.selectGallery} />;

  } else if (nav.activeStory === 'galleries' || nav.showGalleries) {
    topNavTitle = 'Photo Gallery';
    topNavBack  = nav.showGalleries ? nav.closeGalleries : nav.clearStory;
    content     = <GalleryScreen onBack={topNavBack} onGalleryPress={nav.selectGallery} />;

  } else if (nav.selectedCeleb) {
    topNavTitle = nav.selectedCeleb.name;
    topNavBack  = nav.clearCeleb;
    content     = <CelebrityDetailScreen celebrity={nav.selectedCeleb} />;

  } else if (nav.activeStory === 'celebrities') {
    topNavTitle = 'Celebrities';
    topNavBack  = nav.clearStory;
    content     = <CelebritiesScreen onBack={nav.clearStory} onCelebPress={nav.selectCeleb} />;

  } else if (nav.selectedVideo) {
    topNavTitle = 'Video';
    topNavBack  = nav.clearVideo;
    content     = (
      <VideoDetailScreen
        video={nav.selectedVideo}
        onBack={nav.clearVideo}
        onVideoPress={nav.selectVideo}
      />
    );

  } else if (nav.activeStory === 'videos') {
    topNavTitle = 'Videos';
    topNavBack  = nav.clearStory;
    content     = <VideoScreen onBack={nav.clearStory} onVideoPress={nav.selectVideo} />;

  } else if (nav.selectedFanficChapter) {
    topNavTitle = 'Reader';
    topNavBack  = nav.clearFanficChapter;
    content     = (
      <ChapterReaderScreen
        chapterId={nav.selectedFanficChapter.chapterId}
        onBack={nav.clearFanficChapter}
      />
    );

  } else if (nav.selectedFanficAuthor) {
    topNavTitle = nav.selectedFanficAuthor.name || 'Followers';
    topNavBack  = nav.clearFanficAuthor;
    content     = (
      <AuthorFollowersScreen
        authorId={nav.selectedFanficAuthor.id}
        authorName={nav.selectedFanficAuthor.name}
      />
    );

  } else if (nav.selectedFanfic) {
    topNavTitle = nav.selectedFanfic.title || 'Story';
    topNavBack  = nav.clearFanfic;
    content     = (
      <FanFictionDetailScreen
        storyId={nav.selectedFanfic.id}
        onChapterPress={(chapterId) => nav.selectFanficChapter({ chapterId, storyId: nav.selectedFanfic.id })}
        onAuthorPress={(id, name) => nav.selectFanficAuthor({ id, name })}
        onDiscussPress={() => nav.setTab('forum')}
      />
    );

  } else if (nav.showFanficAuthors) {
    topNavTitle = 'Top Authors';
    topNavBack  = nav.closeFanficAuthors;
    content     = (
      <FanFictionAuthorsScreen
        onAuthorPress={(id, author) => nav.selectFanficAuthor({ id, name: author?.authorName || author?.userName || author?.name })}
        onAuthorFollowersPress={(id, name) => nav.selectFanficAuthor({ id, name })}
      />
    );

  } else if (nav.activeStory === 'fan fictions') {
    topNavTitle = 'Fan Fictions';
    topNavBack  = nav.clearStory;
    content     = (
      <FanFictionScreen
        onBack={nav.clearStory}
        onStoryPress={(story) => nav.selectFanfic({ id: story.id, title: story.title })}
        onAuthorsPress={() => nav.openFanficAuthors()}
      />
    );

  } else if (nav.activeStory === 'quizzes') {
    topNavTitle = 'Fan Quizzes';
    topNavBack  = nav.clearStory;
    content     = <QuizzesScreen onBack={nav.clearStory} />;

  } else if (nav.activeStory === 'shorts') {
    topNavTitle = 'Shorts';
    topNavBack  = nav.clearStory;
    content     = <ShortsScreen onBack={nav.clearStory} />;

  } else if (nav.activeStory === 'web stories') {
    topNavTitle = 'Web Stories';
    topNavBack  = nav.clearStory;
    content     = (
      <WebStoriesScreen
        onBack={nav.clearStory}
        onWebStorySelect={handleWebStorySelect}
      />
    );

  } else if (nav.selectedTopic) {
    topNavBack  = nav.clearTopic;
    content     = <TopicDetailScreen topic={nav.selectedTopic} />;

  } else if (nav.selectedTag) {
    topNavTitle = nav.selectedTag.name;
    topNavBack  = nav.clearTag;
    content     = (
      <TagDetailScreen
        tag={nav.selectedTag}
        onBack={nav.clearTag}
        onArticlePress={nav.selectArticle}
        onVideoPress={nav.selectVideo}
        onGalleryPress={nav.selectGallery}
      />
    );

  } else if (nav.selectedArticle) {
    topNavTitle = 'Article';
    topNavBack  = nav.clearArticle;
    content     = (
      <ArticleScreen
        article={nav.selectedArticle}
        onArticlePress={nav.selectArticle}
        onTagPress={nav.selectTag}
      />
    );

  } else if (nav.activeTab === 'forums') {
    if (nav.drilledForum) {
      topNavBack = nav.clearDrilledForum;
    }
    content = (
      <ForumScreen
        onTopicPress={nav.selectTopic}
        onForumDrill={nav.drillForum}
        drilledForum={nav.drilledForum}
      />
    );

  } else {
    const ActiveScreen = TAB_SCREENS[nav.activeTab];
    content = (
      <ActiveScreen
        onArticlePress={nav.selectArticle}
        onVideoPress={nav.selectVideo}
        onGalleryPress={nav.selectGallery}
        onGalleriesOpen={nav.openGalleries}
        onStoryPress={handleStoryPress}
        onWebStorySelect={handleWebStorySelect}
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
        onMenuOpen={nav.openDrawer}
      />

      {content}

      <BottomNav
        activeTab={nav.activeTab}
        onTabChange={nav.setTab}
      />

      {/* Side drawer — rendered inside PhoneShell so it's clipped to the frame */}
      <SideDrawer
        open={nav.drawerOpen}
        onClose={nav.closeDrawer}
        darkMode={darkMode}
        onDarkModeToggle={toggleDarkMode}
        onNavigate={handleDrawerNavigate}
      />
    </PhoneShell>
  );
}
