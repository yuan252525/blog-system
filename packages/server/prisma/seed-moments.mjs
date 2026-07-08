// 朋友圈 AI 主题种子数据：灌入 200 条带文字和图片的朋友圈动态，
// 由多个随机用户发布，并为每条动态生成随机的点赞与评论互动。
// 直接基于 pg 原生 SQL 写入，避免依赖生成的 Prisma client（其为 .ts，需 TS 运行器）。
// 运行方式（在 packages/server 目录下）： node prisma/seed-moments.mjs
import 'dotenv/config';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL 未设置，请在 packages/server/.env 中配置');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl, max: 5 });

const TOPICS = [
  '今天试用了一款新的开源大模型，推理速度比上个月快了不少，本地部署也能跑得很顺。',
  '用 RAG 把公司几百份文档接进了问答系统，回答准确率提升明显，幻觉也少了很多。',
  '看了篇关于 Agent 编排的论文，多智能体分工协作的思路真的很适合复杂任务拆解。',
  '把 ComfyUI 工作流接到了业务里，文生图出图效率直接翻倍。',
  '微调了一个垂直领域的小模型，参数量不大但效果意外地好。',
  '今天聊了聊向量数据库选型，Milvus、Qdrant、PGVector 各有取舍。',
  '用 Whisper 做了个会议转写工具，中文识别效果相当能打。',
  'Prompt 工程还是值得花时间，几句话的差别就能让模型输出质量天差地别。',
  '端侧大模型越来越成熟了，手机上跑 3B 模型做离线助手完全可行。',
  '搭了个多模态检索，图片+文字一起搜，体验比单纯关键词好太多。',
  '今天研究了一下模型量化，INT4 之后显存占用直接砍半，速度还更快。',
  '用 LangChain 串了一个自动化日报生成流程，每天省下不少重复劳动。',
  'Diffusion 模型出图控度越来越精细，ControlNet 真的好用。',
  '看了推理模型的新进展，链式思考让数学和代码能力上了个台阶。',
  '把 AI 客服接到了工单系统，常见问题自动回复率过了七成。',
  '今天跑了下评测集，新模型在代码补全上比我预期强。',
  '用 TTS 做了个有声内容生成，音色自然度已经很难分辨真假了。',
  '研究了一下模型蒸馏，大模型的知识压缩到小模型里效果保留得不错。',
  '用 Embeddings 做了相似文章推荐，点击率比规则推荐高了一截。',
  '今天把本地知识库和对话助手打通了，问答终于有“据”可依。',
  '试了试 AI 辅助写 SQL，复杂查询几秒出结果，直呼真香。',
  '多模态理解现在连图表都能读懂，丢张截图就能帮你分析趋势。',
  '用 Stable Diffusion 做了套运营配图，产出速度起飞。',
  '今天聊了 AI 伦理，模型偏见和可解释性还是绕不开的课题。',
  '把语音、文本、图像三个模型拼到一起，做个全模态小助理玩玩。',
];

const REFLECTIONS = [
  '感觉 AI 真正值钱的地方，是把重复劳动替掉，让人专注在判断和创意上。',
  '工具再强也得落到具体场景，脱离业务的炫技很难长期存活。',
  '最近越来越觉得，会用 AI 的人和不会用的人，效率差距在肉眼可见地拉开。',
  '模型能力趋同之后，数据、工作流和场景才是真正的护城河。',
  '别神话它，也别无视它，把它当成一个靠谱但不完美的同事最合适。',
  '小步快跑、持续迭代，比一次追求完美方案要实在得多。',
  '开源和闭源各有优势，关键看团队能力和合规要求。',
  '最重要的是先跑起来，在真实使用里收集反馈再优化。',
];

const COMMENTS = [
  '太强了，求教程！',
  '这个我也试过，确实好用',
  '收藏了，回头研究一下',
  '请问用的什么显卡？',
  '本地部署的话显存够吗？',
  '哈哈，跟我最近的想法一样',
  '已转发给团队，一起看看',
  '这个方案稳吗？生产环境用过吗？',
  '期待你后续分享更多',
  '学到了，谢谢博主',
  '我们也在做类似的事，可以交流',
  '图很赞，配色舒服',
  '这个思路可以借鉴到我们项目里',
  '有开源地址吗？想跟着跑一遍',
];

// 多个随机用户，让朋友圈看起来是不同人发的
const USERS = [
  { username: 'AI探索者', email: 'ai.explorer@example.com' },
  { username: '模型炼丹师', email: 'alchemist@example.com' },
  { username: '算力搬运工', email: 'compute@example.com' },
  { username: 'Prompt魔法师', email: 'prompt.mage@example.com' },
  { username: '向量空间', email: 'vector@example.com' },
  { username: '端侧玩家', email: 'edge.player@example.com' },
  { username: '多模态控', email: 'multimodal@example.com' },
  { username: 'Agent架构师', email: 'agent.arch@example.com' },
  { username: '推理加速', email: 'infer.boost@example.com' },
  { username: '知识库管家', email: 'kb.butler@example.com' },
  { username: '文生图爱好者', email: 'txt2img@example.com' },
  { username: '开源信徒', email: 'oss.believer@example.com' },
  { username: '调参侠', email: 'tuner@example.com' },
  { username: '边缘智能', email: 'edge.ai@example.com' },
];

const passwordHash = await bcrypt.hash('ai123456', 10);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function buildContent() {
  const text = pick(TOPICS);
  if (Math.random() < 0.6) return `${text}\n\n${pick(REFLECTIONS)}`;
  return text;
}

function buildImages(i) {
  const r = Math.random();
  let count = 0;
  if (r >= 0.35) count = Math.min(1 + Math.floor(Math.random() * 9), 9);
  const images = [];
  for (let j = 0; j < count; j++) {
    images.push(`https://picsum.photos/seed/ai-moment-${i}-${j}/800/600`);
  }
  return images;
}

async function main() {
  // 1. 确保种子用户存在，收集其 id
  const userIds = [];
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const exist = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
    if (exist.rows.length > 0) {
      userIds.push(exist.rows[0].id);
    } else {
      const ins = await pool.query(
        `INSERT INTO users (id, username, email, password_hash, avatar, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now()) RETURNING id`,
        [randomUUID(), u.username, u.email, passwordHash, `https://i.pravatar.cc/150?u=${encodeURIComponent(u.username)}`],
      );
      userIds.push(ins.rows[0].id);
      console.log('已创建种子用户:', u.username);
    }
  }
  console.log(`种子用户就绪，共 ${userIds.length} 位`);

  // 2. 幂等：清掉这些用户已有的种子动态（级联删除其点赞/评论）
  const del = await pool.query('DELETE FROM moments WHERE author_id = ANY($1)', [userIds]);
  if (del.rowCount > 0) console.log(`已清理旧的种子动态 ${del.rowCount} 条`);

  // 3. 生成 200 条动态，随机分配给不同用户，时间倒序铺开
  const TOTAL = 200;
  const BATCH = 50;
  const moments = [];
  for (let i = 0; i < TOTAL; i++) {
    const createdAt = new Date(Date.now() - i * 37 * 60 * 1000);
    moments.push({
      id: randomUUID(),
      content: buildContent(),
      images: buildImages(i),
      authorId: pick(userIds),
      createdAt,
    });
  }
  for (let start = 0; start < TOTAL; start += BATCH) {
    const end = Math.min(start + BATCH, TOTAL);
    const values = [];
    const params = [];
    let p = 1;
    for (let i = start; i < end; i++) {
      const m = moments[i];
      values.push(`($${p++}, $${p++}, $${p++}::text[], $${p++}, $${p++}, $${p++})`);
      params.push(m.id, m.content, m.images, m.authorId, m.createdAt, m.createdAt);
    }
    await pool.query(
      `INSERT INTO moments (id, content, images, author_id, created_at, updated_at) VALUES ${values.join(', ')}`,
      params,
    );
    console.log(`已写入动态 ${end}/${TOTAL}`);
  }

  // 4. 为每条动态生成随机点赞（1~8 个，排除作者本人，去重）
  const likeRows = [];
  for (const m of moments) {
    const others = userIds.filter((id) => id !== m.authorId);
    const n = 1 + Math.floor(Math.random() * Math.min(8, others.length));
    const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, n);
    for (const uid of shuffled) {
      likeRows.push({ id: randomUUID(), momentId: m.id, userId: uid });
    }
  }
  for (let s = 0; s < likeRows.length; s += BATCH) {
    const end = Math.min(s + BATCH, likeRows.length);
    const values = [];
    const params = [];
    let p = 1;
    for (let i = s; i < end; i++) {
      const l = likeRows[i];
      values.push(`($${p++}, $${p++}, $${p++})`);
      params.push(l.id, l.momentId, l.userId);
    }
    await pool.query(
      `INSERT INTO moment_likes (id, moment_id, user_id) VALUES ${values.join(', ')}`,
      params,
    );
  }
  console.log(`已写入点赞 ${likeRows.length} 条`);

  // 5. 为每条动态生成随机评论（0~5 条，评论者随机）
  const commentRows = [];
  for (const m of moments) {
    const n = Math.floor(Math.random() * 6);
    for (let k = 0; k < n; k++) {
      commentRows.push({
        id: randomUUID(),
        momentId: m.id,
        userId: pick(userIds),
        content: pick(COMMENTS),
        createdAt: new Date(m.createdAt.getTime() + (k + 1) * 60 * 1000),
      });
    }
  }
  for (let s = 0; s < commentRows.length; s += BATCH) {
    const end = Math.min(s + BATCH, commentRows.length);
    const values = [];
    const params = [];
    let p = 1;
    for (let i = s; i < end; i++) {
      const c = commentRows[i];
      values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
      params.push(c.id, c.momentId, c.userId, c.content, c.createdAt, c.createdAt);
    }
    await pool.query(
      `INSERT INTO moment_comments (id, moment_id, user_id, content, created_at, updated_at) VALUES ${values.join(', ')}`,
      params,
    );
  }
  console.log(`已写入评论 ${commentRows.length} 条`);

  const c = await pool.query(
    'SELECT (SELECT count(*) FROM moments) AS m, (SELECT count(*) FROM moment_likes) AS l, (SELECT count(*) FROM moment_comments) AS c',
  );
  const r = c.rows[0];
  console.log(`完成！moments=${r.m}  likes=${r.l}  comments=${r.c}`);
}

main()
  .catch((e) => {
    console.error('种子脚本失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
