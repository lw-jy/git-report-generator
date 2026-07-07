import { Router } from 'express';
import Report from '../models/Report.js';
import { fetchCommits } from '../services/github.js';
import { generateReport } from '../services/openai.js';
import { getDateRange } from '../services/date-utils.js';

const router = Router();

/**
 * POST /api/generate
 * 生成 Git 报告（支持多仓库）
 *
 * Body:
 *   config: { ghToken, ghUser, ghRepos[], aiKey, aiBaseUrl, aiModel }
 *   options: { timeRange, reportType }
 *
 * Response:
 *   { content, reportId, ... }
 */
router.post('/generate', async (req, res) => {
  const startTime = Date.now();

  try {
    const { config, options } = req.body;

    // ---- 参数校验 ----
    if (!config) {
      return res.status(400).json({ message: '缺少 config 参数' });
    }
    if (!options) {
      return res.status(400).json({ message: '缺少 options 参数' });
    }

    const {
      ghToken, ghUser,
      ghRepos, ghRepo,  // ghRepos 是新格式，ghRepo 是旧格式兼容
      aiKey, aiBaseUrl, aiModel,
    } = config;
    const { timeRange, reportType } = options;

    // 兼容旧数据：ghRepo → ghRepos
    const repos = Array.isArray(ghRepos) && ghRepos.length > 0
      ? ghRepos
      : ghRepo
        ? [ghRepo]
        : [];

    if (!ghToken) {
      return res.status(400).json({ message: '请配置 GitHub Token' });
    }
    if (!ghUser) {
      return res.status(400).json({ message: '请配置 GitHub 用户名' });
    }
    if (repos.length === 0) {
      return res.status(400).json({ message: '请添加至少一个仓库' });
    }
    if (!aiKey) {
      return res.status(400).json({ message: '请配置 AI API Key' });
    }
    if (!aiBaseUrl) {
      return res.status(400).json({ message: '请配置 AI API 地址' });
    }
    if (!aiModel) {
      return res.status(400).json({ message: '请配置 AI 模型名称' });
    }

    const validRanges = ['today', '3days', 'week', '2weeks'];
    if (!validRanges.includes(timeRange)) {
      return res.status(400).json({ message: `时间范围无效: ${timeRange}` });
    }

    const validTypes = ['daily', 'weekly'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ message: `报告类型无效: ${reportType}` });
    }

    const { since, until } = getDateRange(timeRange);

    // ---- 1. 并发拉取所有仓库的 Commit 记录 ----
    console.log('\n═══════════════════════════════════════');
    console.log('📋 开始生成报告');
    console.log(`   👤 ${ghUser} | 📦 ${repos.length} 个仓库: ${repos.join(', ')}`);
    console.log(`   ⏱ ${timeRange} | ${reportType}`);
    console.log(`   📅 ${since.toISOString()} ~ ${until.toISOString()}`);
    console.log(`   🤖 ${aiModel}`);

    const allResults = await Promise.allSettled(
      repos.map((repo) =>
        fetchCommits({ ghToken, ghUser, ghRepo: repo, timeRange })
          .then((commits) => ({ repo, commits }))
      )
    );

    // 收集成功的结果，记录失败的仓库
    let allCommits = [];
    const failedRepos = [];

    for (const result of allResults) {
      if (result.status === 'fulfilled') {
        const { repo, commits } = result.value;
        // 给每条 commit 打上仓库标签
        const taggedCommits = commits.map((c) => ({
          ...c,
          repo,
        }));
        allCommits.push(...taggedCommits);
        console.log(`   ✅ ${repo}: ${commits.length} 条`);
      } else {
        failedRepos.push(result.reason?.message || '未知错误');
        console.error(`   ❌ 仓库拉取失败:`, result.reason?.message);
      }
    }

    // 按时间排序（最新的在前）
    allCommits.sort((a, b) => new Date(b.authorDate) - new Date(a.authorDate));

    console.log(`   📊 共 ${allCommits.length} 条 commits（来自 ${repos.length} 个仓库）`);

    if (allCommits.length === 0 && failedRepos.length > 0) {
      return res.status(502).json({
        message: `所有仓库拉取均失败: ${failedRepos.join('; ')}`,
      });
    }

    // ---- 2. 创建报告记录（generating 状态） ----
    const report = await Report.create({
      ghUser,
      ghRepo: repos.join(', '),
      ghRepos: repos,
      reportType,
      timeRange,
      startDate: since,
      endDate: until,
      commits: allCommits,
      aiModel,
      status: 'generating',
    });

    // ---- 3. 生成报告 ----
    let content;
    const repoContext = repos.join(', ');
    try {
      content = await generateReport({
        commits: allCommits,
        aiKey,
        aiBaseUrl,
        aiModel,
        reportType,
        ghUser,
        ghRepo: repoContext,
        repos,
      });
    } catch (aiErr) {
      report.status = 'failed';
      report.errorMessage = aiErr.message;
      await report.save();

      console.error(`❌ AI 生成失败:`, aiErr.message);
      return res.status(502).json({
        message: `AI 服务调用失败: ${aiErr.message}`,
        failedRepos,
      });
    }

    // ---- 4. 更新报告记录 ----
    report.content = content;
    report.rawResponse = content;
    report.status = 'completed';
    await report.save();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ 报告生成完成 (ID: ${report._id}) | 耗时 ${elapsed}s`);
    console.log('═══════════════════════════════════════\n');

    // ---- 5. 返回结果 ----
    res.json({
      content: report.content,
      reportId: report._id,
      reportType: report.reportType,
      timeRange: report.timeRange,
      repos,
      commitCount: allCommits.length,
      failedRepos: failedRepos.length > 0 ? failedRepos : undefined,
      createdAt: report.createdAt,
      elapsed,
    });
  } catch (err) {
    console.error('❌ 报告生成失败:', err.message);
    res.status(500).json({
      message: err.message || '服务器内部错误',
    });
  }
});

/**
 * GET /api/reports
 * 获取报告列表
 */
router.get('/reports', async (req, res) => {
  try {
    const { ghUser, limit = 20 } = req.query;
    const filter = ghUser ? { ghUser } : {};
    const reports = await Report.find(filter)
      .select('ghUser ghRepo ghRepos reportType timeRange status createdAt commitCount')
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit) || 20, 100));

    res.json({ reports });
  } catch (err) {
    console.error('❌ 查询报告列表失败:', err.message);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/reports/:id
 * 获取单个报告详情
 */
router.get('/reports/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: '报告不存在' });
    }
    res.json({ report });
  } catch (err) {
    console.error('❌ 查询报告失败:', err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
