import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { CanvasView } from "../components/canvas/CanvasView"
import { DraftPanel } from "../components/canvas/DraftPanel"
import { NotificationBell } from "../components/NotificationBell"
import { FocusTimer } from "../components/FocusTimer"
import { SidebarPanel } from "../components/canvas/SidebarPanel"
import { ArrowLeft, Home, FileText, PanelRightClose, PanelRightOpen, PenLine, Sparkles, PanelLeftOpen, PanelLeftClose } from "lucide-react"
import type { Node, Edge } from "@xyflow/react"
import { api } from "../hooks/api"

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (id === "new") {
    return <NewWorkspaceForm onCreated={(newId) => navigate(`/workspace/${newId}`)} />
  }

  return <WorkspaceCanvas workspaceId={id!} />
}

function NewWorkspaceForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [focus, setFocus] = useState<"title" | "desc" | null>(null)

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return
    setSubmitting(true)
    try {
      const data = await api.createWorkspace({ title, description })
      onCreated(data.id)
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-cream/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/3 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 dot-pattern opacity-20 pointer-events-none" />

      <div className="relative max-w-[520px] w-full">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-10 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 返回首页
        </Link>

        <div className="mb-10">
          <div className="w-12 h-12 rounded-2xl bg-cream flex items-center justify-center mb-5">
            <PenLine size={20} className="text-ink" />
          </div>
          <h1 className="font-serif text-[36px] md:text-[42px] font-semibold text-ink tracking-tight mb-3">新建创作空间</h1>
          <p className="text-sm text-ink-muted leading-relaxed">一个 Workspace 对应一个主题。在里面创建 Canvas 画布、生成作品。</p>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-[11px] font-medium text-ink-muted tracking-wide uppercase mb-3">主题名称</label>
            <div className={`rounded-2xl border transition-all duration-300 ${focus === "title" ? "border-ink/20 shadow-sm ring-4 ring-ink/5" : "border-cream-light"}`}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => setFocus("title")}
                onBlur={() => setFocus(null)}
                placeholder="例如：AI 时代摄影是否还有意义"
                className="w-full px-5 py-4 bg-cream rounded-2xl text-ink placeholder:text-ink-muted/40 text-sm focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink-muted tracking-wide uppercase mb-3">描述（可选）</label>
            <div className={`rounded-2xl border transition-all duration-300 ${focus === "desc" ? "border-ink/20 shadow-sm ring-4 ring-ink/5" : "border-cream-light"}`}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => setFocus("desc")}
                onBlur={() => setFocus(null)}
                placeholder="简单描述你想探索的方向..."
                className="w-full px-5 py-4 bg-cream rounded-2xl text-ink placeholder:text-ink-muted/40 text-sm focus:outline-none min-h-[80px] resize-y"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary bg-ink text-white rounded-full px-8 py-4 text-sm font-medium hover:opacity-90 disabled:opacity-40 inline-flex items-center justify-center gap-2 group mt-2"
          >
            {submitting ? (
              <span className="flex items-center gap-2">创建中...</span>
            ) : (
              <>
                <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                创建并进入 Canvas
                <ArrowLeft size={14} className="rotate-180 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function WorkspaceCanvas({ workspaceId }: { workspaceId: string }) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [wsTitle, setWsTitle] = useState("")
  const [error, setError] = useState("")
  const [showDrafts, setShowDrafts] = useState(false)
  const [activeDraftId, setActiveDraftId] = useState("")
  const [showSidebar, setShowSidebar] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")

    Promise.all([
      api.getWorkspace(workspaceId).catch(() => null),
      api.getCanvas(workspaceId).catch(() => null),
    ]).then(([ws, canvas]) => {
      if (cancelled) return
      if (ws) setWsTitle((ws as Record<string, unknown>).title as string || "")
      else setError("工作空间加载失败")

      if (canvas) {
        const raw = canvas as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }
        const canvasNodes = raw.nodes.map((n: Record<string, unknown>) => ({
          id: n.id as string,
          type: (n.type as string) || "idea",
          position: { x: (n.positionX as number) || 0, y: (n.positionY as number) || 0 },
          data: { content: n.content as string },
        }))
        const canvasEdges = raw.edges.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          source: e.fromNodeId as string,
          target: e.toNodeId as string,
          type: "smoothstep",
          animated: Boolean(e.aiRecommended),
          style: {
            stroke: e.aiRecommended ? "#f39c12" : "#6c5ce7",
            strokeWidth: 2,
            strokeDasharray: e.aiRecommended ? "5,5" : "none",
          },
          data: { relationType: e.relationType },
        }))
        setNodes(canvasNodes)
        setEdges(canvasEdges)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [workspaceId])

  const handleDraftCreated = (draftId: string) => {
    setActiveDraftId(draftId)
    setShowDrafts(true)
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white gap-3">
        <div className="relative">
          <div className="w-8 h-8 rounded-full border-2 border-cream-light border-t-ink animate-spin" />
        </div>
        <p className="text-sm text-ink-muted">加载中...</p>
      </div>
    )
  }

  if (error && nodes.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-16 h-16 rounded-3xl bg-cream flex items-center justify-center mb-2">
          <PenLine size={24} className="text-ink-muted/40" />
        </div>
        <p className="text-sm text-ink-muted">{error}</p>
        <Link to="/" className="text-xs text-ink-muted hover:text-ink transition-colors flex items-center gap-1 mt-2 px-4 py-2 rounded-full border border-cream-light hover:border-ink/20">
          <ArrowLeft size={14} /> 返回首页
        </Link>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-cream-light flex-shrink-0 glass-card">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSidebar(!showSidebar)} className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center text-ink-muted hover:text-ink hover:bg-cream-light transition-all" title="工作台侧边栏">{showSidebar ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}</button>
          <Link to="/" className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center text-ink-muted hover:text-ink hover:bg-cream-light transition-all" title="首页">
            <Home size={15} />
          </Link>
          <div className="h-5 w-px bg-cream-light" />
          <span className="text-sm font-medium text-ink truncate max-w-[300px]">{wsTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <FocusTimer />
          <NotificationBell />
          <div className="h-5 w-px bg-cream-light mx-1" />
          <button
            onClick={() => setShowDrafts(!showDrafts)}
            className={`text-xs flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all duration-300
              ${showDrafts
                ? "bg-ink text-white shadow-sm"
                : "text-ink-muted hover:text-ink bg-cream border border-cream-light hover:border-ink/15"}`}
          >
            <FileText size={13} />
            作品
            {showDrafts ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">{showSidebar && <SidebarPanel workspaceId={workspaceId} onClose={() => setShowSidebar(false)} />}
        <div className="flex-1">
          <CanvasView workspaceId={workspaceId} initialNodes={nodes} initialEdges={edges} onDraftCreated={handleDraftCreated} />
        </div>
        {showDrafts && (
          <div className="w-[340px] flex-shrink-0 h-full animate-scale-in">
            <DraftPanel workspaceId={workspaceId} activeDraftId={activeDraftId} onClose={() => setShowDrafts(false)} />
          </div>
        )}
      </div>
    </div>
  )
}