import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// エンジン側の代役: タスク系は成功を返し、Bash は fail が含まれるときだけ失敗を返す
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

test('タスクの進捗をステータスラインに出す', async ($, on) => {
  const seen = engine(on)
  await $.tool.call({ tool: 'TaskCreate', subject: 'テストを書く', description: 'x' })
  await $.tool.call({ tool: 'TaskCreate', subject: '実装する', description: 'x' })
  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'in_progress', activeForm: 'テストを書いています' })
  expect(seen.last()).toBe('進捗 0/2 · ▶ テストを書いています')
  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'completed' })
  expect(seen.last()).toBe('進捗 1/2')
})

test('3回続けて失敗したら1度だけトーストで知らせ、成功で解除する', async ($, on) => {
  const seen = engine(on)
  for (let i = 0; i < 4; i++) await $.tool.call(bash('npm test # fail'))
  expect(seen.last()).toBe('⚠ 連続失敗 4')
  expect(seen.toasts).toHaveLength(1)
  expect(seen.toasts[0]).toContain('3 回続けて失敗')
  await $.tool.call(bash('ls'))
  expect(seen.last()).toBeUndefined()
  const out = await $.command.run({
    command: 'stuck',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })
  expect(out.text).toContain('npm test failed')
})

test('未完了タスクがあるまま15分完了がなければ知らせる', async ($, on) => {
  const seen = engine(on)
  await $.tool.call({ tool: 'TaskCreate', subject: '調査', description: 'x' })
  await seen.clock.advance(16 * 60 * 1000)
  await $.tool.call(bash('ls'))
  expect(seen.last()).toBe('進捗 0/1 · ⚠ 16分 完了なし')
  expect(seen.toasts[0]).toContain('16 分タスクが完了していません')
})
