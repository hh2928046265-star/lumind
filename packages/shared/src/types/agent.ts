/** Agent 调用记录 */
export interface AgentCall {
  id: string
  workspaceId: string
  agentType: AgentType
  /** 输入摘要（脱敏后） */
  inputSummary: string
  /** 输出摘要 */
  outputSummary: string
  /** 状态 */
  status: 'running' | 'completed' | 'failed' | 'degraded'
  /** 降级原因 */
  degradationReason?: string
  /** Token 用量 */
  tokenUsage?: TokenUsage
  /** 用户反馈 */
  userFeedback?: 'accepted' | 'rejected' | 'modified' | 'ignored'
  startedAt: string
  completedAt?: string
}

export type AgentType = 
  | 'writer'
  | 'critic'
  | 'editor'
  | 'research'
  | 'curator'
  | 'producer'

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  model: string
  cost: number
}

/** Agent 上下文组装 */
export interface AgentContext {
  /** Layer 1 - 必须包含 */
  identitySummary: string
  canvasContent: string       // 当前 Workspace 的 Canvas 序列化
  goalsSummary: string
  /** Layer 2 - 语义检索 */
  relevantMemoryNodes: MemoryContextItem[]
  /** Layer 3 - 用户行为 */
  recentReviewCards: string[]
  recentCriticFeedbacks: string[]
  /** 格式模板 */
  formatTemplate?: string
  /** 读者画像 */
  audiencePersonas?: AudiencePersona[]
}

export interface MemoryContextItem {
  nodeId: string
  title: string
  summary: string
  relevanceScore: number
}

export interface AudiencePersona {
  id: string
  name: string
  description: string
  preferences: string[]
  painPoints: string[]
}
