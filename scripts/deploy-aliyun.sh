#!/usr/bin/env bash
#
# 博客系统 - 阿里云 ECS 一键部署脚本
# 支持: Ubuntu 20.04+ / Debian 11+ / CentOS 7.9+ / Alibaba Cloud Linux 3
#
# 用法:
#   1. 将整个项目上传到 ECS: rsync -avz ./ root@<你的ECS公网IP>:/opt/blog-system/
#   2. SSH 登录: ssh root@<你的ECS公网IP>
#   3. 运行: cd /opt/blog-system && bash scripts/deploy-aliyun.sh
#
#   脚本会依次:
#     - 安装 Docker + Docker Compose
#     - 生成 .env 生产配置（交互式或使用环境变量）
#     - 构建并启动所有容器
#     - 配置宿主机 Nginx 反向代理 + SSL（可选）
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ==================== 颜色 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ==================== 配置（通过环境变量覆盖） ====================
DOMAIN="${DOMAIN:-}"                    # 你的域名，如 example.com
EMAIL="${EMAIL:-}"                      # SSL 证书通知邮箱
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 16)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
ENABLE_SSL="${ENABLE_SSL:-yes}"         # 是否启用 HTTPS
INSTALL_NGINX="${INSTALL_NGINX:-yes}"   # 是否安装宿主机 Nginx 做反向代理
SETUP_FIREWALL="${SETUP_FIREWALL:-yes}" # 是否配置防火墙

print_banner() {
  echo -e "${CYAN}"
  echo "  ╔══════════════════════════════════════════════════╗"
  echo "  ║     📦 博客系统 - 阿里云 ECS 一键部署脚本       ║"
  echo "  ╚══════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

# ==================== 检测操作系统 ====================
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
  else
    echo -e "${RED}[ERROR]${NC} 无法检测操作系统"
    exit 1
  fi
  echo -e "${BLUE}[INFO]${NC} 操作系统: ${GREEN}$OS $OS_VERSION${NC}"
}

# ==================== 安装 Docker ====================
install_docker() {
  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Docker 已安装: $(docker --version)"
    return 0
  fi

  echo -e "${BLUE}[STEP]${NC} 正在安装 Docker..."

  case "$OS" in
    ubuntu|debian)
      apt-get update -qq
      apt-get install -y -qq ca-certificates curl
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
      chmod a+r /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/$OS $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list
      apt-get update -qq
      apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      ;;
    centos|alinux|rhel|rocky)
      yum install -y yum-utils
      yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
      sed -i 's+download.docker.com+mirrors.aliyun.com/docker-ce+' /etc/yum.repos.d/docker-ce.repo
      yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      systemctl enable docker
      systemctl start docker
      ;;
    *)
      echo -e "${RED}[ERROR]${NC} 不支持的操作系统: $OS"
      echo "请手动安装 Docker: https://docs.docker.com/engine/install/"
      exit 1
      ;;
  esac

  # 启动 docker
  systemctl start docker 2>/dev/null || true
  systemctl enable docker 2>/dev/null || true

  # 配置阿里云镜像加速
  if ! grep -q "registry-mirrors" /etc/docker/daemon.json 2>/dev/null; then
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<'DOCKEREOF'
{
  "registry-mirrors": ["https://registry.cn-hangzhou.aliyuncs.com"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
DOCKEREOF
    systemctl restart docker
  fi

  echo -e "${GREEN}[OK]${NC} Docker 安装完成: $(docker --version)"

  # 验证 docker compose
  if docker compose version &>/dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Docker Compose: $(docker compose version)"
  else
    echo -e "${RED}[ERROR]${NC} Docker Compose 未正确安装"
    exit 1
  fi
}

# ==================== 安装宿主机 Nginx（反向代理） ====================
install_nginx() {
  if [ "$INSTALL_NGINX" != "yes" ]; then
    echo -e "${YELLOW}[SKIP]${NC} 跳过宿主机 Nginx 安装"
    return 0
  fi

  if command -v nginx &>/dev/null; then
    echo -e "${GREEN}[OK]${NC} Nginx 已安装"
  else
    echo -e "${BLUE}[STEP]${NC} 安装 Nginx..."
    case "$OS" in
      ubuntu|debian) apt-get install -y -qq nginx ;;
      centos|alinux|rhel|rocky) yum install -y nginx ;;
    esac
    systemctl enable nginx
    echo -e "${GREEN}[OK]${NC} Nginx 安装完成"
  fi
}

# ==================== 安装 Certbot（SSL 证书） ====================
install_certbot() {
  if [ "$ENABLE_SSL" != "yes" ] || [ -z "$DOMAIN" ]; then
    return 0
  fi
  if command -v certbot &>/dev/null; then
    echo -e "${GREEN}[OK]${NC} Certbot 已安装"
    return 0
  fi
  echo -e "${BLUE}[STEP]${NC} 安装 Certbot..."
  case "$OS" in
    ubuntu|debian)
      apt-get install -y -qq certbot python3-certbot-nginx
      ;;
    centos|alinux|rhel|rocky)
      if command -v snap &>/dev/null; then
        snap install core && snap refresh core
        snap install --classic certbot
        ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true
      else
        yum install -y epel-release
        yum install -y certbot python3-certbot-nginx
      fi
      ;;
  esac
  echo -e "${GREEN}[OK]${NC} Certbot 安装完成"
}

# ==================== 配置 .env 生产环境 ====================
setup_env() {
  echo -e "${BLUE}[STEP]${NC} 配置生产环境变量..."

  # 自动生成密码
  DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 16)}"
  JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

  # 交互式询问域名
  if [ -z "$DOMAIN" ]; then
    echo ""
    echo -e "${YELLOW}请输入你的域名（直接回车跳过，仅用 IP 访问）:${NC}"
    read -r DOMAIN

    if [ -n "$DOMAIN" ] && [ -z "$EMAIL" ]; then
      echo -e "${YELLOW}请输入用于 SSL 证书通知的邮箱:${NC}"
      read -r EMAIL
    fi
  fi

  # 确定 CLIENT_URL
  if [ -n "$DOMAIN" ]; then
    SCHEME="https"
    CLIENT_URL="https://$DOMAIN"
    VITE_API_URL="https://$DOMAIN/api/v1"
  else
    SCHEME="http"
    # 自动获取公网 IP
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "YOUR_SERVER_IP")
    CLIENT_URL="http://$PUBLIC_IP"
    VITE_API_URL="http://$PUBLIC_IP:3000/api/v1"
  fi

  # 检查是否已存在 .env
  if [ -f "$PROJECT_DIR/.env" ]; then
    echo -e "${YELLOW}[WARN]${NC} 已存在 .env 文件，将覆盖写入..."
    cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.bak.$(date +%s)"
    echo -e "  旧配置已备份"
  fi

  cat > "$PROJECT_DIR/.env" <<ENVEOF
# ========== 数据库配置 ==========
DB_USER=postgres
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=blog_db
DB_PORT=5432

# ========== Redis 配置 ==========
REDIS_HOST=redis
REDIS_PORT=6379

# ========== 后端配置 ==========
SERVER_PORT=3000
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# ========== 前端配置 ==========
CLIENT_PORT=8080
CLIENT_URL=${CLIENT_URL}
VITE_API_URL=${VITE_API_URL}
ENVEOF

  echo -e "${GREEN}[OK]${NC} .env 配置完成"
  echo ""
  echo -e "  ${CYAN}DOMAIN:${NC}       ${DOMAIN:-仅 IP 访问}"
  echo -e "  ${CYAN}CLIENT_URL:${NC}   ${CLIENT_URL}"
  echo -e "  ${CYAN}DB_PASSWORD:${NC}  (自动生成，已写入 .env)"
}

# ==================== 配置宿主机 Nginx ====================
setup_nginx() {
  if [ "$INSTALL_NGINX" != "yes" ]; then
    return 0
  fi

  echo -e "${BLUE}[STEP]${NC} 配置宿主机 Nginx 反向代理..."

  if [ -n "$DOMAIN" ]; then
    # 有域名: HTTP + 后续 SSL
    cat > /etc/nginx/conf.d/blog.conf <<NGINXEOF
# ==================== HTTP → 预留 SSL 升级 ====================
server {
    listen 80;
    server_name ${DOMAIN};

    # 前端静态文件 + SPA
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # API 请求转发到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Swagger 文档
    location /docs {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket 支持（如需要）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINXEOF
    echo -e "${GREEN}[OK]${NC} Nginx 配置完成（域名: ${DOMAIN}）"

  else
    # 无域名: 直接 IP 反向代理
    cat > /etc/nginx/conf.d/blog.conf <<NGINXEOF
# ==================== 无域名 - IP 反向代理 ====================
server {
    listen 80;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /docs {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINXEOF
    echo -e "${GREEN}[OK]${NC} Nginx 配置完成（无域名模式）"
  fi

  # 测试并重载 Nginx
  if nginx -t 2>&1; then
    systemctl reload nginx
    echo -e "${GREEN}[OK]${NC} Nginx 重载成功"
  else
    echo -e "${RED}[ERROR]${NC} Nginx 配置有误，请检查 /etc/nginx/conf.d/blog.conf"
  fi
}

# ==================== 配置 SSL 证书 ====================
setup_ssl() {
  if [ "$ENABLE_SSL" != "yes" ] || [ -z "$DOMAIN" ]; then
    echo -e "${YELLOW}[SKIP]${NC} 跳过 SSL 配置（无域名或未启用）"
    return 0
  fi

  echo -e "${BLUE}[STEP]${NC} 申请 SSL 证书（Let's Encrypt）..."

  # 先确保 80 端口可从外网访问
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "${EMAIL:-admin@$DOMAIN}" --redirect 2>&1; then
    echo -e "${GREEN}[OK]${NC} SSL 证书申请成功！"
    # 自动续期
    systemctl enable certbot.timer 2>/dev/null || true
    echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab - 2>/dev/null || true
  else
    echo -e "${RED}[ERROR]${NC} SSL 证书申请失败，请检查:"
    echo "  1. 域名 DNS 是否已解析到本服务器 IP"
    echo "  2. 安全组是否已开放 80/443 端口"
    echo "  可以稍后手动运行: certbot --nginx -d $DOMAIN"
  fi
}

# ==================== 配置防火墙 ====================
setup_firewall() {
  if [ "$SETUP_FIREWALL" != "yes" ]; then
    return 0
  fi

  echo -e "${BLUE}[STEP]${NC} 配置防火墙规则..."

  # 阿里云安全组在控制台配置，这里只配置系统防火墙
  # firewalld (CentOS/Alibaba Cloud Linux)
  if command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld 2>/dev/null; then
    firewall-cmd --permanent --add-service=http 2>/dev/null || true
    firewall-cmd --permanent --add-service=https 2>/dev/null || true
    firewall-cmd --permanent --add-port=22/tcp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    echo -e "${GREEN}[OK]${NC} Firewalld 规则已配置 (80, 443, 22)"
  # ufw (Ubuntu)
  elif command -v ufw &>/dev/null; then
    ufw allow 22/tcp 2>/dev/null || true
    ufw allow 80/tcp 2>/dev/null || true
    ufw allow 443/tcp 2>/dev/null || true
    echo -e "${GREEN}[OK]${NC} UFW 规则已配置"
  else
    echo -e "${YELLOW}[SKIP]${NC} 未检测到已知防火墙，跳过（请确保阿里云安全组已开放 80/443 端口）"
  fi

  echo ""
  echo -e "${YELLOW}⚠️  重要提醒：请在阿里云控制台安全组中开放以下端口:${NC}"
  echo -e "    ${CYAN}22${NC}   - SSH 远程连接"
  echo -e "    ${CYAN}80${NC}   - HTTP 网页访问"
  echo -e "    ${CYAN}443${NC}  - HTTPS 安全访问"
  echo -e "    ${RED}不要开放 3000、5432、6379 端口，防止被攻击${NC}"
}

# ==================== 构建 & 启动 ====================
build_and_start() {
  echo -e "${BLUE}[STEP]${NC} 构建 Docker 镜像..."

  cd "$PROJECT_DIR"

  # 使用生产环境 compose 文件（数据库/Redis 端口不对外暴露）
  local COMPOSE_FILE="docker-compose.prod.yml"
  if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${YELLOW}[WARN]${NC} 未找到 docker-compose.prod.yml，使用 docker-compose.yml"
    COMPOSE_FILE="docker-compose.yml"
  fi

  docker compose -f "$COMPOSE_FILE" build --no-cache server client

  echo -e "${GREEN}[OK]${NC} 镜像构建完成"

  echo -e "${BLUE}[STEP]${NC} 启动所有服务..."
  docker compose -f "$COMPOSE_FILE" up -d

  # 等待服务就绪
  echo -e "${YELLOW}[WAIT]${NC} 等待服务就绪..."
  for i in $(seq 1 30); do
    if docker ps --format '{{.Names}}' | grep -q "blog-server" && \
       curl -s http://127.0.0.1:3000/api/v1/tags >/dev/null 2>&1; then
      echo -e "${GREEN}[OK]${NC} 后端服务就绪（第 ${i} 次检查）"
      break
    fi
    sleep 2
  done
}

# ==================== 完成输出 ====================
print_summary() {
  echo ""
  echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}             🎉 部署完成！                          ${NC}"
  echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
  echo ""

  if [ -n "$DOMAIN" ]; then
    SCHEME="https"
    HOST="$DOMAIN"
  else
    SCHEME="http"
    HOST=$(curl -s ifconfig.me 2>/dev/null || echo "服务器IP")
  fi

  echo -e "  📖 ${CYAN}网站地址:    ${SCHEME}://${HOST}${NC}"
  if [ -z "$DOMAIN" ]; then
    echo -e "  📖 ${CYAN}前端直连:    http://${HOST}:8080${NC}"
    echo -e "  🔧 ${CYAN}API 直连:    http://${HOST}:3000/api/v1${NC}"
  fi
  echo ""
  echo -e "  ${YELLOW}常用命令:${NC}"
  echo -e "    cd ${PROJECT_DIR}"
  echo -e "    bash start.sh status     ${BLUE}# 查看服务状态${NC}"
  echo -e "    bash start.sh logs       ${BLUE}# 查看所有日志${NC}"
  echo -e "    bash start.sh logs server${BLUE}# 查看后端日志${NC}"
  echo -e "    bash start.sh restart    ${BLUE}# 重启所有服务${NC}"
  echo -e "    bash start.sh stop       ${BLUE}# 停止所有服务${NC}"
  echo ""
  echo -e "  ${YELLOW}数据库密码:${NC} ${DB_PASSWORD}"
  echo -e "  ${YELLOW}JWT 密钥:   ${NC} ${JWT_SECRET}"
  echo ""
  echo -e "  ${RED}请将上述密码保存到安全的地方！${NC}"
  echo ""
}

# ==================== 主流程 ====================
main() {
  print_banner

  # 1. 检测系统
  detect_os

  # 2. 安装 Docker
  install_docker

  # 3. 配置环境变量
  setup_env

  # 4. 构建 & 启动容器
  build_and_start

  # 5. 安装并配置宿主机 Nginx
  install_nginx
  setup_nginx

  # 6. SSL 证书
  install_certbot
  setup_ssl

  # 7. 防火墙
  setup_firewall

  # 8. 完成
  print_summary
}

main "$@"
