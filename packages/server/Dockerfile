# ============ 构建阶段 ============
FROM node:24-alpine AS builder

# 通过 npm 安装 pnpm（避免 corepack 覆盖环境变量）
RUN npm install -g pnpm@10

WORKDIR /app

# 禁用 pnpm 包发布时间验证
ENV npm_config_minimumReleaseAge=0

# 复制 workspace 配置文件
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY package.json ./
COPY packages/server/package.json ./packages/server/

# 安装依赖（仅 server 需要的）
RUN pnpm install --frozen-lockfile --filter server

# 复制 server 源码
COPY packages/server ./packages/server

# 生成 Prisma Client 并构建
WORKDIR /app/packages/server
RUN npx prisma generate
RUN npm run build

# ============ 生产阶段 ============
FROM node:24-alpine AS runner

RUN npm install -g pnpm@10

WORKDIR /app

ENV npm_config_minimumReleaseAge=0

# 复制 workspace 配置和 server 构建产物
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml .npmrc* ./
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/prisma ./packages/server/prisma
COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=builder /app/packages/server/generated ./packages/server/generated

# 只保留生产依赖
WORKDIR /app/packages/server
RUN pnpm prune --prod

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "--max-old-space-size=512", "dist/src/cluster.js"]
