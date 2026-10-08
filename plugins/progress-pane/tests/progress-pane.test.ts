import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { applyResponse, claimOf, parsePlan } from '../hooks/plan'

// html-plan の SKILL.md の形どおりの最小の計画ページ
const PLAN = `<!doctype html>
<h1>Scheduling Sent Messages in PostBox</h1>
<doc-plan>
  <doc-claim>
    <p>The user can pick a time in the composer.</p>
    <doc-mock frame="none">…</doc-mock>
    <doc-claim>
      <p>“Send later” saves the message with a time.</p>
      <doc-claim at="server/src/scheduled/routes.ts:18"><p><b>routes.ts:18</b> · createScheduled()</p></doc-claim>
    </doc-claim>
    <doc-claim>
      <p>A user can hold 50 scheduled messages at most.</p>
      <doc-ask id="limit"><p>How many scheduled messages per user?</p><label><input type="radio" name="limit" value="50" checked> 50</label></doc-ask>
    </doc-claim>
  </doc-claim>
  <doc-claim>
    <p>A failed send retries &amp; tells the user.</p>
    <doc-ask id="retry"><p>Should a failed send retry on its own?</p></doc-ask>
  </doc-claim>
  <doc-claim aux="shared"><p>Shared: one new table.</p><doc-ask id="keep"><p>How long do sent rows stay?</p></doc-ask></doc-claim>
  <doc-claim aux="scope"><p>Not changing: drafts.</p></doc-claim>
</doc-plan>`

const RESPONSE = `# Re: Scheduling Sent Messages in PostBox
## Decisions
1. [1.2] How many scheduled messages per user?
   → **500** \`500\`  ✎ (was: 50)
2. [2] Should a failed send retry on its own?  _(not opened; default kept)_
   → **Yes, 3 times** \`3\`
## Comments
- none`

// エンジン側の代役: タスク系と Write は成功を返し、Bash は fail が含まれるときだけ失敗を返す
const engine = (on: On) => {
  const clock = mock.clock(on, { now: 0 })
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  let nextId = 0
  on('ui.status', ($, e) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.open', () => ({ value: { isDrawn: true } }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('tool.call', { tool: 'Write' }, () => ({ result: { type: 'create', filePath: 'plan.html', content: '', structuredPatch: [] } }) as never)
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
  return { clock, statuses, toasts, last: () => statuses[statuses.length - 1] }
}

const bash = (command: string) => ({ tool: 'Bash' as const, command, description: 'run' })
const PANE = { component: 'Pane' as const, requestId: 'progress', props: { title: '進捗', isFocused: false, bodyColumns: 100, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 30 }, view: {} } }
const paste = (text: string) => ({ text, wait: false, origin: { kind: 'composer' as const } })

describe('plan.ts', () => {
  test('html-plan のページから題名・レベル1の主張・決定を読む', () => {
    const plan = parsePlan('plan.html', PLAN)
    expect(plan.title).toBe('Scheduling Sent Messages in PostBox')
    expect(plan.claims).toEqual([
      { no: '1', text: 'The user can pick a time in the composer.' },
      { no: '2', text: 'A failed send retries & tells the user.' },
    ])
    expect(plan.asks.map(a => [a.id, a.no])).toEqual([['limit', '1.2'], ['retry', '2'], ['keep', '']])
  })

  test('Respond の回答を決定の状態に変える。題名が違う回答は無視する', () => {
    const plan = applyResponse(parsePlan('plan.html', PLAN), RESPONSE)
    expect(plan?.asks.map(a => [a.id, a.state, a.answer])).toEqual([
      ['limit', 'changed', '500'],
      ['retry', 'unopened', 'Yes, 3 times'],
      ['keep', 'open', null],
    ])
    expect(applyResponse(parsePlan('plan.html', PLAN), '# Re: Something else\n## Decisions')).toBeNull()
  })

  test('主張番号は角括弧つきだけ読む', () => {
    expect(claimOf('[1.2] 上限を 500 にする')).toBe('1.2')
    expect(claimOf('3 files を直す')).toBeNull()
  })
})

test('計画を書くと回答待ち、貼り戻すと未確認の決定、タスクは主張の下にまとまる', async ($, on) => {
  const seen = engine(on)
  await $.tool.call({ tool: 'Write', file_path: 'plan.html', content: PLAN })
  expect(seen.last()).toBe('計画の回答待ち（決定 3 件）')

  await $.prompt.submit(paste(RESPONSE))
  expect(seen.last()).toBe('計画に回答済み・実装の準備中 · ⚠ 未確認の決定 1')

  await $.tool.call({ tool: 'TaskCreate', subject: '[1.2] 上限を 500 にする', description: 'x' })
  await $.tool.call({ tool: 'TaskCreate', subject: 'README を直す', description: 'x' })
  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'completed' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'progress-pane', surface, ...PANE })
    expect(await ui.find({ type: 'Text', text: /^実装中 1\/2$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '1. The user can pick a time in the composer. [1/1]' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'How many scheduled messages per user? → 500（変更して回答）' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /retry on its own\? → Yes, 3 times（⚠ 開かずに既定のまま/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '共通の決定' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'How long do sent rows stay?' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'README を直す' })).toBeDefined()
    await ui.unmount()
  }
})

test('タスクの進捗と実行中の1件をステータスラインに出す', async ($, on) => {
  const seen = engine(on)
  await $.tool.call({ tool: 'TaskCreate', subject: 'テストを書く', description: 'x' })
  await $.tool.call({ tool: 'TaskCreate', subject: '実装する', description: 'x' })
  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'in_progress', activeForm: 'テストを書いています' })
  expect(seen.last()).toBe('実装中 0/2 · ▶ テストを書いています')
  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'completed' })
  expect(seen.last()).toBe('実装中 1/2')
})

test('3回続けて失敗したら1度だけトーストで知らせ、成功で解除する', async ($, on) => {
  const seen = engine(on)
  for (let i = 0; i < 4; i++) await $.tool.call(bash('npm test # fail'))
  expect(seen.last()).toBe('⚠ 連続失敗 4')
  expect(seen.toasts).toHaveLength(1)
  expect(seen.toasts[0]).toContain('3 回続けて失敗')
  await $.tool.call(bash('ls'))
  expect(seen.last()).toBeUndefined()
  const ui = await $.ui.mount({ plugin: 'progress-pane', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: 'Bash: npm test failed' })).toBeDefined()
})

test('未完了タスクがあるまま15分完了がなければ知らせる', async ($, on) => {
  const seen = engine(on)
  await $.tool.call({ tool: 'TaskCreate', subject: '調査', description: 'x' })
  await seen.clock.advance(16 * 60 * 1000)
  await $.tool.call(bash('ls'))
  expect(seen.last()).toBe('実装中 0/1 · ⚠ 16分 完了なし')
  expect(seen.toasts[0]).toContain('16 分タスクが完了していません')
})
