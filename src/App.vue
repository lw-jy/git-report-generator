<template>
  <!-- 根组件 - 管理 Tab 状态和组件通信 -->
  <div class="app">
    <!-- 顶部导航 -->
    <TheNavbar v-model="activeTab" />

    <!-- 主内容区 -->
    <main class="app__main">
      <ReportGenerator v-show="activeTab === 'report'" />
      <ConfigSettings v-show="activeTab === 'config'" />
    </main>

    <!-- 底部信息 -->
    <footer class="app__footer">
      <span>Git Report Generator</span>
      <span class="app__footer-dot">·</span>
      <span>Powered by AI</span>
    </footer>
  </div>
</template>

<script setup>
import { ref } from "vue";
import TheNavbar from "./components/TheNavbar.vue";
import ConfigSettings from "./components/ConfigSettings.vue";
import ReportGenerator from "./components/ReportGenerator.vue";

// 当前激活的 Tab
const activeTab = ref("report");
</script>

<style lang="scss" scoped>
@import './styles/variables';
@import './styles/mixins';

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  &__main {
    flex: 1;
    padding: 0;
  }

  &__footer {
    @include flex-center;
    gap: $spacing-xs;
    padding: $spacing-lg;
    font-size: $font-size-xs;
    color: $color-text-muted;
    border-top: 1px solid $color-border;
  }

  &__footer-dot {
    opacity: 0.5;
  }
}

// 页面切换过渡动画
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

// 响应式
@include respond-to($breakpoint-sm) {
  .app {
    &__footer {
      padding: $spacing-md;
    }
  }
}
</style>
