<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NColorPicker,
  NButton,
  NSpace,
  useMessage
} from 'naive-ui'
import { usePatternStore } from '@/stores/pattern'
import type { PatternType } from '@/types/pattern'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const store = usePatternStore()
const message = useMessage()

const patternType = ref<PatternType>('circle')
const name = ref('')
const radius = ref(20)
const width = ref(30)
const height = ref(20)
const fillColor = ref('#CD853F')
const strokeColor = ref('#8B4513')
const strokeWidth = ref(2)

const patternTypeOptions = [
  { label: '圆形', value: 'circle' },
  { label: '矩形', value: 'rectangle' },
  { label: '自定义轮廓（手绘）', value: 'custom' }
]

const formValid = computed(() => {
  if (!name.value.trim()) return false
  if (patternType.value === 'circle' && radius.value <= 0) return false
  if (patternType.value === 'rectangle' && (width.value <= 0 || height.value <= 0)) return false
  return true
})

function handleShowChange(value: boolean) {
  emit('update:show', value)
}

function handleConfirm() {
  if (!formValid.value) {
    message.error('请填写完整信息，尺寸必须大于0')
    return
  }

  if (patternType.value === 'custom') {
    store.startDrawing(
      name.value.trim(),
      fillColor.value,
      strokeColor.value,
      strokeWidth.value
    )
    resetForm()
    emit('update:show', false)
    message.info('请在画布上点击绘制轮廓，双击或按回车完成')
    return
  }

  let template: any = {
    name: name.value.trim(),
    type: patternType.value,
    fill: fillColor.value,
    stroke: strokeColor.value,
    strokeWidth: strokeWidth.value
  }

  if (patternType.value === 'circle') {
    template.radius = radius.value
  } else if (patternType.value === 'rectangle') {
    template.width = width.value
    template.height = height.value
  }

  store.addPatternTemplate(template)
  message.success('纹样创建成功')
  resetForm()
  emit('update:show', false)
}

function handleCancel() {
  resetForm()
  emit('update:show', false)
}

function resetForm() {
  name.value = ''
  patternType.value = 'circle'
  radius.value = 20
  width.value = 30
  height.value = 20
  fillColor.value = '#CD853F'
  strokeColor.value = '#8B4513'
  strokeWidth.value = 2
}

watch(() => props.show, (val) => {
  if (val) {
    resetForm()
  }
})
</script>

<template>
  <NModal
    :show="show"
    :mask-closable="false"
    preset="card"
    title="新建纹样"
    style="width: 420px"
    @update:show="handleShowChange"
  >
    <NForm label-placement="left" label-width="100px">
      <NFormItem label="纹样名称" required>
        <NInput v-model:value="name" placeholder="请输入纹样名称" maxlength="20" />
      </NFormItem>

      <NFormItem label="纹样类型" required>
        <NSelect
          v-model:value="patternType"
          :options="patternTypeOptions"
        />
      </NFormItem>

      <NFormItem v-if="patternType === 'circle'" label="半径(mm)" required>
        <NInputNumber
          v-model:value="radius"
          :min="0.1"
          :max="500"
          :step="1"
          style="width: 100%"
        />
      </NFormItem>

      <template v-if="patternType === 'rectangle'">
        <NFormItem label="宽度(mm)" required>
          <NInputNumber
            v-model:value="width"
            :min="0.1"
            :max="500"
            :step="1"
            style="width: 100%"
          />
        </NFormItem>
        <NFormItem label="高度(mm)" required>
          <NInputNumber
            v-model:value="height"
            :min="0.1"
            :max="500"
            :step="1"
            style="width: 100%"
          />
        </NFormItem>
      </template>

      <NFormItem v-if="patternType === 'custom'" label="说明">
        <div style="font-size: 13px; color: #666; line-height: 1.6;">
          点击"开始绘制"后，在画布上依次点击添加顶点<br/>
          · 单击添加顶点<br/>
          · 双击或按回车完成绘制<br/>
          · 按 ESC 取消，按退格撤销上一点
        </div>
      </NFormItem>

      <NFormItem label="填充颜色">
        <NColorPicker v-model:value="fillColor" :show-alpha="false" />
      </NFormItem>

      <NFormItem label="边框颜色">
        <NColorPicker v-model:value="strokeColor" :show-alpha="false" />
      </NFormItem>

      <NFormItem label="边框宽度">
        <NInputNumber
          v-model:value="strokeWidth"
          :min="0"
          :max="10"
          :step="0.5"
          style="width: 100%"
        />
      </NFormItem>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleCancel">取消</NButton>
        <NButton type="primary" :disabled="!formValid" @click="handleConfirm">
          {{ patternType === 'custom' ? '开始绘制' : '创建' }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
