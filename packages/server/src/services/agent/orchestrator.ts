import { llmService, type LLMProvider, type LLMResponse } from "../llm"
import { CURATOR_SYSTEM_PROMPT, THINKER_SYSTEM_PROMPT, CRITIC_SYSTEM_PROMPT, WRITER_SYSTEM_PROMPT } from "./prompts"
import { store, uuidv7 } from "../../db"
import { notify } from "../notification"
import { extractMemoryFromContent, persistMemoryNodes } from "../memory/extractor"

export interface AgentContext {
  workspaceId: string; canvasId: string; format?: string
  provider?: LLMProvider; onProgress?: (stage: string, detail: string) => void
}

export interface PipelineResult {
  curator: Record<string, unknown>; thinker: Record<string, unknown>
  critic: Record<string, unknown>; writer: { title: string; content: string }
  draftId: string; usage: { totalTokens: number; stages: number }
  memoryStats?: { createdNodes: number; createdEdges: number; mergedNodes: number }
}

export interface SimplePipelineResult {
  draftId: string; title: string; content: string; usage: { totalTokens: number }
}

function uuidv7Local() { return uuidv7() }

function collectCanvasCards(canvasId: string) {
  const nodes = store.canvasNodes.findAll((n: { canvasId: string }) => n.canvasId === canvasId)
  // Filter out image/reference nodes — only content cards go to the pipeline
  return nodes
    .filter((node: { type: string; content: string }) => node.type !== 'image' && node.type !== 'reference' && node.content)
    .map((node: { id: string; content: string; type: string }) => ({
      id: node.id, content: node.content, type: node.type,
    }))
}

function buildIdentityContext() {
  const identity = store.identities.findOne((i: { userId: string }) => i.userId === "default")
  return {
    context: identity ? `创作者关注的领域：${JSON.parse(identity.domains || "[]").join("、")}` : "创作者尚未设置身份偏好",
    weights: identity ? JSON.parse(identity.learnedWeights || "{}") : {},
  }
}

// ============ 简化流水线（本地模型）============

export async function runSimplePipeline(ctx: AgentContext): Promise<SimplePipelineResult> {
  const cards = collectCanvasCards(ctx.canvasId)
  if (cards.length === 0) throw new Error("Canvas 中没有卡片")

  const provider = ctx.provider || "ollama"
  const format = ctx.format || "blog"
  const cardTexts = cards.map((c, i) => `${i + 1}. [${c.type}] ${c.content}`).join("\n")

  const formatLabel = format === "blog" ? "博客文章" : format === "essay" ? "随笔" : "短文"

  ctx.onProgress?.("writer", "正在撰写...")

  const resp = await llmService.chat([
    { role: "system", content: `你是专业作者。根据卡片内容写一篇${formatLabel}。直接输出Markdown，标题用 # 标记。` },
    { role: "user", content: `卡片内容：\n${cardTexts}\n\n写一篇500-1000字的${formatLabel}。` },
  ], provider)

  const content = resp.content.trim()
  const titleMatch = content.match(/^#\s*(.+)/m)
  const title = titleMatch ? titleMatch[1].trim() : "未命名"

  const now = new Date().toISOString()
  const draftId = uuidv7Local()

  store.drafts.insert({
    id: draftId, workspaceId: ctx.workspaceId, title, format, content,
    sourceStructureId: "", pipelineStatus: JSON.stringify({ simple: true }),
    reviewCardId: "", status: "draft", referencedAssetIds: "[]",
    createdAt: now, updatedAt: now,
  })

  // 记忆提取
  let memoryStats
  try {
    const extraction = await extractMemoryFromContent(cardTexts, content, provider)
    memoryStats = persistMemoryNodes(extraction, ctx.workspaceId)
  } catch { /* ignore */ }

  notify.pipelineComplete(title, draftId)
  if (memoryStats) notify.memoryExtracted(memoryStats.createdNodes, memoryStats.createdEdges)

  return { draftId, title, content, usage: { totalTokens: resp.tokenUsage.inputTokens + resp.tokenUsage.outputTokens } }
}

// ============ 完整流水线（强模型）============

function parseJSONResponse(response: LLMResponse): Record<string, unknown> {
  const content = response.content.trim()
  const firstBrace = content.indexOf("{")
  const lastBrace = content.lastIndexOf("}")
  let jsonStr = firstBrace >= 0 && lastBrace > firstBrace ? content.slice(firstBrace, lastBrace + 1) : content
  jsonStr = jsonStr.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
  const attempts = [
    () => JSON.parse(jsonStr),
    () => JSON.parse(jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")),
  ]
  for (const a of attempts) { try { return a() } catch { continue } }
  console.error("[parseJSON] FAIL. Raw:", content.slice(0, 300))
  throw new Error("JSON解析失败")
}

export async function runCreationPipeline(ctx: AgentContext): Promise<PipelineResult> {
  const provider = ctx.provider || "openai"
  let totalTokens = 0
  const format = ctx.format || "blog"
  const cards = collectCanvasCards(ctx.canvasId)
  if (cards.length === 0) throw new Error("Canvas 中没有卡片")

  const identity = buildIdentityContext()

  // 1. Curator
  ctx.onProgress?.("curator", "筛选卡片...")
  const cr = await llmService.chat([
    { role: "system", content: CURATOR_SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify({ cards, creatorContext: identity.context }) },
  ], provider)
  totalTokens += cr.tokenUsage.inputTokens + cr.tokenUsage.outputTokens
  const curator = parseJSONResponse(cr)

  // 2. Thinker
  ctx.onProgress?.("thinker", "深度分析...")
  const tr = await llmService.chat([
    { role: "system", content: THINKER_SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify({ curatedMaterial: curator, userIdentity: identity.context }) },
  ], provider)
  totalTokens += tr.tokenUsage.inputTokens + tr.tokenUsage.outputTokens
  const thinker = parseJSONResponse(tr)

  // 3. Critic
  ctx.onProgress?.("critic", "评审论点...")
  const cr2 = await llmService.chat([
    { role: "system", content: CRITIC_SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify({ thinkerOutput: thinker, originalCards: cards.map((c) => ({ id: c.id, content: c.content })) }) },
  ], provider)
  totalTokens += cr2.tokenUsage.inputTokens + cr2.tokenUsage.outputTokens
  const critic = parseJSONResponse(cr2)

  // 4. Writer
  ctx.onProgress?.("writer", "撰写初稿...")
  const wr = await llmService.chat([
    { role: "system", content: WRITER_SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify({ criticOutput: critic, thinkerOutput: thinker, curatedMaterial: curator, userIdentity: identity.context, format }) },
  ], provider)
  totalTokens += wr.tokenUsage.inputTokens + wr.tokenUsage.outputTokens
  const writer = parseJSONResponse(wr) as unknown as { title: string; content: string }

  const now = new Date().toISOString()
  const draftId = uuidv7Local()
  store.drafts.insert({
    id: draftId, workspaceId: ctx.workspaceId, title: writer.title, format, content: writer.content,
    sourceStructureId: "", pipelineStatus: JSON.stringify({ curator: true, thinker: true, critic: true, writer: true }),
    reviewCardId: "", status: "draft", referencedAssetIds: "[]", createdAt: now, updatedAt: now,
  })

  let memoryStats
  try {
    const cardsText = cards.map((c) => `${c.type}: ${c.content}`).join("\n")
    const extraction = await extractMemoryFromContent(cardsText, writer.content, provider)
    memoryStats = persistMemoryNodes(extraction, ctx.workspaceId)
  } catch { /* ignore */ }

  store.agentCalls.insert({
    id: uuidv7Local(), workspaceId: ctx.workspaceId, agentType: "creation-pipeline",
    inputSummary: `Canvas ${ctx.canvasId}`, outputSummary: writer.title,
    status: "completed", degradationReason: "", tokenUsage: JSON.stringify({ total: totalTokens }),
    userFeedback: "", startedAt: now, completedAt: now,
  })

  notify.pipelineComplete(writer.title, draftId)
  if (memoryStats) notify.memoryExtracted(memoryStats.createdNodes, memoryStats.createdEdges)

  return { curator, thinker, critic, writer: writer as { title: string; content: string }, draftId, usage: { totalTokens, stages: 4 }, memoryStats }
}