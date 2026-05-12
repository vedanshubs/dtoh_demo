# Analytics POC — Demo Scenarios
**Audience:** HR Director / Chief Compliance Officer / Head of Operations  
**Platform:** UBS Drug Testing Compliance Analytics (AI-powered, MCP-backed)  
**Goal:** Show that natural-language querying replaces manual data extraction, surfaces insights proactively, and gives compliance teams a real-time edge.

---

## Scenario 1 — Quarterly Compliance Snapshot
**Complexity:** Simple  
**Persona:** Chief Compliance Officer preparing a board-level update  
**Setting:** End of Q1. The CCO has a board deck due in 48 hours. She needs the headline numbers — positive rate, test volume, and SLA adherence — without waiting for the analytics team to run reports.

### Demo Flow

**Step 1 — Open with the headline question:**
> "What is our positive rate for Q1 2026 and how does it compare to the industry benchmark?"

*What to show:* The assistant pulls `get_results_summary` for Q1 2026, surfaces the positive rate instantly, and benchmarks it against the 4% industry standard for financial services firms. If the rate is below 4%, it says so clearly. If above, it flags it unprompted.

**Step 2 — Drill into volume:**
> "How many total tests did we run this quarter, broken down by test type?"

*What to show:* Pie or bar chart of DOT vs Non-DOT, urine vs hair vs oral fluid. The AI notes which types drove volume.

**Step 3 — Close with SLA:**
> "Are we meeting our 5-day turnaround SLA for Q1?"

*What to show:* `get_turnaround_stats` returns average days per stage. The AI compares against the 5-day target and calls out whether collection, lab processing, or MRO review is the longest leg.

### Business Value
> *"What used to take two analysts and a half-day of SQL queries now takes three questions and 90 seconds. Every board prep cycle, that's real time back."*

**Talking points:**
- Zero manual report extraction — the CCO talks directly to the data
- Proactive benchmark flagging — the AI volunteers the comparison, she doesn't have to ask
- Audit-ready: the same questions asked every quarter give consistent, reproducible answers

---

## Scenario 2 — Hiring Surge & Pipeline Risk
**Complexity:** Medium  
**Persona:** Head of HR Operations managing a large onboarding cohort  
**Setting:** UBS is bringing on 80 new hires across NY-HQ and NJ-Weehawken over the next 30 days. Any delay in drug test clearance holds up start dates. The HR Ops lead needs to know if the current pipeline can handle the load — and where bottlenecks will form.

### Demo Flow

**Step 1 — Establish current pipeline state:**
> "What does the current pipeline look like? Any backlogs I should be worried about?"

*What to show:* `get_pipeline_status` returns orders by lifecycle stage (pending collection, at lab, awaiting MRO, pending verification). The AI surfaces any stage with a disproportionate queue and flags it by name.

**Step 2 — Find the slowest stage:**
> "What's the average turnaround time right now, and which stage is taking the longest?"

*What to show:* `get_turnaround_stats` broken down by stage. The AI identifies whether the lab leg or MRO leg is the bottleneck — this tells HR Ops exactly where to apply pressure with the vendor.

**Step 3 — Narrow to the affected cost centers:**
> "How many tests are currently in progress for NY-HQ and NJ-Weehawken specifically?"

*What to show:* Pipeline filtered to the two onboarding cost centers. If either has a queue building up, the AI flags it with the count.

**Step 4 — Project forward:**
> "If I add 80 pre-employment tests over the next 30 days, what does that mean given current throughput?"

*What to show:* The AI does the math contextually — current pipeline volume + incoming tests vs current average clearance rate. Gives a plain-English answer: "At current throughput, you're looking at X days to clear the cohort. The MRO stage is your constraint."

### Business Value
> *"This isn't a reporting tool. It's an early warning system. You find out there's a bottleneck before your new hire's start date slips — not after."*

**Talking points:**
- Proactive risk detection: the pipeline question surfaces issues before they become incidents
- Vendor accountability: knowing which stage is slow gives HR Ops specific leverage with eScreen/lab
- Directly tied to business outcomes: onboarding delays cost money; this prevents them

---

## Scenario 3 — Post-Incident Substance Investigation
**Complexity:** Advanced  
**Persona:** Head of HR + Legal Counsel  
**Setting:** A workplace safety incident occurred at the NJ-Weehawken office. HR and Legal need to understand the substance testing history across that location — what substances have been flagging positive, at what rate, over what period — to determine whether there is a pattern that should have been caught earlier, and to build a defensible record.

### Demo Flow

**Step 1 — Establish the baseline:**
> "Show me the analyte breakdown for all tests over the last 6 months."

*What to show:* `get_analyte_breakdown` returns per-substance positive counts. Bar chart. The AI identifies which substances are driving positives — typically THC, cocaine, amphetamines — and gives the count and share of total positives for each.

**Step 2 — Compare periods to detect trend:**
> "How does that compare to the 6 months before? Is any substance trending upward?"

*What to show:* The assistant runs `get_analyte_breakdown` for the prior period and compares. If THC or any substance increased materially, it calls it out by name with the delta. This is the moment that shows the AI does analysis, not just retrieval.

**Step 3 — Isolate for-cause vs random tests:**
> "Of the positives in the last 6 months, how many were from for-cause tests versus random?"

*What to show:* `get_results_summary` filtered by reason. If for-cause positives are elevated relative to random, it suggests a reactive rather than preventive posture — a legitimate compliance concern the AI surfaces without prompting.

**Step 4 — Build the record:**
> "Give me a summary I can use for a legal briefing — key numbers, trend, and any flags."

*What to show:* The AI synthesises everything into a clean 3–5 sentence paragraph: total positives, substance composition, trend direction, for-cause vs random split, and a plain-English risk flag. No chart needed — just tight, precise prose the lawyer can drop into a memo.

### Business Value
> *"In a post-incident review, the question is always: did you know, and if not, why not? This tool means you always know. And if something was trending, you can show exactly when it started."*

**Talking points:**
- Trend detection across time periods: the AI compares periods without being asked to run two queries manually
- Legal defensibility: a consistent, auditable record of what the data showed and when
- Shifts posture from reactive to proactive: if the tool had been in daily use, the trend would have surfaced before the incident

---

## Delivery Notes

**Running order for a 20-minute session:**  
Scenario 1 (5 min) → pause for reaction → Scenario 2 (7 min) → Scenario 3 (8 min)

**The transition line between scenarios:**  
> *"That was the reporting story. Now let me show you the operational story — this is where it gets interesting for HR Ops..."*  
> *"And now the one that tends to stop the room — the post-incident use case..."*

**If the audience is a CCO / Legal audience:** Lead with Scenario 3. The defensibility angle lands harder than the efficiency angle for this persona.

**If the audience is HR Ops / CHRO:** Lead with Scenario 2. Pipeline risk and onboarding delays are felt daily.

**If the audience is the CFO or CFO's team:** Lead with Scenario 1. Board reporting and benchmark comparison speak directly to governance and liability.

**Handling the "is this live data?" question:**  
> *"This is seeded with realistic synthetic data that mirrors the shape of what a firm your size would see — positive rate distribution, pipeline volumes, turnaround benchmarks. The architecture and the AI behavior are production-grade. Swapping in your live eScreen feed is a configuration change, not a rebuild."*
