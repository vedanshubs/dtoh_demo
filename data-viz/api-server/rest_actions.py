from pydantic import BaseModel


class ResultsSummaryRequest(BaseModel):
    date_range: str
    disposition: str | None = None
    reason_for_test: str | None = None
    specimen_type: str | None = None


class PipelineStatusRequest(BaseModel):
    date_range: str
    status: str | None = None


class AnalyteBreakdownRequest(BaseModel):
    date_range: str
    analyte_name: str | None = None
    disposition: str | None = None


class TurnaroundStatsRequest(BaseModel):
    date_range: str
    reason_for_test: str | None = None
    specimen_type: str | None = None
    regulation: str | None = None


def register_action_routes(app, mcp_manager):
    @app.post("/actions/get_results_summary")
    async def action_results_summary(req: ResultsSummaryRequest):
        return await mcp_manager.call_tool("get_results_summary", req.model_dump(exclude_none=True))

    @app.post("/actions/get_pipeline_status")
    async def action_pipeline_status(req: PipelineStatusRequest):
        return await mcp_manager.call_tool("get_pipeline_status", req.model_dump(exclude_none=True))

    @app.post("/actions/get_analyte_breakdown")
    async def action_analyte_breakdown(req: AnalyteBreakdownRequest):
        return await mcp_manager.call_tool("get_analyte_breakdown", req.model_dump(exclude_none=True))

    @app.post("/actions/get_turnaround_stats")
    async def action_turnaround_stats(req: TurnaroundStatsRequest):
        return await mcp_manager.call_tool("get_turnaround_stats", req.model_dump(exclude_none=True))
