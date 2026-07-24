/** 作品草稿 */
export interface Draft {
  id: string
  workspaceId: string
  title: string
  format: OutputFormat
  /** 当前内容 */
  content: string
  /** 生成来源（Canvas 结构 ID） */
  sourceStructureId?: string
  /** 版本历史 */
  versions: DraftVersion[]
  /** AI 流水线状态 */
  pipelineStatus: DraftPipelineStatus
  /** 关联的复盘卡 */
  reviewCardId?: string
  status: 'idea' | 'outline' | 'draft' | 'revision' | 'final'
  /** 引用计数保护 */
  referencedAssetIds: string[]
  createdAt: string
  updatedAt: string
}

export interface DraftVersion {
  id: string
  draftId: string
  versionNumber: number
  content: string
  /** 变更说明 */
  changeDescription: string
  /** 谁改的 */
  changedBy: 'user' | 'writer_agent' | 'editor_agent' | 'critic_agent'
  createdAt: string
}

export interface DraftPipelineStatus {
  /** Writer 是否已生成 */
  writerCompleted: boolean
  /** Critic 是否已审阅 */
  criticCompleted: boolean
  /** Critic 指出的问题 */
  criticIssues: CriticIssue[]
  /** 复检是否完成 */
  recheckCompleted: boolean
  /** Editor 是否已润色 */
  editorCompleted: boolean
}

export interface CriticIssue {
  id: string
  severity: 'high' | 'medium' | 'low'
  /** 问题描述 */
  description: string
  /** 位置（段落索引） */
  location?: string
  /** 复检状态 */
  recheckStatus: 'pending' | 'fixed' | 'partial' | 'still_exists'
  /** 用户是否选择忽略 */
  ignored: boolean
}

export type OutputFormat = 
  | 'wechat_article'
  | 'blog'
  | 'newsletter'
  | 'video_script'
  | 'speech'
  | 'book_chapter'
  | 'social_media'

/** 创作复盘卡 */
export interface ReviewCard {
  id: string
  draftId: string
  /** 是否与最初意图一致 */
  intentMatch: 'fully' | 'partial' | 'deviated'
  /** 偏航描述 */
  deviationNote?: string
  /** Critic 问题解决情况 */
  criticIssuesResolved: 'all' | 'partial' | 'none'
  /** 未解决的问题 */
  unresolvedIssues?: string[]
  /** 耗时感受 */
  timeFeeling: 'faster' | 'normal' | 'slower'
  /** 下次改进方向 */
  improvementNote?: string
  createdAt: string
}
