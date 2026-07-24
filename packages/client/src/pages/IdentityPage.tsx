import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, User, Palette, BookOpen, Save, Loader2, Check } from "lucide-react"
import { api } from "../hooks/api"

const DOMAIN_OPTIONS = ["摄影", "哲学", "AI", "艺术", "文学", "科技", "设计", "心理学", "教育", "商业", "电影", "音乐", "游戏", "自然", "历史"]

export function IdentityPage() {
  const [domains, setDomains] = useState<string[]>([])
  const [aestheticLikes, setAestheticLikes] = useState("")
  const [aestheticDislikes, setAestheticDislikes] = useState("")
  const [writingStyle, setWritingStyle] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)

  useEffect(() => {
    api.getIdentity()
      .then((data) => {
        const d = data as Record<string, unknown>
        setHasExisting(true)
        setDomains(JSON.parse((d.domains as string) || "[]"))
        const prefs = JSON.parse((d.aestheticPrefs as string) || "{}")
        setAestheticLikes(prefs.likes?.join("、") || "")
        setAestheticDislikes(prefs.dislikes?.join("、") || "")
        setWritingStyle(JSON.parse((d.writingStyle as string) || "{}").description || "")
      })
      .catch(() => setHasExisting(false))
      .finally(() => setLoading(false))
  }, [])

  const toggleDomain = (tag: string) => {
    setDomains((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        domains: domains.length > 0 ? domains : undefined,
        aestheticPrefs: {
          likes: aestheticLikes ? aestheticLikes.split(/[、,，]/).map(s => s.trim()).filter(Boolean) : [],
          dislikes: aestheticDislikes ? aestheticDislikes.split(/[、,，]/).map(s => s.trim()).filter(Boolean) : [],
        },
        writingStyle: { description: writingStyle },
      }

      if (hasExisting) {
        await api.updateIdentity(body)
      } else {
        await api.createIdentity(body)
        setHasExisting(true)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white px-6">
      <div className="max-w-[520px] mx-auto pt-12 md:pt-16 pb-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-8 transition-colors">
          <ArrowLeft size={16} /> 返回首页
        </Link>

        <h1 className="font-serif text-[32px] md:text-[40px] font-semibold text-ink tracking-tight mb-3">
          创作者身份
        </h1>
        <p className="text-sm text-ink-muted mb-12 leading-relaxed">
          让 AI 理解你的创作偏好和风格。身份模型会从你的每一次交互中持续学习。
        </p>

        <div className="flex flex-col gap-6">
          <div className="bg-cream rounded-[28px] p-8 border border-cream-light">
            <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-white mb-5">
              <BookOpen size={18} />
            </div>
            <h3 className="font-serif text-xl font-semibold text-ink mb-3">兴趣领域</h3>
            <p className="text-sm text-ink-muted mb-4">选择你最常创作的主题方向（可多选）</p>
            <div className="flex flex-wrap gap-2">
              {DOMAIN_OPTIONS.map(tag => {
                const active = domains.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleDomain(tag)}
                    className={
                      `px-4 py-1.5 rounded-full border text-sm transition-all
                      ${active
                        ? "bg-ink text-white border-ink"
                        : "border-ink/10 text-ink-muted hover:border-ink/30 hover:text-ink"
                      }`
                    }
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-cream rounded-[28px] p-8 border border-cream-light">
            <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-white mb-5">
              <Palette size={18} />
            </div>
            <h3 className="font-serif text-xl font-semibold text-ink mb-3">审美偏好</h3>
            <p className="text-sm text-ink-muted mb-4">告诉 AI 你喜欢什么风格、排斥什么套路</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-2">喜欢的风格（用顿号或逗号分隔）</label>
                <input
                  value={aestheticLikes}
                  onChange={(e) => { setAestheticLikes(e.target.value); setSaved(false) }}
                  placeholder="极简、黑白、留白、胶片感..."
                  className="w-full px-4 py-3 bg-white border border-cream-light rounded-xl text-ink text-sm focus:outline-none focus:border-ink/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-2">排斥的风格</label>
                <input
                  value={aestheticDislikes}
                  onChange={(e) => { setAestheticDislikes(e.target.value); setSaved(false) }}
                  placeholder="花哨、低饱和度、过度装饰..."
                  className="w-full px-4 py-3 bg-white border border-cream-light rounded-xl text-ink text-sm focus:outline-none focus:border-ink/20 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="bg-cream rounded-[28px] p-8 border border-cream-light">
            <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-white mb-5">
              <User size={18} />
            </div>
            <h3 className="font-serif text-xl font-semibold text-ink mb-3">写作风格</h3>
            <p className="text-sm text-ink-muted mb-4">
              记录你的句式偏好、文章结构、常用表达和价值倾向。AI 在生成内容时会参考这些参数。
            </p>
            <textarea
              value={writingStyle}
              onChange={(e) => { setWritingStyle(e.target.value); setSaved(false) }}
              placeholder="例如：我喜欢用短句、段落间留白、开头设问、结尾留悬念..."
              className="w-full px-4 py-3 bg-white border border-cream-light rounded-xl text-ink text-sm focus:outline-none focus:border-ink/20 transition-colors min-h-[100px] resize-y"
            />
          </div>
        </div>

        <div className="mt-10 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary bg-ink text-white rounded-full px-7 py-3 text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> 保存中...</>
            ) : saved ? (
              <><Check size={16} /> 已保存</>
            ) : (
              <><Save size={16} /> 保存身份配置</>
            )}
          </button>
          {saved && (
            <span className="text-xs text-ink-muted">身份已更新，AI 会在后续创作中参考</span>
          )}
        </div>
      </div>
    </div>
  )
}
