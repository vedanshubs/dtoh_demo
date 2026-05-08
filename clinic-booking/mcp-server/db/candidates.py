from db.connection import get_connection


async def get_candidate(donor_id: int) -> dict:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM candidates WHERE id = %s", (donor_id,))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Donor {donor_id} not found")
            return row
    finally:
        conn.close()
