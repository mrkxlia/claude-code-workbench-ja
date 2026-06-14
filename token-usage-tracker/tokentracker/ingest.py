"""ログ走査 → 正規化 → コスト付与 → DB UPSERT。"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from tokentracker import db
from tokentracker.parsers.claude_code import ClaudeCodeParser
from tokentracker.pricing import PriceBook, default_pricebook


def ingest_claude_code(
    conn: sqlite3.Connection,
    root: Path | None = None,
    *,
    pricebook: PriceBook | None = None,
) -> int:
    """Claude Code ログを取り込む。戻り値は取り込んだイベント件数。"""
    parser = ClaudeCodeParser()
    book = pricebook or default_pricebook()
    events = list(parser.iter_events(root))
    for ev in events:
        ev.cost_usd = book.compute_cost(ev)
    return db.upsert_events(conn, events)
