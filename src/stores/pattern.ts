import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  PatternTemplate,
  PlacedPattern,
  SilverSheet,
  LayoutScheme,
  PatternType,
  Point
} from '@/types/pattern'
import {
  generateId,
  calculateUtilization,
  checkPatternOutOfBounds,
  checkPatternsOverlap,
  calculateTotalUsedArea,
  getDefaultPatternColors
} from '@/utils/patternUtils'

const STORAGE_KEY = 'silver-pattern-layout-schemes'

export const usePatternStore = defineStore('pattern', () => {
  const silverSheet = ref<SilverSheet>({
    width: 200,
    height: 150
  })

  const patternTemplates = ref<PatternTemplate[]>([])

  const placedPatterns = ref<PlacedPattern[]>([])

  const selectedPatternId = ref<string | null>(null)

  const schemes = ref<LayoutScheme[]>([])

  const currentSchemeId = ref<string | null>(null)

  const canvasScale = ref(2)
  const canvasOffsetX = ref(0)
  const canvasOffsetY = ref(0)

  const dragSnapshot = ref<PlacedPattern | null>(null)

  const isDrawingMode = ref(false)
  const drawingPoints = ref<Point[]>([])
  const drawingName = ref('')
  const drawingFill = ref('#CD853F')
  const drawingStroke = ref('#8B4513')
  const drawingStrokeWidth = ref(2)

  const sheetArea = computed(() => silverSheet.value.width * silverSheet.value.height)

  const usedArea = computed(() =>
    calculateTotalUsedArea(patternTemplates.value, placedPatterns.value)
  )

  const utilization = computed(() =>
    calculateUtilization(patternTemplates.value, placedPatterns.value, silverSheet.value)
  )

  const outOfBoundsPatterns = computed(() => {
    return placedPatterns.value.filter(placed => {
      const template = patternTemplates.value.find(t => t.id === placed.templateId)
      if (!template) return false
      return checkPatternOutOfBounds(template, placed, silverSheet.value)
    }).map(p => p.id)
  })

  const overlappingPatternPairs = computed(() => {
    const pairs: string[][] = []
    for (let i = 0; i < placedPatterns.value.length; i++) {
      for (let j = i + 1; j < placedPatterns.value.length; j++) {
        const placedA = placedPatterns.value[i]
        const placedB = placedPatterns.value[j]
        const templateA = patternTemplates.value.find(t => t.id === placedA.templateId)
        const templateB = patternTemplates.value.find(t => t.id === placedB.templateId)
        if (templateA && templateB) {
          if (checkPatternsOverlap(templateA, placedA, templateB, placedB)) {
            pairs.push([placedA.id, placedB.id])
          }
        }
      }
    }
    return pairs
  })

  const hasIssues = computed(() => {
    return outOfBoundsPatterns.value.length > 0 || overlappingPatternPairs.value.length > 0
  })

  function getPatternCount(templateId: string): number {
    return placedPatterns.value.filter(p => p.templateId === templateId).length
  }

  function setSilverSheet(width: number, height: number) {
    if (width > 0 && height > 0) {
      silverSheet.value.width = width
      silverSheet.value.height = height
    }
  }

  function addPatternTemplate(template: Omit<PatternTemplate, 'id'>) {
    const colors = getDefaultPatternColors()
    const newTemplate: PatternTemplate = {
      ...template,
      id: generateId(),
      fill: template.fill || colors.fill,
      stroke: template.stroke || colors.stroke,
      strokeWidth: template.strokeWidth || colors.strokeWidth
    }
    patternTemplates.value.push(newTemplate)
    return newTemplate
  }

  function updatePatternTemplate(id: string, updates: Partial<PatternTemplate>) {
    const index = patternTemplates.value.findIndex(t => t.id === id)
    if (index !== -1) {
      patternTemplates.value[index] = { ...patternTemplates.value[index], ...updates }
    }
  }

  function deletePatternTemplate(id: string): boolean {
    const count = getPatternCount(id)
    if (count > 0) {
      return false
    }
    patternTemplates.value = patternTemplates.value.filter(t => t.id !== id)
    return true
  }

  function forceDeletePatternTemplate(id: string) {
    placedPatterns.value = placedPatterns.value.filter(p => p.templateId !== id)
    patternTemplates.value = patternTemplates.value.filter(t => t.id !== id)
    if (selectedPatternId.value) {
      const selected = placedPatterns.value.find(p => p.id === selectedPatternId.value)
      if (!selected) {
        selectedPatternId.value = null
      }
    }
  }

  function placePattern(templateId: string, x: number, y: number): PlacedPattern | null {
    const template = patternTemplates.value.find(t => t.id === templateId)
    if (!template) return null

    const placed: PlacedPattern = {
      id: generateId(),
      templateId,
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    }

    placedPatterns.value.push(placed)
    return placed
  }

  function updatePlacedPattern(id: string, updates: Partial<PlacedPattern>) {
    const index = placedPatterns.value.findIndex(p => p.id === id)
    if (index !== -1) {
      placedPatterns.value[index] = { ...placedPatterns.value[index], ...updates }
    }
  }

  function removePlacedPattern(id: string) {
    placedPatterns.value = placedPatterns.value.filter(p => p.id !== id)
    if (selectedPatternId.value === id) {
      selectedPatternId.value = null
    }
  }

  function duplicatePlacedPattern(id: string): PlacedPattern | null {
    const original = placedPatterns.value.find(p => p.id === id)
    if (!original) return null

    const template = patternTemplates.value.find(t => t.id === original.templateId)
    if (!template) return null

    const offset = 20 / canvasScale.value
    const newPlaced: PlacedPattern = {
      ...original,
      id: generateId(),
      x: original.x + offset,
      y: original.y + offset
    }

    placedPatterns.value.push(newPlaced)
    return newPlaced
  }

  function selectPattern(id: string | null) {
    selectedPatternId.value = id
  }

  function startDrag(id: string) {
    const pattern = placedPatterns.value.find(p => p.id === id)
    if (pattern) {
      dragSnapshot.value = { ...pattern }
    }
  }

  function isPlacedPatternValid(placed: PlacedPattern): boolean {
    const template = patternTemplates.value.find(t => t.id === placed.templateId)
    if (!template) return false

    if (checkPatternOutOfBounds(template, placed, silverSheet.value)) {
      return false
    }

    for (const other of placedPatterns.value) {
      if (other.id === placed.id) continue
      const otherTemplate = patternTemplates.value.find(t => t.id === other.templateId)
      if (!otherTemplate) continue
      if (checkPatternsOverlap(template, placed, otherTemplate, other)) {
        return false
      }
    }

    return true
  }

  function endDrag(id: string): { valid: boolean; reason?: 'outOfBounds' | 'overlapping' } {
    const pattern = placedPatterns.value.find(p => p.id === id)
    if (!pattern || !dragSnapshot.value) {
      dragSnapshot.value = null
      return { valid: true }
    }

    const template = patternTemplates.value.find(t => t.id === pattern.templateId)
    if (!template) {
      dragSnapshot.value = null
      return { valid: true }
    }

    if (checkPatternOutOfBounds(template, pattern, silverSheet.value)) {
      const idx = placedPatterns.value.findIndex(p => p.id === id)
      if (idx !== -1 && dragSnapshot.value) {
        placedPatterns.value[idx] = { ...dragSnapshot.value }
      }
      dragSnapshot.value = null
      return { valid: false, reason: 'outOfBounds' }
    }

    for (const other of placedPatterns.value) {
      if (other.id === id) continue
      const otherTemplate = patternTemplates.value.find(t => t.id === other.templateId)
      if (!otherTemplate) continue
      if (checkPatternsOverlap(template, pattern, otherTemplate, other)) {
        const idx = placedPatterns.value.findIndex(p => p.id === id)
        if (idx !== -1 && dragSnapshot.value) {
          placedPatterns.value[idx] = { ...dragSnapshot.value }
        }
        dragSnapshot.value = null
        return { valid: false, reason: 'overlapping' }
      }
    }

    dragSnapshot.value = null
    return { valid: true }
  }

  function startDrawing(name: string, fill?: string, stroke?: string, strokeWidth?: number) {
    isDrawingMode.value = true
    drawingPoints.value = []
    drawingName.value = name || '自定义纹样'
    if (fill) drawingFill.value = fill
    if (stroke) drawingStroke.value = stroke
    if (strokeWidth !== undefined) drawingStrokeWidth.value = strokeWidth
  }

  function addDrawingPoint(x: number, y: number) {
    if (!isDrawingMode.value) return
    drawingPoints.value.push({ x, y })
  }

  function undoDrawingPoint() {
    if (drawingPoints.value.length > 0) {
      drawingPoints.value.pop()
    }
  }

  function cancelDrawing() {
    isDrawingMode.value = false
    drawingPoints.value = []
    drawingName.value = ''
  }

  function finishDrawing(): PatternTemplate | null {
    if (drawingPoints.value.length < 3) {
      cancelDrawing()
      return null
    }

    const centroid = calculateCentroid(drawingPoints.value)
    const centeredPoints = drawingPoints.value.map(p => ({
      x: p.x - centroid.x,
      y: p.y - centroid.y
    }))

    const newTemplate = addPatternTemplate({
      name: drawingName.value,
      type: 'custom' as PatternType,
      points: centeredPoints,
      fill: drawingFill.value,
      stroke: drawingStroke.value,
      strokeWidth: drawingStrokeWidth.value
    })

    cancelDrawing()
    return newTemplate
  }

  function calculateCentroid(points: Point[]): Point {
    let cx = 0
    let cy = 0
    for (const p of points) {
      cx += p.x
      cy += p.y
    }
    return {
      x: cx / points.length,
      y: cy / points.length
    }
  }

  function setCanvasScale(scale: number) {
    canvasScale.value = Math.max(0.1, Math.min(10, scale))
  }

  function setCanvasOffset(x: number, y: number) {
    canvasOffsetX.value = x
    canvasOffsetY.value = y
  }

  function resetCanvasView() {
    canvasScale.value = 2
    canvasOffsetX.value = 0
    canvasOffsetY.value = 0
  }

  function saveScheme(name: string) {
    const scheme: LayoutScheme = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      silverSheet: { ...silverSheet.value },
      patterns: JSON.parse(JSON.stringify(patternTemplates.value)),
      placedPatterns: JSON.parse(JSON.stringify(placedPatterns.value))
    }
    schemes.value.push(scheme)
    currentSchemeId.value = scheme.id
    saveSchemesToStorage()
    return scheme
  }

  function loadScheme(id: string) {
    const scheme = schemes.value.find(s => s.id === id)
    if (!scheme) return false

    silverSheet.value = { ...scheme.silverSheet }
    patternTemplates.value = JSON.parse(JSON.stringify(scheme.patterns))
    placedPatterns.value = JSON.parse(JSON.stringify(scheme.placedPatterns))
    selectedPatternId.value = null
    currentSchemeId.value = scheme.id
    return true
  }

  function deleteScheme(id: string) {
    schemes.value = schemes.value.filter(s => s.id !== id)
    if (currentSchemeId.value === id) {
      currentSchemeId.value = null
    }
    saveSchemesToStorage()
  }

  function updateSchemeName(id: string, name: string) {
    const scheme = schemes.value.find(s => s.id === id)
    if (scheme) {
      scheme.name = name
      saveSchemesToStorage()
    }
  }

  function saveSchemesToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes.value))
    } catch (e) {
      console.error('Failed to save schemes:', e)
    }
  }

  function loadSchemesFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        schemes.value = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load schemes:', e)
    }
  }

  function clearCanvas() {
    placedPatterns.value = []
    selectedPatternId.value = null
  }

  function clearAll() {
    patternTemplates.value = []
    placedPatterns.value = []
    selectedPatternId.value = null
    silverSheet.value = { width: 200, height: 150 }
    resetCanvasView()
  }

  function createDefaultPatterns() {
    const circle = addPatternTemplate({
      name: '圆形纹样',
      type: 'circle' as PatternType,
      radius: 15,
      fill: '#CD853F',
      stroke: '#8B4513',
      strokeWidth: 2
    })

    const rect = addPatternTemplate({
      name: '矩形纹样',
      type: 'rectangle' as PatternType,
      width: 30,
      height: 20,
      fill: '#DAA520',
      stroke: '#B8860B',
      strokeWidth: 2
    })

    addPatternTemplate({
      name: '花形纹样',
      type: 'custom' as PatternType,
      points: [
        { x: 0, y: -20 },
        { x: 10, y: -10 },
        { x: 20, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 20 },
        { x: -10, y: 10 },
        { x: -20, y: 0 },
        { x: -10, y: -10 }
      ],
      fill: '#D2691E',
      stroke: '#8B4513',
      strokeWidth: 2
    })

    if (circle) {
      placePattern(circle.id, 40, 40)
      placePattern(circle.id, 80, 40)
    }
    if (rect) {
      placePattern(rect.id, 50, 90)
    }
  }

  return {
    silverSheet,
    patternTemplates,
    placedPatterns,
    selectedPatternId,
    schemes,
    currentSchemeId,
    canvasScale,
    canvasOffsetX,
    canvasOffsetY,
    sheetArea,
    usedArea,
    utilization,
    outOfBoundsPatterns,
    overlappingPatternPairs,
    hasIssues,
    getPatternCount,
    setSilverSheet,
    addPatternTemplate,
    updatePatternTemplate,
    deletePatternTemplate,
    forceDeletePatternTemplate,
    placePattern,
    updatePlacedPattern,
    removePlacedPattern,
    duplicatePlacedPattern,
    selectPattern,
    startDrag,
    endDrag,
    isPlacedPatternValid,
    isDrawingMode,
    drawingPoints,
    drawingName,
    startDrawing,
    addDrawingPoint,
    undoDrawingPoint,
    cancelDrawing,
    finishDrawing,
    setCanvasScale,
    setCanvasOffset,
    resetCanvasView,
    saveScheme,
    loadScheme,
    deleteScheme,
    updateSchemeName,
    loadSchemesFromStorage,
    clearCanvas,
    clearAll,
    createDefaultPatterns
  }
})
