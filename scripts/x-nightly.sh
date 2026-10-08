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

# The chart (8 Oct, Prateek: "the X post needs to be a graph"): each day's visitors by channel and chapter 1
# finishes, yesterday vs the day before, each channel since launch. Saved next to the draft; attach it to the post.
# Same numbers as the public /stats page (8 Oct: direct, LinkedIn, internal and test setups left out).
npx convex run --prod stats:summary '{}' > "$OUT_DIR/$TODAY-numbers.json" 2>/dev/null
PUB="$(cat "$OUT_DIR/$TODAY-numbers.json")"
VIS=$(echo "$PUB" | jq .visitorsAll); STARTED=$(echo "$PUB" | jq .started); PASSED=$(echo "$PUB" | jq .passedChapter1)
CHART="$OUT_DIR/$TODAY-chart.png"
# The image for the post: a screenshot of the live /stats dashboard (the chart below stays as a backup and for the numbers)
SHOT="$OUT_DIR/$TODAY-stats.png"
node scripts/stats-shot.mjs "$SHOT" >/dev/null 2>&1 || SHOT="(stats screenshot failed; use $CHART)"
CJ=$(node scripts/x-chart.mjs "$OUT_DIR/$TODAY-numbers.json" "$CHART" "$DAY" 2>/dev/null || echo '{}')
cj() { echo "$CJ" | jq -r "$1 // \"?\""; }
Y_TOTAL=$(cj .yesterday.total); Y_PASSED=$(cj .yesterday.passed); YB_TOTAL=$(cj .dayBefore.total)
Y_TOP=$(echo "$CJ" | jq -r '.yesterday.by // {} | to_entries | sort_by(-.value) | .[0].key // "?"' | sed 's/growthx/the GrowthX community/; s/^ig$/Instagram/; s/^x$/X/; s/^dm$/DMs/; s/other/other sites/')
Y_CH=$(echo "$CJ" | jq -r '.yesterday.by // {} | "GrowthX \(.growthx // 0) · Instagram \(.ig // 0) · X \(.x // 0) · DMs \(.dm // 0) · other sites \(.other // 0)"')
SOCIAL=$( [ -f docs/launch/social-metrics.json ] && jq -r --arg d "$(date -v-1d +%Y-%m-%d)" '.[$d] // empty | tostring' docs/launch/social-metrics.json || true )
step() { echo "$1" | jq -r --arg s "$2" '.funnel[] | select(.step == $s) | .n'; }

SIGNUPS=$(echo "$PUB" | jq .signups)
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

Day $DAY of building 𝙄 𝙂𝙚𝙩 𝙄𝙩 in public.

Yesterday: $Y_TOTAL new visitors (the day before: $YB_TOTAL), $Y_PASSED of them finished chapter 1. Most came from $Y_TOP.

Live numbers, open to anyone: https://www.igetit.now/stats

What we decided or struggled with: [one thing, from "Stories from the last day" below]
What we try today: [one thing, and the number that will tell us if it worked]

[your line: answer the question below]

https://www.igetit.now/?utm_source=x

#IGetIt #buildinpublic #learnsomethingnew #microlearning #AIlearning #growthx

Attach the dashboard screenshot: $SHOT
(backup image: $CHART)

## Yesterday's response, by channel (for you, not the post)

- Visitors yesterday by first source: $Y_CH.
- Instagram and X numbers on /stats: $(echo "$PUB" | jq -r --arg d "$(date -v-1d +%Y-%m-%d)" '[.social[] | select(.day == $d) | .platform] | if length == 0 then "none for yesterday yet. Send the agent yesterday'"'"'s numbers from each app'"'"'s insights and it saves them (social:record)" else "saved for " + join(" and ") end').
- All time: $VIS visitors · $STARTED handbooks started · $PASSED passed chapter 1 · $READY ready topics.
- The loop: keep what brought readers yesterday, change one thing that didn't (docs/content-plan.md section 7).

## Your question for today

$Q

## Since yesterday (for you, not the post)

- $BET
- $T_VIS visitors since yesterday, $T_X of them from X.
- Sign-ups all time: $SIGNUPS.
- Post numbers match /stats: direct, LinkedIn, internal and test setups left out (8 Oct). The lines above this one use the owner's full log.

## Stories from the last day (docs/launch/post-ideas.md: what shipped, and your "idea:" notes)

$(YDAY=$(date -v-1d +%Y-%m-%d); [ -f docs/launch/post-ideas.md ] && awk -v y="- $YDAY" -v t="- $TODAY" 'index($0, y) == 1 || index($0, t) == 1 { on = 1; print; next } /^- / { on = 0 } on' docs/launch/post-ideas.md | cut -c1-300 || echo "- Nothing logged yet.")
EOF

osascript -e "display notification \"Day $DAY: $VIS visitors, $PASSED passed chapter 1. Add your line.\" with title \"Today's X post is ready\" sound name \"Glass\"" || true
echo "$(date '+%F %T') wrote $OUT"
