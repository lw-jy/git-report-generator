import 'dotenv/config';
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

// ---- 路由 ----
app.use('/api', apiRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ---- 404 ----
app.use((_req, res) => {
  res.status(404).json({ message: '接口不存在' });
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
    console.log(`\n🚀 Git Report Generator API 已启动`);
    console.log(`   📡 http://localhost:${PORT}`);
    console.log(`   ❤️  /api/health\n`);
  });
}

start();
