<script setup lang="ts">
import { computed } from 'vue'
import {
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NProgress,
  NAlert,
  NTag,
  NSpace,
  NInputNumber,
  NForm,
  NFormItem
} from 'naive-ui'
import { usePatternStore } from '@/stores/pattern'

const store = usePatternStore()

const utilizationColor = computed(() => {
  const u = store.utilization
  if (u >= 80) return 'success'
  if (u >= 50) return 'info'
  if (u >= 30) return 'warning'
  return 'error'
})

const utilizationBarColor = computed(() => {
  const u = store.utilization
  if (u >= 80) return '#18a058'
  if (u >= 50) return '#2080f0'
  if (u >= 30) return '#f0a020'
  return '#e85a3a'
})

const remainingArea = computed(() => {
  return Math.max(0, store.sheetArea - store.usedArea)
})
</script>

<template>
  <NCard title="材料信息" size="small" :bordered="false" class="info-card">
    <NForm label-placement="left" label-width="80px" size="small">
      <NFormItem label="银片宽度">
        <NInputNumber
          :value="store.silverSheet.width"
          :min="1"
          :max="1000"
          @update:value="v => v != null && store.setSilverSheet(v, store.silverSheet.height)"
          style="width: 100%"
        />
      </NFormItem>
      <NFormItem label="银片高度">
        <NInputNumber
          :value="store.silverSheet.height"
          :min="1"
          :max="1000"
          @update:value="v => v != null && store.setSilverSheet(store.silverSheet.width, v)"
          style="width: 100%"
        />
      </NFormItem>
    </NForm>

    <NDescriptions :column="1" size="small" class="stats-desc">
      <NDescriptionsItem label="银片面积">
        {{ store.sheetArea.toFixed(1) }} mm²
      </NDescriptionsItem>
      <NDescriptionsItem label="已用面积">
        {{ store.usedArea.toFixed(1) }} mm²
      </NDescriptionsItem>
      <NDescriptionsItem label="剩余面积">
        {{ remainingArea.toFixed(1) }} mm²
      </NDescriptionsItem>
      <NDescriptionsItem label="纹样数量">
        {{ store.placedPatterns.length }} 个
      </NDescriptionsItem>
    </NDescriptions>

    <div class="utilization-section">
      <div class="utilization-label">
        <span>材料利用率</span>
        <NTag :type="utilizationColor" size="small">
          {{ store.utilization.toFixed(2) }}%
        </NTag>
      </div>
      <NProgress
        :percentage="store.utilization"
        :color="utilizationBarColor"
        :stroke-width="10"
        :show-indicator="false"
      />
    </div>

    <div v-if="store.hasIssues" class="warnings-section">
      <NAlert
        type="warning"
        :show-icon="true"
        :title="'检测到 ' + (store.outOfBoundsPatterns.length + store.overlappingPatternPairs.length) + ' 个问题'"
      >
        <NSpace vertical size="small" class="warning-list">
          <div v-if="store.outOfBoundsPatterns.length > 0">
            <NTag size="small" type="error">越界</NTag>
            <span class="warning-text">
              {{ store.outOfBoundsPatterns.length }} 个纹样超出银片边界
            </span>
          </div>
          <div v-if="store.overlappingPatternPairs.length > 0">
            <NTag size="small" type="warning">重叠</NTag>
            <span class="warning-text">
              {{ store.overlappingPatternPairs.length }} 对纹样发生重叠
            </span>
          </div>
        </NSpace>
      </NAlert>
    </div>
  </NCard>
</template>

<style scoped>
.info-card {
  margin-bottom: 12px;
}

.stats-desc {
  margin: 12px 0;
}

.utilization-section {
  margin-top: 12px;
}

.utilization-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #666;
}

.warnings-section {
  margin-top: 12px;
}

.warning-list {
  font-size: 12px;
}

.warning-text {
  margin-left: 8px;
  color: #666;
}
</style>
