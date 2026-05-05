import type { Forum, ForumTopic } from '../../../services/api';
import type { MyForumDto, MyPostTopicDto } from '../types';

const toNum = (v: number | string | null | undefined): number => {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

// Build a Forum object from MyForumDto for navigation. Destination screen
// (ForumThreadScreen) refetches forumDetail via useForumTopics and overlays
// the live data — this stub just feeds the initial header render.
export function forumFromMyForumDto(f: MyForumDto): Forum {
  return {
    id: toNum(f.forumId),
    name: f.forumName,
    description: f.forumDescription ?? '',
    categoryId: toNum(f.categoryId),
    slug: '',
    topicCount: toNum(f.topicsCount),
    postCount: toNum(f.postsCount),
    followCount: toNum(f.followCount),
    rank: toNum(f.currentRank),
    prevRank: toNum(f.previousRank),
    rankDisplay: '',
    bg: '#3558F0',
    emoji: '💬',
    bannerUrl: f.bannerUrl,
    thumbnailUrl: f.thumbnailUrl,
    locked: false,
    hot: false,
    // No moderation rights inferred from the profile-side DTO.
    priorityPosts: 0,
    editPosts: 0,
    deletePosts: 0,
  };
}

// Build a ForumTopic from a MyPostTopicDto (Posts / Watching tabs). The
// destination (TopicDetailScreen) refetches the post list by topic.id, so
// missing fields like flairs, tags, and poll resolve once posts arrive.
export function topicFromMyPostDto(t: MyPostTopicDto): ForumTopic {
  return {
    id: toNum(t.topicId),
    forumId: toNum(t.forumId),
    forumName: t.forumName ?? '',
    forumThumbnail: null,
    title: t.subject,
    description: t.topicDesc ?? '',
    poster: t.startThreadUserName ?? '',
    posterId: 0,
    lastBy: t.lastThreadUserName ?? '',
    lastById: 0,
    time: t.startThreadDate,
    lastTime: t.lastThreadDate,
    replies: toNum(t.replyCount),
    views: toNum(t.viewCount),
    likes: toNum(t.likeCount),
    userCount: 0,
    locked: t.locked,
    pinned: false,
    flairId: 0,
    topicImage: t.topicImage,
    tags: [],
    linkTypeValue: t.linkTypeValue ?? '',
    poll: null,
  };
}
