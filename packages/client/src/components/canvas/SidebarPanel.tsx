import { useState, useEffect } from "react"
import { FolderOpen, StickyNote, Search, X, Image, Plus } from "lucide-react"
import { api } from "../../hooks/api"

interface SidebarPanelProps { workspaceId: string; onClose: () => void }
type Tab = "files" | "notes" | "search"
interface FileItem { filename: string; url: string; size: number; uploadedAt: string }

export function SidebarPanel({ workspaceId, onClose }: SidebarPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("files")
  const [files, setFiles] = useState<FileItem[]>([])
  const [notes, setNotes] = useState<Array<{ id: string; content: string; updatedAt: string }>>([])
  const [newNote, setNewNote] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/uploads/list').then(r => r.json()).then(d => {
      if (d.success) setFiles(d.data || [])
    }).catch(() => {})
  }, [])

  const addNote = () => {
    if (!newNote.trim()) return
    const note = { id: Date.now().toString(), content: newNote.trim(), updatedAt: new Date().toISOString() }
    setNotes(prev => [note, ...prev])
    setNewNote("")
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    try {
      const results = await api.searchMemory(searchQuery)
      setSearchResults(results.map((r: any) => r.content || r.title || ''))
    } catch { setSearchResults(['搜索出错']) }
  }

  const tabs: Array<{ id: Tab; icon: typeof FolderOpen; label: string }> = [
    { id: "files", icon: FolderOpen, label: "文件" },
    { id: "notes", icon: StickyNote, label: "笔记" },
    { id: "search", icon: Search, label: "搜索" },
  ]

  return (
    <div className="w-[300px] flex-shrink-0 h-full bg-white border-r border-cream-light flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-cream-light">
        <span className="text-sm font-medium text-ink">工作台</span>
        <button onClick={onClose}><X size={16} /></button>
      </div>
      <div className="flex border-b border-cream-light">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs ${activeTab === id ? 'text-ink border-b-2 border-ink font-medium' : 'text-ink-muted'}`}>
            <Icon size={13} /><span>{label}</span></button>))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "files" && (files.length === 0 ? <p className="text-xs text-ink-muted/50 text-center py-8">暂无文件</p> :
          files.map(f => <div key={f.filename} className="flex items-center gap-3 p-3 bg-cream rounded-xl border border-cream-light mb-2"><Image size={18} className="text-blue-400" /><div className="flex-1 min-w-0"><p className="text-xs text-ink truncate">{f.filename}</p><p className="text-[10px] text-ink-muted">{(f.size / 1024).toFixed(0)} KB</p></div></div>))}
        {activeTab === "notes" && (<div className="space-y-4"><div className="flex gap-2"><input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} placeholder="写一条笔记..." className="flex-1 px-3 py-2 bg-cream rounded-xl text-xs focus:outline-none border border-cream-light" /><button onClick={addNote} className="p-2 bg-ink text-white rounded-xl"><Plus size={14} /></button></div>{notes.length === 0 ? <p className="text-xs text-ink-muted/50 text-center py-8">暂无笔记</p> : notes.map(note => <div key={note.id} className="p-3 bg-cream rounded-xl border border-cream-light mb-2"><p className="text-xs text-ink whitespace-pre-wrap">{note.content}</p></div>)}</div>)}
        {activeTab === "search" && (<div className="space-y-4"><div className="flex gap-2"><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="搜索记忆库..." className="flex-1 px-3 py-2 bg-cream rounded-xl text-xs focus:outline-none border border-cream-light" /><button onClick={handleSearch} className="p-2 bg-ink text-white rounded-xl"><Search size={14} /></button></div>{searchResults.length === 0 ? <p className="text-xs text-ink-muted/50 text-center py-8">输入关键词搜索</p> : searchResults.map((r, i) => <div key={i} className="p-3 bg-cream rounded-xl border border-cream-light mb-2"><p className="text-xs text-ink">{r}</p></div>)}</div>)}
      </div>
    </div>)
}