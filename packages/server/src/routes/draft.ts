import { Hono } from "hono"
import { store, uuidv7 } from "../db"
import { notify } from "../services/notification"

export const draftRoutes = new Hono()

// ===== 全局历史作品列表（跨所有工作空间） =====
draftRoutes.get("/", (c) => {
  const q = (c.req.query("q") || "").toLowerCase()
  const formatFilter = c.req.query("format") || ""
  const page = parseInt(c.req.query("page") || "1")
  const pageSize = parseInt(c.req.query("pageSize") || "20")

  let drafts = store.drafts
    .findAll(() => true)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  // 关联 workspace 标题
  const enriched = drafts.map((d) => {
    const ws = store.workspaces.findById(d.workspaceId)
    return {
      id: d.id,
      title: d.title,
      format: d.format,
      content: d.content,
      workspaceId: d.workspaceId,
      workspaceTitle: ws?.title || "未命名空间",
      status: d.status,
      wordCount: d.content.length,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }
  })

  // 搜索过滤
  let filtered = enriched
  if (q) {
    filtered = filtered.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q) ||
      d.workspaceTitle.toLowerCase().includes(q)
    )
  }
  if (formatFilter) {
    filtered = filtered.filter((d) => d.format === formatFilter)
  }

  const total = filtered.length
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  return c.json({
    success: true,
    data: { items: paged, total, page, pageSize },
  })
})

draftRoutes.get("/workspace/:workspaceId", (c) => {
  const workspaceId = c.req.param("workspaceId")
  const drafts = store.drafts
    .findAll((d) => d.workspaceId === workspaceId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((d) => ({
      id: d.id,
      title: d.title,
      format: d.format,
      status: d.status,
      pipelineStatus: safeJSON(d.pipelineStatus),
      reviewCardId: d.reviewCardId,
      wordCount: d.content.length,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))
  return c.json({ success: true, data: drafts })
})

draftRoutes.get("/:draftId", (c) => {
  const draftId = c.req.param("draftId")
  const draft = store.drafts.findById(draftId)
  if (!draft) return c.json({ success: false, error: "作品不存在" }, 404)
  const versions = store.draftVersions.findAll((v) => v.draftId === draftId).sort((a, b) => b.versionNumber - a.versionNumber)
  let reviewCard = null
  if (draft.reviewCardId) {
    reviewCard = store.reviewCards.findById(draft.reviewCardId)
    if (reviewCard) reviewCard = { ...reviewCard, unresolvedIssues: safeJSON(reviewCard.unresolvedIssues) }
  }
  return c.json({ success: true, data: { ...draft, pipelineStatus: safeJSON(draft.pipelineStatus), referencedAssetIds: safeJSON(draft.referencedAssetIds), versions, reviewCard } })
})

draftRoutes.patch("/:draftId", async (c) => {
  const draftId = c.req.param("draftId")
  const body = await c.req.json()
  const now = new Date().toISOString()
  const existing = store.drafts.findById(draftId)
  if (!existing) return c.json({ success: false, error: "作品不存在" }, 404)
  if (body.content !== undefined && body.content !== existing.content) {
    const versions = store.draftVersions.findAll((v) => v.draftId === draftId)
    const nextVersion = versions.length > 0 ? Math.max(...versions.map((v) => v.versionNumber)) + 1 : 2
    store.draftVersions.insert({ id: uuidv7(), draftId, versionNumber: nextVersion, content: existing.content, changeDescription: body.changeDescription || ("v" + nextVersion), changedBy: "user", createdAt: now })
  }
  store.drafts.update(draftId, { title: body.title, content: body.content, status: body.status, updatedAt: now })
  return c.json({ success: true })
})

draftRoutes.post("/", async (c) => {
  const body = await c.req.json()
  const now = new Date().toISOString()
  const draft = store.drafts.insert({ id: uuidv7(), workspaceId: body.workspaceId, title: body.title || "未命名草稿", format: body.format || "blog", content: body.content || "", sourceStructureId: "", pipelineStatus: JSON.stringify({}), reviewCardId: "", status: "idea", referencedAssetIds: "[]", createdAt: now, updatedAt: now })
  return c.json({ success: true, data: { id: draft.id } }, 201)
})

draftRoutes.delete("/:draftId", (c) => {
  const draftId = c.req.param("draftId")
  store.drafts.delete(draftId)
  store.draftVersions.findAll((v) => v.draftId === draftId).forEach((v) => store.draftVersions.delete(v.id))
  return c.json({ success: true })
})

draftRoutes.post("/:draftId/review", async (c) => {
  const draftId = c.req.param("draftId")
  const body = await c.req.json()
  const now = new Date().toISOString()
  const draft = store.drafts.findById(draftId)
  if (!draft) return c.json({ success: false, error: "作品不存在" }, 404)

  let reviewId = draft.reviewCardId
  if (reviewId && store.reviewCards.findById(reviewId)) {
    store.reviewCards.update(reviewId, { intentMatch: body.intentMatch || "", deviationNote: body.deviationNote || "", criticIssuesResolved: body.criticIssuesResolved || "", unresolvedIssues: JSON.stringify(body.unresolvedIssues || []), timeFeeling: body.timeFeeling || "", improvementNote: body.improvementNote || "" })
  } else {
    reviewId = uuidv7()
    store.reviewCards.insert({ id: reviewId, draftId, intentMatch: body.intentMatch || "", deviationNote: body.deviationNote || "", criticIssuesResolved: body.criticIssuesResolved || "", unresolvedIssues: JSON.stringify(body.unresolvedIssues || []), timeFeeling: body.timeFeeling || "", improvementNote: body.improvementNote || "", createdAt: now })
    store.drafts.update(draftId, { reviewCardId: reviewId, updatedAt: now })
  }

  notify.identityUpdated((body.improvementNote as string) || "偏好已更新")
  updateIdentityWeights(body)
  return c.json({ success: true, data: { reviewId } }, 201)
})

function safeJSON(str: string): unknown {
  try { return JSON.parse(str) } catch { return str }
}

function updateIdentityWeights(review: Record<string, unknown>) {
  const identity = store.identities.findOne((i) => i.userId === "default")
  if (!identity) return
  const weights = JSON.parse(identity.learnedWeights || "{}")
  const now = new Date().toISOString()
  weights.styleWeights = weights.styleWeights || {}
  weights.toneWeights = weights.toneWeights || {}
  weights.avoidPatterns = weights.avoidPatterns || []
  weights.feedbackCount = (weights.feedbackCount || 0) + 1
  const intentMatch = (review.intentMatch as string) || ""
  const timeFeeling = (review.timeFeeling as string) || ""
  const improvementNote = (review.improvementNote as string) || ""
  const resolved = (review.criticIssuesResolved as string) || ""
  if (intentMatch.includes("啰嗦") || intentMatch.includes("太长")) weights.styleWeights.shortSentences = Math.min(1, (weights.styleWeights.shortSentences || 0.5) + 0.1)
  if (intentMatch.includes("不够深入") || intentMatch.includes("浅")) weights.toneWeights.reflective = Math.min(1, (weights.toneWeights.reflective || 0.5) + 0.05)
  if (intentMatch.includes("太正式") || intentMatch.includes("僵硬")) { weights.toneWeights.casual = Math.min(1, (weights.toneWeights.casual || 0.5) + 0.1); weights.toneWeights.formal = Math.max(0, (weights.toneWeights.formal || 0.5) - 0.1) }
  if (intentMatch.includes("太随意")) { weights.toneWeights.formal = Math.min(1, (weights.toneWeights.formal || 0.5) + 0.1); weights.toneWeights.casual = Math.max(0, (weights.toneWeights.casual || 0.5) - 0.1) }
  if (timeFeeling.includes("太快")) weights.styleWeights.shortSentences = Math.max(0, (weights.styleWeights.shortSentences || 0.5) - 0.05)
  if (timeFeeling.includes("拖沓") || timeFeeling.includes("慢")) weights.styleWeights.shortSentences = Math.min(1, (weights.styleWeights.shortSentences || 0.5) + 0.05)
  const avoidKeywords = ["重复", "套话", "鸡汤", "说教", "啰嗦", "空洞"]
  for (const kw of avoidKeywords) { if ((improvementNote + resolved).includes(kw) && !weights.avoidPatterns.includes(kw)) weights.avoidPatterns.push(kw) }
  if (weights.avoidPatterns.length > 10) weights.avoidPatterns = weights.avoidPatterns.slice(-8)
  const summaries: string[] = []
  if (intentMatch) summaries.push("意图: " + intentMatch.slice(0, 50))
  if (timeFeeling) summaries.push("节奏: " + timeFeeling)
  if (improvementNote) summaries.push("改进: " + improvementNote.slice(0, 50))
  weights.feedbackSummary = summaries.join(" | ")
  store.identities.update(identity.id, { learnedWeights: JSON.stringify(weights), updatedAt: now })
}
