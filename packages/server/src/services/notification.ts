/**
 * 通知服务
 * 统一的通知创建和分发
 */
import { store, uuidv7 } from "../db"

export type NotificationLevel = 0 | 1 | 2 // info | warning | important

export interface CreateNotificationParams {
  level?: NotificationLevel
  title: string
  content: string
  source: string
  link?: string
}

export function createNotification(params: CreateNotificationParams): string {
  const id = uuidv7()
  store.notifications.insert({
    id,
    userId: "default",
    level: params.level ?? 0,
    title: params.title,
    content: params.content,
    source: params.source,
    link: params.link || "",
    read: 0,
    createdAt: new Date().toISOString(),
  })
  return id
}

/**
 * 通知工厂方法
 */
export const notify = {
  pipelineComplete(draftTitle: string, draftId: string) {
    return createNotification({
      level: 1,
      title: "创作完成",
      content: `AI 已完成草稿《${draftTitle}》，点击查看`,
      source: "agent",
      link: `#draft-${draftId}`,
    })
  },

  memoryExtracted(nodeCount: number, edgeCount: number) {
    return createNotification({
      level: 0,
      title: "记忆已沉淀",
      content: `从创作中提取了 ${nodeCount} 个新概念、${edgeCount} 条关系`,
      source: "memory",
      link: "/memory",
    })
  },

  corePromoted(nodeTitles: string[]) {
    if (nodeTitles.length === 0) return ""
    return createNotification({
      level: 1,
      title: "核心概念晋升",
      content: `${nodeTitles.join("、")} 已晋升为核心概念`,
      source: "memory",
      link: "/memory",
    })
  },

  identityUpdated(feedbackSummary: string) {
    return createNotification({
      level: 0,
      title: "偏好已更新",
      content: `AI 根据你的反馈调整了创作偏好: ${feedbackSummary}`,
      source: "identity",
      link: "/identity",
    })
  },

  workspaceCreated(wsTitle: string, wsId: string) {
    return createNotification({
      level: 0,
      title: "新创作空间",
      content: `已创建《${wsTitle}》，开始添加想法吧`,
      source: "workspace",
      link: `/workspace/${wsId}`,
    })
  },

  focusComplete(duration: number) {
    return createNotification({
      level: 0,
      title: "专注完成",
      content: `完成 ${duration} 分钟专注创作，继续保持！`,
      source: "focus",
    })
  },
}
