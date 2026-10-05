// Which links can be learned from, shared by the server (which enforces it) and the first screen (which shows it).
// Pure: no Convex imports, so the interface can use it too.

export const MAX_LINKS = 5;
export const MAX_PHOTOS = 3;

export type LinkKind = "youtube" | "instagram";

// A link we can read, cleaned up, or null. YouTube: watch, youtu.be and Shorts. Instagram: reels and posts.
export function classifyLink(raw: string): { kind: LinkKind; url: string } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  if (host === "youtu.be" && u.pathname.length > 1) return { kind: "youtube", url: `https://youtu.be${u.pathname}` };
  if (host === "youtube.com") {
    if (u.pathname === "/watch" && u.searchParams.get("v")) return { kind: "youtube", url: `https://www.youtube.com/watch?v=${u.searchParams.get("v")}` };
    const shorts = u.pathname.match(/^\/shorts\/([\w-]+)/);
    if (shorts) return { kind: "youtube", url: `https://www.youtube.com/shorts/${shorts[1]}` };
    return null;
  }
  if (host === "instagram.com") {
    const m = u.pathname.match(/^\/(reel|reels|p)\/([\w-]+)/);
    if (m) return { kind: "instagram", url: `https://www.instagram.com/${m[1] === "p" ? "p" : "reel"}/${m[2]}/` };
  }
  return null;
}

// Every link-looking piece of a pasted or shared text (apps often share "Look at this! https://…").
export function linksIn(text: string): string[] {
  return text.match(/https?:\/\/[^\s<>"']+/g) ?? [];
}
