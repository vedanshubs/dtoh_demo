from mocks.responses import mock_analyte_breakdown


async def handle_get_analyte_breakdown(
    client_id: str,
    date_range: str,
    analyte_name: str | None = None,
    disposition: str | None = None,
) -> dict:
    return mock_analyte_breakdown(client_id, date_range)
