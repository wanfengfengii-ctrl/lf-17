<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NButton,
  NIcon,
  NInputNumber,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSpace,
  NTag,
  NList,
  NListItem,
  NPopconfirm,
  NEmpty,
  NDivider,
  useMessage,
  NText,
  NCollapse,
  NCollapseItem,
  NSelect
} from 'naive-ui'
import {
  Pricetag,
  Save,
  Trash,
  Add,
  Construct,
  Cash
} from '@vicons/ionicons5'
import { useQuotationStore } from '@/stores/quotation'
import { usePatternStore } from '@/stores/pattern'
import { formatCurrency, formatWeight } from '@/utils/quotationUtils'

const quotationStore = useQuotationStore()
const patternStore = usePatternStore()
const message = useMessage()

const showSaveDialog = ref(false)
const versionName = ref('')
const showAddProcessDialog = ref(false)

const newProcess = ref({
  name: '',
  description: '',
  unitPrice: 0,
  unit: '件',
  quantity: 1
})

const processUnitOptions = [
  { label: '件', value: '件' },
  { label: '小时', value: '小时' },
  { label: '克', value: '克' },
  { label: '道', value: '道' }
]

const breakdown = computed(() => quotationStore.currentBreakdown)

const hasPatterns = computed(() => patternStore.placedPatterns.length > 0)

function openSaveDialog() {
  if (!hasPatterns.value) {
    message.warning('画布上没有纹样，无法保存报价')
    return
  }
  versionName.value = `报价版本 ${quotationStore.quotationVersions.length + 1}`
  showSaveDialog.value = true
}

function handleSaveVersion() {
  if (!versionName.value.trim()) {
    message.error('请输入版本名称')
    return
  }
  const result = quotationStore.saveQuotationVersion(versionName.value.trim())
  if (result) {
    message.success('报价版本保存成功')
    showSaveDialog.value = false
  }
}

function handleQuantityChange(value: number | null) {
  if (value != null && value > 0) {
    quotationStore.setQuantity(value)
  }
}

function handleProcessPriceChange(processId: string, value: number | null) {
  if (value != null) {
    quotationStore.updateProcess(processId, { unitPrice: value })
  }
}

function handleProcessQuantityChange(processId: string, value: number | null) {
  if (value != null && value >= 0) {
    quotationStore.updateProcess(processId, { quantity: value })
  }
}

function handleRemoveProcess(processId: string) {
  quotationStore.removeProcess(processId)
  message.success('工序已删除')
}

function openAddProcessDialog() {
  newProcess.value = {
    name: '',
    description: '',
    unitPrice: 0,
    unit: '件',
    quantity: quotationStore.quantity
  }
  showAddProcessDialog.value = true
}

function handleAddProcess() {
  if (!newProcess.value.name.trim()) {
    message.error('请输入工序名称')
    return
  }
  if (newProcess.value.unitPrice < 0) {
    message.error('单价不能为负数')
    return
  }
  quotationStore.addProcess({
    name: newProcess.value.name.trim(),
    description: newProcess.value.description.trim(),
    unitPrice: newProcess.value.unitPrice,
    unit: newProcess.value.unit,
    quantity: newProcess.value.quantity
  })
  message.success('工序已添加')
  showAddProcessDialog.value = false
}

function handleSilverPriceChange(value: number | null) {
  if (value != null && value > 0) {
    quotationStore.setQuotationConfig({ silverPrice: value })
  }
}

function handleLossRateChange(value: number | null) {
  if (value != null && value >= 0) {
    quotationStore.setQuotationConfig({ lossRate: value })
  }
}

function handleThicknessChange(value: number | null) {
  if (value != null && value > 0) {
    quotationStore.setQuotationConfig({ silverThickness: value })
  }
}

function handleProfitRateChange(value: number | null) {
  if (value != null && value >= 0) {
    quotationStore.setQuotationConfig({ profitRate: value })
  }
}

function handleOtherCostRateChange(value: number | null) {
  if (value != null && value >= 0) {
    quotationStore.setQuotationConfig({ otherCostRate: value })
  }
}
</script>

<template>
  <div class="quotation-panel">
    <NCard title="工艺报价" size="small" :bordered="false" class="quotation-card">
      <template #header-extra>
        <NSpace size="small">
          <NButton size="small" type="primary" @click="openSaveDialog">
            <template #icon>
              <NIcon><Save /></NIcon>
            </template>
            保存报价
          </NButton>
        </NSpace>
      </template>

      <div v-if="!hasPatterns" class="empty-state">
        <NEmpty description="请先在画布上放置纹样" size="small" />
      </div>

      <template v-else>
        <NForm label-placement="left" label-width="80px" size="small" class="quantity-form">
          <NFormItem label="生产数量">
            <NInputNumber
              :value="quotationStore.quantity"
              :min="1"
              :max="10000"
              style="width: 100%"
              @update:value="handleQuantityChange"
            />
          </NFormItem>
        </NForm>

        <NDivider style="margin: 12px 0" />

        <div class="section">
          <div class="section-header">
            <NIcon class="section-icon"><Construct /></NIcon>
            <span class="section-title">材料估算</span>
          </div>
          <NDescriptions :column="1" size="small" class="material-desc">
            <NDescriptionsItem label="银片规格">
              {{ patternStore.silverSheet.width }} × {{ patternStore.silverSheet.height }} mm
              (厚度 {{ quotationStore.quotationConfig.silverThickness }} mm)
            </NDescriptionsItem>
            <NDescriptionsItem label="银料重量">
              <NText type="success" strong>{{ formatWeight(breakdown.silverWeight) }}</NText>
            </NDescriptionsItem>
            <NDescriptionsItem label="银料单价">
              ¥{{ quotationStore.quotationConfig.silverPrice }} / g
            </NDescriptionsItem>
            <NDescriptionsItem label="材料费">
              {{ formatCurrency(breakdown.materialCost) }}
            </NDescriptionsItem>
            <NDescriptionsItem label="损耗率">
              <NTag size="small" type="warning">
                {{ breakdown.materialLoss }}%
              </NTag>
            </NDescriptionsItem>
            <NDescriptionsItem label="损耗费用">
              {{ formatCurrency(breakdown.materialLossCost) }}
            </NDescriptionsItem>
            <NDescriptionsItem label="材料总成本">
              <NText strong>{{ formatCurrency(breakdown.totalMaterialCost) }}</NText>
            </NDescriptionsItem>
          </NDescriptions>
        </div>

        <NDivider style="margin: 12px 0" />

        <div class="section">
          <div class="section-header">
            <NIcon class="section-icon"><Cash /></NIcon>
            <span class="section-title">加工工序</span>
            <NButton size="tiny" type="primary" ghost @click="openAddProcessDialog">
              <template #icon>
                <NIcon><Add /></NIcon>
              </template>
              添加工序
            </NButton>
          </div>
          <NList size="small" hoverable class="process-list">
            <NListItem v-for="process in breakdown.processes" :key="process.id" class="process-item">
              <div class="process-info">
                <div class="process-name">{{ process.name }}</div>
                <div class="process-desc" v-if="process.description">
                  {{ process.description }}
                </div>
              </div>
              <div class="process-calc">
                <NInputNumber
                  :value="process.unitPrice"
                  :min="0"
                  size="tiny"
                  style="width: 70px"
                  @update:value="v => handleProcessPriceChange(process.id, v)"
                />
                <span class="process-multiply">×</span>
                <NInputNumber
                  :value="process.quantity"
                  :min="0"
                  size="tiny"
                  style="width: 60px"
                  @update:value="v => handleProcessQuantityChange(process.id, v)"
                />
                <span class="process-unit">{{ process.unit }}</span>
                <span class="process-equal">=</span>
                <span class="process-total">{{ formatCurrency(process.totalPrice) }}</span>
              </div>
              <NPopconfirm
                positive-text="删除"
                negative-text="取消"
                type="error"
                @positive-click="handleRemoveProcess(process.id)"
              >
                <template #trigger>
                  <NButton size="tiny" type="error" ghost>
                    <template #icon>
                      <NIcon><Trash /></NIcon>
                    </template>
                  </NButton>
                </template>
                确定要删除这个工序吗？
              </NPopconfirm>
            </NListItem>
          </NList>
          <div class="labor-total">
            <span>人工费小计</span>
            <span class="labor-total-value">{{ formatCurrency(breakdown.totalLaborCost) }}</span>
          </div>
        </div>

        <NDivider style="margin: 12px 0" />

        <div class="section">
          <div class="section-header">
            <NIcon class="section-icon"><Pricetag /></NIcon>
            <span class="section-title">费用明细</span>
          </div>
          <NDescriptions :column="1" size="small" class="cost-desc">
            <NDescriptionsItem label="材料成本">
              {{ formatCurrency(breakdown.totalMaterialCost) }}
            </NDescriptionsItem>
            <NDescriptionsItem label="人工成本">
              {{ formatCurrency(breakdown.totalLaborCost) }}
            </NDescriptionsItem>
            <NDescriptionsItem label="其他费用">
              {{ formatCurrency(breakdown.otherCost) }}
              <span class="subtle">({{ quotationStore.quotationConfig.otherCostRate }}%)</span>
            </NDescriptionsItem>
            <NDescriptionsItem label="利润">
              {{ formatCurrency(breakdown.profit) }}
              <span class="subtle">({{ quotationStore.quotationConfig.profitRate }}%)</span>
            </NDescriptionsItem>
          </NDescriptions>
        </div>

        <NDivider style="margin: 12px 0" />

        <div class="total-section">
          <div class="total-row">
            <span class="total-label">单价</span>
            <span class="unit-price">{{ formatCurrency(breakdown.unitPrice) }} / 件</span>
          </div>
          <div class="total-row main">
            <span class="total-label">总报价</span>
            <span class="total-price">{{ formatCurrency(breakdown.totalPrice) }}</span>
          </div>
        </div>

        <NCollapse :default-expanded-names="['config']" class="config-collapse">
          <NCollapseItem name="config" title="报价参数设置">
            <NForm label-placement="left" label-width="100px" size="small">
              <NFormItem label="银料单价(元/g)">
                <NInputNumber
                  :value="quotationStore.quotationConfig.silverPrice"
                  :min="0"
                  :step="0.1"
                  style="width: 100%"
                  @update:value="handleSilverPriceChange"
                />
              </NFormItem>
              <NFormItem label="银片厚度(mm)">
                <NInputNumber
                  :value="quotationStore.quotationConfig.silverThickness"
                  :min="0.1"
                  :step="0.1"
                  style="width: 100%"
                  @update:value="handleThicknessChange"
                />
              </NFormItem>
              <NFormItem label="损耗率(%)">
                <NInputNumber
                  :value="quotationStore.quotationConfig.lossRate"
                  :min="0"
                  :max="100"
                  style="width: 100%"
                  @update:value="handleLossRateChange"
                />
              </NFormItem>
              <NFormItem label="其他费用率(%)">
                <NInputNumber
                  :value="quotationStore.quotationConfig.otherCostRate"
                  :min="0"
                  :max="100"
                  style="width: 100%"
                  @update:value="handleOtherCostRateChange"
                />
              </NFormItem>
              <NFormItem label="利润率(%)">
                <NInputNumber
                  :value="quotationStore.quotationConfig.profitRate"
                  :min="0"
                  :max="100"
                  style="width: 100%"
                  @update:value="handleProfitRateChange"
                />
              </NFormItem>
            </NForm>
          </NCollapseItem>
        </NCollapse>
      </template>
    </NCard>

    <NModal
      :show="showSaveDialog"
      preset="card"
      title="保存报价版本"
      style="width: 420px"
      @update:show="v => showSaveDialog = v"
    >
      <NForm label-placement="top">
        <NFormItem label="版本名称">
          <NInput v-model:value="versionName" placeholder="请输入版本名称" maxlength="50" />
        </NFormItem>
      </NForm>

      <div class="preview-info">
        <div class="preview-row">
          <span>数量</span>
          <span>{{ quotationStore.quantity }} 件</span>
        </div>
        <div class="preview-row">
          <span>银重</span>
          <span>{{ formatWeight(breakdown.silverWeight) }}</span>
        </div>
        <div class="preview-row highlight">
          <span>总报价</span>
          <span>{{ formatCurrency(breakdown.totalPrice) }}</span>
        </div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showSaveDialog = false">取消</NButton>
          <NButton type="primary" @click="handleSaveVersion">保存</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      :show="showAddProcessDialog"
      preset="card"
      title="添加工序"
      style="width: 400px"
      @update:show="v => showAddProcessDialog = v"
    >
      <NForm label-placement="top">
        <NFormItem label="工序名称">
          <NInput v-model:value="newProcess.name" placeholder="请输入工序名称" maxlength="30" />
        </NFormItem>
        <NFormItem label="工序描述">
          <NInput v-model:value="newProcess.description" placeholder="请输入工序描述" maxlength="100" />
        </NFormItem>
        <NSpace>
          <NFormItem label="单价" style="flex: 1">
            <NInputNumber
              v-model:value="newProcess.unitPrice"
              :min="0"
              :step="0.5"
              style="width: 100%"
            />
          </NFormItem>
          <NFormItem label="单位" style="flex: 1">
            <NSelect
              v-model:value="newProcess.unit"
              :options="processUnitOptions"
              style="width: 100%"
            />
          </NFormItem>
          <NFormItem label="数量" style="flex: 1">
            <NInputNumber
              v-model:value="newProcess.quantity"
              :min="0"
              style="width: 100%"
            />
          </NFormItem>
        </NSpace>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showAddProcessDialog = false">取消</NButton>
          <NButton type="primary" @click="handleAddProcess">添加</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.quotation-panel {
  margin-bottom: 12px;
}

.quotation-card {
  margin-bottom: 12px;
}

.empty-state {
  padding: 24px 0;
}

.quantity-form {
  margin-top: 8px;
}

.section {
  margin-top: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.section-icon {
  color: #cd853f;
  font-size: 16px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  flex: 1;
}

.material-desc {
  background: #fafaf8;
  border-radius: 6px;
  padding: 8px 12px;
}

.process-list {
  background: #fafaf8;
  border-radius: 6px;
  padding: 4px 0;
}

.process-item {
  display: flex !important;
  align-items: center;
  gap: 8px;
  padding: 8px 12px !important;
}

.process-info {
  flex: 1;
  min-width: 0;
}

.process-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.process-desc {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.process-calc {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.process-multiply,
.process-equal {
  color: #999;
  font-weight: 500;
}

.process-unit {
  color: #666;
  font-size: 11px;
}

.process-total {
  font-weight: 600;
  color: #333;
  min-width: 60px;
  text-align: right;
}

.labor-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fff8e6;
  border-radius: 6px;
  font-size: 13px;
}

.labor-total-value {
  font-weight: 600;
  color: #d48806;
}

.cost-desc {
  background: #fafaf8;
  border-radius: 6px;
  padding: 8px 12px;
}

.subtle {
  font-size: 11px;
  color: #999;
  margin-left: 4px;
}

.total-section {
  background: linear-gradient(135deg, #fff8e6 0%, #ffe7ba 100%);
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 4px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.total-row.main {
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px dashed #d48806;
}

.total-label {
  font-size: 13px;
  color: #666;
}

.unit-price {
  font-size: 15px;
  font-weight: 600;
  color: #d48806;
}

.total-price {
  font-size: 22px;
  font-weight: 700;
  color: #d46b08;
}

.config-collapse {
  margin-top: 12px;
}

.preview-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 8px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.preview-row.highlight {
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px solid #e8e8e8;
  font-weight: 600;
  color: #d46b08;
}
</style>
