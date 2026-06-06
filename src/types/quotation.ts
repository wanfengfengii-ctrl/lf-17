import type { PatternTemplate, PlacedPattern, SilverSheet, CanvasViewState, LayoutScheme } from './pattern'

export type { LayoutScheme }

export interface CustomerInfo {
  name: string
  phone: string
  company: string
  email: string
  address: string
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision'

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  revision: '需修改'
}

export interface ApprovalRecord {
  id: string
  versionId: string
  status: ApprovalStatus
  approver: string
  comment: string
  createdAt: number
}

export type ProductionNodeType = 'material' | 'cutting' | 'polishing' | 'engraving' | 'plating' | 'assembly' | 'inspection' | 'packaging'

export interface ProductionNode {
  id: string
  type: ProductionNodeType
  name: string
  status: 'pending' | 'inProgress' | 'completed' | 'skipped'
  startTime?: number
  endTime?: number
  operator?: string
  remark?: string
  sortOrder: number
}

export const PRODUCTION_NODE_DEFS: { type: ProductionNodeType; name: string; default: boolean }[] = [
  { type: 'material', name: '备料', default: true },
  { type: 'cutting', name: '下料切割', default: true },
  { type: 'polishing', name: '打磨抛光', default: true },
  { type: 'engraving', name: '雕刻花纹', default: false },
  { type: 'plating', name: '电镀', default: false },
  { type: 'assembly', name: '组装', default: true },
  { type: 'inspection', name: '质检', default: true },
  { type: 'packaging', name: '包装', default: true }
]

export interface WorkOrderFlowRecord {
  id: string
  orderNo: string
  fromStatus: WorkOrderStatus | null
  toStatus: WorkOrderStatus
  operator: string
  remark: string
  createdAt: number
}

export type OperationLogType = 'create' | 'update' | 'delete' | 'status_change' | 'approval' | 'customer_confirm' | 'export' | 'print'

export interface OperationLog {
  id: string
  targetType: 'quotation' | 'workOrder' | 'scheme'
  targetId: string
  type: OperationLogType
  operator: string
  description: string
  detail?: string
  createdAt: number
}

export type CustomerConfirmStatus = 'pending' | 'viewed' | 'confirmed' | 'rejected'

export const CUSTOMER_CONFIRM_LABELS: Record<CustomerConfirmStatus, string> = {
  pending: '待确认',
  viewed: '已查看',
  confirmed: '已确认',
  rejected: '已拒绝'
}

export interface CustomerConfirmation {
  id: string
  targetType: 'quotation' | 'workOrder'
  targetId: string
  status: CustomerConfirmStatus
  confirmedAt?: number
  customerName?: string
  comment?: string
  sentAt?: number
}

export type DeliveryWarningLevel = 'normal' | 'warning' | 'urgent' | 'overdue'

export const DELIVERY_WARNING_LABELS: Record<DeliveryWarningLevel, string> = {
  normal: '正常',
  warning: '临近交期',
  urgent: '紧急',
  overdue: '已逾期'
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
  approvalStatus: ApprovalStatus
  approvalRecords: ApprovalRecord[]
  customerConfirmation?: CustomerConfirmation
  schemeId?: string
  schemeName?: string
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
  status: WorkOrderStatus
  quotationId?: string
  quotationVersionName?: string
  productionNodes: ProductionNode[]
  flowRecords: WorkOrderFlowRecord[]
  customerConfirmation?: CustomerConfirmation
  schemeId?: string
  schemeName?: string
  actualFinishDate?: number
}

export type WorkOrderStatus = 'draft' | 'confirmed' | 'inProgress' | 'completed'

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: '草稿',
  confirmed: '已确认',
  inProgress: '生产中',
  completed: '已完成'
}
