import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Brain, Search, Star, Network, Loader2, Camera, History } from "lucide-react"
import { api } from "../hooks/api"

interface MemoryNode {
  id: string
  title: string
  content: string
  isCore: boolean
  coreScore: number
  sourceType: string
  createdAt: string
}

interface MemoryEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  relationType: string
  weight: number
  aiGenerated: boolean
}

interface Snapshot {
  id: string
  capturedAt: string
  nodeCount: number
  edgeCount: number
  coreShifts: string[]
}

export function MemoryPage() {
  const [nodes, setNodes] = useState<MemoryNode[]>([])
  const [edges, setEdges] = useState<MemoryEdge[]>([])
  const [stats, setStats] = useState({ totalNodes: 0, totalEdges: 0, coreNodes: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState("")
  const [searchResults, setSearchResults] = useState<MemoryNode[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [showSnapshots, setShowSnapshots] = useState(false)

  const loadGraph = () => {
    setLoading(true)
    api.getMemoryGraph()
      .then((data) => {
        const d = data as any as { nodes: MemoryNode[]; edges: MemoryEdge[]; stats: { totalNodes: number; totalEdges: number; coreNodes: number } }
        setNodes(d.nodes || [])
        setEdges(d.edges || [])
        setStats(d.stats || { totalNodes: 0, totalEdges: 0, coreNodes: 0 })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadGraph() }, [])

  const handleSearch = () => {
    if (!searchQ.trim()) {
      setSearchResults([])
      return
    }
    api.searchMemory(searchQ).then((data) => {
      setSearchResults(data as any as MemoryNode[])
    })
  }

  const toggleCore = async (nodeId: string, currentIsCore: boolean) => {
    try {
      await api.promoteMemory({ nodeId, isCore: !currentIsCore })
      loadGraph()
    } catch {
      // ignore
    }
  }

  const createSnapshot = async () => {
    try {
      await (api as any).createMemorySnapshot()
      loadGraph()
    } catch {
      // ignore
    }
  }

  const loadSnapshots = async () => {
    setShowSnapshots(!showSnapshots)
    if (!showSnapshots) {
      const data = await (api as any).getMemorySnapshots()
      setSnapshots(data as Snapshot[])
    }
  }

  const relationLabels: Record<string, string> = {
    similar: "相似", contrast: "对立", causal: "因果",
    contains: "包含", prerequisite: "前提", evolves_to: "演化",
  }

  const coreNodes = nodes.filter((n) => n.isCore)
  const normalNodes = nodes.filter((n) => !n.isCore)

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[900px] mx-auto px-6 pt-12 pb-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-8 transition-colors">
          <ArrowLeft size={16} /> 返回首页
        </Link>

        <div className="flex items-center justify-between mb-2">
          <h1 className="font-serif text-[32px] font-semibold text-ink tracking-tight">知识图谱</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSnapshots}
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors px-3 py-1.5 rounded-full border border-cream-light"
            >
              <History size={13} />
              快照历史
            </button>
            <button
              onClick={createSnapshot}
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors px-3 py-1.5 rounded-full border border-cream-light"
            >
              <Camera size={13} />
              创建快照
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-8">
          <div className="bg-cream rounded-2xl px-5 py-3 border border-cream-light">
            <p className="text-[28px] font-semibold text-ink">{stats.totalNodes}</p>
            <p className="text-[11px] text-ink-muted">总概念</p>
          </div>
          <div className="bg-cream rounded-2xl px-5 py-3 border border-cream-light">
            <p className="text-[28px] font-semibold text-ink">{stats.coreNodes}</p>
            <p className="text-[11px] text-ink-muted">核心概念</p>
          </div>
          <div className="bg-cream rounded-2xl px-5 py-3 border border-cream-light">
            <p className="text-[28px] font-semibold text-ink">{stats.totalEdges}</p>
            <p className="text-[11px] text-ink-muted">关系连接</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-8">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted/40" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索概念..."
              className="w-full pl-9 pr-4 py-2.5 bg-cream border border-cream-light rounded-full text-sm text-ink focus:outline-none focus:border-ink/20 transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-ink text-white rounded-full text-sm hover:opacity-90 transition-opacity"
          >
            搜索
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <p className="text-xs text-ink-muted mb-3">搜索结果 ({searchResults.length})</p>
            <div className="flex flex-col gap-2">
              {searchResults.map((n) => (
                <div key={n.id} className="bg-cream rounded-xl p-4 border border-cream-light">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{n.title}</span>
                    {n.isCore && <Star size={12} className="text-amber-500" />}
                    <span className="text-[10px] text-ink-muted">{(n.coreScore * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Snapshots */}
        {showSnapshots && (
          <div className="mb-8">
            <p className="text-xs text-ink-muted mb-3">快照历史</p>
            <div className="flex flex-col gap-2">
              {snapshots.map((s) => (
                <div key={s.id} className="bg-cream rounded-xl p-4 border border-cream-light">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-muted">
                      {new Date(s.capturedAt).toLocaleDateString("zh-CN")} — {s.nodeCount} 节点, {s.edgeCount} 边
                    </span>
                  </div>
                  {s.coreShifts.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {s.coreShifts.map((shift, i) => (
                        <span key={i} className="text-[10px] text-ink-muted">{shift}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {snapshots.length === 0 && (
                <p className="text-xs text-ink-muted">暂无快照</p>
              )}
            </div>
          </div>
        )}

        {/* Core Nodes */}
        {coreNodes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star size={16} className="text-amber-500" />
              <h3 className="text-sm font-medium text-ink">核心概念</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {coreNodes.map((node) => (
                <div key={node.id} className="bg-cream rounded-xl p-4 border border-cream-light hover:border-ink/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{node.title}</span>
                    <button
                      onClick={() => toggleCore(node.id, true)}
                      className="text-[10px] text-ink-muted hover:text-ink"
                      title="取消核心标记"
                    >
                      取消核心
                    </button>
                  </div>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">{node.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-ink-muted/60">
                      {node.sourceType === "canvas" ? "来自 Canvas" : "来自作品"}
                    </span>
                    <span className="text-[10px] text-ink-muted/60">
                      相关性: {(node.coreScore * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-ink-muted/60">
                      {new Date(node.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Normal Nodes */}
        {normalNodes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Network size={16} className="text-ink-muted" />
              <h3 className="text-sm font-medium text-ink">所有概念</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {normalNodes.map((node) => (
                <div key={node.id} className="bg-cream/50 rounded-xl p-4 border border-cream-light/50 hover:border-ink/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink">{node.title}</span>
                    <button
                      onClick={() => toggleCore(node.id, false)}
                      className="text-[10px] text-ink-muted hover:text-ink"
                      title="标记为核心"
                    >
                      标为核心
                    </button>
                  </div>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">{node.content.slice(0, 100)}</p>
                  <span className="text-[10px] text-ink-muted/60 mt-1 block">
                    相关性: {(node.coreScore * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edges */}
        {edges.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Network size={16} className="text-ink-muted" />
              <h3 className="text-sm font-medium text-ink">概念关系</h3>
            </div>
            <div className="flex flex-col gap-2">
              {edges.map((edge) => {
                const from = nodes.find((n) => n.id === edge.fromNodeId)
                const to = nodes.find((n) => n.id === edge.toNodeId)
                return (
                  <div key={edge.id} className="flex items-center gap-2 text-xs text-ink-muted bg-cream/50 rounded-lg px-3 py-2">
                    <span className="font-medium text-ink">{from?.title || edge.fromNodeId}</span>
                    <span className="text-[10px] bg-ink/5 rounded px-1.5 py-0.5">
                      {relationLabels[edge.relationType] || edge.relationType}
                    </span>
                    <span className="font-medium text-ink">{to?.title || edge.toNodeId}</span>
                    {edge.aiGenerated && (
                      <span className="text-[9px] text-purple-500 ml-auto">AI</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {nodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Brain size={40} className="text-ink-muted/20 mb-4" />
            <p className="text-sm text-ink-muted">知识图谱还是空的</p>
            <p className="text-xs text-ink-muted/60 mt-1">每次 AI 创作后会自动提取概念</p>
          </div>
        )}
      </div>
    </div>
  )
}
