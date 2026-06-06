import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CustomerInfo,
  QuotationConfig,
  QuotationBreakdown,
  QuotationVersion,
  WorkOrderData,
  CraftProcess,
  WorkOrderStatus,
  ApprovalStatus,
  ProductionNode,
  OperationLog,
  CustomerConfirmation,
  CustomerConfirmStatus,
  DeliveryWarningLevel
} from '@/types/quotation'
import {
  DEFAULT_QUOTATION_CONFIG,
  DEFAULT_CUSTOMER_INFO,
  calculateQuotationBreakdown,
  recalculateBreakdownWithProcesses,
  createQuotationVersion,
  createWorkOrderFromQuotation,
  createFlowRecord,
  createOperationLog,
  createApprovalRecord,
  createCustomerConfirmation,
  getDeliveryWarningLevel,
  calculateProductionProgress
} from '@/utils/quotationUtils'
import { usePatternStore } from './pattern'

const QUOTATION_STORAGE_KEY = 'silver-quotation-versions'
const WORK_ORDER_STORAGE_KEY = 'silver-work-orders'
const OPERATION_LOG_STORAGE_KEY = 'silver-operation-logs'

export const useQuotationStore = defineStore('quotation', () => {
  const patternStore = usePatternStore()

  const customerInfo = ref<CustomerInfo>({ ...DEFAULT_CUSTOMER_INFO })
  const craftNotes = ref('')
  const deliveryDate = ref('')
  const quantity = ref(1)

  const quotationConfig = ref<QuotationConfig>({
    ...DEFAULT_QUOTATION_CONFIG,
    defaultProcesses: DEFAULT_QUOTATION_CONFIG.defaultProcesses.map(p => ({ ...p }))
  })

  const customProcesses = ref<CraftProcess[] | null>(null)

  const quotationVersions = ref<QuotationVersion[]>([])
  const currentVersionId = ref<string | null>(null)

  const workOrders = ref<WorkOrderData[]>([])
  const operationLogs = ref<OperationLog[]>([])

  const isOrderInfoEditing = ref(false)
  const hasUnsavedOrderChanges = ref(false)

  const currentOperator = ref('管理员')

  const currentBreakdown = computed<QuotationBreakdown>(() => {
    const baseBreakdown = calculateQuotationBreakdown(
      patternStore.patternTemplates,
      patternStore.placedPatterns,
      quantity.value,
      quotationConfig.value
    )

    if (customProcesses.value) {
      const updatedProcesses = customProcesses.value.map(p => ({
        ...p,
        totalPrice: Math.round(p.unitPrice * p.quantity * 100) / 100
      }))
      return recalculateBreakdownWithProcesses(
        baseBreakdown,
        updatedProcesses,
        quantity.value,
        quotationConfig.value
      )
    }

    return baseBreakdown
  })

  const currentVersion = computed(() => {
    if (!currentVersionId.value) return null
    return quotationVersions.value.find(v => v.id === currentVersionId.value) || null
  })

  function setCustomerInfo(info: Partial<CustomerInfo>) {
    customerInfo.value = { ...customerInfo.value, ...info }
  }

  function setCraftNotes(notes: string) {
    craftNotes.value = notes
  }

  function setDeliveryDate(date: string) {
    deliveryDate.value = date
  }

  function setQuantity(qty: number) {
    if (qty > 0) {
      quantity.value = qty
    }
  }

  function setQuotationConfig(config: Partial<QuotationConfig>) {
    quotationConfig.value = { ...quotationConfig.value, ...config }
  }

  function ensureCustomProcesses() {
    if (!customProcesses.value) {
      customProcesses.value = currentBreakdown.value.processes.map(p => ({ ...p }))
    }
    return customProcesses.value!
  }

  function updateProcess(processId: string, updates: Partial<CraftProcess>) {
    const processes = ensureCustomProcesses()
    const index = processes.findIndex(p => p.id === processId)
    if (index !== -1) {
      processes[index] = { ...processes[index], ...updates }
      processes[index].totalPrice = Math.round(
        processes[index].unitPrice * processes[index].quantity * 100
      ) / 100
      customProcesses.value = [...processes]
    }
  }

  function addProcess(process: Omit<CraftProcess, 'id' | 'totalPrice'>) {
    const processes = ensureCustomProcesses()
    const newProcess: CraftProcess = {
      ...process,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      totalPrice: Math.round(process.unitPrice * process.quantity * 100) / 100
    }
    customProcesses.value = [...processes, newProcess]
  }

  function removeProcess(processId: string) {
    const processes = ensureCustomProcesses()
    customProcesses.value = processes.filter(p => p.id !== processId)
  }

  function resetCustomProcesses() {
    customProcesses.value = null
  }

  function loadQuotationVersion(versionId: string): boolean {
    const version = quotationVersions.value.find(v => v.id === versionId)
    if (!version) return false

    customerInfo.value = { ...version.customerInfo }
    craftNotes.value = version.craftNotes
    deliveryDate.value = version.deliveryDate
    quantity.value = version.quantity
    quotationConfig.value = JSON.parse(JSON.stringify(version.config))

    if (version.breakdown.processes && version.breakdown.processes.length > 0) {
      customProcesses.value = JSON.parse(JSON.stringify(version.breakdown.processes))
    } else {
      customProcesses.value = null
    }

    patternStore.silverSheet.width = version.layoutSnapshot.silverSheet.width
    patternStore.silverSheet.height = version.layoutSnapshot.silverSheet.height
    ;(patternStore as any).patternTemplates = JSON.parse(
      JSON.stringify(version.layoutSnapshot.patterns)
    )
    ;(patternStore as any).placedPatterns = JSON.parse(
      JSON.stringify(version.layoutSnapshot.placedPatterns)
    )
    patternStore.selectPattern(null)

    if (version.layoutSnapshot.canvasView) {
      patternStore.setCanvasView(version.layoutSnapshot.canvasView)
    }

    currentVersionId.value = versionId
    return true
  }

  function deleteQuotationVersion(versionId: string) {
    quotationVersions.value = quotationVersions.value.filter(v => v.id !== versionId)
    if (currentVersionId.value === versionId) {
      currentVersionId.value = null
    }
    saveQuotationVersionsToStorage()
  }

  function updateQuotationVersionName(versionId: string, name: string) {
    const version = quotationVersions.value.find(v => v.id === versionId)
    if (version) {
      version.versionName = name
      version.updatedAt = Date.now()
      saveQuotationVersionsToStorage()
    }
  }

  function saveQuotationVersionsToStorage() {
    try {
      localStorage.setItem(
        QUOTATION_STORAGE_KEY,
        JSON.stringify(quotationVersions.value)
      )
    } catch (e) {
      console.error('Failed to save quotation versions:', e)
    }
  }

  function loadQuotationVersionsFromStorage() {
    try {
      const stored = localStorage.getItem(QUOTATION_STORAGE_KEY)
      if (stored) {
        quotationVersions.value = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load quotation versions:', e)
    }
  }

  function deleteWorkOrder(orderNo: string) {
    workOrders.value = workOrders.value.filter(w => w.orderNo !== orderNo)
    saveWorkOrdersToStorage()
  }

  function saveWorkOrdersToStorage() {
    try {
      localStorage.setItem(WORK_ORDER_STORAGE_KEY, JSON.stringify(workOrders.value))
    } catch (e) {
      console.error('Failed to save work orders:', e)
    }
  }

  function loadWorkOrdersFromStorage() {
    try {
      const stored = localStorage.getItem(WORK_ORDER_STORAGE_KEY)
      if (stored) {
        workOrders.value = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load work orders:', e)
    }
  }

  function setOrderInfoEditing(editing: boolean) {
    isOrderInfoEditing.value = editing
    if (!editing) {
      hasUnsavedOrderChanges.value = false
    }
  }

  function setUnsavedOrderChanges(hasChanges: boolean) {
    hasUnsavedOrderChanges.value = hasChanges
  }

  const overdueWorkOrders = computed(() => {
    return workOrders.value.filter(w => {
      const level = getDeliveryWarningLevel(w.deliveryDate, w.status)
      return level === 'overdue'
    })
  })

  const warningWorkOrders = computed(() => {
    return workOrders.value.filter(w => {
      const level = getDeliveryWarningLevel(w.deliveryDate, w.status)
      return level === 'warning' || level === 'urgent'
    })
  })

  function addOperationLog(
    targetType: 'quotation' | 'workOrder' | 'scheme',
    targetId: string,
    type: OperationLog['type'],
    description: string,
    detail?: string
  ) {
    const log = createOperationLog(
      targetType,
      targetId,
      type,
      currentOperator.value,
      description,
      detail
    )
    operationLogs.value.unshift(log)
    saveOperationLogsToStorage()
  }

  function saveOperationLogsToStorage() {
    try {
      localStorage.setItem(
        OPERATION_LOG_STORAGE_KEY,
        JSON.stringify(operationLogs.value.slice(0, 500))
      )
    } catch (e) {
      console.error('Failed to save operation logs:', e)
    }
  }

  function loadOperationLogsFromStorage() {
    try {
      const stored = localStorage.getItem(OPERATION_LOG_STORAGE_KEY)
      if (stored) {
        operationLogs.value = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load operation logs:', e)
    }
  }

  function getOperationLogsByTarget(
    targetType: 'quotation' | 'workOrder' | 'scheme',
    targetId: string
  ): OperationLog[] {
    return operationLogs.value.filter(
      l => l.targetType === targetType && l.targetId === targetId
    )
  }

  function approveQuotationVersion(
    versionId: string,
    status: ApprovalStatus,
    comment: string = ''
  ): boolean {
    const version = quotationVersions.value.find(v => v.id === versionId)
    if (!version) return false

    const record = createApprovalRecord(
      versionId,
      status,
      currentOperator.value,
      comment
    )
    version.approvalRecords.push(record)
    version.approvalStatus = status
    version.updatedAt = Date.now()

    const statusLabels: Record<ApprovalStatus, string> = {
      pending: '待审批',
      approved: '审批通过',
      rejected: '审批拒绝',
      revision: '需修改'
    }
    addOperationLog(
      'quotation',
      versionId,
      'approval',
      `报价版本${statusLabels[status]}`,
      comment || undefined
    )

    saveQuotationVersionsToStorage()
    return true
  }

  function updateWorkOrderStatus(orderNo: string, status: WorkOrderStatus, remark: string = '') {
    const order = workOrders.value.find(w => w.orderNo === orderNo)
    if (order) {
      const fromStatus = order.status
      order.status = status
      
      const flowRecord = createFlowRecord(
        orderNo,
        fromStatus,
        status,
        currentOperator.value,
        remark
      )
      order.flowRecords.push(flowRecord)

      if (status === 'completed') {
        order.actualFinishDate = Date.now()
      }

      const statusLabels: Record<WorkOrderStatus, string> = {
        draft: '草稿',
        confirmed: '已确认',
        inProgress: '生产中',
        completed: '已完成'
      }
      addOperationLog(
        'workOrder',
        orderNo,
        'status_change',
        `工单状态变更：${statusLabels[fromStatus]} → ${statusLabels[status]}`,
        remark || undefined
      )

      saveWorkOrdersToStorage()
    }
  }

  function updateProductionNode(
    orderNo: string,
    nodeId: string,
    updates: Partial<ProductionNode>
  ) {
    const order = workOrders.value.find(w => w.orderNo === orderNo)
    if (!order) return

    const node = order.productionNodes.find(n => n.id === nodeId)
    if (node) {
      const oldStatus = node.status
      Object.assign(node, updates)
      
      if (updates.status && updates.status !== oldStatus) {
        if (updates.status === 'inProgress' && !node.startTime) {
          node.startTime = Date.now()
        }
        if (updates.status === 'completed' && !node.endTime) {
          node.endTime = Date.now()
        }
      }

      const nodeStatusLabels: Record<string, string> = {
        pending: '待开始',
        inProgress: '进行中',
        completed: '已完成',
        skipped: '已跳过'
      }
      if (updates.status) {
        addOperationLog(
          'workOrder',
          orderNo,
          'update',
          `生产节点「${node.name}」状态变更：${nodeStatusLabels[oldStatus]} → ${nodeStatusLabels[updates.status]}`
        )
      }

      const allCompleted = order.productionNodes.every(n => n.status === 'completed' || n.status === 'skipped')
      const anyInProgress = order.productionNodes.some(n => n.status === 'inProgress')
      
      if (allCompleted && order.status !== 'completed') {
        updateWorkOrderStatus(orderNo, 'completed', '所有生产节点已完成')
      } else if (anyInProgress && order.status === 'confirmed') {
        updateWorkOrderStatus(orderNo, 'inProgress', '生产节点开始执行')
      }

      saveWorkOrdersToStorage()
    }
  }

  function addProductionNode(orderNo: string, node: Omit<ProductionNode, 'id'>) {
    const order = workOrders.value.find(w => w.orderNo === orderNo)
    if (order) {
      const newNode: ProductionNode = {
        ...node,
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
      }
      order.productionNodes.push(newNode)
      order.productionNodes.sort((a, b) => a.sortOrder - b.sortOrder)
      saveWorkOrdersToStorage()
      addOperationLog('workOrder', orderNo, 'update', `新增生产节点：${node.name}`)
    }
  }

  function removeProductionNode(orderNo: string, nodeId: string) {
    const order = workOrders.value.find(w => w.orderNo === orderNo)
    if (order) {
      const node = order.productionNodes.find(n => n.id === nodeId)
      order.productionNodes = order.productionNodes.filter(n => n.id !== nodeId)
      saveWorkOrdersToStorage()
      if (node) {
        addOperationLog('workOrder', orderNo, 'delete', `删除生产节点：${node.name}`)
      }
    }
  }

  function getWorkOrderByNo(orderNo: string): WorkOrderData | undefined {
    return workOrders.value.find(w => w.orderNo === orderNo)
  }

  function getQuotationVersionsByScheme(schemeId: string): QuotationVersion[] {
    return quotationVersions.value.filter(v => v.schemeId === schemeId)
  }

  function getWorkOrdersByQuotation(quotationId: string): WorkOrderData[] {
    return workOrders.value.filter(w => w.quotationId === quotationId)
  }

  function getWorkOrdersByScheme(schemeId: string): WorkOrderData[] {
    return workOrders.value.filter(w => w.schemeId === schemeId)
  }

  function sendCustomerConfirmation(
    targetType: 'quotation' | 'workOrder',
    targetId: string
  ): boolean {
    if (targetType === 'quotation') {
      const version = quotationVersions.value.find(v => v.id === targetId)
      if (!version) return false
      version.customerConfirmation = createCustomerConfirmation('quotation', targetId)
      version.updatedAt = Date.now()
      saveQuotationVersionsToStorage()
      addOperationLog('quotation', targetId, 'customer_confirm', '已发送客户确认')
      return true
    } else {
      const order = workOrders.value.find(w => w.orderNo === targetId)
      if (!order) return false
      order.customerConfirmation = createCustomerConfirmation('workOrder', targetId)
      saveWorkOrdersToStorage()
      addOperationLog('workOrder', targetId, 'customer_confirm', '已发送客户确认')
      return true
    }
  }

  function updateCustomerConfirmation(
    targetType: 'quotation' | 'workOrder',
    targetId: string,
    status: CustomerConfirmStatus,
    customerName?: string,
    comment?: string
  ): boolean {
    let confirmation: CustomerConfirmation | undefined
    
    if (targetType === 'quotation') {
      const version = quotationVersions.value.find(v => v.id === targetId)
      if (!version || !version.customerConfirmation) return false
      confirmation = version.customerConfirmation
      version.updatedAt = Date.now()
      saveQuotationVersionsToStorage()
    } else {
      const order = workOrders.value.find(w => w.orderNo === targetId)
      if (!order || !order.customerConfirmation) return false
      confirmation = order.customerConfirmation
      saveWorkOrdersToStorage()
    }

    confirmation.status = status
    if (customerName) confirmation.customerName = customerName
    if (comment) confirmation.comment = comment
    if (status === 'confirmed' || status === 'rejected') {
      confirmation.confirmedAt = Date.now()
    }

    const statusLabels: Record<CustomerConfirmStatus, string> = {
      pending: '待确认',
      viewed: '已查看',
      confirmed: '已确认',
      rejected: '已拒绝'
    }

    addOperationLog(
      targetType,
      targetId,
      'customer_confirm',
      `客户确认状态：${statusLabels[status]}`,
      comment || undefined
    )

    return true
  }

  function getDeliveryWarning(orderNo: string): DeliveryWarningLevel {
    const order = workOrders.value.find(w => w.orderNo === orderNo)
    if (!order) return 'normal'
    return getDeliveryWarningLevel(order.deliveryDate, order.status)
  }

  function getProductionProgress(orderNo: string): number {
    const order = workOrders.value.find(w => w.orderNo === orderNo)
    if (!order) return 0
    return calculateProductionProgress(order.productionNodes)
  }

  function saveQuotationVersion(versionName: string, schemeId?: string, schemeName?: string): QuotationVersion | null {
    if (patternStore.placedPatterns.length === 0) {
      return null
    }

    const version = createQuotationVersion(
      versionName,
      customerInfo.value,
      craftNotes.value,
      deliveryDate.value,
      quantity.value,
      patternStore.silverSheet,
      patternStore.patternTemplates,
      patternStore.placedPatterns,
      patternStore.getCanvasView(),
      quotationConfig.value,
      schemeId,
      schemeName
    )

    quotationVersions.value.push(version)
    currentVersionId.value = version.id
    saveQuotationVersionsToStorage()
    
    addOperationLog('quotation', version.id, 'create', `创建报价版本：${versionName}`)
    
    return version
  }

  function createWorkOrder(quotationId: string, status: WorkOrderStatus = 'draft'): WorkOrderData | null {
    const quotation = quotationVersions.value.find(v => v.id === quotationId)
    if (!quotation) return null

    const workOrder = createWorkOrderFromQuotation(quotation, status, currentOperator.value)
    workOrders.value.push(workOrder)
    saveWorkOrdersToStorage()
    
    addOperationLog(
      'workOrder',
      workOrder.orderNo,
      'create',
      `创建工单：${workOrder.orderNo}`,
      `来源报价版本：${quotation.versionName}`
    )
    
    return workOrder
  }

  function resetForm() {
    customerInfo.value = { ...DEFAULT_CUSTOMER_INFO }
    craftNotes.value = ''
    deliveryDate.value = ''
    quantity.value = 1
    customProcesses.value = null
    currentVersionId.value = null
    isOrderInfoEditing.value = false
    hasUnsavedOrderChanges.value = false
  }

  return {
    customerInfo,
    craftNotes,
    deliveryDate,
    quantity,
    quotationConfig,
    customProcesses,
    quotationVersions,
    currentVersionId,
    currentVersion,
    currentBreakdown,
    workOrders,
    operationLogs,
    isOrderInfoEditing,
    hasUnsavedOrderChanges,
    currentOperator,
    overdueWorkOrders,
    warningWorkOrders,
    setCustomerInfo,
    setCraftNotes,
    setDeliveryDate,
    setQuantity,
    setQuotationConfig,
    updateProcess,
    addProcess,
    removeProcess,
    resetCustomProcesses,
    setOrderInfoEditing,
    setUnsavedOrderChanges,
    saveQuotationVersion,
    loadQuotationVersion,
    deleteQuotationVersion,
    updateQuotationVersionName,
    loadQuotationVersionsFromStorage,
    createWorkOrder,
    updateWorkOrderStatus,
    deleteWorkOrder,
    loadWorkOrdersFromStorage,
    resetForm,
    approveQuotationVersion,
    updateProductionNode,
    addProductionNode,
    removeProductionNode,
    getWorkOrderByNo,
    getQuotationVersionsByScheme,
    getWorkOrdersByQuotation,
    getWorkOrdersByScheme,
    addOperationLog,
    loadOperationLogsFromStorage,
    getOperationLogsByTarget,
    sendCustomerConfirmation,
    updateCustomerConfirmation,
    getDeliveryWarning,
    getProductionProgress
  }
})
