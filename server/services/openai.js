import OpenAI from 'openai';

/**
 * 使用 AI 将 commit 记录整理为结构化报告（支持多仓库）
 *
 * @param {object} params
 * @param {Array<{sha, message, authorName, authorDate, url, repo?}>} params.commits
 * @param {string} params.aiKey     - OpenAI API Key
 * @param {string} params.aiBaseUrl - API 基础地址
 * @param {string} params.aiModel   - 模型名称
 * @param {string} params.reportType - daily / weekly
 * @param {string} params.ghUser    - GitHub 用户名
 * @param {string} params.ghRepo    - 仓库名（汇总）
 * @param {string[]} params.repos   - 所有仓库列表
 * @returns {Promise<string>} 生成的 Markdown 报告
 */
export async function generateReport({
  commits,
  aiKey,
  aiBaseUrl,
  aiModel,
  reportType,
  ghUser,
  ghRepo,
  repos = [],
}) {
  const client = new OpenAI({
    apiKey: aiKey,
    baseURL: aiBaseUrl.replace(/\/+$/, ''),
  });

  const typeLabel = reportType === 'daily' ? '日报' : '周报';
  const now = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // 提交记录：包含仓库标记
  const commitText = commits
    .map(
      (c, i) =>
        `${i + 1}. [${c.sha.slice(0, 7)}] ${c.message.split('\n')[0]}  — ${
          c.authorName
        }  (${c.repo || ghRepo})  ${new Date(c.authorDate).toLocaleDateString('zh-CN')}`
    )
    .join('\n');

  const reposInfo = repos.length > 0
    ? `- 相关仓库: ${repos.join('、')}`
    : '';

  const prompt = `你是一个专业的 Git 报告生成器。请根据以下 commit 记录，生成一份结构化的 ${typeLabel}。

## 基本信息
- 作者: ${ghUser}
${reposInfo}
- 日期: ${now}
- 报告类型: ${typeLabel}
- 涉及仓库: ${repos.length > 0 ? repos.length : 1} 个
- Commit 数量: ${commits.length}

## Commit 记录
${commitText || '（无 commit 记录）'}

## 报告要求
请生成包含以下章节的 Markdown 报告：

1. **概述** — 本次周期内工作的总体说明
2. **功能开发** — 新功能、特性相关的变更（如有）
3. **Bug 修复** — 修复的问题和缺陷（如有）
4. **代码优化** — 重构、性能优化、技术债务清理（如有）
5. **文档与配置** — 文档更新、配置变更（如有）
6. **其他变更** — 上述未涵盖的变更（如有）
7. **总结与计划** — 简要总结和后续工作展望

请使用中文输出，保持专业、清晰、简洁。每项变更尽量标注来自哪个仓库，并附上 commit 链接（用 commit SHA 前 7 位作为标识）。`;

  console.log(`🤖 正在调用 AI (${aiModel}) 生成${typeLabel}...`);

  const response = await client.chat.completions.create({
    model: aiModel,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 4096,
  });

  const content = response.choices?.[0]?.message?.content || '';

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  console.log('✅ AI 报告生成完成');

  return content;
}
