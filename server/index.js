import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import apiRouter from './routes/generate.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ---- 中间件 ----
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// 请求日志
app.use((req, _res, next) => {
  console.log(`➡️  ${req.method} ${req.url}`);
  next();
});

// ---- API 路由（优先于静态文件） ----
app.use('/api', apiRouter);

// ---- 生产环境：提供前端静态文件 ----
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// SPA fallback：非 API 请求返回 index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ---- 404 处理（仅 API 路由未匹配时） ----
app.use((_req, res) => {
  if (!res.headersSent) {
    res.status(404).json({ message: '接口不存在' });
  }
});

// ---- 全局错误处理 ----
app.use((err, _req, res, _next) => {
  console.error('⚠️  未捕获错误:', err);
  res.status(500).json({ message: '服务器内部错误' });
});

// ---- 启动 ----
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 Git Report Generator 已启动`);
    console.log(`   📡 http://localhost:${PORT}`);
    console.log(`   ❤️  /api/health`);
    console.log(`   🌐 前端页面: http://localhost:${PORT}\n`);
  });
}

start();
