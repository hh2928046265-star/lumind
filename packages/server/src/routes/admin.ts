import { Hono } from "hono"
import { store } from "../db"
import fs from "node:fs"
import path from "node:path"
import { createNotification } from "../services/notification"

export const adminRoutes = new Hono()

// 数据导出
adminRoutes.get("/export", async (c) => {
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: "0.2.0",
    identity: store.identities.findAll(),
    goals: store.goals.findAll(),
    projects: store.projects.findAll(),
    workspaces: store.workspaces.findAll(),
    canvases: store.canvases.findAll(),
    canvasNodes: store.canvasNodes.findAll(),
    canvasEdges: store.canvasEdges.findAll(),
    drafts: store.drafts.findAll(),
    draftVersions: store.draftVersions.findAll(),
    reviewCards: store.reviewCards.findAll(),
    memoryNodes: store.memoryNodes.findAll(),
    memoryEdges: store.memoryEdges.findAll(),
    memorySnapshots: store.memorySnapshots.findAll(),
    agentCalls: store.agentCalls.findAll(),
    notifications: store.notifications.findAll(),
  }

  const json = JSON.stringify(exportData, null, 2)

  c.header("Content-Type", "application/json")
  c.header("Content-Disposition", `attachment; filename="ai-creator-os-export-${new Date().toISOString().slice(0, 10)}.json"`)
  return c.body(json)
})

// 系统状态
adminRoutes.get("/status", (c) => {
  return c.json({
    success: true,
    data: {
      workspaceCount: store.workspaces.count(),
      draftCount: store.drafts.count(),
      memoryNodeCount: store.memoryNodes.count(),
      agentCallCount: store.agentCalls.count(),
      notificationCount: store.notifications.count(),
      unreadNotificationCount: store.notifications.count((n) => n.read === 0),
    },
  })
})
