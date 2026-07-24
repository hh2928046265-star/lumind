/**
 * 记忆提取服务
 * 从 Canvas 内容和生成的草稿中自动提取知识图谱节点和关系
 */
import { llmService, type LLMProvider } from "../llm"
import { store, uuidv7 } from "../../db"

const MEMORY_EXTRACTION_PROMPT = `你是一个知识图谱构建专家。你需要从创作内容中提取关键概念和它们之间的关系。

## 输入
你会收到：
- cards: Canvas 卡片的内容和关系
- draftSummary: 最近生成的草稿摘要（如果有）

## 任务
1. 提取 3-8 个核心概念（概念应是抽象的、可跨主题复用的）
2. 识别概念之间的关系（相似、对立、因果、包含、前提、演化等）
3. 对每个概念给出一个 coreScore（0-1），表示它在长期记忆中的重要程度
   - 0.8+：核心世界观/方法论级别的概念
   - 0.5-0.8：重要但偏具体的概念
   - 0.5 以下：临时性、一次性概念

## 输出格式
严格输出 JSON：
{
  "nodes": [
    {
      "title": "概念名称",
      "content": "概念描述（1-2句话）",
      "coreScore": 0.85,
      "sourceType": "canvas|draft"
    }
  ],
  "edges": [
    {
      "fromTitle": "概念A",
      "toTitle": "概念B",
      "relationType": "similar|contrast|causal|contains|prerequisite|evolves_to",
      "weight": 0.8
    }
  ],
  "newInsights": ["新发现的跨主题洞察"]
}`

export interface ExtractedNode {
  title: string
  content: string
  coreScore: number
  sourceType: string
}

export interface ExtractedEdge {
  fromTitle: string
  toTitle: string
  relationType: string
  weight: number
}

export interface ExtractionResult {
  nodes: ExtractedNode[]
  edges: ExtractedEdge[]
  newInsights: string[]
}

/**
 * 从创作内容中提取记忆
 */
export async function extractMemoryFromContent(
  cardsContent: string,
  draftSummary: string,
  provider: LLMProvider = "openai",
): Promise<ExtractionResult> {
  try {
    const resp = await llmService.chat(
      [
        { role: "system", content: MEMORY_EXTRACTION_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            cards: cardsContent,
            draftSummary: draftSummary || "暂无草稿",
          }, null, 2),
        },
      ],
      provider,
    )

    const content = resp.content.trim()
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : content
    return JSON.parse(jsonStr) as ExtractionResult
  } catch (error) {
    console.warn("[Memory] 提取失败，使用降级策略:", (error as Error).message)
    return { nodes: [], edges: [], newInsights: [] }
  }
}

/**
 * 将提取结果持久化到 Memory Graph
 * 自动去重：如果标题相同的节点已存在，则跳过或更新
 */
export function persistMemoryNodes(
  extraction: ExtractionResult,
  workspaceId: string,
): { createdNodes: number; createdEdges: number; mergedNodes: number } {
  const now = new Date().toISOString()
  let createdNodes = 0
  let mergedNodes = 0
  let createdEdges = 0

  // 构建标题到 ID 的映射（去重）
  const existingNodes = store.memoryNodes.findAll()
  const titleToId = new Map<string, string>()
  for (const n of existingNodes) {
    titleToId.set(n.title, n.id)
  }

  const nodeIdMap = new Map<string, string>()

  for (const node of extraction.nodes) {
    const existingId = titleToId.get(node.title)
    if (existingId) {
      // 已存在：更新 coreScore（取加权平均）
      const existing = store.memoryNodes.findById(existingId)!
      const newCoreScore = (existing.coreScore * existing.snapshotVersion + node.coreScore) / (existing.snapshotVersion + 1)
      store.memoryNodes.update(existingId, {
        content: node.content, // 更新描述
        coreScore: newCoreScore,
        sourceHasUpdate: 1,
        lastAccessedAt: now,
        updatedAt: now,
      })
      nodeIdMap.set(node.title, existingId)
      mergedNodes++
    } else {
      // 新建
      const id = uuidv7()
      store.memoryNodes.insert({
        id,
        userId: "default",
        title: node.title,
        content: node.content,
        sourceId: workspaceId,
        sourceType: node.sourceType,
        isCore: node.coreScore >= 0.7 ? 1 : 0,
        coreScore: node.coreScore,
        promotedAt: node.coreScore >= 0.7 ? now : "",
        snapshotVersion: 1,
        sourceHasUpdate: 0,
        embedding: "",
        lastAccessedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      nodeIdMap.set(node.title, id)
      createdNodes++
    }
  }

  // 创建边
  for (const edge of extraction.edges) {
    const fromId = nodeIdMap.get(edge.fromTitle)
    const toId = nodeIdMap.get(edge.toTitle)
    if (!fromId || !toId) continue

    // 检查是否已存在相同边
    const existing = store.memoryEdges.findOne(
      (e) =>
        e.fromNodeId === fromId &&
        e.toNodeId === toId &&
        e.relationType === edge.relationType,
    )
    if (existing) {
      store.memoryEdges.update(existing.id, {
        weight: (existing.weight + edge.weight) / 2,
        lastAccessedAt: now,
      })
    } else {
      store.memoryEdges.insert({
        id: uuidv7(),
        userId: "default",
        fromNodeId: fromId,
        toNodeId: toId,
        relationType: edge.relationType,
        weight: edge.weight,
        aiGenerated: 1,
        sourceEdgeId: "",
        sourceType: workspaceId,
        lastAccessedAt: now,
        createdAt: now,
      })
      createdEdges++
    }
  }

  return { createdNodes, createdEdges, mergedNodes }
}

/**
 * 创建记忆快照
 */
export function createMemorySnapshot(): string {
  const now = new Date().toISOString()
  const nodes = store.memoryNodes.findAll()
  const edges = store.memoryEdges.findAll()
  const coreNodes = nodes.filter((n) => n.isCore === 1)

  // 检测核心变化
  const lastSnapshot = store.memorySnapshots.findAll()
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0]

  let coreShifts: string[] = []
  if (lastSnapshot) {
    const lastCore = JSON.parse(lastSnapshot.coreShifts) as string[]
    const currentCore = coreNodes.map((n) => n.title)
    const added = currentCore.filter((t) => !lastCore.includes(t))
    const removed = lastCore.filter((t) => !currentCore.includes(t))
    coreShifts = [
      ...added.map((t) => `+ 新增核心概念: ${t}`),
      ...removed.map((t) => `- 移除核心概念: ${t}`),
    ]
  }

  const id = uuidv7()
  store.memorySnapshots.insert({
    id,
    userId: "default",
    capturedAt: now,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    coreShifts: JSON.stringify(coreShifts),
    graphData: JSON.stringify({ nodes, edges }),
  })

  return id
}

/**
 * 晋升核心记忆：将 coreScore >= 0.7 的节点标记为 isCore
 */

/**
 * 语义搜索记忆
 * 使用 embedding 向量计算余弦相似度，返回最相关的记忆节点
 */
export async function searchSimilarMemories(
  query: string,
  topK: number = 5,
  minSimilarity: number = 0.5,
): Promise<Array<{ node: any; similarity: number }>> {
  const { llmService } = await import("../llm")
  const nodes = store.memoryNodes.findAll()

  if (nodes.length === 0) return []

  // 获取查询向量
  const [queryVector] = await llmService.embed([query])

  // 计算每个节点的相似度（如果节点有 embedding 则用，否则用标题文本）
  const results: Array<{ node: any; similarity: number }> = []

  for (const node of nodes) {
    let similarity: number
    if (node.embedding) {
      try {
        const nodeVec = JSON.parse(node.embedding)
        similarity = llmService.cosineSimilarity(queryVector, nodeVec)
      } catch {
        const [nodeVec] = await llmService.embed([node.title + ": " + node.content])
        similarity = llmService.cosineSimilarity(queryVector, nodeVec)
        // 缓存 embedding
        store.memoryNodes.update(node.id, {
          embedding: JSON.stringify(nodeVec),
          updatedAt: new Date().toISOString(),
        })
      }
    } else {
      const [nodeVec] = await llmService.embed([node.title + ": " + node.content])
      similarity = llmService.cosineSimilarity(queryVector, nodeVec)
      // 缓存 embedding
      store.memoryNodes.update(node.id, {
        embedding: JSON.stringify(nodeVec),
        updatedAt: new Date().toISOString(),
      })
    }

    if (similarity >= minSimilarity) {
      results.push({ node, similarity })
    }
  }

  // 按相似度降序排列
  results.sort((a, b) => b.similarity - a.similarity)
  return results.slice(0, topK)
}

/**
 * 为所有记忆节点生成 embedding（批量初始化）
 */
export async function indexAllMemories(): Promise<{ total: number; indexed: number }> {
  const { llmService } = await import("../llm")
  const nodes = store.memoryNodes.findAll()
  const toIndex = nodes.filter((n: any) => !n.embedding)

  if (toIndex.length === 0) return { total: nodes.length, indexed: 0 }

  const texts = toIndex.map((n: any) => n.title + ": " + n.content)
  const embeddings = await llmService.embed(texts)

  for (let i = 0; i < toIndex.length; i++) {
    store.memoryNodes.update(toIndex[i].id, {
      embedding: JSON.stringify(embeddings[i]),
      updatedAt: new Date().toISOString(),
    })
  }

  return { total: nodes.length, indexed: toIndex.length }
}

export function promoteCoreMemories(): string[] {
  const now = new Date().toISOString()
  const nodes = store.memoryNodes.findAll()
  const promoted: string[] = []

  for (const node of nodes) {
    if (node.isCore === 0 && node.coreScore >= 0.7) {
      store.memoryNodes.update(node.id, {
        isCore: 1,
        promotedAt: now,
        updatedAt: now,
      })
      promoted.push(node.title)
    }
  }

  // 降级长期未访问的 core 节点
  for (const node of nodes) {
    if (node.isCore === 1 && node.coreScore < 0.6 && node.promotedAt) {
      const daysSincePromoted = (Date.now() - new Date(node.promotedAt).getTime()) / 86400000
      if (daysSincePromoted > 30) {
        store.memoryNodes.update(node.id, {
          isCore: 0,
          coreScore: Math.max(0, node.coreScore - 0.1),
          updatedAt: now,
        })
      }
    }
  }

  return promoted
}
