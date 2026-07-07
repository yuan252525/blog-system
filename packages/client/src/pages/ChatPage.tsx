import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { ChatRoomList } from '../components/chat/ChatRoomList';
import { ChatMessageList } from '../components/chat/ChatMessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { MessageSquare, Hash, Users, ArrowLeft, UserPlus, X, Check } from 'lucide-react';
import { chatApi } from '../api/chat';

export function ChatPage() {
  const { isAuthenticated } = useAuth();
  const {
    connected,
    user,
    rooms,
    activeRoomId,
    messages,
    onlineUsers,
    typingUsers,
    loadingMessages,
    hasMore,
    messagesEndRef,
    switchRoom,
    handleSendMessage,
    handleTyping,
    handleStopTyping,
    loadMoreMessages,
    createGroupRoom,
    startDirectChat,
    joinGroupRoom,
    leaveRoomAction,
    toggleReaction,
  } = useChat();

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  // 支持 ?room=xxx 查询参数，点击通知时自动跳转到对应聊天室
  const [searchParams] = useSearchParams();
  const lastUrlRoomRef = useRef<string | null>(null);
  useEffect(() => {
    const roomId = searchParams.get('room');
    // 只在 URL 参数变化（且房间已加载）时同步，避免用户手动切换房间后被拉回
    if (roomId && rooms.length > 0 && roomId !== lastUrlRoomRef.current) {
      lastUrlRoomRef.current = roomId;
      switchRoom(roomId);
    }
  }, [searchParams, rooms, switchRoom]);

  // 邀请弹窗状态
  const [showInvite, setShowInvite] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteResults, setInviteResults] = useState<{ id: string; username: string; avatar?: string }[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<{ id: string; username: string }[]>([]);
  const [inviteMemberIds, setInviteMemberIds] = useState<Set<string>>(new Set());

  const handleInviteSearch = async (q: string) => {
    setInviteSearch(q);
    if (q.length < 1) { setInviteResults([]); return; }
    const users = await chatApi.searchUsers(q);
    // 过滤掉已在房间内的用户
    setInviteResults(users.filter((u) => !inviteMemberIds.has(u.id)));
  };

  const handleShowInvite = async () => {
    if (!activeRoom) return;
    // 获取当前成员列表
    try {
      const members = await chatApi.getMembers(activeRoom.id);
      setInviteMemberIds(new Set(members.map((m) => m.id)));
    } catch { /* ignore */ }
    setSelectedUsers([]);
    setInviteSearch('');
    setInviteResults([]);
    setShowInvite(true);
  };

  const handleInviteUsers = async () => {
    if (!activeRoom || selectedUsers.length === 0) return;
    await chatApi.inviteUsers(activeRoom.id, selectedUsers.map((u) => u.id));
    setShowInvite(false);
    // 刷新房间列表
    chatApi.getRooms().catch(() => {});
  };

  // 快捷键关闭房间
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeRoomId) {
        switchRoom('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeRoomId, switchRoom]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-20 text-center">
        <MessageSquare className="h-16 w-16 text-neutral-200 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-neutral-600 mb-2">Please sign in to chat</h2>
        <p className="text-sm text-neutral-400">You need to be logged in to access the chat rooms.</p>
      </div>
    );
  }

  return (
    <div className="h-full mx-auto max-w-6xl px-0 md:px-4 py-0 md:py-6 overflow-hidden">
      <div className="flex h-full bg-white rounded-none md:rounded-2xl border-0 md:border border-neutral-200 overflow-hidden shadow-none md:shadow-sm">
        {/* Room list sidebar */}
        <div
          className={`flex-shrink-0 w-full md:w-72 border-r border-neutral-100 flex flex-col ${
            activeRoomId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ChatRoomList
            rooms={rooms}
            activeRoomId={activeRoomId}
            onSelectRoom={switchRoom}
            onCreateRoom={createGroupRoom}
            onStartDirectChat={startDirectChat}
            onJoinRoom={joinGroupRoom}
            onLeaveRoom={leaveRoomAction}
          />
        </div>

        {/* Chat area */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            !activeRoomId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeRoom ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3 bg-white">
                {/* Back button (mobile) */}
                <button
                  onClick={() => switchRoom('')}
                  className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                  activeRoom.type === 'DIRECT' ? 'bg-blue-100' : 'bg-brand-100'
                }`}>
                  {activeRoom.type === 'DIRECT' ? (
                    <Users className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Hash className="h-5 w-5 text-brand-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-neutral-900 truncate">
                    {activeRoom.name}
                  </h3>
                  <p className="text-xs text-neutral-400 truncate">
                    {activeRoom.type === 'DIRECT'
                      ? 'Direct message'
                      : `${activeRoom.memberCount} members, ${onlineUsers.length} online`}
                  </p>
                </div>

                {/* Online indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {activeRoom.type === 'GROUP' && (
                    <button
                      onClick={handleShowInvite}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-600 hover:bg-brand-50 cursor-pointer transition-colors"
                      title="Invite users"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  )}
                  <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
                  <span className="text-xs text-neutral-400">{connected ? 'Connected' : 'Reconnecting...'}</span>
                </div>
              </div>

              {/* Invite dialog */}
              {showInvite && (
                <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-700">Invite users to {activeRoom.name}</span>
                    <button onClick={() => setShowInvite(false)} className="p-1 rounded text-neutral-400 hover:text-neutral-600 cursor-pointer">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Selected users */}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {selectedUsers.map((u) => (
                        <span key={u.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs">
                          {u.username}
                          <button
                            onClick={() => setSelectedUsers((prev) => prev.filter((s) => s.id !== u.id))}
                            className="hover:text-brand-900 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    value={inviteSearch}
                    onChange={(e) => handleInviteSearch(e.target.value)}
                    placeholder="Search users to invite..."
                    className="w-full text-sm rounded-lg border border-neutral-200 px-3 py-2 mb-2 focus:border-brand-400 focus:ring-1 focus:ring-brand-50 outline-none"
                    autoFocus
                  />
                  {inviteResults.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-0.5 mb-2">
                      {inviteResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            if (!selectedUsers.find((s) => s.id === u.id)) {
                              setSelectedUsers((prev) => [...prev, u]);
                            }
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-neutral-700 hover:bg-white cursor-pointer transition-colors"
                        >
                          <Check className="h-3.5 w-3.5 text-transparent" />
                          <span className="h-6 w-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium">
                            {u.avatar ? <img src={u.avatar} className="h-full w-full rounded-full" /> : u.username[0]?.toUpperCase()}
                          </span>
                          <span>{u.username}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={handleInviteUsers}
                    disabled={selectedUsers.length === 0}
                    className="text-xs font-medium py-1.5 px-3 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    Invite
                  </button>
                </div>
              )}

              {/* Messages */}
              <ChatMessageList
                messages={messages}
                currentUserId={user?.id}
                typingUsers={typingUsers}
                messagesEndRef={messagesEndRef}
                onLoadMore={loadMoreMessages}
                hasMore={hasMore}
                loadingMore={loadingMessages}
                onReact={toggleReaction}
                onReask={handleSendMessage}
              />

              {/* Input */}
              <ChatInput
                onSend={handleSendMessage}
                onTyping={handleTyping}
                onStopTyping={handleStopTyping}
                disabled={!connected}
              />
            </>
          ) : !activeRoomId && rooms.length > 0 ? (
            <div className="flex-1 flex items-center justify-center text-neutral-400">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-neutral-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-neutral-400">Select a conversation</p>
                <p className="text-xs text-neutral-300 mt-1">Choose a room from the sidebar to start chatting</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
