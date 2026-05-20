from typing import Annotated, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class KpiItem(_Strict):
    label: str
    value: str
    sublabel: Optional[str] = None
    status: Literal["good", "warning", "bad", "neutral"] = "neutral"


class ReferenceLine(_Strict):
    value: float
    label: str
    color: Literal["red", "amber", "green", "blue", "gray"] = "red"


class ColorRule(_Strict):
    field: str
    threshold: float
    above_color: str = "red"
    below_color: str = "green"


class SegmentItem(_Strict):
    label: str
    value: float
    color: Optional[str] = None


# ── Existing primitives ────────────────────────────────────────────────────────

class KpiStrip(_Strict):
    type: Literal["kpi_strip"]
    items: list[KpiItem]


class BarPanel(_Strict):
    type: Literal["bar"]
    title: Optional[str] = None
    data: list[dict]
    x: str
    y: str
    y_label: Optional[str] = None
    reference_lines: Optional[list[ReferenceLine]] = None
    color_rule: Optional[ColorRule] = None


class StackedBarHorizontal(_Strict):
    type: Literal["stacked_bar_horizontal"]
    title: Optional[str] = None
    unit: str = "days"
    segments: list[SegmentItem]
    reference_line: Optional[ReferenceLine] = None


# ── New primitives ─────────────────────────────────────────────────────────────

class DonutPanel(_Strict):
    type: Literal["donut"]
    title: Optional[str] = None
    data: list[dict]
    name_key: str
    value_key: str
    center_label: Optional[str] = None


class LinePanel(_Strict):
    type: Literal["line"]
    title: Optional[str] = None
    data: list[dict]
    x: str
    y: str
    y_label: Optional[str] = None
    reference_lines: Optional[list[ReferenceLine]] = None
    fill: bool = True


class FunnelPanel(_Strict):
    type: Literal["funnel"]
    title: Optional[str] = None
    data: list[dict]
    name_key: str
    value_key: str
    highlight: Optional[str] = None


class TablePanel(_Strict):
    type: Literal["table"]
    title: Optional[str] = None
    data: list[dict]
    columns: Optional[list[str]] = None


# ── Union ──────────────────────────────────────────────────────────────────────

Panel = Annotated[
    Union[KpiStrip, BarPanel, StackedBarHorizontal, DonutPanel, LinePanel, FunnelPanel, TablePanel],
    Field(discriminator="type"),
]


class View(_Strict):
    panels: list[Panel]


class Reply(_Strict):
    summary: str
    view: Optional[View] = None
    suggestions: list[str] = Field(default_factory=list)
