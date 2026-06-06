<script setup lang="ts">import { ref, computed } from 'vue';
import { NCard, NButton, NIcon, NTag, NSpace, NEmpty, NModal, NInput, NSelect, useMessage } from 'naive-ui';
import { Play, Checkmark, ArrowForward, Pencil, Add, Trash } from '@vicons/ionicons5';
import { useQuotationStore } from '@/stores/quotation';
import { calculateProductionProgress } from '@/utils/quotationUtils';
import type { ProductionNode, ProductionNodeType } from '@/types/quotation';
import { PRODUCTION_NODE_DEFS } from '@/types/quotation';
const props = defineProps<{
 orderNo: string;
}>();
const quotationStore = useQuotationStore();
const message = useMessage();
const showAddNodeDialog = ref(false);
const showEditNodeDialog = ref(false);
const editingNode = ref<ProductionNode | null>(null);
const newNodeType = ref<ProductionNodeType>('engraving');
const newNodeName = ref('');
const newNodeRemark = ref('');
const editRemark = ref('');
const editOperator = ref('');
const workOrder = computed(() => {
 return quotationStore.getWorkOrderByNo(props.orderNo);
});
const productionNodes = computed(() => {
 return [...(workOrder.value?.productionNodes || [])].sort((a, b) => a.sortOrder - b.sortOrder);
});
const progress = computed(() => {
 return calculateProductionProgress(productionNodes.value);
});
const nodeTypeOptions = PRODUCTION_NODE_DEFS.map(d => ({
 label: d.name,
 value: d.type
}));
function getNodeStatusLabel(status: string): string {
 const labels: Record<string, string> = {
 pending: '待开始',
 inProgress: '进行中',
 completed: '已完成',
 skipped: '已跳过'
 };
 return labels[status] || status;
}
function getNodeStatusType(status: string): 'default' | 'info' | 'success' | 'warning' {
 switch (status) {
 case 'pending': return 'default';
 case 'inProgress': return 'info';
 case 'completed': return 'success';
 case 'skipped': return 'warning';
 default: return 'default';
 }
}
function formatTime(timestamp?: number): string {
 if (!timestamp)
 return '-';
 const date = new Date(timestamp);
 return date.toLocaleDateString('zh-CN', {
 month: '2-digit',
 day: '2-digit',
 hour: '2-digit',
 minute: '2-digit'
 });
}
function startNode(nodeId: string) {
 quotationStore.updateProductionNode(props.orderNo, nodeId, {
 status: 'inProgress'
 });
 message.success('节点已开始');
}
function completeNode(nodeId: string) {
 quotationStore.updateProductionNode(props.orderNo, nodeId, {
 status: 'completed'
 });
 message.success('节点已完成');
}
function skipNode(nodeId: string) {
 quotationStore.updateProductionNode(props.orderNo, nodeId, {
 status: 'skipped'
 });
 message.success('节点已跳过');
}
function resetNode(nodeId: string) {
 quotationStore.updateProductionNode(props.orderNo, nodeId, {
 status: 'pending',
 startTime: undefined,
 endTime: undefined
 });
 message.success('节点已重置');
}
function openAddNodeDialog() {
 const availableTypes = PRODUCTION_NODE_DEFS.filter(d => !productionNodes.value.some(n => n.type === d.type));
 if (availableTypes.length > 0) {
 newNodeType.value = availableTypes[0].type;
 newNodeName.value = availableTypes[0].name;
 }
 else {
 newNodeName.value = '';
 }
 newNodeRemark.value = '';
 showAddNodeDialog.value = true;
}
function handleAddNode() {
 if (!newNodeName.value.trim()) {
 message.error('请输入节点名称');
 return;
 }
 const maxSortOrder = productionNodes.value.length > 0
 ? Math.max(...productionNodes.value.map(n => n.sortOrder))
 : 0;
 quotationStore.addProductionNode(props.orderNo, {
 type: newNodeType.value,
 name: newNodeName.value.trim(),
 status: 'pending',
 remark: newNodeRemark.value || undefined,
 sortOrder: maxSortOrder + 1
 });
 message.success('节点已添加');
 showAddNodeDialog.value = false;
}
function openEditDialog(node: ProductionNode) {
 editingNode.value = node;
 editRemark.value = node.remark || '';
 editOperator.value = node.operator || '';
 showEditNodeDialog.value = true;
}
function handleEditNode() {
 if (!editingNode.value)
 return;
 quotationStore.updateProductionNode(props.orderNo, editingNode.value.id, {
 remark: editRemark.value || undefined,
 operator: editOperator.value || undefined
 });
 message.success('节点已更新');
 showEditNodeDialog.value = false;
}
function handleRemoveNode(nodeId: string) {
 quotationStore.removeProductionNode(props.orderNo, nodeId);
 message.success('节点已删除');
}
</script>

<template>
  <NCard title="生产进度" size="small" :bordered="false" class="production-progress">
    <template #header-extra>
      <div class="progress-header">
        <span class="progress-value">{{ progress }}%</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
      </div>
    </template>

    <div class="add-node-bar">
      <NButton size="tiny" type="primary" ghost @click="openAddNodeDialog">
        <template #icon>
          <NIcon><Add /></NIcon>
        </template>
        添加节点
      </NButton>
    </div>

    <div v-if="productionNodes.length === 0" class="empty-state">
      <NEmpty description="暂无生产节点" size="small" />
    </div>

    <div v-else class="nodes-timeline">
      <div
        v-for="node in productionNodes"
        :key="node.id"
        class="node-item"
        :class="{ completed: node.status === 'completed', skipped: node.status === 'skipped' }"
      >
        <div class="node-indicator">
          <div class="node-dot" :class="node.status">
            <NIcon v-if="node.status === 'completed'" size="12">
              <Checkmark />
            </NIcon>
          </div>
          <div class="node-line" v-if="node.sortOrder < productionNodes.length - 1"></div>
        </div>

        <div class="node-content">
          <div class="node-header">
            <span class="node-name">{{ node.name }}</span>
            <NTag size="small" :type="getNodeStatusType(node.status)">
              {{ getNodeStatusLabel(node.status) }}
            </NTag>
          </div>

          <div v-if="node.operator" class="node-operator">
            负责人：{{ node.operator }}
          </div>

          <div class="node-time">
            <span v-if="node.startTime">开始：{{ formatTime(node.startTime) }}</span>
            <span v-if="node.endTime"> / 完成：{{ formatTime(node.endTime) }}</span>
          </div>

          <div v-if="node.remark" class="node-remark">
            {{ node.remark }}
          </div>

          <div class="node-actions">
            <NSpace size="small">
              <NButton
                v-if="node.status === 'pending'"
                size="tiny"
                type="primary"
                ghost
                @click="startNode(node.id)"
              >
                <template #icon>
                  <NIcon size="12"><Play /></NIcon>
                </template>
                开始
              </NButton>
              <NButton
                v-if="node.status === 'inProgress'"
                size="tiny"
                type="success"
                ghost
                @click="completeNode(node.id)"
              >
                <template #icon>
                  <NIcon size="12"><Checkmark /></NIcon>
                </template>
                完成
              </NButton>
              <NButton
                v-if="node.status === 'pending'"
                size="tiny"
                type="warning"
                ghost
                @click="skipNode(node.id)"
              >
                <template #icon>
                  <NIcon size="12"><ArrowForward /></NIcon>
                </template>
                跳过
              </NButton>
              <NButton
                v-if="node.status !== 'pending'"
                size="tiny"
                ghost
                @click="resetNode(node.id)"
              >
                重置
              </NButton>
              <NButton size="tiny" ghost @click="openEditDialog(node)">
                <template #icon>
                  <NIcon size="12"><Pencil /></NIcon>
                </template>
              </NButton>
              <NButton size="tiny" type="error" ghost @click="handleRemoveNode(node.id)">
                <template #icon>
                  <NIcon size="12"><Trash /></NIcon>
                </template>
              </NButton>
            </NSpace>
          </div>
        </div>
      </div>
    </div>
  </NCard>

  <NModal
    :show="showAddNodeDialog"
    preset="card"
    title="添加生产节点"
    style="width: 360px"
    @update:show="v => showAddNodeDialog = v"
  >
    <div class="dialog-form">
      <div class="form-item">
        <label>节点类型</label>
        <NSelect
          v-model:value="newNodeType"
          :options="nodeTypeOptions"
          @update:value="val => {
            const def = PRODUCTION_NODE_DEFS.find(d => d.type === val)
            if (def) newNodeName = def.name
          }"
        />
      </div>
      <div class="form-item">
        <label>节点名称</label>
        <NInput v-model:value="newNodeName" placeholder="请输入节点名称" />
      </div>
      <div class="form-item">
        <label>备注</label>
        <NInput
          v-model:value="newNodeRemark"
          type="textarea"
          placeholder="请输入备注（可选）"
          :rows="2"
        />
      </div>
    </div>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showAddNodeDialog = false">取消</NButton>
        <NButton type="primary" @click="handleAddNode">添加</NButton>
      </NSpace>
    </template>
  </NModal>

  <NModal
    :show="showEditNodeDialog"
    preset="card"
    title="编辑节点"
    style="width: 360px"
    @update:show="v => showEditNodeDialog = v"
  >
    <div class="dialog-form">
      <div class="form-item">
        <label>负责人</label>
        <NInput v-model:value="editOperator" placeholder="请输入负责人" />
      </div>
      <div class="form-item">
        <label>备注</label>
        <NInput
          v-model:value="editRemark"
          type="textarea"
          placeholder="请输入备注（可选）"
          :rows="3"
        />
      </div>
    </div>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showEditNodeDialog = false">取消</NButton>
        <NButton type="primary" @click="handleEditNode">保存</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.production-progress {
  margin-bottom: 12px;
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.progress-value {
  font-size: 13px;
  font-weight: 600;
  color: #8B4513;
  min-width: 35px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e8e8e8;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a, #73d13d);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.add-node-bar {
  margin-bottom: 12px;
}

.empty-state {
  padding: 16px 0;
}

.nodes-timeline {
  position: relative;
}

.node-item {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}

.node-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
}

.node-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #d9d9d9;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  z-index: 1;
}

.node-dot.pending {
  border-color: #d9d9d9;
}

.node-dot.inProgress {
  border-color: #1890ff;
  background: #1890ff;
  animation: pulse 1.5s infinite;
}

.node-dot.completed {
  border-color: #52c41a;
  background: #52c41a;
}

.node-dot.skipped {
  border-color: #faad14;
  background: #fffbe6;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.node-line {
  flex: 1;
  width: 2px;
  background: #e8e8e8;
  margin: 2px 0;
  min-height: 40px;
}

.node-item.completed .node-line {
  background: #b7eb8f;
}

.node-content {
  flex: 1;
  padding-bottom: 16px;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.node-name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.node-operator {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.node-time {
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.node-remark {
  font-size: 12px;
  color: #666;
  background: #fafafa;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.node-actions {
  margin-top: 4px;
}

.dialog-form {
  .form-item {
    margin-bottom: 16px;
  }

  label {
    display: block;
    font-size: 13px;
    color: #666;
    margin-bottom: 6px;
  }
}
</style>
