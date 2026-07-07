import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    // GitHub 用户名
    ghUser: { type: String, required: true },
    // 仓库全名 (owner/repo)，兼容旧数据
    ghRepo: { type: String, default: '' },
    // 多仓库列表（新增）
    ghRepos: { type: [String], default: [] },
    // 报告类型: daily / weekly
    reportType: { type: String, enum: ['daily', 'weekly'], required: true },
    // 时间范围标识: today / 3days / week / 2weeks
    timeRange: { type: String, required: true },
    // 查询起始日期
    startDate: { type: Date, required: true },
    // 查询结束日期
    endDate: { type: Date, required: true },
    // 原始 commit 列表
    commits: [
      {
        sha: String,
        message: String,
        authorName: String,
        authorDate: Date,
        url: String,
        repo: String, // 来自哪个仓库
      },
    ],
    // 生成的报告内容 (Markdown)
    content: { type: String, default: '' },
    // AI 原始回复
    rawResponse: { type: String, default: '' },
    // 使用的 AI 模型
    aiModel: { type: String, default: '' },
    // 状态: generating / completed / failed
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed'],
      default: 'generating',
    },
    // 失败原因
    errorMessage: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'reports',
  }
);

// 索引：按用户和创建时间查询
reportSchema.index({ ghUser: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
