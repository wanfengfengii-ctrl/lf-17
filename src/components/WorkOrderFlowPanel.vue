<script setup lang="ts">
import { computed } from 'vue'
import {
  NCard,
  NTimeline,
  NTimelineItem,
  NEmpty,
  NIcon
} from 'naive-ui'
import {
  ArrowForward
} from '@vicons/ionicons5'
import { useQuotationStore } from '@/stores/quotation'
import { WORK_ORDER_STATUS_LABELS } from '@/types/quotation'
import type { WorkOrderStatus } from '@/types/quotation'

const props = defineProps<{
  orderNo: string
}>()

const quotationStore = useQuotationStore()

const workOrder = computed(() => {
  return quotationStore.getWorkOrderByNo(props.orderNo)
})

const flowRecords = computed(() => {
  return [...(workOrder.value?.flowRecords || [])].sort(
    (a, b) => a.createdAt - b.createdAt
  )
})

function getStatusType(status: WorkOrderStatus | null): 'default' | 'info' | 'warning' | 'success' {
  switch (status) {
    case 'draft': return 'default'
    case 'confirmed': return 'info'
    case 'inProgress': return 'warning'
    case 'completed': return 'success'
    default: return 'default'
  }
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusLabel(status: WorkOrderStatus | null): string {
  if (!status) return '创建'
  return WORK_ORDER_STATUS_LABELS[status]
}
</script>

<template>
  <NCard title="流转记录" size="small" :bordered="false" class="flow-panel">
    <div v-if="flowRecords.length === 0" class="empty-state">
      <NEmpty description="暂无流转记录" size="small" />
    </div>

    <NTimeline v-else>
      <NTimelineItem
        v-for="record in flowRecords"
        :key="record.id"
        :type="getStatusType(record.toStatus)"
      >
        <div class="flow-item">
          <div class="flow-header">
            <span class="flow-status">
              {{ getStatusLabel(record.fromStatus) }}
              <NIcon v-if="record.fromStatus" size="12" class="arrow-icon">
                <ArrowForward />
              </NIcon>
              {{ getStatusLabel(record.toStatus) }}
            </span>
          </div>
          <div class="flow-meta">
            <span class="operator">{{ record.operator }}</span>
            <span class="time">{{ formatDate(record.createdAt) }}</span>
          </div>
          <div v-if="record.remark" class="flow-remark">
            {{ record.remark }}
          </div>
        </div>
      </NTimelineItem>
    </NTimeline>
  </NCard>
</template>

<style scoped>
.flow-panel {
  margin-bottom: 12px;
}

.empty-state {
  padding: 16px 0;
}

.flow-item {
  padding-bottom: 4px;
}

.flow-header {
  margin-bottom: 4px;
}

.flow-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.arrow-icon {
  color: #999;
}

.flow-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.operator {
  font-weight: 500;
}

.flow-remark {
  font-size: 12px;
  color: #666;
  background: #fafafa;
  padding: 6px 8px;
  border-radius: 4px;
}
</style>
