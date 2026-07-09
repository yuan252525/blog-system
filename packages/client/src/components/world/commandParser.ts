export type ShapeKind =
  | 'human'
  | 'cat'
  | 'dog'
  | 'rabbit'
  | 'fox'
  | 'bear'
  | 'pig'
  | 'penguin'
  | 'tree'
  | 'ball'
  | 'cube'
  | 'star'
  | 'robot';

// 可随机分配的小动物（进入世界时随机变换用）
export const ANIMAL_SHAPES: ShapeKind[] = [
  'cat',
  'dog',
  'rabbit',
  'fox',
  'bear',
  'pig',
  'penguin',
];

export const ANIMAL_LABELS: Partial<Record<ShapeKind, string>> = {
  human: '小人',
  cat: '小猫',
  dog: '小狗',
  rabbit: '小兔',
  fox: '狐狸',
  bear: '小熊',
  pig: '小猪',
  penguin: '企鹅',
  tree: '树',
  ball: '球',
  cube: '方块',
  star: '星星',
  robot: '机器人',
};

const ANIMAL_COLORS = [
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#f97316',
  '#8b5cf6',
  '#0ea5e9',
  '#84cc16',
];

export function randomAnimal(): AvatarState {
  const shape = ANIMAL_SHAPES[Math.floor(Math.random() * ANIMAL_SHAPES.length)];
  const color = ANIMAL_COLORS[Math.floor(Math.random() * ANIMAL_COLORS.length)];
  const scale = +(0.9 + Math.random() * 0.4).toFixed(2); // 0.9 ~ 1.3
  return { shape, color, scale, action: 'idle', background: 'day' };
}

export type ActionKind = 'idle' | 'jump' | 'spin' | 'dance' | 'wave';

export type BgKind = 'day' | 'night' | 'space';

export interface AvatarState {
  shape: ShapeKind;
  color: string;
  scale: number;
  action: ActionKind;
  background: BgKind;
}

export const DEFAULT_STATE: AvatarState = {
  shape: 'human',
  color: '#6366f1',
  scale: 1,
  action: 'idle',
  background: 'day',
};

const COLOR_MAP: Record<string, string> = {
  红: '#ef4444',
  蓝: '#3b82f6',
  绿: '#22c55e',
  金: '#f59e0b',
  黄: '#eab308',
  紫: '#a855f7',
  粉: '#ec4899',
  黑: '#1f2937',
  白: '#f8fafc',
  彩虹: 'rainbow',
};

const SHAPE_MAP: Record<string, ShapeKind> = {
  猫: 'cat',
  喵: 'cat',
  cat: 'cat',
  狗: 'dog',
  汪: 'dog',
  dog: 'dog',
  兔: 'rabbit',
  兔子: 'rabbit',
  rabbit: 'rabbit',
  狐狸: 'fox',
  狐: 'fox',
  fox: 'fox',
  熊: 'bear',
  小熊: 'bear',
  bear: 'bear',
  猪: 'pig',
  小猪: 'pig',
  pig: 'pig',
  企鹅: 'penguin',
  penguin: 'penguin',
  树: 'tree',
  tree: 'tree',
  球: 'ball',
  ball: 'ball',
  方块: 'cube',
  盒子: 'cube',
  箱: 'cube',
  cube: 'cube',
  星: 'star',
  star: 'star',
  机器人: 'robot',
  robot: 'robot',
  人: 'human',
  恢复: 'human',
  human: 'human',
};

const ACTION_MAP: Record<string, ActionKind> = {
  跳: 'jump',
  jump: 'jump',
  转: 'spin',
  旋转: 'spin',
  spin: 'spin',
  跳舞: 'dance',
  舞: 'dance',
  dance: 'dance',
  挥手: 'wave',
  招手: 'wave',
  wave: 'wave',
  停: 'idle',
  idle: 'idle',
};

const BG_MAP: Record<string, BgKind> = {
  白天: 'day',
  白昼: 'day',
  day: 'day',
  夜晚: 'night',
  晚上: 'night',
  夜: 'night',
  night: 'night',
  星空: 'space',
  太空: 'space',
  宇宙: 'space',
  space: 'space',
};

export type SkillKind = 'fireball' | 'lightning';

const SKILL_WORDS: Record<string, SkillKind> = {
  火球: 'fireball',
  火球术: 'fireball',
  炎弹: 'fireball',
  fireball: 'fireball',
  雷电: 'lightning',
  闪电: 'lightning',
  雷击: 'lightning',
  雷: 'lightning',
  lightning: 'lightning',
  thunder: 'lightning',
  冰冻: 'freeze',
  冰: 'freeze',
  冰弹: 'freeze',
  霜: 'freeze',
  freeze: 'freeze',
  旋风: 'whirlwind',
  风: 'whirlwind',
  龙卷风: 'whirlwind',
  龙卷: 'whirlwind',
  whirlwind: 'whirlwind',
  治疗: 'heal',
  回血: 'heal',
  奶: 'heal',
  加血: 'heal',
  heal: 'heal',
};

export function parseSkill(inputRaw: string): SkillKind | null {
  const input = inputRaw.trim();
  const lower = input.toLowerCase();
  return SKILL_WORDS[input] ?? SKILL_WORDS[lower] ?? null;
}

export const HELP = `可用指令（也可直接说中文）：
· 变成 → 猫 / 狗 / 兔 / 狐狸 / 熊 / 猪 / 企鹅 / 树 / 球 / 方块 / 星星 / 机器人 / 人
· 颜色 → 红 蓝 绿 金 黄 紫 粉 黑 白 彩虹
· 大小 → 变大 / 变小 / 巨大 / 还原大小
· 动作 → 跳舞 / 跳跃 / 旋转 / 挥手 / 停下
· 场景 → 白天 / 夜晚 / 星空
· 技能 → 按 1 火球 / 2 雷电 / 3 冰冻 / 4 旋风 / 5 治疗（或输入对应中文）
· 指令 → /help  /reset  /dance  /jump  /spin  /bg night /fireball /lightning`;

export interface ParseResult {
  state: Partial<AvatarState>;
  message: string;
}

export function parseCommand(inputRaw: string, current: AvatarState): ParseResult {
  const input = inputRaw.trim();
  const lower = input.toLowerCase();
  const patch: Partial<AvatarState> = {};
  const msgs: string[] = [];

  // ---- 斜杠指令 ----
  if (input.startsWith('/')) {
    const [cmd, ...rest] = lower.split(/\s+/);
    const arg = rest.join(' ');
    switch (cmd) {
      case '/help':
        return { state: {}, message: HELP };
      case '/reset': {
        const r = randomAnimal();
        return {
          state: { ...r, background: current.background },
          message: `已随机变成一只小动物 ✨（${ANIMAL_LABELS[r.shape] ?? r.shape}）`,
        };
      }
      case '/dance':
        patch.action = 'dance';
        msgs.push('开始跳舞 💃');
        break;
      case '/jump':
        patch.action = 'jump';
        msgs.push('跳！');
        break;
      case '/spin':
        patch.action = 'spin';
        msgs.push('旋转～');
        break;
      case '/wave':
        patch.action = 'wave';
        msgs.push('挥手 👋');
        break;
      case '/idle':
        patch.action = 'idle';
        msgs.push('停下');
        break;
      case '/become': {
        const found = (Object.keys(SHAPE_MAP) as string[]).find((k) => k === arg);
        const byVal = (Object.values(SHAPE_MAP) as ShapeKind[]).find((v) => v === arg);
        if (found) {
          patch.shape = SHAPE_MAP[found];
          msgs.push(`变成 ${found}`);
        } else if (byVal) {
          patch.shape = byVal;
          msgs.push(`变成 ${arg}`);
        } else {
          msgs.push('不认识这个形态，试试：猫/狗/树/球/方块/星星/机器人/人');
        }
        break;
      }
      case '/color': {
        const col = COLOR_MAP[arg] ?? (arg.startsWith('#') ? arg : undefined);
        if (col) {
          patch.color = col;
          msgs.push(`颜色 ${arg}`);
        } else {
          msgs.push('颜色不认识');
        }
        break;
      }
      case '/bg': {
        const bg = BG_MAP[arg];
        if (bg) {
          patch.background = bg;
          msgs.push(`场景 ${arg}`);
        } else {
          msgs.push('场景不认识');
        }
        break;
      }
      case '/big':
        patch.scale = Math.min(3, current.scale * 1.4);
        msgs.push('变大');
        break;
      case '/small':
        patch.scale = Math.max(0.3, current.scale * 0.7);
        msgs.push('变小');
        break;
      default:
        msgs.push('未知指令，输入 /help 查看');
    }
    return { state: patch, message: msgs.join('，') };
  }

  // ---- 自然语言关键词 ----
  for (const key of Object.keys(SHAPE_MAP)) {
    if (lower.includes(key.toLowerCase()) || input.includes(key)) {
      patch.shape = SHAPE_MAP[key];
      msgs.push(`变成了${key}`);
      break;
    }
  }
  for (const key of Object.keys(COLOR_MAP)) {
    if (input.includes(key)) {
      patch.color = COLOR_MAP[key];
      msgs.push(`染成${key}色`);
      break;
    }
  }
  if (input.includes('巨大') || input.includes('超大')) {
    patch.scale = 2.2;
    msgs.push('变得巨大');
  } else if (input.includes('变大') || input.includes('大一点') || input.includes('大些')) {
    patch.scale = Math.min(3, current.scale * 1.4);
    msgs.push('变大一点');
  } else if (
    input.includes('变小') ||
    input.includes('迷你') ||
    input.includes('小一点') ||
    input.includes('小些')
  ) {
    patch.scale = Math.max(0.3, current.scale * 0.7);
    msgs.push('变小一点');
  } else if (input.includes('还原大小') || input.includes('正常大小')) {
    patch.scale = 1;
    msgs.push('恢复大小');
  }
  for (const key of Object.keys(ACTION_MAP)) {
    if (input.includes(key)) {
      patch.action = ACTION_MAP[key];
      msgs.push(`开始${key}`);
      break;
    }
  }
  for (const key of Object.keys(BG_MAP)) {
    if (input.includes(key)) {
      patch.background = BG_MAP[key];
      msgs.push(`切换到${key}`);
      break;
    }
  }
  if (input.includes('停') || input.includes('停止')) {
    patch.action = 'idle';
  }

  if (msgs.length === 0) {
    return {
      state: {},
      message: '唔…没太听懂 🤔 试试「变成一只猫」「变大」「跳舞」或输入 /help',
    };
  }
  return { state: patch, message: msgs.join('，') };
}
