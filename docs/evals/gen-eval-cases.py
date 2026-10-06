"""docs/evals の Markdown から `claude plugin eval` のケースを生成する。

使い方: python3 docs/evals/gen-eval-cases.py <plugin> <出力ディレクトリ>
  例: python3 docs/evals/gen-eval-cases.py model-setup /tmp/x/model-setup/evals

生成するもの:
  - 発火ケース: triggers.md の「## <plugin>」表の1行 = 1ケース（tool_used グレーダー）
  - シナリオケース: <skill>.md の「## S-n」1節 = 1ケース（入力をプロンプトに、判定基準を llm グレーダーの
    ルーブリックにする）。対象スキルが <plugin> に属するファイルだけを読む。前提の状態が要る節
    （入力がコードブロックで無いもの、入力の注記に「観察」「2セッション」「状態で」を含むもの）は単独のプロンプトでは再現できないので生成しない

リポジトリのプラグインに evals/ を置かないため、出力先はプラグインを一時ディレクトリにコピーした先にする。
Markdown 側を正とし、生成物は手で編集しない。
"""
import pathlib
import re
import sys

plugin, out = sys.argv[1], pathlib.Path(sys.argv[2])
here = pathlib.Path(__file__).parent
repo = here.parent.parent
written = 0


def write_case(name, prompt, graders, max_turns, tools, tags):
    global written
    d = out / name
    (d / "graders").mkdir(parents=True, exist_ok=True)
    (d / "prompt.md").write_text(
        f"---\nmax_turns: {max_turns}\nallowed_tools: [{', '.join(tools)}]\ntags: [{', '.join(tags)}]\n---\n\n{prompt}\n",
        encoding="utf-8")
    for gname, body in graders.items():
        (d / "graders" / f"{gname}.md").write_text(body, encoding="utf-8")
    written += 1


def fired(skill, expect):
    bound = "min: 1" if expect == "should" else "min: 0\nmax: 0"
    return (f"---\ntype: tool_used\ntool: Skill\n"
            f"input_match: '\"skill\"\\s*:\\s*\"(?:[\\w-]+:)?{skill}\"'\n{bound}\n---\n")


# 発火ケース — Skill ツールだけを許し、1〜2ターンで「どのスキルを呼んだか」だけを見る
src = (here / "triggers.md").read_text(encoding="utf-8")
m = re.search(rf"^## {re.escape(plugin)}\n(.*?)(?=^## |\Z)", src, re.S | re.M)
if m:
    rows = [[c.strip() for c in line.strip().strip("|").split("|")]
            for line in m.group(1).splitlines() if line.startswith("|") and not line.startswith("|---")][1:]
    counter = {}
    for skill, expect, prompt in rows:
        counter[(skill, expect)] = counter.get((skill, expect), 0) + 1
        write_case(f"{skill}-{expect}-{counter[(skill, expect)]}", prompt, {"fired": fired(skill, expect)},
                   2, ["Skill"], [skill, expect, "trigger"])

# シナリオケース — 最初の応答の振る舞いを llm グレーダーで採点する（--judge-model で判定役を選べる）
skipped = []
for md in sorted(here.glob("*.md")):
    skill = md.stem
    if not (repo / "plugins" / plugin / "skills" / skill / "SKILL.md").is_file():
        continue
    text = md.read_text(encoding="utf-8")
    for sec in re.split(r"^(?=## S-\d)", text, flags=re.M)[1:]:
        sid = re.match(r"## (S-\d+)", sec).group(1)
        head = re.search(r"^\*\*入力\*\*([^\n]*)", sec, re.M)
        im = re.search(r"^\*\*入力\*\*[^\n]*\n+```[^\n]*\n(.*?)\n```", sec, re.S | re.M)
        if not im or (head and re.search(r"観察|2セッション|状態で", head.group(1))):
            skipped.append(f"{skill} {sid}")
            continue
        cm = re.search(r"^\*\*判定基準\*\*[^\n]*\n((?:\d+\. [^\n]*\n?)+)", sec, re.M)
        if not cm:
            sys.exit(f"ERROR: {md.name} {sid} に判定基準が無い")
        criteria = cm.group(1).strip()
        rubric = ("---\ntype: llm\nfocus: trace\n---\n\n"
                  "次の判定基準を**すべて**満たしていれば PASS。1つでも満たさなければ FAIL。\n"
                  "モデル名で条件が分かれている項目は、このセッションのモデルに当てはまるものだけで判定する。\n\n"
                  f"{criteria}\n")
        write_case(f"{skill}-{sid.lower()}", im.group(1).strip(), {"criteria": rubric},
                   10, ["Read", "Glob", "Grep", "Skill", "Agent", "Workflow", "WebSearch", "WebFetch"], [skill, "scenario"])

print(f"{written} cases -> {out}")
if skipped:
    print("生成しなかった（前提の状態が要る）: " + ", ".join(skipped))
