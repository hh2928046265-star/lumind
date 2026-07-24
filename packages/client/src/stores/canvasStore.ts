import { create } from 'zustand'
import type { CanvasNode, CanvasEdge, ViewportState } from '@ai-creator/shared'

interface CanvasState {
  // 当前加载的 Canvas
  workspaceId: string | null
  viewport: ViewportState
  selectedNodeIds: string[]
  selectedEdgeIds: string[]

  // 操作历史（撤销/重做）
  undoStack: CanvasSnapshot[]
  redoStack: CanvasSnapshot[]

  // Actions
  setWorkspace: (id: string) => void
  setViewport: (vp: ViewportState) => void
  selectNode: (id: string, multi: boolean) => void
  selectEdge: (id: string, multi: boolean) => void
  clearSelection: () => void
  pushUndo: (snapshot: CanvasSnapshot) => void
  undo: () => CanvasSnapshot | null
  redo: () => CanvasSnapshot | null
}

interface CanvasSnapshot {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  workspaceId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeIds: [],
  selectedEdgeIds: [],
  undoStack: [],
  redoStack: [],

  setWorkspace: (id) => set({ workspaceId: id }),

  setViewport: (vp) => set({ viewport: vp }),

  selectNode: (id, multi) =>
    set((s) => ({
      selectedNodeIds: multi ? [...s.selectedNodeIds, id] : [id],
      selectedEdgeIds: [],
    })),

  selectEdge: (id, multi) =>
    set((s) => ({
      selectedEdgeIds: multi ? [...s.selectedEdgeIds, id] : [id],
      selectedNodeIds: [],
    })),

  clearSelection: () => set({ selectedNodeIds: [], selectedEdgeIds: [] }),

  pushUndo: (snapshot) =>
    set((s) => ({
      undoStack: [...s.undoStack.slice(-50), snapshot],
      redoStack: [],
    })),

  undo: () => {
    const { undoStack } = get()
    if (undoStack.length === 0) return null
    const snapshot = undoStack[undoStack.length - 1]
    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, snapshot],
    }))
    return snapshot
  },

  redo: () => {
    const { redoStack } = get()
    if (redoStack.length === 0) return null
    const snapshot = redoStack[redoStack.length - 1]
    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, snapshot],
    }))
    return snapshot
  },
}))
