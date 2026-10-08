export type ItemStatus = 'pending' | 'in_progress' | 'completed'

export type Item = { status: ItemStatus; label: string; startedAt: number | null }

export type Failure = { tool: string; text: string; at: number; loop: string }

// 1つのモデルループ（メイン、またはサブエージェント・チームメイト）
export type Loop = {
  id: string
  type: string
  description: string
  parentId: string | null
  // claude-code の AgentStatus と同じ値＋まだ一覧で見ていない 'unknown'
  status: 'pending' | 'running' | 'waiting' | 'idle' | 'completed' | 'failed' | 'killed' | 'unknown'
  startedAt: number
  endedAt: number | null
  tools: number
  errors: number
  streak: number
  current: string | null
}

export type Usage = { startedAt: number | null; contextPercent: number | null; usd: number | null }

export type Watch = {
  items: Record<string, Item>
  lastProgressAt: number | null
  failures: Failure[]
  warned: boolean
  loops: Record<string, Loop>
  // 1分ごとの [成功, 失敗] の件数。キーは分（エポックからの分数）
  minutes: Record<string, [number, number]>
  toolCounts: Record<string, number>
  asking: number
  usage: Usage
}

export type Tab = 'overview' | 'agents' | 'log'

declare module 'claude-code' {
  interface PluginState {
    'progress-pane': { watch: Watch; tab: Tab }
  }
}
