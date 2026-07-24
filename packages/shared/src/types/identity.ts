/** 创作者身份模型 */
export interface Identity {
  id: string
  userId: string
  /** 兴趣领域 */
  domains: string[]
  /** 审美偏好 */
  aestheticPreferences: AestheticPreference
  /** 写作风格 */
  writingStyle: WritingStyle
  /** 从交互中学习的动态权重 */
  learnedWeights: Record<string, number>
  createdAt: string
  updatedAt: string
}

export interface AestheticPreference {
  likes: string[]
  dislikes: string[]
}

export interface WritingStyle {
  sentencePattern: string   // 句式偏好描述
  structurePattern: string  // 文章结构偏好
  commonPhrases: string[]   // 常用表达
  valueOrientation: string  // 价值倾向
}

/** 长期目标 */
export interface Goal {
  id: string
  userId: string
  title: string
  description: string
  status: 'active' | 'completed' | 'archived'
  /** Evolution 产生的可执行洞察 */
  actionableInsights: ActionableInsight[]
  createdAt: string
  updatedAt: string
}

export interface ActionableInsight {
  id: string
  type: 'weakness' | 'strength' | 'trend' | 'suggestion'
  content: string
  severity: 'low' | 'medium' | 'high'
  affectedWorkspaceIds: string[]
  createdAt: string
}
