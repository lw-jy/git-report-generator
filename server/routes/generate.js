import { Router } from 'express';
import { fetchCommits } from '../services/github.js';
import { fetchGitLabCommits } from '../services/gitlab.js';
import { generateReport } from '../services/openai.js';
import { getDateRange } from '../services/date-utils.js';

let reportIdCounter = 0;
const reports = new Map();

/**
 * 根据平台获取对应的 fetchCommits 函数
 */
function getFetcher(platform) {
  return platform === 'gitlab' ? fetchGitLabCommits : fetchCommits;
}

const router = Router();

/**
 * POST /api/generate
 * 生成 Git 报告
 */
router.post('/generate', async (req, res) => {
  const startTime = Date.now();

  try {
    const { config, options } = req.body;

    if (!config) return res.status(400).json({ message: '缺少 config 参数' });
    if (!options) return res.status(400).json({ message: '缺少 options 参数' });

    const {
      ghToken, ghUser,
      ghRepos, ghRepo,
      platform, gitLabUrl,
      commitFilters, customPrompt,
      aiKey, aiBaseUrl, aiModel,
    } = config;
    const { timeRange, reportType } = options;

    const activePlatform = platform || 'github';
    const repos = Array.isArray(ghRepos) && ghRepos.length > 0
      ? ghRepos : ghRepo ? [ghRepo] : [];
    const platformLabel = activePlatform === 'github' ? 'GitHub' : 'GitLab';

    if (!ghToken) return res.status(400).json({ message: `请配置 ${platformLabel} Token` });
    if (!ghUser) return res.status(400).json({ message: `请配置 ${platformLabel} 用户名` });
    if (repos.length === 0) return res.status(400).json({ message: '请添加至少一个仓库' });
    if (!aiKey) return res.status(400).json({ message: '请配置 AI API Key' });
    if (!aiBaseUrl) return res.status(400).json({ message: '请配置 AI API 地址' });
    if (!aiModel) return res.status(400).json({ message: '请配置 AI 模型名称' });

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
    console.log(`   🔧 ${platformLabel} | 👤 ${ghUser} | 📦 ${repos.length} 个仓库: ${repos.join(', ')}`);
    console.log(`   ⏱ ${timeRange} | ${reportType}`);
    console.log(`   📅 ${since.toISOString()} ~ ${until.toISOString()}`);
    console.log(`   🤖 ${aiModel}`);

    const fetcher = getFetcher(activePlatform);
    const allResults = await Promise.allSettled(
      repos.map((repo) => {
        const params = { ghToken, ghUser, ghRepo: repo, timeRange };
        if (activePlatform !== 'github') params.baseUrl = gitLabUrl || undefined;
        return fetcher(params).then((commits) => ({ repo, commits }));
      })
    );

    let allCommits = [];
    const failedRepos = [];

    for (const result of allResults) {
      if (result.status === 'fulfilled') {
        const { repo, commits } = result.value;
        const taggedCommits = commits.map((c) => ({ ...c, repo }));
        allCommits.push(...taggedCommits);
        console.log(`   ✅ ${repo}: ${commits.length} 条`);
      } else {
        const err = result.reason || {};
        const detail = err.cause ? `${err.message}: ${err.cause}` : err.message;
        failedRepos.push(detail || '未知错误');
        console.error(`   ❌ 仓库拉取失败:`, detail || err);
      }
    }

    allCommits.sort((a, b) => new Date(b.authorDate) - new Date(a.authorDate));

    const filters = Array.isArray(commitFilters) ? commitFilters : [];
    let filteredCount = 0;
    if (filters.length > 0) {
      const before = allCommits.length;
      allCommits = allCommits.filter((c) => {
        const msg = c.message || '';
        return !filters.some((f) => msg.toLowerCase().includes(f.toLowerCase()));
      });
      filteredCount = before - allCommits.length;
    }

    console.log(`   📊 共 ${allCommits.length} 条 commits${filters.length > 0 ? `（已过滤 ${filteredCount} 条）` : ''}（来自 ${repos.length} 个仓库）`);

    if (allCommits.length === 0 && failedRepos.length > 0) {
      return res.status(502).json({
        message: `所有仓库拉取均失败: ${failedRepos.join('; ')}`,
        failedRepos,
      });
    }

    // ---- 2. 生成报告 ----
    const repoContext = repos.join(', ');
    let content;
    try {
      content = await generateReport({
        commits: allCommits, aiKey, aiBaseUrl, aiModel,
        reportType, ghUser, ghRepo: repoContext, repos, customPrompt,
      });
    } catch (aiErr) {
      console.error(`❌ AI 生成失败:`, aiErr.message);
      return res.status(502).json({ message: `AI 服务调用失败: ${aiErr.message}`, failedRepos });
    }

    // ---- 3. 内存存储 ----
    reportIdCounter++;
    const reportId = `R${String(reportIdCounter).padStart(4, '0')}`;
    const now = new Date();
    const report = {
      id: reportId,
      ghUser, ghRepo: repos.join(', '), ghRepos: repos,
      platform: activePlatform,
      reportType, timeRange,
      startDate: since, endDate: until,
      commits: allCommits, content,
      aiModel, commitCount: allCommits.length,
      filteredCount,
      createdAt: now,
    };
    reports.set(reportId, report);

    // 最多保留 50 条历史记录
    if (reports.size > 50) {
      const firstKey = reports.keys().next().value;
      reports.delete(firstKey);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 报告生成完成 (ID: ${reportId}) | 耗时 ${elapsed}s`);
    console.log('═══════════════════════════════════════\n');

    res.json({
      content: report.content,
      reportId: report.id,
      reportType: report.reportType, timeRange: report.timeRange,
      repos, commitCount: allCommits.length,
      filteredCount, createdAt: report.createdAt, elapsed,
    });
  } catch (err) {
    console.error('❌ 报告生成失败:', err.message);
    res.status(500).json({ message: err.message || '服务器内部错误' });
  }
});

/**
 * GET /api/reports - 历史报告列表
 */
router.get('/reports', (_req, res) => {
  res.json({ reports: Array.from(reports.values()).reverse() });
});

/**
 * GET /api/reports/:id - 单条报告详情
 */
router.get('/reports/:id', (req, res) => {
  const report = reports.get(req.params.id);
  if (!report) return res.status(404).json({ message: '报告不存在' });
  res.json({ report });
});

export default router;
