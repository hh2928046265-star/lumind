import { useState, useRef } from "react"
import { FileText, Loader2, Sparkles, X, Upload, Wand2 } from "lucide-react"
import { api } from "../../hooks/api"

interface CanvasToolbarProps {
  workspaceId: string
  onDraftCreated?: (draftId: string, title: string) => void
  onCardsCreated?: (cards: Array<{ id: string; type: string; content: string }>) => void
  onImageUploaded?: (node: any) => void
}

type UIStage = "idle" | "uploading" | "analyzing" | "titles" | "cards_ready" | "generating" | "error"

export function CanvasToolbar({ workspaceId, onDraftCreated, onCardsCreated, onImageUploaded }: CanvasToolbarProps) {
  const [stage, setStage] = useState<UIStage>("idle")
  const [error, setError] = useState("")
  const [pipelineId, setPipelineId] = useState("")
  const [pipelineSource, setPipelineSource] = useState<"photo" | "topic">("topic")
  const [cards, setCards] = useState<Array<{ type: string; content: string }>>([])
  const [titleOptions, setTitleOptions] = useState<string[]>([])
  const [images, setImages] = useState<Array<{ url: string; filename: string }>>([])
  const [selectedTitle, setSelectedTitle] = useState("")
  const [selectedCard, setSelectedCard] = useState("")
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1)
  const [cardTopic, setCardTopic] = useState("")
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [photoTopic, setPhotoTopic] = useState("")
  const [photoDesc, setPhotoDesc] = useState("")
  const [showCardInput, setShowCardInput] = useState(false)
  const [showPhotoForm, setShowPhotoForm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ===== PATH A: Photo =====
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (e.target) e.target.value = ""
    setPendingFiles(files); setPhotoDesc(""); setPhotoTopic(""); setShowPhotoForm(true); setError("")
  }

  const handlePhotoAnalyze = async () => {
    if (pendingFiles.length === 0) return
    setShowPhotoForm(false); setStage("uploading"); setError("")
    try {
      const result = await api.uploadAndAnalyze(pendingFiles, photoTopic || undefined, photoDesc || undefined)
      setPipelineId(result.pipelineId); setPipelineSource("photo")
      setCards(result.cards); setTitleOptions(result.titles); setImages(result.images)
      setSelectedTitle(""); setSelectedCard(""); setSelectedCardIndex(-1)
      setStage("titles")
    } catch (err) { setStage("error"); setError((err as Error).message || "分析失败") }
  }

  const handleTitleSelect = (title: string) => {
    setSelectedTitle(title); setStage("cards_ready")
  }

  // ===== PATH B: Topic =====
  const handleGenerateCards = async () => {
    if (!cardTopic.trim()) return
    setShowCardInput(false); setStage("analyzing"); setError("")
    try {
      const result = await api.generateCardsFromTopic(cardTopic.trim())
      setPipelineId(result.pipelineId); setPipelineSource("topic")
      setCards(result.cards); setTitleOptions([]); setImages([])
      setSelectedTitle(""); setSelectedCard(""); setSelectedCardIndex(-1)
      setStage("cards_ready"); setCardTopic("")
    } catch (err) { setStage("error"); setError((err as Error).message || "卡片生成失败") }
  }

  // ===== Generate copy → opens right panel =====
  const handleGenerate = async (format: string) => {
    if (!selectedCard) { setError("请先选择卡片"); return }
    setStage("generating"); setError("")
    try {
      let result: { draftId: string; title: string; content: string; format: string; model: string }
      if (pipelineId) {
        await api.selectCard(pipelineId, selectedCard)
        if (selectedTitle && pipelineSource === "photo") await api.selectTitle(pipelineId, selectedTitle)
        result = await api.generateFromPipeline(pipelineId, format, workspaceId)
      } else {
        result = await api.generate({ workspaceId, format, cardContent: selectedCard, source: pipelineSource })
      }
      // Route to right DraftPanel
      onDraftCreated?.(result.draftId, result.title)
      setStage("idle")
    } catch (err) { setStage("error"); setError((err as Error).message || "生成失败") }
  }

  const isLoading = stage === "uploading" || stage === "analyzing" || (stage as string) === "generating"
  const loadingText = stage === "uploading" ? "上传分析中..." : stage === "analyzing" ? "AI 发散卡片中..." : (stage as string) === "generating" ? "正在生成文案..." : ""

  return (
    <div className="relative flex items-center gap-2 flex-wrap z-50">
      {/* Upload photo */}
      <button onClick={() => fileInputRef.current?.click()} disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream hover:bg-blue-50 border border-cream-light hover:border-blue-200 transition-all text-sm text-ink disabled:opacity-40">
        <Upload size={15} /><span className="hidden sm:inline">上传照片</span>
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />

      {/* Topic card */}
      <button onClick={() => { setShowCardInput(!showCardInput); setShowPhotoForm(false) }} disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream hover:bg-purple-50 border border-cream-light hover:border-purple-200 transition-all text-sm text-ink disabled:opacity-40">
        <Sparkles size={15} /><span className="hidden sm:inline">主题发散</span>
      </button>

      {isLoading && (
        <span className="flex items-center gap-1.5 text-sm text-ink-muted animate-pulse">
          <Loader2 size={14} className="animate-spin text-purple-500" />{loadingText}
        </span>
      )}
      {error && <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-lg">{error}</span>}

      {/* Photo description form */}
      {showPhotoForm && pendingFiles.length > 0 && (
        <div className="absolute top-full mt-3 left-0 bg-white border border-cream-light rounded-2xl shadow-xl p-5 w-[420px] animate-scale-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-ink">描述你的照片</span>
            <button onClick={() => { setShowPhotoForm(false); setPendingFiles([]) }} className="text-ink-muted hover:text-ink"><X size={16} /></button>
          </div>
          <p className="text-[11px] text-ink-muted mb-3">已选择 {pendingFiles.length} 张照片</p>
          <textarea value={photoDesc} onChange={(e) => setPhotoDesc(e.target.value)}
            placeholder="例如：夕阳下的城市天际线，橙红色的晚霞映在玻璃幕墙上" autoFocus
            className="w-full px-4 py-3 bg-cream rounded-xl text-sm text-ink placeholder:text-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-blue-200 mb-3 min-h-[80px] resize-y" />
          <input value={photoTopic} onChange={(e) => setPhotoTopic(e.target.value)}
            placeholder="主题标签（可选）：晚霞"
            className="w-full px-4 py-2.5 bg-cream rounded-xl text-xs text-ink placeholder:text-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-blue-200 mb-3" />
          <div className="flex gap-2">
            <button onClick={handlePhotoAnalyze} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium">开始分析</button>
            <button onClick={() => { setShowPhotoForm(false); handlePhotoAnalyze() }} className="px-4 py-2.5 rounded-xl border border-cream-light text-ink-muted text-sm">跳过描述</button>
          </div>
        </div>
      )}

      {/* Card input form */}
      {showCardInput && (
        <div className="absolute top-full mt-2 left-0 bg-white border border-cream-light rounded-2xl shadow-lg p-4 w-[340px] animate-scale-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-ink">AI 发散卡片</span>
            <button onClick={() => { setShowCardInput(false); setCardTopic("") }} className="text-ink-muted hover:text-ink"><X size={14} /></button>
          </div>
          <input value={cardTopic} onChange={(e) => setCardTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerateCards()}
            placeholder="输入主题，如：晚霞、孤独、夏天" autoFocus
            className="w-full px-4 py-3 bg-cream rounded-xl text-sm text-ink placeholder:text-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-purple-200 mb-3" />
          <button onClick={handleGenerateCards} disabled={!cardTopic.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
            <Sparkles size={14} /> 开始发散
          </button>
        </div>
      )}

      {/* Title selection (path A) */}
      {stage === "titles" && titleOptions.length > 0 && (
        <div className="absolute top-full mt-3 left-0 bg-white border border-cream-light rounded-2xl shadow-xl p-5 w-[400px] animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div><span className="text-sm font-semibold text-ink">选择标题</span>
              {images.length > 0 && <span className="text-[10px] text-ink-muted ml-2">{images.length} 张</span>}</div>
            <button onClick={() => setStage("idle")} className="text-ink-muted hover:text-ink"><X size={16} /></button>
          </div>
          <div className="flex flex-col gap-2 mb-4 max-h-[300px] overflow-y-auto">
            {titleOptions.map((title, i) => (
              <button key={i} onClick={() => handleTitleSelect(title)}
                className="text-left px-4 py-3 bg-cream hover:bg-purple-50 rounded-xl border border-cream-light hover:border-purple-200 transition-all text-sm text-ink">
                <span className="text-[10px] text-ink-muted mr-2">#{i + 1}</span>{title}
              </button>
            ))}
          </div>
          <button onClick={() => { setSelectedTitle(""); setStage("cards_ready") }}
            className="w-full py-2 text-xs text-ink-muted hover:text-ink">跳过，直接选卡片</button>
        </div>
      )}

      {/* Cards panel */}
      {stage === "cards_ready" && cards.length > 0 && (
        <div className="absolute top-full mt-3 left-0 bg-white border border-cream-light rounded-2xl shadow-xl p-5 w-[420px] animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div><span className="text-sm font-semibold text-ink">选择灵感方向</span>
              {selectedTitle && <span className="text-[10px] text-purple-500 ml-2">{selectedTitle}</span>}</div>
            <button onClick={() => setStage("idle")} className="text-ink-muted hover:text-ink"><X size={16} /></button>
          </div>
          <div className="flex flex-col gap-2 mb-4 max-h-[320px] overflow-y-auto">
            {cards.map((c, i) => (
              <button key={i} onClick={() => { setSelectedCard(c.content); setSelectedCardIndex(i) }}
                className={`text-left px-4 py-3 rounded-xl border transition-all text-sm ${selectedCardIndex === i ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-cream hover:bg-purple-50 border-cream-light hover:border-purple-200 text-ink"}`}>
                <span className="text-[10px] text-ink-muted mr-2">#{i + 1}</span>{c.content}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => handleGenerate("short")} disabled={!selectedCard || (stage as string) === "generating"}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-1.5">
              {(stage as string) === "generating" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}短文
            </button>
            <button onClick={() => handleGenerate("essay")} disabled={!selectedCard || (stage as string) === "generating"}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-1.5">
              {(stage as string) === "generating" ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}随笔
            </button>
            <button onClick={() => handleGenerate("article")} disabled={!selectedCard || (stage as string) === "generating"}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-1.5">
              {(stage as string) === "generating" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}文章
            </button>
          </div>
          <p className="text-[10px] text-ink-muted/50 text-center">
            {selectedCard ? "已选方向 → 点上方按钮生成 → 文案出现在右侧作品面板" : "选一张卡片作为方向"}
          </p>
        </div>
      )}
    </div>
  )
}