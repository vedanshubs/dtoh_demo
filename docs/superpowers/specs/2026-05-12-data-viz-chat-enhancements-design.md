# Data-Viz Chat Enhancements — Design Spec
**Date:** 2026-05-12
**Status:** Approved

## Goal

Turn the existing data-viz chat POC into a compelling compliance self-service demo for UBS stakeholders. The story: a client admin gets instant compliance insights through natural language — no SQL, no dashboards, no IT ticket.

## Scope

Six targeted changes. Backend, MCP server, DB, and `ai/conversation.py` are untouched.

| # | What | File(s) |
|---|---|---|
| 1 | System prompt — compliance persona + suggestions rule | `data-viz/api-server/ai/prompts/system_prompt.py` |
| 2 | Grouped bar chart — multi-key side-by-side bars | `data-viz/frontend/src/components/ChartRenderer.jsx` |
| 3 | Suggestion chips — 3 clickable follow-ups after each reply | `data-viz/frontend/src/components/Chat.jsx` |
| 4 | Stop button — abort in-flight AI request | `data-viz/frontend/src/components/Chat.jsx` |
| 5 | Model-agnostic branding | `data-viz/frontend/src/App.jsx`, `Chat.jsx` |
| 6 | Empty state copy — real compliance questions | `data-viz/frontend/src/components/Chat.jsx` |

---

## 1. System Prompt

### Persona
The assistant is a drug testing compliance advisor for a UBS client administrator. It speaks with authority about testing data, knows UBS's four cost centers (NY-HQ, NJ-Weehawken, CT-Stamford, NY-Midtown), understands DOT vs non-DOT distinction, MRO review workflow, and the 5-day end-to-end SLA target.

### Tool Selection Rules
Exactly one tool per response unless the question genuinely requires two dimensions.

| User intent | Tool |
|---|---|
| Results / outcomes / positive rate / dispositions | `get_results_summary` |
| Pending / in progress / pipeline / waiting on MRO | `get_pipeline_status` |
| Substance-level / which drug / analyte detail | `get_analyte_breakdown` |
| Speed / turnaround / SLA / how long tests take | `get_turnaround_stats` |

Two-tool example: "Are For Cause tests slower than Pre-Employment?" → call `get_results_summary` + `get_turnaround_stats`.

### Date Range Handling
- If no period is mentioned → silently default to `last 30 days`
- If user says "this quarter", "this year", "last 90 days" → map and use
- Only ask for clarification if the question is genuinely ambiguous about what data is wanted (rare)

### Proactive Insight Rule
After showing data, the assistant flags anything notable without being asked:
- Positive rate > 4% → flag against industry benchmark
- SLA compliance < 90% → call it out
- A cost center with a disproportionate share of no-shows or pending orders → surface it
- Pipeline items older than 5 days → mention if visible in data

### Response Format
Every response must be valid JSON matching this shape exactly:

```json
{
  "summary": "Lead with the headline number. One to two sentences. Flag anything notable inline.",
  "visualization": "bar_chart | pie_chart | line_chart | stat | table",
  "data": { "...tool response fields..." },
  "suggestions": [
    "Specific follow-up scoped to what was just shown",
    "Another drill-down or comparison",
    "A third angle the admin would care about"
  ]
}
```

### Suggestions Rule
Always return exactly 3 suggestions. They must be:
- **Specific** — scoped to the data just shown, not generic
- **Progressive** — guide the admin deeper or sideways, not back to basics
- **Compliance-relevant** — the kind of question an HR or compliance admin would actually ask next

Bad: "Show me more data." / "What else would you like to know?"
Good: "Which cost center had the highest positive rate?" / "How many of these are still awaiting MRO verification?"

### Tone
Professional, direct, concise. Does not hedge or over-qualify. Surfaces concerns clearly without alarm.

---

## 2. Grouped Bar Chart

### Problem
`ChartRenderer.jsx` currently picks only the first numeric key from chart data. The analyte breakdown returns `{ analyte, positive, negative }` per row — rendering only one bar loses critical context (the ratio of positives to negatives per substance is the insight).

### Fix
In the `bar_chart` branch:
1. Detect all numeric keys in the first row
2. If exactly one numeric key → render a single `<Bar>` as today
3. If multiple numeric keys → render a `<Bar>` per key with distinct colors, add a `<Legend>`

Color assignment: use the existing `COLORS` array, one color per bar series.

---

## 3. Suggestion Chips

### Behavior
After each assistant message, render the `suggestions` array as a horizontal row of clickable pill buttons directly below the chart/summary. Clicking a chip fires that text as the next user message — identical to typing and pressing Enter.

### Display Rules
- Chips appear only on the most recent assistant message (not on earlier messages in history)
- If `suggestions` is missing or empty, render nothing
- Chips disappear once the user sends a new message (they're replaced by the next response's suggestions)

### Style
Pill buttons: light background, subtle border, UBS red on hover. Small text (12px), compact padding. Aligned left under the reply bubble.

---

## 4. Stop Button

### Behavior
- While `loading` is true, the send button (➤) becomes a Stop button (⏹)
- Clicking Stop calls `AbortController.abort()` on the in-flight fetch
- On abort: clears `loading`, does not append an error message, restores the input field focus
- The aborted partial response is not shown

### Implementation
- A `abortRef = useRef(null)` holds the current `AbortController`
- On each `send()` call: create a new `AbortController`, assign to `abortRef.current`, pass its `signal` to `fetch()`
- On abort: catch `AbortError` in the `catch` block and handle silently (no error message)
- On `finally`: clear `abortRef.current = null`

---

## 5. Model-Agnostic Branding

Replace all references to "Claude AI" with neutral labels:

| Location | Current | New |
|---|---|---|
| `App.jsx` header subtitle | `Powered by Claude AI · MCP` | `AI-powered · MCP` |
| `Chat.jsx` assistant status | `Online · Claude AI` | `Online` |
| `Chat.jsx` input footer | `Enter to send · Claude AI · MCP-powered` | `Enter to send · MCP-powered` |

---

## 6. Empty State Copy

Replace generic placeholder suggestions with questions a real UBS compliance admin would open with:

```
"What's our positive rate for pre-employment tests this quarter?"
"How many tests are currently waiting for MRO review?"
"Which substances showed the most positives in the last 90 days?"
"Are we meeting our 5-day turnaround SLA?"
```

Same applies to the `QUICK_QUERIES` sidebar buttons in `App.jsx` — labels and queries updated to match the compliance framing.

---

## What Is Not Changing
- Backend FastAPI server and routes
- MCP server, tools, and DB queries
- `ai/conversation.py` (OpenAI client stays)
- Overall chat layout and component structure
- Recharts library and chart color palette
- Conversation history handling (already correct)
