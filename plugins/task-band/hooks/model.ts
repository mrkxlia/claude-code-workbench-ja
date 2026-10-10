// 状態の更新と、帯に出す値の計算。エンジンに触れない純粋な関数だけを置く
import type { Band, Item, ItemStatus } from '../types'

// メインのターンが動いていて、未完了のタスクがあるのに、この時間タスクが1つも完了しなければ「詰まり」とみなす
export const IDLE_LIMIT_MS = 15 * 60 * 1000

export const EMPTY: Band = {
  items: {},
  lastProgressAt: null,
  turnActive: false,
  turnStartedAt: null,
  inFlight: 0,
  asking: 0,
  warned: false,
  isDismissed: false,
  isHidden: false,
}

// ---- タスク ----

const openCount = (items: Record<string, Item>) => Object.values(items).filter(i => i.status !== 'completed').length
const doneCount = (items: Record<string, Item>) => Object.values(items).filter(i => i.status === 'completed').length

// タスクの集合を差し替える。完了が増えたとき、または未完了が0件から増えたとき（新しい仕事の始まり）に起点を戻す。
// タスクが動いたら、畳んだ帯をまた出す
export const withItems = (b: Band, items: Record<string, Item>, now: number): Band => {
  const hasProgress =
    doneCount(items) > doneCount(b.items) || (openCount(b.items) === 0 && openCount(items) > 0) || b.lastProgressAt === null
  const next = { ...b, items, isDismissed: false }
  return hasProgress ? { ...next, lastProgressAt: now, warned: false } : next
}

const item = (prev: Item | undefined, status: ItemStatus, subject: string, activeForm: string | null, now: number): Item => ({
  status,
  subject,
  activeForm,
  // 実行中のまま更新されたときは経過時間を引き継ぐ
  startedAt: status === 'in_progress' ? (prev?.status === 'in_progress' ? prev.startedAt : now) : null,
})

export const setItem = (
  b: Band,
  id: string,
  change: { status?: ItemStatus; subject?: string; activeForm?: string },
  now: number,
): Band => {
  const prev = b.items[id]
  const next = item(
    prev,
    change.status ?? prev?.status ?? 'pending',
    change.subject ?? prev?.subject ?? id,
    change.activeForm ?? prev?.activeForm ?? null,
    now,
  )
  return withItems(b, { ...b.items, [id]: next }, now)
}

export const removeItem = (b: Band, id: string, now: number): Band => {
  const { [id]: _, ...rest } = b.items
  return withItems(b, rest, now)
}

// TodoWrite は一覧全体の差し替え。同じ位置の項目は経過時間を引き継ぐ
export const replaceTodos = (
  b: Band,
  todos: readonly { content: string; status: ItemStatus; activeForm: string }[],
  now: number,
): Band => {
  const items: Record<string, Item> = {}
  todos.forEach((t, i) => {
    const id = `todo-${i}`
    items[id] = item(b.items[id], t.status, t.content, t.activeForm, now)
  })
  return withItems(b, items, now)
}

export const itemLabel = (i: Item) => (i.status === 'in_progress' && i.activeForm ? i.activeForm : i.subject)

// ---- ターン・ツール・人 ----

export const turnStarted = (b: Band, now: number): Band => ({ ...b, turnActive: true, turnStartedAt: now })
export const turnEnded = (b: Band): Band => ({ ...b, turnActive: false, inFlight: 0 })

export const toolStarted = (b: Band, tool: string): Band => ({
  ...b,
  inFlight: b.inFlight + 1,
  asking: tool === 'AskUserQuestion' ? b.asking + 1 : b.asking,
})

export const toolEnded = (b: Band, tool: string): Band => ({
  ...b,
  inFlight: Math.max(0, b.inFlight - 1),
  asking: tool === 'AskUserQuestion' ? Math.max(0, b.asking - 1) : b.asking,
})

// 人が次のプロンプトを送った。15分の起点をやり直し、すべて完了していれば帯を畳む
export const humanStepped = (b: Band, now: number): Band => {
  const t = tally(b)
  return {
    ...b,
    warned: false,
    lastProgressAt: b.lastProgressAt === null ? null : now,
    isDismissed: b.isDismissed || (t.total > 0 && t.done === t.total),
  }
}

// ---- 表示用の計算 ----

export const tally = (b: Band) => {
  const items = Object.values(b.items)
  const done = items.filter(i => i.status === 'completed').length
  return {
    done,
    total: items.length,
    current: items.find(i => i.status === 'in_progress') ?? null,
    next: items.find(i => i.status === 'pending') ?? null,
  }
}

// 15分の詰まり（分）。ターンが動いていて、人への質問も、実行中のツール（長いビルドなど）も無いときだけ数える
export const idleMinutes = (b: Band, now: number): number | null => {
  const isWorking = b.turnActive && b.asking === 0 && b.inFlight === 0
  const since = Math.max(b.lastProgressAt ?? 0, b.turnStartedAt ?? 0)
  if (!isWorking || openCount(b.items) === 0 || since === 0 || now - since < IDLE_LIMIT_MS) return null
  return Math.floor((now - since) / 60000)
}

export const isVisible = (b: Band) => !b.isHidden && !b.isDismissed && Object.keys(b.items).length > 0

export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

// 進捗を▰▱で描く。タスクが多いときは幅に合わせて縮める
export const meter = (done: number, total: number, width: number) => {
  const cells = Math.max(1, Math.min(total, width))
  const filled = total === 0 ? 0 : Math.round((done / total) * cells)
  return { filled: '▰'.repeat(filled), empty: '▱'.repeat(cells - filled) }
}

// 値が変わっていなければ同じ参照を返す（書き込みと描き直しを省くため）
export const sameOr = <T,>(prev: T, next: T): T => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next)
