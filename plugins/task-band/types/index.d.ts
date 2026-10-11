// TodoWrite・TaskUpdate の status と同じ値（model.ts が本体の入力型と突き合わせるので、ずれれば tsc が落ちる）
export type ItemStatus = 'pending' | 'in_progress' | 'completed'

// subject は件名、activeForm は実行中に見せる進行形（無ければ件名）
export type Item = { status: ItemStatus; subject: string; activeForm: string | null; startedAt: number | null }

// 帯が描画中に読む値。ここが変わったときだけ帯を描き直す
export type Band = {
  items: Record<string, Item>
  // 15分の詰まりの起点。進捗・ターンの開始・人のプロンプトで now に戻す
  idleSince: number | null
  // 15分の詰まりに入ったか（帯を黄色にし、トーストは入ったときに1度だけ）。起点を戻すと解ける
  warned: boolean
  // すべて完了したあと人が次のプロンプトを送ったら帯を畳む。タスクが動いたら戻す
  isDismissed: boolean
  // /task-band off で隠す
  isHidden: boolean
}

// 帯は読まない、メインのループの動き。ツール呼び出しのたびに変わるので Band と分ける（帯を描き直さないため）
export type Activity = {
  turnActive: boolean
  // 実行中のツール（質問の AskUserQuestion を含む）の数。あるうちは詰まりと数えない
  inFlight: number
}

// task-pipeline（pipeline プラグイン）の status.md から読んだ、進行中のパイプライン1件
export type Pipeline = {
  slug: string
  // 「Phase3」など、最初の未チェック行のフェーズ
  phase: string
  done: number
  total: number
  // 成果物は保存済みで、人の承認を待っている関門の名前（「ブリーフ承認」）
  waiting: string | null
  // このフェーズの終わりにある、まだ来ていない関門の名前
  gate: string | null
  // 「差し戻し 1/3」の 1/3
  rejects: string | null
  // 同時に進行中のほかのパイプラインの数（帯には一番新しく更新された1件だけを出す）
  others: number
}

declare module 'claude-code' {
  interface PluginState {
    'task-band': { band: Band; activity: Activity; pipeline: Pipeline | null }
  }
}
