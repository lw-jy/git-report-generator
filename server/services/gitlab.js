import { getDateRange } from './date-utils.js';

/**
 * 从 GitLab API 获取指定项目的 commit 记录
 *
 * @param {object} params
 * @param {string} params.ghToken    - GitLab Personal Access Token
 * @param {string} params.ghUser     - GitLab 用户名（暂未使用，保留接口一致）
 * @param {string} params.ghRepo     - 项目路径 (namespace/project)
 * @param {string} params.timeRange  - today / 3days / week / 2weeks
 * @param {string} [params.baseUrl]  - 自托管 GitLab 地址，默认 https://gitlab.com
 * @returns {Promise<Array<{sha, message, authorName, authorDate, url, repo}>>}
 */
export async function fetchGitLabCommits({ ghToken, ghUser, ghRepo, timeRange, baseUrl }) {
  const { since } = getDateRange(timeRange);
  const host = baseUrl ? baseUrl.replace(/\/+$/, '') : 'https://gitlab.com';
  const projectId = encodeURIComponent(ghRepo);

  const url = new URL(`${host}/api/v4/projects/${projectId}/repository/commits`);
  url.searchParams.set('since', since.toISOString());
  url.searchParams.set('per_page', '100');
  url.searchParams.set('all', 'true');

  console.log(`📡 正在获取 GitLab commits: ${ghRepo} (since=${since.toISOString()})`);

  const response = await fetch(url.toString(), {
    headers: {
      'PRIVATE-TOKEN': ghToken,
      'User-Agent': 'git-report-generator',
    },
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(
      `GitLab API 请求失败 (${response.status}): ${errBody || response.statusText}`
    );
  }

  const data = await response.json();

  const commits = (Array.isArray(data) ? data : [])
    .map((c) => ({
      sha: c.id,
      message: c.title || c.message || '',
      authorName: c.author_name || c.committer_name || '',
      authorDate: c.authored_date || c.created_at || '',
      url: c.web_url || '',
      repo: ghRepo,
    }));

  console.log(`✅ 获取到 ${commits.length} 条 commit 记录`);

  return commits;
}
