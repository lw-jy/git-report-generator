<template>
  <!-- 配置中心页面 -->
  <div class="config-page">
    <!-- 页面标题 -->
    <div class="config-page__header">
      <h2 class="config-page__title">配置中心</h2>
      <p class="config-page__desc">
        配置 GitHub 和 AI 服务的连接参数，所有数据仅存储于本地浏览器。
      </p>
    </div>

    <!-- 配置表单 -->
    <div class="config-page__content">
      <!-- GitHub 配置分组 -->
      <section class="config-section">
        <div class="config-section__header">
          <div class="config-section__icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
              />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
          </div>
          <div>
            <h3 class="config-section__title">GitHub 设置</h3>
            <p class="config-section__desc">用于获取代码提交记录</p>
          </div>
        </div>

        <div class="config-section__fields">
          <!-- Token 输入（带密码切换） -->
          <div class="field">
            <label class="field__label">
              <span>{{ config.platform === 'github' ? 'ghToken' : 'glToken' }}</span>
              <span class="field__hint">{{ config.platform === 'github' ? 'GitHub Personal Access Token' : 'GitLab Personal Access Token' }}</span>
            </label>
            <div class="field__input-wrapper">
              <input
                :type="showToken ? 'text' : 'password'"
                v-model="platformConfig.token"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                class="field__input"
                @input="saveConfig"
              />
              <button
                class="field__toggle"
                @click="showToken = !showToken"
                type="button"
              >
                <EyeOff v-if="showToken" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </div>

          <!-- 用户名输入 -->
          <div class="field">
            <label class="field__label">
              <span>{{ config.platform === 'github' ? 'ghUser' : 'gitUser' }}</span>
              <span class="field__hint">{{ config.platform === 'github' ? 'GitHub 用户名' : 'GitLab 用户名/组名' }}</span>
            </label>
            <div class="field__input-wrapper">
              <input
                type="text"
                v-model="platformConfig.user"
                placeholder="octocat"
                class="field__input"
                @input="saveConfig"
              />
              <span class="field__suffix">
                <User :size="16" />
              </span>
            </div>
          </div>

          <!-- 平台选择 -->
          <div class="field">
            <label class="field__label">
              <span>平台</span>
              <span class="field__hint">选择代码托管平台</span>
            </label>
            <div class="field__platforms">
              <button
                v-for="p in platforms"
                :key="p.value"
                class="field__platform-btn"
                :class="{ 'field__platform-btn--active': config.platform === p.value }"
                @click="config.platform = p.value; saveConfig()"
                type="button"
              >
                <span>{{ p.label }}</span>
              </button>
            </div>
            <!-- GitLab 地址输入（GitLab 体系下显示） -->
            <div v-if="config.platform !== 'github'" class="field__sub-input">
              <input
                type="text"
                v-model="platformConfig.gitLabUrl"
                placeholder="https://gitlab.com"
                class="field__input"
                @input="saveConfig"
              />
              <span class="field__sub-hint">GitLab 服务器地址，gitlab.com 用户留空，jihulab 用户填 https://jihulab.com</span>
            </div>
          </div>

          <!-- 仓库名输入（多仓库，平台感知） -->
          <div class="field">
            <label class="field__label">
              <span>{{ config.platform === 'github' ? 'ghRepos' : 'gitRepos' }}</span>
              <span class="field__hint">{{ repoHint }}</span>
            </label>
            <div class="field__input-wrapper">
              <input
                type="text"
                :value="repoInput"
                @input="repoInput = $event.target.value"
                @keydown.enter.prevent="addRepo"
                @keydown.,.prevent="addRepo"
                placeholder="owner/repo-name，回车添加"
                class="field__input field__input--repos"
                :disabled="(platformConfig.repos || []).length >= 10"
              />
              <span class="field__suffix">
                <GitBranch :size="16" />
              </span>
            </div>
            <!-- 已添加的仓库标签 -->
            <div v-if="(platformConfig.repos || []).length > 0" class="field__tags">
              <span
                v-for="(repo, idx) in platformConfig.repos"
                :key="idx"
                class="field__tag"
              >
                <GitBranch :size="12" />
                <span>{{ repo }}</span>
                <button class="field__tag-remove" @click="removeRepo(idx)" type="button">
                  <X :size="12" />
                </button>
              </span>
            </div>
            <p class="field__hint field__hint--bottom">
              已添加 {{ (platformConfig.repos || []).length }}/10 个仓库
            </p>

            <!-- 拉取仓库按钮 -->
            <button
              class="field__fetch-btn"
              :disabled="!platformConfig.token || !platformConfig.user || repoLoading"
              @click="fetchMyRepos"
              type="button"
            >
              <Loader2 v-if="repoLoading" :size="14" class="field__spinner" />
              <RefreshCw v-else :size="14" />
              <span>{{ repoLoading ? '拉取中...' : '拉取我的仓库' }}</span>
            </button>

            <!-- 仓库列表弹层 -->
            <div v-if="showRepoList" class="repo-picker">
              <div class="repo-picker__header">
                <input
                  v-model="repoFilter"
                  type="text"
                  placeholder="搜索仓库..."
                  class="repo-picker__search"
                />
                <button class="repo-picker__close" @click="showRepoList = false" type="button">
                  <X :size="14" />
                </button>
              </div>
              <div v-if="repoError" class="repo-picker__error">{{ repoError }}</div>
              <div v-else-if="filteredRepos.length === 0" class="repo-picker__empty">
                没有匹配的仓库
              </div>
              <div v-else class="repo-picker__list">
                <button
                  v-for="r in filteredRepos"
                  :key="r.full_name"
                  class="repo-picker__item"
                  :class="{ 'repo-picker__item--added': isRepoAdded(r.full_name) }"
                  @click="toggleRepo(r.full_name)"
                  type="button"
                >
                  <div class="repo-picker__item-left">
                    <GitBranch :size="14" />
                    <span class="repo-picker__item-name">{{ r.full_name }}</span>
                  </div>
                  <span class="repo-picker__item-meta">
                    <template v-if="r.private">🔒 私有</template>
                    <template v-else>公开</template>
                    · ⭐ {{ r.stargazers_count }}
                  </span>
                  <span v-if="isRepoAdded(r.full_name)" class="repo-picker__check">✓</span>
                </button>
              </div>
              <div class="repo-picker__footer">
                共 {{ filteredRepos.length }} 个仓库
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- AI 服务配置分组 -->
      <section class="config-section">
        <div class="config-section__header">
          <div class="config-section__icon config-section__icon--ai">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4Z"
              />
              <circle cx="12" cy="15" r="2" />
            </svg>
          </div>
          <div>
            <h3 class="config-section__title">AI 服务设置</h3>
            <p class="config-section__desc">用于将 commit 记录智能整理为报告</p>
          </div>
        </div>

        <div class="config-section__fields">
          <!-- AI API Key -->
          <div class="field">
            <label class="field__label">
              <span>aiKey</span>
              <span class="field__hint">API 密钥</span>
            </label>
            <div class="field__input-wrapper">
              <input
                :type="showAiKey ? 'text' : 'password'"
                v-model="config.aiKey"
                placeholder="sk-xxxxxxxxxxxxxxxx"
                class="field__input"
                @input="saveConfig"
              />
              <button
                class="field__toggle"
                @click="showAiKey = !showAiKey"
                type="button"
              >
                <EyeOff v-if="showAiKey" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </div>

          <!-- AI Base URL -->
          <div class="field">
            <label class="field__label">
              <span>aiBaseUrl</span>
              <span class="field__hint">API 基础地址</span>
            </label>
            <div class="field__input-wrapper">
              <input
                type="text"
                v-model="config.aiBaseUrl"
                placeholder="https://api.openai.com/v1"
                class="field__input"
                @input="saveConfig"
              />
              <span class="field__suffix">
                <Globe :size="16" />
              </span>
            </div>
          </div>

          <!-- AI Model -->
          <div class="field">
            <label class="field__label">
              <span>aiModel</span>
              <span class="field__hint">模型名称</span>
            </label>
            <div class="field__input-wrapper">
              <input
                type="text"
                v-model="config.aiModel"
                placeholder="gpt-4o-mini"
                class="field__input"
                @input="saveConfig"
              />
              <span class="field__suffix">
                <Cpu :size="16" />
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 提交过滤配置 -->
      <section class="config-section">
        <div class="config-section__header">
          <div class="config-section__icon config-section__icon--filter">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </div>
          <div>
            <h3 class="config-section__title">提交过滤</h3>
            <p class="config-section__desc">按关键词排除不需要记录到日报的提交</p>
          </div>
        </div>

        <div class="config-section__fields">
          <div class="field">
            <label class="field__label">
              <span>排除关键词</span>
              <span class="field__hint">每行一个，匹配到的 commit 会被过滤掉</span>
            </label>
            <textarea
              v-model="filterText"
              class="field__textarea"
              rows="4"
              placeholder="Merge branch&#10;Merge pull request&#10;chore(deps)&#10;Bump version&#10;WIP"
              @input="syncFilters"
            ></textarea>
            <div class="field__presets">
              <span class="field__preset-hint">快速添加：</span>
              <button
                v-for="preset in filterPresets"
                :key="preset.label"
                class="field__preset-btn"
                @click="addPreset(preset.patterns)"
                type="button"
              >
                {{ preset.label }}
              </button>
            </div>
            <p class="field__hint field__hint--bottom">
              当前 {{ commitFilterCount }} 条过滤规则
            </p>
          </div>
        </div>
      </section>
      <!-- 自定义报告模板 -->
      <section class="config-section">
        <div class="config-section__header">
          <div class="config-section__icon config-section__icon--prompt">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="9" y1="10" x2="15" y2="10"/>
              <line x1="12" y1="7" x2="12" y2="13"/>
            </svg>
          </div>
          <div>
            <h3 class="config-section__title">输出格式</h3>
            <p class="config-section__desc">告诉 AI 按照什么结构输出报告，留空使用默认格式</p>
          </div>
        </div>

        <div class="config-section__fields">
          <div class="field">
            <label class="field__label">
              <span>自定义输出格式</span>
              <span class="field__hint">只需写你想要的章节结构，仓库、时间、commit 列表系统会自动带上</span>
            </label>
            <textarea
              v-model="config.customPrompt"
              class="field__textarea field__textarea--prompt"
              rows="6"
              :placeholder="defaultPrompt"
              @input="saveConfig"
            ></textarea>
            <div class="field__prompt-actions">
              <button class="field__prompt-btn" @click="resetPrompt" type="button">
                <RefreshCw :size="12" />
                恢复默认
              </button>
            </div>
          </div>
        </div>
      </section>
      <div class="config-page__actions">
        <button
          class="config-page__btn config-page__btn--secondary"
          @click="clearConfig"
        >
          <Trash2 :size="16" />
          清空配置
        </button>
        <button
          class="config-page__btn config-page__btn--primary"
          @click="saveConfig(true)"
        >
          <Check :size="16" />
          保存配置
          <span v-if="saved" class="config-page__saved-tip">✓ 已保存</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import {
  Eye,
  EyeOff,
  User,
  GitBranch,
  Globe,
  Cpu,
  Trash2,
  Check,
  X,
  Loader2,
  RefreshCw,
} from "lucide-vue-next";

// localStorage 存储键名
const STORAGE_KEY = "report_config";

// 仓库输入
const repoInput = ref("");

// 配置数据（GitHub/GitLab 独立存储）
const config = reactive({
  platform: "github",
  github: { token: "", user: "", repos: [] },
  gitlab: { token: "", user: "", repos: [], gitLabUrl: "" },
  aiKey: "",
  aiBaseUrl: "",
  aiModel: "",
  commitFilters: [],
  customPrompt: "",
});

// 当前平台对应的配置子对象
const platformConfig = computed(() => {
  if (config.platform === "github") return config.github;
  return config.gitlab;
});

// 过滤规则文本（用于 textarea 双向绑定）
const filterText = ref("");

// 过滤预设
const filterPresets = [
  { label: "合并提交", patterns: ["Merge branch", "Merge pull request", "Merge remote"] },
  { label: "依赖更新", patterns: ["chore(deps)", "Bump version", "update dependency"] },
  { label: "杂项", patterns: ["WIP", "lint", "format", "docs"] },
];

// 过滤规则数量
const commitFilterCount = computed(() => {
  return (config.commitFilters || []).length;
});

// 同步 textarea 内容到 config.commitFilters
function syncFilters() {
  const lines = filterText.value
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  config.commitFilters = lines;
  saveConfig();
}

// 添加预设规则
function addPreset(patterns) {
  const existing = new Set(config.commitFilters || []);
  for (const p of patterns) {
    if (!existing.has(p)) {
      existing.add(p);
    }
  }
  config.commitFilters = [...existing];
  filterText.value = config.commitFilters.join("\n");
  saveConfig();
}

// 平台选项
const platforms = [
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
];

// 依赖平台的提示文字
const repoHint = computed(() => {
  switch (config.platform) {
    case "github":
      return "仓库名称 (owner/repo)，回车添加多个";
    case "gitlab":
      return "项目路径 (namespace/project)，回车添加多个";
    default:
      return "仓库名称，回车添加多个";
  }
});

// 默认输出格式（只写结构，系统会自动带上 commit 上下文）
const defaultPrompt =
  "请生成包含以下章节的 Markdown 报告：\n" +
  "1. **概述** — 总体说明\n" +
  "2. **功能开发** — 新功能和特性\n" +
  "3. **Bug 修复** — 修复的问题\n" +
  "4. **其他变更**\n" +
  "5. **总结与计划**\n\n" +
  "使用中文，专业清晰。";

// 恢复默认
function resetPrompt() {
  config.customPrompt = "";
  saveConfig();
}

// 密码可见性控制
const showToken = ref(false);
const showAiKey = ref(false);

// 保存成功提示
const saved = ref(false);

// 仓库拉取状态
const repoLoading = ref(false);
const repoError = ref("");
const showRepoList = ref(false);
const repoFilter = ref("");
const fetchedRepos = ref([]);

/**
 * 计算已过滤的仓库列表
 */
const filteredRepos = computed(() => {
  const filter = repoFilter.value.toLowerCase().trim();
  if (!filter) return fetchedRepos.value;
  return fetchedRepos.value.filter(
    (r) =>
      r.full_name.toLowerCase().includes(filter) ||
      r.name.toLowerCase().includes(filter)
  );
});

/**
 * 判断仓库是否已添加
 */
function isRepoAdded(fullName) {
  return (platformConfig.repos || []).includes(fullName);
}

/**
 * 切换仓库添加/移除
 */
function toggleRepo(fullName) {
  if (isRepoAdded(fullName)) {
    const idx = (platformConfig.repos || []).indexOf(fullName);
    if (idx !== -1) removeRepo(idx);
  } else {
    if ((platformConfig.repos || []).length >= 10) return;
    if (!platformConfig.repos) platformConfig.repos = [];
    platformConfig.repos.push(fullName);
    saveConfig();
  }
}

/**
 * 根据选中的平台拉取仓库列表
 */
async function fetchMyRepos() {
  if (!platformConfig.value.token || !platformConfig.value.user) return;

  repoLoading.value = true;
  repoError.value = "";
  fetchedRepos.value = [];

  try {
    const platform = config.platform || "github";
    let url, repos;

    if (platform === "github") {
      // GitHub: 获取用户仓库
      url = `https://api.github.com/users/${platformConfig.value.user}/repos?per_page=100&sort=updated&type=all`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${platformConfig.value.token}`,
          "User-Agent": "git-report-generator",
        },
      });
      if (!response.ok) throw new Error(`请求失败 (${response.status})`);
      repos = await response.json();
      if (!Array.isArray(repos)) throw new Error("返回数据格式异常");

      // 转为统一格式
      fetchedRepos.value = repos
        .filter((r) => r.full_name)
        .map((r) => ({
          full_name: r.full_name,
          name: r.name,
          private: r.private,
          stargazers_count: r.stargazers_count || 0,
          updated_at: r.updated_at || r.pushed_at || "",
        }));
    } else {
      // GitLab: 获取用户有权限的项目
      const host = platformConfig.value.gitLabUrl
        ? platformConfig.value.gitLabUrl.replace(/\/+$/, "")
        : "https://gitlab.com";
      url = `${host}/api/v4/projects?membership=true&per_page=100&order_by=updated_at`;
      const response = await fetch(url, {
        headers: {
          "PRIVATE-TOKEN": platformConfig.value.token,
          "User-Agent": "git-report-generator",
        },
      });
      if (!response.ok) throw new Error(`请求失败 (${response.status})`);
      repos = await response.json();
      if (!Array.isArray(repos)) throw new Error("返回数据格式异常");

      // GitLab 用 path_with_namespace 作为仓库标识
      fetchedRepos.value = repos
        .filter((r) => r.path_with_namespace)
        .map((r) => ({
          full_name: r.path_with_namespace,
          name: r.name || r.path || "",
          private: r.visibility === "private",
          stargazers_count: r.star_count || 0,
          updated_at: r.last_activity_at || r.updated_at || "",
        }));
    }

    // 排序：已添加的排前面，再按更新时间
    fetchedRepos.value.sort((a, b) => {
      const aAdded = isRepoAdded(a.full_name) ? -1 : 0;
      const bAdded = isRepoAdded(b.full_name) ? -1 : 0;
      if (aAdded !== bAdded) return aAdded - bAdded;
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });

    repoFilter.value = "";
    showRepoList.value = true;

    if (fetchedRepos.value.length === 0) {
      repoError.value = "没有找到任何仓库";
    }
  } catch (e) {
    repoError.value = e.message || "拉取仓库列表失败";
    showRepoList.value = true;
  } finally {
    repoLoading.value = false;
  }
}

/**
 * 添加仓库
 */
function addRepo() {
  const raw = repoInput.value.trim().replace(/,$/, "");
  if (!raw) return;

  // 校验 owner/repo 格式
  if (!/^[\w.-]+\/[\w.-]+$/.test(raw)) {
    return;
  }

  // 去重
  if ((platformConfig.repos || []).includes(raw)) {
    repoInput.value = "";
    return;
  }

  // 上限 10 个
  if ((platformConfig.repos || []).length >= 10) {
    return;
  }

  if (!platformConfig.repos) {
    platformConfig.repos = [];
  }
  platformConfig.repos.push(raw);
  repoInput.value = "";
  saveConfig();
}

/**
 * 移除仓库
 * @param {number} idx
 */
function removeRepo(idx) {
  if (platformConfig.repos) {
    platformConfig.repos.splice(idx, 1);
    saveConfig();
  }
}

/**
 * 从 localStorage 加载配置
 */
function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);

      // 兼容旧数据（扁平格式 → 新嵌套格式）
      if (data.ghToken !== undefined || data.ghUser !== undefined) {
        config.github.token = data.ghToken || "";
        config.github.user = data.ghUser || "";
        config.github.repos = data.ghRepos || (data.ghRepo ? [data.ghRepo] : []);
        config.gitlab.token = data.glToken || "";
        config.gitlab.user = data.glUser || "";
        config.gitlab.repos = data.glRepos || [];
        config.gitlab.gitLabUrl = data.gitLabUrl || "";
        config.platform = data.platform || "github";
        config.aiKey = data.aiKey || "";
        config.aiBaseUrl = data.aiBaseUrl || "";
        config.aiModel = data.aiModel || "";
        config.commitFilters = data.commitFilters || [];
        config.customPrompt = data.customPrompt || "";
      } else {
        // 新格式，直接覆盖
        Object.assign(config, data);
      }
    }

    // 同步过滤规则文本
    if (config.commitFilters && config.commitFilters.length > 0) {
      filterText.value = config.commitFilters.join("\n");
    }
  } catch (e) {
    console.warn("读取配置失败:", e);
  }
}

/**
 * 保存配置到 localStorage
 * @param {boolean} showTip - 是否显示保存成功提示
 */
function saveConfig(showTip = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    if (showTip) {
      saved.value = true;
      setTimeout(() => {
        saved.value = false;
      }, 2000);
    }
  } catch (e) {
    console.error("保存配置失败:", e);
  }
}

/**
 * 清空所有配置
 */
function clearConfig() {
  config.platform = "github";
  config.github = { token: "", user: "", repos: [] };
  config.gitlab = { token: "", user: "", repos: [], gitLabUrl: "" };
  config.aiKey = "";
  config.aiBaseUrl = "";
  config.aiModel = "";
  config.commitFilters = [];
  config.customPrompt = "";
  filterText.value = "";
  saveConfig(false);
}

/**
 * 获取当前配置（供父组件调用）
 */
function getConfig() {
  return { ...config };
}

// 页面加载时读取配置
onMounted(() => {
  loadConfig();
});

// 暴露方法给父组件
defineExpose({ getConfig, saveConfig });
</script>

<style lang="scss" scoped>
@import '../styles/variables';
@import '../styles/mixins';

.config-page {
  max-width: 680px;
  margin: 0 auto;
  padding: $spacing-xl $spacing-lg;

  &__header {
    margin-bottom: $spacing-2xl;
  }

  &__title {
    font-size: $font-size-xl;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: $spacing-sm;
    letter-spacing: -0.02em;
  }

  &__desc {
    font-size: $font-size-base;
    color: $color-text-secondary;
    line-height: 1.6;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: $spacing-xl;
  }

  &__actions {
    @include flex-between;
    padding-top: $spacing-lg;
    border-top: 1px solid $color-border;
  }

  &__btn {
    @include flex-center;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-lg;
    border-radius: $radius-md;
    font-size: $font-size-base;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;
    border: none;

    &--primary {
      background: $color-primary;
      color: #fff;

      &:hover {
        background: $color-primary-hover;
        box-shadow: $shadow-glow;
      }
    }

    &--secondary {
      background: transparent;
      color: $color-text-tertiary;
      border: 1px solid $color-border;

      &:hover {
        color: $color-error;
        border-color: $color-error;
        background: rgba($color-error, 0.08);
      }
    }
  }

  &__saved-tip {
    font-size: $font-size-xs;
    color: $color-success;
    margin-left: $spacing-xs;
  }
}

// 配置分组
.config-section {
  @include card-base;

  &__header {
    @include flex-start;
    gap: $spacing-md;
    margin-bottom: $spacing-lg;
    padding-bottom: $spacing-md;
    border-bottom: 1px solid $color-border;
  }

  &__icon {
    @include flex-center;
    width: 36px;
    height: 36px;
    border-radius: $radius-md;
    background: $color-primary-light;
    color: $color-primary;
    flex-shrink: 0;

    &--ai {
      background: rgba($color-success, 0.1);
      color: $color-success;
    }

    &--filter {
      background: rgba($color-warning, 0.1);
      color: $color-warning;
    }

    &--prompt {
      background: rgba($color-primary, 0.1);
      color: $color-primary;
    }
  }

  &__title {
    font-size: $font-size-base;
    font-weight: 600;
    color: $color-text-primary;
  }

  &__desc {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
    margin-top: 2px;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }
}

// 表单字段
.field {
  &__label {
    @include flex-start;
    gap: $spacing-sm;
    margin-bottom: $spacing-sm;
    font-size: $font-size-sm;
    font-weight: 500;
    color: $color-text-primary;
  }

  &__hint {
    font-size: $font-size-xs;
    color: $color-text-muted;
    font-weight: 400;
  }

  &__input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  &__input {
    @include input-base;
    padding-right: 40px;
    font-family: $font-mono;
    font-size: $font-size-sm;
  }

  &__toggle {
    position: absolute;
    right: 8px;
    @include flex-center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: $color-text-muted;
    cursor: pointer;
    border-radius: $radius-sm;
    transition: all $transition-fast;

    &:hover {
      color: $color-text-secondary;
      background: $color-bg-hover;
    }
  }

  &__suffix {
    position: absolute;
    right: 12px;
    color: $color-text-muted;
    pointer-events: none;
  }

  // 过滤条件文本框
  &__textarea {
    width: 100%;
    padding: $spacing-sm $spacing-md;
    background: $color-bg-input;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    color: $color-text-primary;
    font-size: $font-size-sm;
    font-family: $font-mono;
    line-height: 1.6;
    resize: vertical;
    outline: none;
    transition: border-color $transition-fast, box-shadow $transition-fast;

    &::placeholder {
      color: $color-text-muted;
    }

    &:hover {
      border-color: $color-border-hover;
    }

    &:focus {
      border-color: $color-border-focus;
      box-shadow: 0 0 0 3px $color-primary-light;
    }
  }

  // 预设按钮
  &__presets {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin-top: $spacing-sm;
  }

  &__preset-hint {
    font-size: $font-size-xs;
    color: $color-text-muted;
    margin-right: 2px;
  }

  &__preset-btn {
    padding: 2px 8px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text-tertiary;
    font-size: $font-size-xs;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $color-primary-light;
      border-color: $color-primary;
      color: $color-primary;
    }
  }

  // 多仓库 tag 样式
  &__input--repos {
    padding-right: 36px;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: $spacing-sm;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    background: $color-primary-light;
    color: $color-primary;
    border-radius: $radius-sm;
    font-size: $font-size-xs;
    font-family: $font-mono;
    line-height: 1.4;
  }

  &__tag-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: none;
    background: transparent;
    color: $color-primary;
    cursor: pointer;
    border-radius: 3px;
    padding: 0;
    transition: all $transition-fast;

    &:hover {
      background: rgba($color-primary, 0.2);
    }
  }

  &__hint--bottom {
    margin-top: $spacing-xs;
    font-weight: 400;
  }

  // 拉取仓库按钮
  &__fetch-btn {
    @include flex-start;
    gap: 6px;
    margin-top: $spacing-sm;
    padding: 6px 12px;
    border: 1px dashed $color-border;
    border-radius: $radius-md;
    background: transparent;
    color: $color-text-tertiary;
    font-size: $font-size-xs;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;
    width: 100%;

    &:hover:not(:disabled) {
      border-color: $color-primary;
      color: $color-primary;
      background: $color-primary-light;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &__spinner {
    animation: spin 1s linear infinite;
  }

  // 平台选择按钮
  &__platforms {
    display: flex;
    gap: 2px;
    background: $color-bg-tertiary;
    padding: 2px;
    border-radius: $radius-md;
    border: 1px solid $color-border;
  }

  &__platform-btn {
    flex: 1;
    padding: 5px 12px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: $color-text-tertiary;
    font-size: $font-size-xs;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;
    white-space: nowrap;

    &:hover {
      color: $color-text-primary;
      background: rgba($color-bg-hover, 0.7);
    }

    &--active {
      background: $color-bg-card;
      color: $color-primary;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

      &:hover {
        background: $color-bg-card;
        color: $color-primary;
      }
    }
  }

  // 平台子输入（自托管地址）
  &__sub-input {
    margin-top: $spacing-sm;
  }

  &__sub-hint {
    display: block;
    margin-top: 4px;
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  // Prompt 文本框（更高）
  &__textarea--prompt {
    min-height: 180px;
    font-family: $font-family;
    font-size: $font-size-sm;
    line-height: 1.7;
  }

  // Prompt 操作按钮区
  &__prompt-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-sm;
    margin-top: $spacing-sm;
  }

  &__prompt-btn {
    @include flex-start;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text-tertiary;
    font-size: $font-size-xs;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $color-primary-light;
      border-color: $color-primary;
      color: $color-primary;
    }

    code {
      font-family: $font-mono;
      font-size: $font-size-xs;
    }
  }
}

// 仓库选择器弹层
.repo-picker {
  margin-top: $spacing-sm;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-bg-card;
  overflow: hidden;
  max-height: 320px;
  display: flex;
  flex-direction: column;

  &__header {
    @include flex-between;
    padding: $spacing-sm;
    border-bottom: 1px solid $color-border;
    gap: $spacing-sm;
  }

  &__search {
    flex: 1;
    padding: 4px 8px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-bg-input;
    color: $color-text-primary;
    font-size: $font-size-xs;
    outline: none;
    transition: border-color $transition-fast;

    &:focus {
      border-color: $color-border-focus;
    }

    &::placeholder {
      color: $color-text-muted;
    }
  }

  &__close {
    @include flex-center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: $color-text-muted;
    cursor: pointer;
    border-radius: $radius-sm;

    &:hover {
      background: $color-bg-hover;
      color: $color-text-primary;
    }
  }

  &__error {
    padding: $spacing-md;
    color: $color-error;
    font-size: $font-size-xs;
    text-align: center;
  }

  &__empty {
    padding: $spacing-lg;
    color: $color-text-muted;
    font-size: $font-size-xs;
    text-align: center;
  }

  &__list {
    flex: 1;
    overflow-y: auto;
    padding: $spacing-xs;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__item {
    @include flex-between;
    gap: $spacing-sm;
    padding: 6px 8px;
    border: none;
    border-radius: $radius-sm;
    background: transparent;
    cursor: pointer;
    transition: all $transition-fast;
    text-align: left;
    width: 100%;

    &:hover {
      background: $color-bg-hover;
    }

    &--added {
      background: $color-primary-light;

      &:hover {
        background: rgba($color-primary, 0.12);
      }

      .repo-picker__item-name {
        color: $color-primary;
      }
    }
  }

  &__item-left {
    @include flex-start;
    gap: 6px;
    min-width: 0;
    flex: 1;
    color: $color-text-tertiary;
  }

  &__item-name {
    font-size: $font-size-sm;
    font-weight: 500;
    color: $color-text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-meta {
    font-size: $font-size-xs;
    color: $color-text-muted;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__check {
    color: $color-primary;
    font-weight: 700;
    font-size: $font-size-sm;
    flex-shrink: 0;
  }

  &__footer {
    padding: 4px $spacing-sm;
    border-top: 1px solid $color-border;
    font-size: $font-size-xs;
    color: $color-text-muted;
    text-align: center;
  }
}

// 加载动画
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@include respond-to($breakpoint-sm) {
  .config-page {
    padding: $spacing-md;
  }
}
</style>
