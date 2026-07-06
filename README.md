# Blog System

一个功能完整的现代化博客系统，基于 **NestJS + React + PostgreSQL** 全栈架构，支持 Docker 一键部署。

[![Tech Stack](https://img.shields.io/badge/stack-NestJS%20%2B%20React%20%2B%20PostgreSQL-blue)](https://github.com/yuan252525/blog-system)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ 功能特性

### 🔐 用户系统
- **JWT 认证** — 注册、登录、登出（Token 黑名单机制）
- **个人中心** — 查看/编辑个人资料、头像、简介
- **权限控制** — 公开浏览 + 登录后可评论、点赞、管理文章

### 📝 内容管理
- **Markdown 编辑器** — 支持 GFM 语法、代码高亮、实时预览
- **文章管理** — 创建、编辑、删除，草稿/发布/归档三态流转
- **分类 & 标签** — 多分类、多标签，侧边栏筛选
- **封面图** — 支持上传（MinIO 对象存储，分片上传 + 断点续传）
- **图片懒加载** — 基于 IntersectionObserver，滚动到视口附近才请求图片

### 💬 社交互动
- **评论系统** — 支持嵌套回复（二级评论）
- **点赞** — 文章点赞 + 评论点赞，去重控制
- **实时通知** — WebSocket 推送（评论回复、点赞通知），站内通知中心

### 🌍 国际化
- **中/英双语** — ~144 个翻译键覆盖全部 UI，一键切换
- **响应式设计** — 移动端 + 桌面端自适应

### 📊 技术亮点
- **分页 & 搜索** — 后端分页，支持标题搜索和标签过滤
- **阅读计数** — 基于 IP 去重（5 分钟窗口）
- **阅读时间估算** — 根据内容字数自动计算
- **Redis 缓存** — 会话管理 + 热度缓存
- **懒加载图片** — IntersectionObserver + loading="lazy" 双重保障

---

## 🏗️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React 19 + TypeScript | Vite 8 构建，严格模式 |
| | Tailwind CSS v4 | oklch 设计令牌，原子化 CSS |
| | React Router v7 | 客户端路由，路由守卫 |
| | React Hook Form + Zod | 表单验证 |
| | Zustand | 轻量状态管理 |
| | Socket.io Client | 实时通知 WebSocket |
| | React Markdown + rehype-highlight | Markdown 渲染 + 代码高亮 |
| **后端** | NestJS 11 + TypeScript | 模块化架构，严格模式 |
| | Prisma ORM | 数据库迁移、类型安全查询 |
| | PostgreSQL 16 | 主数据库 |
| | Redis 7 | 缓存 + 会话管理 |
| | MinIO | 对象存储（图片上传） |
| | Socket.io | WebSocket 实时推送 |
| | Passport + JWT | 认证鉴权 |
| | Swagger | API 文档自动生成 |
| **运维** | Docker + Docker Compose | 一键部署，开发/生产双配置 |
| | Nginx | 前端静态托管 + 反向代理 |
| | Shell 脚本 | 备份恢复、阿里云部署 |

---

## 📁 项目结构

```
blog-system/
├── packages/
│   ├── client/                 # React 前端
│   │   ├── src/
│   │   │   ├── api/            # API 请求层 (axios)
│   │   │   ├── components/     # 公共组件
│   │   │   │   ├── LazyImage.tsx        # 图片懒加载
│   │   │   │   ├── MarkdownRenderer.tsx # Markdown 渲染
│   │   │   │   ├── CommentSection.tsx   # 评论组件
│   │   │   │   ├── LikeButton.tsx       # 点赞按钮
│   │   │   │   ├── ImageUploader/       # 图片上传器
│   │   │   │   └── ...
│   │   │   ├── pages/          # 页面组件
│   │   │   │   ├── HomePage.tsx         # 首页
│   │   │   │   ├── LoginPage.tsx        # 登录
│   │   │   │   ├── RegisterPage.tsx     # 注册
│   │   │   │   ├── ProfilePage.tsx      # 个人中心
│   │   │   │   ├── NotificationsPage.tsx # 通知中心
│   │   │   │   ├── posts/
│   │   │   │   │   ├── PostDetailPage.tsx  # 文章详情
│   │   │   │   │   └── CategoryPage.tsx    # 分类页
│   │   │   │   └── admin/
│   │   │   │       ├── AdminPostsPage.tsx  # 文章管理
│   │   │   │       ├── CreatePostPage.tsx  # 创建文章
│   │   │   │       └── EditPostPage.tsx    # 编辑文章
│   │   │   ├── i18n/           # 国际化
│   │   │   ├── hooks/          # 自定义 Hook
│   │   │   └── types/          # TypeScript 类型
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   │
│   └── server/                 # NestJS 后端
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/           # 认证模块 (注册/登录/资料)
│       │   │   ├── posts/          # 文章模块 (CRUD/搜索/关联推荐)
│       │   │   ├── categories/     # 分类模块
│       │   │   ├── tags/           # 标签模块
│       │   │   ├── comments/       # 评论模块 (嵌套回复/点赞)
│       │   │   ├── likes/          # 点赞模块 (文章/评论)
│       │   │   ├── notifications/  # 通知模块 (REST + WebSocket)
│       │   │   └── uploads/        # 上传模块 (分片/断点续传/MinIO)
│       │   └── redis/          # Redis 缓存模块
│       ├── prisma/
│       │   └── schema.prisma   # 数据库模型定义
│       └── Dockerfile
│
├── docker-compose.yml          # 开发环境编排
├── docker-compose.prod.yml     # 生产环境编排
├── scripts/
│   ├── backup.sh               # 数据库备份/恢复
│   ├── deploy-aliyun.sh        # 阿里云一键部署
│   └── seed-articles.py        # 批量生成示例文章
└── .github/                    # (待添加) CI/CD 配置
```

---

## 🗄️ 数据库模型

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │────→│   Post   │←────│ Category │
└──────────┘     └──────────┘     └──────────┘
     │                 │
     │            ┌────┴────┐
     │            │ PostTag  │←── Tag
     │            └─────────┘
     │                 │
     ├── Like           ├── Comment ──→ CommentLike
     │                  │     │
     └── Notification ←─┘     └── Comment (reply)
                   (actor)
```

**核心表：**
- `users` — 用户（用户名、邮箱、密码哈希、头像、简介）
- `posts` — 文章（标题、slug、Markdown 内容、摘要、封面图、状态、阅读量）
- `categories` — 分类
- `tags` / `post_tags` — 标签（多对多）
- `comments` — 评论（支持嵌套回复）
- `likes` / `comment_likes` — 点赞
- `notifications` — 通知
- `uploads` / `upload_chunks` — 分片上传记录

---

## 🚀 快速开始

### 前置要求

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Docker** + Docker Compose（运行基础设施）
- **Git**

### 1. 克隆项目

```bash
git clone git@github.com:yuan252525/blog-system.git
cd blog-system
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动基础设施（PostgreSQL + Redis + MinIO）

```bash
docker compose up -d postgres redis minio
```

### 4. 配置环境变量

```bash
# 后端 (packages/server/.env)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/blog_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-at-least-32-chars-long"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5178"
PUBLIC_API_URL="http://localhost:3000/api/v1"
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=blog-uploads

# 前端 (packages/client/.env)
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### 5. 运行数据库迁移

```bash
cd packages/server
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### 6. 启动开发服务

```bash
# 同时启动前后端
pnpm dev

# 或者分开启动
pnpm dev:server   # 后端 → http://localhost:3000
pnpm dev:client   # 前端 → http://localhost:5178
```

### 7. (可选) 生成示例数据

```bash
python3 scripts/seed-articles.py
```

---

## 🐳 Docker 一键部署

```bash
# 开发环境（前后端 + 数据库 + Redis + MinIO 全部容器化）
docker compose up -d

# 生产环境（数据库端口不暴露到宿主机，密码从 .env 注入）
cp .env.production.example .env
# 编辑 .env 填入真实密码和域名
docker compose -f docker-compose.prod.yml up -d
```

**端口映射：**

| 服务 | 开发 | 生产 | 说明 |
|------|------|------|------|
| 前端 | `5178` (Vite) | `8080` (Nginx) | 生产走 Nginx 静态托管 |
| 后端 | `3000` | `3000` | NestJS API |
| PostgreSQL | `5432` | 不暴露 | 生产仅容器内访问 |
| Redis | `6379` | 不暴露 | 生产仅容器内访问 |
| MinIO API | `9000` | - | 对象存储 |
| MinIO Console | `9001` | - | Web 管理面板 |

---

## 📡 API 概览

所有 API 前缀：`/api/v1`

| 模块 | 端点 | 说明 |
|------|------|------|
| **Auth** | `POST /auth/register` | 注册 |
| | `POST /auth/login` | 登录 |
| | `GET /auth/profile` | 获取个人信息 |
| | `PUT /auth/profile` | 更新个人信息 |
| **Posts** | `GET /posts` | 文章列表（分页/搜索/标签筛选） |
| | `GET /posts/:slug` | 文章详情（含阅读计数） |
| | `POST /posts` | 创建文章 |
| | `PUT /posts/:id` | 编辑文章 |
| | `DELETE /posts/:id` | 删除文章 |
| **Categories** | `GET /categories` | 分类列表 |
| | `GET /categories/:slug` | 分类详情 |
| **Tags** | `GET /tags` | 标签列表 |
| | `GET /tags/:slug/posts` | 标签下文章 |
| **Comments** | `GET /comments/post/:postId` | 文章评论 |
| | `POST /comments` | 发表评论 |
| | `POST /comments/:id/like` | 评论点赞 |
| **Likes** | `POST /likes/post/:postId` | 文章点赞 |
| | `GET /likes/user` | 我的点赞 |
| **Notifications** | `GET /notifications` | 通知列表 |
| | `GET /notifications/unread-count` | 未读数 |
| | `PUT /notifications/read-all` | 全部已读 |
| **Uploads** | `POST /uploads` | 初始化上传（分片） |
| | `POST /uploads/:id/chunks` | 上传分片 |
| | `POST /uploads/:id/complete` | 合并分片 |

**WebSocket** — `/notifications` 命名空间，实时推送新通知和未读计数。

---

## 🔧 常用命令

```bash
# 开发
pnpm dev              # 启动前后端开发服务
pnpm dev:server       # 仅后端
pnpm dev:client       # 仅前端

# 构建
pnpm build            # 生产构建

# 代码检查
pnpm lint             # ESLint + oxlint
pnpm typecheck        # TypeScript 类型检查
pnpm format           # Prettier 格式化

# 数据库
cd packages/server
npx prisma studio     # 可视化数据库管理 → http://localhost:5555
npx prisma migrate dev   # 开发环境迁移
npx prisma migrate deploy # 生产环境迁移

# Docker
docker compose up -d            # 启动全部服务
docker compose down             # 停止全部服务
docker compose logs -f server   # 查看后端日志
docker compose logs -f client   # 查看前端日志
```

---

## 📦 部署

### 阿里云 ECS

```bash
bash scripts/deploy-aliyun.sh
```

脚本自动完成：
- Docker + Docker Compose 安装
- 生成安全凭据并写入 `.env`
- 构建并启动所有容器
- Nginx 反向代理配置
- 可选 SSL 证书配置（Let's Encrypt）

### 数据备份

```bash
bash scripts/backup.sh backup       # 备份数据库 + Redis 到 backups/
bash scripts/backup.sh restore <文件> # 从备份恢复
bash scripts/backup.sh status       # 查看备份状态
```

---

## 🗺️ 路线图

- [ ] 富文本编辑器（Tiptap）
- [ ] RSS 订阅
- [ ] 全文搜索（Elasticsearch）
- [ ] 访问统计看板
- [ ] OAuth 第三方登录（GitHub/Google）
- [ ] 邮件通知
- [ ] 文章版本历史
- [ ] 暗色模式
- [ ] CI/CD (GitHub Actions)

---

## 📄 许可

MIT License

---

## 👤 作者

**yuan252525** — [GitHub](https://github.com/yuan252525)
