import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Band } from '../types'
import {
  EMPTY,
  clock,
  humanStepped,
  idleMinutes,
  isVisible,
  itemLabel,
  meter,
  removeItem,
  replaceTodos,
  sameOr,
  setItem,
  tally,
  toolEnded,
  toolStarted,
  turnEnded,
  turnStarted,
} from './model'

const TICK_MS = 1000

const band = atom({ plugin: 'task-band', key: 'band' } as const, EMPTY)

// 状態を更新し、15分の詰まりに初めて入ったときだけトーストを出す。
// 出すかどうかは同じ update の中で決める（並列のツール呼び出しで何度も鳴らさないため）
const refresh = async ($: EngineInterface, fn: (b: Band, now: number) => Band) => {
  const now = await $.clock.now()
  let minutes: number | null = null
  const b = await update($, band, prev => {
    const next = sameOr(prev, fn(prev, now))
    minutes = next.warned ? null : idleMinutes(next, now)
    return minutes === null ? next : { ...next, warned: true }
  })
  if (minutes !== null) $.ui.toast(`task-band: ${minutes} 分タスクが完了していません`)
  return b
}

// 1秒ごと: 実行中のタスクの経過時間を進め、ツール呼び出しが止まっていても15分の詰まりに気付く
const tick = async ($: EngineInterface) => {
  const now = await $.clock.now()
  const b = await read($, band)
  if (!b.warned && idleMinutes(b, now) !== null) await refresh($, x => x)
  if (isVisible(b) && (b.turnActive || tally(b).current !== null)) $.ui.invalidate('ui.render')
}

// 人の操作で入ったプロンプトだけを「介入」とみなす（バックグラウンドの完了通知や /loop は数えない）
const isHuman = (kind: string) => kind === 'composer' || kind === 'bridge'

const listText = (b: Band) => {
  const items = Object.values(b.items)
  if (items.length === 0) return 'タスクはまだありません（現行モデルでは CLAUDE_CODE_ENABLE_TODO_TOOLS=1 が必要です）。'
  const t = tally(b)
  return [
    `タスク ${t.done}/${t.total}`,
    ...items.map(i => `${i.status === 'completed' ? '✔' : i.status === 'in_progress' ? '▶' : '○'} ${itemLabel(i)}`),
  ].join('\n')
}

// 各フックの .catch は fail-open: 観測だけのフックなので、自分が壊れても作業は止めない
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'task-band',
      description: 'プロンプトの上のタスク進捗の帯: on / off で表示を切り替え、list で全タスクを表示',
    })
    $.clock.every(TICK_MS, () => void tick($).catch(() => undefined))
    return next(e)
  })

  // /clear や resume で会話が替わったら、前の会話のタスクを捨てる（表示の on/off は残す）
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear' || e.reason === 'resume') await update($, band, b => ({ ...EMPTY, isHidden: b.isHidden }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'task-band' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === 'off' || arg === 'on') {
      await update($, band, b => ({ ...b, isHidden: arg === 'off' }))
      return { text: arg === 'off' ? 'タスクの帯を隠しました（/task-band on で戻します）。' : 'タスクの帯を表示します。' }
    }
    return { text: listText(await read($, band)) }
  })

  on('prompt.submit', async ($, e, next) => {
    if (isHuman(e.origin.kind)) await refresh($, (b, now) => humanStepped(b, now))
    return next(e)
  }).catch(($, e, next) => next(e))

  // turn.start はメインのターンだけ。turn.complete はサブエージェントのターンにも来るので agentId で除く
  on('turn.start', async ($, e, next) => {
    await refresh($, (b, now) => turnStarted(b, now))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) await refresh($, b => turnEnded(b))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) await refresh($, (b, now) => replaceTodos(b, e.todos, now))
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const id = ran.result.task.id
      await refresh($, (b, now) =>
        setItem(b, id, { status: 'pending', subject: e.subject, ...(e.activeForm ? { activeForm: e.activeForm } : {}) }, now),
      )
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true && ran.result.success) {
      await refresh($, (b, now) =>
        e.status === 'deleted'
          ? removeItem(b, e.taskId, now)
          : setItem(
              b,
              e.taskId,
              {
                ...(e.status ? { status: e.status } : {}),
                ...(e.subject ? { subject: e.subject } : {}),
                ...(e.activeForm ? { activeForm: e.activeForm } : {}),
              },
              now,
            ),
      )
    }
    return ran
  }).catch(($, e, next) => next(e))

  // メインのループで実行中のツールと質問を数える（長いビルドや質問の間は詰まりと数えない）。
  // 中断や例外で next が終わらなくても必ず戻す
  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    await refresh($, b => toolStarted(b, e.tool))
    try {
      return await next(e)
    } finally {
      await refresh($, b => toolEnded(b, e.tool))
    }
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const b = await read($, band)
    if (e.props.hasSurvey || !isVisible(b)) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const t = tally(b)
    const idle = idleMinutes(b, now)
    const columns = e.props.bodyColumns || 80
    const m = meter(t.done, t.total, columns < 60 ? 8 : 16)

    if (t.done === t.total) {
      return (
        <Box>
          <Text color="success">{`${m.filled} ✔ ${t.done}/${t.total} 完了`}</Text>
        </Box>
      )
    }

    const label = t.current ? itemLabel(t.current) : null
    const elapsed = t.current?.startedAt == null ? '' : `  ${clock(now - t.current.startedAt)}`
    const nextUp = columns >= 90 && t.next && t.current ? `  次: ${t.next.subject}` : ''
    return (
      <Box flexDirection="row">
        <Text wrap="truncate-end">
          <Text color={idle === null ? 'success' : 'warning'}>{m.filled}</Text>
          <Text dimColor>{m.empty}</Text>
          <Text bold>{` ${t.done}/${t.total}`}</Text>
          {label === null ? (
            <Text dimColor>{'  実行中のタスクなし'}</Text>
          ) : (
            <Text color="claude">{`  ▶ ${label}${elapsed}`}</Text>
          )}
          <Text dimColor>{nextUp}</Text>
          {idle === null ? '' : <Text color="warning" bold>{`  ⚠ ${idle}分 完了なし`}</Text>}
        </Text>
      </Box>
    )
  })
}
