import { describe, expect, mock, test } from 'claude-code/testing'
import type { AgentInfo, On } from 'claude-code'

import { EMPTY, agentTree, syncAgents, toBase64, toolEnded } from '../hooks/model'

// エンジン側の代役: タスク系は成功を返し、Bash は fail が含まれるときだけ失敗を返す。
// agent.list は agents の中身をそのまま返す（テストの途中で書き換える）
const engine = (on: On) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  const agents: AgentInfo[] = []
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
  on('ui.open', () => ({ value: { isDrawn: true } }) as never)
  on('command.register', () => ({ value: { command: 'progress' } }))
  on('agent.list', () => ({ value: [...agents] }))
  on('session.usage', () => ({ value: { startedAt: 1_000_000, context: { window: 200000, percent: 42 }, rateLimits: [], cost: { usd: 0.83 } } }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text }))
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
  return { clock, statuses, toasts, agents, last: () => statuses[statuses.length - 1] }
}

const bash = (command: string, agentId?: string) => ({ tool: 'Bash' as const, command, description: 'run', ...(agentId ? { agentId } : {}) })
const pane = (surface: 'terminal' | 'desktop', columns = 120) => ({
  plugin: 'progress-pane',
  surface,
  component: 'Pane' as const,
  requestId: 'progress',
  viewport: { columns, rows: 40 } as never,
  props: { title: '進捗', isFocused: false, bodyColumns: columns, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 40 }, view: {} },
})
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

  test('一覧から消えた実行中のエージェントは完了扱いにする', () => {
    const w = syncAgents(syncAgents(EMPTY, [agent('a', 'Explore', '調査', 'running')], 0), [], 5000)
    expect([w.loops.a?.status, w.loops.a?.endedAt]).toEqual(['completed', 5000])
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

test('未完了タスクがあるまま15分完了がなければ、ツール呼び出しが無くても時計で知らせる', async ($, on) => {
  const seen = engine(on)
  await $.tool.call({ tool: 'TaskCreate', subject: '調査', description: 'x' })
  await seen.clock.advance(16 * 60 * 1000)
  expect(seen.last()).toBe('進捗 0/1 · ⚠ 16分 完了なし')
  expect(seen.toasts).toEqual(['progress-pane: 15 分タスクが完了していません'])
})
