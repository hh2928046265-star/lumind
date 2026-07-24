/**
 * 轻量级 JSON 文件存储
 * MVP 阶段使用，无需任何原生依赖
 * 单用户场景下性能完全够用
 */
import fs from 'node:fs'
import path from 'node:path'
import { v7 as uuidv7 } from 'uuid'

const DATA_DIR = path.resolve(process.env.DATA_PATH || './data')

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

interface CollectionOptions {
  /** 是否自动创建 ID */
  autoId?: boolean
}

class Collection<T extends { id: string }> {
  private filePath: string
  private cache: Map<string, T> | null = null

  constructor(name: string) {
    this.filePath = path.join(DATA_DIR, `${name}.json`)
  }

  private load(): Map<string, T> {
    if (this.cache) return this.cache
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8')
      const arr: T[] = JSON.parse(raw)
      this.cache = new Map(arr.map((item) => [item.id, item]))
    } catch {
      this.cache = new Map()
      this.save()
    }
    return this.cache
  }

  private save(): void {
    const arr = Array.from(this.load().values())
    fs.writeFileSync(this.filePath, JSON.stringify(arr, null, 2), 'utf-8')
  }

  /** 查找所有 */
  findAll(filter?: (item: T) => boolean): T[] {
    const items = Array.from(this.load().values())
    return filter ? items.filter(filter) : items
  }

  /** 查找单个 */
  findById(id: string): T | undefined {
    return this.load().get(id)
  }

  /** 条件查找第一个 */
  findOne(predicate: (item: T) => boolean): T | undefined {
    return this.findAll(predicate)[0]
  }

  /** 插入 */
  insert(item: T): T {
    const data = this.load()
    data.set(item.id, item)
    this.save()
    return item
  }

  /** 更新 */
  update(id: string, updates: Partial<T>): T | undefined {
    const data = this.load()
    const existing = data.get(id)
    if (!existing) return undefined
    const updated = { ...existing, ...updates, id }
    data.set(id, updated)
    this.save()
    return updated
  }

  /** 删除 */
  delete(id: string): boolean {
    const data = this.load()
    const result = data.delete(id)
    if (result) this.save()
    return result
  }

  /** 计数 */
  count(filter?: (item: T) => boolean): number {
    return this.findAll(filter).length
  }
}

// 为每个实体创建集合
export const store = {
  identities: new Collection<import('./types').IdentityRecord>('identities'),
  goals: new Collection<import('./types').GoalRecord>('goals'),
  projects: new Collection<import('./types').ProjectRecord>('projects'),
  workspaces: new Collection<import('./types').WorkspaceRecord>('workspaces'),
  canvases: new Collection<import('./types').CanvasRecord>('canvases'),
  canvasNodes: new Collection<import('./types').CanvasNodeRecord>('canvas_nodes'),
  canvasEdges: new Collection<import('./types').CanvasEdgeRecord>('canvas_edges'),
  drafts: new Collection<import('./types').DraftRecord>('drafts'),
  draftVersions: new Collection<import('./types').DraftVersionRecord>('draft_versions'),
  reviewCards: new Collection<import('./types').ReviewCardRecord>('review_cards'),
  memoryNodes: new Collection<import('./types').MemoryNodeRecord>('memory_nodes'),
  memoryEdges: new Collection<import('./types').MemoryEdgeRecord>('memory_edges'),
  memorySnapshots: new Collection<import('./types').MemorySnapshotRecord>('memory_snapshots'),
  agentCalls: new Collection<import('./types').AgentCallRecord>('agent_calls'),
  systemConfig: new Collection<import('./types').SystemConfigRecord>('system_config'),
  notifications: new Collection<import('./types').NotificationRecord>('notifications'),
}

export { uuidv7 }
