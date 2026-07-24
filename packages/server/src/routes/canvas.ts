import { Hono } from 'hono'
import { store, uuidv7 } from '../db'
import { llmService } from '../services/llm'
import { getStagePrompt, buildCardsUserMessage, clearIdentityCache } from '../services/prompts'

function ensureCanvas(workspaceId: string) {
  let canvas = store.canvases.findOne((c: any) => c.workspaceId === workspaceId)
  if (!canvas) {
    const now = new Date().toISOString()
    canvas = store.canvases.insert({
      id: uuidv7(), workspaceId, title: 'Canvas',
      viewport: JSON.stringify({ x: 0, y: 0, zoom: 1 }),
      createdAt: now, updatedAt: now,
    })
    store.workspaces.update(workspaceId, { canvasId: canvas.id })
  }
  return canvas
}

export const canvasRoutes = new Hono()

canvasRoutes.get('/:workspaceId', (c) => {
  const workspaceId = c.req.param('workspaceId')
  const canvas = ensureCanvas(workspaceId)
  const nodes = store.canvasNodes.findAll((n: any) => n.canvasId === canvas.id)
  const edges = store.canvasEdges.findAll((e: any) => e.canvasId === canvas.id)
  return c.json({
    success: true,
    data: {
      id: canvas.id, workspaceId: canvas.workspaceId,
      viewport: JSON.parse(canvas.viewport), title: canvas.title,
      createdAt: canvas.createdAt, updatedAt: canvas.updatedAt,
      nodes: nodes.map((n: any) => ({
        ...n, position: { x: n.positionX, y: n.positionY },
        aiSuggestions: JSON.parse(n.aiSuggestions || '[]')
      })),
      edges
    }
  })
})

canvasRoutes.post('/:workspaceId/nodes', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  const body = await c.req.json()
  const now = new Date().toISOString()
  const canvas = ensureCanvas(workspaceId)
  const node = store.canvasNodes.insert({
    id: uuidv7(), canvasId: canvas.id, type: body.type || 'idea',
    content: body.content || '', summary: '',
    positionX: body.position?.x || Math.random() * 400 + 100,
    positionY: body.position?.y || Math.random() * 400 + 100,
    sourceId: '', sourceType: '', aiGenerated: body.aiGenerated ? 1 : 0,
    aiSuggestions: '[]', userFeedback: '', version: 1,
    createdAt: now, updatedAt: now,
  })
  return c.json({ success: true, data: { id: node.id } }, 201)
})

canvasRoutes.patch('/:workspaceId/nodes/:nodeId', async (c) => {
  const nodeId = c.req.param('nodeId')
  const body = await c.req.json()
  const now = new Date().toISOString()
  const existing = store.canvasNodes.findById(nodeId)
  if (!existing) return c.json({ success: false, error: 'Node not found' }, 404)
  const updates: Record<string, unknown> = { updatedAt: now }
  if (body.position) { updates.positionX = body.position.x; updates.positionY = body.position.y }
  if (body.content !== undefined) updates.content = body.content
  if (body.version !== undefined) updates.version = body.version + 1
  store.canvasNodes.update(nodeId, updates)
  return c.json({ success: true })
})

canvasRoutes.delete('/:workspaceId/nodes/:nodeId', (c) => {
  const nodeId = c.req.param('nodeId')
  store.canvasNodes.delete(nodeId)
  const relatedEdges = store.canvasEdges.findAll((e: any) => e.fromNodeId === nodeId || e.toNodeId === nodeId)
  relatedEdges.forEach((e: any) => store.canvasEdges.delete(e.id))
  return c.json({ success: true })
})

canvasRoutes.post('/:workspaceId/edges', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  const body = await c.req.json()
  const now = new Date().toISOString()
  const canvas = ensureCanvas(workspaceId)
  const edge = store.canvasEdges.insert({
    id: uuidv7(), canvasId: canvas.id, fromNodeId: body.fromNodeId,
    toNodeId: body.toNodeId, relationType: body.relationType || 'relates_to',
    aiGenerated: body.aiGenerated ? 1 : 0, aiRecommended: body.aiRecommended ? 1 : 0,
    aiConfidence: body.aiConfidence || 0, version: 1,
    createdAt: now, updatedAt: now,
  })
  return c.json({ success: true, data: { id: edge.id } }, 201)
})

canvasRoutes.delete('/:workspaceId/edges/:edgeId', (c) => {
  const edgeId = c.req.param('edgeId')
  store.canvasEdges.delete(edgeId)
  return c.json({ success: true })
})

// ===== AI 生成卡片（使用新 Prompt 系统，含 Identity 注入） =====
canvasRoutes.post('/:workspaceId/generate-cards', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  const body = await c.req.json()
  const topic = (body.topic as string) || ''

  if (!topic.trim()) return c.json({ success: false, error: '请输入主题' }, 400)

  const canvas = ensureCanvas(workspaceId)
  const now = new Date().toISOString()

  // 使用新 Prompt 系统
  const { system } = getStagePrompt("cards_from_topic")
  const userMessage = buildCardsUserMessage("topic", topic)

  let rawText = ''
  let usedProvider = ''
  let usedModel = ''

  const providers: Array<{ provider: 'openai' | 'ollama'; model: string }> = [
    { provider: 'openai', model: 'deepseek-v4-pro' },
    { provider: 'ollama', model: 'qwen2.5:14b' },
  ]

  for (const { provider, model } of providers) {
    try {
      const resp = await llmService.chat(
        [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
        provider,
        [],
        model,
        1,
      )
      rawText = resp.content
      usedProvider = provider
      usedModel = resp.model || model
      break
    } catch (e: any) {
      console.warn('[Canvas]', provider, 'failed:', e.message?.slice(0, 80))
    }
  }

  if (!rawText) return c.json({ success: false, error: '所有模型调用失败' }, 500)

  // Extract cards
  const cards: Array<{ type: string; content: string }> = []
  const lines = rawText.split(/\r?\n/)
  const seen = new Set<string>()

  for (const line of lines) {
    let cleaned = line.trim()
    if (cleaned.length < 3) continue
    cleaned = cleaned.replace(/^\d+[\.、\)]\s*/, '').replace(/^[-*•]\s*/, '')
    if (cleaned.length < 3) continue
    if (/^(here|ok|sure|the |this |that |these |yes|no|note|let |i |we |you |please|below|above)/i.test(cleaned)) continue
    if (cleaned.startsWith('{') || cleaned.startsWith('[') || cleaned.startsWith('<')) continue

    const key = cleaned.slice(0, 10)
    if (seen.has(key)) continue
    seen.add(key)

    const cardType = cleaned.includes('?') || cleaned.includes('？') ? 'question' : 'idea'
    cards.push({ type: cardType, content: cleaned.slice(0, 120) })
  }

  if (cards.length === 0) return c.json({ success: false, error: '未能提取到有效卡片' }, 400)

  // Insert as canvas nodes
  const created: Array<{ id: string; type: string; content: string }> = []
  const cols = Math.min(cards.length, 4)
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    try {
      const node = store.canvasNodes.insert({
        id: uuidv7(), canvasId: canvas.id, type: card.type, content: card.content,
        summary: '', positionX: (i % cols) * 280 + 60,
        positionY: Math.floor(i / cols) * 160 + 60,
        sourceId: '', sourceType: '', aiGenerated: 1, aiSuggestions: '[]',
        userFeedback: '', version: 1, createdAt: now, updatedAt: now,
      })
      created.push({ id: node.id, type: card.type, content: card.content })
    } catch (e: any) {
      console.error('[Canvas] Insert error:', e.message)
    }
  }

  return c.json({
    success: true,
    data: { topic, cardsCreated: created.length, cards: created, provider: usedProvider, model: usedModel },
  })
})
