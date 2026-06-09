"""
Structured action DSL for the clinic-booking assistant.

Replaces the legacy free-text contract:
  - [BOOKING_SUMMARY]...[/BOOKING_SUMMARY] regex sentinel
  - Numbered/bulleted lists parsed as quick-reply chips
  - "Registration ID: ..." regex match in prose

Every model turn now emits a JSON object validated against `Reply`:
  {
    "message": "Plain prose, no UI signals embedded.",
    "actions": [ ...zero or more typed actions... ]
  }
"""
from typing import Annotated, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ── Actions ────────────────────────────────────────────────────────────────────

class QuickReplies(_Strict):
    """Clickable chips below the message. Items become user-message text when clicked."""
    type: Literal["quick_replies"]
    items: list[str] = Field(..., min_length=1, max_length=8)


class LocationRequest(_Strict):
    """Ask the user where to search — renders an inline ZIP + radius form.
    Emitted once test type AND reason are known, BEFORE search_clinics is called."""
    type: Literal["location_request"]
    default_zip:    str = ""    # prefill — the donor's home ZIP
    default_radius: float = 10  # prefill — default search radius in miles


class BookingSummary(_Strict):
    """Proposed booking shown as a confirmation card BEFORE place_order is called."""
    type: Literal["booking_summary"]
    candidate:           str
    test_type:           str
    service_identifier:  str       # required by place_order
    reason:              str
    clinic:              str
    site_id:             str       # required by place_order
    address:             str
    zip:                 str
    preferred_date:      str


class BookingConfirmed(_Strict):
    """Final booking after place_order succeeded. Emitted with the registration ID from the tool result."""
    type: Literal["booking_confirmed"]
    registration_id:    str
    candidate:          str
    test_type:          str
    reason:             str
    clinic:             str
    address:            str
    zip:                str
    preferred_date:     str
    appointment_window: Optional[str] = None


Action = Annotated[
    Union[QuickReplies, LocationRequest, BookingSummary, BookingConfirmed],
    Field(discriminator="type"),
]


# ── Reply envelope ─────────────────────────────────────────────────────────────

class Reply(_Strict):
    message: str
    actions: list[Action] = Field(default_factory=list)
