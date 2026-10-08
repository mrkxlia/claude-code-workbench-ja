import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { AgentInfo, On } from 'claude-code'

import {
  EMPTY,
  agentTally,
  agentTree,
  itemLabel,
  replaceTodos,
  setItem,
  stuckOf,
  syncAgents,
  toBase64,
  toolEnded,
  toolStarted,
  turnStarted,
} from '../hooks/model'

// エンジン側の代役: タスク系は成功を返し、Bash は fail が含まれるときだけ失敗を返す。
// agent.list は agents の中身をそのまま返す（テストの途中で書き換える）
const engine = (on: On) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  const agents: AgentInfo[] = []
  const opened: string[] = []
  const flags = { listFails: false }
  let nextId = 0
  on('ui.status', ($, e) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.open', ($, e) => {
    opened.push(e.id)
    return { value: { isDrawn: true } } as never
  })
  on('ui.close', () => ({ value: undefined }) as never)
  on('turn.start', () => ({ turnId: 't' }))
  on('turn.complete', () => ({ text: '' }) as never)
  on('session.start', () => ({ cwd: '' }) as never)
  on('session.end', () => ({ sessionId: 's' }))
  on('command.register', () => ({ value: { command: 'progress' } }))
  on('agent.list', () => {
    if (flags.listFails) throw new Error('agent.list changed')
    return { value: [...agents] }
  })
  on('session.usage', () => ({ value: { startedAt: 1_000_000, context: { window: 200000, percent: 42 }, rateLimits: [], cost: { usd: 0.83 } } }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('tool.call', { tool: 'TodoWrite' }, ($, e) => ({ result: { oldTodos: [], newTodos: [...e.todos] } }))
  on('tool.call', { tool: 'TaskCreate' }, ($, e) => ({
    result: { task: { id: String(++nextId), subject: e.subject } },
  }))
  on('tool.call', { tool: 'TaskUpdate' }, ($, e) => ({
    result: { success: true, taskId: e.taskId, updatedFields: ['status'] },
  }))
  on('tool.call', { tool: 'Bash' }, ($, e) =>
    e.command.includes('fail')
      ? { isError: true as const, result: 'exit 1', text: 'npm test failed: 3 errors' }
      : { result: { stdout: 'ok', stderr: '', interrupted: false } },
  )
  on('tool.call', { tool: 'Read' }, () => ({ result: { type: 'text', file: { filePath: 'a', content: '', numLines: 0, startLine: 1, totalLines: 0 } } }) as never)
  return { clock, statuses, toasts, agents, opened, flags, last: () => statuses[statuses.length - 1] }
}

const bash = (command: string, agentId?: string) => ({ tool: 'Bash' as const, command, description: 'run', ...(agentId ? { agentId } : {}) })
// viewport（端末全体）とペインの本体の幅は別。ドックしたペインは端末より狭い
const pane = (surface: 'terminal' | 'desktop', columns = 120, viewportColumns = 160) => ({
  plugin: 'progress-pane',
  surface,
  component: 'Pane' as const,
  requestId: 'progress',
  viewport: { columns: viewportColumns, rows: 50 } as never,
  props: { title: '進捗', isFocused: false, bodyColumns: columns, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 40 }, view: {} },
})
const boot = ($: Engine) =>
  $.session.start({ cwd: '', surface: 'terminal', isInteractive: true } as never)
const startTurn = ($: Engine) => $.turn.start({ text: '', turnId: 't' } as never)
const endTurn = ($: Engine) => $.turn.complete({ text: '', reason: 'end_turn' } as never)
const agent = (id: string, type: string, description: string, status: AgentInfo['status'], parentId?: string): AgentInfo => ({
  id,
  type,
  description,
  status,
  ...(parentId ? { parentId } : {}),
})

describe('model.ts', () => {
  test('エージェントを親子の木にし、罫線の接頭辞を付ける', () => {
    let w = syncAgents(
      EMPTY,
      [agent('a', 'Explore', '調査', 'running'), agent('b', 'Plan', '設計', 'completed'), agent('c', 'general-purpose', '下調べ', 'running', 'a')],
      0,
    )
    w = toolEnded(w, 'main', 'Read', { isError: false, text: '' }, 0)
    expect(agentTree(w, 0).map(r => `${r.prefix}${r.loop.id}`)).toEqual(['main', '├─ a', '│  └─ c', '└─ b'])
  })

  test('一覧から消えた実行中のエージェントは「一覧から消えた」として残す（完了とは書かない）', () => {
    const w = syncAgents(syncAgents(EMPTY, [agent('a', 'Explore', '調査', 'running')], 0), [], 5000)
    expect([w.loops.a?.status, w.loops.a?.endedAt]).toEqual(['gone', 5000])
  })

  test('一覧に出ないループ（フォーク）は地図にも実行中の数にも入れない', () => {
    let w = toolStarted(EMPTY, 'fork-1', 'Read', 0)
    w = toolEnded(w, 'fork-1', 'Read', { isError: false, text: '' }, 1)
    expect(agentTally(w).running).toBe(0)
    expect(agentTree(w, 1).map(r => r.loop.id)).toEqual(['main'])
  })

  test('前の完了から時間がたってから新しいタスクを足しても、すぐ詰まりにしない', () => {
    let w = setItem(EMPTY, '1', { status: 'completed', subject: '前の仕事' }, 0)
    w = turnStarted(w, 0)
    w = setItem(w, '2', { status: 'pending', subject: '次の仕事' }, 20 * 60 * 1000)
    expect(stuckOf(w, 20 * 60 * 1000)).toEqual([])
  })

  test('TodoWrite で一覧を差し替えても、実行中の項目の経過時間を引き継ぐ', () => {
    const todo = (content: string, status: 'pending' | 'in_progress' | 'completed') => ({ content, status, activeForm: `${content}中` })
    let w = replaceTodos(EMPTY, [todo('A', 'in_progress')], 0)
    w = replaceTodos(w, [todo('A', 'in_progress'), todo('B', 'pending')], 5 * 60 * 1000)
    expect(w.items['todo-0']?.startedAt).toBe(0)
  })

  test('完了したタスクは進行形ではなく件名で見せる', () => {
    let w = setItem(EMPTY, '1', { status: 'pending', subject: 'テストを書く' }, 0)
    w = setItem(w, '1', { status: 'in_progress', activeForm: 'テストを書いています' }, 1)
    expect(itemLabel(w.items['1']!)).toBe('テストを書いています')
    w = setItem(w, '1', { status: 'completed' }, 2)
    expect(itemLabel(w.items['1']!)).toBe('テストを書く')
  })

  test('base64 は標準どおり', () => {
    expect(toBase64(new TextEncoder().encode('Man'))).toBe('TWFu')
    expect(toBase64(new TextEncoder().encode('Ma'))).toBe('TWE=')
    expect(toBase64(new TextEncoder().encode('M'))).toBe('TQ==')
  })
})

test('概要: タスクの進捗バー・順調・グラフを terminal と desktop で描く', async ($, on) => {
  const seen = engine(on)
  await $.tool.call({ tool: 'TaskCreate', subject: 'テストを書く', description: 'x' })
  await $.tool.call({ tool: 'TaskCreate', subject: '実装する', description: 'x' })
  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'completed' })
  await $.tool.call({ tool: 'TaskUpdate', taskId: '2', status: 'in_progress', activeForm: '実装しています' })
  expect(seen.last()).toBe('進捗 1/2 · ▶ 実装しています')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount(pane(surface))
    expect(await ui.find({ type: 'Text', text: /1\/2 {2}50%$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '✔ 順調' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^▶ 実装しています/ })).toBeDefined()
    expect(await ui.find({ type: surface === 'terminal' ? 'Raster' : 'Svg' })).toBeDefined()
    await ui.unmount()
  }
})

test('エージェント: タブを切り替えると、一覧とツール呼び出しから地図を描く', async ($, on) => {
  const seen = engine(on)
  await boot($)
  seen.agents.push(agent('a1', 'Explore', 'repo調査', 'running'), agent('a2', 'general-purpose', '下調べ', 'running', 'a1'))
  await $.tool.call({ ...bash('ls'), agentId: 'a2' } as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount(pane(surface))
    await ui.press({ key: 'tab-agents' })
    expect(await ui.find({ type: 'Text', text: /^● メイン/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^└─ ▶ Explore「repo調査」 {2}実行中/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^ {3}└─ ▶ general-purpose「下調べ」.*ツール 1/ })).toBeDefined()
    await ui.press({ key: 'tab-overview' })
    await ui.unmount()
  }
})

test('サブエージェントで3回続けて失敗したら、その名前でトーストを1度だけ出す', async ($, on) => {
  const seen = engine(on)
  seen.agents.push(agent('a1', 'Explore', 'repo調査', 'running'))
  for (let i = 0; i < 4; i++) await $.tool.call({ ...bash('npm test # fail'), agentId: 'a1' } as never)
  expect(seen.last()).toContain('⚠ 連続失敗 4')
  expect(seen.toasts).toHaveLength(1)
  expect(seen.toasts[0]).toContain('Explore「repo調査」でツールが 3 回続けて失敗')

  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-log' })
  expect(await ui.find({ type: 'Text', text: /Bash \(Explore「repo調査」\) npm test failed/ })).toBeDefined()
  // 人が介入したら連続失敗の数え直し。走っているエージェントの表示は残る
  await $.prompt.submit({ text: 'いったん止めて', wait: false, origin: { kind: 'composer' } })
  expect(seen.last()).toBe('エージェント 1 実行中')
})

test('ターンが動いたまま15分完了がなければ時計で知らせる。人の番で待っている間は数えない', async ($, on) => {
  const seen = engine(on)
  await boot($)
  await $.tool.call({ tool: 'TaskCreate', subject: '調査', description: 'x' })
  // ターンが終わって人の番のまま20分 → 詰まりではない
  await seen.clock.advance(20 * 60 * 1000)
  expect(seen.last()).toBe('進捗 0/1')
  expect(seen.toasts).toEqual([])
  // ターンが始まって16分、何も完了しない → 詰まり
  await startTurn($)
  await seen.clock.advance(16 * 60 * 1000)
  expect(seen.last()).toBe('進捗 0/1 · ⚠ 16分 完了なし')
  expect(seen.toasts).toEqual(['progress-pane: 15 分タスクが完了していません'])
  await endTurn($)
})

test('並列のツール呼び出しで連続失敗が閾値を越えても、トーストは1度だけ', async ($, on) => {
  const seen = engine(on)
  await $.tool.call(bash('npm test # fail'))
  await $.tool.call(bash('npm test # fail'))
  await Promise.all([$.tool.call(bash('a # fail')), $.tool.call(bash('b # fail')), $.tool.call(bash('c # fail'))])
  expect(seen.toasts).toHaveLength(1)
})

test('ツールが例外で終わっても、回答待ちといま使っているツールを戻す', async ($, on) => {
  const seen = engine(on)
  on('tool.call', { tool: 'AskUserQuestion' }, () => {
    throw new Error('interrupted')
  })
  await $.tool.call({ tool: 'AskUserQuestion', questions: [] } as never).catch(() => undefined)
  const ui = await $.ui.mount(pane('terminal'))
  expect(await ui.find({ type: 'Text', text: /あなたの回答待ち/ })).toBeUndefined()
  await ui.press({ key: 'tab-agents' })
  expect(await ui.find({ type: 'Text', text: /▷ AskUserQuestion/ })).toBeUndefined()
  expect(seen.toasts).toEqual([])
})

test('バックグラウンドの完了通知のプロンプトでは、連続失敗を数え直さない', async ($, on) => {
  const seen = engine(on)
  for (let i = 0; i < 3; i++) await $.tool.call(bash('npm test # fail'))
  await $.prompt.submit({ text: '<task-notification>', wait: false, origin: { kind: 'task-notification' } } as never)
  expect(seen.last()).toContain('⚠ 連続失敗 3')
  await $.prompt.submit({ text: 'どうなった？', wait: false, origin: { kind: 'composer' } })
  expect(seen.last()).toBeUndefined()
})

test('ドックした狭いペインでは、端末が広くてもカードを縦に積み、グラフを本体の幅に収める', async ($, on) => {
  engine(on)
  await $.tool.call(bash('ls'))
  const ui = await $.ui.mount(pane('terminal', 48, 160))
  const drawn = JSON.stringify(await ui.drawn())
  expect(drawn).toContain('"flexDirection":"column","gap":0')
  const raster = await ui.find({ type: 'Raster' })
  expect(Number((raster as { props?: { columns?: number } } | undefined)?.props?.columns)).toBeLessThanOrEqual(44)
})

test('ペインを頼まれずに開くのはセッションで1回だけ', async ($, on) => {
  const seen = engine(on)
  await $.tool.call({ tool: 'TaskCreate', subject: 'A', description: 'x' })
  await $.tool.call({ tool: 'TaskCreate', subject: 'B', description: 'x' })
  await $.tool.call({ tool: 'TodoWrite', todos: [{ content: 'C', status: 'pending', activeForm: 'C中' }] })
  expect(seen.opened).toEqual(['progress'])
})

test('/clear で会話が替わったら前の表示を捨てる', async ($, on) => {
  const seen = engine(on)
  await $.tool.call({ tool: 'TaskCreate', subject: 'A', description: 'x' })
  await $.session.end({ reason: 'clear', sessionId: 's', resume: {} } as never)
  await $.tool.call(bash('ls'))
  expect(seen.last()).toBeUndefined()
})

test('エージェント一覧が取れなくなったら、黙らずに「同期できていない」と出す', async ($, on) => {
  const seen = engine(on)
  await boot($)
  await $.tool.call({ tool: 'TaskCreate', subject: 'A', description: 'x' })
  seen.flags.listFails = true
  await seen.clock.advance(4000)
  expect(seen.last()).toContain('⚠ progress-pane 同期できていません')
  const ui = await $.ui.mount(pane('terminal'))
  expect(await ui.find({ type: 'Text', text: /^⚠ 同期できていません/ })).toBeDefined()
})
