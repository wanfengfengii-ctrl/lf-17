<script setup lang="ts">
import { onMounted } from 'vue'
import {
  NConfigProvider,
  NLayout,
  NLayoutSider,
  NLayoutHeader,
  NLayoutContent,
  NH2,
  NSpace,
  NButton,
  NIcon,
  NMessageProvider,
  NDialogProvider
} from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { usePatternStore } from '@/stores/pattern'
import PatternList from '@/components/PatternList.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import SchemeManager from '@/components/SchemeManager.vue'
import PatternProperties from '@/components/PatternProperties.vue'
import PatternCanvas from '@/components/PatternCanvas.vue'

const store = usePatternStore()

onMounted(() => {
  store.loadSchemesFromStorage()
  if (store.patternTemplates.length === 0 && store.placedPatterns.length === 0) {
    store.createDefaultPatterns()
  }
})

function handleResetView() {
  store.resetCanvasView()
}
</script>

<template>
  <NConfigProvider>
    <NMessageProvider>
      <NDialogProvider>
        <NLayout style="height: 100vh;">
          <NLayoutHeader bordered class="app-header">
            <div class="header-content">
              <NH2 class="app-title">智能银饰拼版系统</NH2>
              <NSpace>
                <NButton size="small" ghost @click="handleResetView">
                  <template #icon>
                    <NIcon><RefreshOutline /></NIcon>
                  </template>
                  重置视图
                </NButton>
              </NSpace>
            </div>
          </NLayoutHeader>

          <NLayout has-sider style="height: calc(100vh - 64px);">
            <NLayoutSider
              width="320"
              bordered
              show-trigger
              collapse-mode="width"
              :collapsed-width="0"
              class="left-sider"
            >
              <div class="sider-content">
                <PatternList />
                <SchemeManager />
              </div>
            </NLayoutSider>

            <NLayoutContent class="canvas-wrapper">
              <PatternCanvas />
            </NLayoutContent>

            <NLayoutSider
              width="280"
              bordered
              show-trigger
              collapse-mode="width"
              :collapsed-width="0"
              position="absolute"
              class="right-sider"
            >
              <div class="sider-content">
                <InfoPanel />
                <PatternProperties />
              </div>
            </NLayoutSider>
          </NLayout>
        </NLayout>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
.app-header {
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  margin: 0;
  color: #f5f5f0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 2px;
}

.canvas-wrapper {
  background-color: #e8e8e0;
  position: relative;
}

.left-sider,
.right-sider {
  background-color: #fafaf8;
}

.sider-content {
  padding: 12px;
  height: 100%;
  overflow-y: auto;
}

:deep(.n-layout-sider .n-layout-sider-children) {
  overflow: hidden;
}

:deep(.n-layout-sider__content) {
  overflow: hidden !important;
}

:deep(.n-layout-sider__border) {
  right: 0;
}

:deep(.n-layout-sider__trigger) {
  background: #8B7355;
  color: #fff;
}
</style>
