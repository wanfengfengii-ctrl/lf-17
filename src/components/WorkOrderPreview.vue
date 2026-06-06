<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NModal,
  NButton,
  NIcon,
  NSpace,
  NTag,
  NDescriptions,
  NDescriptionsItem,
  NTable,
  useMessage
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  Print,
  Download,
  Close,
  Image
} from '@vicons/ionicons5'
import html2canvas from 'html2canvas'
import type { QuotationVersion, WorkOrderData } from '@/types/quotation'
import { formatCurrency, formatWeight, getPatternQuantityMap } from '@/utils/quotationUtils'
import { WORK_ORDER_STATUS_LABELS } from '@/types/quotation'

const props = defineProps<{
  show: boolean
  quotation?: QuotationVersion | null
  workOrder?: WorkOrderData | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const message = useMessage()

const previewContentRef = ref<HTMLElement | null>(null)
const isExportingImage = ref(false)

const modalTitle = computed(() => {
  if (props.workOrder) {
    return `工单预览 - ${props.workOrder.orderNo}`
  }
  return '报价单预览'
})

const displayData = computed(() => {
  if (props.workOrder) {
    return props.workOrder
  }
  if (props.quotation) {
    return {
      orderNo: props.quotation.id,
      createdAt: props.quotation.createdAt,
      customerInfo: props.quotation.customerInfo,
      craftNotes: props.quotation.craftNotes,
      deliveryDate: props.quotation.deliveryDate,
      quantity: props.quotation.quantity,
      layoutSnapshot: props.quotation.layoutSnapshot,
      breakdown: props.quotation.breakdown,
      status: 'draft' as const
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

async function handleExportImage() {
  if (!displayData.value || !previewContentRef.value) return

  isExportingImage.value = true
  const loadingMsg = message.loading('正在生成图片...', { duration: 0 })

  try {
    const canvas = await html2canvas(previewContentRef.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    })

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataUrl
    const timestamp = formatDate(displayData.value.createdAt).replace(/[/: ]/g, '')
    link.download = props.workOrder
      ? `工单_${displayData.value.orderNo}.png`
      : `报价单_${timestamp}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    loadingMsg.destroy()
    message.success('图片已导出')
  } catch (e) {
    console.error('导出图片失败:', e)
    loadingMsg.destroy()
    message.error('导出图片失败，请重试')
  } finally {
    isExportingImage.value = false
  }
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

  message.success('工单已导出')
}

function handlePrint() {
  if (!displayData.value) return

  const data = displayData.value
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    message.error('无法打开打印窗口，请检查浏览器弹窗设置')
    return
  }

  const patternsHtml = patternListData.value.map(
    (item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.template.name}</td>
      <td>${item.count}</td>
    </tr>
  `
  ).join('')

  const processesHtml = data.breakdown.processes.map(
    (p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.description || '-'}</td>
      <td>¥${p.unitPrice.toFixed(2)}</td>
      <td>${p.quantity}</td>
      <td>${p.unit}</td>
      <td>¥${p.totalPrice.toFixed(2)}</td>
    </tr>
  `
  ).join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>银饰工艺报价工单</title>
  <style>
    body {
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #8B4513;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #8B4513;
      font-size: 24px;
    }
    .order-no {
      font-size: 14px;
      color: #666;
      margin-top: 8px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section h3 {
      color: #8B4513;
      border-left: 4px solid #8B4513;
      padding-left: 10px;
      margin: 0 0 12px 0;
      font-size: 16px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 20px;
      font-size: 14px;
    }
    .info-item {
      display: flex;
    }
    .info-label {
      color: #666;
      min-width: 80px;
    }
    .info-value {
      color: #333;
      flex: 1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background: #f5f5f0;
      color: #666;
      font-weight: 500;
    }
    .total-row {
      background: #fff8e6;
      font-weight: 600;
    }
    .summary {
      background: #fff8e6;
      border: 1px solid #d48806;
      border-radius: 4px;
      padding: 16px;
      margin-top: 10px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 14px;
    }
    .summary-row.total {
      border-top: 1px dashed #d48806;
      padding-top: 10px;
      margin-top: 6px;
      font-size: 18px;
      font-weight: 700;
      color: #d46b08;
    }
    .notes {
      background: #fafaf8;
      padding: 12px;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .footer {
      text-align: center;
      color: #999;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>银饰工艺报价工单</h1>
    <div class="order-no">
      ${props.workOrder ? `工单号：${data.orderNo}` : ''}
      ${props.workOrder ? ' · ' : ''}
      创建时间：${formatDate(data.createdAt)}
    </div>
  </div>

  <div class="section">
    <h3>客户信息</h3>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">客户姓名：</span>
        <span class="info-value">${data.customerInfo.name || '未填写'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">联系电话：</span>
        <span class="info-value">${data.customerInfo.phone || '未填写'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">公司名称：</span>
        <span class="info-value">${data.customerInfo.company || '未填写'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">电子邮箱：</span>
        <span class="info-value">${data.customerInfo.email || '未填写'}</span>
      </div>
      <div class="info-item" style="grid-column: span 2;">
        <span class="info-label">联系地址：</span>
        <span class="info-value">${data.customerInfo.address || '未填写'}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>订单信息</h3>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">生产数量：</span>
        <span class="info-value">${data.quantity} 件</span>
      </div>
      <div class="info-item">
        <span class="info-label">交货日期：</span>
        <span class="info-value">${data.deliveryDate || '未设置'}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>材料信息</h3>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">银片规格：</span>
        <span class="info-value">${data.layoutSnapshot.silverSheet.width} × ${data.layoutSnapshot.silverSheet.height} mm</span>
      </div>
      <div class="info-item">
        <span class="info-label">银料重量：</span>
        <span class="info-value">${formatWeight(data.breakdown.silverWeight)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">材料费用：</span>
        <span class="info-value">¥${data.breakdown.materialCost.toFixed(2)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">损耗费用：</span>
        <span class="info-value">¥${data.breakdown.materialLossCost.toFixed(2)} (${data.breakdown.materialLoss}%)</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>纹样清单</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">序号</th>
          <th>纹样名称</th>
          <th style="width: 100px;">数量</th>
        </tr>
      </thead>
      <tbody>
        ${patternsHtml}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3>加工工序</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">序号</th>
          <th style="width: 100px;">工序名称</th>
          <th>描述</th>
          <th style="width: 80px;">单价</th>
          <th style="width: 70px;">数量</th>
          <th style="width: 50px;">单位</th>
          <th style="width: 100px;">小计</th>
        </tr>
      </thead>
      <tbody>
        ${processesHtml}
        <tr class="total-row">
          <td colspan="6" style="text-align: right;">人工费小计</td>
          <td>¥${data.breakdown.totalLaborCost.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3>费用汇总</h3>
    <div class="summary">
      <div class="summary-row">
        <span>材料成本</span>
        <span>¥${data.breakdown.totalMaterialCost.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>人工成本</span>
        <span>¥${data.breakdown.totalLaborCost.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>其他费用</span>
        <span>¥${data.breakdown.otherCost.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>利润</span>
        <span>¥${data.breakdown.profit.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>单价</span>
        <span>¥${data.breakdown.unitPrice.toFixed(2)} / 件</span>
      </div>
      <div class="summary-row total">
        <span>总报价</span>
        <span>¥${data.breakdown.totalPrice.toFixed(2)}</span>
      </div>
    </div>
  </div>

  ${data.craftNotes ? `
  <div class="section">
    <h3>工艺备注</h3>
    <div class="notes">${data.craftNotes}</div>
  </div>
  ` : ''}

  <div class="footer">
    本报价仅供参考，最终价格以实际确认为准 · 智能银饰拼版系统
  </div>
</body>
</html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 300)
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="modalTitle"
    style="width: 720px; max-width: 90vw;"
    @update:show="handleClose"
    class="work-order-preview-modal"
  >
    <div v-if="displayData" class="preview-content" ref="previewContentRef">
      <div class="preview-header">
        <div class="header-left">
          <h2 class="preview-title">银饰工艺报价工单</h2>
          <div class="header-meta">
            <span v-if="workOrder" class="order-no">
              工单号: {{ displayData.orderNo }}
            </span>
            <span class="create-time">
              创建时间: {{ formatDate(displayData.createdAt) }}
            </span>
            <NTag :type="statusTagType" size="small">
              {{ WORK_ORDER_STATUS_LABELS[displayData.status] || '草稿' }}
            </NTag>
          </div>
        </div>
      </div>

      <div class="preview-section">
        <h3 class="section-title">客户信息</h3>
        <NDescriptions :column="2" size="small" bordered>
          <NDescriptionsItem label="客户姓名">
            {{ displayData.customerInfo.name || '未填写' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="联系电话">
            {{ displayData.customerInfo.phone || '未填写' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="公司名称">
            {{ displayData.customerInfo.company || '未填写' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="电子邮箱">
            {{ displayData.customerInfo.email || '未填写' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="联系地址" :span="2">
            {{ displayData.customerInfo.address || '未填写' }}
          </NDescriptionsItem>
        </NDescriptions>
      </div>

      <div class="preview-section">
        <h3 class="section-title">订单信息</h3>
        <NDescriptions :column="2" size="small" bordered>
          <NDescriptionsItem label="生产数量">
            {{ displayData.quantity }} 件
          </NDescriptionsItem>
          <NDescriptionsItem label="交货日期">
            {{ displayData.deliveryDate || '未设置' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="银片规格">
            {{ displayData.layoutSnapshot.silverSheet.width }} ×
            {{ displayData.layoutSnapshot.silverSheet.height }} mm
          </NDescriptionsItem>
          <NDescriptionsItem label="银料重量">
            {{ formatWeight(displayData.breakdown.silverWeight) }}
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
            {{ formatCurrency(displayData.breakdown.totalLaborCost) }}
          </span>
        </div>
      </div>

      <div class="preview-section">
        <h3 class="section-title">费用汇总</h3>
        <div class="summary-box">
          <div class="summary-row">
            <span>材料成本</span>
            <span>{{ formatCurrency(displayData.breakdown.totalMaterialCost) }}</span>
          </div>
          <div class="summary-row">
            <span>人工成本</span>
            <span>{{ formatCurrency(displayData.breakdown.totalLaborCost) }}</span>
          </div>
          <div class="summary-row">
            <span>其他费用</span>
            <span>{{ formatCurrency(displayData.breakdown.otherCost) }}</span>
          </div>
          <div class="summary-row">
            <span>利润</span>
            <span>{{ formatCurrency(displayData.breakdown.profit) }}</span>
          </div>
          <div class="summary-row">
            <span>单价</span>
            <span>{{ formatCurrency(displayData.breakdown.unitPrice) }} / 件</span>
          </div>
          <div class="summary-row total">
            <span>总报价</span>
            <span>{{ formatCurrency(displayData.breakdown.totalPrice) }}</span>
          </div>
        </div>
      </div>

      <div v-if="displayData.craftNotes" class="preview-section">
        <h3 class="section-title">工艺备注</h3>
        <div class="notes-box">
          {{ displayData.craftNotes }}
        </div>
      </div>
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
          <NButton :loading="isExportingImage" @click="handleExportImage">
            <template #icon>
              <NIcon><Image /></NIcon>
            </template>
            导出图片
          </NButton>
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
</template>

<style scoped>
.preview-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 4px;
}

.preview-header {
  text-align: center;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 2px solid #8B4513;
}

.preview-title {
  margin: 0 0 8px 0;
  color: #8B4513;
  font-size: 22px;
}

.header-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: #666;
}

.order-no {
  font-weight: 500;
}

.preview-section {
  margin-bottom: 16px;
}

.section-title {
  color: #8B4513;
  font-size: 15px;
  margin: 0 0 10px 0;
  padding-left: 10px;
  border-left: 4px solid #8B4513;
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
  padding: 16px 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 14px;
  color: #333;
}

.summary-row.total {
  padding-top: 10px;
  margin-top: 6px;
  border-top: 1px dashed #d48806;
  font-size: 18px;
  font-weight: 700;
  color: #d46b08;
}

.notes-box {
  background: #fafaf8;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #555;
  white-space: pre-wrap;
}

:deep(.work-order-preview-modal .n-modal-card-body) {
  padding-top: 8px;
}
</style>
