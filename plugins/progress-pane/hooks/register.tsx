import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Loop, Tab, Watch } from '../types'
import {
  EMPTY,
  MAIN,
  activity,
  activityCells,
  activitySvg,
  agentTally,
  agentTree,
  bar,
  clock,
  humanStepped,
  removeItem,
  setItem,
  sparkline,
  stuckOf,
  syncAgents,
  taskTally,
  toolEnded,
  toolStarted,
  withItems,
} from './model'

const PANE = 'progress'
const SYNC_MS = 2000
const CHART_MINUTES = 30

const watch = atom({ plugin: 'progress-pane', key: 'watch' } as const, EMPTY)
const tab = atom({ plugin: 'progress-pane', key: 'tab' } as const, 'overview' as Tab)

const statusText = (w: Watch, now: number) => {
  const t = taskTally(w)
  const a = agentTally(w)
  const stuck = stuckOf(w, now)
  const parts: string[] = []
  if (t.total > 0) parts.push(`進捗 ${t.done}/${t.total}`)
  if (t.current) parts.push(`▶ ${t.current.label.slice(0, 40)}`)
  if (a.running > 0) parts.push(`エージェント ${a.running} 実行中`)
  for (const s of stuck) parts.push(s.kind === 'failing' ? `⚠ 連続失敗 ${s.loop.streak}` : `⚠ ${s.minutes}分 完了なし`)
  return parts.length > 0 ? parts.join(' · ') : undefined
}

// 状態の更新・ステータスライン・初回だけのトーストをまとめて行う
const refresh = async ($: EngineInterface, fn: (w: Watch, now: number) => Watch) => {
  const now = await $.clock.now()
  const w = await update($, watch, prev => fn(prev, now))
  $.ui.status(statusText(w, now))
  const stuck = stuckOf(w, now)
  if (stuck.length > 0 && !w.warned) {
    await update($, watch, prev => ({ ...prev, warned: true }))
    const s = stuck[0]!
    $.ui.toast(
      s.kind === 'failing'
        ? `progress-pane: ${loopName(s.loop)}でツールが ${s.loop.streak} 回続けて失敗しています。方針を見直すか止めてください`
        : `progress-pane: ${s.minutes} 分タスクが完了していません`,
    )
  }
  return w
}

// エージェント一覧と使用量を取り込む。経過時間の表示を進めるため、何か動いている間は描き直す
const sync = async ($: EngineInterface) => {
  const [list, usage] = await Promise.all([$.agent.list(), $.session.usage().catch(() => null)])
  const w = await refresh($, (w, now) => {
    const synced = list.length > 0 || Object.keys(w.loops).length > 1 ? syncAgents(w, list, now) : w
    return usage === null
      ? synced
      : {
          ...synced,
          usage: { startedAt: usage.startedAt, contextPercent: usage.context.percent ?? null, usd: usage.cost?.usd ?? null },
        }
  })
  const isBusy = taskTally(w).current !== null || agentTally(w).running > 0
  if (isBusy) $.ui.invalidate('ui.render')
}

// 同期の時計は1つだけ動かす（session.start より先にツールが呼ばれても動くよう、最初に使ったときにも始める）
let isTicking = false
const startTicking = ($: EngineInterface) => {
  if (isTicking) return
  isTicking = true
  $.clock.every(SYNC_MS, () => void sync($).catch(() => undefined))
}

const openPane = ($: EngineInterface) => $.ui.open({ id: PANE, title: '進捗' })

const loopName = (l: Loop) => (l.id === MAIN ? 'メイン' : `${l.type}${l.description ? `「${l.description}」` : ''}`)

const STATUS: Record<Loop['status'], { icon: string; word: string; color: string }> = {
  running: { icon: '▶', word: '実行中', color: 'claude' },
  pending: { icon: '◌', word: '開始待ち', color: 'suggestion' },
  unknown: { icon: '▶', word: '実行中', color: 'claude' },
  waiting: { icon: '⏸', word: '待機', color: 'warning' },
  idle: { icon: '⏸', word: '待機', color: 'warning' },
  completed: { icon: '✔', word: '完了', color: 'success' },
  failed: { icon: '✖', word: '失敗', color: 'error' },
  killed: { icon: '■', word: '停止', color: 'error' },
}

// 各フックの .catch は fail-open: 観測だけのフックなので、自分が壊れても作業は止めない
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'progress', description: '進捗ダッシュボード（タスク・エージェントの地図・詰まり）を開く' })
    startTicking($)
    return next(e)
  })

  on('command.run', { command: 'progress' }, async $ => {
    await openPane($)
    return { text: '進捗ダッシュボードを開きました。1 概要 / 2 エージェント / 3 ログ で切り替えます。' }
  })

  on('prompt.submit', async ($, e, next) => {
    await refresh($, (w, now) => humanStepped(w, now))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      await refresh($, (w, now) => {
        let out = withItems(w, {}, now)
        e.todos.forEach((t, i) => {
          out = setItem(out, `todo-${i}`, t.status, t.status === 'in_progress' ? t.activeForm : t.content, now)
        })
        return withItems(w, out.items, now)
      })
      void openPane($)
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const id = ran.result.task.id
      await refresh($, (w, now) => setItem(w, id, 'pending', e.subject, now))
      void openPane($)
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true && ran.result.success) {
      await refresh($, (w, now) => {
        if (e.status === 'deleted') return removeItem(w, e.taskId, now)
        const prev = w.items[e.taskId]
        const status = e.status ?? prev?.status ?? 'pending'
        const label = status === 'in_progress' && e.activeForm ? e.activeForm : (e.subject ?? prev?.label ?? e.taskId)
        return setItem(w, e.taskId, status, label, now)
      })
    }
    return ran
  }).catch(($, e, next) => next(e))

  // すべてのツール呼び出しを、どのループ（メイン・サブエージェント）のものかつきで数える
  on('tool.call', async ($, e, next) => {
    const loop = e.agentId ?? MAIN
    startTicking($)
    // 初めて見るエージェントは、すぐ一覧を取り直して地図に名前つきで載せる
    if (loop !== MAIN && (await read($, watch)).loops[loop] === undefined) await sync($).catch(() => undefined)
    await refresh($, (w, now) => toolStarted(w, loop, e.tool, now))
    const ran = await next(e)
    const outcome = ran.deny !== undefined ? null : { isError: ran.isError === true, text: ran.isError === true ? (ran.text ?? '') : '' }
    await refresh($, (w, now) => toolEnded(w, loop, e.tool, outcome, now))
    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const now = await $.clock.now()
    const w = await read($, watch)
    const current = await read($, tab)
    const columns = e.viewport?.columns ?? e.props.bodyColumns ?? 80
    const rows = e.viewport?.rows ?? 30
    const isWide = columns >= 90

    const card = (key: string, title: string, color: string, body: JSX.Element[]) => (
      <Box key={key} flexDirection="column" borderStyle="round" borderColor={color} paddingX={1} flexGrow={1} minWidth={26}>
        <Text bold color={color}>
          {title}
        </Text>
        {body}
      </Box>
    )

    const tabs = (
      <Box key="tabs" flexDirection="row" gap={1}>
        {(
          [
            ['overview', '1', '概要'],
            ['agents', '2', 'エージェント'],
            ['log', '3', 'ログ'],
          ] as const
        ).map(([id, hotkey, label]) => (
          <Button
            key={`tab-${id}`}
            label={`${hotkey} ${label}`}
            hotkey={hotkey}
            variant={current === id ? 'primary' : undefined}
            dimColor={current !== id}
            onPress={() => update($, tab, () => id)}
          />
        ))}
      </Box>
    )

    const elapsed = w.usage.startedAt === null ? '' : `⏱ ${clock(now - w.usage.startedAt)}`
    const ctx = w.usage.contextPercent === null ? '' : `  文脈 ${Math.round(w.usage.contextPercent)}%`
    const usd = w.usage.usd === null ? '' : `  $${w.usage.usd.toFixed(2)}`
    const header = (
      <Box key="header" flexDirection="row" justifyContent="space-between">
        {tabs}
        <Text dimColor>{`${elapsed}${ctx}${usd}`}</Text>
      </Box>
    )

    // ---- 概要 ----
    const overview = () => {
      const t = taskTally(w)
      const a = agentTally(w)
      const stuck = stuckOf(w, now)
      const barWidth = isWide ? 18 : Math.max(10, columns - 20)
      const b = bar(t.done, t.total, barWidth)
      const percent = t.total === 0 ? 0 : Math.round((t.done / t.total) * 100)

      const taskCard = card('card-tasks', 'タスク', 'claude', [
        <Text key="bar">
          <Text color="success">{b.filled}</Text>
          <Text dimColor>{b.empty}</Text>
          {` ${t.done}/${t.total}  ${percent}%`}
        </Text>,
        <Text key="now" wrap="truncate-end" color={t.current ? 'claude' : undefined} dimColor={!t.current}>
          {t.current
            ? `▶ ${t.current.label}${t.current.startedAt === null ? '' : `  ${clock(now - t.current.startedAt)}`}`
            : t.total === 0
              ? 'タスクはまだありません'
              : t.done === t.total
                ? '✔ すべて完了'
                : '実行中のタスクなし'}
        </Text>,
      ])

      const health =
        stuck.length > 0
          ? card(
              'card-health',
              '⚠ 詰まり',
              'warning',
              stuck.map((s, i) => (
                <Text key={`stuck-${i}`} color="warning" wrap="truncate-end">
                  {s.kind === 'failing' ? `${loopName(s.loop)}: ${s.loop.streak}回連続失敗` : `${s.minutes}分 タスク完了なし`}
                </Text>
              )),
            )
          : card('card-health', '✔ 順調', 'success', [
              <Text key="ok" dimColor wrap="truncate-end">
                {w.lastProgressAt === null ? '詰まりの兆候なし' : `最後の完了から ${clock(now - w.lastProgressAt)}`}
              </Text>,
            ])
      const asking =
        w.asking > 0 ? [<Text key="asking" color="suggestion" bold>{`❓ あなたの回答待ち ${w.asking} 件`}</Text>] : []

      const agentCard = card('card-agents', 'エージェント', 'planMode', [
        <Text key="tally">
          <Text color="claude">{`▶ ${a.running}  `}</Text>
          <Text color="warning">{`⏸ ${a.waiting}  `}</Text>
          <Text color="success">{`✔ ${a.done}  `}</Text>
          <Text color="error">{`✖ ${a.failed}`}</Text>
        </Text>,
        <Text key="hint" dimColor>
          2 で地図を開く
        </Text>,
      ])

      const data = activity(w, now, CHART_MINUTES)
      const chartWidth = Math.min(CHART_MINUTES * 2, Math.max(CHART_MINUTES, columns - 4))
      const wide = data.flatMap(d => Array.from({ length: Math.max(1, Math.floor(chartWidth / CHART_MINUTES)) }, () => d))
      let chart: JSX.Element
      if (e.surface === 'terminal') {
        const { Raster } = $.ui.resolve(e)
        chart = <Raster key="chart" columns={wide.length} rows={3} cells={activityCells(wide, 3)} />
      } else if (e.surface === 'desktop' || e.surface === 'mobile') {
        const { Svg } = $.ui.resolve(e)
        chart = <Svg key="chart" source={activitySvg(data, 480, 60)} alt="直近30分のツール実行数" width={480} height={60} />
      } else {
        chart = <Text key="chart" color="success">{sparkline(data)}</Text>
      }
      const total = data.reduce((n, [ok, err]) => n + ok + err, 0)
      const errors = data.reduce((n, [, err]) => n + err, 0)

      const room = Math.max(3, rows - 16)
      const items = Object.entries(w.items)
      const list = items.length > room ? items.filter(([, i]) => i.status !== 'completed').slice(0, room) : items
      return [
        <Box key="cards" flexDirection={isWide ? 'row' : 'column'} gap={isWide ? 1 : 0}>
          {taskCard}
          {health}
          {agentCard}
        </Box>,
        ...asking,
        <Box key="activity" flexDirection="column" borderStyle="round" borderDimColor paddingX={1}>
          <Text bold>
            {'ツール実行 '}
            <Text dimColor>{`直近${CHART_MINUTES}分 · ${total}回`}</Text>
            {errors > 0 ? <Text color="error">{` · 失敗 ${errors}`}</Text> : ''}
          </Text>
          {chart}
        </Box>,
        <Box key="tasklist" flexDirection="column" paddingX={1}>
          {list.map(([id, i]) => (
            <Text
              key={`task-${id}`}
              wrap="truncate-end"
              color={i.status === 'in_progress' ? 'claude' : undefined}
              dimColor={i.status === 'completed'}
              strikethrough={i.status === 'completed'}
            >
              {`${i.status === 'completed' ? '✔' : i.status === 'in_progress' ? '▶' : '○'} ${i.label}`}
            </Text>
          ))}
          {list.length < items.length ? <Text dimColor>{`…完了済み ${items.length - list.length} 件を省略`}</Text> : ''}
        </Box>,
      ]
    }

    // ---- エージェントの地図 ----
    const agents = () => {
      const tree = agentTree(w, now)
      return [
        <Box key="map" flexDirection="column" borderStyle="round" borderColor="planMode" paddingX={1}>
          <Text bold color="planMode">
            エージェントの地図
          </Text>
          {tree.map(({ loop: l, prefix }) => {
            const s = STATUS[l.status]
            const ended = l.endedAt ?? now
            const time = l.id === MAIN ? '' : `  ${clock(ended - l.startedAt)}`
            const errs = l.errors > 0 ? `  ✖${l.errors}` : ''
            return (
              <Text key={`agent-${l.id}`} wrap="truncate-end">
                <Text dimColor>{prefix}</Text>
                <Text color={s.color}>{`${l.id === MAIN ? '●' : s.icon} `}</Text>
                <Text bold={l.id === MAIN}>{loopName(l)}</Text>
                <Text dimColor>{l.id === MAIN ? '' : `  ${s.word}`}{time}{`  ツール ${l.tools}`}</Text>
                <Text color="error">{errs}</Text>
                {l.current ? <Text color="claude">{`  ▷ ${l.current}`}</Text> : ''}
              </Text>
            )
          })}
          {tree.length === 1 ? <Text dimColor>サブエージェントはまだ動いていません</Text> : ''}
        </Box>,
        <Text key="legend" dimColor>
          ▶ 実行中 ⏸ 待機 ✔ 完了 ✖ 失敗 ▷ いま使っているツール
        </Text>,
      ]
    }

    // ---- ログ ----
    const log = () => {
      const top = Object.entries(w.toolCounts)
        .sort((x, y) => y[1] - x[1])
        .slice(0, 6)
      const max = Math.max(1, ...top.map(([, n]) => n))
      const fails = w.failures.slice(-Math.max(3, rows - 14)).reverse()
      return [
        <Box key="tools" flexDirection="column" borderStyle="round" borderDimColor paddingX={1}>
          <Text bold>よく使ったツール</Text>
          {top.length === 0 ? <Text dimColor>まだありません</Text> : ''}
          {top.map(([name, n]) => (
            <Text key={`tool-${name}`}>
              {`${name.padEnd(14).slice(0, 14)} `}
              <Text color="claude">{'█'.repeat(Math.max(1, Math.round((n / max) * 20)))}</Text>
              <Text dimColor>{` ${n}`}</Text>
            </Text>
          ))}
        </Box>,
        <Box key="fails" flexDirection="column" borderStyle="round" borderColor={fails.length > 0 ? 'error' : undefined} borderDimColor={fails.length === 0} paddingX={1}>
          <Text bold>直近の失敗</Text>
          {fails.length === 0 ? <Text dimColor>失敗はありません</Text> : ''}
          {fails.map((f, i) => (
            <Text key={`fail-${i}`} wrap="truncate-end">
              <Text dimColor>{`${clock(now - f.at)}前 `}</Text>
              <Text color="error">{f.tool}</Text>
              <Text dimColor>{` ${f.loop === MAIN ? '' : `(${loopName(w.loops[f.loop] ?? { ...EMPTY_LOOP, id: f.loop })}) `}`}</Text>
              {f.text}
            </Text>
          ))}
        </Box>,
      ]
    }

    const body = current === 'agents' ? agents() : current === 'log' ? log() : overview()
    return (
      <Box flexDirection="column">
        {header}
        {body}
      </Box>
    )
  })
}

const EMPTY_LOOP: Loop = {
  id: '',
  type: '?',
  description: '',
  parentId: null,
  status: 'unknown',
  startedAt: 0,
  endedAt: null,
  tools: 0,
  errors: 0,
  streak: 0,
  current: null,
}
