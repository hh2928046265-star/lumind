import { Hono } from "hono"
import { writeFile, mkdir, readFile } from "fs/promises"
import { join, extname } from "path"
import { existsSync } from "fs"
import { uuidv7 } from "../db"
import { llmService } from "../services/llm"
import {
  getStagePrompt,
  buildCardsUserMessage,
  buildTitlesUserMessage,
} from "../services/prompts"

const UPLOADS_DIR = join(process.cwd(), "uploads")

export const uploadRoutes = new Hono()

uploadRoutes.post("/", async (c) => {
  const body = await c.req.parseBody()
  const file = body.file as File | undefined
  if (!file) return c.json({ success: false, error: "No file uploaded" }, 400)
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = extname(file.name) || ".png"
  const filename = uuidv7() + ext
  const filepath = join(UPLOADS_DIR, filename)
  if (!existsSync(UPLOADS_DIR)) await mkdir(UPLOADS_DIR, { recursive: true })
  await writeFile(filepath, buffer)
  const url = "/uploads/" + filename
  return c.json({ success: true, data: { filename, url, size: buffer.length, mimeType: file.type || "image/png" } })
})

// ===== 单图分析：llava vision → DeepSeek cards + titles =====
uploadRoutes.post("/analyze", async (c) => {
  const body = await c.req.json()
  const imagePath = body.imagePath as string
  if (!imagePath) return c.json({ success: false, error: "No image path" }, 400)
  const fullPath = join(process.cwd(), imagePath.replace(/^\//, ""))
  if (!existsSync(fullPath)) return c.json({ success: false, error: "Image not found" }, 404)
  const buffer = await readFile(fullPath)
  const base64 = buffer.toString("base64")

  // Step 1: Vision analysis (use new prompt system)
  const { system: visionSystem } = getStagePrompt("vision")
  let visionAnalysis = ""

  try {
    const resp = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llava-phi3:3.8b",
        messages: [
          { role: "system", content: visionSystem },
          { role: "user", content: "Describe this photo", images: [base64] },
        ],
        stream: false,
      }),
    })
    const data = await resp.json() as any
    visionAnalysis = data.message?.content || "(no response)"
  } catch {
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
      visionAnalysis = data.message?.content || "(no response)"
    } catch {
      return c.json({ success: false, error: "Image analysis failed" }, 500)
    }
  }

  // Step 2: Generate cards (use new prompt system)
  const { system: cardsSystem } = getStagePrompt("cards_from_photo")
  const cardsUserMessage = buildCardsUserMessage("photo", visionAnalysis)
  let cards: Array<{ type: string; content: string }> = []

  try {
    const resp = await llmService.chat(
      [
        { role: "system", content: cardsSystem },
        { role: "user", content: cardsUserMessage },
      ],
      "openai",
      [],
      "deepseek-v4-pro",
      1,
    )
    const lines = resp.content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 4)
    const seen = new Set<string>()
    for (const line of lines) {
      let c2 = line.replace(/^\d+[\.、\)]\s*/, "").replace(/^[-*]\s*/, "")
      if (c2.length > 3 && !/^(here|ok|sure|the )/i.test(c2)) {
        const key = c2.slice(0, 10)
        if (!seen.has(key)) { seen.add(key); cards.push({ type: "idea", content: c2.slice(0, 120) }) }
      }
    }
  } catch { }

  if (cards.length === 0) {
    cards = [{ type: "idea", content: "被光偏爱的那一秒" }, { type: "idea", content: "想把这一刻存档" }, { type: "idea", content: "今天的颜色刚刚好" }]
  }

  // Step 3: Generate titles (use new prompt system)
  const { system: titlesSystem } = getStagePrompt("titles")
  const titlesUserMessage = buildTitlesUserMessage(visionAnalysis)
  let titles: string[] = []

  try {
    const resp = await llmService.chat(
      [
        { role: "system", content: titlesSystem },
        { role: "user", content: titlesUserMessage },
      ],
      "openai",
      [],
      "deepseek-v4-pro",
      1,
    )
    const match = resp.content.match(/\[[\s\S]*\]/)
    if (match) titles = JSON.parse(match[0])
  } catch {
    titles = ["被光眷顾的瞬间", "整个春天都藏在这了", "温柔到犯规", "是心动啊", "这色调我能看一百遍", "治愈系日常"]
  }

  return c.json({
    success: true,
    data: { analysis: visionAnalysis, cards, titles: titles.slice(0, 6) },
  })
})

// ===== 批量分析：始终保持单分析 + 一次卡片+标题（非多次分组） =====
uploadRoutes.post("/batch-analyze", async (c) => {
  const body = await c.req.parseBody()
  const files: File[] = []
  const topic = (body.topic as string) || ""
  const description = (body.description as string) || ""

  for (const [, value] of Object.entries(body)) {
    if (value instanceof File) files.push(value)
  }

  if (files.length === 0) return c.json({ success: false, error: "没有上传图片" }, 400)

  // Save all files
  const saved: Array<{ url: string; filename: string; fullPath: string }> = []
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = extname(file.name) || ".png"
    const filename = uuidv7() + ext
    const filepath = join(UPLOADS_DIR, filename)
    if (!existsSync(UPLOADS_DIR)) await mkdir(UPLOADS_DIR, { recursive: true })
    await writeFile(filepath, buffer)
    saved.push({ url: "/uploads/" + filename, filename, fullPath: filepath })
  }

  // Vision analysis of all images
  const { system: visionSystem } = getStagePrompt("vision")
  const analyses: string[] = []

  for (const s of saved) {
    try {
      const buffer = await readFile(s.fullPath)
      const base64 = buffer.toString("base64")
      const resp = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llava-phi3:3.8b",
          messages: [
            { role: "system", content: visionSystem },
            { role: "user", content: "Describe this photo", images: [base64] },
          ],
          stream: false,
        }),
      })
      const data = await resp.json() as any
      analyses.push(data.message?.content || "(no response)")
    } catch {
      analyses.push(s.filename + ": (analysis unavailable)")
    }
  }

  const combinedAnalysis = description
    ? "【用户描述】\n" + description + "\n\n【AI识图】\n" + analyses.join("\n\n---\n\n")
    : analyses.join("\n\n---\n\n")

  // Generate cards (use new prompt system)
  const { system: cardsSystem } = getStagePrompt("cards_from_photo")
  const cardsUserMessage = buildCardsUserMessage("photo", combinedAnalysis, topic)
  let cards: Array<{ type: string; content: string }> = []

  try {
    const resp = await llmService.chat(
      [
        { role: "system", content: cardsSystem },
        { role: "user", content: cardsUserMessage },
      ],
      "openai",
      [],
      "deepseek-v4-pro",
      1,
    )
    const lines = resp.content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 4)
    const seen = new Set<string>()
    for (const line of lines) {
      let c2 = line.replace(/^\d+[\.、\)]\s*/, "").replace(/^[-*]\s*/, "")
      if (c2.length > 3 && !/^(here|ok|sure|the )/i.test(c2)) {
        const key = c2.slice(0, 10)
        if (!seen.has(key)) { seen.add(key); cards.push({ type: "idea", content: c2.slice(0, 120) }) }
      }
    }
  } catch {
    try {
      const fb = await llmService.chat(
        [
          { role: "system", content: "根据照片分析生成5个有情绪感的配文方向，每个10-15字，中文编号列表。" },
          { role: "user", content: combinedAnalysis.slice(0, 1500) },
        ],
        "ollama",
        [],
        "qwen2.5:14b",
      )
      const lines = fb.content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 4)
      const seen = new Set<string>()
      for (const line of lines) {
        let c2 = line.replace(/^\d+[\.、\)]\s*/, "").replace(/^[-*]\s*/, "")
        if (c2.length > 3) {
          const key = c2.slice(0, 10)
          if (!seen.has(key)) { seen.add(key); cards.push({ type: "idea", content: c2.slice(0, 100) }) }
        }
      }
    } catch { }
  }

  // Generate titles
  const { system: titlesSystem } = getStagePrompt("titles")
  const titlesUserMessage = buildTitlesUserMessage(combinedAnalysis, topic)
  let titles: string[] = []

  try {
    const resp = await llmService.chat(
      [
        { role: "system", content: titlesSystem },
        { role: "user", content: titlesUserMessage },
      ],
      "openai",
      [],
      "deepseek-v4-pro",
      1,
    )
    const match = resp.content.match(/\[[\s\S]*\]/)
    if (match) titles = JSON.parse(match[0])
  } catch {
    titles = ["被光眷顾的瞬间", "整个春天都藏在这了", "温柔到犯规", "是心动啊", "这色调我能看一百遍", "治愈系日常"]
  }

  return c.json({
    success: true,
    data: {
      images: saved.map((s) => ({ url: s.url, filename: s.filename })),
      analysis: combinedAnalysis,
      usedDescription: !!description,
      cards,
      titles: titles.slice(0, 6),
    },
  })
})

uploadRoutes.get("/list", async (c) => {
  const { readdir, stat } = await import("fs/promises")
  const files = await readdir(UPLOADS_DIR).catch(() => [] as string[])
  const result = await Promise.all(
    files.map(async (f) => {
      const s = await stat(join(UPLOADS_DIR, f)).catch(() => null)
      return {
        filename: f, url: "/uploads/" + f,
        size: (s && s.size) || 0,
        uploadedAt: (s && s.mtime && s.mtime.toISOString()) || "",
      }
    }),
  )
  return c.json({ success: true, data: result.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)) })
})
