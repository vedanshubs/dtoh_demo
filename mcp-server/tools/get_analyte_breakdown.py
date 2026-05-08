from mocks.responses import mock_analyte_breakdown


async def handle_get_analyte_breakdown(
    client_id: str,
    date_range: str,
    analyte_name: str | None = None,
    disposition: str | None = None,
    use_mock: bool = True,
) -> dict:
    if use_mock:
        return mock_analyte_breakdown(client_id, date_range)
    from db.queries import query_analyte_breakdown
    return await query_analyte_breakdown(client_id, date_range, analyte_name, disposition)
