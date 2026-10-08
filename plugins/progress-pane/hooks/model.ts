// 状態の更新と、表示に使う値の計算。エンジンに触れない純粋な関数だけを置く
import type { AgentInfo } from 'claude-code'

import type { Failure, Item, ItemStatus, Loop, Watch } from '../types'

// 連続でエラーになったツール呼び出しがこの回数に達したら「詰まり」とみなす（ループごとに数える）
export const STREAK_LIMIT = 3
// 未完了のタスクがあるのに、この時間タスクが1つも完了しなければ「詰まり」とみなす
export const IDLE_LIMIT_MS = 15 * 60 * 1000
export const MAIN = 'main'
const FAILURES_KEPT = 20
const MINUTES_KEPT = 60

export const EMPTY: Watch = {
  items: {},
  lastProgressAt: null,
  failures: [],
  warned: false,
  loops: {},
  minutes: {},
  toolCounts: {},
  asking: 0,
  usage: { startedAt: null, contextPercent: null, usd: null },
}

const isEnded = (s: Loop['status']) => s === 'completed' || s === 'failed' || s === 'killed'

export const newLoop = (id: string, now: number): Loop => ({
  id,
  type: id === MAIN ? 'メイン' : '?',
  description: '',
  parentId: null,
  status: id === MAIN ? 'running' : 'unknown',
  startedAt: now,
  endedAt: null,
  tools: 0,
  errors: 0,
  streak: 0,
  current: null,
})

const loopOf = (w: Watch, id: string, now: number) => w.loops[id] ?? newLoop(id, now)

// ---- タスク ----

const doneCount = (w: Watch) => Object.values(w.items).filter(i => i.status === 'completed').length

export const withItems = (w: Watch, items: Record<string, Item>, now: number): Watch => {
  const next = { ...w, items }
  const hasProgress = doneCount(next) > doneCount(w) || w.lastProgressAt === null
  return hasProgress ? { ...next, lastProgressAt: now, warned: false } : next
}

export const setItem = (w: Watch, id: string, status: ItemStatus, label: string, now: number): Watch => {
  const prev = w.items[id]
  const startedAt = status === 'in_progress' ? (prev?.status === 'in_progress' ? prev.startedAt : now) : null
  return withItems(w, { ...w.items, [id]: { status, label, startedAt } }, now)
}

export const removeItem = (w: Watch, id: string, now: number): Watch => {
  const { [id]: _, ...rest } = w.items
  return withItems(w, rest, now)
}

// ---- ツール呼び出し ----

export const toolStarted = (w: Watch, loop: string, tool: string, now: number): Watch => ({
  ...w,
  loops: { ...w.loops, [loop]: { ...loopOf(w, loop, now), current: tool } },
  asking: tool === 'AskUserQuestion' ? w.asking + 1 : w.asking,
})

export const toolEnded = (
  w: Watch,
  loop: string,
  tool: string,
  outcome: { isError: boolean; text: string } | null,
  now: number,
): Watch => {
  const l = loopOf(w, loop, now)
  const asking = tool === 'AskUserQuestion' ? Math.max(0, w.asking - 1) : w.asking
  // null は権限・フックによる拒否。作業の失敗ではないので数えない
  if (outcome === null) return { ...w, asking, loops: { ...w.loops, [loop]: { ...l, current: null } } }

  const minute = String(Math.floor(now / 60000))
  const [ok, err] = w.minutes[minute] ?? [0, 0]
  const minutes = Object.fromEntries(
    Object.entries({ ...w.minutes, [minute]: outcome.isError ? [ok, err + 1] : [ok + 1, err] }).filter(
      ([k]) => Number(k) > Number(minute) - MINUTES_KEPT,
    ),
  ) as Watch['minutes']
  const failure: Failure = { tool, text: outcome.text.replace(/\s+/g, ' ').slice(0, 120), at: now, loop }
  const nextLoop: Loop = {
    ...l,
    current: null,
    tools: l.tools + 1,
    errors: l.errors + (outcome.isError ? 1 : 0),
    streak: outcome.isError ? l.streak + 1 : 0,
  }
  const loops = { ...w.loops, [loop]: nextLoop }
  return {
    ...w,
    asking,
    minutes,
    loops,
    toolCounts: { ...w.toolCounts, [tool]: (w.toolCounts[tool] ?? 0) + 1 },
    failures: outcome.isError ? [...w.failures, failure].slice(-FAILURES_KEPT) : w.failures,
    // 詰まりが解けたら次の詰まりでまた知らせる
    warned: stuckOf({ ...w, loops }, now).length > 0 ? w.warned : false,
  }
}

// 人が介入したら、その時点を起点に詰まり判定をやり直す
export const humanStepped = (w: Watch, now: number): Watch => ({
  ...w,
  warned: false,
  lastProgressAt: w.lastProgressAt === null ? null : now,
  loops: Object.fromEntries(Object.entries(w.loops).map(([k, l]) => [k, { ...l, streak: 0 }])),
})

// ---- エージェント一覧との同期 ----

export const syncAgents = (w: Watch, list: readonly AgentInfo[], now: number): Watch => {
  const loops = { ...w.loops }
  for (const a of list) {
    const l = loops[a.id] ?? newLoop(a.id, now)
    const endedAt = isEnded(a.status) ? (l.endedAt ?? now) : null
    loops[a.id] = {
      ...l,
      type: a.type,
      description: a.description || a.name || '',
      parentId: a.parentId ?? null,
      status: a.status,
      endedAt,
    }
  }
  // 一覧から消えたループは最後に見た状態のまま残し、走っていたものは終わったとみなす
  for (const [id, l] of Object.entries(loops)) {
    if (id !== MAIN && !list.some(a => a.id === id) && !isEnded(l.status) && l.status !== 'unknown') {
      loops[id] = { ...l, status: 'completed', endedAt: l.endedAt ?? now, current: null }
    }
  }
  return { ...w, loops }
}

// ---- 表示用の計算 ----

export type Stuck = { kind: 'failing'; loop: Loop } | { kind: 'idle'; minutes: number }

export const stuckOf = (w: Watch, now: number): Stuck[] => {
  const out: Stuck[] = Object.values(w.loops)
    .filter(l => l.streak >= STREAK_LIMIT)
    .map(loop => ({ kind: 'failing' as const, loop }))
  const open = Object.values(w.items).some(i => i.status !== 'completed')
  if (open && w.lastProgressAt !== null && now - w.lastProgressAt >= IDLE_LIMIT_MS) {
    out.push({ kind: 'idle', minutes: Math.floor((now - w.lastProgressAt) / 60000) })
  }
  return out
}

export const taskTally = (w: Watch) => {
  const items = Object.values(w.items)
  const done = items.filter(i => i.status === 'completed').length
  return { done, total: items.length, current: items.find(i => i.status === 'in_progress') ?? null }
}

export const agentTally = (w: Watch) => {
  const agents = Object.values(w.loops).filter(l => l.id !== MAIN)
  const count = (pred: (l: Loop) => boolean) => agents.filter(pred).length
  return {
    running: count(l => l.status === 'running' || l.status === 'pending' || l.status === 'unknown'),
    waiting: count(l => l.status === 'waiting' || l.status === 'idle'),
    done: count(l => l.status === 'completed'),
    failed: count(l => l.status === 'failed' || l.status === 'killed'),
  }
}

// 直近 n 分の [成功, 失敗]（古い順）
export const activity = (w: Watch, now: number, n: number): [number, number][] => {
  const end = Math.floor(now / 60000)
  return Array.from({ length: n }, (_, i) => w.minutes[String(end - n + 1 + i)] ?? [0, 0])
}

export type TreeRow = { loop: Loop; prefix: string }

// メインを根に、parentId でつないだ木を深さ優先で並べる（罫線つきの接頭辞を付ける）
export const agentTree = (w: Watch, now: number): TreeRow[] => {
  const loops = Object.values(w.loops)
  const main = w.loops[MAIN] ?? newLoop(MAIN, now)
  const known = new Set(loops.map(l => l.id))
  const childrenOf = (id: string) =>
    loops
      .filter(l => l.id !== MAIN && (l.parentId ?? MAIN) === id)
      .concat(id === MAIN ? loops.filter(l => l.parentId !== null && !known.has(l.parentId)) : [])
      .sort((a, b) => a.startedAt - b.startedAt)
  const rows: TreeRow[] = [{ loop: main, prefix: '' }]
  const walk = (id: string, indent: string, depth: number) => {
    const kids = childrenOf(id)
    kids.forEach((k, i) => {
      const isLast = i === kids.length - 1
      rows.push({ loop: k, prefix: `${indent}${isLast ? '└─ ' : '├─ '}` })
      if (depth < 8) walk(k.id, `${indent}${isLast ? '   ' : '│  '}`, depth + 1)
    })
  }
  walk(MAIN, '', 0)
  return rows
}

export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

export const bar = (done: number, total: number, width: number) => {
  const filled = total === 0 ? 0 : Math.round((done / total) * width)
  return { filled: '█'.repeat(filled), empty: '░'.repeat(width - filled) }
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export const toBase64 = (bytes: Uint8Array) => {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const [a = 0, b = 0, c = 0] = [bytes[i], bytes[i + 1], bytes[i + 2]]
    const n = (a << 16) | (b << 8) | c
    out += BASE64[(n >> 18) & 63]! + BASE64[(n >> 12) & 63]!
    out += i + 1 < bytes.length ? BASE64[(n >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? BASE64[n & 63]! : '='
  }
  return out
}

const BLOCKS = ' ▁▂▃▄▅▆▇█'
const OK_RGB = 0x4caf50
const ERR_RGB = 0xe5534b
const DEFAULT_RGB = 0x01000000

// ツール実行の柱グラフを Raster のセル（[文字, 前景, 背景] の u32 三つ組）にする。失敗が1件でもある分は赤
export const activityCells = (data: [number, number][], rows: number) => {
  const max = Math.max(1, ...data.map(([ok, err]) => ok + err))
  const words = new Uint32Array(data.length * rows * 3)
  data.forEach(([ok, err], x) => {
    const eighths = Math.round(((ok + err) / max) * rows * 8)
    for (let y = 0; y < rows; y++) {
      const fromBottom = rows - 1 - y
      const level = Math.min(8, Math.max(0, eighths - fromBottom * 8))
      const at = (y * data.length + x) * 3
      words[at] = BLOCKS.codePointAt(level) ?? 0x20
      words[at + 1] = err > 0 ? ERR_RGB : OK_RGB
      words[at + 2] = DEFAULT_RGB
    }
  })
  return toBase64(new Uint8Array(words.buffer))
}

// 同じグラフをデスクトップ・モバイル用の SVG にする
export const activitySvg = (data: [number, number][], width: number, height: number) => {
  const max = Math.max(1, ...data.map(([ok, err]) => ok + err))
  const w = width / data.length
  const rects = data
    .map(([ok, err], x) => {
      const h = ((ok + err) / max) * (height - 2)
      const fill = err > 0 ? '#e5534b' : '#4caf50'
      return h > 0 ? `<rect x="${(x * w + 1).toFixed(1)}" y="${(height - h).toFixed(1)}" width="${Math.max(1, w - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="1" fill="${fill}"/>` : ''
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rects}</svg>`
}

// VS Code 用の1行の柱グラフ
export const sparkline = (data: [number, number][]) => {
  const max = Math.max(1, ...data.map(([ok, err]) => ok + err))
  return data.map(([ok, err]) => BLOCKS[Math.round(((ok + err) / max) * 8)] ?? ' ').join('')
}
