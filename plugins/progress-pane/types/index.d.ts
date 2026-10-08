export type ItemStatus = 'pending' | 'in_progress' | 'completed'

// claim は html-plan の主張番号（タスク名の先頭に [1.2] のように付いていたとき）
export type Item = { status: ItemStatus; label: string; claim: string | null }

export type Failure = { tool: string; text: string; at: number }

export type Claim = { no: string; text: string }

// open: 回答前 / changed: 変更して回答 / kept: 開いて既定のまま / unopened: 開かずに既定のまま
export type AskState = 'open' | 'changed' | 'kept' | 'unopened'

export type Ask = { id: string; no: string; question: string; state: AskState; answer: string | null }

export type Plan = {
  path: string
  title: string
  claims: Claim[]
  asks: Ask[]
  isAnswered: boolean
}

export type Watch = {
  items: Record<string, Item>
  plan: Plan | null
  lastProgressAt: number | null
  streak: number
  failures: Failure[]
  warned: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'progress-pane': { watch: Watch }
  }
}
