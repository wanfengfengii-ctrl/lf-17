import type { PatternTemplate, PlacedPattern, SilverSheet, CanvasViewState } from './pattern'

export interface CustomerInfo {
  name: string
  phone: string
  company: string
  email: string
  address: string
}

export interface CraftProcess {
  id: string
  name: string
  description: string
  unitPrice: number
  unit: string
  quantity: number
  totalPrice: number
}

export interface MaterialItem {
  id: string
  name: string
  spec: string
  unit: string
  unitPrice: number
  quantity: number
  totalPrice: number
}

export interface QuotationBreakdown {
  materialCost: number
  materialLoss: number
  materialLossCost: number
  silverWeight: number
  totalMaterialCost: number
  processes: CraftProcess[]
  totalLaborCost: number
  otherCost: number
  profit: number
  totalPrice: number
  unitPrice: number
}

export interface QuotationConfig {
  silverDensity: number
  silverThickness: number
  silverPrice: number
  lossRate: number
  defaultProcesses: CraftProcessTemplate[]
  otherCostRate: number
  profitRate: number
}

export interface CraftProcessTemplate {
  id: string
  name: string
  description: string
  unitPrice: number
  unit: string
  defaultQuantity: number
}

export interface QuotationVersion {
  id: string
  versionName: string
  createdAt: number
  updatedAt: number
  customerInfo: CustomerInfo
  craftNotes: string
  deliveryDate: string
  quantity: number
  layoutSnapshot: {
    silverSheet: SilverSheet
    patterns: PatternTemplate[]
    placedPatterns: PlacedPattern[]
    canvasView?: CanvasViewState
  }
  breakdown: QuotationBreakdown
  config: QuotationConfig
}

export interface WorkOrderData {
  orderNo: string
  createdAt: number
  customerInfo: CustomerInfo
  craftNotes: string
  deliveryDate: string
  quantity: number
  layoutSnapshot: {
    silverSheet: SilverSheet
    patterns: PatternTemplate[]
    placedPatterns: PlacedPattern[]
  }
  breakdown: QuotationBreakdown
  status: 'draft' | 'confirmed' | 'inProgress' | 'completed'
}

export type WorkOrderStatus = 'draft' | 'confirmed' | 'inProgress' | 'completed'

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: '草稿',
  confirmed: '已确认',
  inProgress: '生产中',
  completed: '已完成'
}
