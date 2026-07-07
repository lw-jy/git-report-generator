import mongoose from 'mongoose';

/**
 * 连接 MongoDB 数据库
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI 未配置');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB 连接成功');
  } catch (err) {
    console.error('❌ MongoDB 连接失败:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('⚠️ MongoDB 连接异常:', err.message);
  });
}
