/**
 * 模型路由器 — 核心调度
 * DeepSeek 主力，本地模型降级
 */

import { llmService } from "../llm"
export const pipelineProgress = new Map<string, { stage: string; detail: string; updatedAt: string }>()
import { store, uuidv7 } from "../../db"
import { notify } from "../notification"
import { extractMemoryFromContent, persistMemoryNodes } from "../memory/extractor"
import { existsSync, readFileSync } from "fs"
import { join as pathJoin, extname as pathExtname } from "path"

function cleanMarkdownOutput(raw: string): string {
  return raw.replace(/^```markdowns*/i, "").replace(/^```s*/i, "").replace(/s*```s*$/, "").trim()
}

function extractTitle(content: string, fallback = "未命名"): string {
  const m = cleanMarkdownOutput(content).match(/^#\s*(.+)/m)
  return m ? m[1].trim() : fallback
}

export type TaskIntent = "creative" | "analyze" | "structure" | "classify" | "quick"

export interface MultiModelResult {
  draftId: string; title: string; content: string;
  intent: TaskIntent; usage: { totalTokens: number; modelsUsed: string[] }
  memoryStats?: { createdNodes: number; createdEdges: number; mergedNodes: number }
}

async function deepseekWrite(systemPrompt: string, userContent: string): Promise<string> {
  const resp = await llmService.chat(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userContent.slice(0, 4000) }],
    "openai", [], "deepseek-v4-pro", 1
  )
  return cleanMarkdownOutput(resp.content)
}

async function localFallbackWrite(systemPrompt: string, userContent: string): Promise<string> {
  try {
    const r = await llmService.chat(
      [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
      "ollama", [], "qwen2.5:14b"
    )
    return cleanMarkdownOutput(r.content)
  } catch {
    const r = await llmService.chat(
      [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
      "ollama", [], "qwen2.5:7b"
    )
    return cleanMarkdownOutput(r.content)
  }
}

const FORMAT_PROMPTS: Record<string, { label: string; system: string }> = {
  short: {
    label: "短文",
    system: "你是短文案。你不是人类，你没有人生经历。基于卡片写4-6行配文（每行8-16字），意象跳跃。使用提供的标题。直接输出。禁止编故事。",
  },
  essay: {
    label: "随笔",
    system: "前置：你不是人类。基于卡片写300-500字第一人称内心独白。禁止编造经历/故事/人物/对话/场景。禁止「有一次」「曾经」「去年」「前阵子」「我认识一个」。使用提供的标题。直接输出。",
  },
  article: {
    label: "文章",
    system: "前置：你不是人类。基于卡片写600-800字议论性散文。发表观点和思辨。禁止编造经历/故事/人物/对话/场景。禁止举例。使用提供的标题。直接输出。",
  },
}

const IMAGE_ANALYSIS_PROMPT = "You are an image description machine. ONLY list what you can actually SEE. NEVER guess. Format: Subjects:|Colors:|Lighting:|Mood:"

export async function executeCreativePipeline(
  ctx: { workspaceId: string; title?: string; cardContent?: string },
  format = "blog"
): Promise<MultiModelResult> {
  const modelsUsed: string[] = []
  const push = (s: string, d: string) => pipelineProgress.set(uuidv7(), { stage: s, detail: d, updatedAt: new Date().toISOString() })

  let cardTexts = ""
  let visionContext = ""

  if (ctx.cardContent) {
    cardTexts = ctx.cardContent
    push("curator", "使用选中的卡片方向")
  } else {
    push("curator", "收集画布素材...")
    const canvas = store.canvases.findOne((c: any) => c.workspaceId === ctx.workspaceId)
    const nodes = canvas ? store.canvasNodes.findAll((n: any) => n.canvasId === canvas.id) : []

    for (const node of nodes) {
      if (node.type === "card" || node.type === "idea") {
        const ct = node.content || ""
        if (/角度|饱和度|构图|光圈|快门|ISO|曝光|白平衡|焦距|景深|后期|修图|调色/.test(ct)) continue
        cardTexts += ct + "\n"
      }
      if (node.type === "image") {
        try {
          const imgPath = node.content.startsWith("/uploads/") ? pathJoin(process.cwd(), node.content.replace(/^\//, "")) : node.content
          let dataUrl = node.content
          if (existsSync(imgPath)) {
            const buf = readFileSync(imgPath)
            const ext = pathExtname(imgPath).replace(".", "") || "png"
            dataUrl = "data:image/" + ext + ";base64," + buf.toString("base64")
          }
          const ctrl = new AbortController()
          const tid = setTimeout(() => ctrl.abort(), 15000)
          const r = await fetch("http://localhost:11434/api/chat", {
            method: "POST", signal: ctrl.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llava-phi3:3.8b", stream: false,
              messages: [{ role: "system", content: IMAGE_ANALYSIS_PROMPT }, { role: "user", content: "Describe this photo", images: [dataUrl.split(",")[1]] }] }),
          }).catch(() => null).finally(() => clearTimeout(tid))
          if (r?.ok) { const d = await r.json() as any; visionContext += d.message?.content || ""; modelsUsed.push("llava-phi3:3.8b") }
        } catch {}
      }
    }
    if (visionContext) push("vision", "图片分析完成")
  }

  if (!cardTexts.trim()) { throw new Error("没有找到卡片内容。请先上传照片或使用卡片发散生成卡片，然后选择一张作为方向。") }

  const fmt = FORMAT_PROMPTS[format] || FORMAT_PROMPTS.article
  push("writer", "DeepSeek " + fmt.label + "...")

  const baseCtx = visionContext ? "[画面]:" + visionContext.slice(0, 1000) + "\n" : ""
  const userContent = (ctx.title ? "标题:" + ctx.title + "\n" : "") + baseCtx + "[卡片]:" + cardTexts + "\n[警告:你不是人类,不编故事]"

  let finalContent = ""
  try {
    finalContent = await deepseekWrite(fmt.system, userContent)
    modelsUsed.push("deepseek-v4-pro")
  } catch {
    push("writer", "降级本地模型...")
    finalContent = await localFallbackWrite(fmt.system, userContent)
    modelsUsed.push("qwen2.5:14b")
  }

  const finalTitle = extractTitle(finalContent, ctx.title || "未命名")
  const now = new Date().toISOString()
  const draftId = uuidv7()
  store.drafts.insert({ id: draftId, workspaceId: ctx.workspaceId, title: finalTitle, format, content: finalContent, sourceStructureId: "", pipelineStatus: JSON.stringify({ modelsUsed }), reviewCardId: "", status: "draft", referencedAssetIds: "[]", createdAt: now, updatedAt: now })

  notify.pipelineComplete(finalTitle, draftId)

  return { draftId, title: finalTitle, content: finalContent, intent: "creative", usage: { totalTokens: 0, modelsUsed } }
}
