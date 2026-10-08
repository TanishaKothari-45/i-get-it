import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// D29b (9 Oct): the small variant of a picture when one exists (images.ts smallVariants records it in settings under
// "small:<id>"), else the picture itself. For the covers and story pictures a phone loads first.
export async function smallUrl(ctx: QueryCtx, id: Id<"_storage"> | string | null | undefined): Promise<string | null> {
  if (!id) return null;
  // images.ts records the pair through repairData.rememberShrunk, which keys everything under "shrunk:".
  const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", `shrunk:small:${String(id)}`)).unique();
  const small = row?.value ? ctx.db.system.normalizeId("_storage", row.value) : null;
  return (small && (await ctx.storage.getUrl(small))) || (await ctx.storage.getUrl(id as Id<"_storage">));
}
