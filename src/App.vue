<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
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
  NDialogProvider,
  useDialog,
  useMessage
} from 'naive-ui'
import { RefreshOutline, Pricetag, List } from '@vicons/ionicons5'
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
import DeliveryWarningPanel from '@/components/DeliveryWarningPanel.vue'
import OrderSummary from '@/components/OrderSummary.vue'
import type { QuotationVersion, WorkOrderData } from '@/types/quotation'

const store = usePatternStore()
const quotationStore = useQuotationStore()

const dialog = useDialog()
const message = useMessage()

const showWorkOrderPreview = ref(false)
const previewQuotation = ref<QuotationVersion | null>(null)
const previewWorkOrder = ref<WorkOrderData | null>(null)
const rightPanelTab = ref<'info' | 'quotation'>('quotation')

const showOrderSummary = ref(false)
const summaryTargetType = ref<'scheme' | 'quotation' | 'workOrder'>('workOrder')
const summaryTargetId = ref('')

const overdueCount = computed(() => quotationStore.overdueWorkOrders.length)
const warningCount = computed(() => quotationStore.warningWorkOrders.length)

function canSwitchTab(): boolean {
  if (quotationStore.isOrderInfoEditing && quotationStore.hasUnsavedOrderChanges) {
    dialog.warning({
      title: '未保存的修改',
      content: '您有未保存的订单信息，确定要离开吗？未保存的修改将会丢失。',
      positiveText: '确定离开',
      negativeText: '继续编辑',
      onPositiveClick: () => {
        quotationStore.setOrderInfoEditing(false)
        quotationStore.setUnsavedOrderChanges(false)
        message.info('已放弃未保存的修改')
      }
    })
    return false
  }
  return true
}

function handleTabSwitch(tab: 'info' | 'quotation') {
  if (tab === rightPanelTab.value) return
  if (canSwitchTab()) {
    rightPanelTab.value = tab
  }
}

onMounted(() => {
  store.loadSchemesFromStorage()
  quotationStore.loadQuotationVersionsFromStorage()
  quotationStore.loadWorkOrdersFromStorage()
  quotationStore.loadOperationLogsFromStorage()
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

function handleViewOrderFromWarning(order: WorkOrderData) {
  previewWorkOrder.value = order
  previewQuotation.value = null
  showWorkOrderPreview.value = true
}

function openOrderSummary(type: 'scheme' | 'quotation' | 'workOrder', id: string) {
  summaryTargetType.value = type
  summaryTargetId.value = id
  showOrderSummary.value = true
}

function handleSummaryPreviewQuotation(version: QuotationVersion) {
  previewQuotation.value = version
  previewWorkOrder.value = null
  showOrderSummary.value = false
  showWorkOrderPreview.value = true
}

function handleSummaryPreviewWorkOrder(order: WorkOrderData) {
  previewWorkOrder.value = order
  previewQuotation.value = null
  showOrderSummary.value = false
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
              <div class="header-left">
                <NH2 class="app-title">订单协同与生产追踪系统</NH2>
                <span class="subtitle">智能银饰拼版 · 全流程管理</span>
              </div>
              <NSpace>
                <NButton size="small" ghost @click="openOrderSummary('workOrder', '')">
                  <template #icon>
                    <NIcon><List /></NIcon>
                  </template>
                  订单汇总
                </NButton>
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
                <DeliveryWarningPanel
                  v-if="overdueCount > 0 || warningCount > 0"
                  @view-order="handleViewOrderFromWarning"
                />
                <PatternList />
                <SchemeManager />
                <QuotationVersionManager @preview="handleQuotationPreview" @summary="(id: string) => openOrderSummary('quotation', id)" />
                <WorkOrderManager @preview="handleWorkOrderPreview" @summary="(id: string) => openOrderSummary('workOrder', id)" />
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
                  @click="handleTabSwitch('info')"
                >
                  材料信息
                </button>
                <button
                  class="right-tab"
                  :class="{ active: rightPanelTab === 'quotation' }"
                  @click="handleTabSwitch('quotation')"
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

          <OrderSummary
            :show="showOrderSummary"
            :target-type="summaryTargetType"
            :target-id="summaryTargetId"
            @update:show="showOrderSummary = $event"
            @preview-quotation="handleSummaryPreviewQuotation"
            @preview-work-order="handleSummaryPreviewWorkOrder"
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

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.app-title {
  margin: 0;
  color: #f5f5f0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 2px;
}

.subtitle {
  font-size: 12px;
  color: rgba(245, 245, 240, 0.7);
  letter-spacing: 1px;
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
