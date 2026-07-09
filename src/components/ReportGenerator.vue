<template>
  <!-- 报告生成主页 -->
  <div class="report-page">
    <!-- 页面头部 -->
    <div class="report-page__header">
      <h2 class="report-page__title">报告生成</h2>
      <p class="report-page__desc">
        基于 Git 提交记录，利用 AI 自动生成结构化的日报或周报。
      </p>
    </div>

    <!-- 生成控制面板 -->
    <div class="report-page__controls">
      <!-- 时间范围选择 -->
      <div class="control-group">
        <label class="control-group__label">时间范围</label>
        <div class="control-group__options">
          <button
            v-for="range in timeRanges"
            :key="range.value"
            class="control-group__btn"
            :class="{
              'control-group__btn--active': selectedRange === range.value,
            }"
            @click="selectedRange = range.value"
          >
            {{ range.label }}
          </button>
        </div>
      </div>

      <!-- 报告类型选择 -->
      <div class="control-group">
        <label class="control-group__label">报告类型</label>
        <div class="control-group__options">
          <button
            v-for="type in reportTypes"
            :key="type.value"
            class="control-group__btn"
            :class="{
              'control-group__btn--active': selectedType === type.value,
            }"
            @click="selectedType = type.value"
          >
            {{ type.label }}
          </button>
        </div>
      </div>

      <!-- 生成按钮 -->
      <button
        class="report-page__generate-btn"
        :class="{ 'report-page__generate-btn--loading': loading }"
        :disabled="loading"
        @click="generateReport"
      >
        <Loader2 v-if="loading" :size="18" class="report-page__spinner" />
        <Sparkles v-else :size="18" />
        <span>{{ loading ? "生成中..." : "生成报告" }}</span>
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="report-page__error">
      <AlertCircle :size="16" />
      <span>{{ error }}</span>
      <button class="report-page__error-close" @click="error = ''">
        <X :size="14" />
      </button>
    </div>

    <!-- 结果展示区 -->
    <MarkdownPreview :content="generatedContent" />

    <!-- 配置状态提示 -->
    <div v-if="showConfigHint" class="report-page__hint">
      <Info :size="14" />
      <span>请确保已在「配置中心」完成 GitHub 和 AI 服务配置</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { Sparkles, Loader2, AlertCircle, X, Info } from "lucide-vue-next";
import MarkdownPreview from "./MarkdownPreview.vue";

// 时间范围选项
const timeRanges = [
  { label: "今天", value: "today" },
  { label: "最近3天", value: "3days" },
  { label: "本周", value: "week" },
  { label: "最近两周", value: "2weeks" },
];

// 报告类型选项
const reportTypes = [
  { label: "日报", value: "daily" },
  { label: "周报", value: "weekly" },
];

// 状态
const selectedRange = ref("week");
const selectedType = ref("weekly");
const loading = ref(false);
const generatedContent = ref("");
const error = ref("");
const showConfigHint = ref(true);

/**
 * 生成报告
 * 从 localStorage 读取配置，发送请求到后端 API
 */
async function generateReport() {
  // 读取配置
  let raw = null;
  try {
    raw = localStorage.getItem("report_config");
    raw = raw ? JSON.parse(raw) : null;
  } catch (e) {
    error.value = "读取配置失败，请检查配置中心设置";
    return;
  }

  // 兼容新旧格式
  let ghToken, ghUser, repos, platform, gitLabUrl, commitFilters, aiKey, aiBaseUrl, aiModel, customPrompt;

  if (raw?.github && raw?.gitlab) {
    // === 新嵌套格式 ===
    const cfg = raw.platform === "github" ? raw.github : raw.gitlab;
    ghToken = cfg.token;
    ghUser = cfg.user;
    repos = cfg.repos || [];
    platform = raw.platform || "github";
    gitLabUrl = cfg.gitLabUrl || "";
    aiKey = raw.aiKey || "";
    aiBaseUrl = raw.aiBaseUrl || "";
    aiModel = raw.aiModel || "";
    commitFilters = raw.commitFilters || [];
    customPrompt = raw.customPrompt || "";
  } else {
    // === 旧扁平格式兼容 ===
    ghToken = raw?.ghToken || "";
    ghUser = raw?.ghUser || "";
    repos = raw?.ghRepos?.length ? raw.ghRepos : raw?.ghRepo ? [raw.ghRepo] : [];
    platform = raw?.platform || "github";
    gitLabUrl = raw?.gitLabUrl || "";
    aiKey = raw?.aiKey || "";
    aiBaseUrl = raw?.aiBaseUrl || "";
    aiModel = raw?.aiModel || "";
    commitFilters = raw?.commitFilters || [];
  }
  customPrompt = raw?.customPrompt || "";

  // 校验
  if (!ghToken || !ghUser || repos.length === 0) {
    error.value = "请先在「配置中心」完成配置并添加至少一个仓库";
    showConfigHint.value = true;
    return;
  }
  if (!aiKey || !aiBaseUrl || !aiModel) {
    error.value = "请先在「配置中心」完成 AI 服务配置";
    showConfigHint.value = true;
    return;
  }

  // 开始生成
  loading.value = true;
  error.value = "";
  showConfigHint.value = false;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: { ghToken, ghUser, ghRepos: repos, platform, gitLabUrl, commitFilters, customPrompt, aiKey, aiBaseUrl, aiModel },
        options: { timeRange: selectedRange.value, reportType: selectedType.value },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const detail = errData.failedRepos ? `\n${errData.failedRepos.join('\n')}` : '';
      throw new Error(`${errData.message || `请求失败 (${response.status})`}${detail}`);
    }

    const data = await response.json();
    generatedContent.value =
      data.content || data.result || data.report || "报告生成完成，但返回数据格式异常。";
  } catch (e) {
    error.value = e.message || "生成报告时发生未知错误";
    console.error("生成报告失败:", e);
  } finally {
    loading.value = false;
  }
}

// 页面加载时检查配置完整性
onMounted(() => {
  try {
    const raw = localStorage.getItem("report_config");
    const data = raw ? JSON.parse(raw) : null;
    if (!data) { showConfigHint.value = true; return; }

    // 判断新旧格式
    if (data.github && data.gitlab) {
      const cfg = data.platform === "github" ? data.github : data.gitlab;
      if (!cfg.token || !data.aiKey || (cfg.repos || []).length === 0) {
        showConfigHint.value = true;
      } else {
        showConfigHint.value = false;
      }
    } else {
      const repos = data.ghRepos?.length ? data.ghRepos : data.ghRepo ? [data.ghRepo] : [];
      if (!data.ghToken || repos.length === 0 || !data.aiKey) {
        showConfigHint.value = true;
      } else {
        showConfigHint.value = false;
      }
    }
  } catch {
    showConfigHint.value = true;
  }
});
</script>

<style lang="scss" scoped>
@import '../styles/variables';
@import '../styles/mixins';

.report-page {
  max-width: 800px;
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

  // 控制面板
  &__controls {
    @include card-base;
    margin-bottom: $spacing-lg;
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
  }

  // 生成按钮
  &__generate-btn {
    @include button-primary;
    width: 100%;
    justify-content: center;
    padding: $spacing-md $spacing-lg;
    font-size: $font-size-md;
    border-radius: $radius-md;
    margin-top: $spacing-sm;

    &--loading {
      background: $color-bg-hover;
      color: $color-text-secondary;
    }
  }

  &__spinner {
    animation: spin 1s linear infinite;
  }

  // 错误提示
  &__error {
    @include flex-start;
    gap: $spacing-sm;
    padding: $spacing-md $spacing-lg;
    background: rgba($color-error, 0.08);
    border: 1px solid rgba($color-error, 0.2);
    border-radius: $radius-md;
    color: $color-error;
    font-size: $font-size-sm;
    margin-bottom: $spacing-lg;
  }

  &__error-close {
    margin-left: auto;
    @include flex-center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: $color-error;
    cursor: pointer;
    border-radius: $radius-sm;
    opacity: 0.6;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 1;
    }
  }

  // 配置提示
  &__hint {
    @include flex-start;
    gap: $spacing-sm;
    margin-top: $spacing-md;
    padding: $spacing-sm $spacing-md;
    background: $color-primary-light;
    border-radius: $radius-md;
    color: $color-primary;
    font-size: $font-size-xs;
  }
}

// 控制组
.control-group {
  &__label {
    display: block;
    font-size: $font-size-sm;
    font-weight: 500;
    color: $color-text-secondary;
    margin-bottom: $spacing-sm;
  }

  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
  }

  &__btn {
    padding: 6px 16px;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: transparent;
    color: $color-text-secondary;
    font-size: $font-size-sm;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $color-bg-hover;
      color: $color-text-primary;
      border-color: $color-border-hover;
    }

    &--active {
      background: $color-primary-light;
      color: $color-primary;
      border-color: $color-primary;

      &:hover {
        background: $color-primary-light;
        color: $color-primary;
      }
    }
  }
}

// 加载动画
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 响应式
@include respond-to($breakpoint-sm) {
  .report-page {
    padding: $spacing-md;

    &__controls {
      padding: $spacing-md;
    }

    &__generate-btn {
      padding: $spacing-sm $spacing-md;
      font-size: $font-size-base;
    }
  }

  .control-group {
    &__options {
      gap: 6px;
    }

    &__btn {
      padding: 5px 12px;
      font-size: $font-size-xs;
    }
  }
}
</style>
