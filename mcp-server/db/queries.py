from db.connection import get_connection
from db.date_range import parse_date_range


async def query_results_summary(client_id, date_range, disposition=None, reason_for_test=None, specimen_type=None, regulation=None):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT Disposition as disposition, COUNT(*) as count
                FROM SpecimenResults
                WHERE eScreenClientAccount = %s
                  AND CollectionDate BETWEEN %s AND %s
            """
            params = [client_id, start, end]
            if disposition:
                sql += " AND Disposition = %s"
                params.append(disposition)
            if reason_for_test:
                sql += " AND ReasonForTest = %s"
                params.append(reason_for_test)
            if specimen_type:
                sql += " AND SpecimenType = %s"
                params.append(specimen_type)
            sql += " GROUP BY Disposition"
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
                SELECT SpecimenStatus as status, COUNT(*) as count
                FROM SpecimenStatus
                WHERE eScreenClientAccount = %s
                  AND CollectionDate BETWEEN %s AND %s
                  AND FinalStatus = 0
            """
            params = [client_id, start, end]
            if status:
                sql += " AND SpecimenStatus = %s"
                params.append(status)
            sql += " GROUP BY SpecimenStatus"
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
                SELECT a.AnalyteName as analyte,
                       SUM(CASE WHEN a.Disposition = 'Positive' THEN 1 ELSE 0 END) as positive,
                       SUM(CASE WHEN a.Disposition != 'Positive' THEN 1 ELSE 0 END) as negative
                FROM Analytes a
                JOIN SpecimenResults r ON a.SpecimenID = r.SpecimenID
                WHERE r.eScreenClientAccount = %s
                  AND r.CollectionDate BETWEEN %s AND %s
            """
            params = [client_id, start, end]
            if analyte_name:
                sql += " AND a.AnalyteName = %s"
                params.append(analyte_name)
            if disposition:
                sql += " AND a.Disposition = %s"
                params.append(disposition)
            sql += " GROUP BY a.AnalyteName ORDER BY positive DESC"
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
                    AVG(DATEDIFF(LabReceivedDate, CollectionDate))        AS avg_collection_to_lab_days,
                    AVG(DATEDIFF(LabReportDate, LabReceivedDate))         AS avg_lab_to_report_days,
                    AVG(DATEDIFF(VerificationDate, LabReportDate))        AS avg_report_to_verification_days,
                    AVG(DATEDIFF(VerificationDate, CollectionDate))       AS avg_end_to_end_days
                FROM SpecimenResults
                WHERE eScreenClientAccount = %s
                  AND CollectionDate BETWEEN %s AND %s
                  AND VerificationDate IS NOT NULL
            """
            params = [client_id, start, end]
            if reason_for_test:
                sql += " AND ReasonForTest = %s"
                params.append(reason_for_test)
            if specimen_type:
                sql += " AND SpecimenType = %s"
                params.append(specimen_type)
            cur.execute(sql, params)
            row = cur.fetchone()
            return {"client_id": client_id, "date_range": date_range, **(row or {})}
    finally:
        conn.close()
