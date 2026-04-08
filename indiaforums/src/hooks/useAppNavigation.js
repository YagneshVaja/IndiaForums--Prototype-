import { useReducer, useCallback } from 'react';

const initialState = {
  activeTab:       'explore',
  selectedArticle: null,
  selectedVideo:   null,
  showGalleries:   false,
  selectedGallery: null,
  activeStory:     null,
  selectedTopic:   null,
  selectedCeleb:   null,
  drilledForum:    null,
  selectedTag:     null,
  drawerOpen:      false,
  // Fan-fiction sub-views (only set when activeStory === 'fan fictions')
  selectedFanfic:           null,  // { id, title? }
  selectedFanficChapter:    null,  // { chapterId, storyId? }
  showFanficAuthors:        false,
  selectedFanficAuthor:     null,  // { id, name } — for followers screen
  // Web story player — owns its own top-level screen so the immersive
  // viewer doesn't get clipped inside whatever screen launched it.
  selectedWebStory:         null,  // { stories: WebStory[], idx: number }
};

function navReducer(state, action) {
  switch (action.type) {
    case 'SET_TAB':
      return { ...initialState, activeTab: action.payload };

    case 'SELECT_ARTICLE':
      return { ...state, selectedArticle: action.payload };
    case 'CLEAR_ARTICLE':
      return { ...state, selectedArticle: null };

    case 'SELECT_VIDEO':
      return { ...state, selectedVideo: action.payload };
    case 'CLEAR_VIDEO':
      return { ...state, selectedVideo: null };

    case 'OPEN_GALLERIES':
      return { ...state, showGalleries: true };
    case 'CLOSE_GALLERIES':
      return { ...state, showGalleries: false };

    case 'SELECT_GALLERY':
      return { ...state, selectedGallery: action.payload };
    case 'CLEAR_GALLERY':
      return { ...state, selectedGallery: null };

    case 'SET_STORY':
      return {
        ...state,
        activeStory:     action.payload,
        selectedArticle: null,
        selectedGallery: null,
        showGalleries:   false,
      };
    case 'CLEAR_STORY':
      return { ...state, activeStory: null };

    case 'SELECT_TOPIC':
      return { ...state, selectedTopic: action.payload };
    case 'CLEAR_TOPIC':
      return { ...state, selectedTopic: null };

    case 'SELECT_CELEB':
      return { ...state, selectedCeleb: action.payload };
    case 'CLEAR_CELEB':
      return { ...state, selectedCeleb: null };

    case 'DRILL_FORUM':
      return { ...state, drilledForum: action.payload };
    case 'CLEAR_DRILLED_FORUM':
      return { ...state, drilledForum: null };

    case 'SELECT_TAG':
      return { ...state, selectedTag: action.payload };
    case 'CLEAR_TAG':
      return { ...state, selectedTag: null };

    case 'OPEN_DRAWER':
      return { ...state, drawerOpen: true };
    case 'CLOSE_DRAWER':
      return { ...state, drawerOpen: false };

    case 'SELECT_FANFIC':
      return { ...state, selectedFanfic: action.payload };
    case 'CLEAR_FANFIC':
      return { ...state, selectedFanfic: null };

    case 'SELECT_FANFIC_CHAPTER':
      return { ...state, selectedFanficChapter: action.payload };
    case 'CLEAR_FANFIC_CHAPTER':
      return { ...state, selectedFanficChapter: null };

    case 'OPEN_FANFIC_AUTHORS':
      return { ...state, showFanficAuthors: true };
    case 'CLOSE_FANFIC_AUTHORS':
      return { ...state, showFanficAuthors: false };

    case 'SELECT_FANFIC_AUTHOR':
      return { ...state, selectedFanficAuthor: action.payload };
    case 'CLEAR_FANFIC_AUTHOR':
      return { ...state, selectedFanficAuthor: null };

    case 'OPEN_WEB_STORY':
      // payload: { stories, idx }
      return { ...state, selectedWebStory: action.payload };
    case 'CLOSE_WEB_STORY':
      return { ...state, selectedWebStory: null };
    case 'SET_WEB_STORY_IDX': {
      const cur = state.selectedWebStory;
      if (!cur) return state;
      const newIdx = action.payload;
      if (newIdx < 0 || newIdx >= cur.stories.length) {
        return { ...state, selectedWebStory: null };
      }
      return { ...state, selectedWebStory: { ...cur, idx: newIdx } };
    }

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

export default function useAppNavigation() {
  const [state, dispatch] = useReducer(navReducer, initialState);

  const actions = {
    setTab:           useCallback((tab) => dispatch({ type: 'SET_TAB', payload: tab }), []),
    selectArticle:    useCallback((a)   => dispatch({ type: 'SELECT_ARTICLE', payload: a }), []),
    clearArticle:     useCallback(()    => dispatch({ type: 'CLEAR_ARTICLE' }), []),
    selectVideo:      useCallback((v)   => dispatch({ type: 'SELECT_VIDEO', payload: v }), []),
    clearVideo:       useCallback(()    => dispatch({ type: 'CLEAR_VIDEO' }), []),
    openGalleries:    useCallback(()    => dispatch({ type: 'OPEN_GALLERIES' }), []),
    closeGalleries:   useCallback(()    => dispatch({ type: 'CLOSE_GALLERIES' }), []),
    selectGallery:    useCallback((g)   => dispatch({ type: 'SELECT_GALLERY', payload: g }), []),
    clearGallery:     useCallback(()    => dispatch({ type: 'CLEAR_GALLERY' }), []),
    setStory:         useCallback((s)   => dispatch({ type: 'SET_STORY', payload: s }), []),
    clearStory:       useCallback(()    => dispatch({ type: 'CLEAR_STORY' }), []),
    selectTopic:      useCallback((t)   => dispatch({ type: 'SELECT_TOPIC', payload: t }), []),
    clearTopic:       useCallback(()    => dispatch({ type: 'CLEAR_TOPIC' }), []),
    selectCeleb:      useCallback((c)   => dispatch({ type: 'SELECT_CELEB', payload: c }), []),
    clearCeleb:       useCallback(()    => dispatch({ type: 'CLEAR_CELEB' }), []),
    drillForum:       useCallback((f)   => dispatch({ type: 'DRILL_FORUM', payload: f }), []),
    clearDrilledForum:useCallback(()    => dispatch({ type: 'CLEAR_DRILLED_FORUM' }), []),
    selectTag:        useCallback((t)   => dispatch({ type: 'SELECT_TAG', payload: t }), []),
    clearTag:         useCallback(()    => dispatch({ type: 'CLEAR_TAG' }), []),
    openDrawer:       useCallback(()    => dispatch({ type: 'OPEN_DRAWER' }), []),
    closeDrawer:      useCallback(()    => dispatch({ type: 'CLOSE_DRAWER' }), []),

    selectFanfic:        useCallback((s) => dispatch({ type: 'SELECT_FANFIC', payload: s }), []),
    clearFanfic:         useCallback(()  => dispatch({ type: 'CLEAR_FANFIC' }), []),
    selectFanficChapter: useCallback((c) => dispatch({ type: 'SELECT_FANFIC_CHAPTER', payload: c }), []),
    clearFanficChapter:  useCallback(()  => dispatch({ type: 'CLEAR_FANFIC_CHAPTER' }), []),
    openFanficAuthors:   useCallback(()  => dispatch({ type: 'OPEN_FANFIC_AUTHORS' }), []),
    closeFanficAuthors:  useCallback(()  => dispatch({ type: 'CLOSE_FANFIC_AUTHORS' }), []),
    selectFanficAuthor:  useCallback((a) => dispatch({ type: 'SELECT_FANFIC_AUTHOR', payload: a }), []),
    clearFanficAuthor:   useCallback(()  => dispatch({ type: 'CLEAR_FANFIC_AUTHOR' }), []),

    openWebStory:    useCallback((p)   => dispatch({ type: 'OPEN_WEB_STORY', payload: p }), []),
    closeWebStory:   useCallback(()    => dispatch({ type: 'CLOSE_WEB_STORY' }), []),
    setWebStoryIdx:  useCallback((i)   => dispatch({ type: 'SET_WEB_STORY_IDX', payload: i }), []),

    reset:            useCallback(()    => dispatch({ type: 'RESET' }), []),
  };

  return { ...state, ...actions };
}
