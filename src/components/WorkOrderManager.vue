<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NCard,
  NButton,
  NIcon,
  NList,
  NListItem,
  NThing,
  NTag,
  NPopconfirm,
  NEmpty,
  NSpace,
  NSelect,
  useMessage
} from 'naive-ui'
import {
  FileTray,
  Trash,
  Eye,
  Checkmark,
  Play,
  CheckmarkDone,
  List,
  Alert
} from '@vicons/ionicons5'
import { useQuotationStore } from '@/stores/quotation'
import { formatCurrency } from '@/utils/quotationUtils'
import type { WorkOrderStatus } from '@/types/quotation'
import { WORK_ORDER_STATUS_LABELS } from '@/types/quotation'

const quotationStore = useQuotationStore()
const message = useMessage()

const emit = defineEmits(['preview', 'summary'])

const statusFilter = ref<WorkOrderStatus | 'all'>('all')

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '已确认', value: 'confirmed' },
  { label: '生产中', value: 'inProgress' },
  { label: '已完成', value: 'completed' }
]

const filteredOrders = computed(() => {
  const orders = [...quotationStore.workOrders].sort(
    (a, b) => b.createdAt - a.createdAt
  )
  if (statusFilter.value === 'all') return orders
  return orders.filter(o => o.status === statusFilter.value)
})

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusType(status: WorkOrderStatus): 'default' | 'info' | 'warning' | 'success' {
  switch (status) {
    case 'draft': return 'default'
    case 'confirmed': return 'info'
    case 'inProgress': return 'warning'
    case 'completed': return 'success'
    default: return 'default'
  }
}

function getStatusIcon(status: WorkOrderStatus) {
  switch (status) {
    case 'draft': return FileTray
    case 'confirmed': return Checkmark
    case 'inProgress': return Play
    case 'completed': return CheckmarkDone
    default: return FileTray
  }
}

function handlePreview(order: any) {
  emit('preview', order)
}

function handleUpdateStatus(orderNo: string, status: WorkOrderStatus) {
  quotationStore.updateWorkOrderStatus(orderNo, status)
  message.success(`工单状态已更新为：${WORK_ORDER_STATUS_LABELS[status]}`)
}

function handleDelete(orderNo: string) {
  quotationStore.deleteWorkOrder(orderNo)
  message.success('工单已删除')
}

function handleSummary(order: any) {
  emit('summary', order.id)
}

function getDeliveryWarningLevel(order: any): string {
  return quotationStore.getDeliveryWarning(order.id) || 'normal'
}

function getWarningTagType(level: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    normal: 'success',
    near: 'warning',
    urgent: 'error',
    overdue: 'error'
  }
  return map[level] || 'default'
}

function getWarningText(level: string): string {
  const map: Record<string, string> = {
    normal: '正常',
    near: '临近交期',
    urgent: '紧急',
    overdue: '已逾期'
  }
  return map[level] || ''
}

function getProductionProgress(order: any): number {
  return quotationStore.getProductionProgress(order.id)
}
</script>

<template>
  <NCard title="工单管理" size="small" :bordered="false" class="work-order-card">
    <template #header-extra>
      <NSelect
        :value="statusFilter"
        :options="statusOptions"
        size="tiny"
        style="width: 90px"
        @update:value="v => statusFilter = v as any"
      />
    </template>

    <div v-if="filteredOrders.length === 0" class="empty-state">
      <NEmpty description="暂无工单" size="small" />
    </div>

    <NList v-else hoverable size="small">
      <NListItem
        v-for="order in filteredOrders"
        :key="order.orderNo"
        class="order-item"
        @click="handlePreview(order)"
      >
        <NThing>
          <template #header>
            <div class="order-header">
              <NIcon class="order-icon"><component :is="getStatusIcon(order.status)" /></NIcon>
              <span class="order-no">{{ order.orderNo }}</span>
              <NTag size="small" :type="getStatusType(order.status)">
                {{ WORK_ORDER_STATUS_LABELS[order.status] }}
              </NTag>
              <NTag
                v-if="order.deliveryDate && getDeliveryWarningLevel(order) !== 'normal'"
                size="small"
                :type="getWarningTagType(getDeliveryWarningLevel(order))"
              >
                <NIcon style="margin-right: 2px;"><Alert /></NIcon>
                {{ getWarningText(getDeliveryWarningLevel(order)) }}
              </NTag>
            </div>
          </template>
          <template #description>
            <div class="order-info">
              <span>{{ order.customerInfo.name || '未命名客户' }}</span>
              <span>{{ order.quantity }} 件</span>
              <span>{{ formatDate(order.createdAt) }}</span>
            </div>
            <div v-if="order.productionNodes && order.productionNodes.length > 0" class="progress-bar">
              <div class="progress-bg">
                <div 
                  class="progress-fill" 
                  :style="{ width: getProductionProgress(order) + '%' }"
                ></div>
              </div>
              <span class="progress-text">{{ getProductionProgress(order) }}%</span>
            </div>
            <div class="order-price">
              <span class="price-label">报价</span>
              <span class="price-value">
                {{ formatCurrency(order.breakdown.totalPrice) }}
              </span>
            </div>
          </template>
          <template #action>
            <NSpace size="small" vertical>
              <NButton size="tiny" type="info" ghost @click.stop="handlePreview(order)">
                <template #icon>
                  <NIcon><Eye /></NIcon>
                </template>
                详情
              </NButton>
              <NButton size="tiny" type="info" ghost @click.stop="handleSummary(order)">
                <template #icon>
                  <NIcon><List /></NIcon>
                </template>
                汇总
              </NButton>
              <NSelect
                :value="order.status"
                :options="statusOptions.filter(o => o.value !== 'all')"
                size="tiny"
                style="width: 80px"
                @update:value="v => handleUpdateStatus(order.orderNo, v as WorkOrderStatus)"
              />
              <NPopconfirm
                positive-text="删除"
                negative-text="取消"
                type="error"
                @positive-click="handleDelete(order.orderNo)"
              >
                <template #trigger>
                  <NButton size="tiny" type="error" ghost @click.stop>
                    <template #icon>
                      <NIcon><Trash /></NIcon>
                    </template>
                  </NButton>
                </template>
                确定要删除这个工单吗？
              </NPopconfirm>
            </NSpace>
          </template>
        </NThing>
      </NListItem>
    </NList>
  </NCard>
</template>

<style scoped>
.work-order-card {
  margin-bottom: 12px;
}

.empty-state {
  padding: 16px 0;
}

.order-item {
  padding: 8px 12px !important;
  cursor: pointer;
}

.order-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.order-icon {
  color: #cd853f;
  font-size: 14px;
}

.order-no {
  font-weight: 600;
  font-size: 13px;
  font-family: monospace;
}

.order-info {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.order-price {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-label {
  font-size: 11px;
  color: #999;
}

.price-value {
  font-size: 14px;
  font-weight: 600;
  color: #d46b08;
}

.progress-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0;
}

.progress-bg {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a 0%, #389e0d 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: #666;
  min-width: 32px;
  text-align: right;
}
</style>
