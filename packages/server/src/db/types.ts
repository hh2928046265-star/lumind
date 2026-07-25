/** 存储层扁平记录类型（JSON 友好） */

export interface IdentityRecord {
  id: string
  userId: string
  domains: string          // JSON array
  aestheticPrefs: string   // JSON
  writingStyle: string     // JSON
  learnedWeights: string   // JSON
  createdAt: string
  updatedAt: string
}

export interface GoalRecord {
  id: string
  userId: string
  title: string
  description: string
  status: string
  insights: string         // JSON
  createdAt: string
  updatedAt: string
}

export interface ProjectRecord {
  id: string
  userId: string
  goalId: string
  title: string
  description: string
  status: string
  workspaceIds: string     // JSON array
  metrics: string          // JSON
  createdAt: string
  updatedAt: string
}

export interface WorkspaceRecord {
  id: string
  userId: string
  projectId: string
  title: string
  description: string
  status: string
  canvasId: string
  draftIds: string         // JSON array
  assetIds: string         // JSON array
  actionIds: string        // JSON array
  focusSessionIds: string  // JSON array
  createdAt: string
  updatedAt: string
  archivedAt: string
}

export interface CanvasRecord {
  id: string
  workspaceId: string
  title: string
  viewport: string         // JSON
  createdAt: string
  updatedAt: string
}

export interface CanvasNodeRecord {
  id: string
  canvasId: string
  type: string
  content: string
  summary: string
  positionX: number
  positionY: number
  sourceId: string
  sourceType: string
  aiGenerated: number
  aiSuggestions: string    // JSON array
  userFeedback: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface CanvasEdgeRecord {
  id: string
  canvasId: string
  fromNodeId: string
  toNodeId: string
  relationType: string
  aiGenerated: number
  aiRecommended: number
  aiConfidence: number
  version: number
  createdAt: string
  updatedAt: string
}

export interface DraftRecord {
  id: string
  workspaceId: string
  title: string
  format: string
  content: string
  sourceStructureId: string
  pipelineStatus: string   // JSON
  reviewCardId: string
  status: string
  referencedAssetIds: string // JSON array
  createdAt: string
  updatedAt: string
}

export interface DraftVersionRecord {
  id: string
  draftId: string
  versionNumber: number
  content: string
  changeDescription: string
  changedBy: string
  createdAt: string
}

export interface ReviewCardRecord {
  id: string
  draftId: string
  intentMatch: string
  deviationNote: string
  criticIssuesResolved: string
  unresolvedIssues: string // JSON array
  timeFeeling: string
  improvementNote: string
  createdAt: string
}

export interface MemoryNodeRecord {
  id: string
  userId: string
  title: string
  content: string
  sourceId: string
  sourceType: string
  isCore: number
  coreScore: number
  promotedAt: string
  snapshotVersion: number
  sourceHasUpdate: number
  embedding: string
  lastAccessedAt: string
  createdAt: string
  updatedAt: string
}

export interface MemoryEdgeRecord {
  id: string
  userId: string
  fromNodeId: string
  toNodeId: string
  relationType: string
  weight: number
  aiGenerated: number
  sourceEdgeId: string
  sourceType: string
  lastAccessedAt: string
  createdAt: string
}

export interface MemorySnapshotRecord {
  id: string
  userId: string
  capturedAt: string
  nodeCount: number
  edgeCount: number
  coreShifts: string       // JSON
  graphData: string
}

export interface AgentCallRecord {
  id: string
  workspaceId: string
  agentType: string
  inputSummary: string
  outputSummary: string
  status: string
  degradationReason: string
  tokenUsage: string       // JSON
  userFeedback: string
  startedAt: string
  completedAt: string
}

export interface SystemConfigRecord {
  id: string
  config: string            // JSON
  updatedAt: string
}

export interface NotificationRecord {
  id: string
  userId: string
  level: number
  title: string
  content: string
  source: string
  link: string
  read: number
  createdAt: string
}


// ===== 知识库 =====

export interface KnowledgeBaseRecord {
  id: string
  userId: string
  name: string
  description: string
  icon: string           // emoji
  color: string           // tailwind color class
  sourceCount: number
  conceptCount: number
  createdAt: string
  updatedAt: string
}

// ===== 学习模块 =====

export interface SourceRecord {
  knowledgeBaseId: string
  id: string
  userId: string
  title: string
  type: string           // "text" | "url" | "pdf"
  rawContent: string
  summary: string
  conceptIds: string     // JSON array
  createdAt: string
}

export interface ConceptRecord {
  knowledgeBaseId: string
  id: string
  sourceIds: string      // JSON array (一个概念可来自多份资料)
  title: string
  content: string
  category: string
  mastery: number        // 0.0-1.0 掌握度
  lastReviewedAt: string
  nextReviewAt: string
  examCount: number
  correctCount: number
  memoryNodeId: string
  createdAt: string
  updatedAt: string
}

export interface ExamRecord {
  knowledgeBaseId: string
  id: string
  userId: string
  title: string
  conceptIds: string     // JSON array
  difficulty: string     // "easy" | "hard" | "perfect"
  passThreshold: number  // 60 | 90 | 100
  passed: boolean
  questions: string      // JSON: QuestionItem[]
  answers: string        // JSON: 用户答案
  score: number          // 0-100
  feedback: string       // AI 批改全文
  status: string         // "pending" | "completed" | "reviewed"
  createdAt: string
  completedAt: string
}

export interface QuestionBankRecord {
  id: string
  conceptId: string
  conceptTitle: string
  type: string           // "choice" | "fill" | "short_answer"
  difficulty: string     // "easy" | "hard" | "perfect"
  stem: string
  options: string        // JSON | ""
  correctAnswer: string
  keyPoints: string       // JSON | ""
  explanation: string
  wrongCount: number`r`n  consecutiveCorrect: number`r`n  usageCount: number
  lastUsedAt: string
  createdAt: string
}



