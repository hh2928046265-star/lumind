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
