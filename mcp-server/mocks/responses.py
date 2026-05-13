# Realistic mock data for UBS Group AG — a major financial services firm
# ~2,400 employees tested annually across US offices (NY, NJ, CT, IL)
# Primary use cases: Pre-Employment (PE), Random (RND), For Cause (FC), Return to Duty (RTD)


def mock_results_summary(client_id: str, date_range: str, **kwargs) -> dict:
    """UBS Q1 2026 drug test results — 487 tests across all US offices."""
    return {
        "client_id": client_id,
        "date_range": date_range,
        "total": 487,
        "positive_rate_pct": 4.1,
        "breakdown": [
            {"disposition": "Negative",              "count": 441, "pct": 90.6},
            {"disposition": "Positive",               "count": 20,  "pct": 4.1},
            {"disposition": "Test Not Performed",     "count": 12,  "pct": 2.5},
            {"disposition": "Cancelled",              "count": 8,   "pct": 1.6},
            {"disposition": "No Show",                "count": 4,   "pct": 0.8},
            {"disposition": "Rejected Specimen",      "count": 2,   "pct": 0.4},
        ],
        "by_reason_for_test": [
            {"reason": "Pre-Employment",   "total": 312, "positive": 11},
            {"reason": "Random",           "total": 124, "positive": 6},
            {"reason": "For Cause",        "total": 38,  "positive": 3},
            {"reason": "Return to Duty",   "total": 13,  "positive": 0},
        ],
    }


def mock_pipeline_status(client_id: str, date_range: str, **kwargs) -> dict:
    """UBS active drug test orders currently in progress as of today."""
    return {
        "client_id": client_id,
        "date_range": date_range,
        "total_in_progress": 63,
        "breakdown": [
            {"status": "Order Created – Awaiting Donor", "count": 18},
            {"status": "Pending Collection",             "count": 14},
            {"status": "Specimen Collected – In Transit","count": 11},
            {"status": "At Laboratory",                  "count": 13},
            {"status": "Lab Reported – MRO Review",      "count": 5},
            {"status": "MRO Verified – Pending Delivery","count": 2},
        ],
        "overdue_gt_5_days": 4,
        "avg_days_in_pipeline": 2.8,
    }


def mock_analyte_breakdown(client_id: str, date_range: str, group_by_month: bool = False, **kwargs) -> dict:
    """Substance-level positive counts from UBS DOT & non-DOT panels."""
    base = {
        "client_id": client_id,
        "date_range": date_range,
        "total_positives": 20,
        "analytes": [
            {"analyte": "THC/Marijuana",              "positive": 11, "negative": 301, "positive_rate_pct": 3.5},
            {"analyte": "Cocaine Metabolites",        "positive": 3,  "negative": 309, "positive_rate_pct": 1.0},
            {"analyte": "Amphetamines",               "positive": 2,  "negative": 310, "positive_rate_pct": 0.6},
            {"analyte": "Opiates (Codeine/Morphine)", "positive": 2,  "negative": 310, "positive_rate_pct": 0.6},
            {"analyte": "Oxycodone",                  "positive": 1,  "negative": 311, "positive_rate_pct": 0.3},
            {"analyte": "PCP",                        "positive": 1,  "negative": 311, "positive_rate_pct": 0.3},
            {"analyte": "Benzodiazepines",            "positive": 0,  "negative": 312, "positive_rate_pct": 0.0},
            {"analyte": "Methamphetamines",           "positive": 0,  "negative": 312, "positive_rate_pct": 0.0},
        ],
    }
    if group_by_month:
        base["monthly_breakdown"] = [
            {"month": "2025-12", "label": "Dec 2025", "positive": 1, "negative": 51, "positive_rate_pct": 1.9},
            {"month": "2026-01", "label": "Jan 2026", "positive": 2, "negative": 49, "positive_rate_pct": 3.9},
            {"month": "2026-02", "label": "Feb 2026", "positive": 1, "negative": 52, "positive_rate_pct": 1.9},
            {"month": "2026-03", "label": "Mar 2026", "positive": 3, "negative": 48, "positive_rate_pct": 5.9},
            {"month": "2026-04", "label": "Apr 2026", "positive": 2, "negative": 50, "positive_rate_pct": 3.8},
            {"month": "2026-05", "label": "May 2026", "positive": 2, "negative": 51, "positive_rate_pct": 3.8},
        ]
    return base


def mock_turnaround_stats(client_id: str, date_range: str, **kwargs) -> dict:
    """UBS lab turnaround time stats — SLA target is 5 days end-to-end."""
    return {
        "client_id": client_id,
        "date_range": date_range,
        "sla_target_days": 5,
        "sla_compliance_pct": 87.2,
        "avg_collection_to_lab_days": 1.1,
        "avg_lab_to_report_days": 1.9,
        "avg_report_to_mro_days": 0.6,
        "avg_mro_to_verified_days": 0.7,
        "avg_end_to_end_days": 4.3,
        "p95_end_to_end_days": 7.1,
        "by_reason_for_test": [
            {"reason": "Pre-Employment", "avg_days": 4.1, "sla_compliance_pct": 91.0},
            {"reason": "Random",         "avg_days": 4.5, "sla_compliance_pct": 85.5},
            {"reason": "For Cause",      "avg_days": 3.2, "sla_compliance_pct": 97.4},
            {"reason": "Return to Duty", "avg_days": 3.8, "sla_compliance_pct": 100.0},
        ],
    }
