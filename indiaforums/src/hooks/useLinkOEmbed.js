import { useEffect, useRef, useState } from 'react';
import { fetchLinkOEmbed } from '../services/api';

// Module-level cache — link metadata (title/description/image) is stable for
// the lifetime of a URL, so share one in-memory cache across every
// LinkPreview instance. If five posts share an article URL, we call the API
// once and every card gets the same payload instantly.
//
// Values are promises while in flight (so concurrent requests dedupe) and
// then the resolved LinkOEmbed object (or null on failure).
const cache = new Map();

export default function useLinkOEmbed(url) {
  const [data, setData]       = useState(() => getCachedResolved(url));
  const [loading, setLoading] = useState(() => !getCachedResolved(url) && !!url);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }
    const cached = cache.get(url);
    if (cached && typeof cached.then !== 'function') {
      setData(cached);
      setLoading(false);
      return;
    }

    const myReqId = ++reqIdRef.current;
    setLoading(true);
    const promise = cached || fetchLinkOEmbed(url);
    if (!cached) cache.set(url, promise);

    promise.then((result) => {
      cache.set(url, result);
      if (myReqId !== reqIdRef.current) return;
      setData(result);
      setLoading(false);
    });
  }, [url]);

  return { data, loading };
}

function getCachedResolved(url) {
  if (!url) return null;
  const v = cache.get(url);
  if (!v || typeof v.then === 'function') return null;
  return v;
}
