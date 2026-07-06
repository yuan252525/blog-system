#!/usr/bin/env bash
#
# 博客系统 Docker 部署启动脚本
# 用法: ./start.sh [start|stop|restart|build|status|logs]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ==================== 颜色 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ==================== LOGO ====================
print_banner() {
  echo -e "${CYAN}"
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║          📝 博客系统 Docker 部署         ║"
  echo "  ╚══════════════════════════════════════════╝"
  echo -e "${NC}"
}

# ==================== 环境检查 ====================
check_requirements() {
  echo -e "${BLUE}[INFO]${NC} 检查运行环境..."

  if ! command -v docker &>/dev/null; then
    echo -e "${RED}[ERROR]${NC} 未安装 Docker，请先安装 Docker"
    echo "  macOS: brew install docker"
    echo "  官网: https://www.docker.com/products/docker-desktop"
    exit 1
  fi

  DOCKER_CMD=""
  if docker compose version &>/dev/null 2>&1; then
    DOCKER_CMD="docker compose"
  elif command -v docker-compose &>/dev/null; then
    DOCKER_CMD="docker-compose"
  else
    echo -e "${RED}[ERROR]${NC} 未找到 Docker Compose（docker compose 或 docker-compose）"
    exit 1
  fi

  echo -e "  Docker:       ${GREEN}✓$(docker --version | cut -d' ' -f3 | cut -d',' -f1)${NC}"
  echo -e "  Compose:      ${GREEN}✓${NC}"
}

# ==================== 环境变量 ====================
load_env() {
  if [ ! -f ".env" ]; then
    if [ -f ".env.docker" ]; then
      echo -e "${YELLOW}[INFO]${NC} 未找到 .env 文件，从 .env.docker 复制默认配置..."
      cp .env.docker .env
    else
      echo -e "${RED}[ERROR]${NC} 未找到 .env 或 .env.docker 文件"
      exit 1
    fi
  fi
  # 导出环境变量供 docker compose 使用
  set -a
  source .env
  set +a
}

# ==================== 构建 ====================
build_images() {
  echo -e "${BLUE}[BUILD]${NC} 构建 Docker 镜像（跳过缓存：--no-cache）..."
  $DOCKER_CMD build --no-cache postgres 2>/dev/null || true
  $DOCKER_CMD build --no-cache server
  $DOCKER_CMD build --no-cache client
  echo -e "${GREEN}[OK]${NC} 镜像构建完成"
}

# ==================== 启动 ====================
start_services() {
  echo -e "${BLUE}[START]${NC} 启动所有服务..."
  $DOCKER_CMD up -d

  echo ""
  echo -e "${YELLOW}[WAIT]${NC} 等待服务就绪..."
  sleep 3

  # 显示状态
  show_status

  echo ""
  echo -e "${GREEN}══════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  全部服务已启动！${NC}"
  echo -e "${GREEN}══════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  📖 ${CYAN}前端页面:    http://localhost:${CLIENT_PORT:-8080}${NC}"
  echo -e "  🔧 ${CYAN}后端 API:    http://localhost:${SERVER_PORT:-3000}/api/v1${NC}"
  echo -e "  📋 ${CYAN}Swagger 文档: http://localhost:${SERVER_PORT:-3000}/docs${NC}"
  echo -e "  🗄️  ${CYAN}Prisma Studio: http://localhost:${SERVER_PORT:-3000}/_studio${NC}"
  echo -e "  🐘 ${CYAN}PostgreSQL:   localhost:${DB_PORT:-5432} (${DB_USER:-postgres}/${DB_NAME:-blog_db})${NC}"
  echo -e "  ⚡ ${CYAN}Redis:        localhost:${REDIS_PORT:-6379}${NC}"
  echo ""
  echo -e "  ${YELLOW}查看日志: ./start.sh logs${NC}"
  echo -e "  ${YELLOW}停止服务: ./start.sh stop${NC}"
  echo -e "  ${YELLOW}查看状态: ./start.sh status${NC}"
  echo ""
}

# ==================== 停止 ====================
stop_services() {
  echo -e "${BLUE}[STOP]${NC} 停止所有服务..."
  $DOCKER_CMD down
  echo -e "${GREEN}[OK]${NC} 服务已停止"
}

# ==================== 重启 ====================
restart_services() {
  echo -e "${BLUE}[RESTART]${NC} 重启所有服务..."
  $DOCKER_CMD down
  $DOCKER_CMD up -d
  sleep 3
  show_status
  echo -e "${GREEN}[OK]${NC} 服务已重启"
}

# ==================== 状态 ====================
show_status() {
  echo ""
  echo -e "${CYAN}┌──────────────────────────────────────────────────────────┐${NC}"
  echo -e "${CYAN}│${NC}                    ${CYAN}服务运行状态${NC}                       ${CYAN}│${NC}"
  echo -e "${CYAN}├──────────────┬─────────────────────┬──────────────────────┤${NC}"
  echo -e "${CYAN}│${NC}    服务      ${CYAN}│${NC}       状态          ${CYAN}│${NC}         端口         ${CYAN}│${NC}"
  echo -e "${CYAN}├──────────────┼─────────────────────┼──────────────────────┤${NC}"

  for svc in postgres redis server client; do
    if docker ps --format '{{.Names}}' | grep -q "blog-$svc"; then
      STATUS="${GREEN}运行中 ✓${NC}"
      case $svc in
        postgres) PORTS="${DB_PORT:-5432}" ;;
        redis)    PORTS="${REDIS_PORT:-6379}" ;;
        server)   PORTS="${SERVER_PORT:-3000}" ;;
        client)   PORTS="${CLIENT_PORT:-8080}" ;;
      esac
    else
      STATUS="${RED}未运行 ✗${NC}"
      PORTS="-"
    fi
    printf "${CYAN}│${NC} %-12s ${CYAN}│${NC} %-19b ${CYAN}│${NC} %-20s ${CYAN}│${NC}\n" \
      "blog-$svc" "$STATUS" "$PORTS"
  done

  echo -e "${CYAN}└──────────────┴─────────────────────┴──────────────────────┘${NC}"
}

# ==================== 日志 ====================
show_logs() {
  local svc="${1:-}"
  if [ -n "$svc" ]; then
    $DOCKER_CMD logs -f --tail=100 "blog-$svc"
  else
    $DOCKER_CMD logs -f --tail=100
  fi
}

# ==================== 清理 ====================
clean_all() {
  echo -e "${RED}[WARN]${NC} 此操作将删除所有容器、镜像和数据卷！"
  read -p "确认继续？(输入 yes 确认): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "已取消"
    exit 0
  fi
  echo -e "${BLUE}[CLEAN]${NC} 清理所有资源..."
  $DOCKER_CMD down -v --rmi all
  echo -e "${GREEN}[OK]${NC} 清理完成"
}

# ==================== 主入口 ====================
main() {
  print_banner
  check_requirements
  load_env

  case "${1:-start}" in
    start)
      # 检查是否已运行
      if docker ps --format '{{.Names}}' | grep -q "blog-server"; then
        echo -e "${YELLOW}[INFO]${NC} 服务已在运行中"
        show_status
        exit 0
      fi
      start_services
      ;;
    stop)
      stop_services
      ;;
    restart)
      restart_services
      ;;
    build)
      build_images
      ;;
    status)
      show_status
      ;;
    logs)
      show_logs "$2"
      ;;
    clean)
      clean_all
      ;;
    *)
      echo "用法: $0 {start|stop|restart|build|status|logs [service]|clean}"
      echo ""
      echo "  start    - 启动所有服务（默认）"
      echo "  stop     - 停止所有服务"
      echo "  restart  - 重启所有服务"
      echo "  build    - 重新构建镜像"
      echo "  status   - 查看服务状态"
      echo "  logs     - 查看所有日志（可指定服务名: logs server）"
      echo "  clean    - 删除所有容器、镜像和数据卷"
      exit 1
      ;;
  esac
}

main "$@"
