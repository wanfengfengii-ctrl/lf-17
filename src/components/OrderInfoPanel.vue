<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NDatePicker,
  NButton,
  NIcon,
  NTag,
  useMessage
} from 'naive-ui'
import {
  People,
  DocumentText,
  Calendar,
  Create,
  Close,
  Checkmark
} from '@vicons/ionicons5'
import { useQuotationStore } from '@/stores/quotation'
import type { CustomerInfo } from '@/types/quotation'

const quotationStore = useQuotationStore()
const message = useMessage()

const isEditing = computed(() => quotationStore.isOrderInfoEditing)
const hasUnsavedChanges = computed(() => quotationStore.hasUnsavedOrderChanges)

const draftCustomerInfo = ref<CustomerInfo>({ ...quotationStore.customerInfo })
const draftCraftNotes = ref(quotationStore.craftNotes)
const draftDeliveryDate = ref(quotationStore.deliveryDate)

const deliveryDateTs = computed(() => {
  if (!draftDeliveryDate.value) return null
  return new Date(draftDeliveryDate.value).getTime()
})

function enterEditMode() {
  draftCustomerInfo.value = { ...quotationStore.customerInfo }
  draftCraftNotes.value = quotationStore.craftNotes
  draftDeliveryDate.value = quotationStore.deliveryDate
  quotationStore.setUnsavedOrderChanges(false)
  quotationStore.setOrderInfoEditing(true)
}

function exitEditMode(force: boolean = false) {
  if (!force && quotationStore.hasUnsavedOrderChanges) {
    return
  }
  quotationStore.setOrderInfoEditing(false)
  quotationStore.setUnsavedOrderChanges(false)
}

function handleCancelEdit() {
  exitEditMode(true)
  message.info('已取消编辑')
}

function handleSaveEdit() {
  quotationStore.setCustomerInfo(draftCustomerInfo.value)
  quotationStore.setCraftNotes(draftCraftNotes.value)
  quotationStore.setDeliveryDate(draftDeliveryDate.value)
  quotationStore.setUnsavedOrderChanges(false)
  quotationStore.setOrderInfoEditing(false)
  message.success('订单信息已保存')
}

function markUnsaved() {
  quotationStore.setUnsavedOrderChanges(true)
}

function handleCustomerNameChange(value: string) {
  draftCustomerInfo.value.name = value
  markUnsaved()
}

function handleCustomerPhoneChange(value: string) {
  draftCustomerInfo.value.phone = value
  markUnsaved()
}

function handleCustomerCompanyChange(value: string) {
  draftCustomerInfo.value.company = value
  markUnsaved()
}

function handleCustomerEmailChange(value: string) {
  draftCustomerInfo.value.email = value
  markUnsaved()
}

function handleCustomerAddressChange(value: string) {
  draftCustomerInfo.value.address = value
  markUnsaved()
}

function handleCraftNotesChange(e: Event) {
  const target = e.target as HTMLTextAreaElement
  draftCraftNotes.value = target.value
  markUnsaved()
}

function handleDeliveryDateChange(value: number | null) {
  if (value) {
    const date = new Date(value)
    const dateStr = date.toISOString().split('T')[0]
    draftDeliveryDate.value = dateStr
  } else {
    draftDeliveryDate.value = ''
  }
  markUnsaved()
}

defineExpose({
  isEditing,
  hasUnsavedChanges,
  exitEditMode
})
</script>

<template>
  <NCard title="订单信息" size="small" :bordered="false" class="order-info-card">
    <template #header-extra>
      <template v-if="!isEditing">
        <NButton size="tiny" type="primary" ghost @click="enterEditMode">
          <template #icon>
            <NIcon><Create /></NIcon>
          </template>
          编辑
        </NButton>
      </template>
      <template v-else>
        <div class="edit-actions">
          <NTag v-if="hasUnsavedChanges" size="small" type="warning" class="unsaved-tag">
            未保存
          </NTag>
          <NButton size="tiny" @click="handleCancelEdit">
            <template #icon>
              <NIcon><Close /></NIcon>
            </template>
            取消
          </NButton>
          <NButton size="tiny" type="primary" @click="handleSaveEdit">
            <template #icon>
              <NIcon><Checkmark /></NIcon>
            </template>
            保存
          </NButton>
        </div>
      </template>
    </template>

    <div class="info-section">
      <div class="section-label">
        <NIcon class="label-icon"><People /></NIcon>
        <span>客户信息</span>
      </div>

      <div v-if="!isEditing" class="info-display">
        <div class="info-row">
          <span class="info-key">客户姓名</span>
          <span class="info-value">
            {{ quotationStore.customerInfo.name || '未填写' }}
          </span>
        </div>
        <div class="info-row">
          <span class="info-key">联系电话</span>
          <span class="info-value">
            {{ quotationStore.customerInfo.phone || '未填写' }}
          </span>
        </div>
        <div class="info-row">
          <span class="info-key">公司名称</span>
          <span class="info-value">
            {{ quotationStore.customerInfo.company || '未填写' }}
          </span>
        </div>
        <div class="info-row">
          <span class="info-key">电子邮箱</span>
          <span class="info-value">
            {{ quotationStore.customerInfo.email || '未填写' }}
          </span>
        </div>
        <div class="info-row">
          <span class="info-key">联系地址</span>
          <span class="info-value">
            {{ quotationStore.customerInfo.address || '未填写' }}
          </span>
        </div>
      </div>

      <div v-else class="info-form">
        <NForm label-placement="left" label-width="70px" size="small">
          <NFormItem label="姓名">
            <NInput
              :value="draftCustomerInfo.name"
              placeholder="请输入客户姓名"
              @update:value="handleCustomerNameChange"
            />
          </NFormItem>
          <NFormItem label="电话">
            <NInput
              :value="draftCustomerInfo.phone"
              placeholder="请输入联系电话"
              @update:value="handleCustomerPhoneChange"
            />
          </NFormItem>
          <NFormItem label="公司">
            <NInput
              :value="draftCustomerInfo.company"
              placeholder="请输入公司名称"
              @update:value="handleCustomerCompanyChange"
            />
          </NFormItem>
          <NFormItem label="邮箱">
            <NInput
              :value="draftCustomerInfo.email"
              placeholder="请输入电子邮箱"
              @update:value="handleCustomerEmailChange"
            />
          </NFormItem>
          <NFormItem label="地址">
            <NInput
              :value="draftCustomerInfo.address"
              placeholder="请输入联系地址"
              @update:value="handleCustomerAddressChange"
            />
          </NFormItem>
        </NForm>
      </div>
    </div>

    <div class="info-section">
      <div class="section-label">
        <NIcon class="label-icon"><Calendar /></NIcon>
        <span>交期</span>
      </div>

      <div v-if="!isEditing" class="info-display">
        <div class="info-row">
          <span class="info-key">交货日期</span>
          <span class="info-value">
            {{ quotationStore.deliveryDate || '未设置' }}
          </span>
        </div>
        <div class="info-row">
          <span class="info-key">生产数量</span>
          <span class="info-value">
            {{ quotationStore.quantity }} 件
          </span>
        </div>
      </div>

      <div v-else class="info-form">
        <NForm label-placement="left" label-width="70px" size="small">
          <NFormItem label="交货日期">
            <NDatePicker
              :value="deliveryDateTs"
              type="date"
              placeholder="选择交货日期"
              style="width: 100%"
              @update:value="handleDeliveryDateChange"
            />
          </NFormItem>
        </NForm>
      </div>
    </div>

    <div class="info-section">
      <div class="section-label">
        <NIcon class="label-icon"><DocumentText /></NIcon>
        <span>工艺备注</span>
      </div>

      <div v-if="!isEditing" class="info-display">
        <div class="notes-content">
          {{ quotationStore.craftNotes || '暂无备注' }}
        </div>
      </div>

      <div v-else class="info-form">
        <textarea
          class="notes-textarea"
          :value="draftCraftNotes"
          placeholder="请输入工艺备注，如特殊要求、材质说明、表面处理等..."
          rows="4"
          @input="handleCraftNotesChange"
        ></textarea>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
.order-info-card {
  margin-bottom: 12px;
}

.edit-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.unsaved-tag {
  margin-right: 4px;
}

.info-section {
  margin-bottom: 12px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.label-icon {
  color: #cd853f;
  font-size: 14px;
}

.info-display {
  background: #fafaf8;
  border-radius: 6px;
  padding: 8px 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
}

.info-key {
  color: #999;
}

.info-value {
  color: #333;
  text-align: right;
  max-width: 60%;
  word-break: break-all;
}

.notes-content {
  background: #fafaf8;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

.notes-textarea {
  width: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}

.notes-textarea:focus {
  border-color: #cd853f;
}

.info-form :deep(.n-form-item) {
  margin-bottom: 8px;
}

.info-form :deep(.n-form-item:last-child) {
  margin-bottom: 0;
}
</style>
