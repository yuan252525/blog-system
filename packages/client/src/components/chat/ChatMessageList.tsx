import { useRef, useEffect, useState } from 'react';
import { FileText, Download, ThumbsUp, PartyPopper, Copy, RotateCw, Check } from 'lucide-react';
import type { ChatMessage } from '../../api/chat';
import { ImageViewer } from './ImageViewer';
import { VoiceMessage } from './VoiceMessage';

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  typingUsers: Map<string, { userId: string; username: string }>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onReact: (messageId: string, type: 'LIKE' | 'CHEER') => void;
  onReask: (content: string) => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ChatMessageList({
  messages,
  currentUserId,
  typingUsers,
  messagesEndRef,
  onLoadMore,
  hasMore,
  loadingMore,
  onReact,
  onReask,
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 触发加载更多前记录的滚动高度，用于前插后还原锚点
  const prevScrollHeightRef = useRef(0);
  // 跟踪消息数量与首尾 id，区分「初始加载 / 新消息追加 / 加载更多前插」
  const prevLenRef = useRef(0);
  const prevFirstIdRef = useRef<string | undefined>(undefined);
  const prevLastIdRef = useRef<string | undefined>(undefined);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1200);
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || loadingMore) return;

    if (el.scrollTop === 0 && hasMore) {
      prevScrollHeightRef.current = el.scrollHeight;
      onLoadMore();
    }
  };

  // 统一滚动管理：初始/新消息滚到底部，加载更多保持锚点（不滚到底部）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const len = messages.length;

    // 消息被清空（切换房间/离开）时重置状态，下次加载视为初始加载
    if (len === 0) {
      prevLenRef.current = 0;
      prevFirstIdRef.current = undefined;
      prevLastIdRef.current = undefined;
      prevScrollHeightRef.current = 0;
      return;
    }

    // 首次加载（或切换房间后的首屏）：直接定位到底部
    if (prevLenRef.current === 0) {
      el.scrollTop = el.scrollHeight;
      prevLenRef.current = len;
      prevFirstIdRef.current = messages[0]?.id;
      prevLastIdRef.current = messages[len - 1]?.id;
      return;
    }

    const firstId = messages[0]?.id;
    const lastId = messages[len - 1]?.id;
    const prepended = prevFirstIdRef.current !== undefined && firstId !== prevFirstIdRef.current;
    const appended = prevLastIdRef.current !== undefined && lastId !== prevLastIdRef.current;

    if (prepended && !appended) {
      // 加载更多：锚定到新载入的第一条，保持视口位置不变（不滚动到底部）
      if (prevScrollHeightRef.current) {
        const addedHeight = el.scrollHeight - prevScrollHeightRef.current;
        el.scrollTop = addedHeight;
        prevScrollHeightRef.current = 0;
      }
    } else if (appended) {
      // 新消息：平滑滚动到底部
      el.scrollTop = el.scrollHeight;
    }

    prevLenRef.current = len;
    prevFirstIdRef.current = firstId;
    prevLastIdRef.current = lastId;
  }, [messages]);

  // 渲染消息内容（处理 @ 提及高亮）
  const renderContent = (msg: ChatMessage, isMe: boolean) => {
    if (msg.type === 'SYSTEM') {
      return <span className="text-neutral-400 italic">{msg.content}</span>;
    }

    // 检查是否有 @ 提及，高亮显示
    if (msg.mentions && msg.mentions.length > 0) {
      const parts = [];
      let remaining = msg.content;
      const mentionPatterns = msg.mentions.map((m) => `@${m.user.username}`);

      // 简单替换：找到所有 @username 并高亮
      const regex = new RegExp(
        `(${mentionPatterns.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
        'g',
      );
      const matches = msg.content.match(regex);

      if (matches) {
        let lastIdx = 0;
        matches.forEach((match) => {
          const idx = remaining.indexOf(match, lastIdx);
          if (idx > lastIdx) {
            parts.push(remaining.slice(lastIdx, idx));
          }
          const isMentionedCurrentUser = msg.mentions?.some(
            (m) => `@${m.user.username}` === match && m.user.id === currentUserId,
          );
          parts.push(
            <span
              key={`${msg.id}-${match}-${idx}`}
              className={`font-semibold px-0.5 rounded ${
                isMe
                  ? isMentionedCurrentUser
                    ? 'bg-white/30 text-white'
                    : 'text-white/80 bg-white/15'
                  : isMentionedCurrentUser
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-brand-600'
              }`}
            >
              {match}
            </span>,
          );
          lastIdx = idx + match.length;
        });
        if (lastIdx < remaining.length) {
          parts.push(remaining.slice(lastIdx));
        }
        return <>{parts}</>;
      }
    }

    return <span className="whitespace-pre-wrap break-words">{msg.content}</span>;
  };

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4"
      >
      {/* Load more indicator */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs text-brand-600 hover:text-brand-700 disabled:text-neutral-300 cursor-pointer"
          >
            {loadingMore ? 'Loading...' : 'Load earlier messages'}
          </button>
        </div>
      )}

      {messages.map((msg, idx) => {
        const isMe = msg.userId === currentUserId;
        const reactions = msg.reactions ?? [];
        const likeCount = reactions.filter((r) => r.type === 'LIKE').length;
        const cheerCount = reactions.filter((r) => r.type === 'CHEER').length;
        const myLike = reactions.some((r) => r.type === 'LIKE' && r.userId === currentUserId);
        const myCheer = reactions.some((r) => r.type === 'CHEER' && r.userId === currentUserId);
        const showDate =
          idx === 0 ||
          new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();

        return (
          <div key={msg.id} className="group relative">
            {showDate && (
              <div className="flex justify-center mb-4">
                <span className="text-xs text-neutral-400 bg-neutral-50 px-3 py-1 rounded-full">
                  {formatDate(msg.createdAt)}
                </span>
              </div>
            )}

            <div className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              {!isMe && (
                <div className="shrink-0 mt-0.5">
                  <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-500 overflow-hidden">
                    {msg.user.avatar ? (
                      <img src={msg.user.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      msg.user.username[0]?.toUpperCase()
                    )}
                  </div>
                </div>
              )}

              <div className={`max-w-[75%] relative ${isMe ? 'items-end' : ''}`}>
                {/* 操作栏：点赞 / 点彩 / 复制 / 重新问答（hover 显示，系统消息不显示） */}
                {msg.type !== 'SYSTEM' && (
                  <div
                    className={`absolute z-10 -top-3 ${isMe ? 'right-0' : 'left-0'} flex items-center gap-0.5 rounded-full bg-white shadow-md border border-neutral-200 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}
                  >
                    <button
                      type="button"
                      onClick={() => onReact(msg.id, 'LIKE')}
                      title="点赞"
                      className={`p-1 rounded-full hover:bg-neutral-100 transition-colors ${myLike ? 'text-brand-600' : 'text-neutral-400'}`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReact(msg.id, 'CHEER')}
                      title="点彩"
                      className={`p-1 rounded-full hover:bg-neutral-100 transition-colors ${myCheer ? 'text-amber-500' : 'text-neutral-400'}`}
                    >
                      <PartyPopper className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(msg.id, msg.content)}
                      title="复制"
                      className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    {msg.type === 'TEXT' && (
                      <button
                        type="button"
                        onClick={() => onReask(msg.content)}
                        title="重新问答"
                        className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Username & time */}
                <div className={`flex items-center gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {!isMe && <span className="text-xs font-medium text-neutral-500">{msg.user.username}</span>}
                  <span className="text-[10px] text-neutral-400">{formatTime(msg.createdAt)}</span>
                </div>

                {/* Message bubble */}
                {msg.type === 'IMAGE' ? (
                  <div>
                    <div className={`rounded-2xl overflow-hidden max-w-xs ${isMe ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                      <img
                        src={msg.fileUrl || msg.content}
                        alt={msg.fileName || 'Image'}
                        className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setViewerSrc(msg.fileUrl || msg.content)}
                        loading="lazy"
                      />
                    </div>
                    {/* 图片下方显示文字（若有实际文本内容，而非占位符） */}
                    {msg.content && msg.content !== '📷 Image' && (
                      <div
                        className={`mt-1.5 px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-xs ${
                          isMe
                            ? 'bg-brand-600 text-white rounded-br-md ml-auto'
                            : 'bg-neutral-100 text-neutral-800 rounded-bl-md'
                        }`}
                      >
                        {renderContent(msg, isMe)}
                      </div>
                    )}
                  </div>
                ) : msg.mimeType?.startsWith('audio/') ? (
                  <div>
                    <VoiceMessage src={msg.fileUrl || msg.content} isMe={isMe} />
                    {/* 语音转写文本作为说明展示 */}
                    {msg.content && (
                      <div
                        className={`mt-1.5 px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-xs ${
                          isMe
                            ? 'bg-brand-600 text-white rounded-br-md ml-auto'
                            : 'bg-neutral-100 text-neutral-800 rounded-bl-md'
                        }`}
                      >
                        {renderContent(msg, isMe)}
                      </div>
                    )}
                  </div>
                ) : msg.type === 'FILE' ? (
                  <div>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-colors ${
                        isMe
                          ? 'bg-brand-600 text-white rounded-br-md'
                          : 'bg-neutral-100 text-neutral-700 rounded-bl-md'
                      }`}
                      onClick={() => msg.fileUrl && window.open(msg.fileUrl, '_blank')}
                      title="Click to download"
                    >
                      <FileText className={`h-8 w-8 ${isMe ? 'text-white/70' : 'text-neutral-400'}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isMe ? 'text-white' : 'text-neutral-800'}`}>
                          {msg.fileName || 'File'}
                        </p>
                        <p className={`text-xs ${isMe ? 'text-white/60' : 'text-neutral-400'}`}>
                          {msg.fileSize ? `${(Number(msg.fileSize) / 1024 / 1024).toFixed(1)} MB` : 'Click to download'}
                        </p>
                      </div>
                      <Download className={`h-5 w-5 shrink-0 ${isMe ? 'text-white/70' : 'text-neutral-400'}`} />
                    </div>
                    {/* 文件下方显示文字（若有实际文本内容，而非占位符） */}
                    {msg.content && !msg.content.startsWith('📎 ') && (
                      <div
                        className={`mt-1.5 px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-xs ${
                          isMe
                            ? 'bg-brand-600 text-white rounded-br-md ml-auto'
                            : 'bg-neutral-100 text-neutral-800 rounded-bl-md'
                        }`}
                      >
                        {renderContent(msg, isMe)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.type === 'SYSTEM'
                        ? 'bg-neutral-50 text-neutral-400 rounded-md text-xs'
                        : isMe
                          ? 'bg-brand-600 text-white rounded-br-md'
                          : 'bg-neutral-100 text-neutral-800 rounded-bl-md'
                    }`}
                  >
                    {renderContent(msg, isMe)}
                  </div>
                )}
                {(likeCount > 0 || cheerCount > 0) && (
                  <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {likeCount > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] ${
                          myLike ? 'bg-brand-50 text-brand-600' : 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        👍 {likeCount}
                      </span>
                    )}
                    {cheerCount > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] ${
                          myCheer ? 'bg-amber-50 text-amber-600' : 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        🎉 {cheerCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Typing indicators */}
      {typingUsers.size > 0 && (
        <div className="flex items-center gap-2 pl-10">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-neutral-400">
            {Array.from(typingUsers.values())
              .map((u) => u.username)
              .join(', ')}{' '}
            typing...
          </span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>

    {/* Image viewer */}
    {viewerSrc && (
      <ImageViewer
        src={viewerSrc}
        onClose={() => setViewerSrc(null)}
      />
    )}
  </>
  );
}
