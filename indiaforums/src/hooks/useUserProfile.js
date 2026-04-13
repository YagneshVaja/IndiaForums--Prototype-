import { useState, useEffect, useCallback } from 'react';
import * as profileApi from '../services/userProfileApi';
import { extractApiError } from '../services/api';

/**
 * @param {number|'skip'} userId
 *   - number: fetch user's profile via /users/{id}/profile
 *   - 'skip': don't fetch (used when profile data comes from auth context)
 *
 * The profile endpoint returns a rich object:
 *   { user, loggedInUser, buddyDetails, activities, nextUrl, ... }
 * We expose user as `profile`, plus `activities` and `buddyDetails` separately.
 */
export default function useUserProfile(userId) {
  const [profile,      setProfile]      = useState(null);
  const [activities,   setActivities]   = useState([]);
  const [buddyDetails, setBuddyDetails] = useState(null);
  const [loading,      setLoading]      = useState(userId !== 'skip');
  const [error,        setError]        = useState(null);

  const fetch = useCallback(async () => {
    if (userId === 'skip' || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await profileApi.getProfile(userId);
      const d = res.data;
      setProfile(d?.user || d);
      setActivities(Array.isArray(d?.activities) ? d.activities : []);
      setBuddyDetails(d?.buddyDetails || null);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError(extractApiError(err, `Failed to load profile (${status || err.message})`));
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { profile, activities, buddyDetails, loading, error, refetch: fetch };
}

/**
 * Generic hook for paginated profile sub-sections.
 */
export function useProfileSection(apiFn, userId, selfApiFn = null, isSelf = false, initialParams = {}) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [params, setParams]   = useState(initialParams);

  const fetch = useCallback(async () => {
    if (!isSelf && !userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = (isSelf && selfApiFn)
        ? await selfApiFn(params)
        : await apiFn(userId, params);
      const d = res.data;
      const items = d?.items     || d?.data       || d?.comments   || d?.posts
                 || d?.topics    || d?.badges     || d?.drafts     || d?.buddies
                 || d?.movies    || d?.shows      || d?.celebs     || d?.celebrities
                 || d?.forums    || d?.followers  || d?.following
                 || d?.warningHistory
                 || (Array.isArray(d) ? d : []);
      setData(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [apiFn, selfApiFn, userId, isSelf, params]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch, setParams };
}
