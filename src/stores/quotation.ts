import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CustomerInfo,
  QuotationConfig,
  QuotationBreakdown,
  QuotationVersion,
  WorkOrderData,
  CraftProcess,
  WorkOrderStatus
} from '@/types/quotation'
import {
  DEFAULT_QUOTATION_CONFIG,
  DEFAULT_CUSTOMER_INFO,
  calculateQuotationBreakdown,
  recalculateBreakdownWithProcesses,
  createQuotationVersion,
  createWorkOrderFromQuotation
} from '@/utils/quotationUtils'
import { usePatternStore } from './pattern'

const QUOTATION_STORAGE_KEY = 'silver-quotation-versions'
const WORK_ORDER_STORAGE_KEY = 'silver-work-orders'

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

  const quotationVersions = ref<QuotationVersion[]>([])
  const currentVersionId = ref<string | null>(null)

  const workOrders = ref<WorkOrderData[]>([])

  const currentBreakdown = computed<QuotationBreakdown>(() => {
    return calculateQuotationBreakdown(
      patternStore.patternTemplates,
      patternStore.placedPatterns,
      quantity.value,
      quotationConfig.value
    )
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

  function updateProcess(processId: string, updates: Partial<CraftProcess>) {
    const processes = [...currentBreakdown.value.processes]
    const index = processes.findIndex(p => p.id === processId)
    if (index !== -1) {
      processes[index] = { ...processes[index], ...updates }
      processes[index].totalPrice = Math.round(
        processes[index].unitPrice * processes[index].quantity * 100
      ) / 100
    }
    return recalculateBreakdownWithProcesses(
      currentBreakdown.value,
      processes,
      quantity.value,
      quotationConfig.value
    )
  }

  function addProcess(process: Omit<CraftProcess, 'id' | 'totalPrice'>) {
    const newProcess: CraftProcess = {
      ...process,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      totalPrice: Math.round(process.unitPrice * process.quantity * 100) / 100
    }
    const processes = [...currentBreakdown.value.processes, newProcess]
    return recalculateBreakdownWithProcesses(
      currentBreakdown.value,
      processes,
      quantity.value,
      quotationConfig.value
    )
  }

  function removeProcess(processId: string) {
    const processes = currentBreakdown.value.processes.filter(p => p.id !== processId)
    return recalculateBreakdownWithProcesses(
      currentBreakdown.value,
      processes,
      quantity.value,
      quotationConfig.value
    )
  }

  function saveQuotationVersion(versionName: string): QuotationVersion | null {
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
      quotationConfig.value
    )

    quotationVersions.value.push(version)
    currentVersionId.value = version.id
    saveQuotationVersionsToStorage()
    return version
  }

  function loadQuotationVersion(versionId: string): boolean {
    const version = quotationVersions.value.find(v => v.id === versionId)
    if (!version) return false

    customerInfo.value = { ...version.customerInfo }
    craftNotes.value = version.craftNotes
    deliveryDate.value = version.deliveryDate
    quantity.value = version.quantity
    quotationConfig.value = JSON.parse(JSON.stringify(version.config))

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

  function createWorkOrder(quotationId: string, status: WorkOrderStatus = 'draft'): WorkOrderData | null {
    const quotation = quotationVersions.value.find(v => v.id === quotationId)
    if (!quotation) return null

    const workOrder = createWorkOrderFromQuotation(quotation, status)
    workOrders.value.push(workOrder)
    saveWorkOrdersToStorage()
    return workOrder
  }

  function updateWorkOrderStatus(orderNo: string, status: WorkOrderStatus) {
    const order = workOrders.value.find(w => w.orderNo === orderNo)
    if (order) {
      order.status = status
      saveWorkOrdersToStorage()
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

  function resetForm() {
    customerInfo.value = { ...DEFAULT_CUSTOMER_INFO }
    craftNotes.value = ''
    deliveryDate.value = ''
    quantity.value = 1
    currentVersionId.value = null
  }

  return {
    customerInfo,
    craftNotes,
    deliveryDate,
    quantity,
    quotationConfig,
    quotationVersions,
    currentVersionId,
    currentVersion,
    currentBreakdown,
    workOrders,
    setCustomerInfo,
    setCraftNotes,
    setDeliveryDate,
    setQuantity,
    setQuotationConfig,
    updateProcess,
    addProcess,
    removeProcess,
    saveQuotationVersion,
    loadQuotationVersion,
    deleteQuotationVersion,
    updateQuotationVersionName,
    loadQuotationVersionsFromStorage,
    createWorkOrder,
    updateWorkOrderStatus,
    deleteWorkOrder,
    loadWorkOrdersFromStorage,
    resetForm
  }
})
