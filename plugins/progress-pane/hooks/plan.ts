// html-plan（anthropics/claude-plugins-community）の計画ページと、その Respond の回答を読む。
// DOM が無い環境なので、html-plan が書く要素（h1・doc-claim・doc-ask・p）だけを正規表現で拾う。
import type { Ask, AskState, Claim, Plan } from '../types'

const TOKEN =
  /<h1\b[^>]*>([\s\S]*?)<\/h1>|<doc-claim\b([^>]*)>|<\/doc-claim>|<doc-ask\b[^>]*\bid="([^"]+)"[^>]*>|<p\b[^>]*>([\s\S]*?)<\/p>/g

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' }

export const plainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, k: string) => ENTITIES[k] ?? '')
    .replace(/\s+/g, ' ')
    .trim()

export const isPlanPage = (text: string) => text.includes('<doc-plan')

// 主張は html-plan と同じ規則で番号を振る（1, 1.1, 1.1.1）。aux（shared・scope）は番号の外
export const parsePlan = (path: string, html: string): Plan => {
  let title = ''
  const claims: Claim[] = []
  const asks: Ask[] = []
  const stack: { no: string; children: number; isAux: boolean }[] = []
  let topCount = 0
  let waiting: { kind: 'claim'; no: string } | { kind: 'ask'; id: string; no: string } | null = null

  for (const m of html.matchAll(TOKEN)) {
    const [whole, h1, claimAttrs, askId, p] = m
    if (h1 !== undefined) {
      title = plainText(h1)
    } else if (claimAttrs !== undefined) {
      const parent = stack[stack.length - 1]
      const isAux = /\baux=/.test(claimAttrs) || parent?.isAux === true
      let no = ''
      if (!isAux) {
        no = parent ? `${parent.no}.${++parent.children}` : String(++topCount)
      }
      stack.push({ no, children: 0, isAux })
      waiting = isAux ? null : { kind: 'claim', no }
    } else if (whole === '</doc-claim>') {
      stack.pop()
      waiting = null
    } else if (askId !== undefined) {
      waiting = { kind: 'ask', id: askId, no: stack[stack.length - 1]?.no ?? '' }
    } else if (p !== undefined && waiting) {
      if (waiting.kind === 'claim' && !waiting.no.includes('.')) {
        claims.push({ no: waiting.no, text: plainText(p) })
      } else if (waiting.kind === 'ask') {
        asks.push({ id: waiting.id, no: waiting.no, question: plainText(p), state: 'open', answer: null })
      }
      waiting = null
    }
  }

  return { path, title, claims, asks, isAnswered: false }
}

const DECISION = /^\d+\.\s+(?:\[([\d.]+)\]\s+)?(.*?)(?:\s+_\((kept as proposed|not opened; default kept)\)_)?\s*$/
const ANSWER = /^\s*→\s*\*\*(.+?)\*\*/

// Respond が出す「# Re: <題名>」の markdown から、決定ごとの回答と状態を読む
export const applyResponse = (plan: Plan, text: string): Plan | null => {
  const head = text.match(/^#\s+Re:\s*(.+)$/m)
  if (!head || plainText(head[1] ?? '') !== plan.title) return null

  const lines = text.split('\n')
  const start = lines.findIndex(l => /^##\s+Decisions/.test(l))
  if (start < 0) return { ...plan, isAnswered: true }

  const asks = plan.asks.map(a => ({ ...a }))
  for (let i = start + 1; i < lines.length && !/^##\s/.test(lines[i] ?? ''); i++) {
    const m = (lines[i] ?? '').match(DECISION)
    if (!m) continue
    const [, no, question, suffix] = m
    const ask =
      asks.find(a => a.question === plainText(question ?? '')) ?? asks.find(a => no !== undefined && a.no === no)
    if (!ask) continue
    const state: AskState =
      suffix === 'kept as proposed' ? 'kept' : suffix === 'not opened; default kept' ? 'unopened' : 'changed'
    ask.state = state
    ask.answer = (lines[i + 1] ?? '').match(ANSWER)?.[1] ?? null
  }
  return { ...plan, asks, isAnswered: true }
}

// タスク名の先頭の主張番号（"[1.2] …"）を読む。角括弧つきだけを読み、"3 files" のような数字は拾わない
export const claimOf = (label: string) => label.match(/^\s*\[(\d+(?:\.\d+)*)\]/)?.[1] ?? null
