/**
 * LLM 提供商抽象层
 * 支持 OpenAI / Anthropic / Ollama，自动路由和降级
 */

export type LLMProvider = 'openai' | 'anthropic' | 'ollama'

export interface LLMConfig {
  provider: LLMProvider
  model: string
  apiKey?: string
  baseUrl?: string
}

export interface LLMResponse {
  content: string
  model: string
  provider: LLMProvider
  tokenUsage: {
    inputTokens: number
    outputTokens: number
  }
}

export interface LLMStreamCallbacks {
  onToken: (token: string) => void
  onComplete: (response: LLMResponse) => void
  onError: (error: Error) => void
}

class LLMService {
  private configs: Map<LLMProvider, LLMConfig> = new Map()
  private monthlyUsage = { tokens: 0, cost: 0 }
  private monthlyBudget = 15

  configure(provider: LLMProvider, config: LLMConfig) {
    this.configs.set(provider, config)
  }

  /**
   * 调用 LLM，支持自动降级
   * @param messages 消息列表
   * @param preferredProvider 首选提供商
   * @param fallbackProviders 降级提供商列表
   */
  async chat(
    messages: Array<{ role: string; content: string }>,
    preferredProvider: LLMProvider = 'openai',
    fallbackProviders: LLMProvider[] = ['anthropic', 'ollama'],
    modelOverride?: string,
    retries: number = 2,
  ): Promise<LLMResponse> {
    const providers = [preferredProvider, ...fallbackProviders]
    let lastError: Error | null = null

    for (const provider of providers) {
      const config = this.configs.get(provider)
      if (!config) continue

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const label = modelOverride ? `${provider}/${modelOverride}` : provider
          if (attempt > 0) console.warn(`[LLM] ${label} 重试 ${attempt}/${retries}`)
          return await this.callProvider(provider, config, messages, modelOverride)
        } catch (error) {
          lastError = error as Error
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
            continue
          }
          console.warn(`[LLM] ${provider} 调用失败:`, (error as Error).message)
        }
      }
    }

    throw lastError || new Error('所有 LLM 提供商均调用失败')
  }

  /**
   * 流式调用
   */
  async chatStream(
    messages: Array<{ role: string; content: string }>,
    callbacks: LLMStreamCallbacks,
    preferredProvider: LLMProvider = 'openai',
  ): Promise<void> {
    const config = this.configs.get(preferredProvider)
    if (!config) {
      callbacks.onError(new Error(`提供商 ${preferredProvider} 未配置`))
      return
    }

    // TODO: 实现流式调用
    // 具体实现根据提供商使用 fetch + SSE 或对应 SDK
    callbacks.onError(new Error('流式调用暂未实现'))
  }
  /**
   * 文本向量化 (Embedding)
   * 使用 Ollama nomic-embed-text 模型，用于语义搜索和记忆检索
   */
  async embed(texts: string[], model: string = 'nomic-embed-text'): Promise<number[][]> {
    const config = this.configs.get('ollama')
    const baseUrl = config?.baseUrl || 'http://localhost:11434'

    const response = await fetch(`${baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: texts }),
    })

    if (!response.ok) {
      throw new Error(`Embedding 失败: ${response.status} ${await response.text()}`)
    }

    const data = await response.json() as { embeddings: number[][] }
    if (!data.embeddings || data.embeddings.length === 0) {
      throw new Error('Embedding 返回空结果')
    }

    return data.embeddings
  }

  /**
   * 计算两个向量的余弦相似度
   */
  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1)
  }

  private async callProvider(
    provider: LLMProvider,
    config: LLMConfig,
    messages: Array<{ role: string; content: string }>,
    modelOverride?: string,
  ): Promise<LLMResponse> {
    const apiKey = config.apiKey || process.env[`${provider.toUpperCase()}_API_KEY`]
    const baseUrl = config.baseUrl || this.getDefaultBaseUrl(provider)
    const model = modelOverride || config.model

    if (!apiKey && provider !== 'ollama') {
      throw new Error(`${provider} API Key 未配置`)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 120000)

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || 'ollama'}`,
        },
        body: JSON.stringify({ model, messages, stream: false, temperature: 0.7 }),
      })

      if (!response.ok) {
        throw new Error(`${provider} 返回错误: ${response.status} ${await response.text()}`)
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>
        usage: { prompt_tokens: number; completion_tokens: number }
        model: string
      }

      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model || config.model,
        provider,
        tokenUsage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        },
      }
    } finally {
      clearTimeout(timer)
    }
  }

    private getDefaultBaseUrl(provider: LLMProvider): string {
    switch (provider) {
      case 'openai': return 'https://api.openai.com'
      case 'anthropic': return 'https://api.anthropic.com'
      case 'ollama': return 'http://localhost:11434'
    }
  }

  getMonthlyUsage() {
    return { ...this.monthlyUsage, budget: this.monthlyBudget }
  }

  isOverBudget(): boolean {
    return this.monthlyUsage.cost >= this.monthlyBudget
  }

  /**
   * 检测指定模型是否可用
   */
  async checkModelAvailable(model: string): Promise<boolean> {
    try {
      const config = this.configs.get('ollama')
      const baseUrl = config?.baseUrl || 'http://localhost:11434'
      const response = await fetch(`${baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 批量检测模型可用性
   */
  async getAvailableModels(models: string[]): Promise<string[]> {
    const results = await Promise.all(models.map(async m => {
      const ok = await this.checkModelAvailable(m)
      return ok ? m : null
    }))
    return results.filter(Boolean) as string[]
  }
}

export const llmService = new LLMService()
