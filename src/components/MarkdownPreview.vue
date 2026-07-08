<template>
  <!-- Markdown 预览卡片 -->
  <div class="markdown-preview">
    <!-- 卡片头部 -->
    <div class="markdown-preview__header">
      <div class="markdown-preview__title">
        <FileText :size="16" :stroke-width="1.5" />
        <span>生成结果</span>
      </div>
      <div class="markdown-preview__actions">
        <button
          class="markdown-preview__btn"
          @click="copyContent"
          :title="copied ? '已复制' : '复制内容'"
        >
          <Check
            v-if="copied"
            :size="14"
            class="markdown-preview__icon--success"
          />
          <Copy v-else :size="14" />
          <span>{{ copied ? "已复制" : "复制" }}</span>
        </button>
      </div>
    </div>

    <!-- Markdown 渲染内容 -->
    <div class="markdown-preview__body" ref="contentRef">
      <div
        v-if="content"
        class="markdown-preview__content"
        v-html="renderedContent"
      ></div>
      <div v-else class="markdown-preview__empty">
        <FileText :size="32" :stroke-width="1" />
        <p>尚无内容</p>
        <span>点击「生成报告」按钮获取结果</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { marked } from "marked";
import { FileText, Copy, Check } from "lucide-vue-next";

// 接收 Markdown 文本
const props = defineProps({
  content: {
    type: String,
    default: "",
  },
});

// 复制状态
const copied = ref(false);
const contentRef = ref(null);

// 配置 marked 渲染选项
marked.setOptions({
  breaks: true,
  gfm: true,
});

// 将 Markdown 转为 HTML
const renderedContent = computed(() => {
  if (!props.content) return "";
  try {
    return marked.parse(props.content);
  } catch (e) {
    return "<p>渲染失败</p>";
  }
});

/**
 * 一键复制 Markdown 原文
 */
async function copyContent() {
  if (!props.content) return;
  try {
    await navigator.clipboard.writeText(props.content);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    // 降级方案
    const textarea = document.createElement("textarea");
    textarea.value = props.content;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/variables';
@import '../styles/mixins';

.markdown-preview {
  @include card-base;
  padding: 0;
  overflow: hidden;

  // 卡片头部
  &__header {
    @include flex-between;
    padding: $spacing-md $spacing-lg;
    border-bottom: 1px solid $color-border;
    background: $color-bg-tertiary;
  }

  &__title {
    @include flex-start;
    gap: $spacing-sm;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $color-text-primary;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
  }

  &__btn {
    @include flex-start;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text-secondary;
    font-size: $font-size-xs;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $color-bg-hover;
      color: $color-text-primary;
      border-color: $color-border-hover;
    }
  }

  &__icon--success {
    color: $color-success;
  }

  // 内容区域
  &__body {
    padding: $spacing-lg;
    min-height: 200px;
    max-height: 600px;
    overflow-y: auto;
  }

  // Markdown 渲染样式（深度选择器）
  &__content {
    font-size: $font-size-base;
    line-height: 1.75;
    color: $color-text-primary;

    :deep(h1) {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 1.5rem 0 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid $color-border;
      letter-spacing: -0.02em;
    }

    :deep(h2) {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 1.25rem 0 0.5rem;
      color: $color-text-primary;
    }

    :deep(h3) {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 1rem 0 0.5rem;
    }

    :deep(p) {
      margin: 0.5rem 0;
    }

    :deep(ul),
    :deep(ol) {
      padding-left: 1.5rem;
      margin: 0.5rem 0;

      li {
        margin: 0.25rem 0;
        color: $color-text-primary;
      }
    }

    :deep(code) {
      background: $color-bg-input;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.85em;
      font-family: $font-mono;
      color: $color-primary-hover;
      border: 1px solid $color-border;
    }

    :deep(pre) {
      background: $color-bg-input;
      padding: $spacing-md;
      border-radius: $radius-md;
      overflow-x: auto;
      margin: 0.75rem 0;
      border: 1px solid $color-border;

      code {
        background: none;
        padding: 0;
        border: none;
        color: $color-text-primary;
      }
    }

    :deep(blockquote) {
      border-left: 3px solid $color-primary;
      padding-left: $spacing-md;
      margin: 0.75rem 0;
      color: $color-text-secondary;
      background: $color-primary-light;
      padding: $spacing-sm $spacing-md;
      border-radius: 0 $radius-sm $radius-sm 0;
    }

    :deep(table) {
      width: 100%;
      border-collapse: collapse;
      margin: 0.75rem 0;
      font-size: $font-size-sm;

      th,
      td {
        padding: $spacing-sm $spacing-md;
        border: 1px solid $color-border;
        text-align: left;
      }

      th {
        background: $color-bg-tertiary;
        font-weight: 600;
        color: $color-text-primary;
      }

      tr:hover td {
        background: $color-bg-hover;
      }
    }

    :deep(strong) {
      color: $color-text-primary;
      font-weight: 600;
    }

    :deep(hr) {
      border: none;
      border-top: 1px solid $color-border;
      margin: 1rem 0;
    }

    :deep(a) {
      color: $color-primary;
      text-decoration: underline;
      text-underline-offset: 2px;

      &:hover {
        color: $color-primary-hover;
      }
    }
  }

  // 空状态
  &__empty {
    @include flex-center;
    flex-direction: column;
    gap: $spacing-sm;
    padding: $spacing-2xl;
    color: $color-text-muted;
    text-align: center;

    p {
      font-size: $font-size-base;
      font-weight: 500;
      color: $color-text-tertiary;
    }

    span {
      font-size: $font-size-xs;
    }
  }
}

// 响应式
@include respond-to($breakpoint-sm) {
  .markdown-preview {
    &__body {
      padding: $spacing-md;
      min-height: 150px;
    }
  }
}
</style>
