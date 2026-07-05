"""In-memory prefix search over the GeoNames cities dataset.

Lazy-loaded on first search. The dataset (~170k cities) is sorted
by name so prefix lookups are fast with early exit.
"""

import bisect
import json
import os

_cities = None


def _load():
    global _cities
    if _cities is not None:
        return
    path = os.path.join(os.path.dirname(__file__), "..", "data", "cities.json")
    with open(path, "r", encoding="utf-8") as f:
        _cities = json.load(f)


def _city_only(entry):
    """Return the city name part (before ','), lowercased."""
    return entry["name"].split(",")[0].lower()


def search_cities(query, limit=8):
    """Return up to `limit` cities whose name starts with `query` (case-insensitive).

    Each result is ``{"name": "City, CC", "lat": ..., "lon": ..., "pop": ...}``.
    Results sorted: exact matches first, then by population descending so that
    major cities (e.g. Paris) appear before tiny villages.
    Falls back to an empty list when there are no local matches.
    """
    _load()
    q = query.strip().lower()
    if len(q) < 2:
        return []
    idx = bisect.bisect_left(_cities, q, key=lambda c: c["name"].lower())
    exact = []
    prefix = []
    for c in _cities[idx:]:
        name_lower = c["name"].lower()
        if not name_lower.startswith(q):
            break
        if name_lower == q:
            exact.append(c)
        else:
            prefix.append(c)
    # Within prefix matches, sort by population descending
    prefix.sort(key=lambda c: c.get("pop", 0) or 0, reverse=True)
    combined = (exact + prefix)[:limit]
    return combined
