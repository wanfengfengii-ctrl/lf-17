export type PatternType = 'circle' | 'rectangle' | 'custom'

export interface Point {
  x: number
  y: number
}

export interface PatternTemplate {
  id: string
  name: string
  type: PatternType
  radius?: number
  width?: number
  height?: number
  points?: Point[]
  fill: string
  stroke: string
  strokeWidth: number
}

export interface PlacedPattern {
  id: string
  templateId: string
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
}

export interface SilverSheet {
  width: number
  height: number
}

export interface CanvasViewState {
  scale: number
  offsetX: number
  offsetY: number
}

export interface LayoutScheme {
  id: string
  name: string
  createdAt: number
  silverSheet: SilverSheet
  patterns: PatternTemplate[]
  placedPatterns: PlacedPattern[]
  canvasView?: CanvasViewState
}

export interface CanvasState {
  scale: number
  offsetX: number
  offsetY: number
  selectedPatternId: string | null
}

export type AutoArrangeAlgorithm = 'grid' | 'row' | 'compact'

export interface AutoArrangeOptions {
  algorithm: AutoArrangeAlgorithm
  spacing: number
  allowRotation: boolean
}

export interface SchemeComparisonItem {
  schemeId: string
  schemeName: string
  utilization: number
  patternCount: number
  silverSheetSize: string
}
