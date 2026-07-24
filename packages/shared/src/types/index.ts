/** 统一导出 */
export * from './identity'
export * from './workspace'
export * from './canvas'
export * from './memory'
export * from './draft'
export * from './agent'

// ============ 通用类型 ============

/** API 响应包装 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/** 分页 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** 数据隐私级别 */
export type PrivacyLevel = 0 | 1 | 2

/** LLM 模型配置 */
export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'deepseek'
  model: string
  apiKey?: string
  baseUrl?: string
}

/** 系统配置 */
export interface SystemConfig {
  llm: {
    cloud: LLMConfig      // 云端模型（Draft、Critic）
    local: LLMConfig      // 本地模型（Canvas AI、Curator）
    monthlyBudget: number // 月度 API 预算上限
  }
  privacy: {
    /** 全局开关：仅使用本地模型 */
    localOnly: boolean
    /** 模块级配置 */
    moduleSettings: Record<string, PrivacyLevel>
  }
  backup: {
    autoBackup: boolean
    backupInterval: 'daily' | 'weekly'
    backupPath: string
    retentionDays: number
  }
}

/** 通知等级 */
export type NotificationLevel = 1 | 2 | 3

export interface Notification {
  id: string
  level: NotificationLevel
  title: string
  content: string
  source: string
  link?: string
  read: boolean
  createdAt: string
}
