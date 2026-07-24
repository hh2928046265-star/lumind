/**
 * Pipeline 统一状态机
 * 管理照片/主题两条路径的完整生命周期
 * 
 * 路径A: 照片 → 识图 → 卡片+标题 → 选标题 → 选卡片 → 选格式 → 文案
 * 路径B: 主题 → 卡片 → 选卡片 → 选格式 → 文案
 */

import { llmService } from "../llm"
import {
  getStagePrompt,
  buildCopyUserMessage,
  buildCardsUserMessage,
  buildTitlesUserMessage,
  type CopyGenerationContext,
  type CopyFormat,
  type PipelineStage,
} from "../prompts"

// ============================================================
// 类型定义
// ============================================================

export interface PipelineContext {
  /** 管道ID */
  id: string
  /** 入口来源 */
  source: "photo" | "topic"

  // 路径A（照片）特有
  images?: Array<{ url: string; filename: string }>
  visionRaw?: string           // llava 识图原始英文输出

  // 路径B（主题）特有
  topic?: string

  // 两条路径汇合
  cards: Array<{ type: string; content: string }>
  titleOptions?: string[]
  selectedTitle?: string
  selectedCard?: string
  targetFormat?: CopyFormat

  // 元数据
  modelTrace: string[]         // 记录每一步使用的模型
  createdAt: string
}

export interface PipelineStep {
  stage: PipelineStage
  status: "pending" | "running" | "done" | "error"
  error?: string
}

export interface PipelineState {
  context: PipelineContext
  steps: PipelineStep[]
  currentStep: PipelineStage | null
  finished: boolean
}

// ============================================================
// Pipeline 存储（内存，重启丢失）
// ============================================================

const pipelineStore = new Map<string, PipelineState>()

export function getPipeline(id: string): PipelineState | undefined {
  return pipelineStore.get(id)
}

export function deletePipeline(id: string) {
  pipelineStore.delete(id)
}

function savePipeline(state: PipelineState) {
  pipelineStore.set(state.context.id, state)
}

// ============================================================
// Step 1: 图片识图（路径A）
// ============================================================

export async function runVisionStep(
  pipelineId: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const state = pipelineStore.get(pipelineId)
  if (!state) throw new Error("Pipeline not found")

  updateStep(state, "vision", "running")

  const { system, temperature } = getStagePrompt("vision")

  // 尝试 llava-phi3
  let analysis = ""
  let modelUsed = ""

  try {
    const resp = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llava-phi3:3.8b",
        messages: [
          { role: "system", content: system },
          { role: "user", content: "Describe this photo", images: [base64] },
        ],
        stream: false,
        options: { temperature },
      }),
    })
    const data = await resp.json() as any
    analysis = data.message?.content || ""
    modelUsed = "llava-phi3:3.8b"
  } catch {
    // Fallback to minicpm-v
    try {
      const resp = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "minicpm-v:8b",
          messages: [
            { role: "system", content: "只说你看到的，不要编造。" },
            { role: "user", content: "描述这张照片", images: [base64] },
          ],
          stream: false,
        }),
      })
      const data = await resp.json() as any
      analysis = data.message?.content || ""
      modelUsed = "minicpm-v:8b"
    } catch {
      updateStep(state, "vision", "error", "所有视觉模型调用失败")
      savePipeline(state)
      throw new Error("所有视觉模型调用失败")
    }
  }

  state.context.visionRaw = analysis
  state.context.modelTrace.push("vision:" + modelUsed)
  updateStep(state, "vision", "done")
  savePipeline(state)
  return analysis
}

// ============================================================
// Step 2: 生成卡片（两条路径通用）
// ============================================================

export async function runCardsStep(
  pipelineId: string,
): Promise<Array<{ type: string; content: string }>> {
  const state = pipelineStore.get(pipelineId)
  if (!state) throw new Error("Pipeline not found")

  const isPhoto = state.context.source === "photo"
  const stage: PipelineStage = isPhoto ? "cards_from_photo" : "cards_from_topic"
  updateStep(state, stage, "running")

  const { system, temperature, maxTokens } = getStagePrompt(stage)
  const userContent = isPhoto
    ? buildCardsUserMessage("photo", state.context.visionRaw || "", state.context.topic)
    : buildCardsUserMessage("topic", state.context.topic || "")

  let rawText = ""
  let modelUsed = ""

  // Try providers in order: DeepSeek → qwen2.5:14b
  const providers: Array<{ provider: "openai" | "ollama"; model: string }> = [
    { provider: "openai", model: "deepseek-v4-pro" },
    { provider: "ollama", model: "qwen2.5:14b" },
  ]

  for (const { provider, model } of providers) {
    try {
      const resp = await llmService.chat(
        [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        provider,
        [],
        model,
        1,
      )
      rawText = resp.content
      modelUsed = provider + "/" + (resp.model || model)
      break
    } catch (e: any) {
      console.warn("[Pipeline] cards " + provider + " failed:", e.message?.slice(0, 80))
    }
  }

  if (!rawText) {
    updateStep(state, stage, "error", "所有模型生成卡片失败")
    savePipeline(state)
    throw new Error("所有模型生成卡片失败")
  }

  // Extract cards from text
  const cards = parseCardsFromText(rawText)
  if (cards.length === 0) {
    updateStep(state, stage, "error", "未能提取到有效卡片")
    savePipeline(state)
    throw new Error("未能提取到有效卡片")
  }

  state.context.cards = cards
  state.context.modelTrace.push("cards:" + modelUsed)
  updateStep(state, stage, "done")
  savePipeline(state)
  return cards
}

// ============================================================
// Step 3: 生成标题（仅路径A）
// ============================================================

export async function runTitlesStep(pipelineId: string): Promise<string[]> {
  const state = pipelineStore.get(pipelineId)
  if (!state) throw new Error("Pipeline not found")

  updateStep(state, "titles", "running")

  const { system, temperature } = getStagePrompt("titles")
  const userContent = buildTitlesUserMessage(
    state.context.visionRaw || "",
    state.context.topic,
  )

  let titles: string[] = []

  try {
    const resp = await llmService.chat(
      [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      "openai",
      [],
      "deepseek-v4-pro",
      1,
    )
    const match = resp.content.match(/\[[\s\S]*\]/)
    if (match) titles = JSON.parse(match[0])
    state.context.modelTrace.push("titles:openai/deepseek-v4-pro")
  } catch (e: any) {
    console.warn("[Pipeline] titles failed:", e.message?.slice(0, 80))
    // Fallback titles
    titles = ["被光眷顾的瞬间", "整个春天都藏在这了", "温柔到犯规", "是心动啊", "这色调我能看一百遍", "治愈系日常"]
    state.context.modelTrace.push("titles:fallback")
  }

  if (!Array.isArray(titles) || titles.length === 0) {
    titles = ["无题", "光与影", "这一刻"]
  }

  state.context.titleOptions = titles
  updateStep(state, "titles", "done")
  savePipeline(state)
  return titles
}

// ============================================================
// Step 4: 用户选择（外部交互）
// ============================================================

export function selectCard(pipelineId: string, cardContent: string): PipelineState {
  const state = pipelineStore.get(pipelineId)
  if (!state) throw new Error("Pipeline not found")
  state.context.selectedCard = cardContent
  savePipeline(state)
  return state
}

export function selectTitle(pipelineId: string, title: string): PipelineState {
  const state = pipelineStore.get(pipelineId)
  if (!state) throw new Error("Pipeline not found")
  state.context.selectedTitle = title
  savePipeline(state)
  return state
}

export function selectFormat(pipelineId: string, format: CopyFormat): PipelineState {
  const state = pipelineStore.get(pipelineId)
  if (!state) throw new Error("Pipeline not found")
  state.context.targetFormat = format
  savePipeline(state)
  return state
}

// ============================================================
// Step 5: 生成文案（最终步骤）
// ============================================================

export async function runCopyGeneration(pipelineId: string): Promise<{
  content: string
  title: string
  model: string
}> {
  const state = pipelineStore.get(pipelineId)
  if (!state) throw new Error("Pipeline not found")
  if (!state.context.selectedCard) throw new Error("请先选择一张灵感卡片")
  if (!state.context.targetFormat) throw new Error("请先选择文案格式")

  updateStep(state, "copy", "running")

  const format = state.context.targetFormat
  const { system, temperature, maxTokens } = getStagePrompt("copy", format)

  const ctx: CopyGenerationContext = {
    source: state.context.source,
    visionAnalysis: state.context.visionRaw,
    selectedTitle: state.context.selectedTitle,
    selectedCard: state.context.selectedCard,
    topic: state.context.topic,
    format,
  }
  const userMessage = buildCopyUserMessage(ctx)

  let content = ""
  let modelUsed = ""

  // DeepSeek first, then qwen2.5:14b
  const providers: Array<{ provider: "openai" | "ollama"; model: string }> = [
    { provider: "openai", model: "deepseek-v4-pro" },
    { provider: "ollama", model: "qwen2.5:14b" },
  ]

  for (const { provider, model } of providers) {
    try {
      const resp = await llmService.chat(
        [
          { role: "system", content: system },
          { role: "user", content: userMessage },
        ],
        provider,
        [],
        model,
        1,
      )
      content = cleanOutput(resp.content)
      modelUsed = provider + "/" + (resp.model || model)
      break
    } catch (e: any) {
      console.warn("[Pipeline] copy " + provider + " failed:", e.message?.slice(0, 80))
    }
  }

  if (!content) {
    updateStep(state, "copy", "error", "所有模型文案生成失败")
    savePipeline(state)
    throw new Error("所有模型文案生成失败")
  }

  // Extract title from content if present
  const titleMatch = content.match(/^#\s*(.+)/m)
  const finalTitle = titleMatch?.[1]?.trim() || state.context.selectedTitle || state.context.selectedCard || state.context.topic || "未命名"

  state.context.modelTrace.push("copy:" + modelUsed)
  updateStep(state, "copy", "done")
  savePipeline(state)

  return { content, title: finalTitle, model: modelUsed }
}

// ============================================================
// 工厂函数：创建新管道
// ============================================================

export function createPhotoPipeline(
  id: string,
  images: Array<{ url: string; filename: string }>,
  topic?: string,
): PipelineState {
  const state: PipelineState = {
    context: {
      id,
      source: "photo",
      images,
      topic,
      cards: [],
      modelTrace: [],
      createdAt: new Date().toISOString(),
    },
    steps: [
      { stage: "vision", status: "pending" },
      { stage: "cards_from_photo", status: "pending" },
      { stage: "titles", status: "pending" },
      { stage: "copy", status: "pending" },
    ],
    currentStep: null,
    finished: false,
  }
  savePipeline(state)
  return state
}

export function createTopicPipeline(id: string, topic: string): PipelineState {
  const state: PipelineState = {
    context: {
      id,
      source: "topic",
      topic,
      cards: [],
      modelTrace: [],
      createdAt: new Date().toISOString(),
    },
    steps: [
      { stage: "cards_from_topic", status: "pending" },
      { stage: "copy", status: "pending" },
    ],
    currentStep: null,
    finished: false,
  }
  savePipeline(state)
  return state
}

// ============================================================
// 工具函数
// ============================================================

function updateStep(
  state: PipelineState,
  stage: PipelineStage,
  status: PipelineStep["status"],
  error?: string,
) {
  const step = state.steps.find((s) => s.stage === stage)
  if (step) {
    step.status = status
    if (error) step.error = error
  }
  state.currentStep = status === "running" ? stage : null
  if (status === "done") {
    const allDone = state.steps.every((s) => s.status === "done")
    if (allDone) state.finished = true
  }
}

function parseCardsFromText(rawText: string): Array<{ type: string; content: string }> {
  const cards: Array<{ type: string; content: string }> = []
  const lines = rawText.split(/\r?\n/)
  const seen = new Set<string>()

  for (const line of lines) {
    let cleaned = line.trim()
    if (cleaned.length < 3) continue
    cleaned = cleaned.replace(/^\d+[\.、\)]\s*/, "").replace(/^[-*•]\s*/, "")
    if (cleaned.length < 3) continue
    if (/^(here|ok|sure|the |this |that |these |yes|no|note|let |i |we |you |please|below|above)/i.test(cleaned)) continue
    if (cleaned.startsWith("{") || cleaned.startsWith("[") || cleaned.startsWith("<")) continue

    const key = cleaned.slice(0, 10)
    if (seen.has(key)) continue
    seen.add(key)

    const cardType = cleaned.includes("?") || cleaned.includes("？") ? "question" : "idea"
    cards.push({ type: cardType, content: cleaned.slice(0, 120) })
  }

  return cards.slice(0, 8)
}

function cleanOutput(raw: string): string {
  return raw
    .replace(/^`markdown\s*/i, "")
    .replace(/^`\s*/, "")
    .replace(/\s*`\s*$/, "")
    .trim()
}
