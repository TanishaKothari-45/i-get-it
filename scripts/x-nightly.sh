#!/bin/bash
# The day's X post, drafted at 9:30 AM IST by a Claude Code routine on this Mac: the real numbers from
# production, the chapter 1 bet's result, the day's lesson question from docs/x-daily-posts.md, and the link.
# It never posts. Prateek adds his line and posts it himself (the handbook: posts in his own words).
# Run by hand: bash scripts/x-nightly.sh
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.."

TODAY=$(date +%Y-%m-%d)
OUT_DIR=docs/launch/x-drafts            # gitignored: drafts stay on this Mac
OUT="$OUT_DIR/$TODAY.md"
mkdir -p "$OUT_DIR"

# Sprint day: 2 Oct 2026 is day 1.
DAY=$(( ( $(date -j -f %Y-%m-%d "$TODAY" +%s) - $(date -j -f %Y-%m-%d 2026-10-01 +%s) ) / 86400 ))

ALL=$(npx convex run --prod admin:numbers '{"days":0}' 2>/dev/null)
DAYJ=$(npx convex run --prod admin:numbers '{"days":2}' 2>/dev/null)   # yesterday and this morning
READY=$(npx convex run --prod handbooks:cachedTopics '{}' 2>/dev/null | jq 'length')
step() { echo "$1" | jq -r --arg s "$2" '.funnel[] | select(.step == $s) | .n'; }

# Shaktimaan's 3 test runs on 6 Oct (tides, sourdough, public speaking; one passed chapter 1) aren't real readers.
VIS=$(( $(step "$ALL" "Visited") - 1 ))
STARTED=$(( $(step "$ALL" "Started a handbook") - 3 ))
PASSED=$(( $(step "$ALL" "Passed chapter 1") - 1 ))
SIGNUPS=$(step "$ALL" "Signed up")
T_VIS=$(step "$DAYJ" "Visited"); T_OPEN=$(step "$DAYJ" "Opened chapter 1"); T_PASS=$(step "$DAYJ" "Passed chapter 1")
T_X=$(echo "$DAYJ" | jq -r '[.sources[] | select(.source == "x") | .visitors] | add // 0')

# The bet live since 6 Oct 22:14: chapter 1 reading only. Before it, 4 of 17 who opened chapter 1 finished it.
if [ "${T_OPEN:-0}" -gt 0 ]; then BET="Since yesterday morning, $T_PASS of $T_OPEN who opened chapter 1 finished it (before the change: 4 of 17, about 1 in 4)."
else BET="Nobody opened chapter 1 since yesterday, so no result for the chapter 1 bet yet."; fi

# Today's lesson question: the "Question:" line under today's heading in docs/x-daily-posts.md (e.g. "## Thu 8 Oct").
HEAD="$(date +%a) $(date +%-d) $(date +%b)"
Q=$(awk -v h="## $HEAD" 'index($0, h) == 1 { on = 1; next } /^## / { on = 0 } on && /^Question:/ { sub(/^Question: /, ""); print; exit }' docs/x-daily-posts.md)
[ -n "$Q" ] || Q="What did today teach you about building I Get It?"

cat > "$OUT" <<EOF
# X post for $TODAY (day $DAY)

Drafted at $(date +%H:%M) from live numbers. Add your line, then post it yourself or tell the agent "post it".

## The post

Day $DAY of building I Get It in public.

$VIS visitors · $STARTED handbooks started · $PASSED passed chapter 1 · $READY ready topics

[your line: answer the question below]

https://sensible-mongoose-624.convex.site/?utm_source=x

## Your question for today

$Q

## Since yesterday (for you, not the post)

- $BET
- $T_VIS visitors since yesterday, $T_X of them from X.
- Sign-ups all time: $SIGNUPS.
- Numbers are all time with your devices left out, minus Shaktimaan's 3 test runs.

## Stories from the last day (docs/launch/post-ideas.md: what shipped, and your "idea:" notes)

$(YDAY=$(date -v-1d +%Y-%m-%d); [ -f docs/launch/post-ideas.md ] && awk -v y="- $YDAY" -v t="- $TODAY" 'index($0, y) == 1 || index($0, t) == 1 { on = 1; print; next } /^- / { on = 0 } on' docs/launch/post-ideas.md | cut -c1-300 || echo "- Nothing logged yet.")
EOF

osascript -e "display notification \"Day $DAY: $VIS visitors, $PASSED passed chapter 1. Add your line.\" with title \"Today's X post is ready\" sound name \"Glass\"" || true
echo "$(date '+%F %T') wrote $OUT"
