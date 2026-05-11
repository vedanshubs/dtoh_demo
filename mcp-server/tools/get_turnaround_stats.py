from mocks.responses import mock_turnaround_stats


async def handle_get_turnaround_stats(
    client_id: str,
    date_range: str,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    regulation: str | None = None,
) -> dict:
    return mock_turnaround_stats(client_id, date_range)
