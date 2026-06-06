import type {
  PatternTemplate,
  PlacedPattern,
  SilverSheet
} from '@/types/pattern'
import type {
  QuotationBreakdown,
  QuotationConfig,
  CraftProcess,
  CraftProcessTemplate,
  CustomerInfo,
  QuotationVersion,
  WorkOrderData,
  WorkOrderStatus,
  ProductionNode,
  WorkOrderFlowRecord,
  OperationLog,
  DeliveryWarningLevel,
  CustomerConfirmation,
  ApprovalRecord,
  ApprovalStatus
} from '@/types/quotation'
import { PRODUCTION_NODE_DEFS } from '@/types/quotation'
import { calculateTotalUsedArea, generateId } from './patternUtils'

export const DEFAULT_QUOTATION_CONFIG: QuotationConfig = {
  silverDensity: 10.49,
  silverThickness: 1,
  silverPrice: 8.5,
  lossRate: 15,
  otherCostRate: 10,
  profitRate: 30,
  defaultProcesses: [
    {
      id: 'cutting',
      name: '下料切割',
      description: '根据纹样尺寸切割银料',
      unitPrice: 5,
      unit: '件',
      defaultQuantity: 1
    },
    {
      id: 'polishing',
      name: '抛光打磨',
      description: '表面抛光处理',
      unitPrice: 8,
      unit: '件',
      defaultQuantity: 1
    },
    {
      id: 'forming',
      name: '成型加工',
      description: '压型、成型工艺',
      unitPrice: 12,
      unit: '件',
      defaultQuantity: 1
    },
    {
      id: 'finishing',
      name: '表面处理',
      description: '做旧、电镀等表面处理',
      unitPrice: 10,
      unit: '件',
      defaultQuantity: 1
    }
  ]
}

export const DEFAULT_CUSTOMER_INFO: CustomerInfo = {
  name: '',
  phone: '',
  company: '',
  email: '',
  address: ''
}

export function calculateSilverWeight(
  templates: PatternTemplate[],
  placedPatterns: PlacedPattern[],
  silverThickness: number,
  silverDensity: number
): number {
  const totalArea = calculateTotalUsedArea(templates, placedPatterns)
  const volume = totalArea * silverThickness
  const weight = (volume * silverDensity) / 1000
  return Math.round(weight * 100) / 100
}

export function calculateMaterialCost(
  silverWeight: number,
  silverPrice: number
): number {
  return Math.round(silverWeight * silverPrice * 100) / 100
}

export function calculateMaterialLossCost(
  materialCost: number,
  lossRate: number
): number {
  return Math.round(materialCost * (lossRate / 100) * 100) / 100
}

export function createProcessesFromTemplates(
  templates: CraftProcessTemplate[],
  quantity: number
): CraftProcess[] {
  return templates.map(t => ({
    id: generateId(),
    name: t.name,
    description: t.description,
    unitPrice: t.unitPrice,
    unit: t.unit,
    quantity: t.defaultQuantity * quantity,
    totalPrice: Math.round(t.unitPrice * t.defaultQuantity * quantity * 100) / 100
  }))
}

export function calculateTotalLaborCost(processes: CraftProcess[]): number {
  return Math.round(
    processes.reduce((sum, p) => sum + p.totalPrice, 0) * 100
  ) / 100
}

export function calculateQuotationBreakdown(
  templates: PatternTemplate[],
  placedPatterns: PlacedPattern[],
  quantity: number,
  config: QuotationConfig
): QuotationBreakdown {
  const silverWeight = calculateSilverWeight(
    templates,
    placedPatterns,
    config.silverThickness,
    config.silverDensity
  )

  const materialCost = calculateMaterialCost(silverWeight, config.silverPrice)
  const materialLossCost = calculateMaterialLossCost(materialCost, config.lossRate)
  const totalMaterialCost = Math.round((materialCost + materialLossCost) * 100) / 100

  const processes = createProcessesFromTemplates(config.defaultProcesses, quantity)
  const totalLaborCost = calculateTotalLaborCost(processes)

  const otherCost = Math.round(
    (totalMaterialCost + totalLaborCost) * (config.otherCostRate / 100) * 100
  ) / 100

  const subtotal = totalMaterialCost + totalLaborCost + otherCost
  const profit = Math.round(subtotal * (config.profitRate / 100) * 100) / 100
  const totalPrice = Math.round((subtotal + profit) * 100) / 100
  const unitPrice = quantity > 0 ? Math.round((totalPrice / quantity) * 100) / 100 : 0

  return {
    materialCost,
    materialLoss: config.lossRate,
    materialLossCost,
    silverWeight,
    totalMaterialCost,
    processes,
    totalLaborCost,
    otherCost,
    profit,
    totalPrice,
    unitPrice
  }
}

export function updateProcessTotal(process: CraftProcess): CraftProcess {
  return {
    ...process,
    totalPrice: Math.round(process.unitPrice * process.quantity * 100) / 100
  }
}

export function recalculateBreakdownWithProcesses(
  breakdown: QuotationBreakdown,
  processes: CraftProcess[],
  quantity: number,
  config: QuotationConfig
): QuotationBreakdown {
  const totalLaborCost = calculateTotalLaborCost(processes)
  const otherCost = Math.round(
    (breakdown.totalMaterialCost + totalLaborCost) * (config.otherCostRate / 100) * 100
  ) / 100
  const subtotal = breakdown.totalMaterialCost + totalLaborCost + otherCost
  const profit = Math.round(subtotal * (config.profitRate / 100) * 100) / 100
  const totalPrice = Math.round((subtotal + profit) * 100) / 100
  const unitPrice = quantity > 0 ? Math.round((totalPrice / quantity) * 100) / 100 : 0

  return {
    ...breakdown,
    processes,
    totalLaborCost,
    otherCost,
    profit,
    totalPrice,
    unitPrice
  }
}

export function createQuotationVersion(
  versionName: string,
  customerInfo: CustomerInfo,
  craftNotes: string,
  deliveryDate: string,
  quantity: number,
  silverSheet: SilverSheet,
  templates: PatternTemplate[],
  placedPatterns: PlacedPattern[],
  canvasView: any,
  config: QuotationConfig,
  schemeId?: string,
  schemeName?: string
): QuotationVersion {
  const breakdown = calculateQuotationBreakdown(templates, placedPatterns, quantity, config)
  const now = Date.now()

  return {
    id: generateId(),
    versionName,
    createdAt: now,
    updatedAt: now,
    customerInfo: { ...customerInfo },
    craftNotes,
    deliveryDate,
    quantity,
    layoutSnapshot: {
      silverSheet: { ...silverSheet },
      patterns: JSON.parse(JSON.stringify(templates)),
      placedPatterns: JSON.parse(JSON.stringify(placedPatterns)),
      canvasView: canvasView ? { ...canvasView } : undefined
    },
    breakdown: JSON.parse(JSON.stringify(breakdown)),
    config: JSON.parse(JSON.stringify(config)),
    approvalStatus: 'pending',
    approvalRecords: [],
    schemeId,
    schemeName
  }
}

export function generateWorkOrderNo(): string {
  const now = new Date()
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `WO${dateStr}${random}`
}

export function createWorkOrderFromQuotation(
  quotation: QuotationVersion,
  status: WorkOrderStatus = 'draft',
  operator: string = '系统'
): WorkOrderData {
  const flowRecord = createFlowRecord(
    '',
    null,
    status,
    operator,
    '创建工单'
  )
  
  const workOrder: WorkOrderData = {
    orderNo: generateWorkOrderNo(),
    createdAt: Date.now(),
    customerInfo: { ...quotation.customerInfo },
    craftNotes: quotation.craftNotes,
    deliveryDate: quotation.deliveryDate,
    quantity: quotation.quantity,
    layoutSnapshot: JSON.parse(JSON.stringify(quotation.layoutSnapshot)),
    breakdown: JSON.parse(JSON.stringify(quotation.breakdown)),
    status,
    quotationId: quotation.id,
    quotationVersionName: quotation.versionName,
    productionNodes: createDefaultProductionNodes(),
    flowRecords: [],
    schemeId: quotation.schemeId,
    schemeName: quotation.schemeName
  }
  
  flowRecord.orderNo = workOrder.orderNo
  workOrder.flowRecords.push(flowRecord)
  
  return workOrder
}

export function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`
}

export function formatWeight(value: number): string {
  return `${value.toFixed(2)} g`
}

export function getPatternQuantityMap(
  templates: PatternTemplate[],
  placedPatterns: PlacedPattern[]
): Array<{ template: PatternTemplate; count: number }> {
  const map = new Map<string, number>()
  for (const placed of placedPatterns) {
    const current = map.get(placed.templateId) || 0
    map.set(placed.templateId, current + 1)
  }

  const result: Array<{ template: PatternTemplate; count: number }> = []
  for (const [templateId, count] of map.entries()) {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      result.push({ template, count })
    }
  }
  return result
}

export function getTotalPatternCount(placedPatterns: PlacedPattern[]): number {
  return placedPatterns.length
}

export function calculateSheetArea(silverSheet: SilverSheet): number {
  return silverSheet.width * silverSheet.height
}

export function calculateUtilization(
  templates: PatternTemplate[],
  placedPatterns: PlacedPattern[],
  silverSheet: SilverSheet
): number {
  const sheetArea = calculateSheetArea(silverSheet)
  if (sheetArea <= 0) return 0
  const usedArea = calculateTotalUsedArea(templates, placedPatterns)
  return (usedArea / sheetArea) * 100
}

export function createDefaultProductionNodes(): ProductionNode[] {
  return PRODUCTION_NODE_DEFS.filter(d => d.default).map((def, index) => ({
    id: generateId(),
    type: def.type,
    name: def.name,
    status: 'pending',
    sortOrder: index
  }))
}

export function createFlowRecord(
  orderNo: string,
  fromStatus: WorkOrderStatus | null,
  toStatus: WorkOrderStatus,
  operator: string,
  remark: string = ''
): WorkOrderFlowRecord {
  return {
    id: generateId(),
    orderNo,
    fromStatus,
    toStatus,
    operator,
    remark,
    createdAt: Date.now()
  }
}

export function createOperationLog(
  targetType: 'quotation' | 'workOrder' | 'scheme',
  targetId: string,
  type: OperationLog['type'],
  operator: string,
  description: string,
  detail?: string
): OperationLog {
  return {
    id: generateId(),
    targetType,
    targetId,
    type,
    operator,
    description,
    detail,
    createdAt: Date.now()
  }
}

export function getDeliveryWarningLevel(deliveryDate: string, status: WorkOrderStatus): DeliveryWarningLevel {
  if (!deliveryDate || status === 'completed') return 'normal'
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const delivery = new Date(deliveryDate)
  delivery.setHours(0, 0, 0, 0)
  
  const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 1) return 'urgent'
  if (diffDays <= 3) return 'warning'
  return 'normal'
}

export function getDaysRemaining(deliveryDate: string): number {
  if (!deliveryDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const delivery = new Date(deliveryDate)
  delivery.setHours(0, 0, 0, 0)
  return Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function createCustomerConfirmation(
  targetType: 'quotation' | 'workOrder',
  targetId: string
): CustomerConfirmation {
  return {
    id: generateId(),
    targetType,
    targetId,
    status: 'pending',
    sentAt: Date.now()
  }
}

export function createApprovalRecord(
  versionId: string,
  status: ApprovalStatus,
  approver: string,
  comment: string = ''
): ApprovalRecord {
  return {
    id: generateId(),
    versionId,
    status,
    approver,
    comment,
    createdAt: Date.now()
  }
}

export function calculateProductionProgress(nodes: ProductionNode[]): number {
  if (nodes.length === 0) return 0
  const completed = nodes.filter(n => n.status === 'completed').length
  return Math.round((completed / nodes.length) * 100)
}

export function getWarningLevelColor(level: DeliveryWarningLevel): string {
  switch (level) {
    case 'normal': return 'success'
    case 'warning': return 'warning'
    case 'urgent': return 'error'
    case 'overdue': return 'error'
    default: return 'default'
  }
}
