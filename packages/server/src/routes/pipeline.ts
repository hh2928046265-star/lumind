import { Hono } from "hono"
import { readFile } from "fs/promises"
import { join, extname } from "path"
import { existsSync } from "fs"
import { store, uuidv7 } from "../db"
import {
  createPhotoPipeline,
  createTopicPipeline,
  runVisionStep,
  runCardsStep,
  runTitlesStep,
  runCopyGeneration,
  selectCard,
  selectTitle,
  selectFormat,
  getPipeline,
  deletePipeline,
  type PipelineState,
} from "../services/pipeline/engine"

export const pipelineRoutes = new Hono()

// ===== 路径A：上传图片，启动照片管道 =====
pipelineRoutes.post("/photo/upload-and-analyze", async (c) => {
  const body = await c.req.parseBody()
  const files: File[] = []
  for (const [key, value] of Object.entries(body)) {
    if (value instanceof File) files.push(value)
  }
  if (files.length === 0) return c.json({ success: false, error: "没有上传图片" }, 400)

  const topic = (body.topic as string) || ""
  const pipelineId = uuidv7()

  // Save files
  const saved: Array<{ url: string; filename: string; fullPath: string }> = []
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = extname(file.name) || ".png"
    const filename = uuidv7() + ext
    const filepath = join(process.cwd(), "uploads", filename)
    const { writeFile, mkdir } = await import("fs/promises")
    if (!existsSync(join(process.cwd(), "uploads"))) await mkdir(join(process.cwd(), "uploads"), { recursive: true })
    await writeFile(filepath, buffer)
    saved.push({ url: "/uploads/" + filename, filename, fullPath: filepath })
  }

  // Create pipeline
  const state = createPhotoPipeline(
    pipelineId,
    saved.map((s) => ({ url: s.url, filename: s.filename })),
    topic,
  )

  // Step 1: Vision analysis (use first image)
  try {
    const firstImage = saved[0]
    const buffer = await readFile(firstImage.fullPath)
    const base64 = buffer.toString("base64")
    const mimeType = "image/" + (extname(firstImage.filename).replace(".", "") || "png")
    await runVisionStep(pipelineId, base64)
  } catch (e: any) {
    return c.json({ success: false, error: "识图失败: " + (e.message || "未知错误"), pipelineId }, 500)
  }

  // Step 2: Generate cards
  let cards: Array<{ type: string; content: string }> = []
  try {
    cards = await runCardsStep(pipelineId)
  } catch (e: any) {
    return c.json({ success: false, error: "卡片生成失败: " + (e.message || "未知错误"), pipelineId }, 500)
  }

  // Step 3: Generate titles
  let titles: string[] = []
  try {
    titles = await runTitlesStep(pipelineId)
  } catch (e: any) {
    titles = ["被光眷顾的瞬间", "整个春天都藏在这了", "温柔到犯规", "是心动啊", "这色调我能看一百遍", "治愈系日常"]
  }

  return c.json({
    success: true,
    data: {
      pipelineId,
      images: saved.map((s) => ({ url: s.url, filename: s.filename })),
      cards,
      titles,
      modelTrace: state.context.modelTrace,
    },
  })
})

// ===== 路径B：输入主题，启动主题管道 =====
pipelineRoutes.post("/topic/generate-cards", async (c) => {
  const body = await c.req.json()
  const topic = (body.topic as string) || ""

  if (!topic.trim()) return c.json({ success: false, error: "请输入主题" }, 400)

  const pipelineId = uuidv7()
  const state = createTopicPipeline(pipelineId, topic.trim())

  let cards: Array<{ type: string; content: string }> = []
  try {
    cards = await runCardsStep(pipelineId)
  } catch (e: any) {
    return c.json({ success: false, error: "卡片生成失败: " + (e.message || "未知错误"), pipelineId }, 500)
  }

  return c.json({
    success: true,
    data: {
      pipelineId,
      topic,
      cards,
      modelTrace: state.context.modelTrace,
    },
  })
})

// ===== 选择卡片 =====
pipelineRoutes.post("/:id/select-card", async (c) => {
  const pipelineId = c.req.param("id")
  const body = await c.req.json()
  const cardContent = (body.cardContent as string) || ""

  if (!cardContent) return c.json({ success: false, error: "请提供卡片内容" }, 400)

  try {
    selectCard(pipelineId, cardContent)
    return c.json({ success: true, data: { pipelineId, selectedCard: cardContent } })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 400)
  }
})

// ===== 选择标题 =====
pipelineRoutes.post("/:id/select-title", async (c) => {
  const pipelineId = c.req.param("id")
  const body = await c.req.json()
  const title = (body.title as string) || ""

  if (!title) return c.json({ success: false, error: "请提供标题" }, 400)

  try {
    selectTitle(pipelineId, title)
    return c.json({ success: true, data: { pipelineId, selectedTitle: title } })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 400)
  }
})

// ===== 生成文案 =====
pipelineRoutes.post("/:id/generate", async (c) => {
  const pipelineId = c.req.param("id")
  const body = await c.req.json()
  const format = (body.format as string) || "short"
  const workspaceId = (body.workspaceId as string) || ""

  try {
    if (format !== "short" && format !== "essay" && format !== "article") {
      return c.json({ success: false, error: "无效格式，请选择 short/essay/article" }, 400)
    }
    selectFormat(pipelineId, format as any)
    const result = await runCopyGeneration(pipelineId)

    // Save draft if workspaceId provided
    let draftId = ""
    if (workspaceId) {
      const now = new Date().toISOString()
      draftId = uuidv7()
      store.drafts.insert({
        id: draftId, workspaceId,
        title: result.title, format, content: result.content,
        sourceStructureId: pipelineId,
        pipelineStatus: JSON.stringify({ model: result.model, pipelineId }),
        reviewCardId: "", status: "draft",
        referencedAssetIds: "[]",
        createdAt: now, updatedAt: now,
      })
    }

    return c.json({
      success: true,
      data: { draftId, title: result.title, content: result.content, format, model: result.model },
    })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 400)
  }
})

// ===== 获取管道状态 =====
pipelineRoutes.get("/:id", (c) => {
  const pipelineId = c.req.param("id")
  const state = getPipeline(pipelineId)
  if (!state) return c.json({ success: false, error: "管道不存在或已过期" }, 404)

  return c.json({
    success: true,
    data: {
      id: state.context.id,
      source: state.context.source,
      cards: state.context.cards,
      titleOptions: state.context.titleOptions,
      selectedTitle: state.context.selectedTitle,
      selectedCard: state.context.selectedCard,
      targetFormat: state.context.targetFormat,
      images: state.context.images,
      topic: state.context.topic,
      modelTrace: state.context.modelTrace,
      steps: state.steps,
      finished: state.finished,
    },
  })
})

// ===== 删除管道 =====
pipelineRoutes.delete("/:id", (c) => {
  const pipelineId = c.req.param("id")
  deletePipeline(pipelineId)
  return c.json({ success: true })
})
