import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { GraphQLService } from './graphql.service';
import { environment } from '../../environments/environment';
import { LinkPreview, PostInput, PostThread, TimelineFilter, TimelinePost } from '../models/timeline.models';

const LINK_PREVIEW_FIELDS = `url title description imageUrl domain`;

const POST_FIELDS = `
  id
  replyToId
  replyToAuthorName
  author { id name avatarFilename }
  body
  imageFilenames
  linkPreview { ${LINK_PREVIEW_FIELDS} }
  createdAt
  editedAt
  replyCount
  likeCount
  likedByMe
  bookmarkedByMe
  canEdit
  canDelete
`;

@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  private graphql = inject(GraphQLService);
  private http = inject(HttpClient);
  private imageUploadUrl = `${environment.apiBaseUrl}/api/post-images`;

  // ALL / MINE は返信を除いた新しい順、BOOKMARKED は返信も含めブックマークした順
  getTimeline(filter: TimelineFilter): Observable<TimelinePost[]> {
    const query = `query GetTimeline($filter: TimelineFilter) { timelinePosts(filter: $filter) { ${POST_FIELDS} } }`;
    return this.graphql.query<{ timelinePosts: TimelinePost[] }>(query, { filter }).pipe(
      map((res) => res.timelinePosts)
    );
  }

  // 返信のIDを渡したときは、その返信が付いているスレッドが返る
  getThread(postId: string | number): Observable<PostThread> {
    const query = `query GetPostThread($postId: ID!) { postThread(postId: $postId) { post { ${POST_FIELDS} } replies { ${POST_FIELDS} } } }`;
    return this.graphql.query<{ postThread: PostThread }>(query, { postId }).pipe(
      map((res) => res.postThread)
    );
  }

  // 投稿欄で入力中に出すプレビュー(取得できないときは null)
  previewUrl(url: string): Observable<LinkPreview | null> {
    const query = `query PreviewUrl($url: String!) { previewUrl(url: $url) { ${LINK_PREVIEW_FIELDS} } }`;
    return this.graphql.query<{ previewUrl: LinkPreview | null }>(query, { url }).pipe(
      map((res) => res.previewUrl)
    );
  }

  create(input: PostInput, replyToId?: string | number | null): Observable<TimelinePost> {
    const mutation = `mutation CreatePost($input: PostInput!, $replyToId: ID) { createPost(input: $input, replyToId: $replyToId) { ${POST_FIELDS} } }`;
    return this.graphql.mutation<{ createPost: TimelinePost }>(mutation, { input, replyToId: replyToId ?? null }).pipe(
      map((res) => res.createPost)
    );
  }

  update(id: string | number, input: PostInput): Observable<TimelinePost> {
    const mutation = `mutation UpdatePost($id: ID!, $input: PostInput!) { updatePost(id: $id, input: $input) { ${POST_FIELDS} } }`;
    return this.graphql.mutation<{ updatePost: TimelinePost }>(mutation, { id, input }).pipe(
      map((res) => res.updatePost)
    );
  }

  toggleLike(id: string | number): Observable<TimelinePost> {
    const mutation = `mutation TogglePostLike($id: ID!) { togglePostLike(id: $id) { ${POST_FIELDS} } }`;
    return this.graphql.mutation<{ togglePostLike: TimelinePost }>(mutation, { id }).pipe(
      map((res) => res.togglePostLike)
    );
  }

  toggleBookmark(id: string | number): Observable<TimelinePost> {
    const mutation = `mutation TogglePostBookmark($id: ID!) { togglePostBookmark(id: $id) { ${POST_FIELDS} } }`;
    return this.graphql.mutation<{ togglePostBookmark: TimelinePost }>(mutation, { id }).pipe(
      map((res) => res.togglePostBookmark)
    );
  }

  // 返信が付いた投稿を消すと、返信も一緒に消える
  delete(id: string | number): Observable<boolean> {
    const mutation = `mutation DeletePost($id: ID!) { deletePost(id: $id) }`;
    return this.graphql.mutation<{ deletePost: boolean }>(mutation, { id }).pipe(
      map((res) => res.deletePost)
    );
  }

  // 画像は<img>でプレーン参照する都合上、Q&Aの画像と同じくREST(multipart)でアップロードし、
  // 返ってきたfilenameをPostInput.imageFilenamesに詰めて投稿する
  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<{ filename: string }>(this.imageUploadUrl, formData).pipe(
      map((res) => res.filename)
    );
  }
}
