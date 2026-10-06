#!/bin/bash
# Claude Code hooks (.claude/settings.local.json) that feed docs/launch/post-ideas.md, the list of X and Instagram
# post ideas the daily drafts draw on. Silent, never blocks.
#   commit: after a Bash call that ran `git commit`, adds the new commit's subject as "shipped".
#   prompt: when Prateek starts a message with "idea:", adds the message word for word.
cd "$(dirname "$0")/.." || exit 0
F=docs/launch/post-ideas.md   # gitignored: ideas stay on this Mac
IN=$(cat)
mkdir -p docs/launch
[ -f "$F" ] || printf '# Post ideas\n\nFed by hooks: every commit ("shipped") and every message that starts with "idea:". Newest at the bottom.\n\n' > "$F"
NOW=$(date '+%Y-%m-%d %H:%M')

case "$1" in
  commit)
    printf '%s' "$IN" | jq -r '.tool_input.command // ""' | grep -q 'git commit' || exit 0
    H=$(git log -1 --format=%h) || exit 0
    grep -qF "($H)" "$F" && exit 0   # one line per commit
    printf -- '- %s shipped: %s (%s)\n' "$NOW" "$(git log -1 --format=%s)" "$H" >> "$F"
    ;;
  prompt)
    P=$(printf '%s' "$IN" | jq -r '.prompt // ""')
    printf '%s' "$P" | head -1 | grep -qiE '^[[:space:]]*idea:' || exit 0
    BODY=$(printf '%s\n' "$P" | sed -E '1s/^[[:space:]]*[Ii][Dd][Ee][Aa]:[[:space:]]*//')
    { printf -- '- %s idea:\n' "$NOW"; printf '%s\n' "$BODY" | sed 's/^/    /'; } >> "$F"
    ;;
esac
exit 0
