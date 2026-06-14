"""コスト計算のテスト（4 種別＋1h/5m 単価、未知モデル=未割当、synthetic=0）。"""

from tokentracker.models import UsageEvent
from tokentracker.pricing import PriceBook


def _book():
    # 単価はテスト用の判りやすい値（1M トークンあたりのドル）。
    return PriceBook(
        {
            "claude-sonnet-4-6": {
                "input": 3.0,
                "output": 15.0,
                "cache_write_1h": 6.0,
                "cache_write_5m": 3.75,
                "cache_read": 0.3,
            }
        }
    )


def test_cost_uses_four_plus_two_rates():
    book = _book()
    ev = UsageEvent(
        source="claude_code",
        message_id="msg_A",
        session_id="S",
        model="claude-sonnet-4-6",
        timestamp_utc="2026-06-14T01:00:10.000Z",
        input_tokens=1_000_000,
        output_tokens=1_000_000,
        cache_creation_1h_tokens=1_000_000,
        cache_creation_5m_tokens=1_000_000,
        cache_read_tokens=1_000_000,
    )
    cost = book.compute_cost(ev)
    # 3 + 15 + 6 + 3.75 + 0.3 = 28.05
    assert round(cost, 4) == 28.05


def test_unknown_model_returns_none_for_unallocated():
    book = _book()
    ev = UsageEvent(
        source="claude_code",
        message_id="msg_X",
        session_id="S",
        model="some-foundry-deployment",
        timestamp_utc="2026-06-14T01:00:10.000Z",
        input_tokens=1000,
    )
    assert book.compute_cost(ev) is None


def test_dated_model_id_resolves_to_base_price():
    """`claude-haiku-4-5-20251001` のような日付サフィックス付きIDも単価に解決される。"""
    book = PriceBook({"claude-sonnet-4-6": {"input": 3.0, "output": 15.0, "cache_write_1h": 6.0, "cache_write_5m": 3.75, "cache_read": 0.3}})
    ev = UsageEvent(
        source="claude_code",
        message_id="m",
        session_id="S",
        model="claude-sonnet-4-6-20260101",
        timestamp_utc="2026-06-14T01:00:10.000Z",
        input_tokens=1_000_000,
    )
    assert round(book.compute_cost(ev), 4) == 3.0


def test_synthetic_model_is_zero_not_unallocated():
    book = _book()
    ev = UsageEvent(
        source="claude_code",
        message_id="u",
        session_id="S",
        model="<synthetic>",
        timestamp_utc="2026-06-14T02:05:00.000Z",
    )
    assert book.compute_cost(ev) == 0.0
