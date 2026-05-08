from datetime import date, timedelta


def parse_date_range(date_range: str) -> tuple[str, str]:
    today = date.today()
    dr = date_range.lower().strip()

    if "last 30" in dr:
        start = today - timedelta(days=30)
    elif "last 90" in dr:
        start = today - timedelta(days=90)
    elif "last quarter" in dr:
        q = (today.month - 1) // 3
        if q == 0:
            start = date(today.year - 1, 10, 1)
            end_dt = date(today.year - 1, 12, 31)
        else:
            start = date(today.year, q * 3 - 2, 1)
            end_dt = date(today.year, q * 3, [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][q * 3 - 1])
        return start.isoformat(), end_dt.isoformat()
    elif "current year" in dr:
        start = date(today.year, 1, 1)
    else:
        start = today - timedelta(days=30)

    return start.isoformat(), today.isoformat()
