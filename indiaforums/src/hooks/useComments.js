import { useState, useEffect, useCallback } from 'react';
import * as commentsApi from '../services/commentsApi';
import { extractApiError } from '../services/api';

/**
 * Hook for the comments list of a single piece of content.
 *
 * Returns the list + mutating actions (create / like / delete) so the UI
 * can stay in sync without re-fetching the whole page.
 *
 * @param {number} contentTypeId      e.g. 7 = article, 1 = forum, 6 = media
 * @param {number} contentTypeValue   the content row id
 */
export default function useComments(contentTypeId, contentTypeValue) {
  const [comments, setComments]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [nextCursor, setNextCursor]   = useState(null);
  const [hasMore, setHasMore]         = useState(false);
  const [totalItems, setTotalItems]   = useState(0);
  const [actionError, setActionError] = useState(null);

  /* ── Initial fetch ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!contentTypeId || !contentTypeValue) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setComments([]);
    setNextCursor(null);

    commentsApi
      .getComments(contentTypeId, contentTypeValue)
      .then(({ comments: items, pagination }) => {
        if (cancelled) return;
        setComments(items);
        setNextCursor(pagination.nextCursor);
        setHasMore(pagination.hasNextPage);
        setTotalItems(pagination.totalItems);
      })
      .catch((err) => {
        if (!cancelled) setError(extractApiError(err, 'Failed to load comments'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [contentTypeId, contentTypeValue]);

  /* ── Load more (cursor pagination) ─────────────────────────────────────── */
  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor) return;
    try {
      const { comments: items, pagination } = await commentsApi.getComments(
        contentTypeId,
        contentTypeValue,
        { cursor: nextCursor },
      );
      setComments((prev) => [...prev, ...items]);
      setNextCursor(pagination.nextCursor);
      setHasMore(pagination.hasNextPage);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load more comments'));
    }
  }, [contentTypeId, contentTypeValue, hasMore, nextCursor]);

  /* ── Refresh in place (after a successful create/edit/delete) ──────────── */
  const refresh = useCallback(async () => {
    if (!contentTypeId || !contentTypeValue) return;
    try {
      const { comments: items, pagination } = await commentsApi.getComments(
        contentTypeId,
        contentTypeValue,
      );
      setComments(items);
      setNextCursor(pagination.nextCursor);
      setHasMore(pagination.hasNextPage);
      setTotalItems(pagination.totalItems);
    } catch (err) {
      setError(extractApiError(err, 'Failed to refresh comments'));
    }
  }, [contentTypeId, contentTypeValue]);

  /* ── Create a comment / reply ──────────────────────────────────────────── */
  const addComment = useCallback(async ({ contents, parentCommentId = 0, commentImageUrl, linkUrl }) => {
    setActionError(null);
    try {
      await commentsApi.createComment({
        contentTypeId,
        contentTypeValue,
        contents,
        parentCommentId,
        commentImageUrl,
        linkUrl,
      });
      // Re-fetch the page so the new comment appears with the server-side
      // values (id, time, replyCount on the parent, etc.).
      await refresh();
      return true;
    } catch (err) {
      setActionError(extractApiError(err, 'Failed to post comment'));
      return false;
    }
  }, [contentTypeId, contentTypeValue, refresh]);

  /* ── Edit own comment ──────────────────────────────────────────────────── */
  const editComment = useCallback(async (commentId, { contents, commentImageUrl, linkUrl } = {}) => {
    setActionError(null);
    try {
      await commentsApi.updateComment(commentId, { contents, commentImageUrl, linkUrl });
      // Optimistic update — patch the local row so the textarea closes
      // immediately. The next refresh() call will reconcile.
      setComments((prev) => prev.map((c) => (
        c.id === commentId
          ? { ...c, text: contents ?? c.text, imageUrl: commentImageUrl ?? c.imageUrl, linkUrl: linkUrl ?? c.linkUrl }
          : c
      )));
      return true;
    } catch (err) {
      setActionError(extractApiError(err, 'Failed to update comment'));
      return false;
    }
  }, []);

  /* ── Delete a comment ──────────────────────────────────────────────────── */
  const removeComment = useCallback(async (commentId) => {
    setActionError(null);
    try {
      await commentsApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotalItems((n) => Math.max(0, n - 1));
      return true;
    } catch (err) {
      setActionError(extractApiError(err, 'Failed to delete comment'));
      return false;
    }
  }, []);

  /* ── Like / dislike a comment (optimistic) ─────────────────────────────── */
  const toggleLike = useCallback(async (commentId, like = true) => {
    setActionError(null);
    // Optimistic increment
    setComments((prev) => prev.map((c) => (
      c.id === commentId
        ? {
            ...c,
            likes:    like ? c.likes + 1    : c.likes,
            dislikes: like ? c.dislikes     : c.dislikes + 1,
          }
        : c
    )));
    try {
      await commentsApi.likeComment({ commentId, like });
      return true;
    } catch (err) {
      // Roll back
      setComments((prev) => prev.map((c) => (
        c.id === commentId
          ? {
              ...c,
              likes:    like ? Math.max(0, c.likes - 1)    : c.likes,
              dislikes: like ? c.dislikes                  : Math.max(0, c.dislikes - 1),
            }
          : c
      )));
      setActionError(extractApiError(err, 'Failed to record reaction'));
      return false;
    }
  }, []);

  return {
    comments,
    loading,
    error,
    hasMore,
    loadMore,
    totalItems,
    // mutations
    actionError,
    addComment,
    editComment,
    removeComment,
    toggleLike,
    refresh,
  };
}
