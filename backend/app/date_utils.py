"""Small ISO-date-string arithmetic helpers shared by generic.py and
scheduler.py. Every date field in this codebase is a plain string (see
models/definitions.py's docstring), so these operate on/return ISO date
strings (`yyyy-mm-dd...`) rather than `date` objects."""

import calendar
from datetime import date, timedelta


def add_days(iso_date: str, n: int) -> str:
    d = date.fromisoformat(iso_date[:10])
    return (d + timedelta(days=n)).isoformat()


def add_months(iso_date: str, n: int) -> str:
    """Advance by n calendar months, clamping the day to the target month's
    length (e.g. Jan 31 + 1 month -> Feb 28/29)."""
    d = date.fromisoformat(iso_date[:10])
    month_index = d.month - 1 + n
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day).isoformat()
