<script setup lang="ts">
import { computed } from 'vue'
import {
  NCard,
  NList,
  NListItem,
  NThing,
  NTag,
  NEmpty,
  NIcon,
  NSpace
} from 'naive-ui'
import {
  Alert,
  Time,
  Warning,
  CheckmarkCircle
} from '@vicons/ionicons5'
import { useQuotationStore } from '@/stores/quotation'
import {
  getDeliveryWarningLevel,
  getDaysRemaining
} from '@/utils/quotationUtils'
import {
  DELIVERY_WARNING_LABELS,
  WORK_ORDER_STATUS_LABELS
} from '@/types/quotation'
import type { WorkOrderData, DeliveryWarningLevel } from '@/types/quotation'

const props = defineProps<{
  mode?: 'all' | 'warning' | 'overdue'
  maxItems?: number
}>()

const emit = defineEmits(['viewOrder'])

const quotationStore = useQuotationStore()

const warningOrders = computed(() => {
  let orders = [...quotationStore.workOrders].filter(w => {
    if (w.status === 'completed') return false
    const level = getDeliveryWarningLevel(w.deliveryDate, w.status)
    if (props.mode === 'warning') {
      return level === 'warning' || level === 'urgent'
    }
    if (props.mode === 'overdue') {
      return level === 'overdue'
    }
    return level !== 'normal'
  })

  orders.sort((a, b) => {
    const levelOrder: Record<DeliveryWarningLevel, number> = {
      overdue: 0,
      urgent: 1,
      warning: 2,
      normal: 3
    }
    const levelA = getDeliveryWarningLevel(a.deliveryDate, a.status)
    const levelB = getDeliveryWarningLevel(b.deliveryDate, b.status)
    return levelOrder[levelA] - levelOrder[levelB]
  })

  if (props.maxItems) {
    orders = orders.slice(0, props.maxItems)
  }

  return orders
})

const overdueCount = computed(() => {
  return quotationStore.workOrders.filter(w => {
    if (w.status === 'completed') return false
    return getDeliveryWarningLevel(w.deliveryDate, w.status) === 'overdue'
  }).length
})

const warningCount = computed(() => {
  return quotationStore.workOrders.filter(w => {
    if (w.status === 'completed') return false
    const level = getDeliveryWarningLevel(w.deliveryDate, w.status)
    return level === 'warning' || level === 'urgent'
  }).length
})

function getWarningType(level: DeliveryWarningLevel): 'default' | 'warning' | 'error' {
  switch (level) {
    case 'normal': return 'default'
    case 'warning': return 'warning'
    case 'urgent': return 'error'
    case 'overdue': return 'error'
    default: return 'default'
  }
}

function getWarningIcon(level: DeliveryWarningLevel) {
  switch (level) {
    case 'overdue': return Alert
    case 'urgent': return Warning
    case 'warning': return Time
    default: return CheckmarkCircle
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '未设置'
  return dateStr
}

function getDaysText(deliveryDate: string): string {
  const days = getDaysRemaining(deliveryDate)
  if (days < 0) {
    return `逾期 ${Math.abs(days)} 天`
  }
  if (days === 0) {
    return '今天到期'
  }
  return `还剩 ${days} 天`
}

function handleViewOrder(order: WorkOrderData) {
  emit('viewOrder', order)
}
</script>

<template>
  <NCard title="交期预警" size="small" :bordered="false" class="warning-panel">
    <template #header-extra>
      <NSpace size="small">
        <NTag v-if="overdueCount > 0" type="error" size="small">
          逾期 {{ overdueCount }}
        </NTag>
        <NTag v-if="warningCount > 0" type="warning" size="small">
          临期 {{ warningCount }}
        </NTag>
      </NSpace>
    </template>

    <div v-if="warningOrders.length === 0" class="empty-state">
      <NEmpty description="暂无预警工单" size="small" />
    </div>

    <NList v-else hoverable size="small">
      <NListItem
        v-for="order in warningOrders"
        :key="order.orderNo"
        class="warning-item"
        @click="handleViewOrder(order)"
      >
        <NThing>
          <template #avatar>
            <div
              class="warning-icon"
              :class="getDeliveryWarningLevel(order.deliveryDate, order.status)"
            >
              <NIcon size="16">
                <component :is="getWarningIcon(getDeliveryWarningLevel(order.deliveryDate, order.status))" />
              </NIcon>
            </div>
          </template>
          <template #header>
            <div class="item-header">
              <span class="order-no">{{ order.orderNo }}</span>
              <NTag size="small" :type="getWarningType(getDeliveryWarningLevel(order.deliveryDate, order.status))">
                {{ DELIVERY_WARNING_LABELS[getDeliveryWarningLevel(order.deliveryDate, order.status)] }}
              </NTag>
            </div>
          </template>
          <template #description>
            <div class="item-info">
              <span>{{ order.customerInfo.name || '未命名客户' }}</span>
              <span>{{ order.quantity }} 件</span>
            </div>
            <div class="item-delivery">
              <span class="delivery-date">交期：{{ formatDate(order.deliveryDate) }}</span>
              <span class="days-text">
                {{ getDaysText(order.deliveryDate) }}
              </span>
            </div>
            <div class="item-status">
              状态：
              <NTag size="small" type="default">
                {{ WORK_ORDER_STATUS_LABELS[order.status] }}
              </NTag>
            </div>
          </template>
        </NThing>
      </NListItem>
    </NList>
  </NCard>
</template>

<style scoped>
.warning-panel {
  margin-bottom: 12px;
}

.empty-state {
  padding: 16px 0;
}

.warning-item {
  padding: 8px 0 !important;
  cursor: pointer;
}

.warning-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.warning-icon.overdue {
  background: linear-gradient(135deg, #ff4d4f, #cf1322);
}

.warning-icon.urgent {
  background: linear-gradient(135deg, #fa8c16, #d46b08);
}

.warning-icon.warning {
  background: linear-gradient(135deg, #faad14, #d48806);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.order-no {
  font-weight: 600;
  font-size: 13px;
  font-family: monospace;
}

.item-info {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.item-delivery {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  display: flex;
  gap: 8px;
}

.days-text {
  font-weight: 600;
}

.overdue + * .days-text {
  color: #cf1322;
}

.item-status {
  font-size: 11px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
