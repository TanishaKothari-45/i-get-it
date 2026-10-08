// D28 (Prateek, 9 Oct 02:0x): a handbook is named by what the person typed, trimmed and capitalised, never by the plan
// model's own title. One small module so library.ts, shelf.ts and repairData.ts can share it without a cycle.
export const typedName = (t: string) => {
  const clean = t.trim().replace(/\s+/g, " ");
  // A first word with a digit in it is a product name written the way its makers write it (n8n, 3D), left alone.
  return /^[a-z][a-z]*\d/.test(clean) ? clean : clean.replace(/^./, (c) => c.toUpperCase());
};
