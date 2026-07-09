import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { WorldScene } from '../components/world/WorldScene';
import { useWorld } from '../hooks/useWorld';
import { useAuth } from '../hooks/useAuth';
import {
  parseCommand,
  randomAnimal,
  ANIMAL_LABELS,
  parseSkill,
  type AvatarState,
} from '../components/world/commandParser';
import { SKILLS, SKILL_BY_KEY, MAX_HP, MAX_MP, MP_COST, levelScale, MAX_SKILL_LEVEL } from '../components/world/skills';
import type { SkillCast, SkillKind } from '../api/worldSocket';

interface ChatLine {
  who: 'me' | 'sys';
  text: string;
}

const BOUND = 18;
const SPEED = 0.14;

export function WorldPage() {
  const { user } = useAuth();
  const [state, setState] = useState<AvatarState>(() => randomAnimal());
  const [self, setSelf] = useState(() => ({
    x: +(Math.random() * 12 - 6).toFixed(2),
    z: +(Math.random() * 12 - 6).toFixed(2),
    rot: 0,
    moving: false,
  }));
  const selfRef = useRef(self);
  selfRef.current = self;
  const rotRef = useRef(0);
  const movingRef = useRef(false);
  const keys = useRef({ up: false, down: false, left: false, right: false });
  const [input, setInput] = useState('');
  const [log, setLog] = useState<ChatLine[]>([
    {
      who: 'sys',
      text: '欢迎来到解压小世界 ✨ 你和所有登录用户都在同一个房间里。方向键 / WASD 移动，空格 / J 攻击。输入文字可改变自己的分身，大家都能看见。',
    },
  ]);
  const logRef = useRef<HTMLDivElement>(null);
  const { connected, remoteUsers, roomFull, retry, attack, myHitAt, selfAttackAt, setSelfAttackAt, myHp, myMp, myLevels, mySkillPoints, myStatus, scoreboard, castDenied, denyCast, healSelf, upgrade, sync, incomingSkills, clearIncoming, castSkillNow, reportHit } = useWorld({
    state,
    x: self.x,
    z: self.z,
    rotRef,
    movingRef,
  });
  const syncRef = useRef(sync);
  syncRef.current = sync;

  const myIdRef = useRef<string | undefined>(user?.id);
  myIdRef.current = user?.id;
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);
  const scheduledRef = useRef<Set<string>>(new Set());
  const [effects, setEffects] = useState<SkillCast[]>([]);

  // 自身状态引用，供循环 / cast 内同步读取（避免闭包拿到旧值）
  const myHpRef = useRef(myHp);
  myHpRef.current = myHp;
  const myMpRef = useRef(myMp);
  myMpRef.current = myMp;
  const myLevelsRef = useRef(myLevels);
  myLevelsRef.current = myLevels;
  const myStatusRef = useRef(myStatus);
  myStatusRef.current = myStatus;

  // 冷却：记录每个技能上次释放的“就绪时间戳”
  const cdRef = useRef<Record<string, number>>({});
  const [cdReady, setCdReady] = useState<Record<string, number>>({});
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => forceTick((n) => n + 1), 120);
    return () => window.clearInterval(t);
  }, []);

  // 技能：安排飞行/范围特效与命中判定（本地释放 + 收到他人广播都会调用，用 id 去重）
  const scheduleSkill = useCallback(
    (e: SkillCast) => {
      if (scheduledRef.current.has(e.id)) return;
      scheduledRef.current.add(e.id);
      const def = SKILL_BY_KEY[e.skill];
      const isHeal = e.skill === 'heal';
      const center: [number, number] =
        def.type === 'aoe' || def.type === 'heal'
          ? [e.x, e.z]
          : [e.x + Math.sin(e.rot) * def.range, e.z + Math.cos(e.rot) * def.range];
      const life = def.life;
      // 等级加成：每级 +25% 伤害/治疗
      const lvl = e.level ?? 1;
      const dmg = def.damage > 0 ? levelScale(def.damage, lvl) : 0;
      if (!isHeal && def.damage > 0) {
        window.setTimeout(() => {
          if (!aliveRef.current) return;
          // 不误伤施法者（旋风自伤已在 cast 端拦截，这里统一兜底）
          if (e.casterId === myIdRef.current && e.skill !== 'heal') return;
          const d = Math.hypot(center[0] - selfRef.current.x, center[1] - selfRef.current.z);
          if (d < def.radius) reportHit(dmg, e.casterId, e.skill);
        }, def.fly);
      }
      window.setTimeout(() => {
        if (!aliveRef.current) return;
        scheduledRef.current.delete(e.id);
        setEffects((prev) => prev.filter((x) => x.id !== e.id));
      }, life);
    },
    [reportHit],
  );

  const cast = useCallback(
    (skill: SkillKind) => {
      const def = SKILL_BY_KEY[skill];
      const now = Date.now();
      // 冷却中或已死亡 → 不释放
      if ((cdRef.current[skill] ?? 0) > now) return;
      if (myHpRef.current <= 0) return;
      // 蓝量不足 → 不释放并提示
      if (myMpRef.current < (MP_COST[skill] ?? 0)) {
        denyCast(skill);
        return;
      }
      cdRef.current[skill] = now + def.cd;
      setCdReady((prev) => ({ ...prev, [skill]: now + def.cd }));
      const s = selfRef.current;
      const id = `${myIdRef.current ?? 'me'}-${now}-${Math.random().toString(36).slice(2, 7)}`;
      const e: SkillCast = {
        id,
        skill,
        x: s.x,
        z: s.z,
        rot: s.rot,
        casterId: myIdRef.current ?? 'me',
        casterName: user?.username,
        castAt: now,
        level: myLevelsRef.current[skill] ?? 1,
      };
      setEffects((prev) => (prev.some((x) => x.id === e.id) ? prev : [...prev, e]));
      scheduleSkill(e);
      castSkillNow({ skill, x: s.x, z: s.z, rot: s.rot, id });
      setSelfAttackAt(now);
      if (def.heal > 0) healSelf(levelScale(def.heal, myLevelsRef.current[skill] ?? 1));
    },
    [scheduleSkill, castSkillNow, healSelf, user],
  );

  useEffect(() => {
    logRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' });
  }, [log]);

  // 键盘：移动 + 攻击
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      switch (e.key) {
        case '1':
          if (!e.repeat) cast('fireball');
          break;
        case '2':
          if (!e.repeat) cast('lightning');
          break;
        case '3':
          if (!e.repeat) cast('freeze');
          break;
        case '4':
          if (!e.repeat) cast('whirlwind');
          break;
        case '5':
          if (!e.repeat) cast('heal');
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          keys.current.up = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          keys.current.down = true;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          keys.current.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keys.current.right = true;
          break;
        case ' ':
        case 'j':
        case 'J':
        case 'f':
        case 'F':
          e.preventDefault();
          if (!e.repeat) attack();
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          keys.current.up = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          keys.current.down = false;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          keys.current.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keys.current.right = false;
          break;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [attack, cast]);

  // 蓝量不足 / 升级失败等提示由 useWorld 内部的 denyCast 自动清除

  // 移动循环：计算朝向 + 是否在动，并同步给房间（受减速状态影响）
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const k = keys.current;
      let dx = 0;
      let dz = 0;
      if (k.up) dz -= 1;
      if (k.down) dz += 1;
      if (k.left) dx -= 1;
      if (k.right) dx += 1;
      const moving = dx !== 0 || dz !== 0;
      const cur = selfRef.current;
      let { x, z, rot } = cur;
      if (moving) {
        // 被冰冻 / 旋风命中时移速降低
        const slowed = myStatusRef.current.until > Date.now();
        const speed = SPEED * (slowed ? myStatusRef.current.factor : 1);
        x = Math.max(-BOUND, Math.min(BOUND, x + dx * speed));
        z = Math.max(-BOUND, Math.min(BOUND, z + dz * speed));
        rot = Math.atan2(dx, dz);
      }
      if (x !== cur.x || z !== cur.z || moving !== cur.moving || rot !== cur.rot) {
        const next = { x, z, rot, moving };
        selfRef.current = next;
        setSelf(next);
        rotRef.current = rot;
        movingRef.current = moving;
        syncRef.current();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    const skill = parseSkill(text);
    if (skill) {
      cast(skill);
      const def = SKILL_BY_KEY[skill];
      setLog((l) => [
        ...l,
        { who: 'me', text },
        { who: 'sys', text: `${def.icon} ${def.heal > 0 ? '施放治疗术' : '释放了' + def.name + '！'}` },
      ]);
      setInput('');
      return;
    }
    const res = parseCommand(text, state);
    setState((s) => ({ ...s, ...res.state }));
    setLog((l) => [...l, { who: 'me', text }, { who: 'sys', text: res.message }]);
    setInput('');
  };

  const gotHit = myHitAt ? Date.now() - myHitAt < 350 : false;

  // 收到其他人的技能广播 → 加入本地特效列表（去重），并安排命中判定
  useEffect(() => {
    if (!incomingSkills.length) return;
    incomingSkills.forEach((e) => {
      setEffects((prev) => (prev.some((x) => x.id === e.id) ? prev : [...prev, e]));
      scheduleSkill(e);
    });
    clearIncoming();
  }, [incomingSkills, clearIncoming, scheduleSkill]);

  if (roomFull) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 bg-surface text-center">
        <div className="text-6xl">🚪</div>
        <div className="text-xl font-bold text-neutral-800">房间已满（上限 5 人）</div>
        <div className="max-w-xs text-sm text-neutral-500">
          当前已有 5 位用户在线，无法进入。请等待有人退出后，刷新页面重试。
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            刷新重试
          </button>
          <Link
            to="/"
            className="flex items-center rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* 3D 画布 */}
      <div className="relative flex-1">
        <WorldScene
          state={state}
          selfPos={self}
          selfUsername={user?.username}
          remoteUsers={remoteUsers}
          myHp={myHp}
          myStatus={myStatus}
          myHitAt={myHitAt}
          selfAttackAt={selfAttackAt}
          selfRot={self.rot}
          selfMoving={self.moving}
          effects={effects}
        />
        <Link
          to="/"
          className="absolute left-4 top-4 rounded-lg bg-white/80 px-3 py-1.5 text-sm text-neutral-700 shadow backdrop-blur transition-colors hover:bg-white"
        >
          ← 退出
        </Link>
        <div className="absolute right-4 top-4 flex items-center gap-2 rounded-lg bg-white/80 px-3 py-1.5 text-xs text-neutral-500 shadow backdrop-blur">
          {connected ? (
            <span className="h-2 w-2 rounded-full bg-green-500" />
          ) : (
            <button
              onClick={retry}
              className="h-2 w-2 rounded-full bg-red-500 hover:bg-red-600"
              title="点击重连"
            />
          )}
          <span>
            在线 {remoteUsers.length + 1} · 形态：{ANIMAL_LABELS[state.shape] ?? state.shape} · 场景：
            {state.background}
          </span>
        </div>

        {/* 操作提示 */}
        <div className="absolute bottom-4 left-4 rounded-lg bg-black/45 px-3 py-2 text-[11px] leading-relaxed text-white/90 shadow backdrop-blur">
          <div>🎮 方向键 / WASD 移动（分身会朝移动方向转身）· 空格 / J / F 攻击</div>
          <div>✨ 按 1~5 释放技能（火球/雷电/冰冻/旋风/治疗），也可输入中文释放</div>
          <div>⬆️ 技能栏上的 ▲ 消耗技能点升级（击杀或随时间获得）</div>
          <div>💬 下方输入文字可变成猫/狗、变大、跳舞…</div>
        </div>

        {/* 蓝量不足 / 升级失败 提示 */}
        {castDenied && (
          <div className="pointer-events-none absolute inset-x-0 top-1/4 text-center text-lg font-bold text-sky-300 drop-shadow">
            {castDenied === 'points'
              ? '⚠️ 技能点不足'
              : castDenied.endsWith(':max')
                ? '⚠️ 已是满级'
                : '⚠️ 蓝量不足'}
          </div>
        )}

        {/* 技能栏 */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {SKILLS.map((s) => {
            const readyAt = cdReady[s.kind] ?? 0;
            const remain = Math.max(0, readyAt - Date.now());
            const pct = readyAt > 0 ? remain / s.cd : 0;
            const dead = myHp <= 0;
            const noMp = myMp < (MP_COST[s.kind] ?? 0);
            const disabled = remain > 0 || dead || noMp;
            const lvl = myLevels[s.kind] ?? 1;
            const canUpgrade = mySkillPoints >= 1 && lvl < MAX_SKILL_LEVEL && !dead;
            return (
              <div
                key={s.kind}
                className="relative"
                title={`${s.name}（按 ${s.key}）· 蓝耗 ${MP_COST[s.kind] ?? 0} · 等级 Lv.${lvl}`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => cast(s.kind)}
                  className={`relative h-14 w-14 overflow-hidden rounded-xl border bg-black/45 text-center text-white shadow backdrop-blur transition-transform ${
                    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-105 active:scale-95'
                  }`}
                >
                  <span className="block text-xl leading-none">{s.icon}</span>
                  <span className="mt-0.5 block text-[10px] leading-none">{s.name}</span>
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] text-white/70">
                    {s.key}
                  </span>
                  <span className="absolute right-0.5 top-0.5 rounded bg-black/55 px-1 text-[8px] leading-tight text-amber-300">
                    Lv.{lvl}
                  </span>
                  {remain > 0 && (
                    <span
                      className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white"
                      style={{ height: `${pct * 100}%` }}
                    />
                  )}
                </button>
                {/* 升级按钮 */}
                <button
                  type="button"
                  disabled={!canUpgrade}
                  onClick={() => upgrade(s.kind)}
                  title="消耗 1 技能点升级"
                  className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] leading-none shadow ${
                    canUpgrade
                      ? 'cursor-pointer border-amber-300 bg-amber-400 text-black hover:bg-amber-300'
                      : 'cursor-not-allowed border-white/20 bg-black/50 text-white/40'
                  }`}
                >
                  ▲
                </button>
              </div>
            );
          })}
        </div>

        {/* 自身血条 + 蓝条 + 技能点 */}
        <div className="absolute left-4 top-16 w-44 rounded-lg bg-black/45 px-3 py-2 text-white shadow backdrop-blur">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="truncate">{user?.username ?? '我'}</span>
            <span className="tabular-nums">{Math.max(0, Math.round(myHp))}/{MAX_HP}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${Math.max(0, Math.min(100, (myHp / MAX_HP) * 100))}%`,
                background: myHp > 50 ? '#22c55e' : myHp > 25 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <div className="mb-1 mt-2 flex items-center justify-between text-[11px]">
            <span className="truncate">蓝量</span>
            <span className="tabular-nums">{Math.max(0, Math.round(myMp))}/{MAX_MP}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-sky-400 transition-[width] duration-200"
              style={{ width: `${Math.max(0, Math.min(100, (myMp / MAX_MP) * 100))}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-amber-300">技能点 ★ {mySkillPoints}</span>
            {myStatus.until > Date.now() && (
              <span className="text-sky-300">
                {myStatus.skill === 'freeze' ? '❄️减速' : myStatus.skill === 'whirlwind' ? '🌀减速' : '减速'}
              </span>
            )}
          </div>
        </div>

        {/* 击杀计分板 */}
        <div className="absolute right-4 top-16 w-52 rounded-lg bg-black/45 px-3 py-2 text-white shadow backdrop-blur">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
            <span>🏆 击杀榜</span>
            <span className="text-white/60">{scoreboard.length} 人</span>
          </div>
          <div className="max-h-44 space-y-0.5 overflow-y-auto pr-1 text-[11px]">
            {scoreboard.length === 0 && <div className="text-white/50">暂无数据</div>}
            {scoreboard.map((row, i) => (
              <div
                key={row.userId}
                className={`flex items-center justify-between rounded px-1 ${
                  row.userId === user?.id ? 'bg-white/15' : ''
                }`}
              >
                <span className="truncate">
                  <span className="mr-1 text-white/50">{i + 1}</span>
                  {row.username}
                </span>
                <span className="tabular-nums text-white/80">
                  {row.kills}杀/{row.deaths}死 · {row.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 被打中提示 */}
        {gotHit && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-2xl font-extrabold text-red-500 drop-shadow">
            💥 被打中了！
          </div>
        )}

        {/* 死亡遮罩 */}
        {myHp <= 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-center text-white">
            <div className="text-6xl">💀</div>
            <div className="mt-2 text-xl font-bold">你被击败了</div>
            <div className="mt-1 text-sm text-white/80">3 秒后复活…</div>
          </div>
        )}
      </div>

      {/* 对话区 */}
      <div className="border-t border-line bg-surface">
        <div
          ref={logRef}
          className="max-h-40 space-y-1 overflow-y-auto px-4 py-2 text-sm"
        >
          {log.map((m, i) => (
            <div key={i} className={m.who === 'me' ? 'text-right' : 'text-left'}>
              <span
                className={
                  m.who === 'me'
                    ? 'inline-block rounded-lg bg-brand-600 px-3 py-1.5 text-white'
                    : 'inline-block rounded-lg bg-neutral-100 px-3 py-1.5 text-neutral-700'
                }
              >
                {m.text}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="说点什么，例如：变成一只猫 / 变大 / 跳舞 / 夜晚"
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-800 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
          />
          <button
            type="button"
            onClick={submit}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 cursor-pointer"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
