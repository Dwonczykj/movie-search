import { z } from "zod";
import { clefQuestions, parseClef } from "./clef.ts";

export const DIM = 384;
const EMBED_MODEL = "@cf/baai/bge-small-en-v1.5";
const CLEF_MODEL = "@cf/cloudflare/clef-flash";

export const runModel = async ({ model, body, timeoutMs }: { model: string; body: unknown; timeoutMs: number }):
  Promise<{ ok: true; data: unknown } | { ok: false; error: string }> => {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { ok: false, error: `${model} ${response.status}` };
    const json = await response.json();
    return { ok: true, data: (json as { result?: unknown }).result ?? json };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export const parseEmbeddings = ({ raw }: { raw: unknown }):
  | { ok: true; vectors: number[][] }
  | { ok: false; error: string } => {
  const result = z.object({ data: z.array(z.array(z.number()).length(DIM)) }).safeParse(raw);
  if (!result.success) return { ok: false, error: result.error.message };
  return { ok: true, vectors: result.data.data };
};

export const embedTexts = async ({ texts, timeoutMs }: { texts: string[]; timeoutMs: number }):
  Promise<{ ok: true; vectors: number[][] } | { ok: false; error: string }> => {
  const call = await runModel({ model: EMBED_MODEL, body: { text: texts }, timeoutMs });
  if (!call.ok) return call;
  const parsed = parseEmbeddings({ raw: call.data });
  if (!parsed.ok) return parsed;
  if (parsed.vectors.length !== texts.length) return { ok: false, error: `expected ${texts.length} embeddings, got ${parsed.vectors.length}` };
  return parsed;
};

export const askClef = async ({ query, genres, timeoutMs }: { query: string; genres: string[]; timeoutMs: number }):
  Promise<{ ok: true; titleProbability: number; flaggedGenres: string[] } | { ok: false; error: string }> => {
  const body = { model: "clef-flash", state: query, questions: clefQuestions({ genres }) };
  const call = await runModel({ model: CLEF_MODEL, body, timeoutMs });
  if (!call.ok) return call;
  return parseClef({ raw: call.data, genres });
};
