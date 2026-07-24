import { Hono } from 'hono'
import { store, uuidv7 } from '../db'

export const identityRoutes = new Hono()

identityRoutes.get('/', (c) => {
  const identity = store.identities.findOne((i) => i.userId === 'default')
  if (!identity) {
    return c.json({ success: false, error: 'Identity not found. Run onboarding first.' }, 404)
  }
  return c.json({ success: true, data: identity })
})

identityRoutes.post('/onboarding', async (c) => {
  const body = await c.req.json()
  const now = new Date().toISOString()

  const identity = store.identities.insert({
    id: uuidv7(),
    userId: 'default',
    domains: JSON.stringify(body.domains || []),
    aestheticPrefs: JSON.stringify(body.aestheticPrefs || { likes: [], dislikes: [] }),
    writingStyle: JSON.stringify(body.writingStyle || {}),
    learnedWeights: JSON.stringify({}),
    createdAt: now,
    updatedAt: now,
  })

  return c.json({ success: true, data: { id: identity.id } }, 201)
})

identityRoutes.patch('/', async (c) => {
  const body = await c.req.json()
  const existing = store.identities.findOne((i) => i.userId === 'default')
  if (!existing) {
    return c.json({ success: false, error: 'Identity not found' }, 404)
  }
  store.identities.update(existing.id, {
    ...body,
    updatedAt: new Date().toISOString(),
  })
  return c.json({ success: true })
})
