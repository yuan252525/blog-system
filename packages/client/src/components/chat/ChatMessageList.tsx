import { useRef, useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import type { ChatMessage } from '../../api/chat';
import { ImageViewer } from './ImageViewer';

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  typingUsers: Map<string, { userId: string; username: string }>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
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
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || loadingMore) return;

    if (el.scrollTop === 0 && hasMore) {
      prevScrollHeightRef.current = el.scrollHeight;
      onLoadMore();
    }
  };

  // 加载更多后保持滚动位置
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !prevScrollHeightRef.current) return;

    const newScrollHeight = el.scrollHeight;
    el.scrollTop = newScrollHeight - prevScrollHeightRef.current;
    prevScrollHeightRef.current = 0;
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
        const showDate =
          idx === 0 ||
          new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();

        return (
          <div key={msg.id}>
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

              <div className={`max-w-[75%] ${isMe ? 'items-end' : ''}`}>
                {/* Username & time */}
                <div className={`flex items-center gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {!isMe && <span className="text-xs font-medium text-neutral-500">{msg.user.username}</span>}
                  <span className="text-[10px] text-neutral-400">{formatTime(msg.createdAt)}</span>
                </div>

                {/* Message bubble */}
                {msg.type === 'IMAGE' ? (
                  <div className={`rounded-2xl overflow-hidden max-w-xs ${isMe ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                    <img
                      src={msg.fileUrl || msg.content}
                      alt={msg.fileName || 'Image'}
                      className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setViewerSrc(msg.fileUrl || msg.content)}
                      loading="lazy"
                    />
                  </div>
                ) : msg.type === 'FILE' ? (
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
