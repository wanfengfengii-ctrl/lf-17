<script setup lang="tsx">
import { ref, computed, watch } from 'vue'
import {
  NCard,
  NTabs,
  NTabPane,
  NDescriptions,
  NDescriptionsItem,
  NTag,
  NButton,
  NIcon,
  NSpace,
  NStatistic,
  NEmpty,
  NDataTable,
  NProgress
} from 'naive-ui'
import {
  FileTray,
  DocumentText,
  Alert,
  Checkmark,
  ColorFilter,
  People,
  Pricetag,
  Hammer
} from '@vicons/ionicons5'
import { usePatternStore } from '@/stores/pattern'
import { useQuotationStore } from '@/stores/quotation'
import {
  formatCurrency,
  formatWeight,
  getDeliveryWarningLevel,
  calculateProductionProgress
} from '@/utils/quotationUtils'
import {
  WORK_ORDER_STATUS_LABELS,
  APPROVAL_STATUS_LABELS,
  CUSTOMER_CONFIRM_LABELS,
  DELIVERY_WARNING_LABELS
} from '@/types/quotation'
import type { DataTableColumns } from 'naive-ui'
import type { WorkOrderData, QuotationVersion, LayoutScheme } from '@/types/quotation'

const props = defineProps<{
  show: boolean
  targetType: 'scheme' | 'quotation' | 'workOrder'
  targetId: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'previewQuotation', version: QuotationVersion): void
  (e: 'previewWorkOrder', order: WorkOrderData): void
}>()

const patternStore = usePatternStore()
const quotationStore = useQuotationStore()

const activeTab = ref('overview')

const scheme = computed<LayoutScheme | undefined>(() => {
  if (props.targetType === 'scheme') {
    return patternStore.schemes.find(s => s.id === props.targetId)
  }
  return undefined
})

const quotation = computed<QuotationVersion | undefined>(() => {
  if (props.targetType === 'quotation') {
    return quotationStore.quotationVersions.find(v => v.id === props.targetId)
  }
  if (props.targetType === 'workOrder') {
    const order = quotationStore.workOrders.find(w => w.orderNo === props.targetId)
    if (order?.quotationId) {
      return quotationStore.quotationVersions.find(v => v.id === order.quotationId)
    }
  }
  if (props.targetType === 'scheme') {
    const versions = quotationStore.getQuotationVersionsByScheme(props.targetId)
    return versions.length > 0 ? versions[0] : undefined
  }
  return undefined
})

const workOrders = computed<WorkOrderData[]>(() => {
  if (props.targetType === 'workOrder') {
    const order = quotationStore.workOrders.find(w => w.orderNo === props.targetId)
    return order ? [order] : []
  }
  if (props.targetType === 'quotation') {
    return quotationStore.getWorkOrdersByQuotation(props.targetId)
  }
  if (props.targetType === 'scheme') {
    return quotationStore.getWorkOrdersByScheme(props.targetId)
  }
  return []
})

const quotationVersions = computed<QuotationVersion[]>(() => {
  if (props.targetType === 'quotation') {
    const v = quotationStore.quotationVersions.find(q => q.id === props.targetId)
    return v ? [v] : []
  }
  if (props.targetType === 'scheme') {
    return quotationStore.getQuotationVersionsByScheme(props.targetId)
  }
  if (props.targetType === 'workOrder') {
    const order = quotationStore.workOrders.find(w => w.orderNo === props.targetId)
    if (order?.quotationId) {
      const v = quotationStore.quotationVersions.find(q => q.id === order.quotationId)
      return v ? [v] : []
    }
  }
  return []
})

const summaryTitle = computed(() => {
  if (props.targetType === 'scheme') {
    return `方案汇总 - ${scheme.value?.name || '未知方案'}`
  }
  if (props.targetType === 'quotation') {
    return `报价汇总 - ${quotation.value?.versionName || '未知版本'}`
  }
  if (props.targetType === 'workOrder') {
    return `工单汇总 - ${workOrders.value[0]?.orderNo || '未知工单'}`
  }
  return '订单汇总'
})

const overviewStats = computed(() => {
  const orders = workOrders.value
  const completed = orders.filter(o => o.status === 'completed').length
  const inProgress = orders.filter(o => o.status === 'inProgress').length
  const totalValue = orders.reduce((sum, o) => sum + o.breakdown.totalPrice, 0)
  const overdueCount = orders.filter(o => {
    const level = getDeliveryWarningLevel(o.deliveryDate, o.status)
    return level === 'overdue'
  }).length

  return {
    totalOrders: orders.length,
    completed,
    inProgress,
    totalValue,
    overdueCount,
    quotationCount: quotationVersions.value.length
  }
})

const workOrderColumns: DataTableColumns = [
  {
    title: '工单号',
    key: 'orderNo',
    width: 140,
    render: (row: any) => (
      <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{row.orderNo}</span>
    )
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row: any) => {
      const typeMap: Record<string, any> = {
        draft: 'default',
        confirmed: 'info',
        inProgress: 'warning',
        completed: 'success'
      }
      const status = row.status as keyof typeof WORK_ORDER_STATUS_LABELS
      return <NTag type={typeMap[row.status] || 'default'} size="small">
        {WORK_ORDER_STATUS_LABELS[status]}
      </NTag>
    }
  },
  {
    title: '客户',
    key: 'customer',
    width: 100,
    render: (row: any) => row.customerInfo.name || '未命名'
  },
  {
    title: '数量',
    key: 'quantity',
    width: 70,
    render: (row: any) => `${row.quantity} 件`
  },
  {
    title: '金额',
    key: 'totalPrice',
    width: 100,
    render: (row: any) => (
      <span style={{ color: '#d46b08', fontWeight: 600 }}>
        {formatCurrency(row.breakdown.totalPrice)}
      </span>
    )
  },
  {
    title: '交期',
    key: 'deliveryDate',
    width: 100,
    render: (row: any) => {
      const level = getDeliveryWarningLevel(row.deliveryDate, row.status)
      const colorMap: Record<string, string> = {
        normal: '#52c41a',
        warning: '#faad14',
        urgent: '#ff4d4f',
        overdue: '#cf1322'
      }
      return (
        <div style={{ color: colorMap[level] || '#666' }}>
          <div>{row.deliveryDate || '未设置'}</div>
          <div style={{ fontSize: '11px' }}>
            {DELIVERY_WARNING_LABELS[level]}
          </div>
        </div>
      )
    }
  },
  {
    title: '生产进度',
    key: 'progress',
    width: 120,
    render: (row: any) => {
      const progress = calculateProductionProgress(row.productionNodes || [])
      return (
        <div style={{ width: '100%' }}>
          <NProgress
            type="line"
            percentage={progress}
            showIndicator={false}
            height={6}
            color={progress === 100 ? '#52c41a' : '#1890ff'}
          />
          <span style={{ fontSize: '11px', color: '#999' }}>
            {progress}%
          </span>
        </div>
      )
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render: (row: any) => (
      <NButton size="tiny" type="primary" ghost onClick={() => emit('previewWorkOrder', row)}>
        查看
      </NButton>
    )
  }
]

const quotationColumns: DataTableColumns = [
  { title: '版本名称', key: 'versionName', width: 120 },
  {
    title: '审批状态',
    key: 'approvalStatus',
    width: 90,
    render: (row: any) => {
      const typeMap: Record<string, any> = {
        pending: 'default',
        approved: 'success',
        rejected: 'error',
        revision: 'warning'
      }
      const status = row.approvalStatus as keyof typeof APPROVAL_STATUS_LABELS
      return <NTag type={typeMap[row.approvalStatus] || 'default'} size="small">
        {APPROVAL_STATUS_LABELS[status]}
      </NTag>
    }
  },
  { title: '数量', key: 'quantity', width: 70, render: (row: any) => `${row.quantity} 件` },
  {
    title: '报价',
    key: 'totalPrice',
    width: 100,
    render: (row: any) => (
      <span style={{ color: '#d46b08', fontWeight: 600 }}>
        {formatCurrency(row.breakdown.totalPrice)}
      </span>
    )
  },
  {
    title: '客户确认',
    key: 'customerConfirm',
    width: 90,
    render: (row: any) => {
      const status = row.customerConfirmation?.status || '未发送'
      const typeMap: Record<string, any> = {
        pending: 'default',
        viewed: 'info',
        confirmed: 'success',
        rejected: 'error'
      }
      const label = row.customerConfirmation
        ? CUSTOMER_CONFIRM_LABELS[row.customerConfirmation.status as keyof typeof CUSTOMER_CONFIRM_LABELS]
        : '未发送'
      return <NTag type={typeMap[status] || 'default'} size="small">{label}</NTag>
    }
  },
  { title: '更新时间', key: 'updatedAt', width: 140, render: (row: any) => formatDate(row.updatedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render: (row: any) => (
      <NButton size="tiny" type="primary" ghost onClick={() => emit('previewQuotation', row)}>
        查看
      </NButton>
    )
  }
]

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function handleClose() {
  emit('update:show', false)
}

watch(() => props.show, (val) => {
  if (val) {
    activeTab.value = 'overview'
  }
})
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="summaryTitle"
    style="width: 900px; max-width: 95vw;"
    class="order-summary-modal"
    @update:show="handleClose"
  >
    <div class="summary-content">
      <NTabs v-model:value="activeTab" size="medium">
        <NTabPane name="overview" tab="总览">
          <div class="overview-section">
            <div class="stats-grid">
              <NCard size="small" class="stat-card">
                <template #header>
                  <div class="stat-header">
                    <NIcon class="stat-icon" color="#1890ff"><FileTray /></NIcon>
                    <span>工单数</span>
                  </div>
                </template>
                <NStatistic :value="overviewStats.totalOrders" />
              </NCard>

              <NCard size="small" class="stat-card">
                <template #header>
                  <div class="stat-header">
                    <NIcon class="stat-icon" color="#52c41a"><Checkmark /></NIcon>
                    <span>已完成</span>
                  </div>
                </template>
                <NStatistic :value="overviewStats.completed" />
              </NCard>

              <NCard size="small" class="stat-card">
                <template #header>
                  <div class="stat-header">
                    <NIcon class="stat-icon" color="#faad14"><Hammer /></NIcon>
                    <span>进行中</span>
                  </div>
                </template>
                <NStatistic :value="overviewStats.inProgress" />
              </NCard>

              <NCard size="small" class="stat-card">
                <template #header>
                  <div class="stat-header">
                    <NIcon class="stat-icon" color="#d46b08"><Pricetag /></NIcon>
                    <span>总金额</span>
                  </div>
                </template>
                <NStatistic :value="overviewStats.totalValue" precision={2} prefix="¥" />
              </NCard>

              <NCard size="small" class="stat-card">
                <template #header>
                  <div class="stat-header">
                    <NIcon class="stat-icon" color="#722ed1"><DocumentText /></NIcon>
                    <span>报价版本</span>
                  </div>
                </template>
                <NStatistic :value="overviewStats.quotationCount" />
              </NCard>

              <NCard size="small" class="stat-card warning-card">
                <template #header>
                  <div class="stat-header">
                    <NIcon class="stat-icon" color="#ff4d4f"><Alert /></NIcon>
                    <span>逾期工单</span>
                  </div>
                </template>
                <NStatistic :value="overviewStats.overdueCount" />
              </NCard>
            </div>

            <div v-if="quotation" class="info-section">
              <h4 class="section-title">
                <NIcon><ColorFilter /></NIcon>
                拼版方案信息
              </h4>
              <NDescriptions :column="3" size="small" bordered>
                <NDescriptionsItem label="方案名称">
                  {{ scheme?.name || quotation.schemeName || '未关联方案' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="银片规格">
                  {{ quotation.layoutSnapshot.silverSheet.width }} ×
                  {{ quotation.layoutSnapshot.silverSheet.height }} mm
                </NDescriptionsItem>
                <NDescriptionsItem label="银料重量">
                  {{ formatWeight(quotation.breakdown.silverWeight) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="纹样数量">
                  {{ quotation.layoutSnapshot.placedPatterns.length }} 个
                </NDescriptionsItem>
                <NDescriptionsItem label="生产数量">
                  {{ quotation.quantity }} 件
                </NDescriptionsItem>
                <NDescriptionsItem label="交货日期">
                  {{ quotation.deliveryDate || '未设置' }}
                </NDescriptionsItem>
              </NDescriptions>
            </div>

            <div v-if="quotation" class="info-section">
              <h4 class="section-title">
                <NIcon><People /></NIcon>
                客户信息
              </h4>
              <NDescriptions :column="2" size="small" bordered>
                <NDescriptionsItem label="客户姓名">
                  {{ quotation.customerInfo.name || '未填写' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="联系电话">
                  {{ quotation.customerInfo.phone || '未填写' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="公司名称">
                  {{ quotation.customerInfo.company || '未填写' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="电子邮箱">
                  {{ quotation.customerInfo.email || '未填写' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="联系地址" :span="2">
                  {{ quotation.customerInfo.address || '未填写' }}
                </NDescriptionsItem>
              </NDescriptions>
            </div>
          </div>
        </NTabPane>

        <NTabPane name="quotations" tab="报价版本">
          <div class="tab-section">
            <div v-if="quotationVersions.length === 0" class="empty-state">
              <NEmpty description="暂无报价版本" size="small" />
            </div>
            <NDataTable
              v-else
              :columns="quotationColumns"
              :data="quotationVersions"
              size="small"
              :bordered="true"
            />
          </div>
        </NTabPane>

        <NTabPane name="workOrders" tab="工单列表">
          <div class="tab-section">
            <div v-if="workOrders.length === 0" class="empty-state">
              <NEmpty description="暂无工单" size="small" />
            </div>
            <NDataTable
              v-else
              :columns="workOrderColumns"
              :data="workOrders"
              size="small"
              :bordered="true"
            />
          </div>
        </NTabPane>
      </NTabs>
    </div>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleClose">关闭</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.order-summary-modal {
  .n-modal-card-body {
    padding-top: 8px;
  }
}

.summary-content {
  max-height: 65vh;
  overflow-y: auto;
}

.overview-section {
  padding: 8px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.stat-icon {
  font-size: 16px;
}

.warning-card {
  border-color: #ffccc7 !important;
}

.info-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8B4513;
  font-size: 14px;
  margin: 0 0 10px 0;
  padding-left: 8px;
  border-left: 3px solid #8B4513;
}

.tab-section {
  padding: 8px 0;
}

.empty-state {
  padding: 40px 0;
}
</style>
