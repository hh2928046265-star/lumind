import type { Canvas } from './canvas'

/** 创作空间 */
export interface Workspace {
  id: string
  userId: string
  projectId?: string
  title: string
  description?: string
  status: 'active' | 'archived' | 'closed'
  /** 关联的子对象 ID */
  canvasId?: string
  draftIds: string[]
  assetIds: string[]
  actionIds: string[]
  focusSessionIds: string[]
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

/** 项目管理 */
export interface Project {
  id: string
  userId: string
  goalId?: string
  title: string
  description?: string
  status: 'active' | 'completed' | 'paused'
  workspaceIds: string[]
  metrics: ProjectMetrics
  createdAt: string
  updatedAt: string
}

export interface ProjectMetrics {
  workspaceCount: number
  completedDrafts: number
  publishedCount: number
  totalWords: number
}
