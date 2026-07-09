import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getWorldSocket, disconnectWorldSocket, updateAvatar, emitGotHit, castSkill, applyHp, upgradeSkill, type SkillCast, type SkillKind, type ScoreEntry, type UserStatus } from '../api/worldSocket';
import type { Socket } from 'socket.io-client';
import type { AvatarState } from '../components/world/commandParser';

export interface RemoteAvatar {
  shape: string;
  color: string;
  scale: number;
  action: string;
  rot: number;
  moving: boolean;
}

export interface RemoteUser {
  userId: string;
  username: string;
  x: number;
  z: number;
  atk: number;
  hitAt: number;
  attackAt: number;
  rot: number;
  moving: boolean;
  hp: number;
  status: { until: number; factor: number; skill: string };
  avatar: RemoteAvatar;
}

const HIT_RADIUS = 3;

export function useWorld(opts: {
  state: AvatarState;
  x: number;
  z: number;
  rotRef: { current: number };
  movingRef: { current: boolean };
}) {
  const { user, isAuthenticated } = useAuth();
  const token = localStorage.getItem('access_token');

  const [, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [roomFull, setRoomFull] = useState(false);
  const [myHitAt, setMyHitAt] = useState(0);
  const [selfAttackAt, setSelfAttackAt] = useState(0);
  const [, setAtk] = useState(0);
  const [myHp, setMyHp] = useState(100);
  const [myMp, setMyMp] = useState(100);
  const [myMaxMp, setMyMaxMp] = useState(100);
  const [myLevels, setMyLevels] = useState<Record<string, number>>({
    fireball: 1,
    lightning: 1,
    freeze: 1,
    whirlwind: 1,
    heal: 1,
  });
  const [mySkillPoints, setMySkillPoints] = useState(0);
  const [myStatus, setMyStatus] = useState<UserStatus>({ userId: '', until: 0, factor: 1, skill: '' });
  const [scoreboard, setScoreboard] = useState<ScoreEntry[]>([]);
  const [incomingSkills, setIncomingSkills] = useState<SkillCast[]>([]);
  const clearIncoming = useCallback(() => setIncomingSkills([]), []);

  const [castDenied, setCastDenied] = useState<string>(''); // 蓝量不足 / 升级失败等提示
  const denyCast = useCallback((reason: string) => {
    setCastDenied(reason);
    window.setTimeout(() => setCastDenied(''), 1400);
  }, []);

  // refs 持有最新值，避免闭包过期
  const socketRef = useRef<Socket | null>(null);
  const connectedRef = useRef(false);
  const stateRef = useRef(opts.state);
  stateRef.current = opts.state;
  const posRef = useRef({ x: opts.x, z: opts.z });
  posRef.current = { x: opts.x, z: opts.z };
  const atkRef = useRef(0);
  const lastEmitRef = useRef(0);
  const lastAtkRef = useRef<Map<string, number>>(new Map());
  const myIdRef = useRef<string | undefined>(user?.id);
  myIdRef.current = user?.id;
  const myMpRef = useRef(100);
  myMpRef.current = myMp;
  const myLevelsRef = useRef<Record<string, number>>(myLevels);
  myLevelsRef.current = myLevels;
  const myStatusRef = useRef<UserStatus>(myStatus);
  myStatusRef.current = myStatus;

  const rotRef = useRef(0);
  rotRef.current = opts.rotRef.current;
  const movingRef = useRef(false);
  movingRef.current = opts.movingRef.current;

  const emit = useCallback((force = false) => {
    const s = socketRef.current;
    if (!s || !connectedRef.current) return;
    const now = Date.now();
    if (!force && now - lastEmitRef.current < 70) return;
    lastEmitRef.current = now;
    updateAvatar(s, {
      shape: stateRef.current.shape,
      color: stateRef.current.color,
      scale: stateRef.current.scale,
      action: stateRef.current.action,
      x: posRef.current.x,
      z: posRef.current.z,
      atk: atkRef.current,
      rot: rotRef.current,
      moving: movingRef.current,
    });
  }, []);

    const checkHit = useCallback((attackerId: string, ax: number, az: number) => {
      if (attackerId === myIdRef.current) return;
      const d = Math.hypot(ax - posRef.current.x, az - posRef.current.z);
      if (d < HIT_RADIUS) {
        const now = Date.now();
        setMyHitAt(now);
        if (socketRef.current) emitGotHit(socketRef.current, now, 20, attackerId);
      }
    }, []);

  const attack = useCallback(() => {
    atkRef.current += 1;
    setAtk(atkRef.current);
    setSelfAttackAt(Date.now());
    emit(true);
  }, [emit]);

  const castSkillNow = useCallback(
    (s: { skill: SkillKind; x: number; z: number; rot: number; id: string }) => {
      const sock = socketRef.current;
      if (!sock || !connectedRef.current) return;
      castSkill(sock, s);
    },
    [],
  );

  const reportHit = useCallback((dmg: number, casterId?: string, skill?: string) => {
    if (socketRef.current) emitGotHit(socketRef.current, Date.now(), dmg, casterId, skill);
  }, []);

  const healSelf = useCallback((amount: number) => {
    if (socketRef.current) applyHp(socketRef.current, amount);
  }, []);

  const upgrade = useCallback((skill: SkillKind) => {
    if (socketRef.current) upgradeSkill(socketRef.current, skill);
  }, []);

  // 连接并监听房间事件
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const s = getWorldSocket(token);
    socketRef.current = s;
    setSocket(s);

    const onConnect = () => {
      setConnected(true);
      connectedRef.current = true;
      emit(true);
    };
    const onDisconnect = () => {
      setConnected(false);
      connectedRef.current = false;
    };
    const onRoomFull = () => {
      setRoomFull(true);
      setConnected(false);
      connectedRef.current = false;
      // 主动断开并停止自动重连，避免反复弹出“房间已满”
      disconnectWorldSocket();
      socketRef.current = null;
    };
    const onSnapshot = (data: { users: any[] }) => {
      lastAtkRef.current.clear();
      setRemoteUsers(
        data.users.map((u: any) => {
          lastAtkRef.current.set(u.userId, u.avatar.atk ?? 0);
          return {
            userId: u.userId,
            username: u.username,
            x: u.avatar.x ?? 0,
            z: u.avatar.z ?? 0,
            atk: u.avatar.atk ?? 0,
            hitAt: 0,
            attackAt: 0,
            rot: u.avatar.rot ?? 0,
            moving: !!u.avatar.moving,
            hp: u.hp ?? 100,
            status: { until: 0, factor: 1, skill: '' },
            avatar: {
              shape: u.avatar.shape,
              color: u.avatar.color,
              scale: u.avatar.scale,
              action: u.avatar.action,
              rot: u.avatar.rot ?? 0,
              moving: !!u.avatar.moving,
            },
          };
        }),
      );
    };
    const onJoined = (data: { user: any }) => {
      lastAtkRef.current.set(data.user.userId, data.user.avatar.atk ?? 0);
      setRemoteUsers((prev) =>
        prev.some((u) => u.userId === data.user.userId)
          ? prev
          : [
              ...prev,
              {
                userId: data.user.userId,
                username: data.user.username,
                x: data.user.avatar.x ?? 0,
                z: data.user.avatar.z ?? 0,
                atk: data.user.avatar.atk ?? 0,
                hitAt: 0,
                attackAt: 0,
                rot: data.user.avatar.rot ?? 0,
                moving: !!data.user.avatar.moving,
                hp: data.user.hp ?? 100,
                status: { until: 0, factor: 1, skill: '' },
                avatar: {
                  shape: data.user.avatar.shape,
                  color: data.user.avatar.color,
                  scale: data.user.avatar.scale,
                  action: data.user.avatar.action,
                  rot: data.user.avatar.rot ?? 0,
                  moving: !!data.user.avatar.moving,
                },
              },
            ],
      );
    };
    const onLeft = (data: { userId: string }) => {
      lastAtkRef.current.delete(data.userId);
      setRemoteUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };
    const onUpdated = (data: any) => {
      if (data.userId === myIdRef.current) return; // 自己的回显忽略（本地为准）
      const newAtk = data.avatar.atk ?? 0;
      const prevAtk = lastAtkRef.current.get(data.userId) ?? 0;
      const attacked = newAtk > prevAtk;
      if (attacked) {
        lastAtkRef.current.set(data.userId, newAtk);
        checkHit(data.userId, data.avatar.x ?? 0, data.avatar.z ?? 0);
      }
      setRemoteUsers((prev) => {
        const idx = prev.findIndex((u) => u.userId === data.userId);
        const ru: RemoteUser = {
          userId: data.userId,
          username: data.username,
          x: data.avatar.x ?? 0,
          z: data.avatar.z ?? 0,
          atk: newAtk,
          hitAt: idx >= 0 ? prev[idx].hitAt : 0,
          attackAt: attacked ? Date.now() : idx >= 0 ? prev[idx].attackAt : 0,
          rot: data.avatar.rot ?? 0,
          moving: !!data.avatar.moving,
          hp: idx >= 0 ? prev[idx].hp : 100,
          status: idx >= 0 ? prev[idx].status : { until: 0, factor: 1, skill: '' },
          avatar: {
            shape: data.avatar.shape,
            color: data.avatar.color,
            scale: data.avatar.scale,
            action: data.avatar.action,
            rot: data.avatar.rot ?? 0,
            moving: !!data.avatar.moving,
          },
        };
        if (idx === -1) return [...prev, ru];
        const next = [...prev];
        next[idx] = ru;
        return next;
      });
    };
    const onUserHit = (data: { userId: string; at: number }) => {
      if (data.userId === myIdRef.current) {
        setMyHitAt(data.at);
        return;
      }
      setRemoteUsers((prev) => prev.map((u) => (u.userId === data.userId ? { ...u, hitAt: data.at } : u)));
    };
    const onHpUpdate = (data: { userId: string; hp: number }) => {
      if (data.userId === myIdRef.current) {
        setMyHp(Math.max(0, Math.min(100, data.hp)));
        return;
      }
      setRemoteUsers((prev) => prev.map((u) => (u.userId === data.userId ? { ...u, hp: data.hp } : u)));
    };
    const onRespawn = (data: { userId: string }) => {
      if (data.userId === myIdRef.current) {
        setMyHp(100);
        return;
      }
      setRemoteUsers((prev) => prev.map((u) => (u.userId === data.userId ? { ...u, hp: 100 } : u)));
    };
    const onSkillCast = (data: SkillCast) => {
      setIncomingSkills((prev) => (prev.some((e) => e.id === data.id) ? prev : [...prev, data]));
    };
    const onWorldInit = (data: { mp: number; maxMp: number; levels: Record<string, number>; skillPoints: number }) => {
      setMyMp(data.mp ?? 100);
      setMyMaxMp(data.maxMp ?? 100);
      setMyLevels(data.levels ?? myLevelsRef.current);
      setMySkillPoints(data.skillPoints ?? 0);
    };
    const onMpUpdate = (data: { userId: string; mp: number }) => {
      if (data.userId === myIdRef.current) setMyMp(Math.max(0, Math.min(myMaxMp, data.mp)));
    };
    const onSkillUpdate = (data: { skill: string; level: number; skillPoints: number }) => {
      setMyLevels((prev) => ({ ...prev, [data.skill]: data.level }));
      setMySkillPoints(data.skillPoints);
    };
    const onSkillPoints = (data: { points: number }) => {
      setMySkillPoints(data.points);
    };
    const onScoreboard = (data: ScoreEntry[]) => {
      setScoreboard(data ?? []);
    };
    const onUserStatus = (data: UserStatus) => {
      if (data.userId === myIdRef.current) {
        setMyStatus(data);
        return;
      }
      setRemoteUsers((prev) =>
        prev.map((u) => (u.userId === data.userId ? { ...u, status: data } : u)),
      );
    };
    const onCastRejected = (data: { skill: string; reason: string }) => {
      if (data.reason === 'mp') denyCast(data.skill);
    };
    const onUpgradeFailed = (data: { skill: string; reason: string }) => {
      if (data.reason === 'max') denyCast(`${data.skill}:max`);
      else if (data.reason === 'points') denyCast('points');
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('room_full', onRoomFull);
    s.on('world_snapshot', onSnapshot);
    s.on('user_joined', onJoined);
    s.on('user_left', onLeft);
    s.on('avatar_updated', onUpdated);
    s.on('user_hit', onUserHit);
    s.on('skill_cast', onSkillCast);
    s.on('hp_update', onHpUpdate);
    s.on('user_respawn', onRespawn);
    s.on('world_init', onWorldInit);
    s.on('mp_update', onMpUpdate);
    s.on('skill_update', onSkillUpdate);
    s.on('skill_points', onSkillPoints);
    s.on('scoreboard', onScoreboard);
    s.on('user_status', onUserStatus);
    s.on('cast_rejected', onCastRejected);
    s.on('upgrade_failed', onUpgradeFailed);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('room_full', onRoomFull);
      s.off('world_snapshot', onSnapshot);
      s.off('user_joined', onJoined);
      s.off('user_left', onLeft);
      s.off('avatar_updated', onUpdated);
      s.off('user_hit', onUserHit);
      s.off('skill_cast', onSkillCast);
      s.off('hp_update', onHpUpdate);
      s.off('user_respawn', onRespawn);
      s.off('world_init', onWorldInit);
      s.off('mp_update', onMpUpdate);
      s.off('skill_update', onSkillUpdate);
      s.off('skill_points', onSkillPoints);
      s.off('scoreboard', onScoreboard);
      s.off('user_status', onUserStatus);
      s.off('cast_rejected', onCastRejected);
      s.off('upgrade_failed', onUpgradeFailed);
      disconnectWorldSocket();
      socketRef.current = null;
      connectedRef.current = false;
    };
  }, [token, isAuthenticated, user?.id, emit, checkHit]);

  // 本地状态 / 位置变化 → 节流广播
  useEffect(() => {
    emit();
  }, [opts.state, opts.x, opts.z, connected, emit]);

  const retry = useCallback(() => {
    if (token && isAuthenticated) {
      disconnectWorldSocket();
      socketRef.current = null;
      connectedRef.current = false;
      const s = getWorldSocket(token);
      socketRef.current = s;
      setSocket(s);
    }
  }, [token, isAuthenticated]);

  return {
    connected,
    remoteUsers,
    roomFull,
    retry,
    attack,
    myHitAt,
    selfAttackAt,
    setSelfAttackAt,
    myHp,
    myMp,
    myMaxMp,
    myLevels,
    mySkillPoints,
    myStatus,
    scoreboard,
    castDenied,
    denyCast,
    healSelf,
    upgrade,
    incomingSkills,
    clearIncoming,
    castSkillNow,
    reportHit,
    sync: () => emit(true),
  };
}
