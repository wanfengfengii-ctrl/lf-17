import type { PatternTemplate, PlacedPattern, SilverSheet, Point } from '@/types/pattern'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function calculatePatternArea(template: PatternTemplate): number {
  switch (template.type) {
    case 'circle':
      return Math.PI * (template.radius || 0) * (template.radius || 0)
    case 'rectangle':
      return (template.width || 0) * (template.height || 0)
    case 'custom':
      return calculatePolygonArea(template.points || [])
    default:
      return 0
  }
}

export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area / 2)
}

export function getPatternBounds(
  template: PatternTemplate,
  placed: PlacedPattern
): { minX: number; maxX: number; minY: number; maxY: number } {
  const points = getPatternPoints(template, placed)
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  }
}

export function getPatternPoints(
  template: PatternTemplate,
  placed: PlacedPattern
): Point[] {
  let basePoints: Point[] = []

  switch (template.type) {
    case 'circle': {
      const radius = (template.radius || 0) * placed.scaleX
      const segments = 36
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        basePoints.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        })
      }
      break
    }
    case 'rectangle': {
      const w = (template.width || 0) * placed.scaleX / 2
      const h = (template.height || 0) * placed.scaleY / 2
      basePoints = [
        { x: -w, y: -h },
        { x: w, y: -h },
        { x: w, y: h },
        { x: -w, y: h }
      ]
      break
    }
    case 'custom': {
      basePoints = (template.points || []).map(p => ({
        x: p.x * placed.scaleX,
        y: p.y * placed.scaleY
      }))
      break
    }
  }

  const rad = (placed.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  return basePoints.map(p => ({
    x: p.x * cos - p.y * sin + placed.x,
    y: p.x * sin + p.y * cos + placed.y
  }))
}

export function checkPatternOutOfBounds(
  template: PatternTemplate,
  placed: PlacedPattern,
  sheet: SilverSheet
): boolean {
  const bounds = getPatternBounds(template, placed)
  return (
    bounds.minX < 0 ||
    bounds.maxX > sheet.width ||
    bounds.minY < 0 ||
    bounds.maxY > sheet.height
  )
}

export function checkPatternsOverlap(
  templateA: PatternTemplate,
  placedA: PlacedPattern,
  templateB: PatternTemplate,
  placedB: PlacedPattern
): boolean {
  const pointsA = getPatternPoints(templateA, placedA)
  const pointsB = getPatternPoints(templateB, placedB)

  return doPolygonsIntersect(pointsA, pointsB)
}

function doPolygonsIntersect(polyA: Point[], polyB: Point[]): boolean {
  const axes = getAxes(polyA).concat(getAxes(polyB))

  for (const axis of axes) {
    const projectionA = projectPolygon(polyA, axis)
    const projectionB = projectPolygon(polyB, axis)

    if (!overlap(projectionA, projectionB)) {
      return false
    }
  }

  return true
}

function getAxes(polygon: Point[]): Point[] {
  const axes: Point[] = []
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i]
    const p2 = polygon[(i + 1) % polygon.length]
    const edge = { x: p2.x - p1.x, y: p2.y - p1.y }
    const normal = { x: -edge.y, y: edge.x }
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y)
    if (length > 0) {
      axes.push({ x: normal.x / length, y: normal.y / length })
    }
  }
  return axes
}

function projectPolygon(polygon: Point[], axis: Point): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  for (const point of polygon) {
    const proj = point.x * axis.x + point.y * axis.y
    min = Math.min(min, proj)
    max = Math.max(max, proj)
  }
  return { min, max }
}

function overlap(
  a: { min: number; max: number },
  b: { min: number; max: number }
): boolean {
  return a.max >= b.min && b.max >= a.min
}

export function calculateTotalUsedArea(
  templates: PatternTemplate[],
  placedPatterns: PlacedPattern[]
): number {
  let total = 0
  for (const placed of placedPatterns) {
    const template = templates.find(t => t.id === placed.templateId)
    if (template) {
      total += calculatePatternArea(template) * Math.abs(placed.scaleX * placed.scaleY)
    }
  }
  return total
}

export function calculateUtilization(
  templates: PatternTemplate[],
  placedPatterns: PlacedPattern[],
  sheet: SilverSheet
): number {
  const sheetArea = sheet.width * sheet.height
  if (sheetArea <= 0) return 0
  const usedArea = calculateTotalUsedArea(templates, placedPatterns)
  return (usedArea / sheetArea) * 100
}

export function getDefaultPatternColors(): { fill: string; stroke: string; strokeWidth: number } {
  const colors = [
    { fill: '#CD853F', stroke: '#8B4513', strokeWidth: 2 },
    { fill: '#DAA520', stroke: '#B8860B', strokeWidth: 2 },
    { fill: '#D2691E', stroke: '#8B4513', strokeWidth: 2 },
    { fill: '#B8860B', stroke: '#8B6914', strokeWidth: 2 },
    { fill: '#CD853F', stroke: '#A0522D', strokeWidth: 2 }
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
