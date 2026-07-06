# ============ 构建阶段 ============
FROM node:24-alpine AS builder

RUN npm install -g pnpm@10

WORKDIR /app

ENV npm_config_minimumReleaseAge=0

COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY package.json ./
COPY packages/client/package.json ./packages/client/

RUN pnpm install --frozen-lockfile --filter client

COPY packages/client ./packages/client

WORKDIR /app/packages/client

# 构建时注入 API 地址（可通过 build arg 覆盖）
ARG VITE_API_BASE_URL=http://localhost:3000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ============ 运行阶段 ============
FROM nginx:alpine AS runner

# 复制自定义 nginx 配置
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
