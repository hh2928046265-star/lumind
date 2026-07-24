import { useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Lightbulb, HelpCircle, FileText, Sparkles, Zap } from "lucide-react"

interface IdeaNodeData {
  content: string
  isNew?: boolean
}

const typeConfig: Record<string, { icon: typeof Lightbulb; label: string; color: string; bg: string }> = {
  idea: { icon: Lightbulb, label: "灵感", color: "text-purple-600", bg: "bg-purple-50" },
  question: { icon: HelpCircle, label: "问题", color: "text-amber-600", bg: "bg-amber-50" },
  insight: { icon: Zap, label: "洞见", color: "text-emerald-600", bg: "bg-emerald-50" },
  example: { icon: FileText, label: "案例", color: "text-blue-600", bg: "bg-blue-50" },
  reference: { icon: Sparkles, label: "参考", color: "text-rose-600", bg: "bg-rose-50" },
}

export function IdeaNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as IdeaNodeData
  const [content, setContent] = useState(nodeData.content)
  const cfg = typeConfig[nodeData.type as string] || typeConfig.idea
  const Icon = cfg.icon

  return (
    <div
      className={
        `px-5 py-4 rounded-xl min-w-[200px] max-w-[320px] transition-all duration-200
        bg-white border
        ${selected
          ? "ring-2 ring-purple-300 shadow-lg border-purple-300"
          : "shadow-sm hover:shadow-md border-slate-200 hover:border-purple-200"}
        ${nodeData.isNew ? "animate-scale-in" : ""}`
      }
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-300 !w-2 !h-2 !border-white" />
      <Handle type="source" position={Position.Bottom} className="!bg-purple-300 !w-2 !h-2 !border-white" />

      {/* 类型标签 */}
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mb-2.5 ${cfg.bg} ${cfg.color}`}>
        <Icon size={11} />
        <span>{cfg.label}</span>
      </div>

      {/* 内容 */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="输入想法…"
        className="w-full min-h-[60px] bg-transparent border-none text-sm text-slate-700 resize-y font-sans focus:outline-none placeholder:text-slate-300 leading-relaxed"
        autoFocus={nodeData.isNew}
        rows={Math.max(2, Math.ceil(content.length / 40))}
      />
    </div>
  )
}
