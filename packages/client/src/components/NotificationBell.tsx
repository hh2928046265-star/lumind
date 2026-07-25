import { useState, useEffect } from "react"
import { Bell, BellRing, Check, X } from "lucide-react"
import { api } from "../hooks/api"

interface Notification {
  id: string
  level: number
  title: string
  content: string
  source: string
  link: string
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const loadNotifications = () => {
    api.getNotifications()
      .then((data) => {
        const d = data as any as { items: Notification[]; unreadCount: number }
        setNotifications(d.items)
        setUnreadCount(d.unreadCount)
      })
      .catch(() => {})
  }

  useEffect(() => { loadNotifications() }, [])

  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch { /* ignore */ }
  }

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "刚刚"
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    return `${Math.floor(hours / 24)}天前`
  }

  const levelColors = ["border-blue-200 bg-blue-50", "border-amber-200 bg-amber-50", "border-red-200 bg-red-50"]

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) loadNotifications() }}
        className="relative p-1.5 rounded-full hover:bg-cream transition-colors"
        title="通知"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing size={16} className="text-ink" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </>
        ) : (
          <Bell size={16} className="text-ink-muted" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-[320px] max-h-[420px] bg-white rounded-2xl border border-cream-light shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cream-light">
              <span className="text-sm font-medium text-ink">通知</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-ink-muted hover:text-ink transition-colors">
                  全部已读
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-[360px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell size={24} className="text-ink-muted/20 mb-2" />
                  <p className="text-xs text-ink-muted">暂无通知</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-cream-light/50 hover:bg-cream/30 transition-colors cursor-pointer
                      ${!n.read ? "border-l-2 " + levelColors[n.level]?.split(" ")[0] : ""}`}
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink">{n.title}</p>
                        <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">{n.content}</p>
                      </div>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-ink flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[9px] text-ink-muted/50 mt-1.5">{timeAgo(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
