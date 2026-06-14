"""モデル別単価とコスト計算。

知りたいのは Anthropic 定価ではなく **Foundry の実課金額** なので、単価は
``DEFAULT_PRICES`` をひな型に各自で上書きする前提（README 参照）。
単価が無いモデルは ``cost_usd=None`` を返し、集計側で「未割当コスト」として可視化する。
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from tokentracker.models import SYNTHETIC_MODEL, UsageEvent

# 末尾の日付サフィックス（例 -20251001）。単価キーは日付なしの基底IDで持つ。
_DATE_SUFFIX = re.compile(r"-\d{8}$")

# 1M トークンあたりの USD。トークン種別ごとに別単価（cache_write は 1h>5m、read は割引）。
# 値はあくまでひな型。Foundry の実課金レートに合わせて上書きすること。
PriceTable = dict[str, dict[str, float]]

DEFAULT_PRICES: PriceTable = {
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0, "cache_write_1h": 6.0, "cache_write_5m": 3.75, "cache_read": 0.30},
    "claude-opus-4-8": {"input": 15.0, "output": 75.0, "cache_write_1h": 30.0, "cache_write_5m": 18.75, "cache_read": 1.50},
    "claude-haiku-4-5": {"input": 1.0, "output": 5.0, "cache_write_1h": 2.0, "cache_write_5m": 1.25, "cache_read": 0.10},
}

# Foundry のデプロイ名 → 正規モデル ID。必要に応じて追記する。
MODEL_ALIASES: dict[str, str] = {}


@dataclass
class PriceBook:
    prices: PriceTable
    aliases: dict[str, str] | None = None

    def resolve_model(self, model: str) -> str:
        aliases = self.aliases if self.aliases is not None else MODEL_ALIASES
        return aliases.get(model, model)

    def compute_cost(self, ev: UsageEvent) -> float | None:
        """イベントの判明コスト(USD)。未知モデルは None（未割当）。

        ``<synthetic>``（トークン 0 のローカル no-op 行）は 0.0 を返し、未割当ノイズに出さない。
        """
        if ev.model == SYNTHETIC_MODEL:
            return 0.0
        model = self.resolve_model(ev.model)
        rate = self.prices.get(model)
        if rate is None:
            # 日付サフィックスを外した基底IDで再試行（claude-...-YYYYMMDD → claude-...）。
            rate = self.prices.get(_DATE_SUFFIX.sub("", model))
        if rate is None:
            return None
        per_million = (
            ev.input_tokens * rate.get("input", 0.0)
            + ev.output_tokens * rate.get("output", 0.0)
            + ev.cache_creation_1h_tokens * rate.get("cache_write_1h", 0.0)
            + ev.cache_creation_5m_tokens * rate.get("cache_write_5m", 0.0)
            + ev.cache_read_tokens * rate.get("cache_read", 0.0)
        )
        return per_million / 1_000_000


def default_pricebook() -> PriceBook:
    return PriceBook(prices=DEFAULT_PRICES, aliases=MODEL_ALIASES)
