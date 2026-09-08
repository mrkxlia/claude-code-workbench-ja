"""docs/evals/<skill>.md から機械可読な evals.json を生成する。

書式は公式 skill-creator（anthropics/skills の skills/skill-creator）の
evals/evals.json に合わせる: 1ケース = {id, skills, prompt, expected_output, files}。

Markdown 側を正とし、このファイルは生成物。手で編集しない。
"""
import json, pathlib, re, sys

cases, obs = [], []
for p in sorted(pathlib.Path("docs/evals").glob("*.md")):
    if p.name == "README.md":
        continue
    skill = p.stem
    prev = None
    for block in re.split(r"\n## (?=S-)", p.read_text(encoding="utf-8"))[1:]:
        title = block.split("\n", 1)[0].strip()
        sid = f"{skill}-{title.split()[0]}"

        crit = re.search(r"\*\*判定基準\*\*[^\n]*\n((?:^\d+\..*(?:\n(?!\d+\.|\n).*)*\n?)+)",
                         block, re.M)
        if not crit:
            print(f"ERROR 判定基準が取れない: {p}:{sid}", file=sys.stderr); sys.exit(1)
        expected = [" ".join(item.split())
                    for item in re.split(r"^\d+\.\s*", crit.group(1).strip(), flags=re.M)
                    if item.strip()]

        m = re.search(r"\*\*入力\*\*[^\n]*\n+```[a-z]*\n(.*?)\n```", block, re.S)
        if m:
            cases.append({"id": sid, "skills": [skill], "prompt": m.group(1).strip(),
                          "expected_output": expected, "files": []})
            prev = sid
        else:
            # 単独では走らせられない「継続観察」シナリオ。直前ケースの続きとして採点する。
            note = re.search(r"\*\*入力\*\*([^\n]*)", block)
            obs.append({"id": sid, "skills": [skill],
                        "continues_from": prev,
                        "observation": (note.group(1).strip() if note else "").strip("（）"),
                        "expected_output": expected})

doc = {
    "_comment": "docs/evals/*.md からの生成物。手で編集せず Markdown 側を直すこと。"
                "書式は公式 skill-creator の evals/evals.json に合わせている。",
    "cases": cases,
    "observations": obs,
}
pathlib.Path("docs/evals/evals.json").write_text(
    json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"単独実行できるケース {len(cases)} 件 / 継続観察 {len(obs)} 件")
