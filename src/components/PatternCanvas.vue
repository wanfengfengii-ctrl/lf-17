<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { usePatternStore } from '@/stores/pattern'
import { useMessage, useDialog, NButton, NIcon, NSelect, NInputNumber, NSpace } from 'naive-ui'
import type { PlacedPattern, PatternTemplate, AutoArrangeAlgorithm } from '@/types/pattern'
import { checkPatternOutOfBounds } from '@/utils/patternUtils'
import { GridOutline, ShuffleOutline } from '@vicons/ionicons5'

const store = usePatternStore()
const message = useMessage()
const dialog = useDialog()

const containerRef = ref<HTMLElement | null>(null)
const stageSize = ref({ width: 800, height: 600 })
const isDraggingStage = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const dragStartOffset = ref({ x: 0, y: 0 })

const showArrangeOptions = ref(false)

const stageConfig = computed(() => ({
  width: stageSize.value.width,
  height: stageSize.value.height,
  scaleX: store.canvasScale,
  scaleY: store.canvasScale,
  x: store.canvasOffsetX,
  y: store.canvasOffsetY
}))

const silverSheetConfig = computed(() => ({
  x: 0,
  y: 0,
  width: store.silverSheet.width,
  height: store.silverSheet.height,
  fill: '#f5f5f0',
  stroke: '#8B7355',
  strokeWidth: 2 / store.canvasScale
}))

const algorithmOptions = [
  { label: '网格排列', value: 'grid' },
  { label: '行排列', value: 'row' },
  { label: '紧凑排列', value: 'compact' }
]

function getTemplate(templateId: string): PatternTemplate | undefined {
  return store.patternTemplates.find(t => t.id === templateId)
}

function isPatternSelected(placedId: string): boolean {
  return store.selectedPatternId === placedId
}

function isPatternOutOfBounds(template: PatternTemplate, placed: PlacedPattern): boolean {
  return checkPatternOutOfBounds(template, placed, store.silverSheet)
}

function isPatternOverlapping(placedId: string): boolean {
  return store.overlappingPatternPairs.some(pair => pair.includes(placedId))
}

function getStrokeColor(template: PatternTemplate, placed: PlacedPattern): string {
  if (isPatternSelected(placed.id)) return '#18a058'
  if (isPatternOutOfBounds(template, placed) || isPatternOverlapping(placed.id)) return '#e85a3a'
  return template.stroke
}

function getStrokeWidth(template: PatternTemplate, placed: PlacedPattern): number {
  if (isPatternSelected(placed.id)) {
    return 3 / store.canvasScale
  }
  return template.strokeWidth / store.canvasScale
}

function getOpacity(template: PatternTemplate, placed: PlacedPattern): number {
  return isPatternOutOfBounds(template, placed) ? 0.7 : 1
}

function getCircleConfig(template: PatternTemplate, placed: PlacedPattern) {
  return {
    x: placed.x,
    y: placed.y,
    radius: template.radius || 10,
    fill: template.fill,
    stroke: getStrokeColor(template, placed),
    strokeWidth: getStrokeWidth(template, placed),
    draggable: true,
    opacity: getOpacity(template, placed),
    rotation: placed.rotation,
    scaleX: placed.scaleX,
    scaleY: placed.scaleY
  }
}

function getRectConfig(template: PatternTemplate, placed: PlacedPattern) {
  const w = template.width || 20
  const h = template.height || 20
  return {
    x: placed.x - w / 2,
    y: placed.y - h / 2,
    width: w,
    height: h,
    fill: template.fill,
    stroke: getStrokeColor(template, placed),
    strokeWidth: getStrokeWidth(template, placed),
    draggable: true,
    opacity: getOpacity(template, placed),
    rotation: placed.rotation,
    offset: { x: 0, y: 0 },
    scaleX: placed.scaleX,
    scaleY: placed.scaleY
  }
}

function getLineConfig(template: PatternTemplate, placed: PlacedPattern) {
  const points = (template.points || []).flatMap(p => [p.x, p.y])
  return {
    x: placed.x,
    y: placed.y,
    points,
    fill: template.fill,
    stroke: getStrokeColor(template, placed),
    strokeWidth: getStrokeWidth(template, placed),
    closed: true,
    draggable: true,
    opacity: getOpacity(template, placed),
    rotation: placed.rotation,
    scaleX: placed.scaleX,
    scaleY: placed.scaleY
  }
}

const drawingLinePoints = computed(() => {
  if (store.drawingPoints.length === 0) return []
  const points = store.drawingPoints.flatMap(p => [p.x, p.y])
  if (store.drawingPoints.length > 0) {
    points.push(store.drawingPoints[0].x, store.drawingPoints[0].y)
  }
  return points
})

const drawingLineConfig = computed(() => ({
  points: drawingLinePoints.value,
  stroke: '#e85a3a',
  strokeWidth: 2 / store.canvasScale,
  dash: [5 / store.canvasScale, 5 / store.canvasScale],
  fill: 'rgba(205, 133, 63, 0.3)'
}))

function screenToStage(screenX: number, screenY: number): { x: number; y: number } {
  return {
    x: (screenX - store.canvasOffsetX) / store.canvasScale,
    y: (screenY - store.canvasOffsetY) / store.canvasScale
  }
}

function handlePatternDragStart(_e: any, placedId: string) {
  store.selectPattern(placedId)
  store.startDrag(placedId)
}

function handlePatternDragMove(e: any, placedId: string) {
  const node = e.target
  store.forceUpdatePlacedPattern(placedId, {
    x: node.x(),
    y: node.y()
  })
}

function handlePatternDragEnd(_e: any, placedId: string) {
  const result = store.endDrag(placedId)
  if (!result.valid) {
    if (result.reason === 'outOfBounds') {
      message.warning('纹样不能超出银片边界，已自动回退')
    } else if (result.reason === 'overlapping') {
      message.warning('纹样之间不能重叠，已自动回退')
    }
  }
}

function handleStageMouseDown(e: any) {
  const targetName = e.target.attrs?.name
  const isOnEmpty = e.target === e.target.getStage() || targetName === 'sheetRect'
  if (isOnEmpty) {
    store.selectPattern(null)
  }

  if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.ctrlKey)) {
    isDraggingStage.value = true
    dragStart.value = { x: e.evt.clientX, y: e.evt.clientY }
    dragStartOffset.value = { x: store.canvasOffsetX, y: store.canvasOffsetY }
    e.target.getStage().container().style.cursor = 'grabbing'
  }
}

function handleStageMouseMove(e: any) {
  if (isDraggingStage.value) {
    const dx = e.evt.clientX - dragStart.value.x
    const dy = e.evt.clientY - dragStart.value.y
    store.setCanvasOffset(
      dragStartOffset.value.x + dx,
      dragStartOffset.value.y + dy
    )
  }
}

function handleStageMouseUp(e: any) {
  if (isDraggingStage.value) {
    isDraggingStage.value = false
    if (e.target && e.target.getStage) {
      e.target.getStage().container().style.cursor = 'default'
    }
  }
}

function handleWheel(e: any) {
  e.evt.preventDefault()

  const stage = e.target.getStage()
  const oldScale = store.canvasScale
  const pointer = stage.getPointerPosition()

  if (!pointer) return

  const mousePointTo = {
    x: (pointer.x - store.canvasOffsetX) / oldScale,
    y: (pointer.y - store.canvasOffsetY) / oldScale
  }

  const scaleBy = 1.1
  let newScale = oldScale * (e.evt.deltaY > 0 ? 1 / scaleBy : scaleBy)
  newScale = Math.max(0.1, Math.min(10, newScale))

  store.setCanvasScale(newScale)
  store.setCanvasOffset(
    pointer.x - mousePointTo.x * newScale,
    pointer.y - mousePointTo.y * newScale
  )
}

function updateSize() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    stageSize.value = {
      width: rect.width,
      height: rect.height
    }
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (store.isDrawingMode) {
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        store.cancelDrawing()
        message.info('已取消绘制')
        break
      case 'Backspace':
      case 'Delete':
        e.preventDefault()
        if (store.drawingPoints.length > 0) {
          store.undoDrawingPoint()
        }
        break
      case 'Enter':
        e.preventDefault()
        if (store.drawingPoints.length >= 3) {
          const newTemplate = store.finishDrawing()
          if (newTemplate) {
            message.success('自定义纹样创建成功')
          }
        } else {
          message.warning('至少需要3个顶点才能创建纹样')
        }
        break
    }
    return
  }

  if (!store.selectedPatternId) return

  const step = e.shiftKey ? 10 : 1

  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault()
      moveSelected(-step, 0)
      break
    case 'ArrowRight':
      e.preventDefault()
      moveSelected(step, 0)
      break
    case 'ArrowUp':
      e.preventDefault()
      moveSelected(0, -step)
      break
    case 'ArrowDown':
      e.preventDefault()
      moveSelected(0, step)
      break
    case 'Delete':
    case 'Backspace':
      e.preventDefault()
      dialog.warning({
        title: '确认删除',
        content: '确定要删除选中的纹样吗？',
        positiveText: '删除',
        negativeText: '取消',
        type: 'error',
        onPositiveClick: () => {
          if (store.selectedPatternId) {
            store.removePlacedPattern(store.selectedPatternId)
            message.success('纹样已删除')
          }
        }
      })
      break
    case 'd':
    case 'D':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const newPattern = store.duplicatePlacedPattern(store.selectedPatternId)
        if (newPattern) {
          store.selectPattern(newPattern.id)
          message.success('纹样已复制')
        } else {
          message.warning('无法复制，周围没有足够空间')
        }
      }
      break
    case 'r':
    case 'R':
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        const pattern = store.placedPatterns.find(p => p.id === store.selectedPatternId)
        if (pattern) {
          const result = store.updatePlacedPattern(store.selectedPatternId, {
            rotation: pattern.rotation + (e.shiftKey ? -15 : 15)
          })
          if (!result.valid) {
            if (result.reason === 'outOfBounds') {
              message.warning('旋转后超出银片边界，已阻止')
            } else if (result.reason === 'overlapping') {
              message.warning('旋转后与其他纹样重叠，已阻止')
            }
          }
        }
      }
      break
  }
}

function moveSelected(dx: number, dy: number) {
  if (!store.selectedPatternId) return
  const pattern = store.placedPatterns.find(p => p.id === store.selectedPatternId)
  if (pattern) {
    const result = store.updatePlacedPattern(store.selectedPatternId, {
      x: pattern.x + dx,
      y: pattern.y + dy
    })
    if (!result.valid) {
      if (result.reason === 'outOfBounds') {
        message.warning('移动后超出银片边界，已阻止')
      } else if (result.reason === 'overlapping') {
        message.warning('移动后与其他纹样重叠，已阻止')
      }
    }
  }
}

function handleClick(e: any) {
  if (store.isDrawingMode) {
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (pointer) {
      const pos = screenToStage(pointer.x, pointer.y)
      if (pos.x >= 0 && pos.x <= store.silverSheet.width &&
          pos.y >= 0 && pos.y <= store.silverSheet.height) {
        store.addDrawingPoint(pos.x, pos.y)
      } else {
        message.warning('请在银片范围内绘制')
      }
    }
    return
  }
  if (e.target.attrs.name === 'sheetRect') {
    store.selectPattern(null)
  }
}

function handleStageClick(e: any) {
  if (store.isDrawingMode) {
    return
  }
  if (e.target === e.target.getStage()) {
    store.selectPattern(null)
  }
}

function handleStageDblClick(_e: any) {
  if (store.isDrawingMode && store.drawingPoints.length >= 3) {
    const newTemplate = store.finishDrawing()
    if (newTemplate) {
      message.success('自定义纹样创建成功')
    }
  }
}

function handleAutoArrange() {
  if (store.placedPatterns.length === 0) {
    message.warning('画布上没有纹样，无法自动排列')
    return
  }
  const count = store.runAutoArrange()
  message.success(`自动排列完成，成功放置 ${count} 个纹样`)
}

function handleAlgorithmChange(value: AutoArrangeAlgorithm) {
  store.setAutoArrangeOptions({ algorithm: value })
}

function handleSpacingChange(value: number | null) {
  if (value != null) {
    store.setAutoArrangeOptions({ spacing: value })
  }
}

function toggleArrangeOptions() {
  showArrangeOptions.value = !showArrangeOptions.value
}

onMounted(() => {
  updateSize()
  window.addEventListener('resize', updateSize)
  window.addEventListener('keydown', handleKeyDown)
  setTimeout(() => {
    if (containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect()
      const centerX = rect.width / 2 - (store.silverSheet.width * store.canvasScale) / 2
      const centerY = rect.height / 2 - (store.silverSheet.height * store.canvasScale) / 2
      store.setCanvasOffset(centerX, centerY)
    }
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSize)
  window.removeEventListener('keydown', handleKeyDown)
})

watch(
  () => [store.silverSheet.width, store.silverSheet.height],
  () => {
    if (containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect()
      const centerX = rect.width / 2 - (store.silverSheet.width * store.canvasScale) / 2
      const centerY = rect.height / 2 - (store.silverSheet.height * store.canvasScale) / 2
      store.setCanvasOffset(centerX, centerY)
    }
  }
)
</script>

<template>
  <div ref="containerRef" class="canvas-container">
    <v-stage
      :config="stageConfig"
      @mousedown="handleStageMouseDown"
      @mousemove="handleStageMouseMove"
      @mouseup="handleStageMouseUp"
      @mouseleave="handleStageMouseUp"
      @wheel="handleWheel"
      @click="handleStageClick"
      @dblclick="handleStageDblClick"
    >
      <v-layer>
        <v-rect
          name="sheetRect"
          :config="silverSheetConfig"
          @click="handleClick"
        />

        <template v-for="placed in store.placedPatterns" :key="placed.id">
          <template v-if="getTemplate(placed.templateId)">
            <v-circle
              v-if="getTemplate(placed.templateId)!.type === 'circle'"
              :config="getCircleConfig(getTemplate(placed.templateId)!, placed)"
              @dragstart="handlePatternDragStart($event, placed.id)"
              @dragmove="handlePatternDragMove($event, placed.id)"
              @dragend="handlePatternDragEnd($event, placed.id)"
              @click="store.selectPattern(placed.id)"
            />
            <v-rect
              v-else-if="getTemplate(placed.templateId)!.type === 'rectangle'"
              :config="getRectConfig(getTemplate(placed.templateId)!, placed)"
              @dragstart="handlePatternDragStart($event, placed.id)"
              @dragmove="handlePatternDragMove($event, placed.id)"
              @dragend="handlePatternDragEnd($event, placed.id)"
              @click="store.selectPattern(placed.id)"
            />
            <v-line
              v-else-if="getTemplate(placed.templateId)!.type === 'custom'"
              :config="getLineConfig(getTemplate(placed.templateId)!, placed)"
              @dragstart="handlePatternDragStart($event, placed.id)"
              @dragmove="handlePatternDragMove($event, placed.id)"
              @dragend="handlePatternDragEnd($event, placed.id)"
              @click="store.selectPattern(placed.id)"
            />
          </template>
        </template>

        <template v-if="store.isDrawingMode">
          <v-line
            v-if="store.drawingPoints.length > 0"
            :config="drawingLineConfig"
          />
          <template v-for="(point, index) in store.drawingPoints" :key="index">
            <v-circle
              :config="{
                x: point.x,
                y: point.y,
                radius: 4 / store.canvasScale,
                fill: '#fff',
                stroke: '#e85a3a',
                strokeWidth: 2 / store.canvasScale
              }"
            />
          </template>
        </template>
      </v-layer>
    </v-stage>

    <div v-if="store.isDrawingMode" class="drawing-bar">
      <div class="drawing-info">
        <span class="drawing-title">绘制自定义轮廓</span>
        <span class="drawing-hint">点击添加顶点 · 双击/回车完成 · ESC取消 · 退格撤销</span>
        <span class="drawing-count">已添加 {{ store.drawingPoints.length }} 个顶点</span>
      </div>
      <div class="drawing-actions">
        <button class="drawing-btn" @click="store.undoDrawingPoint()" :disabled="store.drawingPoints.length === 0">
          撤销
        </button>
        <button class="drawing-btn primary" @click="store.finishDrawing()" :disabled="store.drawingPoints.length < 3">
          完成
        </button>
        <button class="drawing-btn danger" @click="store.cancelDrawing()">
          取消
        </button>
      </div>
    </div>

    <div v-if="!store.isDrawingMode" class="arrange-bar">
      <div v-if="showArrangeOptions" class="arrange-options">
        <div class="arrange-option-item">
          <span class="option-label">排列算法</span>
          <NSelect
            :value="store.autoArrangeOptions.algorithm"
            :options="algorithmOptions"
            size="small"
            style="width: 120px"
            @update:value="handleAlgorithmChange"
          />
        </div>
        <div class="arrange-option-item">
          <span class="option-label">间距(mm)</span>
          <NInputNumber
            :value="store.autoArrangeOptions.spacing"
            :min="0"
            :max="50"
            :step="1"
            size="small"
            style="width: 80px"
            @update:value="handleSpacingChange"
          />
        </div>
      </div>
      <NSpace size="small">
        <NButton size="small" type="primary" @click="handleAutoArrange">
          <template #icon>
            <NIcon><ShuffleOutline /></NIcon>
          </template>
          一键排列
        </NButton>
        <NButton size="small" ghost @click="toggleArrangeOptions">
          <template #icon>
            <NIcon><GridOutline /></NIcon>
          </template>
          排列设置
        </NButton>
      </NSpace>
    </div>

    <div class="canvas-controls">
      <div class="scale-info">
        缩放: {{ (store.canvasScale * 100).toFixed(0) }}%
      </div>
      <div class="hint-text">
        滚轮缩放 · Ctrl+拖动平移
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #e8e8e0;
  background-image:
    linear-gradient(45deg, #d5d5cd 25%, transparent 25%),
    linear-gradient(-45deg, #d5d5cd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d5d5cd 75%),
    linear-gradient(-45deg, transparent 75%, #d5d5cd 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  overflow: hidden;
}

.canvas-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: right;
}

.scale-info {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: #333;
}

.hint-text {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.drawing-bar {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 10px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 100;
  border: 2px solid #e85a3a;
}

.drawing-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawing-title {
  font-weight: 600;
  color: #e85a3a;
  font-size: 14px;
}

.drawing-hint {
  font-size: 11px;
  color: #999;
}

.drawing-count {
  font-size: 12px;
  color: #666;
}

.drawing-actions {
  display: flex;
  gap: 8px;
}

.drawing-btn {
  padding: 6px 14px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.drawing-btn:hover:not(:disabled) {
  background: #f5f5f0;
  border-color: #cd853f;
}

.drawing-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.drawing-btn.primary {
  background: #e85a3a;
  color: #fff;
  border-color: #e85a3a;
}

.drawing-btn.primary:hover:not(:disabled) {
  background: #d04a2a;
}

.drawing-btn.danger {
  color: #999;
}

.drawing-btn.danger:hover:not(:disabled) {
  color: #e85a3a;
  border-color: #e85a3a;
}

.arrange-bar {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.95);
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
}

.arrange-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.arrange-option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #666;
}

.option-label {
  min-width: 60px;
}
</style>
