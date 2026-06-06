<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NCard,
  NButton,
  NList,
  NListItem,
  NThing,
  NIcon,
  NPopconfirm,
  NInput,
  NModal,
  NSpace,
  NTag,
  useMessage,
  NEmpty,
  NProgress,
  NBadge
} from 'naive-ui'
import { Save, Trash, Refresh, BarChart } from '@vicons/ionicons5'
import { usePatternStore } from '@/stores/pattern'
import { calculateUtilization as calcUtil } from '@/utils/patternUtils'
import type { LayoutScheme } from '@/types/pattern'

const store = usePatternStore()
const message = useMessage()

const showSaveDialog = ref(false)
const showCompareDialog = ref(false)
const schemeName = ref('')

const currentComparison = computed(() => {
  return store.schemeComparisonList
})

const bestScheme = computed(() => {
  if (currentComparison.value.length === 0) return null
  return currentComparison.value[0]
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

function openSaveDialog() {
  schemeName.value = `方案 ${store.schemes.length + 1}`
  showSaveDialog.value = true
}

function handleSave() {
  if (!schemeName.value.trim()) {
    message.error('请输入方案名称')
    return
  }
  store.saveScheme(schemeName.value.trim())
  message.success('方案保存成功（包含视口状态）')
  showSaveDialog.value = false
}

function handleLoad(id: string) {
  const success = store.loadScheme(id)
  if (success) {
    message.success('方案已加载（含视口状态已恢复）')
  }
}

function handleDelete(id: string) {
  store.deleteScheme(id)
  message.success('方案已删除')
}

function getUtilizationColor(utilization: number): string {
  if (utilization >= 80) return 'success'
  if (utilization >= 50) return 'info'
  if (utilization >= 30) return 'warning'
  return 'error'
}

function getUtilizationBarColor(utilization: number): string {
  if (utilization >= 80) return '#18a058'
  if (utilization >= 50) return '#2080f0'
  if (utilization >= 30) return '#f0a020'
  return '#e85a3a'
}

function getRankBadge(index: number) {
  if (index === 0) return { type: 'success', text: '🏆 最佳' }
  if (index === 1) return { type: 'warning', text: '🥈 第二' }
  if (index === 2) return { type: 'info', text: '🥉 第三' }
  return { type: 'default', text: `第 ${index + 1} 名` }
}

function calculateUtilization(scheme: LayoutScheme): number {
  return calcUtil(scheme.patterns, scheme.placedPatterns, scheme.silverSheet)
}
</script>

<template>
  <NCard title="拼版方案" size="small" :bordered="false" class="scheme-card">
    <template #header-extra>
      <NSpace size="small">
        <NButton
          size="small"
          type="info"
          ghost
          @click="showCompareDialog = true"
          :disabled="store.schemes.length < 2"
        >
          <template #icon>
            <NIcon><BarChart /></NIcon>
          </template>
          对比
        </NButton>
        <NButton size="small" type="primary" @click="openSaveDialog">
          <template #icon>
            <NIcon><Save /></NIcon>
          </template>
          保存
        </NButton>
      </NSpace>
    </template>

    <div v-if="store.schemes.length === 0" class="empty-state">
      <NEmpty description="暂无保存的方案" size="small" />
    </div>

    <NList v-else hoverable size="small">
      <NListItem
        v-for="scheme in store.schemes"
        :key="scheme.id"
        class="scheme-item"
        :class="{ active: store.currentSchemeId === scheme.id }"
        @click="handleLoad(scheme.id)"
      >
        <NThing>
          <template #header>
            <div class="scheme-header">
              <span class="scheme-name">{{ scheme.name }}</span>
              <NTag
                v-if="store.currentSchemeId === scheme.id"
                size="small"
                type="success"
              >
                当前
              </NTag>
            </div>
          </template>
          <template #description>
            <div class="scheme-info">
              <span>{{ scheme.placedPatterns.length }} 个纹样</span>
              <span>{{ scheme.silverSheet.width }}×{{ scheme.silverSheet.height }}mm</span>
              <span>{{ formatDate(scheme.createdAt) }}</span>
            </div>
            <div class="scheme-utilization">
              <span class="util-label">利用率</span>
              <div class="util-bar">
                <div
                  class="util-fill"
                  :style="{
                    width: Math.min(100, (calculateUtilization(scheme) || 0)) + '%',
                    backgroundColor: getUtilizationBarColor(calculateUtilization(scheme) || 0)
                  }"
                ></div>
              </div>
              <span class="util-value" :class="getUtilizationColor(calculateUtilization(scheme) || 0)">
                {{ (calculateUtilization(scheme) || 0).toFixed(1) }}%
              </span>
            </div>
          </template>
          <template #action>
            <NSpace size="small">
              <NButton size="tiny" type="primary" ghost @click.stop="handleLoad(scheme.id)">
                <template #icon>
                  <NIcon><Refresh /></NIcon>
                </template>
              </NButton>
              <NPopconfirm
                positive-text="删除"
                negative-text="取消"
                type="error"
                @positive-click="handleDelete(scheme.id)"
              >
                <template #trigger>
                  <NButton size="tiny" type="error" ghost @click.stop>
                    <template #icon>
                      <NIcon><Trash /></NIcon>
                    </template>
                  </NButton>
                </template>
                确定要删除这个方案吗？
              </NPopconfirm>
            </NSpace>
          </template>
        </NThing>
      </NListItem>
    </NList>
  </NCard>

  <NModal
    :show="showSaveDialog"
    preset="card"
    title="保存方案"
    style="width: 400px"
    @update:show="v => showSaveDialog = v"
  >
    <div class="save-dialog-info">
      <div class="info-item">
        <span class="info-label">银片尺寸：</span>
        <span class="info-value">{{ store.silverSheet.width }} × {{ store.silverSheet.height }} mm</span>
      </div>
      <div class="info-item">
        <span class="info-label">纹样数量：</span>
        <span class="info-value">{{ store.placedPatterns.length }} 个</span>
      </div>
      <div class="info-item">
        <span class="info-label">利用率：</span>
        <span class="info-value highlight">{{ store.utilization.toFixed(2) }}%</span>
      </div>
      <div class="info-item">
        <span class="info-label">视口状态：</span>
        <span class="info-value">缩放 {{ (store.canvasScale * 100).toFixed(0) }}% · 已保存</span>
      </div>
    </div>
    <NForm label-placement="top">
      <NFormItem label="方案名称">
        <NInput v-model:value="schemeName" placeholder="请输入方案名称" maxlength="30" />
      </NFormItem>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="showSaveDialog = false">取消</NButton>
        <NButton type="primary" @click="handleSave">保存</NButton>
      </NSpace>
    </template>
  </NModal>

  <NModal
    :show="showCompareDialog"
    preset="card"
    title="方案利用率对比"
    style="width: 560px"
    @update:show="v => showCompareDialog = v"
  >
    <div v-if="currentComparison.length < 2" class="compare-empty">
      <NEmpty description="至少需要 2 个方案才能对比" size="small" />
    </div>
    <div v-else class="compare-content">
      <div class="compare-best" v-if="bestScheme">
        <NBadge value="🏆 最优方案" :max="99" type="success">
          <div class="best-card">
            <div class="best-name">{{ bestScheme.schemeName }}</div>
            <div class="best-util">{{ bestScheme.utilization.toFixed(2) }}%</div>
            <div class="best-info">
              {{ bestScheme.patternCount }} 个纹样 · {{ bestScheme.silverSheetSize }}
            </div>
          </div>
        </NBadge>
      </div>

      <div class="compare-list">
        <div
          v-for="(item, index) in currentComparison"
          :key="item.schemeId"
          class="compare-item"
          :class="{ 'is-best': index === 0 }"
        >
          <div class="compare-rank">
            <NTag :type="getRankBadge(index).type as any" size="small">
              {{ getRankBadge(index).text }}
            </NTag>
          </div>
          <div class="compare-info">
            <div class="compare-name">{{ item.schemeName }}</div>
            <div class="compare-detail">
              {{ item.patternCount }} 个纹样 · {{ item.silverSheetSize }}
            </div>
            <NProgress
              :percentage="item.utilization"
              :color="getUtilizationBarColor(item.utilization)"
              :stroke-width="8"
              :show-indicator="false"
              style="margin-top: 6px;"
            />
          </div>
          <div class="compare-value" :class="getUtilizationColor(item.utilization)">
            {{ item.utilization.toFixed(2) }}%
          </div>
          <div class="compare-action">
            <NButton
              size="tiny"
              type="primary"
              ghost
              @click="handleLoad(item.schemeId)"
            >
              加载
            </NButton>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="showCompareDialog = false">关闭</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.scheme-card {
  margin-bottom: 12px;
}

.empty-state {
  padding: 16px 0;
}

.scheme-item {
  padding: 8px 12px !important;
  cursor: pointer;
}

.scheme-item.active {
  background-color: #e3f0ff;
}

.scheme-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scheme-name {
  font-weight: 500;
  font-size: 14px;
}

.scheme-info {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.scheme-utilization {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.util-label {
  color: #999;
  min-width: 36px;
}

.util-bar {
  flex: 1;
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
}

.util-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.util-value {
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}

.util-value.success { color: #18a058; }
.util-value.info { color: #2080f0; }
.util-value.warning { color: #f0a020; }
.util-value.error { color: #e85a3a; }

.save-dialog-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.info-label {
  color: #666;
}

.info-value {
  color: #333;
  font-weight: 500;
}

.info-value.highlight {
  color: #18a058;
  font-weight: 600;
}

.compare-empty {
  padding: 24px 0;
}

.compare-best {
  margin-bottom: 16px;
  text-align: center;
}

.best-card {
  background: linear-gradient(135deg, #f0fff4 0%, #dcfce7 100%);
  border: 2px solid #18a058;
  border-radius: 12px;
  padding: 16px 24px;
  text-align: center;
}

.best-name {
  font-size: 18px;
  font-weight: 600;
  color: #18a058;
  margin-bottom: 4px;
}

.best-util {
  font-size: 32px;
  font-weight: 700;
  color: #18a058;
  margin-bottom: 4px;
}

.best-info {
  font-size: 12px;
  color: #666;
}

.compare-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compare-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.2s;
}

.compare-item:hover {
  background: #eef2f7;
}

.compare-item.is-best {
  background: #f0fff4;
  border: 1px solid #18a058;
}

.compare-rank {
  min-width: 70px;
}

.compare-info {
  flex: 1;
  min-width: 0;
}

.compare-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.compare-detail {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.compare-value {
  font-size: 16px;
  font-weight: 600;
  min-width: 70px;
  text-align: right;
}

.compare-value.success { color: #18a058; }
.compare-value.info { color: #2080f0; }
.compare-value.warning { color: #f0a020; }
.compare-value.error { color: #e85a3a; }

.compare-action {
  min-width: 60px;
}
</style>
