// D28 (Prateek, 9 Oct 02:0x): a handbook is named by what the person typed, trimmed and capitalised, never by the plan
// model's own title. One small module so library.ts, shelf.ts and repairData.ts can share it without a cycle.
export const typedName = (t: string) => t.trim().replace(/\s+/g, " ").replace(/^./, (c) => c.toUpperCase());
