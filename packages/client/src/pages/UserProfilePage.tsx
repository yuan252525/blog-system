import { useState, useEffect, useCallback } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../api/users';
import { postsApi } from '../api/posts';
import { followApi } from '../api/follow';
import { PostCard } from '../components/PostCard';
import { Pagination } from '../components/Pagination';
import { FollowButton } from '../components/FollowButton';
import { useTranslation } from '../i18n/context';
import { Calendar, FileText, Trophy } from 'lucide-react';
import type { PublicUserProfile, FollowStatus, FollowListResponse, UserBasic, Post } from '../types';

type Tab = 'posts' | 'followers' | 'following';

export function UserProfilePage() {
  const { username = '' } = useParams<{ username: string }>();
  const { user: me } = useAuth();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [tab, setTab] = useState<Tab>('posts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotal, setPostsTotal] = useState(1);
  const [followers, setFollowers] = useState<UserBasic[]>([]);
  const [following, setFollowing] = useState<UserBasic[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // 查看自己则跳转到个人中心
  if (me && me.username === username) {
    return <Navigate to="/profile" replace />;
  }

  const loadProfile = useCallback(() => {
    setLoading(true);
    setError(null);
    usersApi
      .getByUsername(username)
      .then((p) => {
        setProfile(p);
        return followApi.status(username);
      })
      .then((s) => setFollowStatus(s))
      .catch(() => setError(t('user.notFound')))
      .finally(() => setLoading(false));
  }, [username, t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadPosts = useCallback(
    (page: number) => {
      if (!profile) return;
      setListLoading(true);
      postsApi
        .getList({ authorId: profile.id, status: 'PUBLISHED', page, limit: 10 })
        .then((res) => {
          setPosts(res.data);
          setPostsTotal(res.meta.totalPages);
          setPostsPage(page);
        })
        .catch(() => {})
        .finally(() => setListLoading(false));
    },
    [profile],
  );

  const loadFollowers = useCallback(
    (page: number) => {
      setListLoading(true);
      followApi
        .followers(username, page, 20)
        .then((res: FollowListResponse) => setFollowers(res.data))
        .catch(() => {})
        .finally(() => setListLoading(false));
    },
    [username],
  );

  const loadFollowing = useCallback(
    (page: number) => {
      setListLoading(true);
      followApi
        .following(username, page, 20)
        .then((res: FollowListResponse) => setFollowing(res.data))
        .catch(() => {})
        .finally(() => setListLoading(false));
    },
    [username],
  );

  useEffect(() => {
    if (!profile) return;
    if (tab === 'posts') loadPosts(postsPage);
    else if (tab === 'followers') loadFollowers(1);
    else if (tab === 'following') loadFollowing(1);
  }, [tab, profile, postsPage, loadPosts, loadFollowers, loadFollowing]);

  const handleFollowToggle = (following: boolean) => {
    setFollowStatus((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: following,
            followerCount: prev.followerCount + (following ? 1 : -1),
          }
        : prev,
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="animate-pulse h-32 rounded-2xl bg-neutral-100" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">{t('user.notFound')}</h1>
      </div>
    );
  }

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(
        navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US',
        { year: 'numeric', month: 'long' },
      )
    : '—';

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      {/* Header */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 mb-8">
        <div className="flex items-start gap-5">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.username}
              className="h-20 w-20 rounded-2xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-600 uppercase flex-shrink-0">
              {profile.username.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">{profile.username}</h1>
                <p className="text-sm text-neutral-500 mt-0.5">{profile.email}</p>
              </div>
              {me && me.username !== profile.username && (
                <FollowButton
                  username={profile.username}
                  isFollowing={followStatus?.isFollowing ?? false}
                  onToggle={handleFollowToggle}
                />
              )}
            </div>
            {profile.bio && <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{profile.bio}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-neutral-500">
              <button onClick={() => setTab('posts')} className="flex items-center gap-1.5 hover:text-brand-600">
                <FileText className="h-4 w-4 text-neutral-400" />
                <strong className="text-neutral-700">{profile._count.posts}</strong> {t('profile.totalPosts')}
              </button>
              <button onClick={() => setTab('followers')} className="flex items-center gap-1.5 hover:text-brand-600">
                <strong className="text-neutral-700">{followStatus?.followerCount ?? 0}</strong> {t('follow.followers')}
              </button>
              <button onClick={() => setTab('following')} className="flex items-center gap-1.5 hover:text-brand-600">
                <strong className="text-neutral-700">{followStatus?.followingCount ?? 0}</strong> {t('follow.followingList')}
              </button>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-neutral-400" />
                {t('profile.memberSince')}: {memberSince}
              </span>
              <Link to="/leaderboard" className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700">
                <Trophy className="h-4 w-4" /> Lv.{profile.level}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200 mb-6">
        {(['posts', 'followers', 'following'] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === tb
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tb === 'posts'
              ? t('profile.totalPosts')
              : tb === 'followers'
                ? t('follow.followers')
                : t('follow.followingList')}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'posts' &&
        (listLoading ? (
          <div className="animate-pulse space-y-5">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl border border-neutral-100 bg-white" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-10 text-center text-neutral-400">{t('follow.noPosts')}</div>
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
            <div className="mt-8">
              <Pagination page={postsPage} totalPages={postsTotal} onPageChange={loadPosts} />
            </div>
          </>
        ))}

      {tab === 'followers' && <UserList list={followers} loading={listLoading} emptyText={t('follow.noFollowers')} />}
      {tab === 'following' && <UserList list={following} loading={listLoading} emptyText={t('follow.noFollowing')} />}
    </div>
  );
}

function UserList({ list, loading, emptyText }: { list: UserBasic[]; loading: boolean; emptyText: string }) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl border border-neutral-100 bg-white" />
        ))}
      </div>
    );
  }
  if (list.length === 0) {
    return <div className="py-10 text-center text-neutral-400">{emptyText}</div>;
  }
  return (
    <div className="space-y-3">
      {list.map((u) => (
        <Link
          key={u.id}
          to={`/user/${u.username}`}
          className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4 hover:border-neutral-200 hover:bg-neutral-50 transition-colors"
        >
          {u.avatar ? (
            <img src={u.avatar} alt={u.username} className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 uppercase">
              {u.username.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-neutral-900 truncate">{u.username}</p>
            {u.bio && <p className="text-sm text-neutral-500 truncate">{u.bio}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
