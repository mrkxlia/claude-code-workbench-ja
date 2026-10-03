"""docs/evals/triggers.md の表から `claude plugin eval` のケースを生成する。

使い方: python3 docs/evals/gen-trigger-cases.py <plugin> <出力ディレクトリ>
  例: python3 docs/evals/gen-trigger-cases.py model-setup /tmp/x/model-setup/evals

リポジトリのプラグインに evals/ を置かないため、出力先はプラグインを一時ディレクトリにコピーした先にする。
Markdown 側を正とし、生成物は手で編集しない。
"""
import pathlib
import re
import sys

plugin, out = sys.argv[1], pathlib.Path(sys.argv[2])
src = pathlib.Path(__file__).with_name("triggers.md").read_text(encoding="utf-8")
m = re.search(rf"^## {re.escape(plugin)}\n(.*?)(?=^## |\Z)", src, re.S | re.M)
if not m:
    sys.exit(f"ERROR: triggers.md に ## {plugin} が無い")

rows = [[c.strip() for c in line.strip().strip("|").split("|")]
        for line in m.group(1).splitlines() if line.startswith("|") and not line.startswith("|---")][1:]
counter = {}
for skill, expect, prompt in rows:
    counter[(skill, expect)] = counter.get((skill, expect), 0) + 1
    d = out / f"{skill}-{expect}-{counter[(skill, expect)]}"
    (d / "graders").mkdir(parents=True, exist_ok=True)
    # Skill ツールだけを許し、1〜2ターンで「どのスキルを呼んだか」だけを見る
    (d / "prompt.md").write_text(f"---\nmax_turns: 2\nallowed_tools: [Skill]\ntags: [{skill}, {expect}]\n---\n\n{prompt}\n",
                                 encoding="utf-8")
    bound = "min: 1" if expect == "should" else "min: 0\nmax: 0"
    (d / "graders" / "fired.md").write_text(
        f"---\ntype: tool_used\ntool: Skill\ninput_match: '\"skill\"\\s*:\\s*\"(?:[\\w-]+:)?{skill}\"'\n{bound}\n---\n",
        encoding="utf-8")
print(f"{len(rows)} cases -> {out}")
