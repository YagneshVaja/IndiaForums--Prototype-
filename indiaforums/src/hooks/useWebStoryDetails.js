import { useState, useEffect, useCallback } from 'react';
import * as webStoriesApi from '../services/webStoriesApi';
import { extractApiError } from '../services/api';
import { transformStoryDetails } from '../components/stories/normalize';

/**
 * useWebStoryDetails — lazy fetch of a single web story's full slide data.
 *
 * Pass `null` / `undefined` for `storyId` to suppress the fetch (useful for
 * rendering the player conditionally: keep the hook mounted, flip the id on
 * when the user opens a story).
 *
 * @param {string|number|null} storyId
 */
export default function useWebStoryDetails(storyId) {
  const [story, setStory]     = useState(null);
  const [slides, setSlides]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (storyId == null) {
      setStory(null);
      setSlides([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await webStoriesApi.getWebStoryDetails(storyId);
      const { story: s, slides: sl } = transformStoryDetails(res.data, storyId);
      setStory(s);
      setSlides(sl);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load story'));
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { story, slides, loading, error, refetch: fetch };
}
