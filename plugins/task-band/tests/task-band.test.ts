import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { EMPTY, idleMinutes, itemLabel, meter, parseStatus, replaceTodos, restartClock, setItem } from '../hooks/model'

const working = { turnActive: true, inFlight: 0 }

// エンジン側の代役: タスク系・TodoWrite は成功を返す。files はリポジトリのファイル（パス → [中身, 更新時刻]）
const engine = (on: On, files: Record<string, [string, number]> = {}) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const toasts: string[] = []
  let nextId = 0
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.invalidate', () => ({ value: undefined }))
  // 帯が何も描かないとき（next に渡したとき）の、エンジン自身の帯の代役
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', props: {}, children: [] }) as never)
  on('command.register', () => ({ value: { command: 'task-band' } }))
  on('session.start', () => ({ cwd: '' }) as never)
  on('session.end', () => ({ sessionId: 's' }))
  on('turn.start', () => ({ turnId: 't' }))
  on('turn.complete', () => ({ text: '' }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('tool.call', { tool: 'TodoWrite' }, ($, e) => ({ result: { oldTodos: [], newTodos: [...e.todos] } }))
  on('tool.call', { tool: 'TaskCreate' }, ($, e) => ({ result: { task: { id: String(++nextId), subject: e.subject } } }))
  on('tool.call', { tool: 'TaskUpdate' }, ($, e) => ({
    result: { success: true, taskId: e.taskId, updatedFields: ['status'] },
  }))
  // エンジンは相対パスを作業ディレクトリで絶対パスにしてから渡す。代役は docs/ から先だけを見る
  const rel = (path: string) => path.slice(Math.max(0, path.indexOf('docs/')))
  on('fs.list', ($, e) => {
    const prefix = `${rel(e.path)}/`
    const names = new Map<string, { kind: 'file' | 'dir'; mtimeMs: number }>()
    for (const [path, [, mtimeMs]] of Object.entries(files)) {
      if (!path.startsWith(prefix)) continue
      const [name, ...rest] = path.slice(prefix.length).split('/')
      names.set(name!, rest.length > 0 ? { kind: 'dir', mtimeMs: 0 } : { kind: 'file', mtimeMs })
    }
    if (names.size === 0) throw new Error('ENOENT')
    return { value: [...names].map(([name, x]) => ({ name, kind: x.kind, size: 0, mtimeMs: x.mtimeMs, isLink: false })) }
  })
  on('fs.read', ($, e) => {
    const f = files[rel(e.path)]
    if (!f) throw new Error('ENOENT')
    return { value: f[0] }
  })
  on('tool.call', { tool: 'Write' }, () => ({ result: { type: 'update' } }) as never)
  return { clock, toasts, files }
}

// task-pipeline の status.md（テンプレートどおり）。done は済んだフェーズの数
const status = (done: number, review = '差し戻し 0/3') =>
  [
    '# パイプラインの進行状況',
    '- [ ] Phase 0: 準備',
    '- [ ] Phase 1: Research → research.md 保存',
    '- [ ] Phase 2: Requirements → grilling で要件を詰める → requirements.md 保存 → 🛑 要件承認（承認: ／方式: ）',
    '- [ ] Phase 3: Brief → grilling で構成を詰める → brief.md 保存 → 🛑 ブリーフ承認（承認: ／方式: ）',
    '- [ ] Phase 4: Build',
    `- [ ] Phase 5: Review — ${review} → 🛑 最終レビュー（承認: ）`,
  ]
    .map((l, i) => (i >= 1 && i <= done ? l.replace('[ ]', '[x]') : l))
    .join('\n')

const boot = ($: Engine) => $.session.start({ cwd: '', surface: 'terminal', isInteractive: true } as never)
const startTurn = ($: Engine) => $.turn.start({ text: '', turnId: 't' } as never)
const endTurn = ($: Engine) => $.turn.complete({ text: '', reason: 'end_turn' } as never)
const say = ($: Engine, text: string, kind = 'composer') => $.prompt.submit({ text, wait: false, origin: { kind } } as never)
const create = ($: Engine, subject: string) => $.tool.call({ tool: 'TaskCreate', subject, description: 'x' })
const updateTask = ($: Engine, taskId: string, status: 'in_progress' | 'completed', activeForm?: string) =>
  $.tool.call({ tool: 'TaskUpdate', taskId, status, ...(activeForm ? { activeForm } : {}) })
const band = (surface: 'terminal' | 'desktop', bodyColumns = 120) => ({
  plugin: 'task-band',
  surface,
  component: 'AbovePrompt' as const,
  props: { hasSurvey: false, isWorking: true, maxRows: 10, bodyColumns, scroll: { offset: 0, bodyRows: 10 }, view: {} } as never,
})
// 帯に描かれた1行の文字（入れ子の Text をつないだもの）
const row = async ($: Engine, surface: 'terminal' | 'desktop' = 'terminal', bodyColumns = 120) => {
  const ui = await $.ui.mount(band(surface, bodyColumns))
  const texts = await ui.findAll({ type: 'Text' })
  await ui.unmount()
  return texts[0]?.text ?? null
}

describe('model.ts', () => {
  test('前の完了から時間がたってから新しいタスクを足しても、すぐ詰まりにしない', () => {
    let b = setItem(EMPTY, '1', { status: 'completed', subject: '前の仕事' }, 1000)
    b = setItem(b, '2', { status: 'pending', subject: '次の仕事' }, 1000 + 20 * 60 * 1000)
    expect(idleMinutes(b, working, 1000 + 20 * 60 * 1000)).toBeNull()
  })

  test('TodoWrite で一覧を差し替えても、実行中の項目の経過時間を引き継ぐ', () => {
    const todo = (content: string, status: 'pending' | 'in_progress') => ({ content, status, activeForm: `${content}中` })
    let b = replaceTodos(EMPTY, [todo('A', 'in_progress')], 0)
    b = replaceTodos(b, [todo('A', 'in_progress'), todo('B', 'pending')], 5 * 60 * 1000)
    expect(b.items['todo-0']?.startedAt).toBe(0)
  })

  test('完了したタスクは進行形ではなく件名で見せる', () => {
    let b = setItem(EMPTY, '1', { status: 'in_progress', subject: 'テストを書く', activeForm: 'テストを書いています' }, 0)
    expect(itemLabel(b.items['1']!)).toBe('テストを書いています')
    b = setItem(b, '1', { status: 'completed' }, 1)
    expect(itemLabel(b.items['1']!)).toBe('テストを書く')
  })

  test('ツールの実行中（長いビルド・質問）と人の番は詰まりと数えない', () => {
    const at = (min: number) => 1000 + min * 60 * 1000
    const b = restartClock(setItem(EMPTY, '1', { status: 'pending', subject: 'ビルド' }, at(0)), at(0))
    expect(idleMinutes(b, { ...working, inFlight: 1 }, at(16))).toBeNull()
    expect(idleMinutes(b, { ...working, turnActive: false }, at(16))).toBeNull()
    expect(idleMinutes(b, working, at(16))).toBe(16)
  })

  test('status.md: 成果物が保存済みの関門だけを承認待ちにし、まだなら次の関門として予告する', () => {
    expect(parseStatus(status(3), 'auth', new Set(['status.md', 'brief.md']))).toMatchObject({
      phase: 'Phase3',
      done: 3,
      total: 6,
      waiting: 'ブリーフ承認',
      gate: null,
    })
    expect(parseStatus(status(3), 'auth', new Set(['status.md']))).toMatchObject({ waiting: null, gate: 'ブリーフ承認' })
  })

  test('status.md: 差し戻しの回数を拾い、全部済んだら null', () => {
    expect(parseStatus(status(5, '差し戻し 2/3'), 'auth', new Set())?.rejects).toBe('2/3')
    expect(parseStatus(status(6), 'auth', new Set())).toBeNull()
    expect(parseStatus('チェック行なし', 'auth', new Set())).toBeNull()
  })

  test('メーターはタスクが多いと幅に合わせて縮める', () => {
    expect(meter(2, 5, 16)).toEqual({ filled: '▰▰', empty: '▱▱▱' })
    expect(meter(20, 40, 8)).toEqual({ filled: '▰▰▰▰', empty: '▱▱▱▱' })
  })
})

test('帯: 進捗・実行中のタスクと経過時間・次のタスクを1行で出す（terminal と desktop）', async ($, on) => {
  const seen = engine(on)
  await boot($)
  await create($, 'テストを書く')
  await create($, 'API を書く')
  await create($, 'README を直す')
  await updateTask($, '1', 'completed')
  await updateTask($, '2', 'in_progress', 'API を書いています')
  await seen.clock.advance(4 * 60 * 1000 + 2000)
  for (const surface of ['terminal', 'desktop'] as const) {
    expect(await row($, surface)).toBe('▰▱▱ 1/3  ▶ API を書いています  4:02  次: README を直す')
  }
  // 狭いときは「次」を省く
  expect(await row($, 'terminal', 70)).toBe('▰▱▱ 1/3  ▶ API を書いています  4:02')
})

test('帯: タスクが無ければ何も出さない。全部終わったら完了を出し、人が次を送ったら畳む', async ($, on) => {
  engine(on)
  expect(await row($)).toBeNull()
  await create($, 'A')
  await updateTask($, '1', 'completed')
  expect(await row($)).toBe('▰ ✔ 1/1 完了')
  await say($, '<task-notification>', 'task-notification')
  expect(await row($)).toBe('▰ ✔ 1/1 完了')
  await say($, '次はこれお願い')
  expect(await row($)).toBeNull()
  await create($, 'B')
  expect(await row($)).toBe('▰▱ 1/2  実行中のタスクなし')
})

test('ターン中に15分完了がなければ帯を黄色にして1度だけ知らせる。人の番の時間は数えない', async ($, on) => {
  const seen = engine(on)
  await boot($)
  await create($, '調査')
  await seen.clock.advance(20 * 60 * 1000)
  expect(await row($)).toBe('▱ 0/1  実行中のタスクなし')
  expect(seen.toasts).toEqual([])
  await startTurn($)
  await seen.clock.advance(16 * 60 * 1000)
  expect(await row($)).toBe('▱ 0/1  実行中のタスクなし  ⚠ 16分 完了なし')
  expect(seen.toasts).toEqual(['task-band: 15 分タスクが完了していません'])
  await endTurn($)
})

test('サブエージェントのツール呼び出しやターン終了は、メインの状態を動かさない', async ($, on) => {
  const seen = engine(on)
  await boot($)
  await create($, '調査')
  await startTurn($)
  await $.turn.complete({ text: '', reason: 'end_turn', agentId: 'sub-1' } as never)
  await seen.clock.advance(16 * 60 * 1000)
  expect(seen.toasts).toEqual(['task-band: 15 分タスクが完了していません'])
})

test('/task-band off で隠し、on で戻す。list で全タスクを出す', async ($, on) => {
  engine(on)
  await create($, 'A')
  await create($, 'B')
  const run = (args: string) =>
    $.command.run({ command: 'task-band', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as never)
  await run('off')
  expect(await row($)).toBeNull()
  await run('on')
  expect(await row($)).toBe('▱▱ 0/2  実行中のタスクなし')
  const out = await run('list')
  expect((out as { text: string }).text).toBe('タスク 0/2\n○ A\n○ B')
})

test('/clear で会話が替わったら前の会話のタスクを捨てる', async ($, on) => {
  engine(on)
  await create($, 'A')
  await $.session.end({ reason: 'clear', sessionId: 's', resume: {} } as never)
  expect(await row($)).toBeNull()
})

test('並列のツール呼び出しの中で詰まりに入っても、トーストは1度だけ', async ($, on) => {
  const seen = engine(on)
  await boot($)
  await create($, '調査')
  await startTurn($)
  await seen.clock.advance(16 * 60 * 1000)
  await Promise.all([create($, 'x'), create($, 'y'), create($, 'z')])
  expect(seen.toasts).toHaveLength(1)
})

test('パイプライン: タスクが無くても、進行中の task-pipeline のフェーズと承認待ちを出す', async ($, on) => {
  engine(on, {
    'docs/task-pipeline/auth/status.md': [status(3), 2],
    'docs/task-pipeline/auth/brief.md': ['', 2],
    'docs/task-pipeline/old/status.md': [status(1), 1],
    'docs/task-pipeline/done/status.md': [status(6), 3],
  })
  await boot($)
  for (const surface of ['terminal', 'desktop'] as const) {
    expect(await row($, surface)).toBe('◆ auth Phase3 (+1)  🛑 ブリーフ承認待ち')
  }
})

test('パイプライン: タスクと並べて出し、status.md が書かれたら読み直す', async ($, on) => {
  const seen = engine(on, { 'docs/task-pipeline/auth/status.md': [status(2), 1] })
  await boot($)
  await create($, '図を描く')
  expect(await row($)).toBe('◆ auth Phase2  → 要件承認  │  ▱ 0/1  実行中のタスクなし')
  seen.files['docs/task-pipeline/auth/requirements.md'] = ['', 2]
  await $.tool.call({ tool: 'Write', file_path: 'docs/task-pipeline/auth/requirements.md', content: '' } as never)
  expect(await row($)).toBe('◆ auth Phase2  🛑 要件承認待ち  │  ▱ 0/1  実行中のタスクなし')
})

test('パイプライン: docs/task-pipeline が無いリポジトリでは何も出さない', async ($, on) => {
  engine(on)
  await boot($)
  expect(await row($)).toBeNull()
})
