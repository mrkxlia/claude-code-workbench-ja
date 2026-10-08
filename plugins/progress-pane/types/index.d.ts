export type ItemStatus = 'pending' | 'in_progress' | 'completed'

// subject は件名、activeForm は実行中に見せる進行形（無ければ件名）
export type Item = { status: ItemStatus; subject: string; activeForm: string | null; startedAt: number | null }

export type Failure = { tool: string; text: string; at: number; loop: string }

// 1つのモデルループ（メイン、またはサブエージェント・チームメイト）
export type Loop = {
  id: string
  type: string
  description: string
  parentId: string | null
  // claude-code の AgentStatus と同じ値＋一覧で一度も見ていない 'unknown'（ワークフローや compaction・memory のフォーク）
  // ＋走っていたのに一覧から消えた 'gone'（完了か異常終了かは分からない）
  status: 'pending' | 'running' | 'waiting' | 'idle' | 'completed' | 'failed' | 'killed' | 'unknown' | 'gone'
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
  // メインのターンが動いているか。止まっている間（人の番）は15分の詰まりを数えない
  turnActive: boolean
  turnStartedAt: number | null
  // ペインを頼まれずに開くのはセッションで1回だけ。人が閉じたら以後は開かない
  autoOpened: boolean
  // 一覧と使用量の取り込みが最後に成功した時刻と、失敗が続いているか（API が変わったときに黙らないため）
  syncedAt: number | null
  syncFailing: boolean
}

export type Tab = 'overview' | 'agents' | 'log'

declare module 'claude-code' {
  interface PluginState {
    'progress-pane': { watch: Watch; tab: Tab }
  }
}
