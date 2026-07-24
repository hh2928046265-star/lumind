const IMAGE_ANALYSIS_PROMPT = "You are an image description machine. ONLY list what you can actually SEE. NEVER guess or add things that are commonly associated (e.g., flowers do NOT mean bees, ocean does NOT mean boats). Format: Subjects:|Colors:|Lighting:|Mood:"

// ===== 主创作流水线 =====
export async function executeCreativePipeline(ctx: { workspaceId: string; title?: string; cardContent?: string }, format: string = "blog") {
  const modelsUsed: string[] = []
  let totalTokens = 0
  const pipelineId = uuidv7()

  const push = (stage: string, detail: string) => {
    pipelineProgress.set(pipelineId, { stage, detail, updatedAt: new Date().toISOString() })
  }

  let cardTexts = ""
  let visionContext = ""

  // 如果用户选了卡片方向，只用那张卡片，跳过 Canvas
  if (ctx.cardContent) {
    cardTexts = ctx.cardContent
    push("curator", "使用选中的卡片方向")
  } else {
    // 1. 从 Canvas 收集素材
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
          const imgPath = node.content.startsWith("/uploads/")
            ? pathJoin(process.cwd(), node.content.replace(/^\//, ""))
            : node.content
          let dataUrl = node.content
          if (existsSync(imgPath)) {
            const buf = readFileSync(imgPath)
            const ext = pathExtname(imgPath).replace(".", "") || "png"
            dataUrl = "data:image/" + ext + ";base64," + buf.toString("base64")
          }
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 15000)
          const llavaResp = await fetch("http://localhost:11434/api/chat", {
            method: "POST", signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llava-phi3:3.8b",
              messages: [
                { role: "system", content: IMAGE_ANALYSIS_PROMPT },
                { role: "user", content: "Describe this photo", images: [dataUrl.split(",")[1]] },
              ],
              stream: false,
            }),
          }).catch(() => null).finally(() => clearTimeout(timeoutId))
          if (llavaResp?.ok) {
            const fd = await llavaResp.json() as any
            visionContext += "\n[Photo] " + (fd.message?.content || "") + "\n"
            modelsUsed.push("llava-phi3:3.8b")
          }
        } catch {}
      }
    }
    if (visionContext) push("vision", "图片分析完成")
  }

  // 2. DeepSeek 直写
  const fmt = FORMAT_PROMPTS[format] || FORMAT_PROMPTS.article
  push("writer", "DeepSeek " + fmt.label + "创作中...")

  const baseContext = visionContext ? "【画面参考】：\n" + visionContext.slice(0, 2000) + "\n\n" : ""
  const userContent = (ctx.title ? "标题：" + ctx.title + "\n\n" : "") + baseContext + "【卡片——你只能基于此来写】：\n" + cardTexts + "\n\n警告：不要编故事、编人物、编经历。你不是人类。"

  let finalContent = ""
  let usedModel = ""

  try {
    finalContent = await deepseekWrite(fmt.system, userContent)
    usedModel = "deepseek-v4-pro"
    modelsUsed.push("deepseek-v4-pro")
    push("writer", "DeepSeek " + fmt.label + "完成")
  } catch (e) {
    console.warn("[Pipeline] DeepSeek failed:", (e as Error).message?.slice(0, 80))
    push("writer", "DeepSeek 不可用，本地模型降级...")
    try {
      finalContent = await localFallbackWrite(fmt.system, userContent)
      usedModel = "qwen2.5:14b"
      modelsUsed.push("qwen2.5:14b")
    } catch (e2) {
      throw new Error("所有模型调用失败: " + (e2 as Error).message)
    }
  }

  const finalTitle = extractTitle(finalContent, "未命名")

  // 3. 存储草稿
  const now = new Date().toISOString()
  const draftId = uuidv7()
  store.drafts.insert({
    id: draftId, workspaceId: ctx.workspaceId, title: finalTitle, format, content: finalContent,
    sourceStructureId: "", pipelineStatus: JSON.stringify({ model: usedModel, modelsUsed }),
    reviewCardId: "", status: "draft", referencedAssetIds: "[]", createdAt: now, updatedAt: now,
  })

  // 4. 记忆提取
  let memoryStats
  try {
    const canvas = store.canvases.findOne((c: any) => c.workspaceId === ctx.workspaceId)
    const nodes = canvas ? store.canvasNodes.findAll((n: any) => n.canvasId === canvas.id) : []
    const ct = nodes.map((c: any) => c.type + ": " + c.content).join("\n")
    const ext = await extractMemoryFromContent(ct, finalContent, "ollama")
    memoryStats = persistMemoryNodes(ext, ctx.workspaceId)
    modelsUsed.push("nomic-embed-text")
  } catch {}

  notify.pipelineComplete(finalTitle, draftId)
  if (memoryStats) notify.memoryExtracted(memoryStats.createdNodes, memoryStats.createdEdges)

  return {
    draftId, title: finalTitle, content: finalContent,
    intent: "creative" as TaskIntent,
    usage: { totalTokens, modelsUsed },
    memoryStats,
  }
}
