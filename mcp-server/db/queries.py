import logging
from db.connection import get_connection
from db.date_range import parse_date_range

log = logging.getLogger(__name__)


def _add_filter(sql, params, col, val):
    if val:
        sql += f" AND {col} = %s"
        params.append(val)
    return sql, params


def _add_like_filter(sql, params, col, val):
    """Substring (case-insensitive) match — use for free-text fields like
    analyte names, where the LLM may pass a generic term ("Opiates") that
    the DB stores in a more specific form ("Opiates (Codeine/Morphine)")."""
    if val:
        sql += f" AND {col} LIKE %s"
        params.append(f"%{val}%")
    return sql, params


async def query_results_summary(client_id, date_range, disposition=None, reason_for_test=None, specimen_type=None, regulation=None):
    start, end = parse_date_range(date_range)
    log.info("query_results_summary: client_id=%s date=%s→%s disposition=%s reason=%s specimen=%s regulation=%s",
             client_id, start, end, disposition, reason_for_test, specimen_type, regulation)
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
            log.debug("SQL: %s | params: %s", sql.strip(), params)
            cur.execute(sql, params)
            rows = cur.fetchall()
            log.info("query_results_summary: %d disposition rows returned", len(rows))
            total = sum(r["count"] for r in rows)
            return {"client_id": client_id, "date_range": date_range, "total": total, "breakdown": rows}
    finally:
        conn.close()


async def query_pipeline_status(client_id, date_range, status=None, reason_for_test=None):
    start, end = parse_date_range(date_range)
    log.info("query_pipeline_status: client_id=%s date=%s→%s status=%s reason=%s",
             client_id, start, end, status, reason_for_test)
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
            log.debug("SQL: %s | params: %s", sql.strip(), params)
            cur.execute(sql, params)
            rows = cur.fetchall()
            log.info("query_pipeline_status: %d status rows returned", len(rows))
            total = sum(r["count"] for r in rows)
            return {"client_id": client_id, "date_range": date_range, "total_in_progress": total, "breakdown": rows}
    finally:
        conn.close()


_SUBSTANCE_DISP = {"positive": "Pos", "pos": "Pos", "negative": "Neg", "neg": "Neg"}


async def query_analyte_breakdown(client_id, date_range, analyte_name=None, disposition=None, group_by_month=False):
    # SubstanceResult uses short codes 'Pos'/'Neg' — normalize full-word values from LLM
    if disposition:
        disposition = _SUBSTANCE_DISP.get(disposition.lower(), disposition)
    start, end = parse_date_range(date_range)
    log.info("query_analyte_breakdown: client_id=%s date=%s→%s analyte=%s disposition=%s group_by_month=%s",
             client_id, start, end, analyte_name, disposition, group_by_month)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            result = {"client_id": client_id, "date_range": date_range}

            # Aggregated analyte totals
            sql = """
                SELECT
                    sr.AnalyteName AS analyte,
                    CAST(SUM(CASE WHEN sr.Disposition = 'Pos' THEN 1 ELSE 0 END) AS SIGNED) AS positive,
                    CAST(SUM(CASE WHEN sr.Disposition = 'Neg' THEN 1 ELSE 0 END) AS SIGNED) AS negative
                FROM CollectionOrder  co
                JOIN TestReport       tr ON tr.CollectionOrderId = co.CollectionOrderId
                JOIN DrugReport       dr ON dr.TestReportId      = tr.TestReportId
                JOIN PanelResult      pr ON pr.DrugReportId      = dr.DrugReportId
                JOIN SubstanceResult  sr ON sr.PanelResultId     = pr.PanelResultId
                WHERE co.AccountNumber = %s
                  AND tr.DateOfService BETWEEN %s AND %s
            """
            params = [client_id, start, end]
            sql, params = _add_like_filter(sql, params, "sr.AnalyteName", analyte_name)
            sql, params = _add_filter(sql, params, "sr.Disposition", disposition)
            sql += " GROUP BY sr.AnalyteName ORDER BY positive DESC"
            log.debug("SQL: %s | params: %s", sql.strip(), params)
            cur.execute(sql, params)
            rows = cur.fetchall()
            for r in rows:
                total = (r["positive"] or 0) + (r["negative"] or 0)
                r["positive_rate_pct"] = round(100.0 * r["positive"] / total, 1) if total else 0.0
            result["analytes"] = rows
            result["total_positives"] = sum(r["positive"] or 0 for r in rows)

            if group_by_month:
                month_sql = """
                    SELECT
                        DATE_FORMAT(tr.DateOfService, '%%Y-%%m') AS month,
                        CAST(SUM(CASE WHEN sr.Disposition = 'Pos' THEN 1 ELSE 0 END) AS SIGNED) AS positive,
                        CAST(SUM(CASE WHEN sr.Disposition = 'Neg' THEN 1 ELSE 0 END) AS SIGNED) AS negative
                    FROM CollectionOrder  co
                    JOIN TestReport       tr ON tr.CollectionOrderId = co.CollectionOrderId
                    JOIN DrugReport       dr ON dr.TestReportId      = tr.TestReportId
                    JOIN PanelResult      pr ON pr.DrugReportId      = dr.DrugReportId
                    JOIN SubstanceResult  sr ON sr.PanelResultId     = pr.PanelResultId
                    WHERE co.AccountNumber = %s
                      AND tr.DateOfService BETWEEN %s AND %s
                """
                m_params = [client_id, start, end]
                month_sql, m_params = _add_like_filter(month_sql, m_params, "sr.AnalyteName", analyte_name)
                month_sql, m_params = _add_filter(month_sql, m_params, "sr.Disposition", disposition)
                month_sql += " GROUP BY month ORDER BY month ASC"
                cur.execute(month_sql, m_params)
                monthly = cur.fetchall()
                for r in monthly:
                    total = (r["positive"] or 0) + (r["negative"] or 0)
                    r["positive_rate_pct"] = round(100.0 * r["positive"] / total, 1) if total else 0.0
                    from datetime import datetime
                    r["label"] = datetime.strptime(r["month"], "%Y-%m").strftime("%b %Y")
                result["monthly_breakdown"] = monthly

            log.info("query_analyte_breakdown: %d analyte rows returned", len(rows))
            return result
    finally:
        conn.close()


async def query_turnaround_stats(client_id, date_range, reason_for_test=None, specimen_type=None, regulation=None):
    start, end = parse_date_range(date_range)
    log.info("query_turnaround_stats: client_id=%s date=%s→%s reason=%s specimen=%s regulation=%s",
             client_id, start, end, reason_for_test, specimen_type, regulation)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT
                    ROUND(AVG(DATEDIFF(dr.LabReceivedDate,   dr.CollectionDateTime)),  2)
                        AS avg_collection_to_lab_days,
                    ROUND(AVG(DATEDIFF(dr.LabReportDateTime, dr.LabReceivedDate)),     2)
                        AS avg_lab_to_report_days,
                    ROUND(AVG(DATEDIFF(dr.MROReceivedDate,   dr.LabReportDateTime)),   2)
                        AS avg_report_to_mro_days,
                    ROUND(AVG(DATEDIFF(dr.VerificationDate,  dr.MROReceivedDate)),     2)
                        AS avg_mro_to_verified_days,
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
            log.debug("SQL: %s | params: %s", sql.strip(), params)
            cur.execute(sql, params)
            row = cur.fetchone()
            log.info("query_turnaround_stats: row=%s", row)
            return {"client_id": client_id, "date_range": date_range, **(row or {})}
    finally:
        conn.close()
