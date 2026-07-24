/**
 * 统一 Prompt 模板系统
 * 三层架构：Identity 上下文 → 阶段 Prompt → 场景注入
 * 所有 LLM 调用必须经过此系统，确保风格一致性
 */

import { store } from "../../db"

// ============================================================
// Layer 1: Identity Context（从数据库读取，所有调用共享）
// ============================================================

export interface IdentityContext {
  domains: string[]
  likes: string[]
  dislikes: string[]
  writingStyle: string
  valueOrientation: string
  avoidPatterns: string[]
}

let cachedIdentity: IdentityContext | null = null
let cacheTime = 0
const CACHE_TTL = 60000 // 1分钟缓存

/** 获取当前用户身份上下文（带缓存） */
export function getIdentityContext(): IdentityContext {
  const now = Date.now()
  if (cachedIdentity && now - cacheTime < CACHE_TTL) return cachedIdentity

  const identity = store.identities.findOne((i: any) => i.userId === "default")
  if (!identity) {
    cachedIdentity = getDefaultIdentity()
    cacheTime = now
    return cachedIdentity
  }

  const domains = safeJSON<string[]>(identity.domains, [])
  const prefs = safeJSON<{ likes: string[]; dislikes: string[] }>(identity.aestheticPrefs, { likes: [], dislikes: [] })
  const style = safeJSON<Record<string, any>>(identity.writingStyle, {})
  const weights = safeJSON<Record<string, any>>(identity.learnedWeights, {})
  const avoidPatterns = weights.avoidPatterns || []

  cachedIdentity = {
    domains,
    likes: prefs.likes || [],
    dislikes: prefs.dislikes || [],
    writingStyle: style.valueOrientation || "",
    valueOrientation: style.valueOrientation || "",
    avoidPatterns,
  }
  cacheTime = now
  return cachedIdentity
}

/** 构建注入到 system prompt 的身份指令 */
export function buildIdentityPrompt(): string {
  const id = getIdentityContext()
  const parts: string[] = []

  // 核心偏好
  if (id.likes.length > 0) {
    parts.push("创作偏好：" + id.likes.join("、"))
  }
  if (id.dislikes.length > 0) {
    parts.push("坚决避免：" + id.dislikes.join("、"))
  }
  if (id.avoidPatterns.length > 0) {
    parts.push("禁止模式：" + id.avoidPatterns.join("、"))
  }
  if (id.domains.length > 0) {
    parts.push("创作领域背景：" + id.domains.join("、"))
  }

  return parts.length > 0 ? parts.join("。") + "。" : ""
}

/** 清除缓存（Identity 更新后调用） */
export function clearIdentityCache() {
  cachedIdentity = null
  cacheTime = 0
}

function getDefaultIdentity(): IdentityContext {
  return {
    domains: ["摄影", "生活美学", "人文"],
    likes: ["情绪氛围", "意象跳跃", "留白", "高级感", "网感", "小红书风"],
    dislikes: ["哲学分析", "学术腔", "摄影术语", "编造个人经历", "低幼表达", "AI套话", "标题党", "直接描述画面"],
    writingStyle: "简洁、意象化、有情绪张力、不啰嗦",
    valueOrientation: "审美优先、情感真实",
    avoidPatterns: ["不是…而是…", "原来…", "你看…", "我发现…", "记得有一次…"],
  }
}

function safeJSON<T>(str: string, fallback: T): T {
  try { return JSON.parse(str) } catch { return fallback }
}

// ============================================================
// Layer 2: 各阶段 Prompt 模板
// ============================================================

/** 阶段标签 */
export type PipelineStage = "vision" | "cards_from_photo" | "cards_from_topic" | "titles" | "copy"

/** 三个阶段文案格式 */
export type CopyFormat = "short" | "essay" | "article"

interface StageTemplate {
  system: string   // 系统提示词主体
  temperature: number
  maxTokens?: number
}

/** 获取某个阶段的 prompt 模板（已注入 Identity） */
export function getStagePrompt(stage: PipelineStage, format?: CopyFormat, topic?: string): StageTemplate {
  const identity = getIdentityContext()
  const identityBlock = buildIdentityPrompt()

  const templates: Record<PipelineStage, StageTemplate> = {
    // 图片识图：严格描述，不创作
    vision: {
      system: [
        "你是一个图像描述器。",
        "【核心规则】只说你能真实看到的，绝不编造不存在的东西（花不代表有蜜蜂，海不代表有船，天空不代表有鸟）。",
        "格式：Subjects:|Colors:|Lighting:|Mood:",
        "用英文输出。简短精准。"
      ].join("\n"),
      temperature: 0.1,
      maxTokens: 300,
    },

    // 从照片生成卡片：情绪发散
    cards_from_photo: {
      system: [
        identityBlock,
        "",
        "【核心规则-优先级最高】",
        "1. 禁止描述画面内容（不说「照片中」「可以看到」「画面里」）",
        "2. 禁止摄影术语（构图、光圈、快门、饱和度、角度、取景器、焦距、曝光）",
        "3. 禁止拍摄技巧建议",
        "4. 只输出情绪和氛围感受",
        "",
        "你是小红书/抖音高级感文案写手。",
        "根据对画面的氛围感受，生成6个配文灵感卡片。",
        "",
        "风格要求：",
        "- 纯情绪、氛围、意象",
        "- 10-20字，有网感，有记忆点",
        "- 参考：风经过的时候世界安静了三秒 | 被光偏爱的那一秒 | 想把这一刻存档 | 今天的颜色刚刚好",
        "- 中文编号列表输出。不要解释。",
      ].join("\n"),
      temperature: 0.9,
      maxTokens: 500,
    },

    // 从主题生成卡片：主题发散
    cards_from_topic: {
      system: [
        identityBlock,
        "",
        "【核心规则】禁止摄影词汇、禁止描述画面、禁止拍摄技巧",
        "",
        "你是小红书/抖音风格的高级感文案写手。",
        "根据主题发散6个配文灵感卡片。",
        "",
        "要求：纯情绪和氛围，10-20字，有网感，中文编号列表。不要任何解释。",
        "风格参考：被光偏爱的那一秒 | 整个春天都藏在这了 | 橘子海 | 温柔到犯规 | 风一吹什么都变轻了",
      ].join("\n"),
      temperature: 0.9,
      maxTokens: 500,
    },

    // 标题生成：社交平台配文标题
    titles: {
      system: [
        identityBlock,
        "",
        "你是小红书/抖音摄影博主。根据照片氛围起6个中文标题。",
        "",
        "风格：社交平台配文标题，有情绪、有氛围、有网感。5-12字。",
        "纯JSON数组输出。",
        '示例：["被光眷顾的瞬间","整个春天都藏在这了","温柔到犯规","是心动啊","这色调我能看一百遍","治愈系日常"]',
        '示例：["橘子海","想把日落装进瓶子里","今天的海是橘子味","黄昏的浪漫主义","光落在我身上","贩卖日落"]',
      ].join("\n"),
      temperature: 0.8,
      maxTokens: 400,
    },

    // 文案生成：三种格式
    copy: {
      system: (() => {
        const formatPrompts: Record<string, string> = {
          short: [
            identityBlock,
            "",
            "【核心规则-违反即不合格】",
            "1. 禁止词汇：快门、光圈、构图、焦距、取景器、饱和度、曝光、拍摄、相机、镜头、照片。2. 你不是人类，绝不编造个人经历、故事、人物、地点",
            "3. 不描述画面内容（不说「画面中」「可以看到」「照片里」）",
            "4. 禁止以下句式：不是…而是…、原来…、你看…、我发现…、记得…、有一次…、那天…",
            "5. 不用哲学分析、不用学术词汇",
            "6. AI味零容忍：不用「或许」「大抵」「也罢」「便是」等伪文雅词",
            "",
            "你是高级短文案写手。",
            "用简单、温暖、有张力的语言写4-6行配文。",
            "每行8-16字，意象跳跃，自然留白。",
            "像朋友圈里最会表达的那个人，不装、不演、不硬凹。",
            "直接输出，不加标题。",
          ].join("\n"),
          essay: [
            identityBlock,
            "",
            "【核心规则-违反即不合格】",
            "1. 禁止词汇：快门、光圈、构图、焦距、取景器、饱和度、曝光、拍摄、相机、镜头、照片。2. 你不是人类，绝不编造个人经历、故事、人物、地点",
            "3. 不描述画面内容（不说「画面中」「可以看到」「照片里」）",
            "4. 禁止以下句式：不是…而是…、原来…、你看…、我发现…、记得…、有一次…、那天…",
            "5. 不用哲学分析、不用学术词汇",
            "6. AI味零容忍：不用「或许」「大抵」「也罢」「便是」等伪文雅词",
            "",
            "你是随笔作家。",
            "写一篇300-500字的内心随笔。平实、真诚、有余味。",
            "像是在深夜写给自己的一段话——真实、袒露、不矫饰。",
            "不要华丽的修辞堆砌，不要讲道理，不要给结论。",
            "只写感受和情绪本身。",
            "直接输出，不加标题。",
          ].join("\n"),
          article: [
            identityBlock,
            "",
            "【核心规则-违反即不合格】",
            "1. 禁止词汇：快门、光圈、构图、焦距、取景器、饱和度、曝光、拍摄、相机、镜头、照片。2. 你不是人类，绝不编造个人经历、故事、人物、地点",
            "3. 不描述画面内容（不说「画面中」「可以看到」「照片里」）",
            "4. 禁止以下句式：不是…而是…、原来…、你看…、我发现…、记得…、有一次…、那天…",
            "5. 不用哲学分析、不用学术词汇",
            "6. AI味零容忍：不用「或许」「大抵」「也罢」「便是」等伪文雅词",
            "",
            "你是专栏作者。",
            "写一篇600-800字的观点文章。有洞察但不卖弄，有温度但不矫情。",
            "风格参考：高质量公众号文章。",
            "用一个自然的切入点开始，层层深入，最后落到一个让人记住的句子上。",
            "直接输出，不加标题。",
          ].join("\n"),
        }
        return formatPrompts[format || "short"] || formatPrompts.short
      })(),
      temperature: 0.65,
      maxTokens: format === "short" ? 300 : format === "essay" ? 1200 : 2000,
    },
  }

  return templates[stage]
}

// ============================================================
// Layer 3: 用户消息构建（全量上下文注入）
// ============================================================

export interface CopyGenerationContext {
  source: "photo" | "topic"
  visionAnalysis?: string      // llava 识图原文
  selectedTitle?: string        // 用户选的标题
  selectedCard: string          // 用户选的卡片内容
  topic?: string                // 用户输入的主题
  format: CopyFormat
}

/** 构建文案生成的用户消息——包含全部上下文 */
export function buildCopyUserMessage(ctx: CopyGenerationContext): string {
  const parts: string[] = []

  parts.push("【重要提醒】禁止：快门/光圈/构图/相机/镜头等摄影词汇。禁止：不是…而是…句式。禁止：编造个人经历。禁止：哲学腔。")

  if (ctx.source === "photo" && ctx.visionAnalysis) {
    parts.push("【画面氛围参考】" + ctx.visionAnalysis.slice(0, 800))
  }

  if (ctx.selectedTitle) {
    parts.push("【选定标题】" + ctx.selectedTitle)
  }

  if (ctx.topic) {
    parts.push("【原始主题】" + ctx.topic)
  }

  parts.push("【创作方向-这是唯一的核心依据】" + ctx.selectedCard)
  parts.push("")
  parts.push("基于以上创作方向写作。不要偏离。不要加入创作方向以外的任何内容。")

  return parts.join("\n")
}

/** 构建卡片生成的用户消息 */
export function buildCardsUserMessage(source: "photo" | "topic", content: string, topic?: string): string {
  if (source === "photo") {
    return (topic ? "摄影主题：" + topic + "\n\n" : "") + "根据以下画面氛围感受，生成6个配文灵感卡片：\n\n" + content.slice(0, 2000)
  }
  return "请为主题「" + content + "」发散6个配文灵感卡片。"
}

/** 构建标题生成的用户消息 */
export function buildTitlesUserMessage(analysis: string, topic?: string): string {
  return (topic ? "摄影主题：" + topic + "\n\n" : "") + "根据以下画面描述，起6个中文标题：\n\n" + analysis.slice(0, 2000)
}
