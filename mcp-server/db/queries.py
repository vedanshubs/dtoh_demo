from db.connection import get_connection
from db.date_range import parse_date_range


def _add_filter(sql, params, col, val):
    if val:
        sql += f" AND {col} = %s"
        params.append(val)
    return sql, params


async def query_results_summary(client_id, date_range, disposition=None, reason_for_test=None, specimen_type=None, regulation=None):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT
                    dr.Disposition   AS disposition,
                    COUNT(*)         AS count
                FROM CollectionOrder co
                JOIN TestReport  tr ON tr.CollectionOrderId = co.CollectionOrderId
                JOIN DrugReport  dr ON dr.TestReportId      = tr.TestReportId
                WHERE co.AccountNumber = %s
                  AND tr.DateOfService BETWEEN %s AND %s
            """
            params = [client_id, start, end]
            sql, params = _add_filter(sql, params, "dr.Disposition",  disposition)
            sql, params = _add_filter(sql, params, "tr.ReasonForTest", reason_for_test)
            sql, params = _add_filter(sql, params, "dr.SampleType",   specimen_type)
            sql, params = _add_filter(sql, params, "tr.Regulation",   regulation)
            sql += " GROUP BY dr.Disposition ORDER BY count DESC"
            cur.execute(sql, params)
            rows = cur.fetchall()
            total = sum(r["count"] for r in rows)
            return {"client_id": client_id, "date_range": date_range, "total": total, "breakdown": rows}
    finally:
        conn.close()


async def query_pipeline_status(client_id, date_range, status=None, reason_for_test=None, specimen_type=None):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT
                    st.DisplayName   AS status,
                    COUNT(*)         AS count
                FROM CollectionOrder co
                JOIN TestReport  tr ON tr.CollectionOrderId = co.CollectionOrderId
                JOIN StatusType  st ON st.StatusTypeId      = tr.StatusId
                WHERE co.AccountNumber = %s
                  AND tr.DateOfService BETWEEN %s AND %s
                  AND tr.ResultTypeId IS NULL
            """
            params = [client_id, start, end]
            sql, params = _add_filter(sql, params, "st.DisplayName",  status)
            sql, params = _add_filter(sql, params, "tr.ReasonForTest", reason_for_test)
            sql += " GROUP BY st.DisplayName, tr.StatusId ORDER BY tr.StatusId"
            cur.execute(sql, params)
            rows = cur.fetchall()
            total = sum(r["count"] for r in rows)
            return {"client_id": client_id, "date_range": date_range, "total_in_progress": total, "breakdown": rows}
    finally:
        conn.close()


async def query_analyte_breakdown(client_id, date_range, analyte_name=None, disposition=None):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT
                    sr.AnalyteName AS analyte,
                    SUM(CASE WHEN sr.Disposition = 'Pos' THEN 1 ELSE 0 END) AS positive,
                    SUM(CASE WHEN sr.Disposition = 'Neg' THEN 1 ELSE 0 END) AS negative
                FROM CollectionOrder  co
                JOIN TestReport       tr ON tr.CollectionOrderId = co.CollectionOrderId
                JOIN DrugReport       dr ON dr.TestReportId      = tr.TestReportId
                JOIN PanelResult      pr ON pr.DrugReportId      = dr.DrugReportId
                JOIN SubstanceResult  sr ON sr.PanelResultId     = pr.PanelResultId
                WHERE co.AccountNumber = %s
                  AND tr.DateOfService BETWEEN %s AND %s
            """
            params = [client_id, start, end]
            sql, params = _add_filter(sql, params, "sr.AnalyteName", analyte_name)
            sql, params = _add_filter(sql, params, "sr.Disposition", disposition)
            sql += " GROUP BY sr.AnalyteName ORDER BY positive DESC"
            cur.execute(sql, params)
            rows = cur.fetchall()
            return {"client_id": client_id, "date_range": date_range, "analytes": rows}
    finally:
        conn.close()


async def query_turnaround_stats(client_id, date_range, reason_for_test=None, specimen_type=None, regulation=None):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT
                    ROUND(AVG(DATEDIFF(dr.LabReceivedDate,   dr.CollectionDateTime)),  2)
                        AS avg_collection_to_lab_days,
                    ROUND(AVG(DATEDIFF(dr.LabReportDateTime, dr.LabReceivedDate)),     2)
                        AS avg_lab_to_report_days,
                    ROUND(AVG(DATEDIFF(dr.VerificationDate,  dr.LabReportDateTime)),   2)
                        AS avg_report_to_verification_days,
                    ROUND(AVG(DATEDIFF(dr.VerificationDate,  dr.CollectionDateTime)),  2)
                        AS avg_end_to_end_days,
                    COUNT(*) AS total_finalized,
                    SUM(CASE WHEN DATEDIFF(dr.VerificationDate, dr.CollectionDateTime) <= 5
                             THEN 1 ELSE 0 END) AS within_sla,
                    ROUND(
                        100.0 * SUM(CASE WHEN DATEDIFF(dr.VerificationDate, dr.CollectionDateTime) <= 5
                                         THEN 1 ELSE 0 END) / COUNT(*), 1
                    ) AS sla_compliance_pct
                FROM CollectionOrder co
                JOIN TestReport  tr ON tr.CollectionOrderId = co.CollectionOrderId
                JOIN DrugReport  dr ON dr.TestReportId      = tr.TestReportId
                WHERE co.AccountNumber = %s
                  AND tr.DateOfService BETWEEN %s AND %s
                  AND dr.VerificationDate IS NOT NULL
            """
            params = [client_id, start, end]
            sql, params = _add_filter(sql, params, "tr.ReasonForTest", reason_for_test)
            sql, params = _add_filter(sql, params, "dr.SampleType",   specimen_type)
            sql, params = _add_filter(sql, params, "tr.Regulation",   regulation)
            cur.execute(sql, params)
            row = cur.fetchone()
            return {"client_id": client_id, "date_range": date_range, **(row or {})}
    finally:
        conn.close()
