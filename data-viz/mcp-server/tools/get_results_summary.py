from mocks.responses import mock_results_summary


async def handle_get_results_summary(
    client_id: str,
    date_range: str,
    disposition: str | None = None,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    regulation: str | None = None,
    use_mock: bool = True,
) -> dict:
    if use_mock:
        return mock_results_summary(client_id, date_range)
    from db.queries import query_results_summary
    return await query_results_summary(client_id, date_range, disposition, reason_for_test, specimen_type, regulation)
