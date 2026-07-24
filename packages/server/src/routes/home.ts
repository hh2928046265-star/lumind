import { Hono } from "hono"
import { store } from "../db"

export const homeRoutes = new Hono()

homeRoutes.get("/daily-brief", (c) => {
  const now = Date.now()
  const oneDayAgo = new Date(now - 86400000).toISOString()

  // 统计
  const memoryNodes = store.memoryNodes.findAll()
  const coreNodes = memoryNodes.filter((n) => n.isCore === 1)
  const recentDrafts = store.drafts.findAll((d) => d.updatedAt >= oneDayAgo)
  const activeWorkspaces = store.workspaces.findAll((w) => w.status === "active")
  const recentAgentCalls = store.agentCalls.findAll((a) => a.startedAt >= oneDayAgo)

  // 今日焦点：高 coreScore 的记忆节点
  const focusNodes = coreNodes
    .sort((a, b) => b.coreScore - a.coreScore)
    .slice(0, 5)
    .map((n) => ({ id: n.id, title: n.title, score: n.coreScore }))

  // 偶然发现：最近创建但还没被引用的节点
  const serendipity = memoryNodes
    .filter((n) => n.isCore === 0 && n.coreScore > 0.4)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map((n) => ({ id: n.id, title: n.title, content: n.content.slice(0, 100) }))

  return c.json({
    success: true,
    data: {
      yesterday: {
        draftsCreated: recentDrafts.length,
        memoryNodes: memoryNodes.length,
        coreNodes: coreNodes.length,
        agentCalls: recentAgentCalls.length,
      },
      today: {
        focus: focusNodes,
        serendipity,
      },
      workspaces: activeWorkspaces.map((w) => ({
        id: w.id,
        title: w.title,
        status: w.status,
        updatedAt: w.updatedAt,
      })),
    },
  })
})
