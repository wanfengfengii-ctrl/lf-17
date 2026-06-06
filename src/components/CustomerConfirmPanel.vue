<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NCard,
  NButton,
  NIcon,
  NTag,
  NModal,
  NInput,
  NSelect,
  NSpace,
  NDescriptions,
  NDescriptionsItem,
  useMessage
} from 'naive-ui'
import {
  Mail,
  Checkmark,
  People
} from '@vicons/ionicons5'
import { useQuotationStore } from '@/stores/quotation'
import { CUSTOMER_CONFIRM_LABELS } from '@/types/quotation'
import type { CustomerConfirmStatus } from '@/types/quotation'

const props = defineProps<{
  targetType: 'quotation' | 'workOrder'
  targetId: string
}>()

const emit = defineEmits(['updated'])

const quotationStore = useQuotationStore()
const message = useMessage()

const showSendDialog = ref(false)
const showUpdateDialog = ref(false)
const updateStatus = ref<CustomerConfirmStatus>('confirmed')
const updateCustomerName = ref('')
const updateComment = ref('')

const targetData = computed(() => {
  if (props.targetType === 'quotation') {
    return quotationStore.quotationVersions.find(v => v.id === props.targetId)
  } else {
    return quotationStore.workOrders.find(w => w.orderNo === props.targetId)
  }
})

const confirmation = computed(() => targetData.value?.customerConfirmation)

function getStatusType(status: CustomerConfirmStatus): 'default' | 'info' | 'success' | 'error' {
  switch (status) {
    case 'pending': return 'default'
    case 'viewed': return 'info'
    case 'confirmed': return 'success'
    case 'rejected': return 'error'
    default: return 'default'
  }
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function openSendDialog() {
  showSendDialog.value = true
}

function handleSend() {
  const success = quotationStore.sendCustomerConfirmation(props.targetType, props.targetId)
  if (success) {
    message.success('确认请求已发送')
    showSendDialog.value = false
    emit('updated')
  } else {
    message.error('发送失败')
  }
}

function openUpdateDialog() {
  updateStatus.value = 'confirmed'
  updateCustomerName.value = targetData.value?.customerInfo?.name || ''
  updateComment.value = ''
  showUpdateDialog.value = true
}

function handleUpdate() {
  const success = quotationStore.updateCustomerConfirmation(
    props.targetType,
    props.targetId,
    updateStatus.value,
    updateCustomerName.value || undefined,
    updateComment.value || undefined
  )
  if (success) {
    message.success(`客户确认状态已更新：${CUSTOMER_CONFIRM_LABELS[updateStatus.value]}`)
    showUpdateDialog.value = false
    emit('updated')
  } else {
    message.error('更新失败')
  }
}

const statusOptions = [
  { label: '已确认', value: 'confirmed' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已查看', value: 'viewed' }
]
</script>

<template>
  <NCard title="客户确认" size="small" :bordered="false" class="customer-confirm-panel">
    <template #header-extra>
      <NTag
        v-if="confirmation"
        :type="getStatusType(confirmation.status)"
        size="small"
      >
        {{ CUSTOMER_CONFIRM_LABELS[confirmation.status] }}
      </NTag>
      <NTag v-else type="default" size="small">
        未发送
      </NTag>
    </template>

    <div v-if="!confirmation" class="no-confirmation">
      <NIcon class="empty-icon" color="#999"><People /></NIcon>
      <p class="empty-text">尚未发送客户确认</p>
      <NButton size="small" type="primary" @click="openSendDialog">
        <template #icon>
          <NIcon><Mail /></NIcon>
        </template>
        发送确认
      </NButton>
    </div>

    <div v-else class="confirmation-info">
      <NDescriptions :column="1" size="small">
        <NDescriptionsItem label="发送时间">
          {{ formatDate(confirmation.sentAt) }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="confirmation.confirmedAt" label="确认时间">
          {{ formatDate(confirmation.confirmedAt) }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="confirmation.customerName" label="确认人">
          {{ confirmation.customerName }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="confirmation.comment" label="客户留言">
          {{ confirmation.comment }}
        </NDescriptionsItem>
      </NDescriptions>

      <div class="confirm-actions">
        <NSpace size="small">
          <NButton size="tiny" @click="openSendDialog">
            <template #icon>
              <NIcon><Mail /></NIcon>
            </template>
            重发
          </NButton>
          <NButton size="tiny" type="primary" @click="openUpdateDialog">
            <template #icon>
              <NIcon><Checkmark /></NIcon>
            </template>
            更新状态
          </NButton>
        </NSpace>
      </div>
    </div>
  </NCard>

  <NModal
    :show="showSendDialog"
    preset="card"
    title="发送客户确认"
    style="width: 360px"
    @update:show="v => showSendDialog = v"
  >
    <p class="dialog-text">
      确定要向客户发送确认请求吗？
    </p>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showSendDialog = false">取消</NButton>
        <NButton type="primary" @click="handleSend">发送</NButton>
      </NSpace>
    </template>
  </NModal>

  <NModal
    :show="showUpdateDialog"
    preset="card"
    title="更新客户确认状态"
    style="width: 360px"
    @update:show="v => showUpdateDialog = v"
  >
    <div class="update-form">
      <div class="form-item">
        <label>确认状态</label>
        <NSelect
          v-model:value="updateStatus"
          :options="statusOptions"
        />
      </div>
      <div class="form-item">
        <label>客户名称</label>
        <NInput v-model:value="updateCustomerName" placeholder="请输入客户名称（可选）" />
      </div>
      <div class="form-item">
        <label>客户留言</label>
        <NInput
          v-model:value="updateComment"
          type="textarea"
          placeholder="请输入客户留言（可选）"
          :rows="3"
        />
      </div>
    </div>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showUpdateDialog = false">取消</NButton>
        <NButton type="primary" @click="handleUpdate">确认</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.customer-confirm-panel {
  margin-bottom: 12px;
}

.no-confirmation {
  text-align: center;
  padding: 20px 0;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 13px;
  color: #999;
  margin: 0 0 12px 0;
}

.confirmation-info {
  padding: 4px 0;
}

.confirm-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.dialog-text {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.update-form {
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
