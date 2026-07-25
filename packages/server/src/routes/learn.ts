import { Hono } from "hono"
import { store, uuidv7 } from "../db"
import { llmService } from "../services/llm"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join, extname } from "path"
import { existsSync } from "fs"

export const learnRoutes = new Hono()

// ===== 资料管理 =====

// 获取知识库的所有资料
learnRoutes.get("/sources", (c) => {
  const kbId = c.req.query("kbId") || ""
  if (!kbId) return c.json({ success: false, error: "请指定知识库" }, 400)
  const sources = store.sources.findAll((s: any) => s.knowledgeBaseId === kbId)
    .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt))
    .map((s: any) => ({
      id: s.id, title: s.title, type: s.type,
      summary: s.summary, conceptCount: JSON.parse(s.conceptIds || "[]").length,
      createdAt: s.createdAt
    }))
  return c.json({ success: true, data: sources })
})

// 上传文件资料（PDF/TXT）
learnRoutes.post("/upload", async (c) => {
  const body = await c.req.parseBody()
  const kbId = body.knowledgeBaseId as string || ""
  const file = Object.values(body).find(v => v instanceof File) as File | undefined
  if (!kbId) return c.json({ success: false, error: "请指定知识库" }, 400)
  if (!file) return c.json({ success: false, error: "请上传文件" }, 400)

  const ext = extname(file.name).toLowerCase()
  const allowed = [".txt", ".pdf", ".md", ".csv", ".json"]
  if (!allowed.includes(ext)) {
    return c.json({ success: false, error: "不支持的文件格式，支持: " + allowed.join(", ") }, 400)
  }

  // Save file
  const filename = uuidv7() + ext
  const filepath = join(process.cwd(), "uploads", filename)
  if (!existsSync(join(process.cwd(), "uploads"))) await mkdir(join(process.cwd(), "uploads"), { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filepath, buffer)

  // Extract text
  let text = ""
  if (ext === ".txt" || ext === ".md" || ext === ".csv" || ext === ".json") {
    text = buffer.toString("utf-8")
  } else if (ext === ".pdf") {
    try {
      const pdfParse = (await import("pdf-parse")).default
      const data = await pdfParse(buffer)
      text = data.text || ""
    } catch (e: any) {
      return c.json({ success: false, error: "PDF 解析失败: " + (e.message || "未知错误") }, 400)
    }
  }

  if (!text.trim() || text.length < 30) {
    return c.json({ success: false, error: "文件内容太少（至少30字）" }, 400)
  }

  const now = new Date().toISOString()
  const sourceId = uuidv7()
  
  // Auto-generate summary using LLM
  let summary = ""
  try {
    const resp = await llmService.chat(
      [{ role: "system", content: "用一句话总结这段内容（20字以内），只输出总结。" },
       { role: "user", content: text.slice(0, 3000) }],
      "openai", [], "deepseek-v4-pro", 0
    )
    summary = resp.content.trim().slice(0, 100)
  } catch {}

  const source = {
    id: sourceId, knowledgeBaseId: kbId, userId: "default",
    title: file.name, type: ext.replace(".", ""),
    rawContent: text, summary,
    conceptIds: "[]",
    createdAt: now
  }
  store.sources.insert(source)

  // Update knowledge base source count
  const kb = store.knowledgeBases.findById(kbId)
  if (kb) {
    store.knowledgeBases.update(kbId, {
      sourceCount: (kb.sourceCount || 0) + 1,
      updatedAt: now
    })
  }

  return c.json({
    success: true,
    data: {
      sourceId, title: file.name, type: ext.replace(".", ""),
      summary, charCount: text.length
    }
  })
})

// 从URL抓取内容
learnRoutes.post("/fetch-url", async (c) => {
  const body = await c.req.json()
  const kbId = body.knowledgeBaseId as string || ""
  const url = body.url as string || ""
  if (!kbId) return c.json({ success: false, error: "请指定知识库" }, 400)
  if (!url.trim()) return c.json({ success: false, error: "请输入URL" }, 400)

  let text = ""
  let title = url
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) })
    const html = await resp.text()
    // Simple HTML to text extraction
    text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    if (titleMatch) title = titleMatch[1].trim()
  } catch (e: any) {
    return c.json({ success: false, error: "URL 抓取失败: " + (e.message || "未知错误") }, 400)
  }

  if (!text.trim() || text.length < 50) {
    return c.json({ success: false, error: "URL 内容太少" }, 400)
  }

  const now = new Date().toISOString()
  const sourceId = uuidv7()
  
  let summary = ""
  try {
    const resp = await llmService.chat(
      [{ role: "system", content: "用一句话总结（20字以内），只输出总结。" },
       { role: "user", content: text.slice(0, 2000) + "\n\n标题：" + title }],
      "openai", [], "deepseek-v4-pro", 0
    )
    summary = resp.content.trim().slice(0, 100)
  } catch {}

  const source = {
    id: sourceId, knowledgeBaseId: kbId, userId: "default",
    title, type: "url",
    rawContent: text.slice(0, 50000), summary,
    conceptIds: "[]",
    createdAt: now
  }
  store.sources.insert(source)

  const kb = store.knowledgeBases.findById(kbId)
  if (kb) {
    store.knowledgeBases.update(kbId, {
      sourceCount: (kb.sourceCount || 0) + 1,
      updatedAt: now
    })
  }

  return c.json({
    success: true,
    data: { sourceId, title, type: "url", summary, rawContent: text.slice(0, 50000), charCount: text.length }
  })
})

learnRoutes.get("/concepts", (c) => {
  const kbId = c.req.query("kbId") || ""
  let concepts = store.concepts.findAll()
  if (kbId) concepts = concepts.filter((cc: any) => cc.knowledgeBaseId === kbId)
  return c.json({ success: true, data: concepts.map((cc: any) => ({
    id: cc.id, title: cc.title, content: cc.content, category: cc.category,
    mastery: cc.mastery, examCount: cc.examCount, correctCount: cc.correctCount,
    bankSize: store.questionBank.findAll((q: any) => q.conceptId === cc.id).length
  })) })
})


learnRoutes.get("/wrong-questions", (c) => {
  const kbId = c.req.query("kbId") || ""
  const all = store.questionBank.findAll()
  const wrong = all.filter((q: any) => (q.wrongCount || 0) > 0)
  // 如果指定了知识库，通过概念关联过滤
  let result = wrong
  if (kbId) {
    const kbConceptIds = new Set(store.concepts.findAll((cc: any) => cc.knowledgeBaseId === kbId).map((cc: any) => cc.id))
    result = wrong.filter((q: any) => kbConceptIds.has(q.conceptId))
  }
  result.sort((a: any, b: any) => (b.wrongCount || 0) - (a.wrongCount || 0))
  return c.json({
    success: true,
    data: result.map((q: any) => ({
      id: q.id, conceptTitle: q.conceptTitle, type: q.type,
      stem: q.stem, options: q.options ? JSON.parse(q.options) : undefined,
      correctAnswer: q.correctAnswer, explanation: q.explanation || "",
      wrongCount: q.wrongCount || 0, consecutiveCorrect: q.consecutiveCorrect || 0
    }))
  })
})

learnRoutes.get("/exams", (c) => {
  const kbId = c.req.query("kbId") || ""
  let exams = store.exams.findAll()
  if (kbId) exams = exams.filter((e: any) => e.knowledgeBaseId === kbId)
  return c.json({ success: true, data: exams.map((e: any) => ({
    id: e.id, title: e.title, difficulty: e.difficulty, score: e.score,
    passed: e.passed, questions: JSON.parse(e.questions).length, createdAt: e.createdAt
  })) })
})

function extractJson(raw: string): any {
  try { return JSON.parse(raw) } catch {}
  const m = raw.match(/\x60\x60\x60(?:json)?\s*([\s\S]*?)\s*\x60\x60\x60/)
  if (m) { try { return JSON.parse(m[1]) } catch {} }
  const am = raw.match(/\[[\s\S]*\]/)
  if (am) { try { return JSON.parse(am[0]) } catch {} }
  const om = raw.match(/\{[\s\S]*\}/)
  if (om) { try { return JSON.parse(om[0]) } catch {} }
  return {}
}
function splitText(text: string, size: number): string[] {
  const chunks: string[] = [], paragraphs = text.split(/\n\n+/)
  let cur = ""
  for (const p of paragraphs) {
    if ((cur + p).length > size && cur.length > 0) { chunks.push(cur.trim()); cur = p }
    else cur += (cur ? "\n\n" : "") + p
  }
  if (cur.trim()) chunks.push(cur.trim())
  return chunks.length > 0 ? chunks : [text]
}


// 重新生成题库（为已有知识点补全题目）
learnRoutes.post("/regenerate-questions", async (c) => {
  const body = await c.req.json()
  const kbId = (body.knowledgeBaseId as string) || ""
  if (!kbId) return c.json({ success: false, error: "请指定知识库" }, 400)

  const concepts = store.concepts.findAll((cc: any) => cc.knowledgeBaseId === kbId)
  if (concepts.length === 0) {
    return c.json({ success: false, error: "该知识库没有知识点" }, 400)
  }

  const now = new Date().toISOString()
  let totalQuestions = 0
  let failedCount = 0
  const failedNames: string[] = []

  for (let ci = 0; ci < concepts.length; ci++) {
    const concept = concepts[ci] as any
    try {
      console.log(`[Learn] 补全出题 ${ci+1}/${concepts.length}: ${concept.title}`)
      const qResp = await llmService.chat(
        [
          { role: "system", content: createSinglePrompt({ title: concept.title, content: concept.content }) },
          { role: "user", content: `【${concept.title}】\n${(concept.content||"").slice(0, 500)}` }
        ],
        "openai", [], "deepseek-v4-pro", 2
      )
      const result = extractJson(qResp.content)
      const questions = result.questions || (Array.isArray(result) ? result : [])
      if (Array.isArray(questions)) {
        for (const q of questions) {
          if (!q.type || !q.stem || !q.correctAnswer) continue
          if (!validateQ(q)) continue
          store.questionBank.insert({
            id: uuidv7(), conceptId: concept.id,
            conceptTitle: concept.title, type: q.type,
            difficulty: q.type === "choice" ? "easy" : q.type === "truefalse" ? "hard" : "perfect",
            stem: q.stem,
            options: q.options ? JSON.stringify(q.options) : "",
            correctAnswer: String(q.correctAnswer),
            keyPoints: "", explanation: q.explanation || "",
            wrongCount: 0, consecutiveCorrect: 0, usageCount: 0, lastUsedAt: "", createdAt: now
          })
          totalQuestions++
        }
      }
      await new Promise(r => setTimeout(r, 600))
    } catch (e: any) {
      failedCount++
      failedNames.push(concept.title)
      console.warn(`[Learn] 补全失败 ${concept.title}:`, e.message?.slice?.(0, 60))
    }
  }

  return c.json({
    success: true,
    data: {
      totalConcepts: concepts.length - failedCount, totalQuestions,
      failedCount, failedNames: failedNames.length > 0 ? failedNames : undefined
    }
  })
})

function calcNextReview(mastery: number): string {
  let interval = 1
  if (mastery >= 0.9) interval = 14
  else if (mastery >= 0.7) interval = 7
  else if (mastery >= 0.5) interval = 3
  const d = new Date(); d.setDate(d.getDate() + interval); return d.toISOString()
}

learnRoutes.post("/extract", async (c) => {
  const body = await c.req.json()
  const kbId = (body.knowledgeBaseId as string) || ""
  const sourceId = (body.sourceId as string) || ""  // 可选：指定已存在的资料
  const title = (body.title as string) || "未命名"
  const content = (body.content as string) || ""
  const now = new Date().toISOString()
  if (!kbId) return c.json({ success: false, error: "请先选择知识库" }, 400)
  if (!content.trim()) return c.json({ success: false, error: "请输入学习资料" }, 400)
  if (content.length < 50) return c.json({ success: false, error: "资料太短，至少50字" }, 400)

  const finalSourceId = sourceId || uuidv7()
  const chunks = content.length > 8000 ? splitText(content, 4000) : [content]
  let allConcepts: Array<{ title: string; content: string; category: string }> = []
  let summary = ""

  for (let ci = 0; ci < chunks.length; ci++) {
    try {
      const resp = await llmService.chat(
        [{ role: "system", content: "提取核心知识点。输出JSON：{\"summary\":\"...\",\"concepts\":[{\"title\":\"概念\",\"content\":\"解释\",\"category\":\"分类\"}]}" },
         { role: "user", content: chunks[ci].slice(0, 6000) }],
        "openai", [], "deepseek-v4-pro", 1
      )
      const json = extractJson(resp.content)
      if (json.summary && ci === 0) summary = json.summary
      if (json.concepts) allConcepts.push(...json.concepts)
    } catch (e: any) {
      console.warn("[Learn] chunk failed:", e.message?.slice?.(0, 60))
    }
  }

  if (allConcepts.length === 0) {
    return c.json({ success: false, error: "未能提取到知识点" }, 400)
  }

  const seen = new Set<string>()
  const unique = allConcepts.filter(c => {
    const k = c.title.slice(0, 20)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  store.sources.insert({
    id: finalSourceId, knowledgeBaseId: kbId, userId: "default", title,
    type: "text", rawContent: content.slice(0, 50000), summary,
    conceptIds: JSON.stringify(unique.map(c => c.title)), createdAt: now
  })

  const created: Array<{ id: string; title: string; content: string; category: string }> = []
  for (const c of unique) {
    const existing = store.concepts.findOne((x: any) =>
      x.title === c.title && x.knowledgeBaseId === kbId)
    let cid: string
    if (existing) {
      cid = existing.id
      const sids: string[] = JSON.parse(existing.sourceIds || "[]")
      if (!sids.includes(finalSourceId)) {
        sids.push(finalSourceId)
        store.concepts.update(existing.id, {
          sourceIds: JSON.stringify(sids), updatedAt: now
        })
      }
    } else {
      cid = uuidv7()
      store.concepts.insert({
        id: cid, knowledgeBaseId: kbId,
        sourceIds: JSON.stringify([finalSourceId]),
        title: c.title, content: c.content,
        category: c.category || "未分类", mastery: 0,
        lastReviewedAt: "", nextReviewAt: "",
        examCount: 0, correctCount: 0, memoryNodeId: "",
        createdAt: now, updatedAt: now
      })
    }
    created.push({ id: cid, title: c.title, content: c.content, category: c.category })
  }

  // 逐个概念出题（细粒度，每个概念独立调用，失败不影响其他）
  let totalQuestions = 0
  let rejectedQuestions = 0
  const failedConcepts: string[] = []
  for (let ci = 0; ci < created.length; ci++) {
    const concept = created[ci]
    try {
      console.log(`[Learn] 出题 ${ci+1}/${created.length}: ${concept.title}`)
      const qResp = await llmService.chat(
        [
          { role: "system", content: createSinglePrompt(concept) },
          { role: "user", content: `【${concept.title}】\n${concept.content.slice(0, 500)}` }
        ],
        "openai", [], "deepseek-v4-pro", 2
      )
      const result = extractJson(qResp.content)
      const questions = result.questions || (Array.isArray(result) ? result : [])
      if (Array.isArray(questions)) {
        for (const q of questions) {
          if (!q.type || !q.stem || !q.correctAnswer) continue
          if (!validateQ(q)) { rejectedQuestions++; continue }
          store.questionBank.insert({
            id: uuidv7(), conceptId: concept.id,
            conceptTitle: concept.title, type: q.type,
            difficulty: q.type === "choice" ? "easy" : q.type === "truefalse" ? "hard" : "perfect",
            stem: q.stem,
            options: q.options ? JSON.stringify(q.options) : "",
            correctAnswer: String(q.correctAnswer),
            keyPoints: "", explanation: q.explanation || "",
            wrongCount: 0, consecutiveCorrect: 0, usageCount: 0, lastUsedAt: "", createdAt: now
          })
          totalQuestions++
        }
      }
      await new Promise(r => setTimeout(r, 600)) // 避免限流
    } catch (e: any) {
      failedConcepts.push(concept.title)
      console.warn(`[Learn] 出题失败 ${concept.title}:`, e.message?.slice?.(0, 60))
    }
  }
  if (failedConcepts.length > 0) {
    console.warn(`[Learn] ${failedConcepts.length}个概念出题失败: ${failedConcepts.join(", ")}`)
  }
  if (rejectedQuestions > 0) {
    console.warn("[Learn] 已过滤 " + rejectedQuestions + " 道不合格题目")
  }

  return c.json({
    success: true,
    data: {
      sourceId, summary,
      concepts: created.map(c => ({
        id: c.id, title: c.title, content: c.content, category: c.category
      })),
      totalExtracted: created.length,
      questionsGenerated: totalQuestions,
      questionsRejected: rejectedQuestions
    }
  })
})

learnRoutes.post("/exam/generate", async (c) => {
  const body = await c.req.json()
  const kbId = (body.knowledgeBaseId as string) || ""
  if (!kbId) return c.json({ success: false, error: "请先选择知识库" }, 400)
  const qc = Math.min(body.questionCount || 10, 30)
  const difficulty = (body.difficulty as string) || "easy"
  if (!["easy", "hard", "perfect"].includes(difficulty)) {
    return c.json({ success: false, error: "难度无效" }, 400)
  }

  const targets = store.concepts.findAll((cc: any) => cc.knowledgeBaseId === kbId)
  if (targets.length === 0) {
    return c.json({ success: false, error: "该知识库没有知识点，请先输入学习资料" }, 400)
  }

  const now = new Date().toISOString()

  // 全局题目池：从所有概念拉题，按错题优先级排序
  let allPool: any[] = []
  for (const cc of targets) {
    let bank = store.questionBank.findAll((q: any) => q.conceptId === cc.id)
    if (difficulty === "easy") bank = bank.filter((q: any) => q.type !== "multi_choice")
    else if (difficulty === "perfect") bank = bank.filter((q: any) => q.type === "multi_choice" || q.difficulty === "perfect")
    for (const q of bank) allPool.push(q)
  }

  // 混合出题：30%新题 + 70%按优先级(错题优先)
  const unusedPool = allPool.filter((q: any) => (q.usageCount || 0) === 0)
  const usedPool = allPool.filter((q: any) => (q.usageCount || 0) > 0)
  usedPool.sort((a: any, b: any) => {
    const sa = (a.wrongCount||0)*10 - (a.consecutiveCorrect||0)*3
    const sb = (b.wrongCount||0)*10 - (b.consecutiveCorrect||0)*3
    return sb - sa
  })
  const shuffle = (arr: any[]) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] } }
  shuffle(unusedPool)
  const picked: any[] = []
  const pickedCids: string[] = []
  const newQuota = Math.min(Math.ceil(qc * 0.3), unusedPool.length)
  for (let i = 0; i < newQuota && picked.length < qc; i++) {
    const q = unusedPool[i]
    if (!picked.find((p: any) => p.id === q.id)) {
      picked.push(q)
      const pq = store.questionBank.findById(q.id)
      if (pq && !pickedCids.includes(pq.conceptId)) pickedCids.push(pq.conceptId)
      store.questionBank.update(q.id, { usageCount: (q.usageCount||0)+1, lastUsedAt: now })
    }
  }
  const remainingPool = [...unusedPool.slice(newQuota), ...usedPool]
  shuffle(remainingPool)
  for (const q of remainingPool) {
    if (picked.length >= qc) break
    if (picked.find((p: any) => p.id === q.id)) continue
    picked.push(q)
    const pq = store.questionBank.findById(q.id)
    if (pq && !pickedCids.includes(pq.conceptId)) pickedCids.push(pq.conceptId)
    store.questionBank.update(q.id, { usageCount: (q.usageCount||0)+1, lastUsedAt: now })
  }

  if (picked.length === 0) {
    return c.json({ success: false, error: "题库为空，请先输入资料生成题库" }, 400)
  }

  const threshold: Record<string, number> = { easy: 60, hard: 90, perfect: 100 }
  const examId = uuidv7()
  store.exams.insert({
    id: examId, knowledgeBaseId: kbId, userId: "default",
    title: ({ easy: "轻松", hard: "严格", perfect: "完美" })[difficulty]
      + "模式 · " + picked.length + "题",
    conceptIds: JSON.stringify(pickedCids),
    difficulty, passThreshold: threshold[difficulty], passed: false,
    questions: JSON.stringify(picked.map((q: any) => ({
      id: q.id, type: q.type, stem: q.stem,
      options: q.options ? JSON.parse(q.options) : undefined,
      correctAnswer: q.correctAnswer, explanation: q.explanation
    }))),
    answers: "[]", score: 0, feedback: "", status: "pending",
    createdAt: now, completedAt: ""
  })

  return c.json({
    success: true,
    data: {
      examId, title: ({ easy: "轻松", hard: "严格", perfect: "完美" })[difficulty]
        + "模式 · " + picked.length + "题",
      difficulty, passThreshold: threshold[difficulty],
      questionCount: picked.length,
      questions: picked.map((q: any) => ({
        id: q.id, type: q.type, stem: q.stem,
        options: q.options ? JSON.parse(q.options) : undefined
      }))
    }
  })
})

learnRoutes.post("/exam/submit", async (c) => {
  const body = await c.req.json()
  const examId = body.examId as string
  let userAnswers = body.answers; if (!Array.isArray(userAnswers)) userAnswers = []
  const exam = store.exams.findById(examId)
  if (!exam) return c.json({ success: false, error: "考试不存在" }, 404)
  if (exam.status === "completed") return c.json({ success: false, error: "已提交过" }, 400)

  const now = new Date().toISOString()
  const questions = JSON.parse(exam.questions)

  const graded = questions.map((q: any) => {
    const ua = userAnswers.find((a: any) => a.questionId === q.id)
    const userAns = ua ? ua.answer.trim() : ""
    let isCorrect = false
    if (q.type === "multi_choice") {
      const correctSet = String(q.correctAnswer).split(",")
        .map((s: string) => s.trim()).sort().join(",")
      const userSet = userAns.split(",")
        .map((s: string) => s.trim()).sort().join(",")
      isCorrect = correctSet === userSet
    } else {
      isCorrect = String(userAns).toLowerCase()
        === String(q.correctAnswer).toLowerCase()
    }
    return {
      questionId: q.id, stem: q.stem, type: q.type,
      userAnswer: userAns, correctAnswer: String(q.correctAnswer),
      isCorrect, explanation: q.explanation || ""
    }
  })

  const correctCount = graded.filter((g: any) => g.isCorrect).length
  const score = Math.round((correctCount / questions.length) * 100)
  const passed = score >= exam.passThreshold
  store.exams.update(examId, {
    answers: JSON.stringify(userAnswers), score, passed,
    status: "completed", feedback: JSON.stringify(graded),
    completedAt: now
  })

  
  // 更新题目统计：对+1连续正确，错清零+记错次数
  for (const g of graded) {
    const qb = store.questionBank.findById(g.questionId)
    if (!qb) continue
    if (g.isCorrect) {
      store.questionBank.update(g.questionId, {
        consecutiveCorrect: (qb.consecutiveCorrect || 0) + 1
      })
    } else {
      store.questionBank.update(g.questionId, {
        wrongCount: (qb.wrongCount || 0) + 1,
        consecutiveCorrect: 0
      })
    }
  }
// 更新掌握度
  const cids: string[] = JSON.parse(exam.conceptIds)
  for (const cid of cids) {
    const concept = store.concepts.findById(cid)
    if (!concept) continue
    const related = graded.filter((g: any) => {
      const q = questions.find((qq: any) => qq.id === g.questionId)
      return q && store.questionBank.findById(q.id)?.conceptId === cid
    })
    const rc = related.filter((g: any) => g.isCorrect).length
    const rt = related.length || 1
    const dw: Record<string, number> = { easy: 1.0, hard: 1.2, perfect: 1.5 }
    let nm = (concept.mastery || 0) * 0.4
      + (rc / rt) * (dw[exam.difficulty as string] || 1.0) * 0.6
    if (exam.difficulty === "perfect" && rc === rt) nm = 1.0
    nm = Math.max(0, Math.min(1, nm))
    store.concepts.update(cid, {
      mastery: Math.round(nm * 100) / 100,
      examCount: (concept.examCount || 0) + rt,
      correctCount: (concept.correctCount || 0) + rc,
      lastReviewedAt: now,
      nextReviewAt: calcNextReview(nm),
      updatedAt: now
    })
  }

  const weak = cids.map(cid => store.concepts.findById(cid))
    .filter((cc: any) => cc && cc.mastery < 0.6)
    .map((cc: any) => cc.title)

  return c.json({
    success: true,
    data: {
      examId, score, totalQuestions: questions.length, correctCount,
      difficulty: ({ easy: "轻松", hard: "严格", perfect: "完美" })[exam.difficulty as string],
      passThreshold: exam.passThreshold, passed,
      weakConcepts: weak,
      items: graded.map((g: any) => ({
        stem: g.stem, type: g.type,
        userAnswer: g.userAnswer, correctAnswer: g.correctAnswer,
        isCorrect: g.isCorrect, explanation: g.explanation
      }))
    }
  })
})

function createSinglePrompt(concept: { title: string; content: string }): string {
  return [
    "为以下知识点出3道题（1单选+1判断+1多选），基于知识点内容，不能编造。",
    "",
    "规则：",
    "- choice(单选): 4个选项A/B/C/D，只有1个正确，correctAnswer为单个大写字母如A",
    "- truefalse(判断): 一句陈述，correctAnswer为true或false",
    "- multi_choice(多选): 4个选项，2-3个正确，correctAnswer如A,C",
    "- 正确答案必须唯一确定，不容争议",
    "- 错误选项明确错误，不模棱两可",
    "",
    '输出JSON：{"questions":[{object},...]}',
    '每个对象：{"conceptTitle":"知识点名","type":"...","stem":"题干","options":["选项"],"correctAnswer":"...","explanation":"解析"}',
  ].join("\n")
}

function createStrictPrompt(concepts: Array<{ title: string; content: string }>): string {
  return [
    "你是考试出题人。为以下知识点出题，每个知识点3道（1单选+1判断+1多选），共" + (concepts.length * 3) + "道。",
    "",
    "【铁律 — 违反任何一条的题目直接作废】",
    "1. 每道题的正确答案必须能从知识点内容中唯一、确定地推导出来，不容任何争议。",
    "2. 错误选项必须明确错误，不能模棱两可。不能出现「也对」的选项。",
    "3. 判断题的陈述必须是客观事实判断，不能是观点、评价或主观描述。",
    "4. 不得出「以下哪个不是」等否定型题干，容易混淆。",
    "5. 题干必须独立完整，不依赖其他题目。",
    "6. 单选题只能有1个正确选项。多选必须有2-3个正确选项（不能1个，不能4个全对）。",
    "7. 判断题 correctAnswer 只能是 true 或 false 字符串。",
    "8. 所有题目必须基于知识点内容本身，不得编造不存在的信息。",
    "9. 不要出「以上都对」「以上都不对」等取巧选项。",
    "",
    "【题型格式】",
    "- choice(单选): 4个选项A/B/C/D，只有1个正确，correctAnswer为单个大写字母如A",
    "- truefalse(判断): 一句陈述，correctAnswer为true或false",
    "- multi_choice(多选): 4个选项，2-3个正确，correctAnswer如A,C（逗号连接，大写）",
    "",
    '输出JSON：{"questions":[{object},...]}',
    '每个对象：{"conceptTitle":"知识点名","type":"...","stem":"题干","options":["选项","内容"],"correctAnswer":"...","explanation":"一句话解析，引用原文"}',
  ].join("\n")
}

function validateQ(q: any): boolean {
  if (!q.stem || q.stem.trim().length < 5) return false
  if (q.type === "choice") {
    if (!Array.isArray(q.options) || q.options.length !== 4) return false
    if (!"ABCD".includes(String(q.correctAnswer).trim().toUpperCase())) return false
  } else if (q.type === "truefalse") {
    const ans = String(q.correctAnswer).trim().toLowerCase()
    if (ans !== "true" && ans !== "false") return false
  } else if (q.type === "multi_choice") {
    if (!Array.isArray(q.options) || q.options.length !== 4) return false
    const ap = String(q.correctAnswer).split(",")
      .map((s: string) => s.trim().toUpperCase()).filter(Boolean)
    if (ap.length < 2 || ap.length > 3) return false
    if (!ap.every((a: string) => "ABCD".includes(a))) return false
  } else {
    return false
  }
  return true
}





