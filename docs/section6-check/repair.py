import json, os, sys, subprocess, re, time, glob, concurrent.futures as cf
from judge import judge
# Targeted repair: give the model the chapter and the judge's objections; change only the cards involved; re-judge.
FIX = """You are fixing one chapter of a short teaching handbook after a strict fact-checker reviewed it. Change only what the objections require, as little as possible: correct or soften the claim, keep the voice, length, structure and every exercise's options, answer key, whyNot and reteach consistent with the corrected text. If an exercise's correct answer depended on a wrong claim, fix the prompt or options so the key is right. Never add new facts you are unsure of; prefer a careful, true phrasing ("usually", "most", "in many setups") over a precise claim. Do not attribute words to real people. Keep the "svg" field unchanged. Return the full chapter JSON in the same shape, JSON only."""
env = {k: v for k, v in os.environ.items() if k not in ('CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT')}
def weak(r): return not (r.get('score', 0) >= 10 and r.get('checks', {}).get('facts_ok'))
def repair(f):
    jf = f.replace('.json', '.judge.json')
    if not os.path.exists(jf): return (f, None, 'no judge file')
    r = json.load(open(jf))
    if not weak(r): return (f, r, 'already passing')
    d = json.load(open(f)); ch = d['chapter']
    objections = {"score": r.get('score'), "failed_checks": [k for k, v in r.get('checks', {}).items() if not v], "dubious_claims": r.get('dubious_claims', []), "weakest_card": r.get('weakest_card'), "why": r.get('why'), "fix": r.get('fix')}
    prompt = FIX + "\n\n---\n\nObjections:\n" + json.dumps(objections, ensure_ascii=False) + "\n\nChapter JSON:\n" + json.dumps(ch, ensure_ascii=False) + "\n\nReturn only the JSON object."
    new = None
    for attempt in range(3):
        out = subprocess.run(['claude', '-p', prompt, '--output-format', 'text'], capture_output=True, text=True, env=env, timeout=900).stdout
        m = re.search(r'\{.*\}', out, re.S)
        if m:
            try: new = json.loads(m.group(0)); break
            except Exception: pass
        time.sleep(15)
    if not new or not isinstance(new.get('cards'), list) or len(new['cards']) < 5: return (f, r, 'repair failed')
    new['svg'] = ch.get('svg', new.get('svg'))
    for i, c in enumerate(new['cards']):
        old = ch['cards'][i] if i < len(ch['cards']) else None
        if old and old.get('simpler') and old.get('body') == c.get('body'): c['simpler'] = old['simpler']
    json.dump({"chapter": new, "repairedFrom": objections}, open(f, 'w'), indent=1)
    subprocess.run([sys.executable, 'run_simpler.py', f], capture_output=True)
    try: r2 = judge(f)
    except Exception as e: return (f, r, f'repaired, re-judge error {e}')
    json.dump(r2, open(jf, 'w'), indent=1)
    return (f, r2, f"repaired {r.get('score')}->{r2.get('score')} facts_ok={r2.get('checks', {}).get('facts_ok')}")
def judge_missing(f):
    jf = f.replace('.json', '.judge.json')
    if os.path.exists(jf): return
    try: json.dump(judge(f), open(jf, 'w'), indent=1)
    except Exception as e: print('judge error', f, e, flush=True)
files = sorted(f for f in glob.glob('*.ch?.json') if not f.startswith(('variant-', 'flagship-')) and 'judge' not in f)
t = time.time()
with cf.ThreadPoolExecutor(max_workers=6) as ex: list(ex.map(judge_missing, files))
print(f"judged missing in {time.time()-t:.0f}s", flush=True)
results = []
with cf.ThreadPoolExecutor(max_workers=6) as ex:
    for res in ex.map(repair, files):
        results.append(res); print(res[0], res[2], flush=True)
rows = ["# Judge report", "", f"{time.strftime('%Y-%m-%d %H:%M')}. {len(files)} cached chapters. Judge: Claude via Claude Code headless, 12 binary checks. Bar: 10 of 12 and no doubtful fact. Weak chapters got a targeted repair (the model sees the judge's objections and changes only those cards), then a re-judge.", "", "| chapter | score | facts ok | result | still doubtful |", "|---|---|---|---|---|"]
for f, r, outcome in results:
    r = r or {}
    rows.append(f"| {f[:-5]} | {r.get('score','?')} | {r.get('checks',{}).get('facts_ok','?')} | {outcome} | {'; '.join(r.get('dubious_claims', []))[:180].replace('|','/')} |")
ok = [r for _, r, _ in results if r and not weak(r)]
sc = [r.get('score', 0) for _, r, _ in results if r]
rows += ["", f"Pass: {len(ok)} of {len(results)}. Mean score {sum(sc)/max(1,len(sc)):.1f} of 12."]
open('judge-report.md', 'w').write('\n'.join(rows) + '\n')
print(f"repair done in {time.time()-t:.0f}s; pass {len(ok)}/{len(results)}", flush=True)
