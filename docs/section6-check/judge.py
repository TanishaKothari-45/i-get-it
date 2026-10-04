import json, os, sys, subprocess, re, time
# LLM as judge: binary checks on one chapter, a weakest-card pointer, one fix. Claude via Claude Code headless.
JUDGE = """You are a strict editor judging one chapter of a short teaching handbook for a busy adult reading on a phone. Answer each check with true or false only, then name the weakest card and one concrete fix. Be harsh: a check passes only if it clearly holds.

Checks:
1. hook: the first sentence of card 1 would stop a scroll: specific, surprising or a real question, no throat-clearing.
2. short_cards: no single card over 120 words.
3. concrete_images: every teach card contains at least one concrete image (a thing, a place, a moment), not only abstractions.
4. one_idea: the chapter teaches one thing; the three exercises test that same thing from three angles.
5. answerable: every exercise can be answered from what the chapter taught (no outside knowledge needed).
6. feedback_names_confusion: every wrong-option feedback names what it was confused with; none says "incorrect" or "wrong".
7. no_cliche: no "imagine a world", "in today's fast-paced", "unlock", "dive in", "game-changer", or similar.
8. topic_specific: a reader could tell this was written for this exact topic, not pasted from a template.
9. facts_ok: no claim you believe to be false or invented (names, dates, numbers, tools). If unsure, mark false and say which.
10. would_keep_reading: a 28-year-old product manager who is not already interested would finish this chapter.
11. laugh_or_sit_up: at least one moment that makes the reader smile or sit up.
12. open_loop: the chapter ends with a line that makes the next chapter wanted.

Return JSON only: {"checks":{"hook":bool,...,"open_loop":bool},"score":<count of true>,"weakest_card":<1-based index>,"why":"<one line>","fix":"<one concrete change, one line>","dubious_claims":["..."]}"""
def judge(path):
    d = json.load(open(path)); ch = d.get('chapter') or d
    slim = {"title": ch.get('title'), "cards": [{k: v for k, v in c.items() if k in ('type','kind','title','body','prompt','options','answer','whyNot','reteach','watchFor','who','what')} for c in ch['cards']], "outcomeLine": ch.get('outcomeLine')}
    prompt = JUDGE + "\n\n---\n\nChapter JSON:\n" + json.dumps(slim, ensure_ascii=False) + "\n\nReturn only the JSON object."
    env = {k: v for k, v in os.environ.items() if k not in ('CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT')}
    last = ''
    for attempt in range(3):
        out = subprocess.run(['claude', '-p', prompt, '--output-format', 'text'], capture_output=True, text=True, env=env, timeout=600).stdout
        m = re.search(r'\{.*\}', out, re.S)
        if m:
            try: return json.loads(m.group(0))
            except Exception: pass
        last = out[:200]; time.sleep(20)
    raise RuntimeError(f'judge returned no JSON after 3 tries: {last!r}')
if __name__ == '__main__':
    path = sys.argv[1]; t = time.time()
    r = judge(path)
    out = path.replace('.json', '.judge.json'); json.dump(r, open(out, 'w'), indent=1)
    print(f"JUDGE {path}: score={r.get('score')}/12 weakest={r.get('weakest_card')} fix={str(r.get('fix'))[:90]} ({time.time()-t:.0f}s)")
