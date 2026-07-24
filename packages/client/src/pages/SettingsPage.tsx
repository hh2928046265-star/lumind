import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Key, Download, Database, Loader2, Check, Zap } from "lucide-react"
import { api } from "../hooks/api"

export function SettingsPage() {
  const [provider, setProvider] = useState("openai")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("gpt-4o")
  const [baseUrl, setBaseUrl] = useState(provider === 'deepseek' ? 'https://api.deepseek.com' : provider === 'ollama' ? 'http://localhost:11434' : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)

  const saveLLMConfig = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      await api.configureLLM({
        provider,
        apiKey: apiKey.trim(),
        model: model.trim() || "gpt-4o",
        baseUrl: baseUrl.trim() || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const resp = await fetch("/api/admin/export")
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ai-creator-os-export-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white px-6">
      <div className="max-w-[520px] mx-auto pt-12 md:pt-16 pb-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-8 transition-colors">
          <ArrowLeft size={16} /> 返回首页
        </Link>

        <h1 className="font-serif text-[32px] font-semibold text-ink tracking-tight mb-3">设置</h1>
        <p className="text-sm text-ink-muted mb-12 leading-relaxed">配置 AI 模型和数据管理</p>

        {/* LLM 配置 */}
        <div className="bg-cream rounded-[28px] p-8 border border-cream-light mb-6">
          <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-white mb-5">
            <Key size={18} />
          </div>
          <h3 className="font-serif text-xl font-semibold text-ink mb-3">AI 模型配置</h3>
          <p className="text-sm text-ink-muted mb-5">配置 LLM 提供商的 API Key，支持 OpenAI / Anthropic / Ollama</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-2">提供商</label>
              <div className="flex gap-2">
                {[
                  { id: "openai", label: "OpenAI" },
                  { id: "anthropic", label: "Anthropic" }, { id: "deepseek", label: "DeepSeek" },
                  { id: "ollama", label: "Ollama (本地)" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={`px-4 py-2 rounded-full text-xs border transition-colors
                      ${provider === p.id ? "bg-ink text-white border-ink" : "border-cream-light text-ink-muted hover:border-ink/20"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {(provider === "openai" || provider === "deepseek" || provider === "ollama") && (
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setSaved(false) }}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 bg-white border border-cream-light rounded-xl text-sm text-ink focus:outline-none focus:border-ink/20 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-2">模型</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o"
                className="w-full px-4 py-3 bg-white border border-cream-light rounded-xl text-sm text-ink focus:outline-none focus:border-ink/20 transition-colors"
              />
            </div>

            {provider === "ollama" && (
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-2">Base URL（Ollama 地址）</label>
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full px-4 py-3 bg-white border border-cream-light rounded-xl text-sm text-ink focus:outline-none focus:border-ink/20 transition-colors"
                />
              </div>
            )}
          </div>

          <button
            onClick={saveLLMConfig}
            disabled={saving}
            className="mt-5 btn-primary bg-ink text-white rounded-full px-7 py-3 text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> 保存中...</>
            ) : saved ? (
              <><Check size={14} /> 已保存</>
            ) : (
              <><Zap size={14} /> 保存配置</>
            )}
          </button>
        </div>

        {/* 数据管理 */}
        <div className="bg-cream rounded-[28px] p-8 border border-cream-light">
          <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-white mb-5">
            <Database size={18} />
          </div>
          <h3 className="font-serif text-xl font-semibold text-ink mb-3">数据管理</h3>
          <p className="text-sm text-ink-muted mb-5">导出所有创作数据，包含 Workspace、草稿、记忆图谱和身份配置</p>
          <button
            onClick={exportData}
            disabled={exporting}
            className="btn-secondary bg-white text-ink rounded-full px-7 py-3 text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 inline-flex items-center gap-2 border border-cream-light"
          >
            {exporting ? (
              <><Loader2 size={14} className="animate-spin" /> 导出中...</>
            ) : (
              <><Download size={14} /> 导出数据</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
