import { useState, useEffect } from 'react';
import { Users, UserPlus, Hash, Search, LogOut, Plus, Globe } from 'lucide-react';
import type { ChatRoom } from '../../api/chat';
import { chatApi, type DiscoverableRoom } from '../../api/chat';

interface ChatRoomListProps {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: (name: string, description?: string) => Promise<unknown>;
  onStartDirectChat: (userId: string) => Promise<unknown>;
  onJoinRoom: (roomId: string) => Promise<unknown>;
  onLeaveRoom: (roomId: string) => Promise<unknown>;
}

export function ChatRoomList({
  rooms,
  activeRoomId,
  onSelectRoom,
  onCreateRoom,
  onStartDirectChat,
  onJoinRoom,
  onLeaveRoom,
}: ChatRoomListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showDirectChat, setShowDirectChat] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [discoverRooms, setDiscoverRooms] = useState<DiscoverableRoom[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatar?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ roomId: string; x: number; y: number } | null>(null);

  // 加载可发现的房间
  useEffect(() => {
    if (showJoin) {
      setLoadingDiscover(true);
      chatApi.getDiscoverableRooms()
        .then(setDiscoverRooms)
        .catch(() => setDiscoverRooms([]))
        .finally(() => setLoadingDiscover(false));
    }
  }, [showJoin]);

  const handleCreate = async () => {
    if (!newRoomName.trim()) return;
    await onCreateRoom(newRoomName.trim(), newRoomDesc.trim() || undefined);
    setNewRoomName('');
    setNewRoomDesc('');
    setShowCreate(false);
  };

  const handleJoin = async (roomId: string) => {
    await onJoinRoom(roomId);
    setShowJoin(false);
  };

  const handleUserSearch = async (q: string) => {
    setUserSearch(q);
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const users = await chatApi.searchUsers(q);
      setSearchResults(users);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const formatLatestTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Chats</h2>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowCreate(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Create group"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowDirectChat(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Direct message"
          >
            <UserPlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowJoin(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Join room"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <div className="p-3 border-b border-neutral-100 bg-neutral-50">
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name..."
            className="w-full text-sm rounded-lg border border-neutral-200 px-3 py-2 mb-2 focus:border-brand-400 focus:ring-1 focus:ring-brand-50 outline-none"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <input
            value={newRoomDesc}
            onChange={(e) => setNewRoomDesc(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full text-sm rounded-lg border border-neutral-200 px-3 py-2 mb-2 focus:border-brand-400 focus:ring-1 focus:ring-brand-50 outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newRoomName.trim()}
              className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 cursor-pointer transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-xs font-medium py-1.5 px-3 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="p-3 border-b border-neutral-100 bg-neutral-50">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-700">Discover rooms</span>
          </div>
          {/* Manual join by ID */}
          <div className="flex gap-1 mb-2">
            <input
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="Paste room ID..."
              className="flex-1 text-xs rounded-lg border border-neutral-200 px-2.5 py-1.5 focus:border-brand-400 focus:ring-1 focus:ring-brand-50 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin(joinRoomId)}
            />
            <button
              onClick={() => handleJoin(joinRoomId.trim())}
              disabled={!joinRoomId.trim()}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 cursor-pointer transition-colors"
            >
              Join
            </button>
          </div>
          {/* Discoverable rooms */}
          {loadingDiscover ? (
            <p className="text-xs text-neutral-400 py-2">Loading rooms...</p>
          ) : discoverRooms.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {discoverRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleJoin(room.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-white border border-transparent hover:border-neutral-200 cursor-pointer transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                    <Hash className="h-4 w-4 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-neutral-800 truncate">{room.name}</p>
                    <p className="text-xs text-neutral-400 truncate">
                      {room.memberCount} members · by {room.createdBy.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 py-2">No rooms to discover</p>
          )}
          <button
            onClick={() => { setShowJoin(false); setJoinRoomId(''); }}
            className="text-xs font-medium py-1.5 px-3 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {showDirectChat && (
        <div className="p-3 border-b border-neutral-100 bg-neutral-50">
          <input
            value={userSearch}
            onChange={(e) => handleUserSearch(e.target.value)}
            placeholder="Search user..."
            className="w-full text-sm rounded-lg border border-neutral-200 px-3 py-2 mb-2 focus:border-brand-400 focus:ring-1 focus:ring-brand-50 outline-none"
            autoFocus
          />
          {searching && <p className="text-xs text-neutral-400">Searching...</p>}
          {searchResults.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-0.5 mb-2">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    onStartDirectChat(user.id);
                    setShowDirectChat(false);
                    setUserSearch('');
                    setSearchResults([]);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer transition-colors"
                >
                  <span className="h-6 w-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium">
                    {user.avatar ? <img src={user.avatar} className="h-full w-full rounded-full" /> : user.username[0]?.toUpperCase()}
                  </span>
                  <span>{user.username}</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowDirectChat(false)}
            className="text-xs font-medium py-1.5 px-3 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Users className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">No conversations yet</p>
            <p className="text-xs text-neutral-300 mt-1">Create or join a room to start chatting</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="relative group">
              <button
                onClick={() => onSelectRoom(room.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ roomId: room.id, x: e.clientX, y: e.clientY });
                }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer ${
                  activeRoomId === room.id
                    ? 'bg-brand-50 border-r-2 border-brand-600'
                    : 'hover:bg-neutral-50'
                }`}
              >
                <div className="shrink-0">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    room.type === 'DIRECT' ? 'bg-blue-100' : 'bg-brand-100'
                  }`}>
                    {room.type === 'DIRECT' ? (
                      <Users className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Hash className="h-5 w-5 text-brand-600" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-neutral-900 truncate">{room.name}</p>
                    {room.latestMessage && (
                      <span className="text-[10px] text-neutral-400 shrink-0">
                        {formatLatestTime(room.latestMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {room.type === 'DIRECT'
                      ? room.members.filter((m) => m.id !== room.members[0]?.id)[0]?.username || 'Private chat'
                      : `${room.memberCount} members`}
                  </p>
                  {room.latestMessage && (
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      <span className="font-medium text-neutral-500">{room.latestMessage.username}:</span>{' '}
                      {room.latestMessage.type === 'IMAGE' ? '📷 Image' :
                       room.latestMessage.type === 'FILE' ? '📎 File' :
                       room.latestMessage.content.slice(0, 50)}
                    </p>
                  )}
                </div>
              </button>

              {/* Context menu - leave room */}
              {contextMenu?.roomId === room.id && room.type === 'GROUP' && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
                  <div
                    className="fixed z-50 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 min-w-32"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                  >
                    <button
                      onClick={() => {
                        onLeaveRoom(room.id);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Leave room
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
