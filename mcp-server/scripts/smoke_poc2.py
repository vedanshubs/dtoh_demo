import asyncio
from tools.get_results_summary import handle_get_results_summary
from tools.get_pipeline_status import handle_get_pipeline_status
from tools.get_turnaround_stats import handle_get_turnaround_stats
from tools.get_analyte_breakdown import handle_get_analyte_breakdown


async def main():
    print("=== Results Summary (last 90 days) ===")
    r = await handle_get_results_summary("UBS001", "last 90 days", use_mock=False)
    print("Total:", r["total"])
    for b in r["breakdown"]:
        print(" ", b["disposition"], ":", b["count"])

    print()
    print("=== Pipeline Status ===")
    r2 = await handle_get_pipeline_status("UBS001", "current year", use_mock=False)
    print("In progress:", r2["total_in_progress"])
    for b in r2["breakdown"]:
        print(" ", b["status"], ":", b["count"])

    print()
    print("=== Turnaround Stats ===")
    r3 = await handle_get_turnaround_stats("UBS001", "last 90 days", use_mock=False)
    print("Avg end-to-end:", r3.get("avg_end_to_end_days"), "days")
    print("SLA compliance:", r3.get("sla_compliance_pct"), "%")

    print()
    print("=== Analyte Breakdown (top 4) ===")
    r4 = await handle_get_analyte_breakdown("UBS001", "current year", use_mock=False)
    for a in r4["analytes"][:4]:
        print(" ", a["analyte"], ":", a["positive"], "pos /", a["negative"], "neg")


asyncio.run(main())
