import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Smile, Paperclip, Image, X, AtSign, Mic, Square, Type, Loader2 } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { MentionSuggestions } from './MentionSuggestions';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { uploadsApi } from '../../api/uploads';

interface ChatInputProps {
  onSend: (content: string, type: 'TEXT' | 'IMAGE' | 'FILE', attachments?: {
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  }, mentions?: string[]) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
}

interface AttachmentPreview {
  name: string;
  type: 'image' | 'file';
  dataUrl?: string;
  file?: File;
}

export function ChatInput({ onSend, onTyping, onStopTyping, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<Map<string, string>>(new Map());
  const [mentionState, setMentionState] = useState<{ active: boolean; query: string; position: { top: number; left: number } }>({
    active: false,
    query: '',
    position: { top: 0, left: 0 },
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voice = useVoiceRecorder();
  const [voiceUploading, setVoiceUploading] = useState(false);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setMessage(value);

      // 检测 @ 提及
      const cursorPos = e.target.selectionStart ?? 0;
      const textBeforeCursor = value.slice(0, cursorPos);
      const atMatch = textBeforeCursor.match(/@([^\s@]*)$/u);

      if (atMatch) {
        const rect = e.target.getBoundingClientRect();
        setMentionState({
          active: true,
          query: atMatch[1],
          position: { top: rect.top - 10, left: 16 + (atMatch.index ?? 0) * 8 },
        });
      } else {
        setMentionState((prev) => (prev.active ? { ...prev, active: false } : prev));
      }

      // 输入状态
      onTyping();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(onStopTyping, 2000);
    },
    [onTyping, onStopTyping],
  );

  // 提取消息中 @username 对应的 userId
  const extractMentionIds = useCallback(
    (text: string): string[] => {
      const ids: string[] = [];
      const regex = /@([^\s@]+)/gu;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const userId = mentionedUsers.get(match[1]);
        if (userId) ids.push(userId);
      }
      return ids;
    },
    [mentionedUsers],
  );

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed && attachments.length === 0) return;

    const mentionIds = extractMentionIds(message);

    // 处理附件
    if (attachments.length > 0) {
      attachments.forEach((att) => {
        if (att.type === 'image' && att.dataUrl) {
          onSend(trimmed || '📷 Image', 'IMAGE', {
            fileUrl: att.dataUrl,
            fileName: att.name,
            fileSize: att.file?.size,
            mimeType: att.file?.type,
          }, mentionIds.length > 0 ? mentionIds : undefined);
        } else if (att.dataUrl) {
          onSend(trimmed || `📎 ${att.name}`, 'FILE', {
            fileUrl: att.dataUrl,
            fileName: att.name,
            fileSize: att.file?.size,
            mimeType: att.file?.type,
          }, mentionIds.length > 0 ? mentionIds : undefined);
        }
      });
      setAttachments([]);
    } else if (trimmed) {
      onSend(trimmed, 'TEXT', undefined, mentionIds.length > 0 ? mentionIds : undefined);
    }

    setMessage('');
    setShowEmoji(false);
    setMentionedUsers(new Map());

    // 调整 textarea 高度
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [message, attachments, onSend, extractMentionIds]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (mentionState.active) return; // 让 MentionSuggestions 处理键盘事件
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, mentionState.active],
  );

  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  }, []);

  const handleMentionSelect = useCallback((user: { id: string; username: string }) => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = message.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const newText = message.slice(0, atIndex) + `@${user.username} ` + message.slice(cursorPos);

    setMessage(newText);
    setMentionedUsers((prev) => {
      const next = new Map(prev);
      next.set(user.username, user.id);
      return next;
    });
    setMentionState({ active: false, query: '', position: { top: 0, left: 0 } });
    textarea.focus();
  }, [message]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: isImage ? 'image' : 'file',
            dataUrl: reader.result as string,
            file,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ==================== 语音录制 ====================
  const handleStartRecording = useCallback(() => {
    if (!voice.micSupported) return;
    voice.start();
  }, [voice]);

  const handleSendVoice = useCallback(async () => {
    const result = await voice.stop();
    if (!result) return;

    setVoiceUploading(true);
    try {
      const ext = result.mimeType.includes('/')
        ? result.mimeType.split('/')[1].replace(/[^a-z0-9]/gi, '')
        : 'webm';
      const filename = `voice-${Date.now()}.${ext}`;
      const uploaded = await uploadsApi.uploadDirect(result.blob, filename);
      onSend(result.transcript || '', 'FILE', {
        fileUrl: uploaded.url,
        fileName: filename,
        fileSize: result.blob.size,
        mimeType: result.mimeType,
      });
    } catch (err) {
      console.error('语音上传失败:', err);
    } finally {
      setVoiceUploading(false);
    }
  }, [voice, onSend]);

  const handleTranscribe = useCallback(async () => {
    const result = await voice.stop();
    if (result && result.transcript) {
      setMessage((prev) => (prev ? `${prev} ` : '') + result.transcript);
      inputRef.current?.focus();
    }
  }, [voice]);

  const handleCancelRecording = useCallback(() => {
    voice.cancel();
  }, [voice]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // 自动调整 textarea 高度
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  return (
    <div className="border-t border-neutral-100 bg-white p-3 md:p-4">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative group">
              {att.type === 'image' ? (
                <div className="h-16 w-16 rounded-lg overflow-hidden border border-neutral-200">
                  <img src={att.dataUrl} alt={att.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-16 w-40 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center gap-2 px-3">
                  <Paperclip className="h-4 w-4 text-neutral-400 shrink-0" />
                  <span className="text-xs text-neutral-600 truncate">{att.name}</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(idx)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-neutral-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {voice.recording ? (
        <div className="flex items-center gap-3 px-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-medium text-red-500 tabular-nums">{formatElapsed(voice.elapsed)}</span>
          <span className="flex-1 text-xs text-neutral-400 truncate">
            {voice.transcript || (voice.speechSupported ? '正在聆听…（实时转写）' : '正在录音…（当前浏览器不支持实时转写）')}
          </span>
          <button
            onClick={handleCancelRecording}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={handleTranscribe}
            disabled={!voice.transcript}
            className="p-2 rounded-lg text-brand-600 hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="转文字发送"
          >
            <Type className="h-4 w-4" />
          </button>
          <button
            onClick={handleSendVoice}
            disabled={voiceUploading}
            className="p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            title="发送语音"
          >
            {voiceUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          {/* Emoji & File buttons */}
          <div className="flex items-center gap-0.5 pb-1">
            <div className="relative">
              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
              {showEmoji && (
                <div className="absolute bottom-full left-0 mb-2 z-50">
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                  <div className="relative z-50">
                    <EmojiPicker onSelect={handleEmojiSelect} />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Attach image/file"
            >
              <Image className="h-5 w-5" />
            </button>

            <button
              onClick={handleStartRecording}
              disabled={!voice.micSupported || voice.recording}
              className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={voice.micSupported ? 'Record voice' : 'Browser does not support voice recording'}
            >
              <Mic className="h-5 w-5" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Input area with mention suggestions */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Shift+Enter for new line, @ to mention)"
              disabled={disabled}
              rows={1}
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-50 focus:bg-white outline-none transition-all disabled:opacity-50"
            />

            {mentionState.active && (
              <MentionSuggestions
                query={mentionState.query}
                onSelect={handleMentionSelect}
                onClose={() => setMentionState({ active: false, query: '', position: { top: 0, left: 0 } })}
                position={mentionState.position}
              />
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || (!message.trim() && attachments.length === 0)}
            className="p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
            title="Send (Enter)"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
