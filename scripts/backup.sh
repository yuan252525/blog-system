#!/usr/bin/env bash
#
# 博客系统数据备份 & 恢复脚本
# 用法:
#   bash scripts/backup.sh backup          # 备份所有数据
#   bash scripts/backup.sh restore <file>  # 从备份文件恢复
#   bash scripts/backup.sh status          # 查看卷占用
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/blog_backup_${TIMESTAMP}.tar.gz"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ==================== 备份 ====================
do_backup() {
  mkdir -p "$BACKUP_DIR"

  echo -e "${CYAN}[BACKUP]${NC} 备份 PostgreSQL 数据库..."
  echo "  容器: blog-postgres"

  # 使用 pg_dump 导出 SQL（比直接备份卷更可靠）
  docker exec blog-postgres pg_dump -U "${DB_USER:-postgres}" -d "${DB_NAME:-blog_db}" \
    > "${BACKUP_DIR}/postgres_dump_${TIMESTAMP}.sql"

  echo -e "${GREEN}  ✓ PostgreSQL 导出完成${NC}"

  # 备份 Redis（通过 SAVE 命令生成 RDB 快照）
  echo -e "${CYAN}[BACKUP]${NC} 备份 Redis 数据..."
  echo "  SAVE → /data/dump.rdb"
  docker exec blog-redis redis-cli SAVE >/dev/null 2>&1

  echo -e "${GREEN}  ✓ Redis SAVE 完成${NC}"

  # 打包
  cd "$BACKUP_DIR"
  tar -czf "$BACKUP_FILE" "postgres_dump_${TIMESTAMP}.sql" 2>/dev/null || \
    tar -czf "$BACKUP_FILE" "postgres_dump_${TIMESTAMP}.sql"
  # 删除临时 SQL 文件
  rm -f "postgres_dump_${TIMESTAMP}.sql"

  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo ""
  echo -e "${GREEN}══════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  备份完成！${NC}"
  echo -e "${GREEN}══════════════════════════════════════════════${NC}"
  echo -e "  📦 ${CYAN}备份文件: ${BACKUP_FILE}${NC}"
  echo -e "  📏 ${CYAN}文件大小: ${FILE_SIZE}${NC}"
  echo ""

  # 列出最近 5 个备份
  echo -e "${YELLOW}最近备份:${NC}"
  ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -5 || echo "  (无)"
}

# ==================== 恢复 ====================
do_restore() {
  local restore_file="$1"

  if [ -z "$restore_file" ]; then
    echo -e "${RED}[ERROR]${NC} 请指定备份文件路径"
    echo "  用法: bash scripts/backup.sh restore backups/blog_backup_20260702_120000.tar.gz"
    exit 1
  fi

  if [ ! -f "$restore_file" ]; then
    echo -e "${RED}[ERROR]${NC} 备份文件不存在: $restore_file"
    exit 1
  fi

  echo ""
  echo -e "${RED}⚠️  恢复操作将覆盖当前数据库全部数据！${NC}"
  echo -e "${RED}⚠️  建议先备份当前数据: bash scripts/backup.sh backup${NC}"
  echo ""
  echo -ne "确认恢复？输入 YES: "
  read -r CONFIRM

  if [ "$CONFIRM" != "YES" ]; then
    echo "已取消"
    exit 0
  fi

  # 解压
  TEMP_DIR="${BACKUP_DIR}/restore_tmp"
  mkdir -p "$TEMP_DIR"
  tar -xzf "$restore_file" -C "$TEMP_DIR"

  SQL_FILE=$(ls "$TEMP_DIR"/*.sql 2>/dev/null | head -1)
  if [ -z "$SQL_FILE" ]; then
    echo -e "${RED}[ERROR]${NC} 备份包中未找到 SQL 文件"
    rm -rf "$TEMP_DIR"
    exit 1
  fi

  echo -e "${CYAN}[RESTORE]${NC} 恢复 PostgreSQL..."

  # 先断开所有连接
  docker exec blog-postgres psql -U "${DB_USER:-postgres}" \
    -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${DB_NAME:-blog_db}' AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || true

  # 删除并重建数据库
  docker exec blog-postgres dropdb -U "${DB_USER:-postgres}" --if-exists "${DB_NAME:-blog_db}" 2>/dev/null || true
  docker exec blog-postgres createdb -U "${DB_USER:-postgres}" "${DB_NAME:-blog_db}" 2>/dev/null || true

  # 导入数据
  cat "$SQL_FILE" | docker exec -i blog-postgres psql -U "${DB_USER:-postgres}" -d "${DB_NAME:-blog_db}"
  echo -e "${GREEN}[OK]${NC} PostgreSQL 恢复完成"

  # 清理
  rm -rf "$TEMP_DIR"

  echo ""
  echo -e "${YELLOW}[INFO]${NC} 建议重启服务:"
  echo -e "  cd ${PROJECT_DIR} && bash start.sh restart"
}

# ==================== 状态 ====================
show_status() {
  echo -e "${CYAN}┌──────────────┬──────────────────────────────────┐${NC}"
  echo -e "${CYAN}│${NC}   数据卷      ${CYAN}│${NC}  占用大小                          ${CYAN}│${NC}"
  echo -e "${CYAN}├──────────────┼──────────────────────────────────┤${NC}"

  for vol in blog-system_pgdata blog-system_redisdata; do
    SIZE="未找到"
    if docker volume ls | grep -q "$vol"; then
      # 用临时容器查看卷大小
      SIZE=$(docker run --rm -v "$vol:/vol" alpine du -sh /vol 2>/dev/null | cut -f1) || SIZE="无法读取"
    fi
    printf "${CYAN}│${NC} %-12s ${CYAN}│${NC} %-32s ${CYAN}│${NC}\n" "$vol" "$SIZE"
  done

  echo -e "${CYAN}└──────────────┴──────────────────────────────────┘${NC}"
  echo ""

  # 备份文件列表
  if [ -d "$BACKUP_DIR" ] && ls "$BACKUP_DIR"/*.tar.gz >/dev/null 2>&1; then
    echo -e "${YELLOW}备份文件列表:${NC}"
    ls -lh "$BACKUP_DIR"/*.tar.gz
  else
    echo -e "${YELLOW}还没有备份文件${NC}"
  fi
}

# ==================== 主入口 ====================
main() {
  case "${1:-status}" in
    backup)
      do_backup
      ;;
    restore)
      do_restore "$2"
      ;;
    status)
      show_status
      ;;
    *)
      echo "用法: $0 {backup|restore <file>|status}"
      echo ""
      echo "  backup          备份全部数据到 backups/ 目录"
      echo "  restore <file>  从指定备份文件恢复数据"
      echo "  status          查看当前数据卷和备份文件"
      exit 1
      ;;
  esac
}

main "$@"
