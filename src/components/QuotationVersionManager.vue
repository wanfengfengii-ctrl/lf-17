<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NCard,
  NButton,
  NIcon,
  NList,
  NListItem,
  NThing,
  NTag,
  NPopconfirm,
  NEmpty,
  NSpace,
  NModal,
  NInput,
  useMessage
} from 'naive-ui'
import {
  Trash,
  Eye,
  FileTray,
  Create
} from '@vicons/ionicons5'
import { useQuotationStore } from '@/stores/quotation'
import { formatCurrency, formatWeight } from '@/utils/quotationUtils'
import type { QuotationVersion } from '@/types/quotation'

const quotationStore = useQuotationStore()
const message = useMessage()

const showRenameDialog = ref(false)
const renameVersionId = ref('')
const renameInput = ref('')
const emit = defineEmits(['preview'])

const sortedVersions = computed(() => {
  return [...quotationStore.quotationVersions].sort(
    (a, b) => b.createdAt - a.createdAt
  )
})

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function handleLoadVersion(versionId: string) {
  const success = quotationStore.loadQuotationVersion(versionId)
  if (success) {
    message.success('报价版本已加载')
  }
}

function handleDeleteVersion(versionId: string) {
  quotationStore.deleteQuotationVersion(versionId)
  message.success('报价版本已删除')
}

function openRenameDialog(version: QuotationVersion) {
  renameVersionId.value = version.id
  renameInput.value = version.versionName
  showRenameDialog.value = true
}

function handleRename() {
  if (!renameInput.value.trim()) {
    message.error('请输入版本名称')
    return
  }
  quotationStore.updateQuotationVersionName(
    renameVersionId.value,
    renameInput.value.trim()
  )
  message.success('版本名称已更新')
  showRenameDialog.value = false
}

function handlePreview(version: QuotationVersion) {
  emit('preview', version)
}

function handleCreateWorkOrder(versionId: string) {
  const result = quotationStore.createWorkOrder(versionId, 'draft')
  if (result) {
    message.success(`工单已创建：${result.orderNo}`)
  }
}
</script>

<template>
  <NCard title="报价版本" size="small" :bordered="false" class="version-card">
    <div v-if="sortedVersions.length === 0" class="empty-state">
      <NEmpty description="暂无保存的报价版本" size="small" />
    </div>

    <NList v-else hoverable size="small">
      <NListItem
        v-for="version in sortedVersions"
        :key="version.id"
        class="version-item"
        :class="{ active: quotationStore.currentVersionId === version.id }"
        @click="handleLoadVersion(version.id)"
      >
        <NThing>
          <template #header>
            <div class="version-header">
              <span class="version-name">{{ version.versionName }}</span>
              <NTag
                v-if="quotationStore.currentVersionId === version.id"
                size="small"
                type="success"
              >
                当前
              </NTag>
            </div>
          </template>
          <template #description>
            <div class="version-info">
              <span>{{ version.quantity }} 件</span>
              <span>{{ formatWeight(version.breakdown.silverWeight) }}</span>
              <span>{{ formatDate(version.updatedAt) }}</span>
            </div>
            <div class="version-price">
              <span class="price-label">报价</span>
              <span class="price-value">
                {{ formatCurrency(version.breakdown.totalPrice) }}
              </span>
            </div>
          </template>
          <template #action>
            <NSpace size="small">
              <NButton size="tiny" type="info" ghost @click.stop="handlePreview(version)">
                <template #icon>
                  <NIcon><Eye /></NIcon>
                </template>
              </NButton>
              <NButton size="tiny" type="primary" ghost @click.stop="openRenameDialog(version)">
                <template #icon>
                  <NIcon><Create /></NIcon>
                </template>
              </NButton>
              <NButton size="tiny" type="warning" ghost @click.stop="handleCreateWorkOrder(version.id)">
                <template #icon>
                  <NIcon><FileTray /></NIcon>
                </template>
              </NButton>
              <NPopconfirm
                positive-text="删除"
                negative-text="取消"
                type="error"
                @positive-click="handleDeleteVersion(version.id)"
              >
                <template #trigger>
                  <NButton size="tiny" type="error" ghost @click.stop>
                    <template #icon>
                      <NIcon><Trash /></NIcon>
                    </template>
                  </NButton>
                </template>
                确定要删除这个报价版本吗？
              </NPopconfirm>
            </NSpace>
          </template>
        </NThing>
      </NListItem>
    </NList>
  </NCard>

  <NModal
    :show="showRenameDialog"
    preset="card"
    title="重命名版本"
    style="width: 360px"
    @update:show="v => showRenameDialog = v"
  >
    <NInput
      v-model:value="renameInput"
      placeholder="请输入版本名称"
      maxlength="50"
    />
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showRenameDialog = false">取消</NButton>
        <NButton type="primary" @click="handleRename">确定</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.version-card {
  margin-bottom: 12px;
}

.empty-state {
  padding: 16px 0;
}

.version-item {
  padding: 8px 12px !important;
  cursor: pointer;
}

.version-item.active {
  background-color: #fff7e6;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-name {
  font-weight: 500;
  font-size: 14px;
}

.version-info {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.version-price {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-label {
  font-size: 11px;
  color: #999;
}

.price-value {
  font-size: 14px;
  font-weight: 600;
  color: #d46b08;
}
</style>
