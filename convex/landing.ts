import { query } from "./_generated/server";

// Public content for the landing page, all from the ready topics: a tappable demo of
// Public speaking chapter 1, its seven-night path, and a shelf of ready topics with cover pictures.
const DEMO_TOPIC = "public speaking";

const firstPara = (s: string) => s.split(/\n\n+/)[0]?.trim() ?? "";

export const content = query({
  args: {},
  handler: async (ctx) => {
    const rows = (await ctx.db.query("cache").collect()).filter((r) => r.level === "new");
    const url = async (id?: any) => (id ? await ctx.storage.getUrl(id) : null);
    const pictureFor = async (ch: any, card: number) => url(ch?.pictures?.find((p: any) => p.card === card)?.storageId);

    // One shelf entry per real topic (several spellings share one row's content).
    const seen = new Map<string, any>();
    for (const r of rows) if (!seen.has(r.topic)) seen.set(r.topic, r);
    const shelf = [];
    for (const r of seen.values()) {
      const ch1 = r.chapters.find((c: any) => c.n === 1);
      shelf.push({ topic: r.plan?.topic ?? r.topic, outcome: String(r.plan?.outcome7 ?? "").split(/(?<=\.)\s/)[0], cover: await pictureFor(ch1, 0) });
    }

    const demoRow = rows.find((r) => r.topicKey === DEMO_TOPIC);
    const ch = demoRow?.chapters.find((c: any) => c.n === 1);
    const frames: any[] = [];
    if (ch) {
      for (const [i, c] of (ch.cards ?? []).entries()) {
        if (frames.length >= 6) break;
        if (c.type === "exercise") {
          if (frames.some((f) => f.kind === "exercise")) continue;
          frames.push({ kind: "exercise", prompt: c.prompt, options: c.options, answer: c.answer, whyNot: c.whyNot ?? {} });
        } else if (c.type !== "watch" && typeof c.body === "string") {
          frames.push({ kind: c.type, title: c.title, text: firstPara(c.body), picture: await pictureFor(ch, i) });
        }
      }
    }
    return {
      demo: ch ? { topic: demoRow!.plan?.topic ?? demoRow!.topic, title: ch.title, frames, total: (ch.cards ?? []).length } : null,
      path: demoRow?.plan ? { topic: demoRow.plan.topic, outcome: demoRow.plan.outcome7, chapters: (demoRow.plan.chapters ?? []).map((c: any) => ({ n: c.n, title: c.title, hook: c.hook })) } : null,
      shelf: shelf.filter((s) => s.cover).concat(shelf.filter((s) => !s.cover)),
    };
  },
});
