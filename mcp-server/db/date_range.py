import calendar
import re
from datetime import date, timedelta

MONTH_NAMES = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
    'jun': 6, 'jul': 7, 'aug': 8,
    'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
}


def _end_of_month(year: int, month: int) -> date:
    return date(year, month, calendar.monthrange(year, month)[1])


def parse_date_range(date_range: str) -> tuple[str, str]:
    today = date.today()
    dr = date_range.lower().strip()

    # yesterday
    if re.search(r'\byesterday\b', dr):
        yesterday = today - timedelta(days=1)
        return yesterday.isoformat(), yesterday.isoformat()

    # all time
    if re.search(r'\ball\s+time\b|\ball\s+data\b|\beverything\b', dr):
        return date(2000, 1, 1).isoformat(), today.isoformat()

    # last N / past N days / weeks / months / years
    m = re.match(r'(?:last|past)\s+(\d+)\s*(day|days|week|weeks|month|months|year|years)', dr)
    if m:
        n, unit = int(m.group(1)), m.group(2)
        if 'year' in unit:
            days = n * 365
        elif 'month' in unit:
            days = n * 30
        elif 'week' in unit:
            days = n * 7
        else:
            days = n
        return (today - timedelta(days=days)).isoformat(), today.isoformat()

    # last week / past week / previous week (Mon–Sun of previous calendar week)
    if re.search(r'\blast\s+week\b|\bpast\s+week\b|\bprevious\s+week\b', dr):
        start_of_this_week = today - timedelta(days=today.weekday())
        end_of_last_week   = start_of_this_week - timedelta(days=1)
        start_of_last_week = start_of_this_week - timedelta(days=7)
        return start_of_last_week.isoformat(), end_of_last_week.isoformat()

    # this week (Monday → today)
    if re.search(r'\bthis\s+week\b', dr):
        return (today - timedelta(days=today.weekday())).isoformat(), today.isoformat()

    # last month (previous calendar month)
    if re.search(r'\blast\s+month\b', dr):
        first_this = today.replace(day=1)
        last_prev = first_this - timedelta(days=1)
        return last_prev.replace(day=1).isoformat(), last_prev.isoformat()

    # this month / current month
    if re.search(r'\bthis\s+month\b|\bcurrent\s+month\b', dr):
        return today.replace(day=1).isoformat(), today.isoformat()

    # specific quarter: q1 2026, q3 2025
    m = re.search(r'q([1-4])\s*(\d{4})', dr)
    if m:
        q, year = int(m.group(1)), int(m.group(2))
        start_month = (q - 1) * 3 + 1
        end_month = q * 3
        end = min(_end_of_month(year, end_month), today)
        return date(year, start_month, 1).isoformat(), end.isoformat()

    # last quarter
    if re.search(r'\blast\s+quarter\b', dr):
        q = (today.month - 1) // 3
        if q == 0:
            sy, sm, ey, em = today.year - 1, 10, today.year - 1, 12
        else:
            sy = ey = today.year
            sm, em = (q - 1) * 3 + 1, q * 3
        return date(sy, sm, 1).isoformat(), _end_of_month(ey, em).isoformat()

    # this quarter / current quarter
    if re.search(r'\bthis\s+quarter\b|\bcurrent\s+quarter\b', dr):
        q = (today.month - 1) // 3 + 1
        return date(today.year, (q - 1) * 3 + 1, 1).isoformat(), today.isoformat()

    # current year / this year / ytd / year to date
    if re.search(r'\bcurrent\s+year\b|\bthis\s+year\b|\bytd\b|\byear\s+to\s+date\b', dr):
        return date(today.year, 1, 1).isoformat(), today.isoformat()

    # last year
    if re.search(r'\blast\s+year\b', dr):
        return date(today.year - 1, 1, 1).isoformat(), date(today.year - 1, 12, 31).isoformat()

    # specific month name + year: "january 2026", "mar 2025"
    for name, num in MONTH_NAMES.items():
        m = re.search(rf'\b{name}\b[^0-9]*(\d{{4}})', dr)
        if not m:
            m = re.search(rf'(\d{{4}})[^0-9]*\b{name}\b', dr)
        if m:
            year = int(m.group(1))
            end = min(_end_of_month(year, num), today)
            return date(year, num, 1).isoformat(), end.isoformat()

    # month name only, no year: "april", "march" → most recent occurrence
    for name, num in MONTH_NAMES.items():
        if re.search(rf'\b{name}\b', dr):
            year = today.year if num <= today.month else today.year - 1
            end = min(_end_of_month(year, num), today)
            return date(year, num, 1).isoformat(), end.isoformat()

    # ISO date range: "2026-01-01 to 2026-03-31" or "between 2026-01-01 and 2026-03-31"
    m = re.search(r'(\d{4}-\d{2}-\d{2})\s*(?:to|through|until|and|[-–])\s*(\d{4}-\d{2}-\d{2})', dr)
    if m:
        return m.group(1), m.group(2)

    # single ISO date: "2026-04-15" → that one day
    m = re.match(r'^(\d{4}-\d{2}-\d{2})$', dr)
    if m:
        return m.group(1), m.group(1)

    # last 30 / last 90 (no unit — treat as days, legacy support)
    m = re.match(r'(?:last|past)\s+(\d+)', dr)
    if m:
        return (today - timedelta(days=int(m.group(1)))).isoformat(), today.isoformat()

    # default: last 30 days
    return (today - timedelta(days=30)).isoformat(), today.isoformat()
