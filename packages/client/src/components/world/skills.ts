import type { SkillKind } from '../../api/worldSocket';

export type SkillType = 'projectile' | 'instant' | 'aoe' | 'heal';

export interface SkillDef {
  kind: SkillKind;
  key: string; // 键盘数字键
  name: string; // 中文名
  icon: string; // emoji
  cd: number; // 冷却时间 ms
  type: SkillType;
  damage: number; // 对范围内敌人造成的伤害（heal 为 0）
  heal: number; // 对施法者自身回血（其他为 0）
  range: number; // 飞行距离（projectile）或落点距离（0 表示自身周围）
  radius: number; // 命中半径
  fly: number; // 命中判定延迟 ms
  life: number; // 特效总存在时间 ms
  color: string; // 主色调
}

export const SKILLS: SkillDef[] = [
  { kind: 'fireball', key: '1', name: '火球术', icon: '🔥', cd: 1500, type: 'projectile', damage: 25, heal: 0, range: 9, radius: 3.6, fly: 1200, life: 1700, color: '#ff7a00' },
  { kind: 'lightning', key: '2', name: '雷电', icon: '⚡', cd: 1800, type: 'instant', damage: 22, heal: 0, range: 5, radius: 3.6, fly: 220, life: 760, color: '#fde047' },
  { kind: 'freeze', key: '3', name: '冰冻', icon: '❄️', cd: 2000, type: 'projectile', damage: 18, heal: 0, range: 9, radius: 3.6, fly: 1100, life: 1600, color: '#7dd3fc' },
  { kind: 'whirlwind', key: '4', name: '旋风', icon: '🌀', cd: 2200, type: 'aoe', damage: 16, heal: 0, range: 0, radius: 3.5, fly: 0, life: 1200, color: '#a3e635' },
  { kind: 'heal', key: '5', name: '治疗', icon: '💚', cd: 4000, type: 'heal', damage: 0, heal: 35, range: 0, radius: 0, fly: 0, life: 1200, color: '#4ade80' },
];

export const SKILL_BY_KEY: Record<string, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.kind, s]),
);

export const MAX_HP = 100;
export const MAX_MP = 100;
export const MAX_SKILL_LEVEL = 5;

// 释放技能所需蓝量（需与后端 MP_COST 保持一致）
export const MP_COST: Record<string, number> = {
  fireball: 15,
  lightning: 12,
  freeze: 18,
  whirlwind: 22,
  heal: 25,
};

// 技能等级加成：每级在基础值上 +25%
export function levelScale(base: number, level: number): number {
  return Math.round(base * (1 + (level - 1) * 0.25));
}
