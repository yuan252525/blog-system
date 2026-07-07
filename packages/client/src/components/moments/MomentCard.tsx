import { useState } from 'react';
import { Heart, MessageCircle, Trash2, Send } from 'lucide-react';
import { useTranslation } from '../../i18n/context';
import { Avatar } from '../Avatar';
import { resolveAssetUrl } from '../../utils/url';
import { ImageViewer } from '../chat/ImageViewer';
import type { Moment, MomentComment as MomentCommentType, CommentMomentPayload } from '../../types';

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} 天前`;
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Props {
  moment: Moment;
  currentUserId: string;
  onToggleLike: (moment: Moment) => void;
  onComment: (momentId: string, payload: CommentMomentPayload) => void;
  onDelete: (moment: Moment) => void;
  onDeleteComment: (momentId: string, commentId: string) => void;
}

export function MomentCard({
  moment,
  currentUserId,
  onToggleLike,
  onComment,
  onDelete,
  onDeleteComment,
}: Props) {
  const { t } = useTranslation();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  // 记录加载失败的图片下标，避免显示裂图
  const [imgFailed, setImgFailed] = useState<Record<number, boolean>>({});
  // 当前放大预览的图片地址
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ commentId: string; userId: string; username: string } | null>(
    null,
  );

  const isAuthor = moment.author.id === currentUserId;
  const likeNames = moment.likes.map((l) => l.user.username);

  const submitComment = () => {
    const text = commentText.trim();
    if (!text) return;
    onComment(moment.id, {
      content: text,
      parentId: replyTo?.commentId,
      replyToUserId: replyTo?.userId,
    });
    setCommentText('');
    setReplyTo(null);
    setShowComments(true);
  };

  const renderImages = () => {
    if (moment.images.length === 0) return null;
    const onImgError = (i: number) => setImgFailed((f) => ({ ...f, [i]: true }));
    const onPreview = (url?: string) => {
      if (url) setPreviewSrc(url);
    };
    const placeholder = (i: number) => (
      <div
        className="flex aspect-square w-full cursor-pointer items-center justify-center rounded-md bg-neutral-100 text-xs text-neutral-400"
        onClick={() => onPreview(resolveAssetUrl(moment.images[i]))}
      >
        图片加载失败
      </div>
    );
    if (moment.images.length === 1) {
      const src = resolveAssetUrl(moment.images[0]) ?? '';
      if (imgFailed[0]) return placeholder(0);
      return (
        <img
          src={src}
          alt=""
          className="mt-3 max-h-80 max-w-full cursor-pointer rounded-md object-cover"
          onClick={() => onPreview(src)}
          onError={() => onImgError(0)}
        />
      );
    }
    return (
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {moment.images.map((raw, i) => {
          const src = resolveAssetUrl(raw) ?? '';
          if (imgFailed[i]) return <div key={i}>{placeholder(i)}</div>;
          return (
            <img
              key={i}
              src={src}
              alt=""
              className="aspect-square w-full cursor-pointer rounded-md object-cover transition-transform hover:scale-[1.02]"
              onClick={() => onPreview(src)}
              onError={() => onImgError(i)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      {/* 头部 */}
      <div className="flex items-start gap-3">
        <Avatar user={moment.author} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-neutral-900">{moment.author.username}</span>
            <span className="shrink-0 text-xs text-neutral-400">
              {formatRelativeTime(moment.createdAt)}
            </span>
          </div>
          {moment.content && (
            <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-neutral-800">
              {moment.content}
            </p>
          )}
        </div>
        {isAuthor && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('moments.deleteConfirmMoment'))) onDelete(moment);
            }}
            className="shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-red-500"
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {renderImages()}

      {/* 操作栏 */}
      <div className="mt-3 flex items-center gap-5 border-t border-line pt-2 text-sm">
        <button
          type="button"
          onClick={() => onToggleLike(moment)}
          className={`flex items-center gap-1.5 transition-colors ${
            moment.likedByMe ? 'text-brand-600' : 'text-neutral-500 hover:text-brand-600'
          }`}
        >
          <Heart className="h-4 w-4" fill={moment.likedByMe ? 'currentColor' : 'none'} />
          {moment._count.likes > 0 ? moment._count.likes : t('moments.like')}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-neutral-500 transition-colors hover:text-brand-600"
        >
          <MessageCircle className="h-4 w-4" />
          {moment._count.comments > 0 ? moment._count.comments : t('moments.comment')}
        </button>
      </div>

      {/* 点赞列表 */}
      {moment.likes.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-md bg-neutral-50 px-3 py-2 text-sm">
          <Heart className="h-3.5 w-3.5 shrink-0 text-brand-600" fill="currentColor" />
          <span className="text-neutral-600">{likeNames.join('、')} 觉得很赞</span>
        </div>
      )}

      {/* 评论区 */}
      {showComments && (
        <div className="mt-2 rounded-md bg-neutral-50 px-3 py-2">
          {moment.comments.length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {moment.comments.map((c: MomentCommentType) => {
                const canDelete = c.user.id === currentUserId || isAuthor;
                return (
                  <li key={c.id} className="flex items-start gap-1.5">
                    <span className="font-medium text-brand-600">{c.user.username}</span>
                    {c.replyToUser && (
                      <span className="text-neutral-500">回复 {c.replyToUser.username}</span>
                    )}
                    <span className="flex-1 break-words text-neutral-700">：{c.content}</span>
                    <button
                      type="button"
                      onClick={() => setReplyTo({ commentId: c.id, userId: c.user.id, username: c.user.username })}
                      className="shrink-0 text-xs text-neutral-400 transition-colors hover:text-brand-600"
                    >
                      {t('moments.reply')}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t('moments.deleteConfirmComment')))
                            onDeleteComment(moment.id, c.id);
                        }}
                        className="shrink-0 text-neutral-400 transition-colors hover:text-red-500"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-1 text-sm text-neutral-400">{t('moments.noComments')}</p>
          )}

          {/* 评论输入框 */}
          <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
            {replyTo && (
              <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-600">
                {t('moments.replyingTo', { name: replyTo.username })}
              </span>
            )}
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
              placeholder={replyTo ? t('moments.replyPlaceholder') : t('moments.writeComment')}
              className="flex-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={submitComment}
              disabled={!commentText.trim()}
              className="flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      {previewSrc && (
        <ImageViewer src={previewSrc} alt="" onClose={() => setPreviewSrc(null)} />
      )}
    </div>
  );
}
