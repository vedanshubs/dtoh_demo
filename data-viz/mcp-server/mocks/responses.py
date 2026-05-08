def mock_results_summary(client_id: str, date_range: str, **kwargs) -> dict:
    return {
        "client_id": client_id,
        "date_range": date_range,
        "total": 120,
        "breakdown": [
            {"disposition": "Negative", "count": 98},
            {"disposition": "Positive", "count": 15},
            {"disposition": "Cancelled", "count": 5},
            {"disposition": "No Show", "count": 2},
        ],
    }


def mock_pipeline_status(client_id: str, date_range: str, **kwargs) -> dict:
    return {
        "client_id": client_id,
        "date_range": date_range,
        "total_in_progress": 34,
        "breakdown": [
            {"status": "Pending Collection", "count": 10},
            {"status": "Collected", "count": 8},
            {"status": "At Lab", "count": 12},
            {"status": "MRO Review", "count": 4},
        ],
    }


def mock_analyte_breakdown(client_id: str, date_range: str, **kwargs) -> dict:
    return {
        "client_id": client_id,
        "date_range": date_range,
        "analytes": [
            {"analyte": "Marijuana/THC", "positive": 8, "negative": 42},
            {"analyte": "Cocaine", "positive": 3, "negative": 47},
            {"analyte": "Opiates", "positive": 2, "negative": 48},
            {"analyte": "Amphetamines", "positive": 2, "negative": 48},
        ],
    }


def mock_turnaround_stats(client_id: str, date_range: str, **kwargs) -> dict:
    return {
        "client_id": client_id,
        "date_range": date_range,
        "avg_collection_to_lab_days": 1.2,
        "avg_lab_to_report_days": 2.3,
        "avg_report_to_verification_days": 0.8,
        "avg_end_to_end_days": 4.3,
    }
