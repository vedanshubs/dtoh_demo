#!/usr/bin/env python3
"""
One-time generator for POC 2 mock drug test data.
Run from repo root: python scripts/generate_poc2_data.py
Output committed to db/seed_poc2_data.sql -- do not edit by hand.
Re-run with same seed=42 for identical output.
"""
import calendar
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

OUTPUT = Path(__file__).parent.parent / "db" / "seed_poc2_data.sql"

CLIENT_ACCOUNT = "UBS001"
MONTHLY_BASE = 100

OFFICES = [("NY-HQ", 0.40), ("NJ-Weehawken", 0.25), ("CT-Stamford", 0.20), ("NY-Midtown", 0.15)]
REASONS = [("Pre-Employment", 0.65), ("Random", 0.25), ("For Cause", 0.07), ("Post-Accident", 0.02), ("Return to Duty", 0.01)]
SPECIMENS = [("Urine", 0.80), ("Hair", 0.12), ("Oral Fluid", 0.05), ("Breath", 0.03)]

OUTCOMES = [
    ("Negative",          1, 0.890),
    ("Positive",          2, 0.045),
    ("Test Not Performed",3, 0.030),
    ("Cancelled",         4, 0.020),
    ("No Show",           5, 0.010),
    ("Rejected Specimen", 6, 0.004),
]

SUBSTANCES = [
    ("THC/Marijuana",              1, 0.55),
    ("Cocaine Metabolites",        2, 0.15),
    ("Amphetamines",               3, 0.10),
    ("Opiates (Codeine/Morphine)", 4, 0.10),
    ("Oxycodone",                  5, 0.05),
    ("PCP",                        6, 0.03),
    ("Methamphetamines",           7, 0.02),
    ("Benzodiazepines",            8, 0.00),
]

PANEL_NAMES = {
    "Urine":      "5-Panel Urine",
    "Hair":       "Hair Follicle 5-Panel",
    "Oral Fluid": "Oral Fluid 5-Panel",
    "Breath":     "Breath Alcohol Test",
}

TA = {
    "CT-Stamford":  {"c2l": (0.7, 1.3), "l2r": (1.4, 2.0), "r2m": (0.4, 0.8), "m2v": (0.3, 0.6)},
    "NY-HQ":        {"c2l": (0.9, 1.4), "l2r": (1.6, 2.3), "r2m": (0.5, 1.0), "m2v": (0.4, 0.7)},
    "NJ-Weehawken": {"c2l": (1.0, 1.6), "l2r": (1.7, 2.5), "r2m": (0.6, 1.0), "m2v": (0.4, 0.8)},
    "NY-Midtown":   {"c2l": (0.8, 1.3), "l2r": (1.5, 2.2), "r2m": (0.5, 0.9), "m2v": (0.3, 0.6)},
}

LAB_NAMES = ["Quest Diagnostics", "LabCorp"]

ESCREEN_STATUS = {
    1: ("ORDER_CREATED",        "Order Created - Awaiting Donor"),
    2: ("PENDING_COLLECTION",   "Pending Collection"),
    3: ("COLLECTED_IN_TRANSIT", "Specimen Collected - In Transit"),
    4: ("AT_LAB",               "Specimen at Laboratory"),
    5: ("LAB_REPORTED",         "Lab Reported - Pending MRO Review"),
    6: ("MRO_VERIFIED",         "MRO Verified - Pending Delivery"),
    7: ("COMPLETED",            "Test Completed"),
}


def weighted(choices):
    names, weights = zip(*choices)
    return random.choices(names, weights=weights, k=1)[0]


def fmt(dt):
    return f"'{dt.strftime('%Y-%m-%d %H:%M:%S')}'" if dt else "NULL"


def esc(s):
    return s.replace("'", "''") if s else ""


def add_days(dt, days):
    return dt + timedelta(days=days)


def is_q4_2025(dt):
    return dt.year == 2025 and 10 <= dt.month <= 12


def is_q1_2026(dt):
    return dt.year == 2026 and 1 <= dt.month <= 3


def pick_outcome(office, specimen, dt):
    base_pos = 0.09 if specimen == "Hair" else 0.045
    if office == "NY-HQ" and is_q4_2025(dt):
        base_pos = 0.09
    elif office == "NY-HQ" and is_q1_2026(dt):
        base_pos = 0.055

    scale = base_pos / 0.045
    adjusted = []
    for name, rtid, prob in OUTCOMES:
        if name == "Positive":
            adjusted.append((name, rtid, base_pos))
        elif name == "Negative":
            adjusted.append((name, rtid, None))
        else:
            adjusted.append((name, rtid, prob * scale))

    non_neg = sum(p for _, _, p in adjusted if p is not None)
    for i, (n, rtid, p) in enumerate(adjusted):
        if p is None:
            adjusted[i] = (n, rtid, max(0.0, 1.0 - non_neg))

    names, rtids, weights = zip(*adjusted)
    idx = random.choices(range(len(names)), weights=list(weights), k=1)[0]
    return names[idx], rtids[idx]


def pick_positive_substance(office, dt):
    subs = [(n, sid, w) for n, sid, w in SUBSTANCES if w > 0]
    if office == "NY-HQ" and is_q4_2025(dt):
        if random.random() < 0.85:
            return "THC/Marijuana", 1
        subs = [(n, sid, w) for n, sid, w in subs if n != "THC/Marijuana"]
    names, sids, weights = zip(*subs)
    idx = random.choices(range(len(names)), weights=list(weights), k=1)[0]
    return names[idx], sids[idx]


def build_milestones(office, collection_dt, sla_miss):
    ta = TA[office]
    c2l = random.uniform(*ta["c2l"])
    l2r = random.uniform(*ta["l2r"])
    r2m = random.uniform(*ta["r2m"])
    m2v = random.uniform(*ta["m2v"])
    if sla_miss:
        if random.random() < 0.5:
            l2r += random.uniform(3.0, 6.0)
        else:
            m2v += random.uniform(3.0, 5.0)
    lab_recv = add_days(collection_dt, c2l)
    lab_rep  = add_days(lab_recv,  l2r)
    mro_recv = add_days(lab_rep,   r2m)
    verified = add_days(mro_recv,  m2v)
    return lab_recv, lab_rep, mro_recv, verified


def generate():
    co_rows, tr_rows, dr_rows, pr_rows, sr_rows = [], [], [], [], []
    co_id = tr_id = dr_id = pr_id = sr_id = 1

    months = []
    d = datetime(2025, 6, 1)
    while d <= datetime(2026, 5, 1):
        months.append(d)
        m, y = (d.month % 12) + 1, d.year + (1 if d.month == 12 else 0)
        d = datetime(y, m, 1)

    for month_start in months:
        days_in_month = calendar.monthrange(month_start.year, month_start.month)[1]
        volume = MONTHLY_BASE + random.randint(-12, 12)
        is_current = (month_start.year == 2026 and month_start.month == 5)
        extra_fc = 4 if is_q1_2026(month_start) else 0

        for i in range(volume):
            day  = random.randint(1, days_in_month)
            hour = random.randint(7, 17)
            mins = random.randint(0, 59)
            col_dt = datetime(month_start.year, month_start.month, day, hour, mins)

            office   = weighted(OFFICES)
            specimen = weighted(SPECIMENS)
            reason   = "For Cause" if i < extra_fc else weighted(REASONS)
            is_dot   = 1 if random.random() < 0.25 else 0
            reg      = "DOT" if is_dot else "Non-DOT"
            ind_id   = 2 if is_dot else 1

            in_pipeline = random.random() < (0.35 if is_current else 0.02)

            if in_pipeline:
                status_id     = random.choices([1, 2, 3, 4, 5, 6], weights=[3, 2, 2, 2, 1, 1])[0]
                result_id_sql = "NULL"
                disposition   = None
            else:
                status_id = 7
                disposition, result_id_int = pick_outcome(office, specimen, col_dt)
                result_id_sql = str(result_id_int)

            escode, esdesc = ESCREEN_STATUS[status_id]

            co_rows.append(
                f"({co_id},'{CLIENT_ACCOUNT}','{esc(reason)}',{is_dot},"
                f"'{office}',{fmt(col_dt)},{status_id},{fmt(col_dt)})"
            )

            tr_rows.append(
                f"({tr_id},{co_id},{status_id},{result_id_sql},{ind_id},"
                f"{fmt(col_dt)},'{esc(reason)}','{reg}',"
                f"'{escode}','{esc(esdesc)}','{CLIENT_ACCOUNT}',{fmt(col_dt)})"
            )

            if not in_pipeline:
                sla_miss_prob = 0.08
                sla_miss = random.random() < sla_miss_prob
                lab_recv, lab_rep, mro_recv, verified = build_milestones(office, col_dt, sla_miss)
                lab_name = random.choice(LAB_NAMES)

                dr_rows.append(
                    f"({dr_id},{tr_id},'{esc(disposition)}','{specimen}','{specimen}',"
                    f"{fmt(col_dt)},{fmt(lab_recv)},{fmt(lab_rep)},"
                    f"{fmt(mro_recv)},{fmt(verified)},'{lab_name}',{fmt(col_dt)})"
                )

                panel_name = PANEL_NAMES.get(specimen, "5-Panel Urine")
                pr_rows.append(f"({pr_id},{dr_id},{result_id_sql},'{esc(panel_name)}',{fmt(col_dt)})")

                if specimen in ("Urine", "Hair"):
                    pos_substance = None
                    if disposition == "Positive":
                        pos_substance, _ = pick_positive_substance(office, col_dt)
                    sample_type_id = 1 if specimen == "Urine" else 2
                    for sub_name, sub_id, _ in SUBSTANCES:
                        disp = "Pos" if sub_name == pos_substance else "Neg"
                        sr_rows.append(
                            f"({sr_id},{pr_id},{sub_id},'{esc(sub_name)}','{disp}',"
                            f"'{specimen}',{sample_type_id},{fmt(col_dt)})"
                        )
                        sr_id += 1

                pr_id += 1
                dr_id += 1

            tr_id += 1
            co_id += 1

    return co_rows, tr_rows, dr_rows, pr_rows, sr_rows


def write_sql(co_rows, tr_rows, dr_rows, pr_rows, sr_rows):
    CHUNK = 500
    lines = [
        "-- POC 2 generated data -- do not edit by hand",
        "-- Re-generate: python scripts/generate_poc2_data.py",
        "",
        "SET FOREIGN_KEY_CHECKS=0;",
        "TRUNCATE TABLE SubstanceResult;",
        "TRUNCATE TABLE PanelResult;",
        "TRUNCATE TABLE DrugReport;",
        "TRUNCATE TABLE TestReport;",
        "TRUNCATE TABLE CollectionOrder;",
        "SET FOREIGN_KEY_CHECKS=1;",
        "",
    ]

    def chunked_inserts(table, cols, rows):
        out = []
        for i in range(0, len(rows), CHUNK):
            chunk = rows[i:i + CHUNK]
            out.append(f"INSERT INTO {table} ({cols}) VALUES")
            out.append(",\n".join(chunk) + ";")
        return out

    lines += chunked_inserts(
        "CollectionOrder",
        "CollectionOrderId,AccountNumber,TestReason,IsDOT,CostCenter,RecordCreatedDate,StatusTypeId,CreatedOn",
        co_rows,
    )
    lines += chunked_inserts(
        "TestReport",
        "TestReportId,CollectionOrderId,StatusId,ResultTypeId,IndustryTypeId,DateOfService,ReasonForTest,Regulation,eScreenStatusCode,eScreenStatusDescription,TestReportAccountNumber,CreatedOn",
        tr_rows,
    )
    lines += chunked_inserts(
        "DrugReport",
        "DrugReportId,TestReportId,Disposition,SampleType,SpecimenType,CollectionDateTime,LabReceivedDate,LabReportDateTime,MROReceivedDate,VerificationDate,LabName,CreatedOn",
        dr_rows,
    )
    lines += chunked_inserts(
        "PanelResult",
        "PanelResultId,DrugReportId,ResultTypeId,PanelName,CreatedOn",
        pr_rows,
    )
    lines += chunked_inserts(
        "SubstanceResult",
        "SubstanceResultId,PanelResultId,SubstanceId,AnalyteName,Disposition,SpecimenType,SampleTypeId,CreatedOn",
        sr_rows,
    )

    OUTPUT.write_text("\n".join(lines))
    print(
        f"Written {len(co_rows)} CollectionOrders, {len(tr_rows)} TestReports, "
        f"{len(dr_rows)} DrugReports, {len(pr_rows)} PanelResults, "
        f"{len(sr_rows)} SubstanceResults -> {OUTPUT}"
    )


if __name__ == "__main__":
    co, tr, dr, pr, sr = generate()
    write_sql(co, tr, dr, pr, sr)
