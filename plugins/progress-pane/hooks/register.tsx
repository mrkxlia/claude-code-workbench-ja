import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Ask, Item, ItemStatus, Watch } from '../types'
import { applyResponse, claimOf, isPlanPage, parsePlan } from './plan'

// 連続でエラーになったツール呼び出しがこの回数に達したら「詰まり」とみなす
const STREAK_LIMIT = 3
// 未完了のタスクがあるのに、この時間タスクが1つも完了しなければ「詰まり」とみなす
const IDLE_LIMIT_MS = 15 * 60 * 1000
const FAILURES_KEPT = 5
const PANE = 'progress'

const EMPTY: Watch = { items: {}, plan: null, lastProgressAt: null, streak: 0, failures: [], warned: false }
const watch = atom({ plugin: 'progress-pane', key: 'watch' } as const, EMPTY)

const doneCount = (w: Watch) => Object.values(w.items).filter(i => i.status === 'completed').length

// タスクの集合を差し替え、完了数が増えていれば進展として時計を戻す
const withItems = (w: Watch, items: Record<string, Item>, now: number): Watch => {
  const next = { ...w, items }
  const hasProgress = doneCount(next) > doneCount(w) || w.lastProgressAt === null
  return hasProgress ? { ...next, lastProgressAt: now, warned: false } : next
}

const item = (status: ItemStatus, label: string): Item => ({ status, label, claim: claimOf(label) })

const signals = (w: Watch, now: number) => {
  const items = Object.values(w.items)
  const open = items.filter(i => i.status !== 'completed').length
  const idleMin = open > 0 && w.lastProgressAt !== null ? Math.floor((now - w.lastProgressAt) / 60000) : 0
  const asks = w.plan?.asks ?? []
  return {
    total: items.length,
    done: items.length - open,
    current: items.find(i => i.status === 'in_progress')?.label ?? null,
    isFailing: w.streak >= STREAK_LIMIT,
    isIdle: idleMin * 60000 >= IDLE_LIMIT_MS,
    idleMin,
    waitingAsks: w.plan && !w.plan.isAnswered ? asks.length : 0,
    unopened: asks.filter(a => a.state === 'unopened').length,
  }
}

// いまどの段階か: 計画の回答待ち → 回答済み → 実装中 → 完了
const phase = (w: Watch, now: number) => {
  const s = signals(w, now)
  if (s.total > 0) return s.done === s.total ? '完了' : `実装中 ${s.done}/${s.total}`
  if (w.plan && !w.plan.isAnswered) return `計画の回答待ち（決定 ${s.waitingAsks} 件）`
  if (w.plan) return '計画に回答済み・実装の準備中'
  return null
}

const statusText = (w: Watch, now: number) => {
  const s = signals(w, now)
  const head = phase(w, now)
  if (head === null && !s.isFailing) return undefined
  const parts = head === null ? [] : [head]
  if (s.current) parts.push(`▶ ${s.current.slice(0, 40)}`)
  if (s.unopened > 0) parts.push(`⚠ 未確認の決定 ${s.unopened}`)
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
        ? `progress-pane: ツールが ${w.streak} 回続けて失敗しています。方針を見直すか止めてください`
        : `progress-pane: ${s.idleMin} 分タスクが完了していません`,
    )
  }
  return w
}

// 頼まれずに開くので、端末が狭いときは本体が幅が空くまで待たせる（それで良い）
const openPane = ($: EngineInterface) => $.ui.open({ id: PANE, title: '進捗' })

type Line = { key: string; text: string; color?: string; dim?: boolean; bold?: boolean }

const ICON: Record<ItemStatus, string> = { completed: '✔', in_progress: '▶', pending: '・' }
const ASK_NOTE: Record<Ask['state'], string> = {
  open: '回答待ち',
  changed: '変更して回答',
  kept: '既定のまま（確認済み）',
  unopened: '⚠ 開かずに既定のまま — チャットで確認を',
}

const itemLine = (id: string, i: Item, indent: string): Line => ({
  key: `item-${id}`,
  text: `${indent}${ICON[i.status]} ${i.label}`,
  dim: i.status === 'completed',
  color: i.status === 'in_progress' ? 'claude' : undefined,
})

const askLine = (a: Ask): Line => ({
  key: `ask-${a.id}`,
  text: `   ? ${a.question}${a.answer ? ` → ${a.answer}` : ''}（${ASK_NOTE[a.state]}）`,
  color: a.state === 'unopened' ? 'warning' : a.state === 'open' ? 'suggestion' : undefined,
  dim: a.state === 'kept' || a.state === 'changed',
})

// 計画の主張ごとに、その主張の決定とタスクを並べる。番号の無いタスクは最後にまとめる
const lines = (w: Watch, now: number): Line[] => {
  const s = signals(w, now)
  const out: Line[] = []
  const head = phase(w, now)
  out.push({ key: 'phase', text: head ?? '計画もタスクもまだありません（/html-plan やタスクリストで始まります）', bold: true })

  const entries = Object.entries(w.items)
  const used = new Set<string>()
  if (w.plan) {
    out.push({ key: 'title', text: `計画: ${w.plan.title || w.plan.path}`, color: 'planMode' })
    for (const c of w.plan.claims) {
      const mine = entries.filter(([, i]) => i.claim === c.no || i.claim?.startsWith(`${c.no}.`))
      const done = mine.filter(([, i]) => i.status === 'completed').length
      const tally = mine.length > 0 ? ` [${done}/${mine.length}]` : ''
      out.push({ key: `claim-${c.no}`, text: `${c.no}. ${c.text}${tally}`, dim: mine.length > 0 && done === mine.length })
      for (const a of w.plan.asks.filter(a => a.no === c.no || a.no.startsWith(`${c.no}.`))) out.push(askLine(a))
      for (const [id, i] of mine) {
        used.add(id)
        out.push(itemLine(id, i, '   '))
      }
    }
  }
  // aux（shared・scope）の主張に置かれた決定は番号を持たないので、ここにまとめる
  const loose = w.plan?.asks.filter(a => !w.plan?.claims.some(c => a.no === c.no || a.no.startsWith(`${c.no}.`))) ?? []
  if (loose.length > 0) out.push({ key: 'loose', text: '共通の決定', bold: true })
  for (const a of loose) out.push(askLine(a))

  const rest = entries.filter(([id]) => !used.has(id))
  if (rest.length > 0) {
    if (w.plan) out.push({ key: 'rest', text: 'その他のタスク', bold: true })
    for (const [id, i] of rest) out.push(itemLine(id, i, w.plan ? '   ' : ''))
  }

  if (s.isFailing || s.isIdle) {
    out.push({ key: 'stuck', text: '詰まりの兆候（判断は人間がします）', color: 'warning', bold: true })
    if (s.isFailing) out.push({ key: 'stuck-fail', text: `   ツールが ${w.streak} 回続けて失敗`, color: 'warning' })
    if (s.isIdle) out.push({ key: 'stuck-idle', text: `   ${s.idleMin} 分タスクが完了していない`, color: 'warning' })
  }
  if (w.failures.length > 0) {
    out.push({ key: 'fails', text: '直近の失敗', dim: true })
    w.failures.slice(-3).forEach((f, n) => out.push({ key: `fail-${n}`, text: `   ${f.tool}: ${f.text}`, dim: true }))
  }
  return out
}

// 各フックの .catch は fail-open: 観測だけのフックなので、自分が壊れても作業は止めない
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'progress', description: '計画・タスク・詰まりの進捗ペインを開く（progress-pane）' })
    return next(e)
  })

  on('command.run', { command: 'progress' }, async $ => {
    await $.ui.open({ id: PANE, title: '進捗' })
    return { text: '進捗ペインを開きました。' }
  })

  on('prompt.submit', async ($, e, next) => {
    // html-plan の Respond を貼り戻したら決定の状態を反映する。人が介入したら詰まり判定もやり直す
    await refresh($, (w, now) => {
      const plan = w.plan ? applyResponse(w.plan, e.text) ?? w.plan : null
      return { ...w, plan, streak: 0, warned: false, lastProgressAt: w.lastProgressAt === null ? null : now }
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  // html-plan のページを書いた・直したら計画を読み直す（直したら回答はやり直し）
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true && isPlanPage(e.content)) {
      await refresh($, w => ({ ...w, plan: parsePlan(e.file_path, e.content) }))
      void openPane($)
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)
    const path = (await read($, watch)).plan?.path
    if (ran.deny === undefined && ran.isError !== true && path === e.file_path) {
      const html = await $.fs.read(path)
      if (typeof html === 'string' && isPlanPage(html)) {
        await refresh($, w => ({ ...w, plan: parsePlan(path, html) }))
      }
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const items: Record<string, Item> = {}
      e.todos.forEach((t, i) => {
        items[`todo-${i}`] = item(t.status, t.status === 'in_progress' ? t.activeForm : t.content)
      })
      const w = await refresh($, (w, now) => withItems(w, items, now))
      if (Object.keys(w.items).length > 0) void openPane($)
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const id = ran.result.task.id
      await refresh($, (w, now) => withItems(w, { ...w.items, [id]: item('pending', e.subject) }, now))
      void openPane($)
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
        const subject = e.subject ?? prev?.label ?? e.taskId
        // 実行中は activeForm を見せるが、主張番号は件名から読む
        const shown = status === 'in_progress' && e.activeForm ? e.activeForm : subject
        const updated: Item = { status, label: shown, claim: claimOf(subject) ?? prev?.claim ?? null }
        return withItems(w, { ...rest, [e.taskId]: updated }, now)
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

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const all = lines(await read($, watch), now)
    const room = Math.max(3, (e.viewport?.rows ?? 24) - 2)
    const shown = all.length > room ? [...all.slice(0, room - 1), { key: 'more', text: `…ほか ${all.length - room + 1} 行`, dim: true }] : all
    return (
      <Box flexDirection="column">
        {shown.map(l => (
          <Text key={l.key} color={l.color} dimColor={l.dim} bold={l.bold} wrap="truncate-end">
            {l.text}
          </Text>
        ))}
      </Box>
    )
  })
}

