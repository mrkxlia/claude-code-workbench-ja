export type ItemStatus = 'pending' | 'in_progress' | 'completed'

// subject は件名、activeForm は実行中に見せる進行形（無ければ件名）
export type Item = { status: ItemStatus; subject: string; activeForm: string | null; startedAt: number | null }

export type Band = {
  items: Record<string, Item>
  // 最後にタスクが完了した（または新しい仕事が始まった）時刻。15分の詰まりの起点
  lastProgressAt: number | null
  // メインのターンが動いているか。止まっている間（人の番）は15分の詰まりを数えない
  turnActive: boolean
  turnStartedAt: number | null
  // メインのループで実行中のツールの数と、開いている質問の数。どちらかがあるうちは詰まりと数えない
  inFlight: number
  asking: number
  // 詰まりのトーストを出したか（解けるまで鳴らし直さない）
  warned: boolean
  // すべて完了したあと人が次のプロンプトを送ったら帯を畳む。タスクが動いたら戻す
  isDismissed: boolean
  // /task-band off で隠す
  isHidden: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'task-band': { band: Band }
  }
}
