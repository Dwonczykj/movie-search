import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { makeBm25 } from "./lib.mjs";
import { makeSearch } from "./search.mjs";

const movies = JSON.parse(await readFile("data/movies.json", "utf8"));
const buf = await readFile("data/vectors.bin");
const vecs = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
const bm25 = makeBm25(movies.map((m) => `${m.title} ${m.title} ${m.genres.join(" ")} ${m.overview}`)); // title x2 = light boost
const search = makeSearch({ movies, vecs, bm25 });
const page = await readFile("public/index.html");

createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/api/search") {
    const q = (u.searchParams.get("q") ?? "").trim().slice(0, 200);
    res.setHeader("Content-Type", "application/json");
    if (!q) return res.end('{"results":[]}');
    const t = performance.now();
    const out = await search(q).catch((e) => ({ error: e.message, results: [] }));
    return res.end(JSON.stringify({ ...out, ms: Math.round(performance.now() - t) }));
  }
  res.setHeader("Content-Type", "text/html");
  res.end(page);
}).listen(3000, () => console.log("http://localhost:3000"));
