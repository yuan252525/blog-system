/**
 * Node.js 集群入口 — 利用多核 CPU 提升并发能力
 *
 * 主进程 fork N 个 worker（N = CPU 核数），每个 worker 运行同一个 NestJS 应用。
 * Worker 崩溃时自动重启，优雅退出时等待现有请求完成。
 */
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';

const numCPUs = availableParallelism();

if (cluster.isPrimary) {
  console.log(`[Cluster] 主进程 ${process.pid} 启动，fork ${numCPUs} 个 worker`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`[Cluster] worker ${worker.process.pid} 退出 (${signal ?? code})，重启中...`);
    // 延迟重启避免快速循环崩溃
    setTimeout(() => cluster.fork(), 1000);
  });
} else {
  // 动态 import ESM 入口
  import('./main.js').catch((err) => {
    console.error('[Cluster] Worker 启动失败:', err);
    process.exit(1);
  });
}
