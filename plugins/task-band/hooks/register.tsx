import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Activity, Band, Pipeline } from '../types'
import {
  EMPTY,
  IDLE,
  PIPELINE_DIR,
  clock,
  humanStepped,
  idleMinutes,
  isVisible,
  itemLabel,
  meter,
  parseStatus,
  pipelineLabel,
  removeItem,
  replaceTodos,
  restartClock,
  setItem,
  tally,
} from './model'

const TICK_MS = 1000

const band = atom({ plugin: 'task-band', key: 'band' } as const, EMPTY)
const activity = atom({ plugin: 'task-band', key: 'activity' } as const, IDLE)
const pipeline = atom({ plugin: 'task-band', key: 'pipeline' } as const, null as Pipeline | null)

// docs/task-pipeline/*/status.md を読み、進行中のうち一番新しく更新された1件を帯に載せる。
// 読むだけで書かない。フォルダが無いリポジトリでは何もしない
const scanPipelines = async ($: EngineInterface) => {
  const dirs = (await $.fs.list(PIPELINE_DIR).catch(() => [])).filter(d => d.kind === 'dir')
  const found = await Promise.all(
    dirs.map(async d => {
      const path = `${PIPELINE_DIR}/${d.name}`
      const files = await $.fs.list(path).catch(() => [])
      const status = files.find(f => f.name === 'status.md')
      if (!status) return null
      const text = await $.fs.read(`${path}/status.md`).catch(() => '')
      const p = parseStatus(typeof text === 'string' ? text : '', d.name, new Set(files.map(f => f.name)))
      return p ? { p, mtime: status.mtimeMs } : null
    }),
  )
  const active = found.filter(x => x !== null).sort((a, b) => b.mtime - a.mtime)
  const next: Pipeline | null = active[0] ? { ...active[0].p, others: active.length - 1 } : null
  // 変わったときだけ書く（書けば帯を描き直すため）
  await update($, pipeline, prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
}
const rescan = ($: EngineInterface) => scanPipelines($).catch(() => undefined)

// 帯の状態を更新し、15分の詰まりに初めて入ったら warned を立ててトーストを出す。
// 立てるかどうかは同じ update の中で決める（並列のツール呼び出しで何度も鳴らさないため）
const refresh = async ($: EngineInterface, fn: (b: Band, now: number) => Band) => {
  const now = await $.clock.now()
  const a = await read($, activity)
  let minutes: number | null = null
  await update($, band, prev => {
    const next = fn(prev, now)
    minutes = next.warned ? null : idleMinutes(next, a, now)
    return minutes === null ? next : { ...next, warned: true }
  })
  if (minutes !== null) $.ui.toast(`task-band: ${minutes} 分タスクが完了していません`)
}

// メインのループの動き（帯は読まないので、ここへの書き込みでは帯を描き直さない）
const track = ($: EngineInterface, fn: (a: Activity) => Activity) => update($, activity, fn)

// 1秒ごと: 実行中のタスクの経過時間を進め、ツール呼び出しが止まっていても15分の詰まりに気付く
const tick = async ($: EngineInterface) => {
  const [b, a, now] = await Promise.all([read($, band), read($, activity), $.clock.now()])
  if (!b.warned && idleMinutes(b, a, now) !== null) await refresh($, x => x)
  if (isVisible(b) && tally(b.items).current?.startedAt != null) $.ui.invalidate('ui.render')
}

// 人の操作で入ったプロンプトだけを「介入」とみなす（バックグラウンドの完了通知や /loop は数えない）
const isHuman = (kind: string) => kind === 'composer' || kind === 'bridge'

// ツールが成功したか（権限・フックの拒否や失敗では帯を動かさない）
const succeeded = <R extends { deny?: string; isError?: true }>(r: R): r is Exclude<R, { deny: string } | { isError: true }> =>
  r.deny === undefined && r.isError !== true

// fail-open: 観測だけのフックなので、自分が壊れても作業は止めない
const passThrough = <E, R>(_: unknown, e: E, next: (e: E) => R) => next(e)

const pipelineText = (p: Pipeline) =>
  `${pipelineLabel(p)} ${p.done}/${p.total}${p.waiting ? ` 🛑${p.waiting}待ち` : p.gate ? ` → ${p.gate}` : ''}`

const listText = (b: Band, p: Pipeline | null) => {
  const items = Object.values(b.items)
  const head = p ? [pipelineText(p)] : []
  if (items.length === 0)
    return [...head, 'タスクはまだありません（現行モデルでは CLAUDE_CODE_ENABLE_TODO_TOOLS=1 が必要です）。'].join('\n')
  const t = tally(b.items)
  return [
    ...head,
    `タスク ${t.done}/${t.total}`,
    ...items.map(i => `${i.status === 'completed' ? '✔' : i.status === 'in_progress' ? '▶' : '○'} ${itemLabel(i)}`),
  ].join('\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'task-band',
      description: 'プロンプトの上のタスク進捗の帯: on / off で表示を切り替え、list で全タスクを表示',
    })
    $.clock.every(TICK_MS, () => void tick($).catch(() => undefined))
    await rescan($)
    return next(e)
  })

  // /clear や resume で会話が替わったら、前の会話のタスクを捨てる（表示の on/off は残す）
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear' || e.reason === 'resume') {
      await update($, band, b => ({ ...EMPTY, isHidden: b.isHidden }))
      await track($, () => IDLE)
    }
    return next(e)
  }).catch(passThrough)

  on('command.run', { command: 'task-band' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === 'off' || arg === 'on') {
      await update($, band, b => ({ ...b, isHidden: arg === 'off' }))
      return { text: arg === 'off' ? 'タスクの帯を隠しました（/task-band on で戻します）。' : 'タスクの帯を表示します。' }
    }
    return { text: listText(await read($, band), await read($, pipeline)) }
  })

  on('prompt.submit', async ($, e, next) => {
    if (isHuman(e.origin.kind)) await refresh($, humanStepped)
    return next(e)
  }).catch(passThrough)

  // turn.start はメインのターンだけ。turn.complete はサブエージェントのターンにも来るので agentId で除く
  on('turn.start', async ($, e, next) => {
    await track($, a => ({ ...a, turnActive: true }))
    await refresh($, restartClock)
    await rescan($)
    return next(e)
  }).catch(passThrough)

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await track($, () => IDLE)
      await rescan($)
    }
    return next(e)
  }).catch(passThrough)

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (succeeded(ran)) await refresh($, (b, now) => replaceTodos(b, e.todos, now))
    return ran
  }).catch(passThrough)

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (succeeded(ran)) {
      const id = ran.result.task.id
      await refresh($, (b, now) =>
        setItem(b, id, { status: 'pending', subject: e.subject, ...(e.activeForm ? { activeForm: e.activeForm } : {}) }, now),
      )
    }
    return ran
  }).catch(passThrough)

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (succeeded(ran) && ran.result.success) {
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
  }).catch(passThrough)

  // status.md や成果物が書かれたら、パイプラインの表示を読み直す（サブエージェントの書き込みも含む）
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    if (succeeded(ran) && e.file_path.includes(PIPELINE_DIR)) await rescan($)
    return ran
  }).catch(passThrough)

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)
    if (succeeded(ran) && e.file_path.includes(PIPELINE_DIR)) await rescan($)
    return ran
  }).catch(passThrough)

  // メインのループで実行中のツールを数える（長いビルドや質問の間は詰まりと数えない）。
  // 中断や例外で next が終わらなくても必ず戻す
  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    await track($, a => ({ ...a, inFlight: a.inFlight + 1 }))
    try {
      return await next(e)
    } finally {
      await track($, a => ({ ...a, inFlight: Math.max(0, a.inFlight - 1) }))
    }
  }).catch(passThrough)

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const [b, p] = await Promise.all([read($, band), read($, pipeline)])
    const showTasks = isVisible(b)
    if (e.props.hasSurvey || b.isHidden || (!showTasks && p === null)) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const t = tally(b.items)
    const columns = e.props.bodyColumns || 80
    const m = meter(t.done, t.total, columns < 60 ? 8 : 16)

    // パイプラインは人の承認待ちを一番目立たせる（承認するまで先へ進まないため）
    const stage =
      p === null ? null : (
        <Text>
          <Text color="claude">{pipelineLabel(p)}</Text>
          {p.waiting ? (
            <Text color="warning" bold>{`  🛑 ${p.waiting}待ち`}</Text>
          ) : (
            <Text dimColor>{p.gate ? `  → ${p.gate}` : ''}</Text>
          )}
          <Text dimColor>{showTasks ? '  │  ' : ''}</Text>
        </Text>
      )

    if (!showTasks) {
      return (
        <Box flexDirection="row">
          <Text wrap="truncate-end">{stage}</Text>
        </Box>
      )
    }

    if (t.open === 0) {
      return (
        <Box flexDirection="row">
          <Text wrap="truncate-end">
            {stage}
            <Text color="success">{`${m.filled} ✔ ${t.done}/${t.total} 完了`}</Text>
          </Text>
        </Box>
      )
    }

    const label = t.current ? itemLabel(t.current) : null
    const elapsed = t.current?.startedAt == null ? '' : `  ${clock(now - t.current.startedAt)}`
    const nextUp = columns >= 90 && p === null && t.next && t.current ? `  次: ${t.next.subject}` : ''
    const idle = b.warned && b.idleSince !== null ? Math.floor((now - b.idleSince) / 60000) : null
    return (
      <Box flexDirection="row">
        <Text wrap="truncate-end">
          {stage}
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
