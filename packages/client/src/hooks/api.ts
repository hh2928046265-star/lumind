const BASE_URL = "/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || "API Error")
  return data.data as T
}

export const api = {
  getWorkspaces: () => request<Array<Record<string, unknown>>>("/workspaces"),
  createWorkspace: (body: { title: string; description?: string }) =>
    request<{ id: string }>("/workspaces", { method: "POST", body: JSON.stringify(body) }),
  getWorkspace: (id: string) => request<Record<string, unknown>>(`/workspaces/${id}`),

  uploadImage: async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/uploads", { method: "POST", body: formData })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || "Upload failed")
    return data.data as { filename: string; url: string; size: number; mimeType: string }
  },

  // ===== Pipeline API (new unified pipeline) =====
  uploadAndAnalyze: async (files: File[], topic?: string, description?: string) => {
    const formData = new FormData()
    files.forEach((f, i) => formData.append("file" + i, f))
    if (topic) formData.append("topic", topic)
    if (description) formData.append("description", description)
    const res = await fetch("/api/pipeline/photo/upload-and-analyze", { method: "POST", body: formData })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || "分析失败")
    return data.data as PipelinePhotoResult
  },

  generateCardsFromTopic: (topic: string) =>
    request<PipelineTopicResult>("/pipeline/topic/generate-cards", { method: "POST", body: JSON.stringify({ topic }) }),

  selectCard: (pipelineId: string, cardContent: string) =>
    request<{ pipelineId: string; selectedCard: string }>(`/pipeline/${pipelineId}/select-card`, { method: "POST", body: JSON.stringify({ cardContent }) }),

  selectTitle: (pipelineId: string, title: string) =>
    request<{ pipelineId: string; selectedTitle: string }>(`/pipeline/${pipelineId}/select-title`, { method: "POST", body: JSON.stringify({ title }) }),

  generateFromPipeline: (pipelineId: string, format: string, workspaceId: string) =>
    request<{ draftId: string; title: string; content: string; format: string; model: string }>(
      `/pipeline/${pipelineId}/generate`, { method: "POST", body: JSON.stringify({ format, workspaceId }) }
    ),

  getPipelineState: (pipelineId: string) =>
    request<PipelineState>(`/pipeline/${pipelineId}`),

  // ===== Legacy compat =====
  batchAnalyzeImages: async (files: File[], topic?: string, description?: string) => {
    const formData = new FormData()
    files.forEach((f, i) => formData.append("file" + i, f))
    if (topic) formData.append("topic", topic)
    if (description) formData.append("description", description)
    const res = await fetch("/api/uploads/batch-analyze", { method: "POST", body: formData })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || "分析失败")
    return data.data as { images: Array<{ url: string; filename: string }>; analysis: string; cards: Array<{ type: string; content: string }>; titles: string[] }
  },

  analyzeImage: (imagePath: string) =>
    request<{ analysis: string; cards: Array<{ type: string; content: string }> }>("/uploads/analyze", { method: "POST", body: JSON.stringify({ imagePath }) }),

  getCanvas: (workspaceId: string) =>
    request<{ nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }>(`/canvas/${workspaceId}`),
  createNode: (workspaceId: string, body: Record<string, unknown>) =>
    request<{ id: string }>(`/canvas/${workspaceId}/nodes`, { method: "POST", body: JSON.stringify(body) }),
  createEdge: (workspaceId: string, body: Record<string, unknown>) =>
    request<{ id: string }>(`/canvas/${workspaceId}/edges`, { method: "POST", body: JSON.stringify(body) }),
  generateCards: (workspaceId: string, topic: string) =>
    request<{ cardsCreated: number; cards: Array<{ id: string; type: string; content: string }>; modelsUsed: string[] }>(
      `/canvas/${workspaceId}/generate-cards`, { method: "POST", body: JSON.stringify({ topic }) }
    ),

  getDailyBrief: () => request<Record<string, unknown>>("/home/daily-brief"),

  generate: (body: { workspaceId: string; format: string; title?: string; cardContent: string; visionRaw?: string; topic?: string; source?: string }) =>
    request<{ draftId: string; title: string; content: string; format: string; model: string }>("/agents/generate", { method: "POST", body: JSON.stringify(body) }),

  generateFromCanvas: (body: { workspaceId: string; format: string; cardContent: string }) =>
    request<{ draftId: string; title: string; content: string; format: string; model: string }>("/agents/generate-from-canvas", { method: "POST", body: JSON.stringify(body) }),

  configureLLM: (body: { provider: string; apiKey: string; model?: string; baseUrl?: string }) =>
    request<Record<string, unknown>>("/agents/config", { method: "POST", body: JSON.stringify(body) }),

  getIdentity: () => request<Record<string, unknown>>("/identity"),
  createIdentity: (body: Record<string, unknown>) => request<Record<string, unknown>>("/identity/onboarding", { method: "POST", body: JSON.stringify(body) }),
  updateIdentity: (body: Record<string, unknown>) => request<Record<string, unknown>>("/identity", { method: "PATCH", body: JSON.stringify(body) }),

  getGlobalDrafts: (params?: { q?: string; format?: string; page?: number; pageSize?: number }) => {
    const sp = new URLSearchParams()
    if (params?.q) sp.set("q", params.q)
    if (params?.format) sp.set("format", params.format)
    if (params?.page) sp.set("page", String(params.page))
    if (params?.pageSize) sp.set("pageSize", String(params.pageSize))
    const qs = sp.toString()
    return request<{ items: Array<Record<string, unknown>>; total: number; page: number; pageSize: number }>(`/drafts${qs ? "?" + qs : ""}`)
  },
  getDrafts: (workspaceId: string) => request<Array<Record<string, unknown>>>(`/drafts/workspace/${workspaceId}`),
  getDraft: (draftId: string) => request<Record<string, unknown>>(`/drafts/${draftId}`),
  updateDraft: (draftId: string, body: Record<string, unknown>) => request<Record<string, unknown>>(`/drafts/${draftId}`, { method: "PATCH", body: JSON.stringify(body) }),
  createDraft: (body: { workspaceId: string; title?: string; format?: string; content?: string }) =>
    request<{ id: string }>("/drafts", { method: "POST", body: JSON.stringify(body) }),
  deleteDraft: (draftId: string) => request<Record<string, unknown>>(`/drafts/${draftId}`, { method: "DELETE" }),

  submitReview: (draftId: string, body: Record<string, unknown>) =>
    request<{ reviewId: string }>(`/drafts//review`, { method: "POST", body: JSON.stringify(body) }),

  getNotifications: () => request<{ items: Array<Record<string, unknown>>; unreadCount: number }>("/notifications"),
  markNotificationRead: (id: string) => request<Record<string, unknown>>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => request<Record<string, unknown>>("/notifications/read-all", { method: "PATCH" }),

  getMemoryGraph: () => request<{ nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>>; stats: Record<string, unknown> }>("/memory"),
  searchMemory: (q: string) => request<Array<Record<string, unknown>>>(`/memory/search?q=${encodeURIComponent(q)}`),
  promoteMemory: (body: { nodeId?: string; isCore?: boolean; coreScore?: number }) =>
    request<Record<string, unknown>>("/memory/promote", { method: "POST", body: JSON.stringify(body) }),
}

// ===== Pipeline types =====
export interface PipelinePhotoResult {
  pipelineId: string
  images: Array<{ url: string; filename: string }>
  cards: Array<{ type: string; content: string }>
  titles: string[]
  modelTrace: string[]
}

export interface PipelineTopicResult {
  pipelineId: string
  topic: string
  cards: Array<{ type: string; content: string }>
  modelTrace: string[]
}

export interface PipelineState {
  id: string
  source: "photo" | "topic"
  cards: Array<{ type: string; content: string }>
  titleOptions?: string[]
  selectedTitle?: string
  selectedCard?: string
  targetFormat?: string
  images?: Array<{ url: string; filename: string }>
  topic?: string
  modelTrace: string[]
  steps: Array<{ stage: string; status: string; error?: string }>
  finished: boolean
}

