"""ULID helpers. ULIDs are time-sortable, URL-safe, 26 chars."""

import ulid


def new_ulid() -> str:
    return str(ulid.new())
