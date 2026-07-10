/** 积分奖励常量（供 posts / comments 等服务复用） */
export const GAMIFICATION_POINTS = {
  CHECKIN_BASE: 10, // 每日签到基础积分
  POST: 50, // 发布一篇公开文章
  COMMENT: 5, // 发表一条评论
} as const;
