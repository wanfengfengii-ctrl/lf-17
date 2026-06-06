<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { usePatternStore } from '@/stores/pattern'
import type { PlacedPattern, PatternTemplate } from '@/types/pattern'
import { checkPatternOutOfBounds } from '@/utils/patternUtils'

const store = usePatternStore()

const containerRef = ref<HTMLElement | null>(null)
const stageSize = ref({ width: 800, height: 600 })
const isDraggingStage = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const dragStartOffset = ref({ x: 0, y: 0 })

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

function handlePatternDragStart(_e: any, placedId: string) {
  store.selectPattern(placedId)
}

function handlePatternDragMove(e: any, placedId: string) {
  const node = e.target
  store.updatePlacedPattern(placedId, {
    x: node.x(),
    y: node.y()
  })
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
      store.removePlacedPattern(store.selectedPatternId)
      break
    case 'd':
    case 'D':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const newPattern = store.duplicatePlacedPattern(store.selectedPatternId)
        if (newPattern) {
          store.selectPattern(newPattern.id)
        }
      }
      break
    case 'r':
    case 'R':
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        const pattern = store.placedPatterns.find(p => p.id === store.selectedPatternId)
        if (pattern) {
          store.updatePlacedPattern(store.selectedPatternId, {
            rotation: pattern.rotation + (e.shiftKey ? -15 : 15)
          })
        }
      }
      break
  }
}

function moveSelected(dx: number, dy: number) {
  if (!store.selectedPatternId) return
  const pattern = store.placedPatterns.find(p => p.id === store.selectedPatternId)
  if (pattern) {
    store.updatePlacedPattern(store.selectedPatternId, {
      x: pattern.x + dx,
      y: pattern.y + dy
    })
  }
}

function handleClick(e: any) {
  if (e.target.attrs.name === 'sheetRect') {
    store.selectPattern(null)
  }
}

function handleStageClick(e: any) {
  if (e.target === e.target.getStage()) {
    store.selectPattern(null)
  }
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
              @click="store.selectPattern(placed.id)"
            />
            <v-rect
              v-else-if="getTemplate(placed.templateId)!.type === 'rectangle'"
              :config="getRectConfig(getTemplate(placed.templateId)!, placed)"
              @dragstart="handlePatternDragStart($event, placed.id)"
              @dragmove="handlePatternDragMove($event, placed.id)"
              @click="store.selectPattern(placed.id)"
            />
            <v-line
              v-else-if="getTemplate(placed.templateId)!.type === 'custom'"
              :config="getLineConfig(getTemplate(placed.templateId)!, placed)"
              @dragstart="handlePatternDragStart($event, placed.id)"
              @dragmove="handlePatternDragMove($event, placed.id)"
              @click="store.selectPattern(placed.id)"
            />
          </template>
        </template>
      </v-layer>
    </v-stage>

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
</style>
