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
  NUpload,
  NUploadDragger,
  NText,
  useMessage
} from 'naive-ui'
import { CloudUploadOutline } from '@vicons/ionicons5'
import { usePatternStore } from '@/stores/pattern'
import type { PatternType } from '@/types/pattern'

type DialogPatternType = PatternType | 'svg'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const store = usePatternStore()
const message = useMessage()

const patternType = ref<DialogPatternType>('circle')
const name = ref('')
const radius = ref(20)
const width = ref(30)
const height = ref(20)
const fillColor = ref('#CD853F')
const strokeColor = ref('#8B4513')
const strokeWidth = ref(2)
const svgFile = ref<File | null>(null)
const svgPreview = ref('')

const patternTypeOptions = [
  { label: '圆形', value: 'circle' as DialogPatternType },
  { label: '矩形', value: 'rectangle' as DialogPatternType },
  { label: '自定义轮廓（手绘）', value: 'custom' as DialogPatternType },
  { label: '导入 SVG', value: 'svg' as DialogPatternType }
]

const formValid = computed(() => {
  if (!name.value.trim()) return false
  if (patternType.value === 'circle' && radius.value <= 0) return false
  if (patternType.value === 'rectangle' && (width.value <= 0 || height.value <= 0)) return false
  if (patternType.value === 'svg' && !svgFile.value) return false
  return true
})

function handleShowChange(value: boolean) {
  emit('update:show', value)
}

function handleSvgUpload(options: any) {
  const file = options.file.file
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.svg')) {
    message.error('请上传 SVG 格式的文件')
    return
  }

  svgFile.value = file
  svgPreview.value = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    if (content) {
      svgPreview.value = content
    }
  }
  reader.readAsText(file)

  if (!name.value.trim()) {
    name.value = file.name.replace(/\.svg$/i, '')
  }
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

  if (patternType.value === 'svg' && svgFile.value && svgPreview.value) {
    const result = store.importSvgTemplate(
      name.value.trim(),
      svgPreview.value,
      fillColor.value,
      strokeColor.value,
      strokeWidth.value
    )
    if (result) {
      message.success('SVG 纹样导入成功')
      resetForm()
      emit('update:show', false)
    } else {
      message.error('SVG 文件解析失败，请确保文件包含有效的轮廓')
    }
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
  svgFile.value = null
  svgPreview.value = ''
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
    style="width: 460px"
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

      <NFormItem v-if="patternType === 'svg'" label="SVG 文件" required>
        <NUpload
          :show-file-list="false"
          accept=".svg"
          @before-upload="handleSvgUpload"
        >
          <NUploadDragger>
            <div style="text-align: center; padding: 12px 0;">
              <NText style="font-size: 24px; display: inline-block;">
                <component :is="CloudUploadOutline" style="font-size: 28px; color: #666;" />
              </NText>
              <div style="margin-top: 8px; font-size: 13px; color: #666;">
                {{ svgFile ? svgFile.name : '点击或拖拽上传 SVG 文件' }}
              </div>
              <div style="margin-top: 4px; font-size: 12px; color: #999;">
                支持 polygon、path、rect、circle 等轮廓
              </div>
            </div>
          </NUploadDragger>
        </NUpload>
      </NFormItem>

      <NFormItem v-if="patternType !== 'svg'" label="填充颜色">
        <NColorPicker v-model:value="fillColor" :show-alpha="false" />
      </NFormItem>

      <NFormItem v-if="patternType !== 'svg'" label="边框颜色">
        <NColorPicker v-model:value="strokeColor" :show-alpha="false" />
      </NFormItem>

      <NFormItem v-if="patternType !== 'svg'" label="边框宽度">
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
          {{ patternType === 'custom' ? '开始绘制' : patternType === 'svg' ? '导入' : '创建' }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
