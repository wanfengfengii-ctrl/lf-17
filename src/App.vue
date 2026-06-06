<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
import { RefreshOutline, Pricetag } from '@vicons/ionicons5'
import { usePatternStore } from '@/stores/pattern'
import { useQuotationStore } from '@/stores/quotation'
import PatternList from '@/components/PatternList.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import SchemeManager from '@/components/SchemeManager.vue'
import PatternProperties from '@/components/PatternProperties.vue'
import PatternCanvas from '@/components/PatternCanvas.vue'
import QuotationPanel from '@/components/QuotationPanel.vue'
import OrderInfoPanel from '@/components/OrderInfoPanel.vue'
import QuotationVersionManager from '@/components/QuotationVersionManager.vue'
import WorkOrderManager from '@/components/WorkOrderManager.vue'
import WorkOrderPreview from '@/components/WorkOrderPreview.vue'
import type { QuotationVersion, WorkOrderData } from '@/types/quotation'

const store = usePatternStore()
const quotationStore = useQuotationStore()

const showWorkOrderPreview = ref(false)
const previewQuotation = ref<QuotationVersion | null>(null)
const previewWorkOrder = ref<WorkOrderData | null>(null)
const rightPanelTab = ref<'info' | 'quotation'>('quotation')

onMounted(() => {
  store.loadSchemesFromStorage()
  quotationStore.loadQuotationVersionsFromStorage()
  quotationStore.loadWorkOrdersFromStorage()
  if (store.patternTemplates.length === 0 && store.placedPatterns.length === 0) {
    store.createDefaultPatterns()
  }
})

function handleResetView() {
  store.resetCanvasView()
}

function handleQuotationPreview(version: QuotationVersion) {
  previewQuotation.value = version
  previewWorkOrder.value = null
  showWorkOrderPreview.value = true
}

function handleWorkOrderPreview(order: WorkOrderData) {
  previewWorkOrder.value = order
  previewQuotation.value = null
  showWorkOrderPreview.value = true
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
                <QuotationVersionManager @preview="handleQuotationPreview" />
                <WorkOrderManager @preview="handleWorkOrderPreview" />
              </div>
            </NLayoutSider>

            <NLayoutContent class="canvas-wrapper">
              <PatternCanvas />
            </NLayoutContent>

            <NLayoutSider
              width="320"
              bordered
              show-trigger
              collapse-mode="width"
              :collapsed-width="0"
              position="absolute"
              class="right-sider"
            >
              <div class="right-tabs">
                <button
                  class="right-tab"
                  :class="{ active: rightPanelTab === 'info' }"
                  @click="rightPanelTab = 'info'"
                >
                  材料信息
                </button>
                <button
                  class="right-tab"
                  :class="{ active: rightPanelTab === 'quotation' }"
                  @click="rightPanelTab = 'quotation'"
                >
                  <NIcon><Pricetag /></NIcon>
                  工艺报价
                </button>
              </div>
              <div class="sider-content right-sider-content">
                <template v-if="rightPanelTab === 'info'">
                  <InfoPanel />
                  <PatternProperties />
                </template>
                <template v-else>
                  <OrderInfoPanel />
                  <QuotationPanel />
                </template>
              </div>
            </NLayoutSider>
          </NLayout>

          <WorkOrderPreview
            :show="showWorkOrderPreview"
            :quotation="previewQuotation"
            :work-order="previewWorkOrder"
            @update:show="showWorkOrderPreview = $event"
          />
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

.right-tabs {
  display: flex;
  border-bottom: 1px solid #e8e8e8;
  background: #fafaf8;
}

.right-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.right-tab:hover {
  color: #cd853f;
}

.right-tab.active {
  color: #8B4513;
  font-weight: 600;
  border-bottom-color: #8B4513;
  background: #fff;
}

.right-sider-content {
  height: calc(100% - 44px);
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
