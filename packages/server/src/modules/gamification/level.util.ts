/** 等级计算工具：积分线性换算等级，每 100 积分升 1 级 */
export const POINTS_PER_LEVEL = 100;

export interface LevelInfo {
  level: number;
  exp: number; // 当前等级内的经验（积分余数）
  expToNext: number; // 升到下一级所需经验
}

export function computeLevel(points: number): LevelInfo {
  const safe = Math.max(0, Math.floor(points));
  const level = Math.floor(safe / POINTS_PER_LEVEL) + 1;
  const exp = safe % POINTS_PER_LEVEL;
  const expToNext = POINTS_PER_LEVEL - exp;
  return { level, exp, expToNext };
}
