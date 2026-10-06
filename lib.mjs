// Shared: Workers AI calls, CSV parse, BM25. Zero deps.
const { CLOUDFLARE_ACCOUNT_ID: ACC, CLOUDFLARE_API_TOKEN: TOKEN } = process.env;

export async function ai(model, body) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACC}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`${model} ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.result ?? j;
}

export const EMBED_MODEL = "@cf/baai/bge-small-en-v1.5"; // 384 dims, cheap
export const DIM = 384;
export const embed = async (texts) => (await ai(EMBED_MODEL, { text: texts })).data;

export function parseCsv(s) {
  const rows = [];
  let row = [], f = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { f += '"'; i++; }
      else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(f); f = ""; rows.push(row); row = [];
    } else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

export const tokenize = (s) => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

export function makeBm25(docs, k1 = 1.5, b = 0.75) {
  const tfs = docs.map((d) => {
    const m = new Map();
    for (const t of tokenize(d)) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  });
  const lens = tfs.map((m) => [...m.values()].reduce((a, c) => a + c, 0));
  const avg = lens.reduce((a, c) => a + c, 0) / docs.length;
  const df = new Map();
  for (const m of tfs) for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const N = docs.length;
  // returns [{i, score}] best first, only docs with score > 0
  return (query, n = 50) => {
    const qs = [...new Set(tokenize(query))];
    const out = [];
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (const t of qs) {
        const f = tfs[i].get(t);
        if (!f) continue;
        const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
        s += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * lens[i]) / avg));
      }
      if (s > 0) out.push({ i, score: s });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, n);
  };
}
