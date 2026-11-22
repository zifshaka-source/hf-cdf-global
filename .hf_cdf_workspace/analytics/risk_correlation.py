import json
import math
import statistics

# Live cross-domain risk exposure weights (portfolio / sovereign assets)
assets = [
    {"id": "cluster-inference-01", "domain": "AI Infrastructure", "exposure_usd_m": 420.0, "anomaly": 0.94, "kev_count": 3},
    {"id": "swift-gateway-eu", "domain": "Financial Clearing", "exposure_usd_m": 1850.0, "anomaly": 0.62, "kev_count": 1},
    {"id": "dover-qkd-landing", "domain": "Subsea & Quantum", "exposure_usd_m": 610.0, "anomaly": 0.28, "kev_count": 1},
    {"id": "orbital-kh14-mesh", "domain": "Orbital Relay", "exposure_usd_m": 940.0, "anomaly": 0.35, "kev_count": 0},
]

scores = []
total_var = 0.0
for a in assets:
    # Value-at-Risk heuristic: exposure * (1 - exp(-anomaly * (1 + 0.25*kev)))
    prob = 1.0 - math.exp(-a["anomaly"] * (1.0 + 0.25 * a["kev_count"]))
    var_m = round(a["exposure_usd_m"] * prob, 2)
    total_var += var_m
    scores.append({"asset": a["id"], "domain": a["domain"], "breach_prob": round(prob, 4), "var_usd_m": var_m})

print("=== HF-CDF PYTHON ANALYTICS KERNEL ===")
print(json.dumps({
    "portfolio_var_usd_m": round(total_var, 2),
    "mean_breach_prob": round(statistics.mean(s["breach_prob"] for s in scores), 4),
    "ranked_exposures": sorted(scores, key=lambda x: x["var_usd_m"], reverse=True)
}, indent=2))
