import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Send, Trash2, Reply, ThumbsUp } from 'lucide-react';
import { commentsApi, type Comment } from '../api/comments';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n/context';
import { ConfirmDialog } from './ConfirmDialog';
import { Link } from 'react-router-dom';

interface CommentSectionProps {
  postId: string;
}

/** Optimistically toggle like state on a comment (or reply) by id */
function updateCommentLike(comment: Comment, targetId: string): Comment {
  if (comment.id === targetId) {
    const wasLiked = comment.isLiked ?? false;
    const currentCount = comment._count?.likes ?? 0;
    return {
      ...comment,
      isLiked: !wasLiked,
      _count: { ...comment._count, likes: wasLiked ? currentCount - 1 : currentCount + 1 },
    };
  }
  if (comment.replies) {
    return {
      ...comment,
      replies: comment.replies.map((r) => updateCommentLike(r, targetId)),
    };
  }
  return comment;
}

function CommentItem({
  comment,
  postId,
  onReply,
  onDelete,
  onLike,
  isReply,
}: {
  comment: Comment;
  postId: string;
  onReply: (id: string, username: string) => void;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  isReply?: boolean;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isOwner = user?.id === comment.user.id;
  const likeCount = comment._count?.likes ?? 0;
  const isLiked = comment.isLiked ?? false;

  return (
    <div id={`comment-${comment.id}`} className={`${isReply ? 'ml-10 mt-3' : 'mt-4'} scroll-mt-24`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          {comment.user.avatar ? (
            <img
              src={comment.user.avatar}
              alt={comment.user.username}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
              {comment.user.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900">
              {comment.user.username}
            </span>
            <span className="text-xs text-neutral-400">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-xs transition-colors cursor-pointer ${
                isLiked
                  ? 'text-brand-600 font-medium'
                  : 'text-neutral-400 hover:text-brand-600'
              }`}
              title={isLiked ? t('comments.unlike') : t('comments.like')}
            >
              <ThumbsUp className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            {(
              <button
                onClick={() => onReply(comment.id, comment.user.username)}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-brand-600 transition-colors cursor-pointer"
              >
                <Reply className="h-3 w-3" />
                {t('comments.reply')}
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          postId={postId}
          onReply={onReply}
          onDelete={onDelete}
          onLike={onLike}
          isReply
        />
      ))}
    </div>
  );
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 点击回复后自动聚焦输入框
  useEffect(() => {
    if (replyTo) {
      textareaRef.current?.focus();
    }
  }, [replyTo]);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await commentsApi.getByPost(postId);
      setComments(data);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async () => {
    if (!content.trim() || !isAuthenticated || submitting) return;
    setSubmitting(true);
    try {
      await commentsApi.create({
        content: content.trim(),
        postId,
        parentId: replyTo?.id,
      });
      setContent('');
      setReplyTo(null);
      await loadComments();
    } catch {
      // silent fail
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await commentsApi.delete(commentId);
      setDeleteTarget(null);
      await loadComments();
    } catch {
      // silent fail
    }
  };

  const handleLike = async (commentId: string) => {
    if (!isAuthenticated) return;
    try {
      await commentsApi.like(commentId);
      // Optimistically update local state
      setComments((prev) =>
        prev.map((c) => updateCommentLike(c, commentId))
      );
    } catch {
      // silent fail
    }
  };

  return (
    <section className="mt-12 border-t border-neutral-100 pt-10">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-5 w-5 text-neutral-700" />
        <h2 className="text-xl font-bold text-neutral-900">
          {t('comments.title')} ({comments.length})
        </h2>
      </div>

      {/* Comment input */}
      {isAuthenticated ? (
        <div className="flex gap-3 mb-8">
          <div className="flex-shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="flex-1">
            {replyTo && (
              <div className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
                <span>
                  {t('comments.reply')} @{replyTo.username}
                </span>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-brand-600 hover:text-brand-700 cursor-pointer"
                >
                  {t('comments.cancelReply')}
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('comments.leaveComment')}
              rows={3}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none transition-colors"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                {replyTo
                  ? `↩ ${t('comments.reply')} @${replyTo.username}`
                  : `${t('comments.title')}`}
              </span>
              <div className="flex items-center gap-2">
                {replyTo && (
                  <button
                    onClick={() => setReplyTo(null)}
                    className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer"
                  >
                    {t('comments.cancelReply')}
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? '...' : t('comments.postComment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-4 text-center">
          <p className="text-sm text-neutral-500">
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
              {t('comments.loginToComment')}
            </Link>
          </p>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-8 text-neutral-400 text-sm">{t('common.loading')}</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-neutral-400 text-sm">{t('comments.noComments')}</div>
      ) : (
        <div className="divide-y divide-neutral-50">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onReply={(id, username) => setReplyTo({ id, username })}
              onDelete={(id) => setDeleteTarget(id)}
              onLike={handleLike}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={t('comments.deleteConfirm')}
        description=""
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </section>
  );
}
