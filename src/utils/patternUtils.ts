import type {
  PatternTemplate,
  PlacedPattern,
  SilverSheet,
  Point,
  AutoArrangeOptions
} from '@/types/pattern'

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

export function getTemplateBounds(template: PatternTemplate): {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
} {
  const placed: PlacedPattern = {
    id: 'temp',
    templateId: template.id,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1
  }
  const bounds = getPatternBounds(template, placed)
  return {
    ...bounds,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY
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

export function parseSvgToPoints(svgContent: string): Point[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgContent, 'image/svg+xml')

  let points: Point[] = []
  let found = false

  const polygons = doc.querySelectorAll('polygon')
  if (polygons.length > 0) {
    const poly = polygons[0]
    const pointsAttr = poly.getAttribute('points')
    if (pointsAttr) {
      points = parsePointsString(pointsAttr)
      found = points.length >= 3
    }
  }

  if (!found) {
    const paths = doc.querySelectorAll('path')
    if (paths.length > 0) {
      const path = paths[0]
      const d = path.getAttribute('d')
      if (d) {
        points = pathDataToPoints(d)
        found = points.length >= 3
      }
    }
  }

  if (!found) {
    const rects = doc.querySelectorAll('rect')
    if (rects.length > 0) {
      const rect = rects[0]
      const rx = parseFloat(rect.getAttribute('x') || '0')
      const ry = parseFloat(rect.getAttribute('y') || '0')
      const w = parseFloat(rect.getAttribute('width') || '0')
      const h = parseFloat(rect.getAttribute('height') || '0')
      points = [
        { x: rx, y: ry },
        { x: rx + w, y: ry },
        { x: rx + w, y: ry + h },
        { x: rx, y: ry + h }
      ]
      const cx = rx + w / 2
      const cy = ry + h / 2
      points = points.map(p => ({ x: p.x - cx, y: p.y - cy }))
      found = true
    }
  }

  if (!found) {
    const circles = doc.querySelectorAll('circle')
    if (circles.length > 0) {
      const circle = circles[0]
      const r = parseFloat(circle.getAttribute('r') || '10')
      const segments = 36
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        points.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r
        })
      }
      found = true
    }
  }

  if (found && points.length > 0) {
    const centroid = calculateCentroid(points)
    points = points.map(p => ({
      x: p.x - centroid.x,
      y: p.y - centroid.y
    }))
  }

  return points
}

function parsePointsString(pointsStr: string): Point[] {
  const parts = pointsStr.trim().split(/[\s,]+/)
  const points: Point[] = []
  for (let i = 0; i < parts.length - 1; i += 2) {
    const x = parseFloat(parts[i])
    const y = parseFloat(parts[i + 1])
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y })
    }
  }
  return points
}

function pathDataToPoints(d: string): Point[] {
  const points: Point[] = []
  let currentX = 0
  let currentY = 0
  let startX = 0
  let startY = 0

  const commands = d.match(/[a-zA-Z][^a-zA-Z]*/g) || []

  for (const cmd of commands) {
    const type = cmd[0]
    const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))

    switch (type) {
      case 'M':
        currentX = nums[0]
        currentY = nums[1]
        startX = currentX
        startY = currentY
        points.push({ x: currentX, y: currentY })
        break
      case 'm':
        currentX += nums[0]
        currentY += nums[1]
        startX = currentX
        startY = currentY
        points.push({ x: currentX, y: currentY })
        break
      case 'L':
        for (let i = 0; i < nums.length; i += 2) {
          currentX = nums[i]
          currentY = nums[i + 1]
          points.push({ x: currentX, y: currentY })
        }
        break
      case 'l':
        for (let i = 0; i < nums.length; i += 2) {
          currentX += nums[i]
          currentY += nums[i + 1]
          points.push({ x: currentX, y: currentY })
        }
        break
      case 'H':
        for (let i = 0; i < nums.length; i++) {
          currentX = nums[i]
          points.push({ x: currentX, y: currentY })
        }
        break
      case 'h':
        for (let i = 0; i < nums.length; i++) {
          currentX += nums[i]
          points.push({ x: currentX, y: currentY })
        }
        break
      case 'V':
        for (let i = 0; i < nums.length; i++) {
          currentY = nums[i]
          points.push({ x: currentX, y: currentY })
        }
        break
      case 'v':
        for (let i = 0; i < nums.length; i++) {
          currentY += nums[i]
          points.push({ x: currentX, y: currentY })
        }
        break
      case 'Z':
      case 'z':
        currentX = startX
        currentY = startY
        break
      case 'Q':
        for (let i = 0; i < nums.length; i += 4) {
          const cx = nums[i]
          const cy = nums[i + 1]
          const x = nums[i + 2]
          const y = nums[i + 3]
          for (let t = 0.2; t <= 1; t += 0.2) {
            const px = (1 - t) * (1 - t) * currentX + 2 * (1 - t) * t * cx + t * t * x
            const py = (1 - t) * (1 - t) * currentY + 2 * (1 - t) * t * cy + t * t * y
            points.push({ x: px, y: py })
          }
          currentX = x
          currentY = y
        }
        break
      case 'C':
        for (let i = 0; i < nums.length; i += 6) {
          const c1x = nums[i]
          const c1y = nums[i + 1]
          const c2x = nums[i + 2]
          const c2y = nums[i + 3]
          const x = nums[i + 4]
          const y = nums[i + 5]
          for (let t = 0.2; t <= 1; t += 0.2) {
            const px =
              (1 - t) * (1 - t) * (1 - t) * currentX +
              3 * (1 - t) * (1 - t) * t * c1x +
              3 * (1 - t) * t * t * c2x +
              t * t * t * x
            const py =
              (1 - t) * (1 - t) * (1 - t) * currentY +
              3 * (1 - t) * (1 - t) * t * c1y +
              3 * (1 - t) * t * t * c2y +
              t * t * t * y
            points.push({ x: px, y: py })
          }
          currentX = x
          currentY = y
        }
        break
    }
  }

  return simplifyPoints(points, 50)
}

function simplifyPoints(points: Point[], maxPoints: number): Point[] {
  if (points.length <= maxPoints) return points

  const step = Math.ceil(points.length / maxPoints)
  const result: Point[] = []
  for (let i = 0; i < points.length; i += step) {
    result.push(points[i])
  }
  return result
}

export function calculateCentroid(points: Point[]): Point {
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

export function autoArrangePatterns(
  templates: PatternTemplate[],
  placedPatterns: PlacedPattern[],
  sheet: SilverSheet,
  options: AutoArrangeOptions
): PlacedPattern[] {
  switch (options.algorithm) {
    case 'grid':
      return gridArrange(templates, placedPatterns, sheet, options)
    case 'row':
      return rowArrange(templates, placedPatterns, sheet, options)
    case 'compact':
      return compactArrange(templates, placedPatterns, sheet, options)
    default:
      return gridArrange(templates, placedPatterns, sheet, options)
  }
}

function gridArrange(
  templates: PatternTemplate[],
  placedPatterns: PlacedPattern[],
  sheet: SilverSheet,
  options: AutoArrangeOptions
): PlacedPattern[] {
  const result: PlacedPattern[] = []
  const spacing = options.spacing

  const sorted = [...placedPatterns].sort((a, b) => {
    const ta = templates.find(t => t.id === a.templateId)
    const tb = templates.find(t => t.id === b.templateId)
    if (!ta || !tb) return 0
    return calculatePatternArea(tb) - calculatePatternArea(ta)
  })

  let currentX = spacing
  let currentY = spacing
  let rowHeight = 0

  for (const placed of sorted) {
    const template = templates.find(t => t.id === placed.templateId)
    if (!template) continue

    const bounds = getTemplateBounds(template)
    const w = bounds.width * Math.abs(placed.scaleX) + spacing * 2
    const h = bounds.height * Math.abs(placed.scaleY) + spacing * 2

    if (currentX + w > sheet.width) {
      currentX = spacing
      currentY += rowHeight + spacing
      rowHeight = 0
    }

    if (currentY + h > sheet.height) {
      continue
    }

    const newPlaced: PlacedPattern = {
      ...placed,
      x: currentX + w / 2 - spacing,
      y: currentY + h / 2 - spacing,
      rotation: 0
    }

    result.push(newPlaced)
    currentX += w
    rowHeight = Math.max(rowHeight, h)
  }

  return result
}

function rowArrange(
  templates: PatternTemplate[],
  placedPatterns: PlacedPattern[],
  sheet: SilverSheet,
  options: AutoArrangeOptions
): PlacedPattern[] {
  const result: PlacedPattern[] = []
  const spacing = options.spacing

  const sorted = [...placedPatterns].sort((a, b) => {
    const ta = templates.find(t => t.id === a.templateId)
    const tb = templates.find(t => t.id === b.templateId)
    if (!ta || !tb) return 0
    const ba = getTemplateBounds(ta)
    const bb = getTemplateBounds(tb)
    return bb.height * Math.abs(b.scaleY) - ba.height * Math.abs(a.scaleY)
  })

  const rows: Array<{ patterns: PlacedPattern[]; height: number; width: number }> = []

  for (const placed of sorted) {
    const template = templates.find(t => t.id === placed.templateId)
    if (!template) continue

    const bounds = getTemplateBounds(template)
    const w = bounds.width * Math.abs(placed.scaleX) + spacing * 2
    const h = bounds.height * Math.abs(placed.scaleY) + spacing * 2

    let placedInRow = false
    for (const row of rows) {
      if (row.width + w <= sheet.width) {
        const newPlaced: PlacedPattern = {
          ...placed,
          x: row.width + w / 2 - spacing,
          y: 0,
          rotation: 0
        }
        row.patterns.push(newPlaced)
        row.width += w
        row.height = Math.max(row.height, h)
        placedInRow = true
        break
      }
    }

    if (!placedInRow) {
      const newPlaced: PlacedPattern = {
        ...placed,
        x: w / 2 - spacing + spacing,
        y: 0,
        rotation: 0
      }
      rows.push({
        patterns: [newPlaced],
        height: h,
        width: w + spacing
      })
    }
  }

  let yOffset = spacing
  for (const row of rows) {
    if (yOffset + row.height > sheet.height) break
    for (const p of row.patterns) {
      result.push({
        ...p,
        y: yOffset + row.height / 2 - spacing
      })
    }
    yOffset += row.height + spacing
  }

  return result
}

function compactArrange(
  templates: PatternTemplate[],
  placedPatterns: PlacedPattern[],
  sheet: SilverSheet,
  options: AutoArrangeOptions
): PlacedPattern[] {
  const result: PlacedPattern[] = []
  const spacing = options.spacing

  const sorted = [...placedPatterns].sort((a, b) => {
    const ta = templates.find(t => t.id === a.templateId)
    const tb = templates.find(t => t.id === b.templateId)
    if (!ta || !tb) return 0
    return calculatePatternArea(tb) - calculatePatternArea(ta)
  })

  for (const placed of sorted) {
    const template = templates.find(t => t.id === placed.templateId)
    if (!template) continue

    const bounds = getTemplateBounds(template)
    const w = bounds.width * Math.abs(placed.scaleX)
    const h = bounds.height * Math.abs(placed.scaleY)

    let bestX = spacing + w / 2
    let bestY = spacing + h / 2
    let found = false

    const step = 5

    for (let y = spacing + h / 2; y < sheet.height - spacing - h / 2; y += step) {
      for (let x = spacing + w / 2; x < sheet.width - spacing - w / 2; x += step) {
        const testPlaced: PlacedPattern = {
          ...placed,
          x,
          y,
          rotation: 0
        }

        let valid = true
        for (const existing of result) {
          const existingTemplate = templates.find(t => t.id === existing.templateId)
          if (!existingTemplate) continue
          if (checkPatternsOverlap(template, testPlaced, existingTemplate, existing)) {
            valid = false
            break
          }
        }

        if (valid) {
          bestX = x
          bestY = y
          found = true
          break
        }
      }
      if (found) break
    }

    result.push({
      ...placed,
      x: bestX,
      y: bestY,
      rotation: 0
    })
  }

  return result
}

export function compareSchemesUtilization(
  schemes: Array<{
    id: string
    name: string
    silverSheet: SilverSheet
    patterns: PatternTemplate[]
    placedPatterns: PlacedPattern[]
  }>
): Array<{
  schemeId: string
  schemeName: string
  utilization: number
  patternCount: number
  silverSheetSize: string
}> {
  return schemes
    .map(s => ({
      schemeId: s.id,
      schemeName: s.name,
      utilization: calculateUtilization(s.patterns, s.placedPatterns, s.silverSheet),
      patternCount: s.placedPatterns.length,
      silverSheetSize: `${s.silverSheet.width}×${s.silverSheet.height}mm`
    }))
    .sort((a, b) => b.utilization - a.utilization)
}
