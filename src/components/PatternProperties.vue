<script setup lang="ts">
import { computed } from 'vue'
import {
  NCard,
  NForm,
  NFormItem,
  NInputNumber,
  NButton,
  NSpace,
  NIcon,
  NPopconfirm,
  NAlert,
  useMessage
} from 'naive-ui'
import { Duplicate, Trash, Reload } from '@vicons/ionicons5'
import { usePatternStore } from '@/stores/pattern'
import { calculatePatternArea } from '@/utils/patternUtils'

const store = usePatternStore()
const message = useMessage()

const selectedPattern = computed(() => {
  if (!store.selectedPatternId) return null
  return store.placedPatterns.find(p => p.id === store.selectedPatternId)
})

const selectedTemplate = computed(() => {
  if (!selectedPattern.value) return null
  return store.patternTemplates.find(t => t.id === selectedPattern.value!.templateId)
})

const patternArea = computed(() => {
  if (!selectedTemplate.value || !selectedPattern.value) return 0
  return (
    calculatePatternArea(selectedTemplate.value) *
    Math.abs(selectedPattern.value.scaleX * selectedPattern.value.scaleY)
  )
})

const hasIssue = computed(() => {
  if (!store.selectedPatternId) return false
  return (
    store.outOfBoundsPatterns.includes(store.selectedPatternId) ||
    store.overlappingPatternPairs.some(pair => pair.includes(store.selectedPatternId!))
  )
})

const issueText = computed(() => {
  if (!store.selectedPatternId) return ''
  const isOutOfBounds = store.outOfBoundsPatterns.includes(store.selectedPatternId)
  const isOverlapping = store.overlappingPatternPairs.some(pair => pair.includes(store.selectedPatternId!))
  if (isOutOfBounds && isOverlapping) return '纹样越界且与其他纹样重叠'
  if (isOutOfBounds) return '纹样超出银片边界'
  if (isOverlapping) return '纹样与其他纹样重叠'
  return ''
})

function handleDuplicate() {
  if (!store.selectedPatternId) return
  const newPattern = store.duplicatePlacedPattern(store.selectedPatternId)
  if (newPattern) {
    store.selectPattern(newPattern.id)
    message.success('纹样已复制')
  } else {
    message.warning('无法复制，周围没有足够空间')
  }
}

function handleDelete() {
  if (!store.selectedPatternId) return
  store.removePlacedPattern(store.selectedPatternId)
  message.success('纹样已删除')
}

function handleRotate(deg: number) {
  if (!store.selectedPatternId || !selectedPattern.value) return
  const result = store.updatePlacedPattern(store.selectedPatternId, {
    rotation: selectedPattern.value.rotation + deg
  })
  if (!result.valid) {
    if (result.reason === 'outOfBounds') {
      message.warning('旋转后超出银片边界，已阻止')
    } else if (result.reason === 'overlapping') {
      message.warning('旋转后与其他纹样重叠，已阻止')
    }
  }
}

function handleScaleXChange(value: number | null) {
  if (!store.selectedPatternId || value == null) return
  const result = store.updatePlacedPattern(store.selectedPatternId, { scaleX: value })
  if (!result.valid) {
    if (result.reason === 'outOfBounds') {
      message.warning('缩放后超出银片边界，已阻止')
    } else if (result.reason === 'overlapping') {
      message.warning('缩放后与其他纹样重叠，已阻止')
    }
  }
}

function handleScaleYChange(value: number | null) {
  if (!store.selectedPatternId || value == null) return
  const result = store.updatePlacedPattern(store.selectedPatternId, { scaleY: value })
  if (!result.valid) {
    if (result.reason === 'outOfBounds') {
      message.warning('缩放后超出银片边界，已阻止')
    } else if (result.reason === 'overlapping') {
      message.warning('缩放后与其他纹样重叠，已阻止')
    }
  }
}

function handleXChange(value: number | null) {
  if (!store.selectedPatternId || value == null) return
  const result = store.updatePlacedPattern(store.selectedPatternId, { x: value })
  if (!result.valid) {
    if (result.reason === 'outOfBounds') {
      message.warning('移动后超出银片边界，已阻止')
    } else if (result.reason === 'overlapping') {
      message.warning('移动后与其他纹样重叠，已阻止')
    }
  }
}

function handleYChange(value: number | null) {
  if (!store.selectedPatternId || value == null) return
  const result = store.updatePlacedPattern(store.selectedPatternId, { y: value })
  if (!result.valid) {
    if (result.reason === 'outOfBounds') {
      message.warning('移动后超出银片边界，已阻止')
    } else if (result.reason === 'overlapping') {
      message.warning('移动后与其他纹样重叠，已阻止')
    }
  }
}

function handleRotationChange(value: number | null) {
  if (!store.selectedPatternId || value == null) return
  const result = store.updatePlacedPattern(store.selectedPatternId, { rotation: value })
  if (!result.valid) {
    if (result.reason === 'outOfBounds') {
      message.warning('旋转后超出银片边界，已阻止')
    } else if (result.reason === 'overlapping') {
      message.warning('旋转后与其他纹样重叠，已阻止')
    }
  }
}
</script>

<template>
  <NCard
    v-if="selectedPattern && selectedTemplate"
    title="纹样属性"
    size="small"
    :bordered="false"
    class="property-card"
  >
    <div class="pattern-title">
      <div
        class="color-dot"
        :style="{ backgroundColor: selectedTemplate.fill }"
      ></div>
      <span class="pattern-name">{{ selectedTemplate.name }}</span>
    </div>

    <div v-if="hasIssue" style="margin-bottom: 12px;">
      <NAlert type="warning" :show-icon="true" size="small">
        {{ issueText }}
      </NAlert>
    </div>

    <NForm label-placement="left" label-width="70px" size="small" class="property-form">
      <NFormItem label="X 坐标">
        <NInputNumber
          :value="selectedPattern.x"
          :step="1"
          style="width: 100%"
          @update:value="handleXChange"
        />
      </NFormItem>
      <NFormItem label="Y 坐标">
        <NInputNumber
          :value="selectedPattern.y"
          :step="1"
          style="width: 100%"
          @update:value="handleYChange"
        />
      </NFormItem>
      <NFormItem label="旋转角度">
        <NInputNumber
          :value="selectedPattern.rotation"
          :step="15"
          :min="-360"
          :max="360"
          style="width: 100%"
          @update:value="handleRotationChange"
        />
      </NFormItem>
      <NFormItem label="水平缩放">
        <NInputNumber
          :value="selectedPattern.scaleX"
          :step="0.1"
          :min="0.1"
          :max="5"
          style="width: 100%"
          @update:value="handleScaleXChange"
        />
      </NFormItem>
      <NFormItem label="垂直缩放">
        <NInputNumber
          :value="selectedPattern.scaleY"
          :step="0.1"
          :min="0.1"
          :max="5"
          style="width: 100%"
          @update:value="handleScaleYChange"
        />
      </NFormItem>
    </NForm>

    <div class="area-info">
      <span class="area-label">面积：</span>
      <span class="area-value">{{ patternArea.toFixed(2) }} mm²</span>
    </div>

    <NSpace class="action-buttons">
      <NButton size="small" block @click="handleRotate(-45)">
        <template #icon>
          <NIcon><Reload style="transform: scaleX(-1)" /></NIcon>
        </template>
        -45°
      </NButton>
      <NButton size="small" block @click="handleRotate(45)">
        <template #icon>
          <NIcon><Reload /></NIcon>
        </template>
        +45°
      </NButton>
    </NSpace>

    <NSpace class="action-buttons" style="margin-top: 8px;">
      <NButton size="small" type="primary" ghost block @click="handleDuplicate">
        <template #icon>
          <NIcon><Duplicate /></NIcon>
        </template>
        复制
      </NButton>
      <NPopconfirm
        positive-text="删除"
        negative-text="取消"
        type="error"
        @positive-click="handleDelete"
      >
        <template #trigger>
          <NButton size="small" type="error" ghost block>
            <template #icon>
              <NIcon><Trash /></NIcon>
            </template>
            删除
          </NButton>
        </template>
        确定要删除这个纹样吗？
      </NPopconfirm>
    </NSpace>
  </NCard>

  <NCard
    v-else
    title="纹样属性"
    size="small"
    :bordered="false"
    class="property-card empty"
  >
    <div class="empty-tip">点击选中画布中的纹样以查看属性</div>
  </NCard>
</template>

<style scoped>
.property-card {
  margin-bottom: 12px;
}

.property-card.empty {
  color: #999;
}

.pattern-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #ddd;
}

.pattern-name {
  font-weight: 500;
  font-size: 14px;
}

.property-form {
  margin-top: 8px;
}

.area-info {
  margin-top: 12px;
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
}

.area-label {
  color: #666;
}

.area-value {
  font-weight: 500;
  color: #333;
}

.action-buttons {
  margin-top: 12px;
}

.empty-tip {
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
  color: #999;
}
</style>
