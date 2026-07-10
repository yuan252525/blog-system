export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  icon: string; // emoji 图标
}

/** 系统内置徽章定义（种子数据） */
export const BADGES: BadgeDef[] = [
  { key: 'first_post', name: '初出茅庐', description: '发布第一篇公开文章', icon: '✍️' },
  { key: 'first_comment', name: '畅所欲言', description: '发表第一条评论', icon: '💬' },
  { key: 'checkin_7', name: '周常打卡', description: '连续签到 7 天', icon: '🔥' },
  { key: 'checkin_30', name: '月常打卡', description: '连续签到 30 天', icon: '🌟' },
  { key: 'points_500', name: '崭露头角', description: '积分达到 500', icon: '🥉' },
  { key: 'points_2000', name: '小有名气', description: '积分达到 2000', icon: '🥇' },
];

export const BADGE_KEYS = BADGES.map((b) => b.key);
