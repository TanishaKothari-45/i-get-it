"use node";
// Langfuse export (8 Oct): every handbook becomes one trace in Langfuse, from the moment it was typed: a root span,
// "research started", and one generation per AI call (model, timing, tokens, cost, retries, errors). Sent from the
// call log every 2 minutes by a scheduled job, as OpenTelemetry over HTTP/JSON, so a reader never waits on it and
// nothing is lost if Langfuse is down (the next run picks up where this one stopped).
// Keys in the Convex env: LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASE_URL. Without them it does nothing.
// Prompts and replies are sent only with LANGFUSE_INCLUDE_TEXT=1 (test deployments); otherwise numbers only.
import { createHash } from "node:crypto";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { inrOf } from "./costs";

const BATCH = 100;              // calls per run; well under Langfuse's request size even with text
const TEXT_CAP = 4000;          // characters of prompt or reply per call, when text is sent
const INR_PER_USD = 84;         // as in costs.ts

const hex = (s: string, n: number) => createHash("sha256").update(s).digest("hex").slice(0, n);
const nanos = (ms: number) => `${Math.round(ms)}000000`;
const str = (key: string, value: string) => ({ key, value: { stringValue: value } });
const int = (key: string, value: number) => ({ key, value: { intValue: String(Math.round(value)) } });

export type Row = {
  id: string; kind: string; model: string; ms: number; ok: boolean; at: number; tokensIn: number; tokensOut: number;
  attempts: number; error?: string; handbookId?: string; chapter?: number; input?: string; output?: string;
};
export type Info = { id: string; createdAt: number; kind: string; researchStartedAt?: number };

// The span for one AI call, inside its handbook's trace (or a trace of its own for one-off tools).
function callSpan(c: Row, traceId: string, parentSpanId: string | undefined, withText: boolean) {
  const usd = inrOf(c.model, c.ok, c.tokensIn, c.tokensOut) / INR_PER_USD;
  const attributes = [
    str("langfuse.observation.type", c.kind === "transcript" ? "span" : "generation"),
    str("langfuse.observation.model.name", c.model),
    str("langfuse.observation.usage_details", JSON.stringify({ input: c.tokensIn, output: c.tokensOut, total: c.tokensIn + c.tokensOut })),
    str("langfuse.observation.cost_details", JSON.stringify({ total: usd })),
    int("langfuse.observation.metadata.attempts", c.attempts),
    ...(c.chapter ? [int("langfuse.observation.metadata.chapter", c.chapter)] : []),
    ...(c.ok ? [] : [str("langfuse.observation.level", "ERROR"), str("langfuse.observation.status_message", (c.error ?? "failed").slice(0, 500))]),
    ...(withText && c.input ? [str("langfuse.observation.input", c.input.slice(0, TEXT_CAP))] : []),
    ...(withText && c.output ? [str("langfuse.observation.output", c.output.slice(0, TEXT_CAP))] : []),
    ...(parentSpanId ? [] : [str("langfuse.trace.name", `one-off: ${c.kind}`)]),
  ];
  return {
    traceId, spanId: hex(`call:${c.id}`, 16), ...(parentSpanId ? { parentSpanId } : {}),
    name: c.chapter ? `${c.kind} · chapter ${c.chapter}` : c.kind, kind: 1,
    startTimeUnixNano: nanos(c.at - c.ms), endTimeUnixNano: nanos(c.at),
    attributes, status: c.ok ? { code: 1 } : { code: 2, message: (c.error ?? "failed").slice(0, 200) },
  };
}

// The handbook's own spans: the root (from when it was typed to its latest call) and "research started". Sent again
// with each batch under the same ids, so the root's end moves forward as the handbook is written.
function handbookSpans(h: Info, calls: Row[]) {
  const traceId = hex(`trace:${h.id}`, 32), rootId = hex(`root:${h.id}`, 16);
  const end = Math.max(h.createdAt, ...calls.map((c) => c.at));
  const root = {
    traceId, spanId: rootId, name: "handbook", kind: 1,
    startTimeUnixNano: nanos(h.createdAt), endTimeUnixNano: nanos(end),
    attributes: [
      str("langfuse.trace.name", `handbook (${h.kind})`), str("langfuse.session.id", h.id),
      str("langfuse.trace.metadata.handbookId", h.id), str("langfuse.trace.metadata.kind", h.kind),
      str("langfuse.observation.type", "span"),
    ],
    status: { code: 1 },
  };
  const events = h.researchStartedAt ? [{
    traceId, spanId: hex(`research-started:${h.id}`, 16), parentSpanId: rootId, name: "research started", kind: 1,
    startTimeUnixNano: nanos(h.researchStartedAt), endTimeUnixNano: nanos(h.researchStartedAt),
    attributes: [str("langfuse.observation.type", "event")], status: { code: 1 },
  }] : [];
  return { traceId, rootId, spans: [root, ...events] };
}

export const exportNew = internalAction({
  args: {},
  handler: async (ctx): Promise<{ sent: number; skipped?: string }> => {
    const pub = process.env.LANGFUSE_PUBLIC_KEY, secret = process.env.LANGFUSE_SECRET_KEY, base = process.env.LANGFUSE_BASE_URL;
    if (!pub || !secret || !base) return { sent: 0, skipped: "no Langfuse keys" };
    const withText = process.env.LANGFUSE_INCLUDE_TEXT === "1";

    const after: number = await ctx.runQuery(internal.langfuseData.cursor, {});
    const fetched: Row[] = await ctx.runQuery(internal.langfuseData.calls, { after, limit: BATCH + 1, withText });
    if (!fetched.length) return { sent: 0 };
    // Stop at a millisecond boundary, so calls logged in the same millisecond never straddle two runs.
    const rows = fetched.length > BATCH ? fetched.filter((c) => c.at < fetched[BATCH].at) : fetched;
    if (!rows.length) return { sent: 0, skipped: "too many calls in one millisecond" };

    const ids = [...new Set(rows.map((c) => c.handbookId).filter((x): x is string => !!x))];
    const infos: Info[] = ids.length ? await ctx.runQuery(internal.langfuseData.handbooks, { ids }) : [];
    const spans: any[] = [];
    for (const h of infos) {
      const mine = rows.filter((c) => c.handbookId === h.id);
      const { traceId, rootId, spans: own } = handbookSpans(h, mine);
      spans.push(...own, ...mine.map((c) => callSpan(c, traceId, rootId, withText)));
    }
    const known = new Set(infos.map((h) => h.id));
    for (const c of rows.filter((c) => !c.handbookId || !known.has(c.handbookId))) spans.push(callSpan(c, hex(`call:${c.id}`, 32), undefined, withText));

    const body = {
      resourceSpans: [{
        resource: { attributes: [str("service.name", "i-get-it"), str("deployment.environment", process.env.LANGFUSE_ENVIRONMENT ?? "development")] },
        scopeSpans: [{ scope: { name: "i-get-it.observability" }, spans }],
      }],
    };
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/public/otel/v1/traces`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${pub}:${secret}`).toString("base64")}`,
        "Content-Type": "application/json",
        "x-langfuse-ingestion-version": "4",
      },
      body: JSON.stringify(body),
    });
    // Not sent: keep the cursor where it was, so the next run sends these again.
    if (!res.ok) throw new Error(`Langfuse ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
    await ctx.runMutation(internal.langfuseData.setCursor, { at: Math.max(...rows.map((c) => c.at)) });
    return { sent: rows.length };
  },
});
