/** 思考画布 */
export interface Canvas {
  id: string
  workspaceId: string
  title: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  /** 视图配置（缩放、位置） */
  viewport: ViewportState
  createdAt: string
  updatedAt: string
}

export type CanvasNodeType = 'idea' | 'quote' | 'image' | 'question' | 'reference'

export interface CanvasNode {
  id: string
  canvasId: string
  type: CanvasNodeType
  content: string
  summary?: string           // AI 自动生成的简短摘要
  position: { x: number; y: number }
  /** 来源追溯 */
  sourceId?: string          // 来自 Inbox / Memory / Asset
  sourceType?: 'inbox' | 'memory' | 'asset' | 'manual'
  /** AI 元数据 */
  embedding?: number[]       // 向量（可选，用于语义搜索）
  aiGenerated: boolean
  aiSuggestions: AISuggestion[]
  /** 用户对 AI 建议的反馈 */
  userFeedback?: 'accepted' | 'rejected' | 'modified'
  version: number            // 乐观锁版本号
  createdAt: string
  updatedAt: string
}

export interface CanvasEdge {
  id: string
  canvasId: string
  fromNodeId: string
  toNodeId: string
  relationType: RelationType
  /** 用户手动创建还是 AI 推荐 */
  aiGenerated: boolean
  /** AI 推荐但用户尚未确认 */
  aiRecommended: boolean
  /** 推荐置信度 */
  aiConfidence?: number
  version: number
  createdAt: string
  updatedAt: string
}

export type RelationType = 'supports' | 'contradicts' | 'extends' | 'relates_to'

export interface AISuggestion {
  id: string
  type: 'connection' | 'challenge' | 'expand' | 'structure' | 'research'
  content: string
  /** 关联的节点 ID */
  targetNodeIds: string[]
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export interface ViewportState {
  x: number
  y: number
  zoom: number
}
