export type ItemStatus = 'pending' | 'in_progress' | 'completed'

export type Item = { status: ItemStatus; label: string }

export type Failure = { tool: string; text: string; at: number }

export type Watch = {
  items: Record<string, Item>
  lastProgressAt: number | null
  streak: number
  failures: Failure[]
  warned: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'stuck-watch': { watch: Watch }
  }
}
