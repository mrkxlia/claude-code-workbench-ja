#!/usr/bin/env bash
# gen-agents-md.sh — Claude のルール（CLAUDE.md 等）を取り込んだ AGENTS.md を生成する
#
# 普段 CC しか使わない人が、既存の Claude ルールをそのまま Codex にも効かせるための
# ジェネレータ。Codex の AGENTS.md は @import 非対応なので、生成時に中身を取り込んで
# （@import も展開して）平らな AGENTS.md をマテリアライズする。
#
#   home   : $HOME/.claude/CLAUDE.md            → $CODEX_HOME/AGENTS.md（既定 ~/.codex/AGENTS.md）
#   project: $PROJ/CLAUDE.md + .claude 小ルール → $PROJ/AGENTS.md
#
# 生成物 AGENTS.md は「CLAUDE.md 側を正・AGENTS.md は再生成物」。1行目のセンチネルで所有を判定し、
# 手書きファイル（センチネル無し）は上書きしない。シェルのリダイレクトで書くため、PostToolUse 等の
# フックは発火しない（書き込み→フックのループは起きない）。jq 不要（純テキスト処理）。
#
# フラグ:
#   --project-only  home（$CODEX_HOME/AGENTS.md）をスキップ
#   --auto          再生成のみ・新規作成しない（SessionStart フック用）。初回作成は /codex-agents で。

set -u

SENTINEL='<!-- codex-bridge:generated v1 DO NOT EDIT -->'
NOTE='<!-- ルールは CLAUDE.md 側で更新し /codex-agents で再生成してください。手編集は失われます。 -->'
MAXBYTES=65536

AUTO=0
PROJECT_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --auto) AUTO=1 ;;
    --project-only) PROJECT_ONLY=1 ;;
    *) printf '不明な引数: %s\n' "$arg" >&2 ;;
  esac
done

PROJ="${CLAUDE_PROJECT_DIR:-$PWD}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

# --- パス正規化（realpath / readlink -f が無い環境向けフォールバックつき） ----------
_canon() {
  if command -v realpath >/dev/null 2>&1; then
    realpath "$1" 2>/dev/null && return 0
  fi
  if command -v readlink >/dev/null 2>&1 && readlink -f "$1" >/dev/null 2>&1; then
    readlink -f "$1"
    return 0
  fi
  _cd=$(dirname "$1"); _cb=$(basename "$1")
  ( cd "$_cd" 2>/dev/null && printf '%s/%s\n' "$(pwd -P)" "$_cb" )
}

# --- CLAUDE.md を読み、行全体が @path の行を再帰的にインライン展開する -----------------
# 使用前に visited を「 <canon> 」形式（前後空白つき）で初期化しておくこと。
_expand() {
  _file=$1
  _depth=$2
  if [ "$_depth" -gt 5 ]; then
    printf '<!-- @import 深さ上限(5)超過のため打ち切り: %s -->\n' "$_file"
    return 0
  fi
  _dir=$(dirname "$_file")
  _infence=0
  while IFS= read -r _line || [ -n "$_line" ]; do
    # フェンスドコードブロック（``` / ~~~）はトグルしてスキップ対象にする
    case "$_line" in
      '```'*|'~~~'*)
        if [ "$_infence" -eq 0 ]; then _infence=1; else _infence=0; fi
        printf '%s\n' "$_line"
        continue
        ;;
    esac
    if [ "$_infence" -ne 0 ]; then
      printf '%s\n' "$_line"
      continue
    fi
    # 前後の空白を落として「行全体が @token」か判定（文中の @mention 等は対象外）
    _trim=$(printf '%s' "$_line" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    case "$_trim" in
      @?*)
        case "$_trim" in
          *[[:space:]]*)
            # @ のあとに空白を含む → 単独 import 行ではない
            printf '%s\n' "$_line"
            ;;
          *)
            _imp=${_trim#@}
            case "$_imp" in
              '~/'*) _imp="$HOME/${_imp#~/}" ;;
              '~') _imp="$HOME" ;;
            esac
            case "$_imp" in
              /*) _res=$_imp ;;
              *)  _res="$_dir/$_imp" ;;
            esac
            if [ -f "$_res" ]; then
              _cp=$(_canon "$_res")
              case " $visited " in
                *" $_cp "*)
                  printf '<!-- @import 循環/重複のためスキップ: %s -->\n' "$_imp"
                  ;;
                *)
                  visited="$visited $_cp"
                  _expand "$_res" $((_depth + 1))
                  ;;
              esac
            else
              printf '<!-- 未解決 @import: %s -->\n' "$_imp"
            fi
            ;;
        esac
        ;;
      *)
        printf '%s\n' "$_line"
        ;;
    esac
  done < "$_file"
}

# --- 生成済み内容を出力先へ書き込む（書き込み規律つき） -------------------------------
_write_out() {
  _target=$1
  _src=$2
  if [ -f "$_target" ]; then
    _first=$(head -n 1 "$_target" 2>/dev/null || true)
    if [ "$_first" = "$SENTINEL" ]; then
      if cmp -s "$_src" "$_target"; then
        :  # 無変更 → 触らない
      else
        cp "$_src" "$_target" && printf '更新: %s\n' "$_target" >&2
      fi
    else
      printf 'スキップ（手書き / センチネル無し）: %s\n' "$_target" >&2
    fi
  else
    if [ "$AUTO" -eq 1 ]; then
      printf 'スキップ（--auto は新規作成しない。初回は /codex-agents で作成）: %s\n' "$_target" >&2
    else
      mkdir -p "$(dirname "$_target")" && cp "$_src" "$_target" && printf '作成: %s\n' "$_target" >&2
    fi
  fi
}

_filesize() { wc -c < "$1" 2>/dev/null | tr -d ' '; }

# --- プロジェクト側 AGENTS.md -------------------------------------------------------
_build_project() {
  _tmp=$(mktemp "${TMPDIR:-/tmp}/codex-agents.XXXXXX") || return 0
  _n=0
  {
    printf '%s\n' "$SENTINEL"
    printf '%s\n\n' "$NOTE"
    if [ -f "$PROJ/CLAUDE.md" ]; then
      _n=$((_n + 1))
      printf '## 由来: CLAUDE.md\n\n'
      visited=" $(_canon "$PROJ/CLAUDE.md") "
      _expand "$PROJ/CLAUDE.md" 1
      printf '\n'
    fi
    # 小ルール: .claude/*.md と .claude/rules/*.md（いずれも深さ1のみ）。
    # skills/ や agents/ は深さ1グロブに含まれないので自然に除外される。
    for _f in "$PROJ"/.claude/*.md "$PROJ"/.claude/rules/*.md; do
      [ -f "$_f" ] || continue
      _sz=$(_filesize "$_f")
      if [ -n "$_sz" ] && [ "$_sz" -gt "$MAXBYTES" ]; then
        printf 'スキップ（サイズ超過 %sB）: %s\n' "$_sz" "$_f" >&2
        continue
      fi
      _n=$((_n + 1))
      _rel=${_f#"$PROJ"/}
      printf '## 由来: %s\n\n' "$_rel"
      visited=" $(_canon "$_f") "
      _expand "$_f" 1
      printf '\n'
    done
  } > "$_tmp"

  if [ "$_n" -eq 0 ]; then
    rm -f "$_tmp"
    return 0
  fi
  _write_out "$PROJ/AGENTS.md" "$_tmp"
  rm -f "$_tmp"
}

# --- home 側 AGENTS.md（$CODEX_HOME/AGENTS.md） -------------------------------------
_build_home() {
  [ -f "$HOME/.claude/CLAUDE.md" ] || return 0
  _tmp=$(mktemp "${TMPDIR:-/tmp}/codex-agents.XXXXXX") || return 0
  {
    printf '%s\n' "$SENTINEL"
    printf '%s\n\n' "$NOTE"
    printf '## 由来: ~/.claude/CLAUDE.md\n\n'
    visited=" $(_canon "$HOME/.claude/CLAUDE.md") "
    _expand "$HOME/.claude/CLAUDE.md" 1
    printf '\n'
  } > "$_tmp"
  _write_out "$CODEX_HOME/AGENTS.md" "$_tmp"
  rm -f "$_tmp"
}

_build_project
[ "$PROJECT_ONLY" -eq 1 ] || _build_home

exit 0
