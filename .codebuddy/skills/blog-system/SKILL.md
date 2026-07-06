---
name: blog-system
description: This skill should be used when the user asks to start, stop, restart, build, check status, view logs, or clean the blog system Docker services. It wraps the start.sh script to manage the full Docker Compose stack (PostgreSQL, Redis, NestJS server, Nginx client).
---

# Blog System Docker Management

## Overview

Manage the blog system's Docker Compose stack via the project's `start.sh` script. The stack consists of four services: PostgreSQL 16, Redis 7, NestJS backend (port 3000), and React frontend (port 8080).

## Usage

When the user asks to manage the blog services, execute `start.sh` with the appropriate subcommand from the project root.

### Available Commands

| Command | Description |
|---------|-------------|
| `start` | Start all services (default) |
| `stop` | Stop all services |
| `restart` | Restart all services |
| `build` | Rebuild Docker images (no cache) |
| `status` | Show running status of all services |
| `logs` | View service logs (append service name to filter) |
| `clean` | Remove all containers, images, and volumes (requires confirmation) |

### Execution

Always execute from the project root:

```bash
cd /Users/li.tianyu/blog-system && bash start.sh <command>
```

### Trigger Examples

- "启动博客系统" / "start blog" → `bash start.sh start`
- "停止博客" / "stop blog" → `bash start.sh stop`
- "重启博客" / "restart blog" → `bash start.sh restart`
- "重新构建博客镜像" → `bash start.sh build`
- "查看博客状态" / "blog status" → `bash start.sh status`
- "查看博客日志" / "blog logs" → `bash start.sh logs`
- "查看后端日志" → `bash start.sh logs server`
- "清理博客容器" → `bash start.sh clean`

### Ports

| Service | Port |
|---------|------|
| Frontend | 8080 |
| Backend API | 3000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
