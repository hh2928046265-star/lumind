import { Hono } from "hono"
import { store, uuidv7 } from "../db"

export const kbRoutes = new Hono()

// 创建知识库
kbRoutes.post("/", async (c) => {
  const body = await c.req.json()
  const name = (body.name as string)?.trim()
  if (!name) return c.json({ success: false, error: "请输入知识库名称" }, 400)
  const now = new Date().toISOString()
  const kb = {
    id: uuidv7(), userId: "default", name,
    description: (body.description as string) || "",
    icon: (body.icon as string) || "📚",
    color: (body.color as string) || "slate",
    sourceCount: 0, conceptCount: 0,
    createdAt: now, updatedAt: now
  }
  store.knowledgeBases.insert(kb)
  return c.json({ success: true, data: kb })
})

kbRoutes.get("/", (c) => {
  const kbs = store.knowledgeBases.findAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return c.json({ success: true, data: kbs })
})

kbRoutes.patch("/:id", async (c) => {
  const body = await c.req.json()
  const updates = { updatedAt: new Date().toISOString() } as any
  if (body.name) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  store.knowledgeBases.update(c.req.param("id"), updates)
  return c.json({ success: true })
})

kbRoutes.delete("/:id", async (c) => {
  const kbId = c.req.param("id")
  for (const s of store.sources.findAll((s: any) => s.knowledgeBaseId === kbId)) store.sources.delete(s.id)
  for (const co of store.concepts.findAll((co: any) => co.knowledgeBaseId === kbId)) {
    store.questionBank.findAll((q: any) => q.conceptId === co.id).forEach((q: any) => store.questionBank.delete(q.id))
    store.concepts.delete(co.id)
  }
  for (const e of store.exams.findAll((e: any) => e.knowledgeBaseId === kbId)) store.exams.delete(e.id)
  store.knowledgeBases.delete(kbId)
  return c.json({ success: true })
})
