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
  newLoop,
  itemLabel,
  removeItem,
  replaceTodos,
  sameOr,
  setItem,
  sparkline,
  stuckOf,
  syncAgents,
  taskTally,
  toolEnded,
  toolStarted,
  turnEnded,
  turnStarted,
} from './model'

const PANE = 'progress'
const SYNC_MS = 2000
const CHART_MINUTES = 30
// 同期がこの時間成功していなければ、ペインとステータスラインに「同期できていない」と出す
const SYNC_STALE_MS = 15 * 1000

const watch = atom({ plugin: 'progress-pane', key: 'watch' } as const, EMPTY)
const tab = atom({ plugin: 'progress-pane', key: 'tab' } as const, 'overview' as Tab)

const isSyncStale = (w: Watch, now: number) => w.syncFailing || (w.syncedAt !== null && now - w.syncedAt > SYNC_STALE_MS)

const statusText = (w: Watch, now: number) => {
  const t = taskTally(w)
  const a = agentTally(w)
  const stuck = stuckOf(w, now)
  const parts: string[] = []
  if (t.total > 0) parts.push(`進捗 ${t.done}/${t.total}`)
  if (t.current) parts.push(`▶ ${itemLabel(t.current).slice(0, 40)}`)
  if (a.running > 0) parts.push(`エージェント ${a.running} 実行中`)
  for (const s of stuck) parts.push(s.kind === 'failing' ? `⚠ 連続失敗 ${s.loop.streak}` : `⚠ ${s.minutes}分 完了なし`)
  if (isSyncStale(w, now)) parts.push('⚠ progress-pane 同期できていません')
  return parts.length > 0 ? parts.join(' · ') : undefined
}

// 状態の更新・ステータスライン・初回だけのトーストをまとめて行う。
// トーストを出すかは同じ update の中で決める（並列のツール呼び出しで何度も鳴らさないため）
const refresh = async ($: EngineInterface, fn: (w: Watch, now: number) => Watch) => {
  const now = await $.clock.now()
  let toast: string | null = null
  const w = await update($, watch, prev => {
    const next = sameOr(prev, fn(prev, now))
    const stuck = stuckOf(next, now)
    toast = null
    if (stuck.length === 0 || next.warned) return next
    const s = stuck[0]!
    toast =
      s.kind === 'failing'
        ? `progress-pane: ${loopName(s.loop)}でツールが ${s.loop.streak} 回続けて失敗しています。方針を見直すか止めてください`
        : `progress-pane: ${s.minutes} 分タスクが完了していません`
    return { ...next, warned: true }
  })
  $.ui.status(statusText(w, now))
  if (toast !== null) $.ui.toast(toast)
  return w
}

// エージェント一覧と使用量を取り込む。経過時間の表示を進めるため、何か動いている間は描き直す
const sync = async ($: EngineInterface) => {
  try {
    const [list, usage] = await Promise.all([$.agent.list(), $.session.usage()])
    const w = await refresh($, (w, now) => {
      const synced = list.length > 0 || Object.keys(w.loops).some(id => id !== MAIN) ? syncAgents(w, list, now) : w
      return {
        ...synced,
        usage: { startedAt: usage.startedAt, contextPercent: usage.context.percent ?? null, usd: usage.cost?.usd ?? null },
        syncedAt: now,
        syncFailing: false,
      }
    })
    const isBusy = taskTally(w).current !== null || agentTally(w).running > 0
    if (isBusy) $.ui.invalidate('ui.render')
  } catch {
    // API が変わった・呼べなくなったときに黙らない。ペインとステータスラインに出す
    await refresh($, w => ({ ...w, syncFailing: true }))
  }
}

// 同期の時計は1つだけ動かす。session.start の $ で始める（読み込み・再読み込みのたびに発火する）
let isTicking = false
const startTicking = ($: EngineInterface) => {
  if (isTicking) return
  isTicking = true
  $.clock.every(SYNC_MS, () => void sync($))
}

// 頼まれずに開くのはセッションで1回だけ。人が閉じたあとは /progress でしか開かない
const autoOpen = async ($: EngineInterface) => {
  let isFirst = false
  await update($, watch, w => {
    isFirst = !w.autoOpened
    return isFirst ? { ...w, autoOpened: true } : w
  })
  if (isFirst) void $.ui.open({ id: PANE, title: '進捗' })
}

const loopName = (l: Loop) => (l.id === MAIN ? 'メイン' : `${l.type}${l.description ? `「${l.description}」` : ''}`)

const STATUS: Record<Loop['status'], { icon: string; word: string; color: string }> = {
  running: { icon: '▶', word: '実行中', color: 'claude' },
  pending: { icon: '◌', word: '開始待ち', color: 'suggestion' },
  unknown: { icon: '▶', word: '実行中', color: 'claude' },
  waiting: { icon: '⏸', word: '待機', color: 'warning' },
  idle: { icon: '⏸', word: '待機', color: 'warning' },
  completed: { icon: '✔', word: '完了', color: 'success' },
  gone: { icon: '·', word: '終了（一覧から消えた）', color: 'subtle' },
  failed: { icon: '✖', word: '失敗', color: 'error' },
  killed: { icon: '■', word: '停止', color: 'error' },
}

// 人の操作で入ったプロンプトだけを「介入」とみなす（バックグラウンドの完了通知や /loop は数えない）
const isHuman = (kind: string) => kind === 'composer' || kind === 'bridge'

// 各フックの .catch は fail-open: 観測だけのフックなので、自分が壊れても作業は止めない
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'progress', description: '進捗ダッシュボード（タスク・エージェントの地図・詰まり）を開く' })
    startTicking($)
    return next(e)
  })

  // /clear や resume で会話が替わったら、前の会話の表示を捨てる
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear' || e.reason === 'resume') await update($, watch, () => EMPTY)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'progress' }, async $ => {
    await $.ui.open({ id: PANE, title: '進捗' })
    return { text: '進捗ダッシュボードを開きました。1 概要 / 2 エージェント / 3 ログ で切り替えます。' }
  })

  // 人がペインを閉じたら、以後は頼まれずに開かない
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE && e.origin.kind === 'person') await update($, watch, w => ({ ...w, autoOpened: true }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    if (isHuman(e.origin.kind)) await refresh($, (w, now) => humanStepped(w, now))
    return next(e)
  }).catch(($, e, next) => next(e))

  // メインのターンが動いている間だけ15分の詰まりを数える（人の番で待っている時間は数えない）
  on('turn.start', async ($, e, next) => {
    await refresh($, (w, now) => turnStarted(w, now))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    await refresh($, w => turnEnded(w))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      await refresh($, (w, now) => replaceTodos(w, e.todos, now))
      if (e.todos.length > 0) await autoOpen($)
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const id = ran.result.task.id
      await refresh($, (w, now) => setItem(w, id, { status: 'pending', subject: e.subject, ...(e.activeForm ? { activeForm: e.activeForm } : {}) }, now))
      await autoOpen($)
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true && ran.result.success) {
      await refresh($, (w, now) => {
        if (e.status === 'deleted') return removeItem(w, e.taskId, now)
        return setItem(
          w,
          e.taskId,
          {
            ...(e.status ? { status: e.status } : {}),
            ...(e.subject ? { subject: e.subject } : {}),
            ...(e.activeForm ? { activeForm: e.activeForm } : {}),
          },
          now,
        )
      })
    }
    return ran
  }).catch(($, e, next) => next(e))

  // すべてのツール呼び出しを、どのループ（メイン・サブエージェント）のものかつきで数える。
  // 中断や例外で next が終わらなくても、いま使っているツールと回答待ちは必ず戻す
  on('tool.call', async ($, e, next) => {
    const loop = e.agentId ?? MAIN
    // 初めて見るエージェントは、すぐ一覧を取り直して地図に名前つきで載せる
    if (loop !== MAIN && (await read($, watch)).loops[loop] === undefined) await sync($)
    await refresh($, (w, now) => toolStarted(w, loop, e.tool, now))
    let outcome: { isError: boolean; text: string } | null = null
    try {
      const ran = await next(e)
      if (ran.deny === undefined) outcome = { isError: ran.isError === true, text: ran.isError === true ? (ran.text ?? '') : '' }
      return ran
    } finally {
      await refresh($, (w, now) => toolEnded(w, loop, e.tool, outcome, now))
    }
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const now = await $.clock.now()
    const w = await read($, watch)
    const current = await read($, tab)
    // ドックしたペインは端末より狭い。描く幅と高さはペインの本体の大きさで決める
    const columns = e.props.bodyColumns || 80
    const rows = e.props.scroll.bodyRows || 30
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
        {isSyncStale(w, now) ? (
          <Text color="warning">{`⚠ 同期できていません${w.syncedAt === null ? '' : `（最終 ${clock(now - w.syncedAt)}前）`}`}</Text>
        ) : (
          <Text dimColor>{`${elapsed}${ctx}${usd}`}</Text>
        )}
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
            ? `▶ ${itemLabel(t.current)}${t.current.startedAt === null ? '' : `  ${clock(now - t.current.startedAt)}`}`
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
        chart = <Svg key="chart" source={activitySvg(data)} alt="直近30分のツール実行数" />
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
              {`${i.status === 'completed' ? '✔' : i.status === 'in_progress' ? '▶' : '○'} ${itemLabel(i)}`}
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
              <Text dimColor>{` ${f.loop === MAIN ? '' : `(${loopName(w.loops[f.loop] ?? newLoop(f.loop, now))}) `}`}</Text>
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

