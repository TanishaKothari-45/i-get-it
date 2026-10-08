# Gemini thinking level for research (v4)

Run 2026-10-08T11:29:11.906Z, dev deployment, gemini-3.8-flash, research prompt v4, 3 topics x 2 runs per level. Tokens out include thinking. ₹ is tokens only (Gemini rarely reports its searches).

| Thinking | Runs ok | Latency median / max | Tokens out avg / max | ₹ a run avg / max | Facts avg | Outline parts avg |
|---|---|---|---|---|---|---|
| low | 6/6 | 23 s / 76 s | 1160 / 1541 | ₹0.43 / ₹0.55 | 15.2 | 4.5 |
| medium | 6/6 | 30 s / 51 s | 3437 / 3843 | ₹1.16 / ₹1.29 | 15.2 | 4.3 |
| uncapped (before) | 6/6 | 45 s / 81 s | 4454 / 6099 | ₹1.48 / ₹1.99 | 15.7 | 4.2 |

| Topic | Thinking | Run | Latency | Tokens out | ₹ | Facts |
|---|---|---|---|---|---|---|
| RBI repo rate | default | 1 | 60 s | 4220 | ₹1.41 | 16 |
| RBI repo rate | default | 2 | 81 s | 4215 | ₹1.40 | 16 |
| RBI repo rate | low | 1 | 28 s | 1413 | ₹0.51 | 14 |
| RBI repo rate | low | 2 | 22 s | 1472 | ₹0.53 | 13 |
| RBI repo rate | medium | 1 | 29 s | 3491 | ₹1.17 | 15 |
| RBI repo rate | medium | 2 | 51 s | 3449 | ₹1.19 | 16 |
| Swimming | default | 1 | 72 s | 6099 | ₹1.99 | 15 |
| Swimming | default | 2 | 45 s | 4743 | ₹1.58 | 15 |
| Swimming | low | 1 | 23 s | 1541 | ₹0.55 | 18 |
| Swimming | low | 2 | 12 s | 1075 | ₹0.40 | 19 |
| Swimming | medium | 1 | 30 s | 3049 | ₹1.03 | 15 |
| Swimming | medium | 2 | 37 s | 3843 | ₹1.29 | 15 |
| World War I | default | 1 | 31 s | 4138 | ₹1.37 | 15 |
| World War I | default | 2 | 29 s | 3308 | ₹1.11 | 17 |
| World War I | low | 1 | 29 s | 641 | ₹0.26 | 15 |
| World War I | low | 2 | 76 s | 817 | ₹0.32 | 12 |
| World War I | medium | 1 | 32 s | 3778 | ₹1.26 | 15 |
| World War I | medium | 2 | 26 s | 3012 | ₹1.02 | 15 |
