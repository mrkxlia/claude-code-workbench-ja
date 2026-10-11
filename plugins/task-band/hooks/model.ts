// 状態の更新と、帯に出す値の計算。エンジンに触れない純粋な関数だけを置く
import type { BuiltinToolInputs } from 'claude-code'

import type { Activity, Band, Item, ItemStatus, Pipeline } from '../types'

// メインのターンが動いていて、未完了のタスクがあるのに、この時間タスクが1つも完了しなければ「詰まり」とみなす
const IDLE_LIMIT_MS = 15 * 60 * 1000

export const EMPTY: Band = { items: {}, idleSince: null, warned: false, isDismissed: false, isHidden: false }
export const IDLE: Activity = { turnActive: false, inFlight: 0 }

type Todo = BuiltinToolInputs['TodoWrite']['todos'][number]

export const tally = (items: Record<string, Item>) => {
  const all = Object.values(items)
  const done = all.filter(i => i.status === 'completed').length
  return {
    done,
    total: all.length,
    open: all.length - done,
    current: all.find(i => i.status === 'in_progress') ?? null,
    next: all.find(i => i.status === 'pending') ?? null,
  }
}

// 15分の時計を今から数え直す（進捗・ターンの開始・人のプロンプト）
export const restartClock = (b: Band, now: number): Band => ({ ...b, idleSince: now, warned: false })

// ---- タスク ----

// タスクの集合を差し替える。完了が増えたとき、または未完了が0件から増えたとき（新しい仕事の始まり）に時計を戻す。
// タスクが動いたら、畳んだ帯をまた出す
export const withItems = (b: Band, items: Record<string, Item>, now: number): Band => {
  const [before, after] = [tally(b.items), tally(items)]
  const next = { ...b, items, isDismissed: false }
  return after.done > before.done || (before.open === 0 && after.open > 0) ? restartClock(next, now) : next
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
export const replaceTodos = (b: Band, todos: readonly Todo[], now: number): Band => {
  const items: Record<string, Item> = {}
  todos.forEach((t, i) => {
    const id = `todo-${i}`
    items[id] = item(b.items[id], t.status, t.content, t.activeForm, now)
  })
  return withItems(b, items, now)
}

export const itemLabel = (i: Item) => (i.status === 'in_progress' && i.activeForm ? i.activeForm : i.subject)

// 人が次のプロンプトを送った。時計を戻し、すべて完了していれば帯を畳む
export const humanStepped = (b: Band, now: number): Band => {
  const t = tally(b.items)
  return { ...restartClock(b, now), isDismissed: b.isDismissed || (t.total > 0 && t.open === 0) }
}

// ---- 表示用の計算 ----

// 15分の詰まり（分）。ターンが動いていて、実行中のツール（長いビルド・質問）が無く、未完了があるときだけ数える
export const idleMinutes = (b: Band, a: Activity, now: number): number | null => {
  if (!a.turnActive || a.inFlight > 0 || b.idleSince === null || tally(b.items).open === 0) return null
  return now - b.idleSince >= IDLE_LIMIT_MS ? Math.floor((now - b.idleSince) / 60000) : null
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

// ---- task-pipeline の status.md ----

export const PIPELINE_DIR = 'docs/task-pipeline'

const CHECK = /^\s*- \[( |x|X)\] (.+)$/

// status.md を読み、進行中なら Pipeline を返す（チェック行が無い・全部済みなら null）。
// 未チェック行の 🛑 は「そのフェーズの終わりにある関門」なので、その行の成果物（「brief.md 保存」）が
// 同じフォルダにそろっているときだけ承認待ちとみなし、そうでなければ次の関門として予告する
export const parseStatus = (text: string, slug: string, files: ReadonlySet<string>): Omit<Pipeline, 'others'> | null => {
  const lines = text.split('\n').flatMap(l => {
    const m = CHECK.exec(l)
    return m ? [{ done: m[1] !== ' ', text: m[2]!.trim() }] : []
  })
  const current = lines.find(l => !l.done)
  if (!current) return null
  const phase = /Phase\s*(\d+)/.exec(current.text)
  const stop = current.text.includes('🛑') ? current.text.split('🛑')[1]!.split(/[（(]/)[0]!.trim() : null
  const saved = [...current.text.matchAll(/(\S+\.md) 保存/g)].map(x => x[1]!)
  const isWaiting = stop !== null && saved.length > 0 && saved.every(f => files.has(f))
  const rejects = /差し戻し\s*(\d+\s*\/\s*\d+)/.exec(current.text)
  return {
    slug,
    phase: phase ? `Phase${phase[1]}` : current.text.slice(0, 12),
    done: lines.length - lines.filter(l => !l.done).length,
    total: lines.length,
    waiting: isWaiting ? stop : null,
    gate: isWaiting ? null : stop,
    rejects: rejects ? rejects[1]!.replace(/\s/g, '') : null,
  }
}

export const pipelineLabel = (p: Pipeline) =>
  `◆ ${p.slug} ${p.phase}${p.rejects ? ` 差し戻し${p.rejects}` : ''}${p.others > 0 ? ` (+${p.others})` : ''}`
