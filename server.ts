import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import type { Movie } from "./src/csv.ts";
import { makeBm25 } from "./src/bm25.ts";
import { search } from "./src/search.ts";

const PORT = 3000;

const movies: Movie[] = JSON.parse(await readFile("data/movies.json", "utf8"));
const buffer = await readFile("data/vectors.bin");
const vectors = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
const genres = [...new Set(movies.flatMap((m) => m.genres))].sort();
const bm25 = makeBm25({ docs: movies.map((m) => `${m.title} ${m.title} ${m.genres.join(" ")} ${m.overview}`) });
const index = { movies, vectors, genres, bm25 };
const page = await readFile("public/index.html");

const handleSearch = async (query: string): Promise<string> => {
  if (!query) return JSON.stringify({ results: [] });
  const start = performance.now();
  const out = await search({ query, index });
  return JSON.stringify({ ...out, ms: Math.round(performance.now() - start) });
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/api/search") {
    res.setHeader("Content-Type", "application/json");
    return res.end(await handleSearch((url.searchParams.get("q") ?? "").trim().slice(0, 200)));
  }
  res.setHeader("Content-Type", "text/html");
  return res.end(page);
}).listen(PORT, "127.0.0.1", () => console.log(`http://127.0.0.1:${PORT}`));
