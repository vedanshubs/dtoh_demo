"""
Explicit per-donor booking state machine.

The LLM advises; this state machine enforces. Transitions are valid only along
the directed graph below. Write tools (place_order) require the state to be
`AWAITING_CONFIRMATION` AND an idempotency token that matches the proposed
booking — otherwise the call is rejected before reaching MCP.

States
──────
IDLE ──► SELECTING_TEST ──► SELECTING_REASON ──► SEARCHING ──► CHOOSING_CLINIC
                                                                       │
                                                                       ▼
                                                              AWAITING_CONFIRMATION ──► CONFIRMED
                                                                                            ▲
                                                                            (place_order ok)
"""
from __future__ import annotations
import hashlib
import json
import logging
import threading
import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional

log = logging.getLogger(__name__)


class State(str, Enum):
    IDLE                  = "idle"
    SELECTING_TEST        = "selecting_test"
    SELECTING_REASON      = "selecting_reason"
    SEARCHING             = "searching"
    CHOOSING_CLINIC       = "choosing_clinic"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    CONFIRMED             = "confirmed"


# Allowed transitions. Anything not listed is rejected.
_ALLOWED: dict[State, set[State]] = {
    State.IDLE:                  {State.SELECTING_TEST, State.SELECTING_REASON, State.SEARCHING},
    State.SELECTING_TEST:        {State.SELECTING_REASON, State.SEARCHING, State.IDLE},
    State.SELECTING_REASON:      {State.SEARCHING, State.SELECTING_TEST, State.IDLE},
    State.SEARCHING:             {State.CHOOSING_CLINIC, State.IDLE},
    State.CHOOSING_CLINIC:       {State.AWAITING_CONFIRMATION, State.SEARCHING, State.IDLE},
    State.AWAITING_CONFIRMATION: {State.CONFIRMED, State.CHOOSING_CLINIC, State.SEARCHING, State.IDLE},
    State.CONFIRMED:             {State.IDLE},
}


def _booking_fingerprint(b: dict) -> str:
    """Stable idempotency key derived from the proposed booking fields."""
    canonical = json.dumps({
        "candidate":      b.get("candidate", ""),
        "test_type":      b.get("test_type", ""),
        "reason":         b.get("reason", ""),
        "clinic":         b.get("clinic", ""),
        "address":        b.get("address", ""),
        "zip":            b.get("zip", ""),
        "preferred_date": b.get("preferred_date", ""),
    }, sort_keys=True)
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]


@dataclass
class BookingSession:
    donor_id: int
    state: State = State.IDLE
    proposed: Optional[dict] = None     # booking_summary fields at AWAITING_CONFIRMATION
    fingerprint: Optional[str] = None   # idempotency key from proposed
    registration_id: Optional[str] = None
    history: list[dict] = field(default_factory=list)  # [{ts, from, to, reason}]

    def to_dict(self) -> dict:
        d = asdict(self)
        d["state"] = self.state.value
        return d

    def transition(self, target: State, reason: str = "") -> None:
        if target not in _ALLOWED.get(self.state, set()) and target != self.state:
            raise ValueError(
                f"Invalid transition {self.state.value} → {target.value} (reason={reason!r})"
            )
        self.history.append({
            "ts": time.time(), "from": self.state.value, "to": target.value, "reason": reason,
        })
        log.info("[state] donor=%d %s → %s (%s)", self.donor_id, self.state.value, target.value, reason)
        self.state = target

    def propose_booking(self, booking: dict) -> str:
        """Move to AWAITING_CONFIRMATION and lock the fingerprint."""
        self.proposed = booking
        self.fingerprint = _booking_fingerprint(booking)
        if self.state != State.AWAITING_CONFIRMATION:
            self.transition(State.AWAITING_CONFIRMATION, "booking_summary emitted")
        return self.fingerprint

    def can_place_order(self, fingerprint: str) -> tuple[bool, str]:
        if self.state != State.AWAITING_CONFIRMATION:
            return False, f"state={self.state.value} (need awaiting_confirmation)"
        if self.fingerprint and fingerprint != self.fingerprint:
            return False, "idempotency token mismatch"
        return True, "ok"

    def mark_confirmed(self, registration_id: str) -> None:
        self.registration_id = registration_id
        self.transition(State.CONFIRMED, f"place_order returned {registration_id}")


# ── In-memory store (single-process). Swap for Redis in production. ────────────

_store: dict[int, BookingSession] = {}
_lock = threading.Lock()


def get_session(donor_id: int) -> BookingSession:
    with _lock:
        if donor_id not in _store:
            _store[donor_id] = BookingSession(donor_id=donor_id)
        return _store[donor_id]


def reset_session(donor_id: int) -> None:
    with _lock:
        _store[donor_id] = BookingSession(donor_id=donor_id)


def infer_state_from_actions(session: BookingSession, actions: list[dict], clinics_returned: bool) -> None:
    """
    Apply state transitions based on the model's structured output.

    The model still drives the conversation; this function turns its
    emitted intents into validated state transitions.
    """
    types = {a.get("type") for a in actions}

    # booking_confirmed: terminal
    if "booking_confirmed" in types:
        a = next(a for a in actions if a.get("type") == "booking_confirmed")
        if session.state != State.CONFIRMED:
            session.mark_confirmed(a.get("registration_id", ""))
        return

    # booking_summary: lock proposed booking, move to AWAITING_CONFIRMATION
    if "booking_summary" in types:
        b = next(a for a in actions if a.get("type") == "booking_summary")
        session.propose_booking(b)
        return

    # search_clinics tool fired → SEARCHING / CHOOSING_CLINIC
    if clinics_returned:
        # If we're already past SEARCHING, leave it; otherwise advance.
        if session.state in (State.IDLE, State.SELECTING_TEST, State.SELECTING_REASON, State.SEARCHING):
            try:
                if session.state != State.SEARCHING:
                    session.transition(State.SEARCHING, "search_clinics returned")
                session.transition(State.CHOOSING_CLINIC, "clinics displayed")
            except ValueError as e:
                log.warning("state inference: %s", e)
        return

    # quick_replies hint: which prompt the model is asking
    if "quick_replies" in types:
        qr = next(a for a in actions if a.get("type") == "quick_replies")
        items_lower = " ".join(qr.get("items", [])).lower()
        # Heuristics based on what the chips contain
        try:
            if any(w in items_lower for w in ("pre-employment", "random", "for cause")):
                if session.state in (State.IDLE, State.SELECTING_TEST):
                    session.transition(State.SELECTING_REASON, "asked for reason")
            elif any(w in items_lower for w in ("panel", "urine", "hair", "oral", "breath")):
                if session.state == State.IDLE:
                    session.transition(State.SELECTING_TEST, "asked for test type")
        except ValueError as e:
            log.debug("state inference (quick_replies): %s", e)
