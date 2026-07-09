import io, { Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getWorldSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(`${SOCKET_URL}/world`, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function disconnectWorldSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function updateAvatar(
  socket: Socket,
  avatar: {
    shape: string;
    color: string;
    scale: number;
    action: string;
    x: number;
    z: number;
    atk: number;
    rot: number;
    moving: boolean;
  },
): void {
  socket.emit('update_avatar', avatar);
}

export type SkillKind = 'fireball' | 'lightning' | 'freeze' | 'whirlwind' | 'heal';

export interface SkillCast {
  id: string;
  skill: SkillKind;
  x: number;
  z: number;
  rot: number;
  casterId: string;
  casterName?: string;
  castAt: number;
  level: number; // 技能等级（服务器权威）
}

export function emitGotHit(
  socket: Socket,
  at: number,
  dmg?: number,
  casterId?: string,
  skill?: string,
): void {
  socket.emit('got_hit', { at, dmg, casterId, skill });
}

export function upgradeSkill(socket: Socket, skill: SkillKind): void {
  socket.emit('upgrade_skill', { skill });
}

export interface ScoreEntry {
  userId: string;
  username: string;
  kills: number;
  deaths: number;
  score: number;
}

export interface UserStatus {
  userId: string;
  until: number;
  factor: number;
  skill: string;
}

export function castSkill(
  socket: Socket,
  payload: { skill: SkillKind; x: number; z: number; rot: number; id: string },
): void {
  socket.emit('cast_skill', payload);
}

export function applyHp(socket: Socket, dhp: number): void {
  socket.emit('apply_hp', { dhp });
}

export type { Socket };
