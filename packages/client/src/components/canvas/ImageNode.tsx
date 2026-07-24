import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Image as ImageIcon, Loader2 } from "lucide-react"
import { useState } from "react"

interface ImageNodeData {
  url: string
  analysis?: string
  isNew?: boolean
}

export function ImageNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ImageNodeData
  const [loading, setLoading] = useState(false)

  return (
    <div
      className={
        "rounded-xl overflow-hidden min-w-[180px] max-w-[280px] transition-all duration-200 bg-white border" +
        (selected ? " ring-2 ring-blue-300 shadow-lg border-blue-300" : " shadow-sm hover:shadow-md border-slate-200")
      }
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-300 !w-2 !h-2 !border-white" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-300 !w-2 !h-2 !border-white" />

      <div className="relative">
        {nodeData.url ? (
          <img src={nodeData.url} alt="Uploaded" className="w-full h-auto max-h-[200px] object-cover" />
        ) : (
          <div className="w-full h-[120px] bg-slate-100 flex items-center justify-center">
            {loading ? <Loader2 size={24} className="animate-spin text-slate-400" /> : <ImageIcon size={24} className="text-slate-400" />}
          </div>
        )}
      </div>

      {nodeData.analysis && (
        <div className="px-3 py-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">{nodeData.analysis}</p>
        </div>
      )}
    </div>
  )
}
