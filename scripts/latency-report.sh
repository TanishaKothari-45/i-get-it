#!/usr/bin/env bash
# Saves the latency and cost report (convex/observability.ts) to evals/latency-YYYY-MM-DD.md.
# Usage: scripts/latency-report.sh [days]   Runs against the deployment in .env.local (your dev); never --prod.
set -euo pipefail
cd "$(dirname "$0")/.."
days="${1:-7}"
out="evals/latency-$(date +%F).md"
mkdir -p evals
npx convex run observability:report "{\"days\": ${days}}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).markdown))' > "$out"
echo "Saved $out"
