import apiClient from './client';
import type { Tag, PaginatedResponse, Post } from '../types';

interface TagWithCount extends Tag {
  postCount: number;
}

interface TagPostsResponse extends PaginatedResponse<Post> {
  tag: Tag;
}

export const tagsApi = {
  getAll: () => apiClient.get<unknown, TagWithCount[]>('/tags'),

  getPosts: (slug: string, page = 1, limit = 10) =>
    apiClient.get<unknown, TagPostsResponse>(`/tags/${slug}/posts`, {
      params: { page, limit },
    }),
};
