<template>
  <!-- 顶部导航栏 -->
  <nav class="navbar">
    <div class="navbar__inner">
      <!-- Logo 区域 -->
      <div class="navbar__brand">
        <div class="navbar__logo">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v6m0 6v6" />
            <path d="M3 12h6m6 0h6" />
          </svg>
        </div>
        <span class="navbar__title">Git Report</span>
        <span class="navbar__badge">Generator</span>
      </div>

      <!-- Tab 切换 -->
      <div class="navbar__tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="navbar__tab"
          :class="{ 'navbar__tab--active': modelValue === tab.key }"
          @click="$emit('update:modelValue', tab.key)"
        >
          <component :is="tab.icon" :size="16" :stroke-width="1.5" />
          <span class="navbar__tab-label">{{ tab.label }}</span>
        </button>
      </div>

      <!-- 右侧占位 -->
      <div class="navbar__actions">
        <span class="navbar__version">v1.0</span>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { shallowRef } from "vue";
import { FileText, Settings } from "lucide-vue-next";

// 接收当前激活的 tab
defineProps({
  modelValue: {
    type: String,
    default: "report",
  },
});

// Tab 切换事件
defineEmits(["update:modelValue"]);

// Tab 配置数据
const tabs = shallowRef([
  { key: "report", label: "报告生成", icon: FileText },
  { key: "config", label: "配置中心", icon: Settings },
]);
</script>

<style lang="scss" scoped>
@import '../styles/variables';
@import '../styles/mixins';

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba($color-bg-secondary, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid $color-border;

  &__inner {
    max-width: $breakpoint-xl;
    margin: 0 auto;
    padding: 0 $spacing-lg;
    height: 56px;
    @include flex-between;
  }

  &__brand {
    @include flex-start;
    gap: $spacing-sm;
  }

  &__logo {
    @include flex-center;
    width: 32px;
    height: 32px;
    background: $color-primary-light;
    border-radius: $radius-md;
    color: $color-primary;
    transition: all $transition-fast;

    &:hover {
      background: $color-primary;
      color: #fff;
    }
  }

  &__title {
    font-size: $font-size-md;
    font-weight: 600;
    color: $color-text-primary;
    letter-spacing: -0.02em;
  }

  &__badge {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
    background: $color-bg-hover;
    padding: 2px 8px;
    border-radius: $radius-sm;
    font-weight: 500;
  }

  &__tabs {
    display: flex;
    gap: 2px;
    background: $color-bg-tertiary;
    padding: 3px;
    border-radius: $radius-md;
    border: 1px solid $color-border;
  }

  &__tab {
    @include flex-start;
    gap: 6px;
    padding: 6px 14px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: $color-text-tertiary;
    font-size: $font-size-sm;
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
      box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.08),
        0 1px 2px rgba(0, 0, 0, 0.04);

      &:hover {
        background: $color-bg-card;
        color: $color-primary;
      }
    }

    // 移动端隐藏文字
    &-label {
      @media (max-width: $breakpoint-sm) {
        display: none;
      }
    }
  }

  &__actions {
    @include flex-center;
  }

  &__version {
    font-size: $font-size-xs;
    color: $color-text-muted;
    font-family: $font-mono;
  }
}
</style>
