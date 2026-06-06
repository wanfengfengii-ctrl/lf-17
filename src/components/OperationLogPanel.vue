<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NCard,
  NList,
  NListItem,
  NThing,
  NEmpty,
  NSelect,
  NIcon
} from 'naive-ui'
import {
  Create,
  Trash,
  Refresh,
  Checkmark,
  People,
  Download,
  Print,
  DocumentText
} from '@vicons/ionicons5'
import { useQuotationStore } from '@/stores/quotation'
import type { OperationLogType } from '@/types/quotation'

const props = defineProps<{
  targetType: 'quotation' | 'workOrder' | 'scheme'
  targetId: string
  maxItems?: number
}>()

const quotationStore = useQuotationStore()

const typeFilter = ref<OperationLogType | 'all'>('all')

const typeOptions = [
  { label: '全部', value: 'all' },
  { label: '创建', value: 'create' },
  { label: '更新', value: 'update' },
  { label: '删除', value: 'delete' },
  { label: '状态变更', value: 'status_change' },
  { label: '审批', value: 'approval' },
  { label: '客户确认', value: 'customer_confirm' },
  { label: '导出', value: 'export' },
  { label: '打印', value: 'print' }
]

const logs = computed(() => {
  let result = quotationStore.getOperationLogsByTarget(props.targetType, props.targetId)
  if (typeFilter.value !== 'all') {
    result = result.filter(l => l.type === typeFilter.value)
  }
  if (props.maxItems) {
    result = result.slice(0, props.maxItems)
  }
  return result
})

function getTypeIcon(type: OperationLogType) {
  switch (type) {
    case 'create': return Create
    case 'update': return Refresh
    case 'delete': return Trash
    case 'status_change': return Checkmark
    case 'approval': return DocumentText
    case 'customer_confirm': return People
    case 'export': return Download
    case 'print': return Print
    default: return DocumentText
  }
}

function getTypeLabel(type: OperationLogType): string {
  const labels: Record<OperationLogType, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    status_change: '状态变更',
    approval: '审批',
    customer_confirm: '客户确认',
    export: '导出',
    print: '打印'
  }
  return labels[type] || type
}

function getTypeColor(type: OperationLogType): string {
  const colors: Record<OperationLogType, string> = {
    create: '#52c41a',
    update: '#1890ff',
    delete: '#ff4d4f',
    status_change: '#722ed1',
    approval: '#faad14',
    customer_confirm: '#13c2c2',
    export: '#eb2f96',
    print: '#fa8c16'
  }
  return colors[type] || '#999'
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<template>
  <NCard title="操作日志" size="small" :bordered="false" class="log-panel">
    <template #header-extra>
      <NSelect
        :value="typeFilter"
        :options="typeOptions"
        size="tiny"
        style="width: 100px"
        @update:value="v => typeFilter = v as any"
      />
    </template>

    <div v-if="logs.length === 0" class="empty-state">
      <NEmpty description="暂无操作记录" size="small" />
    </div>

    <NList v-else hoverable size="small" class="log-list">
      <NListItem v-for="log in logs" :key="log.id" class="log-item">
        <NThing>
          <template #avatar>
            <div class="log-icon" :style="{ backgroundColor: getTypeColor(log.type) + '20', color: getTypeColor(log.type) }">
              <NIcon size="14">
                <component :is="getTypeIcon(log.type)" />
              </NIcon>
            </div>
          </template>
          <template #header>
            <div class="log-header">
              <span class="log-type">{{ getTypeLabel(log.type) }}</span>
              <span class="log-operator">{{ log.operator }}</span>
            </div>
          </template>
          <template #description>
            <div class="log-description">{{ log.description }}</div>
            <div v-if="log.detail" class="log-detail">{{ log.detail }}</div>
            <div class="log-time">{{ formatDate(log.createdAt) }}</div>
          </template>
        </NThing>
      </NListItem>
    </NList>
  </NCard>
</template>

<style scoped>
.log-panel {
  margin-bottom: 12px;
}

.empty-state {
  padding: 16px 0;
}

.log-list {
  max-height: 400px;
  overflow-y: auto;
}

.log-item {
  padding: 8px 0 !important;
}

.log-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.log-type {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.log-operator {
  font-size: 11px;
  color: #999;
}

.log-description {
  font-size: 12px;
  color: #555;
  margin-bottom: 2px;
}

.log-detail {
  font-size: 11px;
  color: #999;
  background: #fafafa;
  padding: 4px 6px;
  border-radius: 3px;
  margin-bottom: 4px;
}

.log-time {
  font-size: 11px;
  color: #bbb;
}
</style>
