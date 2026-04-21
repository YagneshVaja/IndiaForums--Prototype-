import { useState, useRef, useEffect } from 'react';
import styles from './ForumScreen.module.css';
import useForumTopics from '../hooks/useForumTopics';
import useAllForumTopics from '../hooks/useAllForumTopics';
import { TOP_TABS } from './forum/forumHelpers';
import ForumListView from './forum/ForumListView';
import ForumThreadView from './forum/ForumThreadView';
import AllTopicsView from './forum/AllTopicsView';

export default function ForumScreen({ onTopicPress, onForumDrill, drilledForum }) {
  const [topTab, setTopTab] = useState('forums');
  const [selectedForum, setSelectedForum] = useState(null);
  const [view, setView] = useState('list');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!drilledForum && view === 'threads') {
      setView('list');
      setSelectedForum(null);
      scrollTop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drilledForum]);

  const forumTopics = useForumTopics(selectedForum?.id || null);
  const allTopics = useAllForumTopics();

  function scrollTop() {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  function switchTopTab(id) {
    setTopTab(id);
    setView('list');
    setSelectedForum(null);
    scrollTop();
  }

  function openForum(forum) {
    setSelectedForum(forum);
    setView('threads');
    onForumDrill?.(forum);
    scrollTop();
  }

  if (view === 'threads' && selectedForum) {
    return (
      <ForumThreadView
        selectedForum={selectedForum}
        forumDetail={forumTopics.forumDetail}
        flairs={forumTopics.flairs}
        topics={forumTopics.topics}
        topicsLoading={forumTopics.loading}
        topicsLoadingMore={forumTopics.loadingMore}
        topicsError={forumTopics.error}
        topicsHasMore={forumTopics.hasMore}
        loadMoreTopics={forumTopics.loadMore}
        refreshTopics={forumTopics.refresh}
        onTopicPress={onTopicPress}
      />
    );
  }

  return (
    <div className={styles.screen} ref={scrollRef}>
      <div className={styles.topTabBar}>
        {TOP_TABS.map(({ id, label }) => (
          <div key={id}
            className={`${styles.topTab} ${topTab === id ? styles.topTabActive : ''}`}
            onClick={() => switchTopTab(id)}
          >{label}</div>
        ))}
      </div>

      {topTab === 'forums' && (
        <ForumListView onForumPress={openForum} />
      )}

      {topTab === 'all-topics' && (
        <AllTopicsView
          allTopics={allTopics.topics}
          allTopicsTotal={allTopics.totalCount}
          allTopicsLoading={allTopics.loading}
          allTopicsLoadingMore={allTopics.loadingMore}
          allTopicsError={allTopics.error}
          allTopicsHasMore={allTopics.hasMore}
          loadMoreAllTopics={allTopics.loadMore}
          refreshAllTopics={allTopics.refresh}
          onTopicPress={onTopicPress}
        />
      )}

      <div className={styles.spacer}/>
    </div>
  );
}
