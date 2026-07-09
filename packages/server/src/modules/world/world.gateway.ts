import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

const WORLD_ROOM = 'world-room';
// 房间人数上限：超过则拒绝新用户进入（同一用户多标签重连不计入）
const MAX_ROOM_USERS = 5;

const SHAPES = ['human', 'cat', 'dog', 'tree', 'ball', 'cube', 'star', 'robot'];
const ACTIONS = ['idle', 'jump', 'spin', 'dance', 'wave'];
const COLORS = ['rainbow', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#eab308', '#a855f7', '#ec4899', '#1f2937', '#f8fafc'];
const SKILLS = ['fireball', 'lightning', 'freeze', 'whirlwind', 'heal'];

// ---- 战斗数值（服务器权威）----
const MAX_HP = 100;
const MAX_MP = 100;
const MP_REGEN_PER_SEC = 14;
// 每个技能释放所需蓝量
const MP_COST: Record<string, number> = { fireball: 15, lightning: 12, freeze: 18, whirlwind: 22, heal: 25 };
const MAX_SKILL_LEVEL = 5;
const SKILL_POINTS_PER_KILL = 3; // 每次击杀奖励技能点
const SKILL_POINTS_INTERVAL = 15000; // 每 15 秒被动 +1 技能点
// 状态效果（减速）：命中被标记技能时由服务器施加
const STATUS_CFG: Record<string, { factor: number; duration: number }> = {
  freeze: { factor: 0.4, duration: 2500 }, // 冰冻：移速降至 40%，持续 2.5s
  whirlwind: { factor: 0.6, duration: 1500 }, // 旋风：移速降至 60%，持续 1.5s
};

export interface AvatarSnapshot {
  shape: string;
  color: string;
  scale: number;
  action: string;
  x: number;
  z: number;
  atk: number;
  rot: number;
  moving: boolean;
}

export interface WorldUser {
  userId: string;
  username: string;
  avatar: AvatarSnapshot;
  hp: number;
}

export interface ScoreEntry {
  userId: string;
  username: string;
  kills: number;
  deaths: number;
  score: number;
}

@WebSocketGateway({
  namespace: '/world',
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class WorldGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WorldGateway.name);
  // userId -> Set<socketId>
  private readonly userSockets = new Map<string, Set<string>>();
  // socketId -> { userId, username, avatar }
  private readonly socketUsers = new Map<string, WorldUser>();
  // userId -> 最新分身状态（用于快照）
  private readonly userAvatar = new Map<string, AvatarSnapshot>();
  // userId -> 用户名
  private readonly userNames = new Map<string, string>();
  // userId -> 当前血量（0~100）
  private readonly userHp = new Map<string, number>();
  // userId -> 当前蓝量（0~MAX_MP）
  private readonly userMp = new Map<string, number>();
  // userId -> 状态效果（减速）
  private readonly userStatus = new Map<string, { until: number; factor: number; skill: string }>();
  // userId -> 各技能等级
  private readonly userLevels = new Map<string, Record<string, number>>();
  // userId -> 击杀 / 死亡 / 积分
  private readonly userKills = new Map<string, number>();
  private readonly userDeaths = new Map<string, number>();
  private readonly userScore = new Map<string, number>();
  // userId -> 可用技能点
  private readonly userSkillPoints = new Map<string, number>();
  // userId -> 上次被动发放技能点时间
  private readonly userLastSp = new Map<string, number>();
  // victim -> 最后攻击者（用于击杀归属）
  private readonly lastHitBy = new Map<string, string>();
  // userId -> 死亡复活计时器
  private readonly deadTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(): void {
    // 蓝量自然回复 + 被动技能点发放
    setInterval(() => {
      const now = Date.now();
      this.userMp.forEach((mp, userId) => {
        const np = Math.min(MAX_MP, mp + MP_REGEN_PER_SEC * 0.5);
        if (np !== mp) {
          this.userMp.set(userId, np);
          this.server.to(WORLD_ROOM).emit('mp_update', { userId, mp: np });
        }
      });
      this.userSkillPoints.forEach((p, userId) => {
        const last = this.userLastSp.get(userId) ?? 0;
        if (now - last >= SKILL_POINTS_INTERVAL) {
          const np = p + 1;
          this.userSkillPoints.set(userId, np);
          this.userLastSp.set(userId, now);
          this.emitSkillPoints(userId, np);
        }
      });
    }, 500);
  }

  // ==================== 连接管理 ====================

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub as string;
      const username = (payload.username as string) ?? 'Anonymous';

      (client as any).userId = userId;
      (client as any).username = username;

      // 房间人数上限：仅对“新用户”做满员校验，已在线用户的多标签重连不受限
      const isExistingUser = (this.userSockets.get(userId)?.size ?? 0) > 0;
      if (!isExistingUser && this.userSockets.size >= MAX_ROOM_USERS) {
        client.emit('room_full', { limit: MAX_ROOM_USERS });
        client.disconnect();
        return;
      }

      // 加入共享房间
      client.join(WORLD_ROOM);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
        this.userHp.set(userId, MAX_HP);
        this.userMp.set(userId, MAX_MP);
        this.userLevels.set(userId, this.defaultLevels());
        this.userKills.set(userId, 0);
        this.userDeaths.set(userId, 0);
        this.userScore.set(userId, 0);
        this.userSkillPoints.set(userId, 0);
        this.userLastSp.set(userId, Date.now());
        this.userNames.set(userId, username);
        this.userStatus.delete(userId);
      }
      this.userSockets.get(userId)!.add(client.id);

      const avatar: AvatarSnapshot = this.userAvatar.get(userId) ?? {
        shape: 'human',
        color: '#6366f1',
        scale: 1,
        action: 'idle',
        x: 0,
        z: 0,
        atk: 0,
        rot: 0,
        moving: false,
      };

      const user: WorldUser = { userId, username, avatar, hp: this.userHp.get(userId) ?? MAX_HP };
      this.socketUsers.set(client.id, user);
      this.userAvatar.set(userId, avatar);

      // 给新用户发送当前房间内其他所有人的快照
      const others: WorldUser[] = [];
      this.socketUsers.forEach((u) => {
        if (u.userId !== userId) others.push(u);
      });
      client.emit('world_snapshot', { users: others });

      // 初始化自身战斗状态（蓝量 / 等级 / 技能点）
      client.emit('world_init', {
        mp: this.userMp.get(userId) ?? MAX_MP,
        maxMp: MAX_MP,
        levels: this.userLevels.get(userId) ?? this.defaultLevels(),
        skillPoints: this.userSkillPoints.get(userId) ?? 0,
      });

      // 通知房间内其他人：有新用户加入
      client.to(WORLD_ROOM).emit('user_joined', { user });
      // 广播最新计分板
      this.broadcastScoreboard();

      this.logger.log(`User ${username} (${userId}) joined world-room`);
    } catch (err) {
      this.logger.warn(`World auth failed for ${client.id}: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;

    const sockets = this.userSockets.get(user.userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(user.userId);
        this.userAvatar.delete(user.userId);
        this.userNames.delete(user.userId);
        this.userHp.delete(user.userId);
        this.userMp.delete(user.userId);
        this.userStatus.delete(user.userId);
        this.userLevels.delete(user.userId);
        this.userKills.delete(user.userId);
        this.userDeaths.delete(user.userId);
        this.userScore.delete(user.userId);
        this.userSkillPoints.delete(user.userId);
        this.userLastSp.delete(user.userId);
        this.lastHitBy.delete(user.userId);
        const t = this.deadTimers.get(user.userId);
        if (t) {
          clearTimeout(t);
          this.deadTimers.delete(user.userId);
        }
      }
    }
    this.socketUsers.delete(client.id);

    this.server.to(WORLD_ROOM).emit('user_left', { userId: user.userId });
    this.logger.log(`User ${user.username} left world-room`);
  }

  // ==================== 分身状态同步 ====================

  @SubscribeMessage('update_avatar')
  handleUpdateAvatar(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: Partial<AvatarSnapshot>,
  ): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;

    const prev = this.userAvatar.get(user.userId) ?? user.avatar;
    const num = (v: unknown, min: number, max: number, fallback: number) =>
      typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

    const next: AvatarSnapshot = {
      shape: SHAPES.includes(data.shape as string) ? (data.shape as string) : prev.shape,
      color:
        typeof data.color === 'string' && (COLORS.includes(data.color) || data.color.startsWith('#'))
          ? data.color
          : prev.color,
      scale: num(data.scale, 0.3, 3, prev.scale),
      action: ACTIONS.includes(data.action as string) ? (data.action as string) : prev.action,
      x: num(data.x, -18, 18, prev.x),
      z: num(data.z, -18, 18, prev.z),
      atk: typeof data.atk === 'number' && isFinite(data.atk) ? data.atk : prev.atk,
      rot: typeof data.rot === 'number' && isFinite(data.rot) ? data.rot : prev.rot,
      moving: data.moving === true ? true : data.moving === false ? false : prev.moving,
    };

    this.userAvatar.set(user.userId, next);
    user.avatar = next;

    // 广播给房间内所有人（含发送者，保证全员一致；客户端按 userId 自排除）
    this.server.to(WORLD_ROOM).emit('avatar_updated', {
      userId: user.userId,
      username: user.username,
      avatar: next,
    });
  }

  // ==================== 受击同步 ====================

  @SubscribeMessage('got_hit')
  handleGotHit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { at?: number; dmg?: number; casterId?: string; skill?: string },
  ): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;
    const dmg = typeof data?.dmg === 'number' && data.dmg > 0 ? data.dmg : 20;
    const at = typeof data?.at === 'number' ? data.at : Date.now();
    const userId = user.userId;
    const hp = Math.max(0, (this.userHp.get(userId) ?? MAX_HP) - dmg);
    this.userHp.set(userId, hp);

    const casterId = typeof data?.casterId === 'string' ? data.casterId : undefined;
    const skill = typeof data?.skill === 'string' ? data.skill : undefined;
    if (casterId && casterId !== userId) this.lastHitBy.set(userId, casterId);

    // 命中带状态效果（冰冻 / 旋风减速）
    if (skill && STATUS_CFG[skill]) {
      const cfg = STATUS_CFG[skill];
      const until = Date.now() + cfg.duration;
      this.userStatus.set(userId, { until, factor: cfg.factor, skill });
      this.server.to(WORLD_ROOM).emit('user_status', { userId, until, factor: cfg.factor, skill });
    }

    // 全员同步最新血量
    this.server.to(WORLD_ROOM).emit('hp_update', { userId, hp });
    // 受击红闪（仅在有伤害时）
    this.server.to(WORLD_ROOM).emit('user_hit', { userId, at });
    // 血量归零 → 判定死亡，3 秒后自动复活
    if (hp <= 0 && !this.deadTimers.has(userId)) {
      const killer = this.lastHitBy.get(userId);
      if (killer && killer !== userId && this.userSockets.has(killer)) {
        this.userKills.set(killer, (this.userKills.get(killer) ?? 0) + 1);
        this.userScore.set(killer, (this.userScore.get(killer) ?? 0) + 100);
        const sp = (this.userSkillPoints.get(killer) ?? 0) + SKILL_POINTS_PER_KILL;
        this.userSkillPoints.set(killer, sp);
        this.emitSkillPoints(killer, sp);
        this.broadcastScoreboard();
      }
      this.userDeaths.set(userId, (this.userDeaths.get(userId) ?? 0) + 1);
      this.broadcastScoreboard();
      this.deadTimers.set(
        userId,
        setTimeout(() => {
          this.userHp.set(userId, MAX_HP);
          this.userStatus.delete(userId);
          this.deadTimers.delete(userId);
          this.server.to(WORLD_ROOM).emit('hp_update', { userId, hp: MAX_HP });
          this.server.to(WORLD_ROOM).emit('user_status', { userId, until: 0, factor: 1, skill: '' });
          this.server.to(WORLD_ROOM).emit('user_respawn', { userId });
        }, 3000),
      );
    }
  }

  // 治疗通道：对自身/他人回血（由受益者自己上报）
  @SubscribeMessage('apply_hp')
  handleApplyHp(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { dhp?: number },
  ): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;
    const dhp = typeof data?.dhp === 'number' ? data.dhp : 0;
    if (dhp === 0) return;
    const userId = user.userId;
    const hp = Math.min(MAX_HP, Math.max(0, (this.userHp.get(userId) ?? MAX_HP) + dhp));
    this.userHp.set(userId, hp);
    this.server.to(WORLD_ROOM).emit('hp_update', { userId, hp });
  }

  // ==================== 技能同步（含蓝量消耗与等级） ====================

  @SubscribeMessage('cast_skill')
  handleCastSkill(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { skill?: string; x?: number; z?: number; rot?: number; id?: string },
  ): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;
    const num = (v: unknown, min: number, max: number, fallback: number) =>
      typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
    const skill = SKILLS.includes(data.skill as string) ? (data.skill as string) : 'fireball';
    const userId = user.userId;
    const mp = this.userMp.get(userId) ?? MAX_MP;
    const cost = MP_COST[skill] ?? 0;
    // 蓝量不足 → 拒绝释放
    if (mp < cost) {
      this.userSocket(userId)?.emit('cast_rejected', { skill, reason: 'mp' });
      return;
    }
    this.userMp.set(userId, mp - cost);
    this.server.to(WORLD_ROOM).emit('mp_update', { userId, mp: mp - cost });
    const level = this.clampLevel((this.userLevels.get(userId) ?? this.defaultLevels())[skill] ?? 1);
    this.server.to(WORLD_ROOM).emit('skill_cast', {
      id: typeof data.id === 'string' && data.id ? data.id : `${user.userId}-${Date.now()}`,
      skill,
      x: num(data.x, -18, 18, 0),
      z: num(data.z, -18, 18, 0),
      rot: typeof data.rot === 'number' && isFinite(data.rot) ? data.rot : 0,
      casterId: user.userId,
      casterName: user.username,
      castAt: Date.now(),
      level,
    });
  }

  // 升级技能：消耗 1 技能点，等级 +1（服务器权威）
  @SubscribeMessage('upgrade_skill')
  handleUpgradeSkill(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { skill?: string },
  ): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;
    const skill = SKILLS.includes(data?.skill as string) ? (data.skill as string) : null;
    if (!skill) return;
    const userId = user.userId;
    const levels = this.userLevels.get(userId) ?? this.defaultLevels();
    const cur = levels[skill] ?? 1;
    if (cur >= MAX_SKILL_LEVEL) {
      this.userSocket(userId)?.emit('upgrade_failed', { skill, reason: 'max' });
      return;
    }
    const pts = this.userSkillPoints.get(userId) ?? 0;
    if (pts < 1) {
      this.userSocket(userId)?.emit('upgrade_failed', { skill, reason: 'points' });
      return;
    }
    levels[skill] = cur + 1;
    this.userLevels.set(userId, levels);
    const np = pts - 1;
    this.userSkillPoints.set(userId, np);
    this.userSocket(userId)?.emit('skill_update', { skill, level: cur + 1, skillPoints: np });
  }

  // ==================== 辅助方法 ====================

  private defaultLevels(): Record<string, number> {
    return { fireball: 1, lightning: 1, freeze: 1, whirlwind: 1, heal: 1 };
  }

  private clampLevel(n: number): number {
    return Math.max(1, Math.min(MAX_SKILL_LEVEL, Math.floor(n)));
  }

  private userSocket(userId: string): Socket | undefined {
    const ids = this.userSockets.get(userId);
    if (!ids || ids.size === 0) return undefined;
    const id = ids.values().next().value as string;
    return this.server.sockets.sockets.get(id);
  }

  private emitSkillPoints(userId: string, points: number): void {
    this.userSocket(userId)?.emit('skill_points', { points });
  }

  private broadcastScoreboard(): void {
    const board: ScoreEntry[] = [];
    this.userNames.forEach((username, userId) => {
      board.push({
        userId,
        username,
        kills: this.userKills.get(userId) ?? 0,
        deaths: this.userDeaths.get(userId) ?? 0,
        score: this.userScore.get(userId) ?? 0,
      });
    });
    board.sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths);
    this.server.to(WORLD_ROOM).emit('scoreboard', board);
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake?.auth?.token;
    if (auth) return typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    const query = client.handshake?.query?.token;
    if (query) return typeof query === 'string' ? query : undefined;
    return undefined;
  }
}
