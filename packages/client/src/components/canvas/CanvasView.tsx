import { useCallback } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { IdeaNode } from "./IdeaNode"
import { ImageNode } from "./ImageNode"
import { CanvasToolbar } from "./CanvasToolbar"
import { api } from "../../hooks/api"

const nodeTypes = {
  idea: IdeaNode,
  image: ImageNode,
}

interface CanvasViewProps {
  workspaceId: string
  initialNodes: Node[]
  initialEdges: Edge[]
  onDraftCreated?: (draftId: string, title: string) => void
  onCardsCreated?: (cards: Array<{ id: string; type: string; content: string }>) => void
  onImageUploaded?: (node: any) => void
}

export function CanvasView({ workspaceId, initialNodes, initialEdges, onDraftCreated, onCardsCreated, onImageUploaded }: CanvasViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `edge-${Date.now()}`,
        type: "smoothstep",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#6c5ce7", strokeWidth: 2 },
        data: { relationType: "relates_to", aiGenerated: false, aiRecommended: false },
      }

      setEdges((eds) => addEdge(newEdge, eds))

      api.createEdge(workspaceId, {
        fromNodeId: connection.source,
        toNodeId: connection.target,
        relationType: "relates_to",
      })
    },
    [workspaceId, setEdges],
  )

  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const position = { x: event.clientX - 100, y: event.clientY - 100 }

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: "idea",
        position,
        data: { content: "", isNew: true },
      }

      setNodes((nds) => [...nds, newNode])

      api.createNode(workspaceId, {
        type: "idea",
        content: "",
        position,
      }).then((d) => {
        if (d && d.id) {
          setNodes((nds) =>
            nds.map((n) => (n.id === newNode.id ? { ...n, id: d.id } : n)),
          )
        }
      })
    },
    [workspaceId, setNodes],
  )

  const handleImageNode = useCallback(
    (node: any) => {
      setNodes((nds) => [...nds, node])
    },
    [setNodes],
  )

  const handleCardsCreated = useCallback(
    (cards: Array<{ id: string; type: string; content: string }>) => {
      const cols = Math.min(cards.length, 4)
      const newNodes: Node[] = cards.map((card, i) => ({
        id: card.id,
        type: card.type || "idea",
        position: { x: (i % cols) * 280 + 60, y: Math.floor(i / cols) * 160 + 60 },
        data: { content: card.content },
      }))
      setNodes((nds) => [...nds, ...newNodes])
      onCardsCreated?.(cards)
    },
    [setNodes, onCardsCreated],
  )

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <CanvasToolbar workspaceId={workspaceId} onDraftCreated={onDraftCreated} onCardsCreated={handleCardsCreated} onImageUploaded={handleImageNode} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDoubleClick={onDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "#051A24" },
          style: { stroke: "#6c5ce7", strokeWidth: 2 },
        }}
        style={{ background: "#F6FCFF" }}
      >
        <Background color="#E0EBF0" gap={20} size={1} />
        <Controls
          className="!rounded-xl !border !border-cream-light !shadow-sm !bg-white/90 !backdrop-blur-sm"
          style={{ borderRadius: "12px" }}
        />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case "idea": return "#6c5ce7"
              case "quote": return "#f39c12"
              case "question": return "#e74c3c"
              default: return "#666"
            }
          }}
          maskColor="rgba(5,26,36,0.06)"
          style={{ background: "white", border: "1px solid #E0EBF0", borderRadius: "12px" }}
          className="!rounded-xl !border !border-cream-light !shadow-sm"
        />
      </ReactFlow>
    </div>
  )
}
