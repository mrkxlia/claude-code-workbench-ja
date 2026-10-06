#!/usr/bin/env python3
"""workbench-ja の各スキルが残す状態ファイルを読み、進み具合を1行（statusline）と HTML 1枚に出す。

LLM を使わない決定的スクリプト。標準ライブラリだけで動く。読むのは存在するファイルだけで、
無いものは黙って飛ばす。状態を書き換えることはない（書くのは .dashboard/ 配下だけ）。

  python3 progress.py statusline   # statusLine 用。標準入力の JSON（cwd）を読み、1行を返す。HTML も更新する
  python3 progress.py html [DIR]   # DIR（既定: カレント）の .dashboard/index.html を書き、パスを表示する
"""
import datetime
import glob
import html
import json
import os
import re
import sys

HTML_MIN_INTERVAL = 30  # statusline から HTML を作り直す最短間隔（秒）

CHECK_RE = re.compile(r"^\s*- \[( |x|X)\] (.+)$")
REJECT_RE = re.compile(r"差し戻し\s*(\d+)\s*/\s*(\d+)")


def parse_checklist(path):
    """Markdown のチェックボックス行を (done, text) の列で返す。"""
    items = []
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                m = CHECK_RE.match(line.rstrip("\n"))
                if m:
                    items.append((m.group(1) != " ", m.group(2).strip()))
    except OSError:
        pass
    return items


def pipeline_entry(path, kind):
    items = parse_checklist(path)
    if not items:
        return None
    slug = os.path.basename(os.path.dirname(path))
    done = sum(1 for d, _ in items if d)
    current = next((t for d, t in items if not d), None)
    waiting = gate = None
    if current and "🛑" in current:
        # 「→ 🛑 ストーリー承認（承認: ／方式: ）」から承認名を取り出す
        gate = re.split(r"[（(]", current.split("🛑", 1)[1], maxsplit=1)[0].strip()
        # 未チェック行の 🛑 は「このフェーズの終わりにある関門」。そのフェーズの成果物
        # （「→ brief.md 保存」）が既にあるときだけ承認待ちとみなす。判別できなければ関門の予告に留める
        saved = re.findall(r"(\S+\.md) 保存", current)
        if saved and all(os.path.isfile(os.path.join(os.path.dirname(path), s)) for s in saved):
            waiting, gate = gate, None
    rejects = [f"{a}/{b}" for a, b in REJECT_RE.findall(current or "")]
    phase = re.match(r"(Phase\s*\d+)", current or "")
    return {
        "kind": kind,
        "name": slug,
        "source": path,
        "done": done,
        "total": len(items),
        "current": current or "完了",
        "short": phase.group(1).replace(" ", "") if phase else ("完了" if not current else current[:12]),
        "waiting": waiting,
        "rejects": rejects,
        "gate": gate,
        "finished": current is None,
    }


def collect(root):
    entries = []
    for p in sorted(glob.glob(os.path.join(root, "docs/task-pipeline/*/status.md"))):
        e = pipeline_entry(p, "task-pipeline")
        if e:
            entries.append(e)
    return entries


def statusline_text(entries):
    active = [e for e in entries if not e["finished"]]
    if not active:
        return ""
    parts = []
    for e in active:
        s = f"{e['kind']}:{e['name'][:20]} {e['short']}"
        if e["waiting"]:
            s += f" 🛑{e['waiting']}待ち"
        elif e.get("gate"):
            s += f" →{e['gate']}"
        parts.append(s)
    return " | ".join(parts)


def rel(path, root):
    try:
        return os.path.relpath(path, root)
    except ValueError:
        return path


def render_html(entries, root):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    waiting = [e for e in entries if e["waiting"]]
    active = [e for e in entries if not e["finished"]]
    finished = [e for e in entries if e["finished"]]

    def card(e):
        pct = int(100 * e["done"] / e["total"]) if isinstance(e["total"], int) and e["total"] else 0
        bar = f'<div class="bar"><span style="width:{pct}%"></span></div>' if e["total"] else ""
        badges = ""
        if e["waiting"]:
            badges += f'<span class="badge stop">停止中: {html.escape(e["waiting"])}</span>'
        if e.get("gate"):
            badges += f'<span class="badge">次の関門: {html.escape(e["gate"])}</span>'
        for r in e["rejects"]:
            badges += f'<span class="badge">差し戻し {html.escape(r)}</span>'
        return (f'<article class="card{" is-stop" if e["waiting"] else ""}">'
                f'<header><span class="kind">{html.escape(e["kind"])}</span>'
                f'<h3>{html.escape(str(e["name"]))}</h3></header>'
                f'<p class="now">{html.escape(str(e["current"]))}</p>{bar}'
                f'<p class="meta">{e["done"]} / {e["total"]} {badges}</p>'
                f'<p class="src">出典: <code>{html.escape(rel(e["source"], root))}</code></p></article>')

    if waiting:
        stop = "".join(f'<li><b>{html.escape(e["kind"])}:{html.escape(str(e["name"]))}</b> — '
                       f'{html.escape(e["waiting"])}（<code>{html.escape(rel(e["source"], root))}</code>）</li>'
                       for e in waiting)
        stop_html = f'<section class="alert"><h2>あなたの判断を待っています</h2><ul>{stop}</ul></section>'
    else:
        stop_html = ""
    body = stop_html
    body += "<h2>進行中</h2>" + ("".join(card(e) for e in active) or '<p class="empty">進行中の作業なし</p>')
    if finished:
        body += "<h2>完了</h2>" + "".join(card(e) for e in finished)
    return f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="10">
<title>進捗ボード</title>
<style>
:root {{ --bg:#f7f7f5; --fg:#1d1d1b; --muted:#6b6b66; --card:#fff; --line:#e3e3de; --accent:#2f6fde; --stop:#c2410c; --stopbg:#fff3ea; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#16171a; --fg:#ecece8; --muted:#9a9a94; --card:#1f2024; --line:#2e2f34; --accent:#7aa7ff; --stop:#fb923c; --stopbg:#2a1d14; }} }}
* {{ box-sizing:border-box; }}
body {{ margin:0; padding:24px 16px; background:var(--bg); color:var(--fg); font:15px/1.6 system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif; }}
main {{ max-width:860px; margin:0 auto; }}
.stamp {{ font-size:28px; font-weight:700; letter-spacing:.02em; margin:0; }}
.sub {{ color:var(--muted); margin:2px 0 20px; }}
h2 {{ font-size:15px; color:var(--muted); margin:24px 0 8px; font-weight:600; }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 16px; margin:0 0 10px; }}
.card.is-stop {{ border-color:var(--stop); }}
.card header {{ display:flex; gap:10px; align-items:baseline; }}
.card h3 {{ margin:0; font-size:16px; overflow-wrap:anywhere; }}
.kind {{ font-size:12px; color:var(--accent); font-weight:600; }}
.now {{ margin:6px 0; overflow-wrap:anywhere; }}
.meta, .src {{ margin:4px 0 0; color:var(--muted); font-size:13px; }}
.bar {{ height:6px; background:var(--line); border-radius:3px; overflow:hidden; }}
.bar span {{ display:block; height:100%; background:var(--accent); }}
.badge {{ display:inline-block; margin-left:6px; padding:0 8px; border-radius:999px; border:1px solid var(--line); font-size:12px; }}
.badge.stop {{ color:var(--stop); border-color:var(--stop); }}
.alert {{ background:var(--stopbg); border:1px solid var(--stop); border-radius:10px; padding:10px 16px; }}
.alert h2 {{ color:var(--stop); margin:4px 0; }}
.alert ul {{ margin:4px 0; padding-left:20px; }}
.empty {{ color:var(--muted); }}
code {{ font-size:12px; overflow-wrap:anywhere; }}
</style></head>
<body><main>
<p class="stamp">{now}</p>
<p class="sub">生成時刻（この時点の状態ファイルから作成。statusline が動いている間は自動で作り直されます）／ {html.escape(root)}</p>
{body}
</main></body></html>
"""


def write_html(root, entries):
    d = os.path.join(root, ".dashboard")
    os.makedirs(d, exist_ok=True)
    gi = os.path.join(d, ".gitignore")
    if not os.path.exists(gi):
        with open(gi, "w", encoding="utf-8") as f:
            f.write("*\n")
    out = os.path.join(d, "index.html")
    tmp = out + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(render_html(entries, root))
    os.replace(tmp, out)  # 書きかけをブラウザに読ませない
    return out


def main(argv):
    cmd = argv[1] if len(argv) > 1 else "statusline"
    if cmd == "statusline":
        root = os.getcwd()
        try:
            data = json.load(sys.stdin)
            root = (data.get("workspace") or {}).get("current_dir") or data.get("cwd") or root
        except (ValueError, OSError):
            pass
        entries = collect(root)
        print(statusline_text(entries))
        if entries:
            out = os.path.join(root, ".dashboard", "index.html")
            try:
                stale = (datetime.datetime.now().timestamp() - os.path.getmtime(out)) >= HTML_MIN_INTERVAL
            except OSError:
                stale = True
            if stale:
                try:
                    write_html(root, entries)
                except OSError:
                    pass  # statusline 表示は止めない
        return 0
    if cmd == "html":
        root = os.path.abspath(argv[2]) if len(argv) > 2 else os.getcwd()
        print(write_html(root, collect(root)))
        return 0
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
