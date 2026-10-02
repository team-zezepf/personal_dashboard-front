export type TimelineFilter = 'ALL' | 'MINE' | 'BOOKMARKED';

export interface PostAuthor {
  id: string | number;
  name: string;
  avatarFilename?: string | null;
}

// 本文中の最初のURLのOGP情報
export interface LinkPreview {
  url: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  domain: string;
}

export interface TimelinePost {
  id: string | number;
  // 返信のときだけ、返信先の投稿のIDと投稿者名
  replyToId?: string | number | null;
  replyToAuthorName?: string | null;
  author: PostAuthor;
  body: string;
  imageFilenames: string[];
  linkPreview?: LinkPreview | null;
  createdAt: string;
  editedAt?: string | null;
  replyCount: number;
  likeCount: number;
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface PostThread {
  post: TimelinePost;
  replies: TimelinePost[];
}

export interface PostInput {
  body: string;
  imageFilenames: string[];
}
