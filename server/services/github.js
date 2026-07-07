import { getDateRange } from './date-utils.js';

/**
 * 从 GitHub API 获取指定仓库的 commit 记录
 *
 * @param {object} params
 * @param {string} params.ghToken - GitHub Personal Access Token
 * @param {string} params.ghUser  - GitHub 用户名（用于过滤自己的提交）
 * @param {string} params.ghRepo  - 仓库名 (owner/repo)
 * @param {string} params.timeRange - today / 3days / week / 2weeks
 * @returns {Promise<Array<{sha, message, authorName, authorDate, url}>>}
 */
export async function fetchCommits({ ghToken, ghUser, ghRepo, timeRange }) {
  const { since } = getDateRange(timeRange);
  const [owner, repo] = ghRepo.split('/');

  if (!owner || !repo) {
    throw new Error('仓库格式无效，请使用 owner/repo 格式');
  }

  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
  url.searchParams.set('since', since.toISOString());
  url.searchParams.set('per_page', '100');

  // 尝试按作者过滤（不一定准确，但能缩小范围）
  if (ghUser) {
    url.searchParams.set('author', ghUser);
  }

  console.log(`📡 正在获取 GitHub commits: ${ghRepo} (since=${since.toISOString()})`);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${ghToken}`,
      'User-Agent': 'git-report-generator',
    },
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(
      `GitHub API 请求失败 (${response.status}): ${errBody || response.statusText}`
    );
  }

  const data = await response.json();

  // 如果请求时没有传 author 参数，需要在这里按用户名过滤
  // 但如果传了，GitHub 已经做了过滤
  const commits = (Array.isArray(data) ? data : data.data || [])
    .filter((c) => {
      const author = c.author || c.commit?.author;
      if (!author) return true;
      const authorName = c.commit?.author?.name || '';
      const authorLogin = c.author?.login || '';
      // 如果 ghUser 存在但 GitHub 返回了不相关的作者，过滤掉
      if (ghUser && authorLogin && authorLogin !== ghUser) return false;
      return true;
    })
    .map((c) => ({
      sha: c.sha,
      message: c.commit?.message || '',
      authorName: c.commit?.author?.name || c.commit?.committer?.name || '',
      authorDate: c.commit?.author?.date || c.commit?.committer?.date || '',
      url: c.html_url || '',
    }));

  console.log(`✅ 获取到 ${commits.length} 条 commit 记录`);

  return commits;
}
