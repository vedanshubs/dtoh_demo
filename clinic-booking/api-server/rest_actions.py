from pydantic import BaseModel
from fastapi import APIRouter


class SearchClinicsRequest(BaseModel):
    zipcode: str
    radius: float
    service_identifier: str


class PlaceOrderRequest(BaseModel):
    clinic_id: int
    donor_id: int
    service_identifier: str
    reason_for_test: str


def register_action_routes(app, mcp_manager):
    @app.post("/actions/search_clinics")
    async def action_search_clinics(req: SearchClinicsRequest):
        return await mcp_manager.call_tool("search_clinics", req.model_dump())

    @app.post("/actions/place_order")
    async def action_place_order(req: PlaceOrderRequest):
        return await mcp_manager.call_tool("place_order", req.model_dump())
