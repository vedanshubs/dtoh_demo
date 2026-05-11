from mocks.responses import mock_turnaround_stats
from db.queries import query_turnaround_stats


async def handle_get_turnaround_stats(
    client_id: str,
    date_range: str,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    regulation: str | None = None,
    use_mock: bool = True,
) -> dict:
    if use_mock:
        return mock_turnaround_stats(client_id, date_range)
    return await query_turnaround_stats(
        client_id, date_range,
        reason_for_test=reason_for_test,
        specimen_type=specimen_type,
        regulation=regulation,
    )
