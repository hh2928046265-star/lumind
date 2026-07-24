import { useState, useEffect } from "react"
import { FileText, Trash2, Loader2, ChevronRight, Clock, Edit3, MessageSquare, ThumbsUp, ThumbsDown, Send, X, GitBranch } from "lucide-react"
import { api } from "../../hooks/api"

interface DraftSummary {
  id: string
  title: string
  format: string
  status: string
  reviewCardId?: string
  wordCount: number
  createdAt: string
  updatedAt: string
}

interface DraftVersion {
  id: string
  versionNumber: number
  content: string
  changeDescription: string
  createdAt: string
}

interface DraftPanelProps {
  workspaceId: string
  activeDraftId?: string
  onSelectDraft?: (draftId: string) => void
  onClose?: () => void
}

export function DraftPanel({ workspaceId, activeDraftId, onSelectDraft, onClose }: DraftPanelProps) {
  const [drafts, setDrafts] = useState<DraftSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingId, setViewingId] = useState(activeDraftId || "")
  const [draftContent, setDraftContent] = useState("")
  const [draftTitle, setDraftTitle] = useState("")
  const [viewLoading, setViewLoading] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [versions, setVersions] = useState<DraftVersion[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<DraftVersion | null>(null)

  const [intentMatch, setIntentMatch] = useState("")
  const [timeFeeling, setTimeFeeling] = useState("")
  const [improvementNote, setImprovementNote] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  const loadDrafts = () => {
    setLoading(true)
    api.getDrafts(workspaceId)
      .then((data) => setDrafts(data as unknown as DraftSummary[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadDrafts() }, [workspaceId])

  const viewDraft = async (draftId: string) => {
    setViewingId(draftId)
    setViewLoading(true)
    setShowReview(false)
    setReviewSubmitted(false)
    setShowVersions(false)
    setSelectedVersion(null)
    try {
      const data = await api.getDraft(draftId)
      const d = data as Record<string, unknown>
      setDraftTitle((d.title as string) || "")
      setDraftContent((d.content as string) || "")
      setVersions((d.versions as DraftVersion[]) || [])
      onSelectDraft?.(draftId)

      if (d.reviewCard) {
        const rc = d.reviewCard as Record<string, unknown>
        setIntentMatch((rc.intentMatch as string) || "")
        setTimeFeeling((rc.timeFeeling as string) || "")
        setImprovementNote((rc.improvementNote as string) || "")
        setReviewSubmitted(true)
      } else {
        setIntentMatch("")
        setTimeFeeling("")
        setImprovementNote("")
      }
    } catch {} finally {
      setViewLoading(false)
    }
  }

  const deleteDraft = async (draftId: string) => {
    try {
      await api.deleteDraft(draftId)
      setDrafts((prev) => prev.filter((d) => d.id !== draftId))
      if (viewingId === draftId) {
        setViewingId(""); setDraftContent(""); setDraftTitle(""); setShowReview(false)
      }
    } catch {}
  }

  const submitReview = async () => {
    if (!viewingId) return
    setSubmittingReview(true)
    try {
      await api.submitReview(viewingId, { intentMatch, timeFeeling, improvementNote, criticIssuesResolved: "", unresolvedIssues: [] })
      setReviewSubmitted(true)
    } catch {} finally { setSubmittingReview(false) }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0")
  }

  const formatLabels: Record<string, string> = { blog: "文章", essay: "随笔", social: "短文", short: "短文", article: "文章" }

  return (
    <div className="h-full flex flex-col bg-white border-l border-cream-light shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-cream-light">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center">
            <FileText size={13} className="text-white" />
          </div>
          <span className="text-sm font-medium text-ink">草稿</span>
          {drafts.length > 0 && (
            <span className="text-[10px] font-medium text-ink-muted bg-cream rounded-full px-2 py-0.5">{drafts.length}</span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-ink-muted/40 hover:text-ink-muted hover:bg-cream transition-all">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-ink-muted" /></div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cream flex items-center justify-center mb-4"><FileText size={20} className="text-ink-muted/40" /></div>
            <p className="text-xs text-ink-muted mb-1">还没有草稿</p>
            <p className="text-[10px] text-ink-muted/40">生成的文案会出现在这里</p>
          </div>
        ) : viewingId ? (
          /* Draft Detail */
          <div>
            <button onClick={() => { setViewingId(""); setDraftContent(""); setSelectedVersion(null); setShowVersions(false) }}
              className="flex items-center gap-1 px-5 py-3 text-xs text-ink-muted hover:text-ink transition-colors w-full text-left border-b border-cream-light">
              <ChevronRight size={12} className="rotate-180" /> 返回列表
            </button>

            {viewLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>
            ) : (
              <div className="px-5 py-4">
                {/* Title + actions */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-ink mb-1">{draftTitle || "无标题"}</h3>
                    <span className="text-[10px] text-ink-muted bg-cream rounded px-1.5 py-0.5">{formatLabels[String((drafts.find(d => d.id === viewingId) || {}).format)] || "文章"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Version history button */}
                    {versions.length > 0 && (
                      <button onClick={() => { setShowVersions(!showVersions); setSelectedVersion(null) }}
                        className={"p-1.5 rounded-lg transition-all " + (showVersions ? "bg-purple-50 text-purple-500" : "text-ink-muted/40 hover:text-ink-muted hover:bg-cream")}
                        title="版本历史">
                        <GitBranch size={13} />
                      </button>
                    )}
                    <button onClick={() => setShowReview(!showReview)}
                      className={"p-1.5 rounded-lg transition-all " + (showReview ? "bg-amber-50 text-amber-500" : "text-ink-muted/40 hover:text-ink-muted hover:bg-cream")}
                      title="评价">
                      <MessageSquare size={13} />
                    </button>
                    <button onClick={() => deleteDraft(viewingId)}
                      className="p-1.5 rounded-lg text-ink-muted/40 hover:text-red-400 hover:bg-red-50 transition-all" title="删除">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Version comparison */}
                {showVersions && versions.length > 0 && (
                  <div className="mb-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                    <div className="flex items-center gap-2 mb-3">
                      <GitBranch size={12} className="text-purple-400" />
                      <span className="text-[11px] font-medium text-purple-600">版本历史 ({versions.length})</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      <button onClick={() => setSelectedVersion(null)}
                        className={"shrink-0 px-3 py-1.5 rounded-lg text-[11px] transition-all " + (!selectedVersion ? "bg-purple-200 text-purple-700 font-medium" : "bg-white text-ink-muted hover:bg-purple-100")}>
                        当前 v{versions.length + 1}
                      </button>
                      {versions.map((v) => (
                        <button key={v.id} onClick={() => setSelectedVersion(v)}
                          className={"shrink-0 px-3 py-1.5 rounded-lg text-[11px] transition-all " + (selectedVersion?.id === v.id ? "bg-purple-200 text-purple-700 font-medium" : "bg-white text-ink-muted hover:bg-purple-100")}>
                          v{v.versionNumber}
                        </button>
                      ))}
                    </div>
                    {selectedVersion && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-purple-100 max-h-[200px] overflow-y-auto">
                        <div className="text-[10px] text-ink-muted mb-1">{selectedVersion.changeDescription} · {formatDate(selectedVersion.createdAt)}</div>
                        <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{selectedVersion.content.slice(0, 500)}{selectedVersion.content.length > 500 ? "..." : ""}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="bg-cream rounded-2xl p-5 text-sm text-ink leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                  {draftContent}
                </div>

                {/* Review form */}
                {showReview && (
                  <div className="mt-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare size={12} className="text-amber-500" />
                      <span className="text-[11px] font-medium text-amber-600">{reviewSubmitted ? "已评价" : "评价这篇文案"}</span>
                    </div>
                    {reviewSubmitted ? (
                      <div className="space-y-2">
                        {intentMatch && <div className="text-[11px] text-ink-muted">意图：{intentMatch}</div>}
                        {timeFeeling && <div className="text-[11px] text-ink-muted">节奏：{timeFeeling}</div>}
                        {improvementNote && <div className="text-[11px] text-ink-muted">改进：{improvementNote}</div>}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-medium text-ink-muted block mb-2">是否符合意图？</label>
                          <div className="flex gap-2">
                            {["符合", "不够深入", "太浅", "太正式", "太随意"].map((opt) => (
                              <button key={opt} onClick={() => setIntentMatch(opt)}
                                className={"text-[11px] px-3 py-1.5 rounded-full border transition-all " + (intentMatch === opt ? "bg-ink text-white border-ink" : "border-cream-light text-ink-muted hover:border-ink/20 bg-white")}>{opt}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-ink-muted block mb-2">节奏感怎么样？</label>
                          <div className="flex gap-2">
                            {["节奏刚好", "太快了", "有点拖沓"].map((opt) => (
                              <button key={opt} onClick={() => setTimeFeeling(opt)}
                                className={"text-[11px] px-3 py-1.5 rounded-full border transition-all " + (timeFeeling === opt ? "bg-ink text-white border-ink" : "border-cream-light text-ink-muted hover:border-ink/20 bg-white")}>{opt}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-ink-muted block mb-2">有什么需要改进的？</label>
                          <textarea value={improvementNote} onChange={(e) => setImprovementNote(e.target.value)}
                            placeholder="比如：金句太少、开头不够吸引人..."
                            className="w-full px-4 py-3 bg-cream border border-cream-light rounded-xl text-xs text-ink focus:outline-none focus:border-ink/20 min-h-[60px] resize-y" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={submitReview} disabled={submittingReview}
                            className="bg-ink text-white rounded-full px-5 py-2.5 text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5">
                            {submittingReview ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} 提交评价
                          </button>
                          <button onClick={() => setShowReview(false)} className="px-4 py-2.5 text-xs text-ink-muted hover:text-ink transition-colors rounded-full hover:bg-cream">取消</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Draft List */
          <div className="flex flex-col">
            {drafts.map((draft) => (
              <button key={draft.id} onClick={() => viewDraft(draft.id)}
                className="flex items-center justify-between px-5 py-4 text-left border-b border-cream-light hover:bg-cream/50 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium text-ink-muted bg-cream border border-cream-light rounded px-1.5 py-0.5">
                      {formatLabels[draft.format] || draft.format}
                    </span>
                    <span className="text-xs text-ink font-medium truncate max-w-[160px]">{draft.title || "无标题"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-ink-muted/60">
                    <Clock size={10} />
                    <span>{formatDate(draft.createdAt)}</span>
                    <span>·</span>
                    <span>{draft.wordCount} 字</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); deleteDraft(draft.id) }}
                    className="p-1.5 rounded-full text-ink-muted/20 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100" title="删除">
                    <Trash2 size={12} />
                  </button>
                  <ChevronRight size={14} className="text-ink-muted/20 group-hover:text-ink-muted transition-all" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}