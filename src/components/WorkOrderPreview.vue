<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NModal,
  NButton,
  NIcon,
  NSpace,
  NTag,
  NDescriptions,
  NDescriptionsItem,
  NTable,
  NTabs,
  NTabPane,
  NSelect,
  NInput,
  useMessage
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  Print,
  Download,
  Close,
  FileTray,
  ColorFilter,
  Time
} from '@vicons/ionicons5'
import type { QuotationVersion, WorkOrderData, WorkOrderStatus } from '@/types/quotation'
import { WORK_ORDER_STATUS_LABELS } from '@/types/quotation'
import { formatCurrency, formatWeight, getPatternQuantityMap } from '@/utils/quotationUtils'
import { useQuotationStore } from '@/stores/quotation'
import ProductionProgress from './ProductionProgress.vue'
import WorkOrderFlowPanel from './WorkOrderFlowPanel.vue'
import OperationLogPanel from './OperationLogPanel.vue'
import CustomerConfirmPanel from './CustomerConfirmPanel.vue'
import ApprovalFlowPanel from './ApprovalFlowPanel.vue'

const props = defineProps<{
  show: boolean
  quotation?: QuotationVersion | null
  workOrder?: WorkOrderData | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'updated'): void
}>()

const quotationStore = useQuotationStore()
const message = useMessage()

const activeTab = ref('info')
const statusSelectValue = ref<WorkOrderStatus>('draft')
const statusRemark = ref('')
const showStatusDialog = ref(false)

const isWorkOrder = computed(() => !!props.workOrder)
const isQuotation = computed(() => !!props.quotation && !props.workOrder)

const modalTitle = computed(() => {
  if (props.workOrder) {
    return `工单详情 - ${props.workOrder.orderNo}`
  }
  if (props.quotation) {
    return `报价详情 - ${props.quotation.versionName}`
  }
  return '详情预览'
})

const displayData = computed(() => {
  if (props.workOrder) {
    return props.workOrder
  }
  if (props.quotation) {
    return {
      ...props.quotation,
      orderNo: props.quotation.id,
      status: 'draft' as WorkOrderStatus,
      productionNodes: [],
      flowRecords: []
    }
  }
  return null
})

const statusTagType = computed(() => {
  if (!displayData.value) return 'default'
  switch (displayData.value.status) {
    case 'draft': return 'default'
    case 'confirmed': return 'info'
    case 'inProgress': return 'warning'
    case 'completed': return 'success'
    default: return 'default'
  }
})

const patternListData = computed(() => {
  if (!displayData.value) return []
  const { patterns, placedPatterns } = displayData.value.layoutSnapshot
  return getPatternQuantityMap(patterns, placedPatterns)
})

const patternTableData = computed(() => {
  return patternListData.value.map((item, i) => ({
    key: i,
    index: i + 1,
    name: item.template.name,
    count: item.count
  }))
})

const patternColumns: DataTableColumns = [
  { title: '序号', key: 'index', width: 60 },
  { title: '纹样名称', key: 'name' },
  { title: '数量', key: 'count', width: 100 }
]

const processColumns: DataTableColumns = [
  { title: '工序名称', key: 'name', width: 100 },
  { title: '描述', key: 'description', ellipsis: { tooltip: true } },
  { title: '单价', key: 'unitPrice', width: 80, align: 'right' },
  { title: '数量', key: 'quantity', width: 70, align: 'right' },
  { title: '单位', key: 'unit', width: 50 },
  { title: '小计', key: 'totalPrice', width: 100, align: 'right' }
]

const processData = computed(() => {
  if (!displayData.value) return []
  return displayData.value.breakdown.processes.map(p => ({
    ...p,
    key: p.id,
    unitPrice: `¥${p.unitPrice.toFixed(2)}`,
    totalPrice: `¥${p.totalPrice.toFixed(2)}`
  }))
})

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已确认', value: 'confirmed' },
  { label: '生产中', value: 'inProgress' },
  { label: '已完成', value: 'completed' }
]

function handleClose() {
  emit('update:show', false)
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function openStatusDialog() {
  if (!props.workOrder) return
  statusSelectValue.value = props.workOrder.status
  statusRemark.value = ''
  showStatusDialog.value = true
}

function handleUpdateStatus() {
  if (!props.workOrder) return
  quotationStore.updateWorkOrderStatus(props.workOrder.orderNo, statusSelectValue.value, statusRemark.value)
  message.success(`工单状态已更新为：${WORK_ORDER_STATUS_LABELS[statusSelectValue.value]}`)
  showStatusDialog.value = false
  emit('updated')
}

function handleExportTxt() {
  if (!displayData.value) return

  const data = displayData.value
  let content = ''
  content += '========================================\n'
  content += '         银饰工艺报价工单\n'
  content += '========================================\n\n'

  if (props.workOrder) {
    content += `工 单 号: ${data.orderNo}\n`
  }
  content += `创建时间: ${formatDate(data.createdAt)}\n`
  content += `状    态: ${WORK_ORDER_STATUS_LABELS[data.status] || '草稿'}\n\n`

  content += '-------- 客户信息 --------\n'
  content += `客户姓名: ${data.customerInfo.name || '未填写'}\n`
  content += `联系电话: ${data.customerInfo.phone || '未填写'}\n`
  content += `公司名称: ${data.customerInfo.company || '未填写'}\n`
  content += `电子邮箱: ${data.customerInfo.email || '未填写'}\n`
  content += `联系地址: ${data.customerInfo.address || '未填写'}\n\n`

  content += '-------- 订单信息 --------\n'
  content += `生产数量: ${data.quantity} 件\n`
  content += `交货日期: ${data.deliveryDate || '未设置'}\n\n`

  content += '-------- 材料信息 --------\n'
  const { silverSheet } = data.layoutSnapshot
  content += `银片规格: ${silverSheet.width} × ${silverSheet.height} mm\n`
  content += `银料重量: ${formatWeight(data.breakdown.silverWeight)}\n`
  content += `材料费用: ${formatCurrency(data.breakdown.materialCost)}\n`
  content += `损耗费用: ${formatCurrency(data.breakdown.materialLossCost)} (${data.breakdown.materialLoss}%)\n`
  content += `材料总计: ${formatCurrency(data.breakdown.totalMaterialCost)}\n\n`

  content += '-------- 纹样清单 --------\n'
  patternListData.value.forEach((item, index) => {
    content += `${index + 1}. ${item.template.name} × ${item.count}\n`
  })
  content += '\n'

  content += '-------- 加工工序 --------\n'
  data.breakdown.processes.forEach((p, i) => {
    content += `${i + 1}. ${p.name}\n`
    if (p.description) {
      content += `   描述: ${p.description}\n`
    }
    content += `   单价: ¥${p.unitPrice.toFixed(2)} / ${p.unit}  数量: ${p.quantity} ${p.unit}  小计: ¥${p.totalPrice.toFixed(2)}\n`
  })
  content += `人工费总计: ${formatCurrency(data.breakdown.totalLaborCost)}\n\n`

  content += '-------- 费用汇总 --------\n'
  content += `材料成本: ${formatCurrency(data.breakdown.totalMaterialCost)}\n`
  content += `人工成本: ${formatCurrency(data.breakdown.totalLaborCost)}\n`
  content += `其他费用: ${formatCurrency(data.breakdown.otherCost)}\n`
  content += `利    润: ${formatCurrency(data.breakdown.profit)}\n`
  content += '--------------------------------\n'
  content += `单    价: ${formatCurrency(data.breakdown.unitPrice)} / 件\n`
  content += `总 报 价: ${formatCurrency(data.breakdown.totalPrice)}\n\n`

  if (data.craftNotes) {
    content += '-------- 工艺备注 --------\n'
    content += `${data.craftNotes}\n\n`
  }

  content += '========================================\n'
  content += '  本报价仅供参考，最终以实际确认为准\n'
  content += '========================================\n'

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = props.workOrder
    ? `工单_${data.orderNo}.txt`
    : `报价单_${formatDate(data.createdAt).replace(/[/:]/g, '')}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  message.success('已导出')
}

function handlePrint() {
  message.info('打印功能已触发')
}

function handleUpdated() {
  emit('updated')
}

watch(() => props.show, (val) => {
  if (val) {
    activeTab.value = 'info'
  }
})
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="modalTitle"
    style="width: 800px; max-width: 95vw;"
    @update:show="handleClose"
    class="work-order-preview-modal"
  >
    <div class="preview-header-bar">
      <div class="header-status">
        <NTag :type="statusTagType" size="small">
          {{ WORK_ORDER_STATUS_LABELS[displayData?.status || 'draft'] }}
        </NTag>
        <span v-if="workOrder" class="order-no-text">
          <NIcon size="12"><FileTray /></NIcon>
          {{ workOrder.orderNo }}
        </span>
        <span class="create-time-text">
          <NIcon size="12"><Time /></NIcon>
          {{ displayData ? formatDate(displayData.createdAt) : '' }}
        </span>
      </div>
      <div v-if="workOrder" class="header-actions">
        <NButton size="small" @click="openStatusDialog">
          <template #icon>
            <NIcon><ColorFilter /></NIcon>
          </template>
          变更状态
        </NButton>
      </div>
    </div>

    <div class="preview-tabs">
      <NTabs v-model:value="activeTab" size="small" type="line">
        <NTabPane name="info" tab="基本信息">
          <div class="tab-content">
            <div class="preview-section">
              <h3 class="section-title">客户信息</h3>
              <NDescriptions :column="2" size="small" bordered>
                <NDescriptionsItem label="客户姓名">
                  {{ displayData?.customerInfo.name || '未填写' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="联系电话">
                  {{ displayData?.customerInfo.phone || '未填写' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="公司名称">
                  {{ displayData?.customerInfo.company || '未填写' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="电子邮箱">
                  {{ displayData?.customerInfo.email || '未填写' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="联系地址" :span="2">
                  {{ displayData?.customerInfo.address || '未填写' }}
                </NDescriptionsItem>
              </NDescriptions>
            </div>

            <div class="preview-section">
              <h3 class="section-title">订单信息</h3>
              <NDescriptions :column="2" size="small" bordered>
                <NDescriptionsItem label="生产数量">
                  {{ displayData?.quantity }} 件
                </NDescriptionsItem>
                <NDescriptionsItem label="交货日期">
                  {{ displayData?.deliveryDate || '未设置' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="银片规格">
                  {{ displayData?.layoutSnapshot.silverSheet.width }} ×
                  {{ displayData?.layoutSnapshot.silverSheet.height }} mm
                </NDescriptionsItem>
                <NDescriptionsItem label="银料重量">
                  {{ displayData ? formatWeight(displayData.breakdown.silverWeight) : '' }}
                </NDescriptionsItem>
              </NDescriptions>
            </div>

            <div class="preview-section">
              <h3 class="section-title">纹样清单</h3>
              <NTable :data="patternTableData" :columns="patternColumns" size="small" :bordered="true" />
            </div>

            <div class="preview-section">
              <h3 class="section-title">加工工序</h3>
              <NTable :data="processData" :columns="processColumns" size="small" :bordered="true" />
              <div class="labor-total">
                <span>人工费小计</span>
                <span class="labor-total-value">
                  {{ displayData ? formatCurrency(displayData.breakdown.totalLaborCost) : '' }}
                </span>
              </div>
            </div>

            <div class="preview-section">
              <h3 class="section-title">费用汇总</h3>
              <div class="summary-box">
                <div class="summary-row">
                  <span>材料成本</span>
                  <span>{{ displayData ? formatCurrency(displayData.breakdown.totalMaterialCost) : '' }}</span>
                </div>
                <div class="summary-row">
                  <span>人工成本</span>
                  <span>{{ displayData ? formatCurrency(displayData.breakdown.totalLaborCost) : '' }}</span>
                </div>
                <div class="summary-row">
                  <span>其他费用</span>
                  <span>{{ displayData ? formatCurrency(displayData.breakdown.otherCost) : '' }}</span>
                </div>
                <div class="summary-row">
                  <span>利润</span>
                  <span>{{ displayData ? formatCurrency(displayData.breakdown.profit) : '' }}</span>
                </div>
                <div class="summary-row">
                  <span>单价</span>
                  <span>{{ displayData ? formatCurrency(displayData.breakdown.unitPrice) : '' }} / 件</span>
                </div>
                <div class="summary-row total">
                  <span>总报价</span>
                  <span>{{ displayData ? formatCurrency(displayData.breakdown.totalPrice) : '' }}</span>
                </div>
              </div>
            </div>

            <div v-if="displayData?.craftNotes" class="preview-section">
              <h3 class="section-title">工艺备注</h3>
              <div class="notes-box">
                {{ displayData.craftNotes }}
              </div>
            </div>
          </div>
        </NTabPane>

        <NTabPane v-if="isWorkOrder" name="production" tab="生产进度">
          <div class="tab-content">
            <ProductionProgress :order-no="workOrder!.orderNo" @updated="handleUpdated" />
          </div>
        </NTabPane>

        <NTabPane v-if="isWorkOrder" name="flow" tab="流转记录">
          <div class="tab-content">
            <WorkOrderFlowPanel :order-no="workOrder!.orderNo" />
          </div>
        </NTabPane>

        <NTabPane name="approval" tab="审批流程">
          <div class="tab-content">
            <template v-if="isWorkOrder && workOrder?.quotationId">
              <ApprovalFlowPanel :quotation-id="workOrder.quotationId" @approved="handleUpdated" />
            </template>
            <template v-else-if="isQuotation && quotation">
              <ApprovalFlowPanel :quotation-id="quotation.id" @approved="handleUpdated" />
            </template>
            <template v-else>
              <div class="empty-tip">暂无审批数据</div>
            </template>
          </div>
        </NTabPane>

        <NTabPane name="customer" tab="客户确认">
          <div class="tab-content">
            <template v-if="isWorkOrder && workOrder">
              <CustomerConfirmPanel
                target-type="workOrder"
                :target-id="workOrder.orderNo"
                @updated="handleUpdated"
              />
            </template>
            <template v-else-if="isQuotation && quotation">
              <CustomerConfirmPanel
                target-type="quotation"
                :target-id="quotation.id"
                @updated="handleUpdated"
              />
            </template>
          </div>
        </NTabPane>

        <NTabPane name="logs" tab="操作日志">
          <div class="tab-content">
            <template v-if="isWorkOrder && workOrder">
              <OperationLogPanel target-type="workOrder" :target-id="workOrder.orderNo" />
            </template>
            <template v-else-if="isQuotation && quotation">
              <OperationLogPanel target-type="quotation" :target-id="quotation.id" />
            </template>
          </div>
        </NTabPane>
      </NTabs>
    </div>

    <template #footer>
      <NSpace justify="space-between">
        <NSpace>
          <NButton @click="handleClose">
            <template #icon>
              <NIcon><Close /></NIcon>
            </template>
            关闭
          </NButton>
        </NSpace>
        <NSpace>
          <NButton @click="handleExportTxt">
            <template #icon>
              <NIcon><Download /></NIcon>
            </template>
            导出TXT
          </NButton>
          <NButton type="primary" @click="handlePrint">
            <template #icon>
              <NIcon><Print /></NIcon>
            </template>
            打印
          </NButton>
        </NSpace>
      </NSpace>
    </template>
  </NModal>

  <NModal
    :show="showStatusDialog"
    preset="card"
    title="变更工单状态"
    style="width: 360px"
    @update:show="v => showStatusDialog = v"
  >
    <div class="status-form">
      <div class="form-item">
        <label>目标状态</label>
        <NSelect
          v-model:value="statusSelectValue"
          :options="statusOptions"
          placeholder="请选择目标状态"
        />
      </div>
      <div class="form-item">
        <label>变更备注</label>
        <NInput
          v-model:value="statusRemark"
          type="textarea"
          placeholder="请输入变更备注（可选）"
          :rows="3"
        />
      </div>
    </div>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showStatusDialog = false">取消</NButton>
        <NButton type="primary" @click="handleUpdateStatus">确认</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.work-order-preview-modal {
  :deep(.n-modal-card-body) {
    padding-top: 0;
  }
}

.preview-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.order-no-text,
.create-time-text {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}

.preview-tabs {
  max-height: 60vh;
  overflow-y: auto;
}

.tab-content {
  padding: 4px 8px 8px 0;
}

.preview-section {
  margin-bottom: 16px;
}

.section-title {
  color: #8B4513;
  font-size: 14px;
  margin: 0 0 10px 0;
  padding-left: 8px;
  border-left: 3px solid #8B4513;
}

.labor-total {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding: 8px 16px;
  background: #fff8e6;
  border-radius: 4px;
  font-size: 13px;
}

.labor-total-value {
  font-weight: 600;
  color: #d48806;
}

.summary-box {
  background: linear-gradient(135deg, #fff8e6 0%, #ffe7ba 100%);
  border: 1px solid #d48806;
  border-radius: 8px;
  padding: 12px 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
  color: #333;
}

.summary-row.total {
  padding-top: 8px;
  margin-top: 6px;
  border-top: 1px dashed #d48806;
  font-size: 16px;
  font-weight: 700;
  color: #d46b08;
}

.notes-box {
  background: #fafaf8;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #555;
  white-space: pre-wrap;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #999;
  font-size: 13px;
}

.status-form {
  .form-item {
    margin-bottom: 16px;
  }

  label {
    display: block;
    font-size: 13px;
    color: #666;
    margin-bottom: 6px;
  }
}
</style>
