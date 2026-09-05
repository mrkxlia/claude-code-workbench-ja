#!/usr/bin/env python3
"""feedback_rules.py — 指摘（フィードバック）をファイル化し、指摘回数で強制力を上げるエンジン。

  1指摘 = 1ファイル（<feedback-dir>/<topic>.md）。frontmatter の count（＝人間が同じ指摘を
  した回数）から severity を自動決定し、3つのイベントで段階的に効かせる。

    count      pre_bash / pre_edit      stop_check
    >= 5       deny                     deny
    3〜4       ask                      block
    1〜2       warn                     warn

  サブコマンド（すべて hook から呼ばれる。stats / sync-rules / doctor は人間・スキルからも使う）:
    inject      UserPromptSubmit — 確定ルール（count>=3）を文脈に注入し、指摘候補を捕捉する
    guard       PreToolUse      — Bash / ファイル編集を実行前に止める
    stop-check  Stop            — 変更ファイルを検査し、直すまでターンを終わらせない
    stats       .violations.jsonl を集計し、形骸化ルール・昇格候補を提案する
    sync-rules  count>=3 かつ paths つきのルールを .claude/rules/ へ書き出す（本体のネイティブ読込を使う）
    doctor      ルールの解析結果・有効な severity・正規表現の妥当性を一覧する

  ルールの置き場所（両方読む。同名は後勝ち＝プロジェクトが個人設定を上書きする）:
    ~/.claude/feedback/*.md                       個人ルール
    $CLAUDE_PROJECT_DIR/.claude/feedback/*.md     プロジェクトルール
    環境変数 CLAUDE_FEEDBACK_DIR で差し替え可（テスト用。os.pathsep 区切りで複数指定可）

  設計方針: **hook 自身は絶対に事故らせない**。例外はすべて握り潰して exit 0 で返す。
  検知できないことより、hook のバグでユーザーの作業が止まることのほうが害が大きい。
"""

import datetime
import json
import os
import re
import subprocess
import sys

MAX_STOP_ATTEMPTS = 3          # Stop フックで連続ブロックする上限（無限ループ防止）
DEFAULT_BUDGET = 3000          # inject の文字数予算
CHECK_TIMEOUT = 20             # stop_check の check コマンドのタイムアウト（秒）
MAX_CHECK_FILES = 50           # 1ルールあたり検査する変更ファイル数の上限
SEV_ORDER = {"warn": 1, "ask": 2, "block": 3, "deny": 4}
PRE_EVENTS = ("pre_bash", "pre_edit")
EDIT_TOOLS = ("Edit", "Write", "MultiEdit", "NotebookEdit")


# --------------------------------------------------------------------------- 基本

def project_root():
    return os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()


def feedback_dirs():
    """ルール置き場を優先度順（後勝ち）で返す。CLAUDE_FEEDBACK_DIR でテスト時に差し替え可能。"""
    override = os.environ.get("CLAUDE_FEEDBACK_DIR")
    if override:
        return [p for p in override.split(os.pathsep) if p and os.path.isdir(p)]
    dirs = []
    for d in (os.path.expanduser("~/.claude/feedback"),
              os.path.join(project_root(), ".claude", "feedback")):
        if os.path.isdir(d):
            dirs.append(d)
    return dirs


def state_dir():
    """違反ログ・状態ファイルの置き場所（プロジェクト側があればそちら）。無ければ None。"""
    dirs = feedback_dirs()
    return dirs[-1] if dirs else None


def iso_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


# --------------------------------------------------------------------------- YAML

def _scalar(s):
    s = s.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "'\"":
        inner = s[1:-1]
        return inner.replace("''", "'") if s[0] == "'" else inner
    low = s.lower()
    if low in ("true", "yes"):
        return True
    if low in ("false", "no"):
        return False
    if low in ("null", "~", ""):
        return None
    if re.fullmatch(r"-?\d+", s):
        return int(s)
    return s


def mini_yaml_load(text):
    """frontmatter のサブセット（1行スカラー・リスト・リストの中のマッピング）だけを扱う。

    PyYAML も yq も無い環境のためのフォールバック。折りたたみ記法（>- 等）は扱わないので、
    ルールを書くときは1行スカラーで書くこと（doctor が解析結果を見せる）。
    """
    root, cur_list, cur_item, cur_key = {}, None, None, None
    for raw in text.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        line = raw.strip()
        if line.startswith("- "):
            if cur_list is None:
                continue
            body = line[2:].strip()
            if ":" in body and not body[0] in "'\"":
                k, _, v = body.partition(":")
                cur_item = {k.strip(): _scalar(v)}
                cur_list.append(cur_item)
            else:
                cur_list.append(_scalar(body))
                cur_item = None
            continue
        if len(raw) - len(raw.lstrip()) == 0:
            k, _, v = line.partition(":")
            k, v = k.strip(), v.strip()
            if v == "":
                cur_list, cur_item, cur_key = [], None, k
                root[k] = cur_list
            else:
                root[k] = _scalar(v)
                cur_list, cur_item, cur_key = None, None, None
            continue
        if cur_item is not None and ":" in line:
            k, _, v = line.partition(":")
            cur_item[k.strip()] = _scalar(v)
        elif cur_key is not None and cur_list is not None and not line.startswith("-"):
            continue
    return root


def load_yaml_text(text):
    try:
        import yaml  # type: ignore
        return yaml.safe_load(text) or {}
    except Exception:
        pass
    return mini_yaml_load(text)


def split_frontmatter(text):
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return "", text
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return "\n".join(lines[1:i]), "\n".join(lines[i + 1:])
    return "", text


# --------------------------------------------------------------------------- glob

def _expand_braces(pat):
    m = re.search(r"\{([^{}]*)\}", pat)
    if not m:
        return [pat]
    out = []
    for alt in m.group(1).split(","):
        out.extend(_expand_braces(pat[:m.start()] + alt + pat[m.end():]))
    return out


def _translate(pat):
    """glob をパス用の正規表現本体に変換する（* は / を跨がない・** は跨ぐ）。"""
    i, n, out = 0, len(pat), ""
    while i < n:
        c = pat[i]
        if c == "*":
            if pat[i:i + 3] == "**/":
                out += "(?:.*/)?"
                i += 3
                continue
            if pat[i:i + 2] == "**":
                out += ".*"
                i += 2
                continue
            out += "[^/]*"
            i += 1
            continue
        if c == "?":
            out += "[^/]"
            i += 1
            continue
        out += re.escape(c)
        i += 1
    return out


def glob_match(pattern, path):
    """パス末尾に対する一致。'**/*.go' も '*.go' も 'pkg/foo.go' に一致する。"""
    if not pattern:
        return False
    path = str(path).replace("\\", "/")
    for pat in _expand_braces(str(pattern).replace("\\", "/")):
        try:
            if re.search("(?:^|/)" + _translate(pat) + "$", path):
                return True
        except re.error:
            continue
    return False


def rx_search(pattern, text):
    try:
        return re.search(str(pattern), text or "") is not None
    except re.error:
        return False


# --------------------------------------------------------------------------- ルール

def _expired(rule):
    exp = rule.get("expires")
    if not exp:
        return False
    return str(exp) < datetime.date.today().isoformat()


def load_rules():
    """ルールを読み込む。壊れたファイルは黙って飛ばす（hook を止めない）。"""
    rules = {}
    for d in feedback_dirs():
        try:
            names = sorted(os.listdir(d))
        except OSError:
            continue
        for fn in names:
            if not fn.endswith(".md") or fn.startswith(".") or fn.lower() == "readme.md":
                continue
            path = os.path.join(d, fn)
            try:
                text = open(path, encoding="utf-8").read()
            except OSError:
                continue
            fm, body = split_frontmatter(text)
            try:
                meta = load_yaml_text(fm) or {}
            except Exception:
                meta = {}
            if not isinstance(meta, dict):
                meta = {}
            name = str(meta.get("name") or os.path.splitext(fn)[0])
            count = meta.get("count", 1)
            try:
                count = int(count)
            except (TypeError, ValueError):
                count = 1
            enforce = meta.get("enforce") or []
            if not isinstance(enforce, list):
                enforce = []
            rules[name] = {
                "name": name,
                "file": path,
                "description": str(meta.get("description") or "").strip(),
                "count": max(count, 1),
                "enabled": meta.get("enabled", True) is not False,
                "expires": meta.get("expires"),
                "paths": meta.get("paths"),
                "enforce": [e for e in enforce if isinstance(e, dict)],
                "body": body.strip(),
            }
    return [r for r in rules.values()]


def active_rules():
    return [r for r in load_rules() if r["enabled"] and not _expired(r)]


def resolve_severity(count, explicit=None, event=None):
    """ルールに severity の明示があればそれを使い、無ければ count から決める。"""
    if explicit in SEV_ORDER:
        return explicit
    if count >= 5:
        return "deny"
    if count >= 3:
        return "block" if event == "stop_check" else "ask"
    return "warn"


def log_violation(rule, severity, event, detail):
    """違反を .violations.jsonl に追記する。count 自体は絶対に書き換えない（ログに残すのみ）。"""
    d = state_dir()
    if not d:
        return
    rec = {
        "ts": iso_now(), "rule": rule["name"], "count": rule["count"],
        "severity": severity, "event": event, "detail": str(detail)[:500],
        "cwd": os.getcwd(),
    }
    try:
        with open(os.path.join(d, ".violations.jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    except OSError:
        pass


def read_stdin_json():
    try:
        raw = sys.stdin.read()
    except Exception:
        return {}
    try:
        return json.loads(raw) if raw.strip() else {}
    except ValueError:
        return {}


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")


# --------------------------------------------------------------------------- inject

# ユーザー発言から「訂正・再指摘」を捕捉するパターン（claude-reflect の Stage 1 に相当）。
# ここで拾うのは *候補* であって確定ルールではない。ルール化と count の更新は人間が行う。
CORRECTION_PATTERNS = [
    r"(前|さっき|何度|毎回|また|再度).{0,8}(言った|言ってる|言いました|指摘|お願い)",
    r"(そうじゃな|ちがう|違うって|逆です|逆だ|ダメです|だめです)",
    r"(しないで|やめて|使わないで|書かないで|実行しないで|勝手に)",
    r"(必ず|絶対に|毎回).{0,12}(こと|して|してください|しろ)",
    r"(覚えて|記憶して|ルールに)",
    r"(?i)\b(no,|don't|do not|stop doing|instead of|as i said|i told you|again[,:])",
    r"(?i)\bremember\s*:",
]


def pending_candidates(path):
    n = 0
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                try:
                    if not json.loads(line).get("promoted"):
                        n += 1
                except ValueError:
                    continue
    except OSError:
        return 0
    return n


def capture_candidate(payload):
    """訂正らしき発言を .candidates.jsonl に記録する。戻り値は (新規captured, 未確定件数)。"""
    d = state_dir()
    if not d:
        return 0, 0
    path = os.path.join(d, ".candidates.jsonl")
    prompt = str(payload.get("user_prompt") or "")
    excerpt = " ".join(prompt.split())[:300]
    captured = 0
    if excerpt and any(rx_search(p, prompt) for p in CORRECTION_PATTERNS):
        recent = []
        try:
            with open(path, encoding="utf-8") as f:
                recent = f.read().splitlines()[-50:]
        except OSError:
            pass
        dup = False
        for line in recent:
            try:
                if json.loads(line).get("excerpt") == excerpt:
                    dup = True
                    break
            except ValueError:
                continue
        if not dup:
            rec = {"ts": iso_now(), "session": payload.get("session_id"),
                   "excerpt": excerpt, "cwd": os.getcwd(), "promoted": False}
            try:
                with open(path, "a", encoding="utf-8") as f:
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                captured = 1
            except OSError:
                pass
    return captured, pending_candidates(path)


def _sev_label(rule):
    sevs = []
    for e in rule["enforce"]:
        ev = str(e.get("event") or "")
        sevs.append(resolve_severity(rule["count"], e.get("severity"), ev))
    if not sevs:
        return "enforce 無し（注入のみ・機械検知できないルール）"
    worst = max(sevs, key=lambda s: SEV_ORDER.get(s, 0))
    return "hook が %s で止める" % worst


def format_full(rule):
    body = rule["body"]
    if len(body) > 700:
        body = body[:700] + "…"
    head = "■ %s（これまで %d 回指摘されています／%s）" % (rule["name"], rule["count"], _sev_label(rule))
    parts = [head]
    if rule["description"]:
        parts.append(rule["description"])
    if body:
        parts.append(body)
    return "\n".join(parts)


def format_brief(rule):
    return "■ %s（%d 回／%s）%s" % (
        rule["name"], rule["count"], _sev_label(rule), rule["description"])


HEADER = (
    "# 確定フィードバックルール（count >= 3）\n"
    "これらは人間から繰り返し指摘された確定ルール。回数が多いものほど重い。違反すると hook が "
    "ask / deny / block で機械的に止める。「今回は特別」という例外は認められていない。\n\n"
)


def build_output(rules, limit=DEFAULT_BUDGET):
    """count 降順で並べ、予算を超えたら count の低いものから description のみに落とす。"""
    ordered = sorted(rules, key=lambda r: (-r["count"], r["name"]))
    blocks = {r["name"]: format_full(r) for r in ordered}

    def assemble():
        return HEADER + "\n\n".join(blocks[r["name"]] for r in ordered)

    out = assemble()
    if len(out) <= limit:
        return out
    for r in sorted(ordered, key=lambda r: (r["count"], r["name"])):
        blocks[r["name"]] = format_brief(r)
        out = assemble()
        if len(out) <= limit:
            return out
    return out[:limit]


def cmd_inject(payload):
    captured, pending = capture_candidate(payload)
    rules = [r for r in active_rules() if r["count"] >= 3]
    try:
        limit = int(os.environ.get("CLAUDE_FEEDBACK_BUDGET", DEFAULT_BUDGET))
    except ValueError:
        limit = DEFAULT_BUDGET
    chunks = []
    if rules:
        chunks.append(build_output(rules, limit))
    if captured:
        chunks.append(
            "※ 直前の発言を「繰り返しの指摘」の候補として記録しました"
            "（未確定 %d 件）。同じ指摘を二度させないためにルール化するなら /feedback-rule。" % pending)
    if not chunks:
        return 0
    emit({"hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": "\n\n".join(chunks),
    }})
    return 0


# --------------------------------------------------------------------------- guard

TEST_FILE_PATTERNS = [
    r"_test\.(go|py|rb|ts|tsx|js|jsx)$", r"\.test\.(ts|tsx|js|jsx|py)$",
    r"\.spec\.(ts|tsx|js|jsx|rb)$", r"_spec\.rb$", r"^test_.*\.py$", r"(^|/)tests?/",
]


def looks_like_test_file(path):
    base = os.path.basename(str(path))
    return any(rx_search(p, base) for p in TEST_FILE_PATTERNS[:-1]) or rx_search(
        TEST_FILE_PATTERNS[-1], str(path).replace("\\", "/"))


def rel_to_root(path):
    path = str(path or "")
    root = os.path.abspath(project_root())
    try:
        ap = os.path.abspath(path)
        if ap.startswith(root + os.sep):
            return os.path.relpath(ap, root).replace("\\", "/")
    except (OSError, ValueError):
        pass
    return path.replace("\\", "/")


def written_text(tool_input):
    parts = []
    for key in ("content", "new_string", "new_source"):
        v = tool_input.get(key)
        if isinstance(v, str):
            parts.append(v)
    edits = tool_input.get("edits")
    if isinstance(edits, list):
        for e in edits:
            if isinstance(e, dict) and isinstance(e.get("new_string"), str):
                parts.append(e["new_string"])
    return "\n".join(parts)


def eval_pre_bash(rule, entry, command):
    if not entry.get("when") or not rx_search(entry["when"], command):
        return None
    if entry.get("unless") and rx_search(entry["unless"], command):
        return None
    return entry.get("message") or rule["description"] or rule["name"]


def eval_pre_edit(rule, entry, file_path, text):
    path = rel_to_root(file_path)
    if entry.get("path") and not glob_match(entry["path"], path):
        return None
    if entry.get("unless") and (rx_search(entry["unless"], path) or rx_search(entry["unless"], text)):
        return None
    sibling = entry.get("absent_sibling")
    if sibling:
        if looks_like_test_file(path):
            return None
        base = os.path.basename(path)
        rendered = (str(sibling).replace("{stem}", os.path.splitext(base)[0])
                    .replace("{name}", base).replace("{ext}", os.path.splitext(base)[1]))
        target = os.path.join(os.path.dirname(os.path.join(project_root(), path)), rendered)
        if os.path.exists(target):
            return None
        return entry.get("message") or ("%s が無い状態で %s を書こうとしています。" % (rendered, base))
    if entry.get("when"):
        if not rx_search(entry["when"], text):
            return None
        return entry.get("message") or rule["description"] or rule["name"]
    if entry.get("path"):
        return entry.get("message") or rule["description"] or rule["name"]
    return None


def cmd_guard(payload):
    tool = str(payload.get("tool_name") or "")
    ti = payload.get("tool_input") or {}
    if not isinstance(ti, dict):
        return 0
    hits = []      # (severity, rule, message)
    if tool == "Bash":
        command = str(ti.get("command") or "")
        if not command:
            return 0
        for rule in active_rules():
            for entry in rule["enforce"]:
                if str(entry.get("event")) != "pre_bash":
                    continue
                msg = eval_pre_bash(rule, entry, command)
                if msg:
                    hits.append((resolve_severity(rule["count"], entry.get("severity"), "pre_bash"),
                                 rule, msg, command[:200]))
    elif tool in EDIT_TOOLS:
        file_path = ti.get("file_path") or ti.get("notebook_path") or ""
        if not file_path:
            return 0
        text = written_text(ti)
        for rule in active_rules():
            for entry in rule["enforce"]:
                if str(entry.get("event")) != "pre_edit":
                    continue
                msg = eval_pre_edit(rule, entry, file_path, text)
                if msg:
                    hits.append((resolve_severity(rule["count"], entry.get("severity"), "pre_edit"),
                                 rule, msg, rel_to_root(file_path)))
    else:
        return 0
    if not hits:
        return 0

    worst = max(hits, key=lambda h: SEV_ORDER.get(h[0], 0))[0]
    lines = []
    for sev, rule, msg, detail in hits:
        log_violation(rule, sev, "pre_bash" if tool == "Bash" else "pre_edit", detail)
        lines.append("[%s／これまで %d 回指摘・%s] %s" % (rule["name"], rule["count"], sev, msg))
    reason = "\n".join(lines)

    if worst in ("deny", "block"):
        emit({"hookSpecificOutput": {
            "hookEventName": "PreToolUse", "permissionDecision": "deny",
            "permissionDecisionReason": reason + "\n（このルールは繰り返し指摘されたため禁止扱いです。"
                                                 "別の書き方で迂回せず、ルールに従う手順に切り替えてください）"}})
    elif worst == "ask":
        emit({"hookSpecificOutput": {
            "hookEventName": "PreToolUse", "permissionDecision": "ask",
            "permissionDecisionReason": reason + "\n（正当な理由があるなら人間が承認できます）"}})
    else:
        emit({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "systemMessage": "フィードバックルールの警告（暫定ルールのため停止はしません）:\n" + reason}})
    return 0


# --------------------------------------------------------------------------- stop-check

def changed_files(session_id):
    d = state_dir()
    if d and session_id:
        p = os.path.join(d, "changed_files.%s.txt" % session_id)
        if os.path.isfile(p):
            try:
                return [ln.strip() for ln in open(p, encoding="utf-8") if ln.strip()]
            except OSError:
                pass
    files = []
    for args in (["git", "diff", "--name-only", "HEAD"],
                 ["git", "ls-files", "--others", "--exclude-standard"]):
        try:
            r = subprocess.run(args, cwd=project_root(), capture_output=True,
                               text=True, timeout=15)
        except (OSError, subprocess.SubprocessError):
            continue
        if r.returncode == 0:
            files.extend([ln.strip() for ln in r.stdout.splitlines() if ln.strip()])
    seen, out = set(), []
    for f in files:
        if f not in seen:
            seen.add(f)
            out.append(f)
    return out


def _attempts_path(session_id):
    d = state_dir()
    return os.path.join(d, ".stop-attempts.%s" % (session_id or "default")) if d else None


def bump_attempts(path):
    n = 0
    try:
        n = int(open(path, encoding="utf-8").read().strip() or 0)
    except (OSError, ValueError):
        n = 0
    n += 1
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(str(n))
    except OSError:
        pass
    return n


def clear_attempts(path):
    try:
        os.remove(path)
    except OSError:
        pass


def run_check(command, abs_path):
    env = dict(os.environ)
    env["FILE"] = abs_path
    try:
        r = subprocess.run(command, shell=True, cwd=project_root(), env=env,
                           capture_output=True, text=True, timeout=CHECK_TIMEOUT)
    except (OSError, subprocess.SubprocessError):
        return None      # 実行できなかった＝判定不能。安全側（違反としない）に倒す
    return r.returncode != 0


def cmd_stop_check(payload):
    session_id = payload.get("session_id")
    files = changed_files(session_id)
    if not files:
        ap = _attempts_path(session_id)
        if ap:
            clear_attempts(ap)
        return 0

    hits = []
    for rule in active_rules():
        for entry in rule["enforce"]:
            if str(entry.get("event")) != "stop_check":
                continue
            pattern = entry.get("changed")
            targets = [f for f in files if (not pattern or glob_match(pattern, f))]
            for f in targets[:MAX_CHECK_FILES]:
                abs_path = os.path.join(project_root(), f)
                if not os.path.isfile(abs_path):
                    continue
                violated = None
                if entry.get("check"):
                    violated = run_check(str(entry["check"]), abs_path)
                elif entry.get("when"):
                    try:
                        text = open(abs_path, encoding="utf-8", errors="replace").read()
                    except OSError:
                        continue
                    violated = rx_search(entry["when"], text)
                    if violated and entry.get("unless") and rx_search(entry["unless"], text):
                        violated = False
                if violated:
                    sev = resolve_severity(rule["count"], entry.get("severity"), "stop_check")
                    msg = entry.get("message") or rule["description"] or rule["name"]
                    hits.append((sev, rule, "%s（%s）" % (msg, f), f))

    ap = _attempts_path(session_id)
    if not hits:
        if ap:
            clear_attempts(ap)
        return 0

    worst = max(hits, key=lambda h: SEV_ORDER.get(h[0], 0))[0]
    lines = []
    for sev, rule, msg, detail in hits:
        log_violation(rule, sev, "stop_check", detail)
        lines.append("[%s／これまで %d 回指摘・%s] %s" % (rule["name"], rule["count"], sev, msg))
    reason = "\n".join(lines)

    if worst in ("block", "deny"):
        attempts = bump_attempts(ap) if ap else 1
        if attempts > MAX_STOP_ATTEMPTS:
            sys.stderr.write(
                "[feedback-stop-check] %d 回連続でブロックしました。ループを打ち切ります。手動確認を。\n"
                % MAX_STOP_ATTEMPTS)
            if ap:
                clear_attempts(ap)
            return 0
        sys.stdout.write(json.dumps({
            "decision": "block",
            "reason": ("フィードバックルール違反が残ったままターンを終えようとしています"
                       "（%d/%d 回目）。次を直してから終了してください:\n%s"
                       % (attempts, MAX_STOP_ATTEMPTS, reason)),
        }, ensure_ascii=False) + "\n")
        return 0

    emit({"hookSpecificOutput": {
        "hookEventName": "Stop",
        "systemMessage": "フィードバックルールの警告（暫定ルールのため停止はしません）:\n" + reason}})
    return 0


# --------------------------------------------------------------------------- stats

def load_violations():
    d = state_dir()
    if not d:
        return []
    path = os.path.join(d, ".violations.jsonl")
    out = []
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                try:
                    out.append(json.loads(line))
                except ValueError:
                    continue
    except OSError:
        return []
    return out


def cmd_stats(argv):
    rules = {r["name"]: r for r in load_rules()}
    vios = load_violations()
    cutoff = (datetime.datetime.now(datetime.timezone.utc)
              - datetime.timedelta(days=7)).isoformat(timespec="seconds")
    agg = {}
    for v in vios:
        name = str(v.get("rule"))
        a = agg.setdefault(name, {"total": 0, "recent": 0, "sev": {}, "last": ""})
        a["total"] += 1
        if str(v.get("ts", "")) >= cutoff:
            a["recent"] += 1
        sev = str(v.get("severity"))
        a["sev"][sev] = a["sev"].get(sev, 0) + 1
        a["last"] = max(a["last"], str(v.get("ts", "")))

    print("# フィードバックルールの発火状況")
    print("ルール置き場: %s" % (", ".join(feedback_dirs()) or "（無し）"))
    print("ルール %d 件 / 違反ログ %d 件\n" % (len(rules), len(vios)))
    print("| ルール | count | 状態 | 総発火 | 直近7日 | severity 内訳 | 最終発火 |")
    print("|---|---|---|---|---|---|---|")
    for name in sorted(rules, key=lambda n: (-rules[n]["count"], n)):
        r = rules[name]
        a = agg.get(name, {"total": 0, "recent": 0, "sev": {}, "last": "-"})
        state = "有効" if (r["enabled"] and not _expired(r)) else ("期限切れ" if _expired(r) else "無効")
        if not r["enforce"]:
            state += "・注入のみ"
        sevs = ", ".join("%s:%d" % kv for kv in sorted(a["sev"].items())) or "-"
        print("| %s | %d | %s | %d | %d | %s | %s |"
              % (name, r["count"], state, a["total"], a["recent"], sevs, a["last"] or "-"))

    stale = [n for n, r in rules.items()
             if r["enforce"] and r["enabled"] and not _expired(r) and agg.get(n, {}).get("total", 0) == 0]
    promote = [n for n, r in rules.items()
               if r["count"] < 3 and agg.get(n, {}).get("total", 0) >= 3]
    unknown = [n for n in agg if n not in rules]

    print("\n## 棚卸しの提案（実行は人間が判断する）")
    if promote:
        print("- **昇格候補**（暫定ルール（count 1〜2）のまま3回以上発火している。count を上げると "
              "ask / deny に変わる）: %s" % ", ".join(sorted(promote)))
    if stale:
        print("- **形骸化候補**（enforce を持つが一度も発火していない。誤ったパターンか、"
              "もう守れているルール。`enabled: false` か `expires` を検討）: %s" % ", ".join(sorted(stale)))
    if unknown:
        print("- **消えたルールのログ**（ルールファイルが無いのに違反ログだけ残っている）: %s"
              % ", ".join(sorted(unknown)))
    d = state_dir()
    pend = pending_candidates(os.path.join(d, ".candidates.jsonl")) if d else 0
    if pend:
        print("- **未確定の指摘候補が %d 件**あります（`/feedback-rule` でルール化するか破棄する）" % pend)
    if not (promote or stale or unknown or pend):
        print("- 提案なし（現状のルールセットは概ね機能している）")
    return 0


# --------------------------------------------------------------------------- sync-rules

MARKER = "generated-by: feedback-rules"


def cmd_sync_rules(argv):
    """count>=3 かつ paths つきのルールを .claude/rules/ へ書き出す。

    本体は .claude/rules/*.md を自動ロードし、frontmatter の paths でファイル種別を絞れる。
    そこへ寄せられるルールは毎ターンの注入予算を使わずに済む。
    """
    dry = "--dry-run" in argv
    out_dir = os.path.join(project_root(), ".claude", "rules")
    kept = {}
    for r in active_rules():
        if r["count"] < 3 or not r.get("paths"):
            continue
        paths = r["paths"]
        if isinstance(paths, (list, tuple)):
            fm = "paths:\n" + "".join("  - '%s'\n" % p for p in paths)
        else:
            fm = "paths: '%s'\n" % paths
        content = (
            "---\n%s---\n<!-- %s — 直接編集しない。元ファイル: %s -->\n\n"
            "# %s（これまで %d 回指摘されたルール）\n\n%s\n\n%s\n"
            % (fm, MARKER, r["file"], r["name"], r["count"], r["description"], r["body"])
        )
        kept["feedback-%s.md" % r["name"]] = content

    removed = []
    if os.path.isdir(out_dir):
        for fn in sorted(os.listdir(out_dir)):
            if not (fn.startswith("feedback-") and fn.endswith(".md")) or fn in kept:
                continue
            p = os.path.join(out_dir, fn)
            try:
                if MARKER in open(p, encoding="utf-8").read():
                    removed.append(fn)
                    if not dry:
                        os.remove(p)
            except OSError:
                continue

    if kept and not dry:
        os.makedirs(out_dir, exist_ok=True)
    written = []
    for fn, content in sorted(kept.items()):
        p = os.path.join(out_dir, fn)
        try:
            old = open(p, encoding="utf-8").read()
        except OSError:
            old = None
        if old == content:
            continue
        written.append(fn)
        if not dry:
            with open(p, "w", encoding="utf-8") as f:
                f.write(content)

    print("# .claude/rules/ への同期%s" % ("（dry-run）" if dry else ""))
    print("出力先: %s" % out_dir)
    print("書き出し: %s" % (", ".join(written) or "（変更なし）"))
    print("削除: %s" % (", ".join(removed) or "（なし）"))
    print("対象は count>=3 かつ paths を持つルールのみ。paths が無いルールは inject 経由のままです。")
    return 0


# --------------------------------------------------------------------------- doctor

def cmd_doctor(argv):
    dirs = feedback_dirs()
    print("# feedback-rules doctor")
    print("ルール置き場: %s" % (", ".join(dirs) or "（無し。~/.claude/feedback を作ってください）"))
    print("状態ファイル置き場: %s" % (state_dir() or "-"))
    try:
        import yaml  # noqa: F401
        print("YAML パーサ: PyYAML")
    except Exception:
        print("YAML パーサ: 自前 mini パーサ（1行スカラーのみ対応。折りたたみ記法は使わないこと）")
    rules = load_rules()
    if not rules:
        print("\nルールがありません。")
        return 0
    print("\n| ルール | count | 状態 | enforce | 有効 severity | 備考 |")
    print("|---|---|---|---|---|---|")
    for r in sorted(rules, key=lambda r: (-r["count"], r["name"])):
        notes = []
        sevs = []
        for e in r["enforce"]:
            ev = str(e.get("event") or "?")
            if ev not in PRE_EVENTS + ("stop_check",):
                notes.append("未知の event: %s" % ev)
            sevs.append("%s→%s" % (ev, resolve_severity(r["count"], e.get("severity"), ev)))
            for key in ("when", "unless"):
                if e.get(key):
                    try:
                        re.compile(str(e[key]))
                    except re.error as err:
                        notes.append("%s の正規表現が不正: %s" % (key, err))
            if ev == "pre_edit" and not (e.get("path") or e.get("absent_sibling")):
                notes.append("pre_edit に path が無い（全ファイルに当たる）")
            if ev == "pre_bash" and not e.get("when"):
                notes.append("pre_bash に when が無い（何も検知しない）")
        if not r["description"]:
            notes.append("description が空")
        state = "有効" if (r["enabled"] and not _expired(r)) else ("期限切れ" if _expired(r) else "無効")
        print("| %s | %d | %s | %d | %s | %s |"
              % (r["name"], r["count"], state, len(r["enforce"]),
                 ", ".join(sevs) or "-", "; ".join(notes) or "-"))
    return 0


# --------------------------------------------------------------------------- main

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    argv = sys.argv[2:]
    if cmd == "inject":
        return cmd_inject(read_stdin_json())
    if cmd == "guard":
        return cmd_guard(read_stdin_json())
    if cmd in ("stop-check", "stop_check"):
        return cmd_stop_check(read_stdin_json())
    if cmd == "stats":
        return cmd_stats(argv)
    if cmd in ("sync-rules", "sync_rules"):
        return cmd_sync_rules(argv)
    if cmd == "doctor":
        return cmd_doctor(argv)
    sys.stderr.write(__doc__ or "")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main() or 0)
    except Exception as e:  # hook のバグで作業を止めない
        sys.stderr.write("[feedback-rules] internal error (ignored): %s\n" % e)
        sys.exit(0)
