import { Hono } from "hono"
import { store, uuidv7 } from "../db"
import { llmService } from "../services/llm"
import {
  getStagePrompt,
  buildCopyUserMessage,
  type CopyGenerationContext,
} from "../services/prompts"

export const agentRoutes = new Hono()

// ===== 文案生成（独立端点，不依赖Pipeline，用于已有卡片和标题时直接生成） =====
agentRoutes.post("/generate", async (c) => {
  const body = await c.req.json()
  const workspaceId = body.workspaceId as string
  const format = (body.format as string) || "short"
  const title = (body.title as string) || ""
  const cardContent = (body.cardContent as string) || ""
  const visionRaw = (body.visionRaw as string) || ""
  const topic = (body.topic as string) || ""
  const source = (body.source as string) || "topic"

  if (!workspaceId) return c.json({ success: false, error: "workspaceId required" }, 400)
  if (!cardContent.trim()) return c.json({ success: false, error: "请先选择一张卡片作为方向" }, 400)
  if (!["short", "essay", "article"].includes(format)) {
    return c.json({ success: false, error: "无效格式" }, 400)
  }

  try {
    const { system } = getStagePrompt("copy", format as any)

    const ctx: CopyGenerationContext = {
      source: source as "photo" | "topic",
      visionAnalysis: visionRaw,
      selectedTitle: title,
      selectedCard: cardContent,
      topic,
      format: format as any,
    }
    const userMessage = buildCopyUserMessage(ctx)

    let content = ""
    let model = ""

    // DeepSeek first
    try {
      const r = await llmService.chat(
        [
          { role: "system", content: system },
          { role: "user", content: userMessage },
        ],
        "openai",
        [],
        "deepseek-v4-pro",
        1,
      )
      content = cleanOutput(r.content)
      model = "deepseek-v4-pro"
    } catch {
      // Fallback to local
      try {
        const r = await llmService.chat(
          [
            { role: "system", content: system },
            { role: "user", content: userMessage },
          ],
          "ollama",
          [],
          "qwen2.5:14b",
        )
        content = cleanOutput(r.content)
        model = "qwen2.5:14b"
      } catch (e2) {
        return c.json({ success: false, error: "所有模型调用失败" }, 500)
      }
    }

    const finalTitle = content.match(/^#\s*(.+)/m)?.[1]?.trim() || title || cardContent || "未命名"
    const now = new Date().toISOString()
    const draftId = uuidv7()
    store.drafts.insert({
      id: draftId, workspaceId, title: finalTitle, format, content,
      sourceStructureId: "", pipelineStatus: JSON.stringify({ model }),
      reviewCardId: "", status: "draft", referencedAssetIds: "[]",
      createdAt: now, updatedAt: now,
    })

    return c.json({ success: true, data: { draftId, title: finalTitle, content, format, model } })
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500)
  }
})

// ===== 从 Canvas 现有卡片生成文案（兼容旧的独立调用） =====
agentRoutes.post("/generate-from-canvas", async (c) => {
  const body = await c.req.json()
  const workspaceId = body.workspaceId as string
  const format = (body.format as string) || "short"
  const cardContent = (body.cardContent as string) || ""

  if (!workspaceId) return c.json({ success: false, error: "workspaceId required" }, 400)
  if (!cardContent.trim()) return c.json({ success: false, error: "请先选择一张卡片作为方向" }, 400)

  try {
    const { system } = getStagePrompt("copy", format as any)
    const userMessage = buildCopyUserMessage({
      source: "topic",
      selectedCard: cardContent,
      format: format as any,
    })

    let content = ""
    let model = ""

    try {
      const r = await llmService.chat(
        [
          { role: "system", content: system },
          { role: "user", content: userMessage },
        ],
        "openai",
        [],
        "deepseek-v4-pro",
        1,
      )
      content = cleanOutput(r.content)
      model = "deepseek-v4-pro"
    } catch {
      try {
        const r = await llmService.chat(
          [
            { role: "system", content: system },
            { role: "user", content: userMessage },
          ],
          "ollama",
          [],
          "qwen2.5:14b",
        )
        content = cleanOutput(r.content)
        model = "qwen2.5:14b"
      } catch (e2) {
        return c.json({ success: false, error: "所有模型调用失败" }, 500)
      }
    }

    const finalTitle = content.match(/^#\s*(.+)/m)?.[1]?.trim() || "未命名"
    const now = new Date().toISOString()
    const draftId = uuidv7()
    store.drafts.insert({
      id: draftId, workspaceId, title: finalTitle, format, content,
      sourceStructureId: "", pipelineStatus: JSON.stringify({ model }),
      reviewCardId: "", status: "draft", referencedAssetIds: "[]",
      createdAt: now, updatedAt: now,
    })

    return c.json({ success: true, data: { draftId, title: finalTitle, content, format, model } })
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500)
  }
})

// ===== 配置 =====
agentRoutes.post("/config", async (c) => {
  const body = await c.req.json()
  const provider = body.provider as "openai" | "ollama"
  llmService.configure(provider, {
    provider,
    model: body.model || (provider === "openai" ? "deepseek-v4-pro" : "llama3.2"),
    apiKey: body.apiKey || "",
    baseUrl: body.baseUrl || (provider === "openai" ? "https://api.deepseek.com" : undefined),
  })
  return c.json({ success: true, data: { provider } })
})

agentRoutes.get("/config", (c) => {
  return c.json({ success: true, data: llmService.getMonthlyUsage() })
})

function cleanOutput(raw: string): string {
  return raw
    .replace(/^`markdown\s*/i, "")
    .replace(/^`\s*/, "")
    .replace(/\s*`\s*$/, "")
    .trim()
}
