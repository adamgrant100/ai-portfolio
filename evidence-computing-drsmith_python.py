"""
drsmith.py — Name normalisation and de-duplication.

Part A1:
- Remove duplicates caused by casing, inconsistent spacing, and minor punctuation inconsistencies.
- Normalises common "Dr" formatting variants such as:
  "Dr.Smith", "Dr. Smith", "Dr Smith", "DR SMITH".
- Preserves the first-seen original string for output.
- Returns output sorted by the normalised keys for stable, predictable ordering.
"""

from __future__ import annotations

from typing import Iterable, List, Dict
import re

_WS_RE = re.compile(r"\s+")
_DOT_BETWEEN_LETTERS_RE = re.compile(r"(?i)([a-z])\.(?=[a-z])")
_DR_MISSING_DOT_RE = re.compile(r"(?i)\bdr\b(?!\.)\s+")


def normalize_name(name: str) -> str:
    """
    Produces a canonical key for de-duplication.

    Steps:
    1) casefold + strip
    2) normalise "Dr" without dot: "dr smith" -> "dr. smith"
    3) normalise dot spacing between letters: "dr.smith" -> "dr. smith"
    4) collapse whitespace
    """
    if not isinstance(name, str):
        raise TypeError(f"name must be a str, got {type(name).__name__}")

    s = name.casefold().strip()
    s = _DR_MISSING_DOT_RE.sub("dr. ", s)
    s = _DOT_BETWEEN_LETTERS_RE.sub(r"\1. ", s)
    s = _WS_RE.sub(" ", s)
    return s


def process_names(names: Iterable[str]) -> List[str]:
    """
    De-duplicate names, preserving the first-seen original string for each normalised key.
    Returns results sorted by normalised key.
    """
    first_seen: Dict[str, str] = {}

    for original in names:
        key = normalize_name(original)
        if key not in first_seen:
            first_seen[key] = original if isinstance(original, str) else str(original)

    return [first_seen[k] for k in sorted(first_seen.keys())]


def _demo() -> None:
    test_names = ["Dr. Smith", "Dr.Smith", "Dr Smith", "Dr Smith ", "DR SMITH"]
    print("Original list:", test_names)
    print("Processed list:", process_names(test_names))


if __name__ == "__main__":
    _demo()