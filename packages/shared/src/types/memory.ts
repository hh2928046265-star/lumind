/** 长期记忆 - 概念节点 */
export interface MemoryNode {
  id: string
  userId: string
  /** 概念名称 */
  title: string
  /** 概念描述（快照，晋升时的内容） */
  content: string
  /** 向量嵌入 */
  embedding: number[]
  /** 来源追溯 */
  sourceId: string
  sourceType: 'canvas_node' | 'draft' | 'asset' | 'manual'
  /** 重要性 */
  isCore: boolean
  coreScore: number          // 系统自动计算（被引用次数 × 广度）
  /** 演化追踪 */
  promotedAt: string         // 晋升为 Memory 的时间
  snapshotVersion: number    // 快照版本
  sourceHasUpdate: boolean   // 源数据是否有更新
  lastAccessedAt: string
  createdAt: string
  updatedAt: string
}

/** 长期记忆 - 关系边 */
export interface MemoryEdge {
  id: string
  userId: string
  fromNodeId: string
  toNodeId: string
  relationType: 'supports' | 'contradicts' | 'extends' | 'relates_to'
  weight: number             // 关系强度
  aiGenerated: boolean
  /** 来源 */
  sourceEdgeId?: string      // 来自 Canvas 连线
  sourceType: 'canvas_edge' | 'ai_discovered' | 'manual'
  lastAccessedAt: string
  createdAt: string
}

/** Memory 快照（用于 Evolution 时间对比） */
export interface MemorySnapshot {
  id: string
  userId: string
  /** 快照时间 */
  capturedAt: string
  /** 节点头数 */
  nodeCount: number
  /** 边数量 */
  edgeCount: number
  /** 核心概念变化 */
  coreConceptShifts: CoreConceptShift[]
  /** 序列化的完整图数据 */
  graphData: string          // JSON 序列化
}

export interface CoreConceptShift {
  conceptId: string
  title: string
  previousWeight: number
  currentWeight: number
  direction: 'rising' | 'falling' | 'stable'
}
