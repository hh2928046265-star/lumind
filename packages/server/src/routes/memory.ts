import { Hono } from "hono"
import { store } from "../db"
import { promoteCoreMemories, createMemorySnapshot, searchSimilarMemories, indexAllMemories } from "../services/memory/extractor"

export const memoryRoutes = new Hono()

// 获取记忆图谱
memoryRoutes.get("/", (c) => {
  const nodes = store.memoryNodes.findAll().map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    isCore: n.isCore === 1,
    coreScore: n.coreScore,
    sourceType: n.sourceType,
    createdAt: n.createdAt,
  }))

  const edges = store.memoryEdges.findAll().map((e) => ({
    id: e.id,
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    relationType: e.relationType,
    weight: e.weight,
    aiGenerated: e.aiGenerated === 1,
  }))

  const coreCount = nodes.filter((n) => n.isCore).length

  return c.json({
    success: true,
    data: {
      nodes,
      edges,
      stats: { totalNodes: nodes.length, totalEdges: edges.length, coreNodes: coreCount },
    },
  })
})

// 语义搜索记忆（优先使用 embedding，降级为关键词搜索）
memoryRoutes.get("/search", async (c) => {
  const q = c.req.query("q") || ""
  if (!q) return c.json({ success: true, data: [] })

  try {
    // 尝试语义搜索
    const results = await searchSimilarMemories(q, 10, 0.3)
    const nodes = results.map(r => ({
      id: r.node.id,
      title: r.node.title,
      content: r.node.content,
      isCore: r.node.isCore === 1,
      coreScore: r.node.coreScore,
      similarity: Math.round(r.similarity * 100) / 100,
    }))
    return c.json({ success: true, data: nodes, mode: "semantic" })
  } catch {
    // 降级为关键词搜索
    const keyword = q.toLowerCase()
    const nodes = store.memoryNodes
      .findAll((n: any) => n.title.toLowerCase().includes(keyword) || n.content.toLowerCase().includes(keyword))
      .sort((a: any, b: any) => b.coreScore - a.coreScore)
      .slice(0, 10)
      .map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        isCore: n.isCore === 1,
        coreScore: n.coreScore,
      }))
    return c.json({ success: true, data: nodes, mode: "keyword" })
  }
})

// 手动晋升核心记忆
memoryRoutes.post("/promote", async (c) => {
  const body = await c.req.json()

  if (body.nodeId) {
    const node = store.memoryNodes.findById(body.nodeId)
    if (!node) return c.json({ success: false, error: "记忆节点不存在" }, 404)

    const now = new Date().toISOString()
    store.memoryNodes.update(body.nodeId, {
      isCore: body.isCore ? 1 : 0,
      coreScore: body.coreScore ?? node.coreScore,
      promotedAt: now,
      updatedAt: now,
    })
    return c.json({ success: true, data: { promoted: [node.title] } })
  }

  // 自动晋升
  const promoted = promoteCoreMemories()
  return c.json({ success: true, data: { promoted } })
})

// 创建快照
// 批量索引所有记忆（生成 embedding）
memoryRoutes.post("/index", async (c) => {
  try {
    const result = await indexAllMemories()
    return c.json({ success: true, data: result })
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 500)
  }
})

memoryRoutes.post("/snapshot", (c) => {
  const id = createMemorySnapshot()
  return c.json({ success: true, data: { snapshotId: id } })
})

// 获取快照列表
memoryRoutes.get("/snapshots", (c) => {
  const snapshots = store.memorySnapshots
    .findAll()
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
    .slice(0, 20)
    .map((s) => ({
      id: s.id,
      capturedAt: s.capturedAt,
      nodeCount: s.nodeCount,
      edgeCount: s.edgeCount,
      coreShifts: JSON.parse(s.coreShifts || "[]"),
    }))

  return c.json({ success: true, data: snapshots })
})
