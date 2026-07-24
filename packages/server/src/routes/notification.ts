import { Hono } from "hono"
import { store } from "../db"

export const notificationRoutes = new Hono()

// 获取通知列表
notificationRoutes.get("/", (c) => {
  const unreadOnly = c.req.query("unread") === "true"
  const limit = parseInt(c.req.query("limit") || "20")

  let notifications = store.notifications
    .findAll()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  if (unreadOnly) {
    notifications = notifications.filter((n) => n.read === 0)
  }

  const result = notifications.slice(0, limit).map((n) => ({
    id: n.id,
    level: n.level,
    title: n.title,
    content: n.content,
    source: n.source,
    link: n.link,
    read: n.read === 1,
    createdAt: n.createdAt,
  }))

  const unreadCount = store.notifications.count((n) => n.read === 0)

  return c.json({ success: true, data: { items: result, unreadCount } })
})

// 标记已读
notificationRoutes.patch("/:id/read", (c) => {
  const id = c.req.param("id")
  const n = store.notifications.findById(id)
  if (!n) return c.json({ success: false, error: "通知不存在" }, 404)
  store.notifications.update(id, { read: 1 as unknown as number })
  return c.json({ success: true })
})

// 全部标记已读
notificationRoutes.patch("/read-all", (c) => {
  const unread = store.notifications.findAll((n) => n.read === 0)
  unread.forEach((n) => store.notifications.update(n.id, { read: 1 as unknown as number }))
  return c.json({ success: true, data: { marked: unread.length } })
})
