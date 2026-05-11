from mocks.responses import mock_pipeline_status
from db.queries import query_pipeline_status


async def handle_get_pipeline_status(
    client_id: str,
    date_range: str,
    status: str | None = None,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    use_mock: bool = True,
) -> dict:
    if use_mock:
        return mock_pipeline_status(client_id, date_range)
    return await query_pipeline_status(
        client_id, date_range,
        status=status,
        reason_for_test=reason_for_test,
        specimen_type=specimen_type,
    )
