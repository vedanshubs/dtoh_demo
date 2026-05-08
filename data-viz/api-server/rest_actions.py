from pydantic import BaseModel


class ResultsSummaryRequest(BaseModel):
    date_range: str
    disposition: str | None = None
    reason_for_test: str | None = None
    specimen_type: str | None = None


class PipelineStatusRequest(BaseModel):
    date_range: str
    status: str | None = None


def register_action_routes(app, mcp_manager):
    @app.post("/actions/get_results_summary")
    async def action_results_summary(req: ResultsSummaryRequest):
        return await mcp_manager.call_tool("get_results_summary", req.model_dump(exclude_none=True))

    @app.post("/actions/get_pipeline_status")
    async def action_pipeline_status(req: PipelineStatusRequest):
        return await mcp_manager.call_tool("get_pipeline_status", req.model_dump(exclude_none=True))
