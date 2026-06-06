<script setup lang="ts">
import { ref } from 'vue'
import {
  NCard,
  NButton,
  NList,
  NListItem,
  NThing,
  NIcon,
  NPopconfirm,
  useMessage,
  NSpace,
  NTag,
  NInputNumber,
  NModal
} from 'naive-ui'
import { Add, Trash, Duplicate } from '@vicons/ionicons5'
import { usePatternStore } from '@/stores/pattern'
import { calculatePatternArea } from '@/utils/patternUtils'
import AddPatternDialog from './AddPatternDialog.vue'

const store = usePatternStore()
const message = useMessage()

const showAddDialog = ref(false)
const showDeleteConfirm = ref<string | null>(null)
const showBatchDialog = ref(false)
const batchTemplateId = ref('')
const batchCount = ref(5)

function handleAddToCanvas(templateId: string) {
  const x = store.silverSheet.width / 2
  const y = store.silverSheet.height / 2
  const placed = store.placePattern(templateId, x, y)
  if (placed) {
    store.selectPattern(placed.id)
    message.success('纹样已添加到画布')
  } else {
    message.warning('无法放置纹样，可能超出银片边界')
  }
}

function openBatchDialog(templateId: string) {
  batchTemplateId.value = templateId
  batchCount.value = 5
  showBatchDialog.value = true
}

function handleBatchPlace() {
  if (batchCount.value <= 0) {
    message.error('数量必须大于 0')
    return
  }
  const results = store.placePatternBatch(batchTemplateId.value, batchCount.value)
  if (results.length > 0) {
    message.success(`成功放置 ${results.length} 个纹样${results.length < batchCount.value ? '（空间不足，部分未放置）' : ''}`)
    if (results.length > 0) {
      store.selectPattern(results[results.length - 1].id)
    }
  } else {
    message.warning('无法放置纹样，银片空间不足')
  }
  showBatchDialog.value = false
}

function handleDeleteTemplate(templateId: string, event: Event) {
  event.stopPropagation()
  const count = store.getPatternCount(templateId)
  if (count > 0) {
    showDeleteConfirm.value = templateId
  } else {
    store.deletePatternTemplate(templateId)
    message.success('纹样已删除')
  }
}

function handleForceDelete(templateId: string) {
  store.forceDeletePatternTemplate(templateId)
  showDeleteConfirm.value = null
  message.success('纹样及其实例已删除')
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    circle: '圆形',
    rectangle: '矩形',
    custom: '自定义'
  }
  return map[type] || type
}
</script>

<template>
  <NCard title="纹样清单" size="small" :bordered="false" class="pattern-list-card">
    <template #header-extra>
      <NButton size="small" type="primary" @click="showAddDialog = true">
        <template #icon>
          <NIcon><Add /></NIcon>
        </template>
        新建
      </NButton>
    </template>

    <div v-if="store.patternTemplates.length === 0" class="empty-tip">
      暂无纹样，点击上方按钮创建
    </div>

    <NList v-else hoverable clickable>
      <NListItem
        v-for="template in store.patternTemplates"
        :key="template.id"
        class="pattern-item"
      >
        <NThing>
          <template #header>
            <div class="pattern-header">
              <span class="pattern-name">{{ template.name }}</span>
              <NTag size="small" type="info">{{ getTypeLabel(template.type) }}</NTag>
            </div>
          </template>
          <template #description>
            <div class="pattern-info">
              <span>面积: {{ calculatePatternArea(template).toFixed(1) }} mm²</span>
              <span>使用中: {{ store.getPatternCount(template.id) }} 个</span>
            </div>
          </template>
          <template #avatar>
            <div
              class="pattern-preview"
              :style="{
                backgroundColor: template.fill,
                borderColor: template.stroke,
                borderWidth: template.strokeWidth + 'px',
                borderRadius: template.type === 'circle' ? '50%' : '4px'
              }"
            ></div>
          </template>
          <template #action>
            <NSpace size="small">
              <NButton
                size="tiny"
                type="primary"
                ghost
                @click.stop="handleAddToCanvas(template.id)"
                title="添加一个"
              >
                <template #icon>
                  <NIcon><Duplicate /></NIcon>
                </template>
              </NButton>
              <NButton
                size="tiny"
                type="info"
                ghost
                @click.stop="openBatchDialog(template.id)"
                title="批量投放"
              >
                批量
              </NButton>
              <NPopconfirm
                v-if="showDeleteConfirm === template.id"
                :show-icon="true"
                positive-text="强制删除"
                negative-text="取消"
                type="error"
                @positive-click="handleForceDelete(template.id)"
                @negative-click="showDeleteConfirm = null"
              >
                <template #trigger>
                  <NButton size="tiny" type="error" ghost>
                    <template #icon>
                      <NIcon><Trash /></NIcon>
                    </template>
                  </NButton>
                </template>
                该纹样正在画布中使用（{{ store.getPatternCount(template.id) }}个实例），确定要删除吗？
              </NPopconfirm>
              <NButton
                v-else
                size="tiny"
                type="error"
                ghost
                @click.stop="handleDeleteTemplate(template.id, $event)"
              >
                <template #icon>
                  <NIcon><Trash /></NIcon>
                </template>
              </NButton>
            </NSpace>
          </template>
        </NThing>
      </NListItem>
    </NList>
  </NCard>

  <AddPatternDialog v-model:show="showAddDialog" />

  <NModal
    :show="showBatchDialog"
    preset="card"
    title="批量投放纹样"
    style="width: 360px"
    @update:show="v => showBatchDialog = v"
  >
    <div style="font-size: 13px; color: #666; margin-bottom: 16px;">
      系统将自动在银片上排列指定数量的纹样，自动避免重叠和越界。
    </div>
    <div class="batch-form">
      <span class="batch-label">投放数量：</span>
      <NInputNumber
        v-model:value="batchCount"
        :min="1"
        :max="200"
        :step="1"
        style="width: 120px"
      />
    </div>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showBatchDialog = false">取消</NButton>
        <NButton type="primary" @click="handleBatchPlace">投放</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.pattern-list-card {
  margin-bottom: 12px;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 24px 0;
  font-size: 13px;
}

.pattern-item {
  padding: 8px 12px !important;
}

.pattern-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pattern-name {
  font-weight: 500;
  font-size: 14px;
}

.pattern-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #666;
}

.pattern-preview {
  width: 36px;
  height: 36px;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
}

.batch-form {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-label {
  font-size: 14px;
  color: #333;
  min-width: 70px;
}
</style>
