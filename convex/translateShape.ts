// What gets translated, and putting it back. Only the words a reader sees go to the model; ids,
// answer keys, card types and numbers never leave, so a translation can't break an exercise.
// Pure functions (no Convex, no network), shared by the translate action and its checks.

// Fields that are structure, not reading: never sent for translation. Also names of real things that must stay
// exact: a "watch" card's link, timestamp, speaker and talk title, and a plan source's author and work title.
const STRUCTURE = new Set(["type", "kind", "id", "answer", "n", "freshness", "needsClarification", "simplerFailedAt", "url", "from", "who", "what", "svg"]);

// Calls fn on every string a reader sees, in a fixed order, and returns a copy with fn's results.
function mapReadable(value: unknown, fn: (s: string) => string): unknown {
  if (typeof value === "string") return value.trim() ? fn(value) : value;
  if (Array.isArray(value)) return value.map((x) => mapReadable(x, fn));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, x]) => [k, STRUCTURE.has(k) ? x : mapReadable(x, fn)]));
  }
  return value;
}

// One group per unit (a card, a plan chapter): a unit is translated together, so the model sees
// the whole card (a story stays a story) and a batch never splits one.
export function readableGroups(units: unknown[]): string[][] {
  return units.map((unit) => {
    const found: string[] = [];
    mapReadable(unit, (s) => { found.push(s); return s; });
    return found;
  });
}

export function withTranslations<T>(units: T[], groups: string[][]): T[] {
  if (groups.length !== units.length) throw new Error(`expected ${units.length} groups, got ${groups.length}`);
  return units.map((unit, i) => {
    const queue = [...groups[i]];
    const out = mapReadable(unit, () => {
      const next = queue.shift();
      if (next === undefined) throw new Error(`group ${i} came back short`);
      return next;
    });
    if (queue.length) throw new Error(`group ${i} came back long`);
    return out as T;
  });
}

// A plan as units: the header (topic, outcomes, picture, related), then one unit per chapter.
export function planUnits(plan: any): unknown[] {
  const { chapters, ...header } = plan ?? {};
  return [header, ...(Array.isArray(chapters) ? chapters : [])];
}

export function planFromUnits(units: any[]): any {
  const [header, ...chapters] = units;
  return { ...header, chapters };
}

// A chapter (or bonus lesson) as units: its title and outcome line, then one unit per card. The
// "In one breath" card is found by its English title (for the next chapter's recap), so it's
// flagged before the title is translated.
export function chapterUnits(ch: { title?: string; outcomeLine?: string; cards?: unknown[] }): unknown[] {
  const cards = (ch.cards ?? []).map((c: any) => (c?.type === "teach" && /in one breath/i.test(c.title ?? "") ? { ...c, summary: true } : c));
  return [{ title: ch.title ?? "", outcomeLine: ch.outcomeLine ?? "" }, ...cards];
}

export function chapterFromUnits(units: any[]): { title: string; outcomeLine: string; cards: any[] } {
  const [head, ...cards] = units;
  return { title: String(head?.title ?? ""), outcomeLine: String(head?.outcomeLine ?? ""), cards };
}
