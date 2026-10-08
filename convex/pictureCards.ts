// Which cards of a chapter get a picture (moved here from images.ts on 8 Oct, so the fact check in handbooks.ts can ask
// for the scenes in the same call; images.ts runs in Node and can't be imported there). The opening picture card, then
// examples and mistakes (the scenes people remember), then the try card and teaching cards, in reading order, at most
// MAX_PICTURES. The closing "In one breath" card isn't shown.
export const MAX_PICTURES = 5;           // 7 Oct, Prateek: 4 to 5 a chapter (was up to 8)
const PRIORITY: Record<string, number> = { picture: 0, example: 1, mistake: 2, try: 3, teach: 4 };
export function pictureCards(cards: any[]) {
  const all = cards.map((c: any, i: number) => ({ c, i })).filter(({ c }) => c && c.type !== "exercise" && c.type !== "watch" && typeof c.body === "string" && !/^in one breath$/i.test(String(c.title ?? "").trim()));
  const keep = new Set([...all].sort((a, b) => (PRIORITY[a.c.type] ?? 5) - (PRIORITY[b.c.type] ?? 5) || a.i - b.i).slice(0, MAX_PICTURES).map((x) => x.i));
  return all.filter((x) => keep.has(x.i));
}
