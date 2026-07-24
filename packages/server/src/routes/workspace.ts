import { Hono } from 'hono'
import { store, uuidv7 } from '../db'

export const workspaceRoutes = new Hono()

workspaceRoutes.get('/', (c) => {
  const workspaces = store.workspaces
    .findAll((w) => w.userId === 'default')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return c.json({ success: true, data: workspaces })
})

workspaceRoutes.post('/', async (c) => {
  const body = await c.req.json()
  const now = new Date().toISOString()

  const ws = store.workspaces.insert({
    id: uuidv7(),
    userId: 'default',
    projectId: '',
    title: body.title,
    description: body.description || '',
    status: 'active',
    canvasId: '',
    draftIds: '[]',
    assetIds: '[]',
    actionIds: '[]',
    focusSessionIds: '[]',
    createdAt: now,
    updatedAt: now,
    archivedAt: '',
  })

  return c.json({ success: true, data: { id: ws.id } }, 201)
})

workspaceRoutes.get('/:id', (c) => {
  const id = c.req.param('id')
  const ws = store.workspaces.findById(id)
  if (!ws) {
    return c.json({ success: false, error: 'Not found' }, 404)
  }
  return c.json({ success: true, data: ws })
})

workspaceRoutes.patch('/:id/archive', (c) => {
  const id = c.req.param('id')
  const now = new Date().toISOString()
  store.workspaces.update(id, { status: 'archived', archivedAt: now, updatedAt: now })
  return c.json({ success: true })
})
