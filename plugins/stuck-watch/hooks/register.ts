import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Item, ItemStatus, Watch } from '../types'

// 連続でエラーになったツール呼び出しがこの回数に達したら「詰まり」とみなす
const STREAK_LIMIT = 3
// 未完了のタスクがあるのに、この時間タスクが1つも完了しなければ「詰まり」とみなす
const IDLE_LIMIT_MS = 15 * 60 * 1000
const FAILURES_KEPT = 5

const EMPTY: Watch = { items: {}, lastProgressAt: null, streak: 0, failures: [], warned: false }
const watch = atom({ plugin: 'stuck-watch', key: 'watch' } as const, EMPTY)

const doneCount = (w: Watch) => Object.values(w.items).filter(i => i.status === 'completed').length

// タスクの集合を差し替え、完了数が増えていれば進展として時計を戻す
const withItems = (w: Watch, items: Record<string, Item>, now: number): Watch => {
  const next = { ...w, items }
  const hasProgress = doneCount(next) > doneCount(w) || w.lastProgressAt === null
  return hasProgress ? { ...next, lastProgressAt: now, warned: false } : next
}

const signals = (w: Watch, now: number) => {
  const items = Object.values(w.items)
  const hasOpen = items.some(i => i.status !== 'completed')
  const idleMin =
    hasOpen && w.lastProgressAt !== null ? Math.floor((now - w.lastProgressAt) / 60000) : 0
  return {
    total: items.length,
    done: items.length - items.filter(i => i.status !== 'completed').length,
    current: items.find(i => i.status === 'in_progress')?.label ?? null,
    isFailing: w.streak >= STREAK_LIMIT,
    isIdle: idleMin * 60000 >= IDLE_LIMIT_MS,
    idleMin,
  }
}

const statusText = (w: Watch, now: number) => {
  const s = signals(w, now)
  if (s.total === 0 && !s.isFailing) return undefined
  const parts = s.total > 0 ? [`進捗 ${s.done}/${s.total}`] : []
  if (s.current) parts.push(`▶ ${s.current.slice(0, 40)}`)
  if (s.isFailing) parts.push(`⚠ 連続失敗 ${w.streak}`)
  if (s.isIdle) parts.push(`⚠ ${s.idleMin}分 完了なし`)
  return parts.join(' · ')
}

// 状態の更新・ステータスライン・初回だけのトーストをまとめて行う
const refresh = async ($: EngineInterface, fn: (w: Watch, now: number) => Watch) => {
  const now = await $.clock.now()
  const w = await update($, watch, prev => fn(prev, now))
  $.ui.status(statusText(w, now))
  const s = signals(w, now)
  if ((s.isFailing || s.isIdle) && !w.warned) {
    await update($, watch, prev => ({ ...prev, warned: true }))
    $.ui.toast(
      s.isFailing
        ? `stuck-watch: ツールが ${w.streak} 回続けて失敗しています。方針を見直すか止めてください`
        : `stuck-watch: ${s.idleMin} 分タスクが完了していません`,
    )
  }
}

// 各フックの .catch は fail-open: 観測だけのフックなので、自分が壊れても作業は止めない
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'stuck',
      description: '直近の失敗と詰まりの兆候を表示する（stuck-watch）',
    })
    return next(e)
  })

  on('command.run', { command: 'stuck' }, async $ => {
    const now = await $.clock.now()
    const w = await read($, watch)
    const s = signals(w, now)
    const lines = [
      statusText(w, now) ?? '追跡中のタスクも失敗もありません。',
      ...(w.failures.length > 0 ? ['', '直近の失敗:'] : []),
      ...w.failures.map(f => `- ${f.tool}: ${f.text}`),
    ]
    if (s.isFailing || s.isIdle) lines.push('', '判断は人間がします。続行・方針変更・中断を指示してください。')
    return { text: lines.join('\n') }
  })

  on('prompt.submit', async ($, e, next) => {
    // 人が介入したら、その時点を起点に詰まり判定をやり直す
    await refresh($, (w, now) => ({
      ...w,
      streak: 0,
      warned: false,
      lastProgressAt: w.lastProgressAt === null ? null : now,
    }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const items: Record<string, Item> = {}
      e.todos.forEach((t, i) => {
        items[`todo-${i}`] = { status: t.status, label: t.status === 'in_progress' ? t.activeForm : t.content }
      })
      await refresh($, (w, now) => withItems(w, items, now))
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const id = ran.result.task.id
      const item: Item = { status: 'pending', label: e.activeForm ?? e.subject }
      await refresh($, (w, now) => withItems(w, { ...w.items, [id]: item }, now))
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true && ran.result.success) {
      await refresh($, (w, now) => {
        const { [e.taskId]: prev, ...rest } = w.items
        if (e.status === 'deleted') return withItems(w, rest, now)
        const status: ItemStatus = e.status ?? prev?.status ?? 'pending'
        const label = e.activeForm ?? e.subject ?? prev?.label ?? e.taskId
        return withItems(w, { ...rest, [e.taskId]: { status, label } }, now)
      })
    }
    return ran
  }).catch(($, e, next) => next(e))

  // すべてのツール呼び出しの成否を数える（deny は権限・フックの拒否なので失敗に数えない）
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined) return ran
    await refresh($, (w, now) =>
      ran.isError === true
        ? {
            ...w,
            streak: w.streak + 1,
            failures: [
              ...w.failures,
              { tool: e.tool, text: (ran.text ?? '').replace(/\s+/g, ' ').slice(0, 80), at: now },
            ].slice(-FAILURES_KEPT),
          }
        : { ...w, streak: 0, warned: signals(w, now).isIdle ? w.warned : false },
    )
    return ran
  }).catch(($, e, next) => next(e))
}
