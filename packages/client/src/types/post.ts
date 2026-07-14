export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  coverImage: string | null;
  pdfUrl: string | null;
  status: PostStatus;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    avatar: string | null;
    bio?: string | null;
  };
  tags: Tag[];
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count?: {
    comments: number;
    likes: number;
  };
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  summary?: string;
  coverImage?: string;
  pdfUrl?: string;
  status?: PostStatus;
  tags?: string[];
  categoryId?: string;
}

export interface ArchivePost {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
  publishedAt: string | null;
}

export interface ArchiveMonth {
  year: number;
  month: number;
  yearMonth: string;
  count: number;
  posts: ArchivePost[];
}

export interface ArchiveGroup {
  year: number;
  months: ArchiveMonth[];
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
