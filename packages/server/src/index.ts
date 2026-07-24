import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { identityRoutes } from './routes/identity'
import { workspaceRoutes } from './routes/workspace'
import { canvasRoutes } from './routes/canvas'
import { draftRoutes } from './routes/draft'
import { memoryRoutes } from './routes/memory'
import { homeRoutes } from './routes/home'
import { agentRoutes } from './routes/agent'
import { notificationRoutes } from './routes/notification'
import { adminRoutes } from './routes/admin'
import { uploadRoutes } from './routes/uploads'
import { pipelineRoutes } from './routes/pipeline'
import { serveStatic } from '@hono/node-server/serve-static'

// Auto-load persisted LLM config
import { llmService } from './services/llm'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const CONFIG_DIR = join(process.cwd(), 'data')
const CONFIG_FILE = join(CONFIG_DIR, 'llm-config.json')

// Load persisted config on startup
if (existsSync(CONFIG_FILE)) {
  try {
    const saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
    for (const [provider, cfg] of Object.entries(saved)) {
      llmService.configure(provider as any, cfg as any)
      console.log('[Config] Loaded ' + provider + ' config')
    }
  } catch (e) { console.warn('[Config] Failed to load persisted config') }
}

// Override configure to persist
const originalConfigure = llmService.configure.bind(llmService)
llmService.configure = function (provider: any, config: any) {
  originalConfigure(provider, config)
  try {
    if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
    const allConfigs: Record<string, any> = {}
    const existing = readConfigFile()
    Object.assign(existing, { [provider]: config })
    writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2), 'utf-8')
  } catch { }
} as any

function readConfigFile(): Record<string, any> {
  try {
    if (existsSync(CONFIG_FILE)) return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
    return {}
  } catch { return {} }
}

const app = new Hono()

// CORS
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Routes
const api = new Hono()
api.route('/identity', identityRoutes)
api.route('/workspaces', workspaceRoutes)
api.route('/canvas', canvasRoutes)
api.route('/drafts', draftRoutes)
api.route('/memory', memoryRoutes)
api.route('/home', homeRoutes)
api.route('/agents', agentRoutes)
api.route('/notifications', notificationRoutes)
api.route('/admin', adminRoutes)
api.route('/uploads', uploadRoutes)
api.route('/pipeline', pipelineRoutes)

app.route('/api', api)

// Serve uploaded files
app.use('/uploads/*', serveStatic({ root: './' }))

const port = parseInt(process.env.PORT || '3000')

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log('Server running at http://localhost:' + info.port)
  console.log('API: http://localhost:' + info.port + '/api')
})

export type AppType = typeof api
