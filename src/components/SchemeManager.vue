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
  NInput,
  NModal,
  NSpace,
  NTag,
  useMessage,
  NEmpty
} from 'naive-ui'
import { Save, Trash, Refresh } from '@vicons/ionicons5'
import { usePatternStore } from '@/stores/pattern'

const store = usePatternStore()
const message = useMessage()

const showSaveDialog = ref(false)
const schemeName = ref('')

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
  message.success('方案保存成功')
  showSaveDialog.value = false
}

function handleLoad(id: string) {
  const success = store.loadScheme(id)
  if (success) {
    message.success('方案已加载')
  }
}

function handleDelete(id: string) {
  store.deleteScheme(id)
  message.success('方案已删除')
}
</script>

<template>
  <NCard title="拼版方案" size="small" :bordered="false" class="scheme-card">
    <template #header-extra>
      <NButton size="small" type="primary" @click="openSaveDialog">
        <template #icon>
          <NIcon><Save /></NIcon>
        </template>
        保存
      </NButton>
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
    style="width: 360px"
    @update:show="v => showSaveDialog = v"
  >
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
}
</style>
