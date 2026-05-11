from mocks.responses import mock_pipeline_status


async def handle_get_pipeline_status(
    client_id: str,
    date_range: str,
    status: str | None = None,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
) -> dict:
    return mock_pipeline_status(client_id, date_range)
