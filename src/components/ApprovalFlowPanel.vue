<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NCard,
  NButton,
  NIcon,
  NTag,
  NModal,
  NInput,
  NSelect,
  NSpace,
  NEmpty,
  NTimeline,
  NTimelineItem,
  useMessage
} from 'naive-ui'
import {
  Checkmark
} from '@vicons/ionicons5'
import { useQuotationStore } from '@/stores/quotation'
import { APPROVAL_STATUS_LABELS } from '@/types/quotation'
import type { ApprovalStatus, QuotationVersion } from '@/types/quotation'

const props = defineProps<{
  quotationId: string
}>()

const emit = defineEmits(['approved'])

const quotationStore = useQuotationStore()
const message = useMessage()

const showApprovalDialog = ref(false)
const approvalStatus = ref<ApprovalStatus>('approved')
const approvalComment = ref('')

const quotation = computed<QuotationVersion | undefined>(() => {
  return quotationStore.quotationVersions.find(v => v.id === props.quotationId)
})

const sortedRecords = computed(() => {
  return [...(quotation.value?.approvalRecords || [])].sort(
    (a, b) => b.createdAt - a.createdAt
  )
})

const approvalOptions = [
  { label: '通过', value: 'approved' },
  { label: '拒绝', value: 'rejected' },
  { label: '需修改', value: 'revision' }
]

function getStatusType(status: ApprovalStatus): 'default' | 'success' | 'error' | 'warning' {
  switch (status) {
    case 'pending': return 'default'
    case 'approved': return 'success'
    case 'rejected': return 'error'
    case 'revision': return 'warning'
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

function openApprovalDialog() {
  approvalStatus.value = 'approved'
  approvalComment.value = ''
  showApprovalDialog.value = true
}

function handleApprove() {
  const success = quotationStore.approveQuotationVersion(
    props.quotationId,
    approvalStatus.value,
    approvalComment.value
  )
  if (success) {
    message.success(`审批操作已提交：${APPROVAL_STATUS_LABELS[approvalStatus.value]}`)
    showApprovalDialog.value = false
    emit('approved')
  } else {
    message.error('审批操作失败')
  }
}
</script>

<template>
  <NCard title="审批流程" size="small" :bordered="false" class="approval-panel">
    <template #header-extra>
      <div class="current-status">
        <NTag :type="getStatusType(quotation?.approvalStatus || 'pending')" size="small">
          {{ APPROVAL_STATUS_LABELS[quotation?.approvalStatus || 'pending'] }}
        </NTag>
      </div>
    </template>

    <div class="approval-actions">
      <NButton size="small" type="primary" @click="openApprovalDialog">
        <template #icon>
          <NIcon><Checkmark /></NIcon>
        </template>
        审批
      </NButton>
    </div>

    <div v-if="sortedRecords.length === 0" class="empty-state">
      <NEmpty description="暂无审批记录" size="small" />
    </div>

    <NTimeline v-else>
      <NTimelineItem
        v-for="record in sortedRecords"
        :key="record.id"
        :type="getStatusType(record.status)"
      >
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="approver">{{ record.approver }}</span>
            <NTag size="small" :type="getStatusType(record.status)">
              {{ APPROVAL_STATUS_LABELS[record.status] }}
            </NTag>
          </div>
          <div v-if="record.comment" class="timeline-comment">
            {{ record.comment }}
          </div>
          <div class="timeline-time">{{ formatDate(record.createdAt) }}</div>
        </div>
      </NTimelineItem>
    </NTimeline>
  </NCard>

  <NModal
    :show="showApprovalDialog"
    preset="card"
    title="审批操作"
    style="width: 400px"
    @update:show="v => showApprovalDialog = v"
  >
    <div class="approval-form">
      <div class="form-item">
        <label>审批结果</label>
        <NSelect
          v-model:value="approvalStatus"
          :options="approvalOptions"
          placeholder="请选择审批结果"
        />
      </div>
      <div class="form-item">
        <label>审批意见</label>
        <NInput
          v-model:value="approvalComment"
          type="textarea"
          placeholder="请输入审批意见（可选）"
          :rows="3"
        />
      </div>
    </div>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showApprovalDialog = false">取消</NButton>
        <NButton type="primary" @click="handleApprove">确认</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.approval-panel {
  margin-bottom: 12px;
}

.current-status {
  display: flex;
  align-items: center;
}

.approval-actions {
  margin-bottom: 12px;
}

.empty-state {
  padding: 16px 0;
}

.timeline-content {
  padding-bottom: 8px;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.approver {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.timeline-comment {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  background: #fafafa;
  padding: 6px 8px;
  border-radius: 4px;
}

.timeline-time {
  font-size: 11px;
  color: #999;
}

.approval-form {
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
