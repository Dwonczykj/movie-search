import { mkdir, writeFile } from "node:fs/promises";
import { parseCsv, toMovies } from "./src/csv.ts";
import { embedTexts, DIM } from "./src/workers-ai.ts";

const CSV_URL = "https://huggingface.co/datasets/Pablinho/movies-dataset/resolve/main/9000plus.csv";
const BATCH = 100;
const BUILD_TIMEOUT_MS = 60_000;

const chunk = <T>({ items, size }: { items: T[]; size: number }): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

const text = await (await fetch(CSV_URL)).text();
const movies = toMovies({ rows: parseCsv({ text }) });
const vectors = new Float32Array(movies.length * DIM);

// sequential: Workers AI rate-limits batch embedding, so batches run one at a time
for (const [i, batch] of chunk({ items: movies, size: BATCH }).entries()) {
  const offset = i * BATCH;
  const embedded = await embedTexts({
    texts: batch.map((m) => `${m.title}. ${m.genres.join(", ")}. ${m.overview}`),
    timeoutMs: BUILD_TIMEOUT_MS,
  });
  if (!embedded.ok) throw new Error(`embedding batch at ${offset} failed: ${embedded.error}`);
  embedded.vectors.forEach((vector, j) => vectors.set(vector, (offset + j) * DIM));
  console.log(`${offset + batch.length}/${movies.length}`);
}

await mkdir("data", { recursive: true });
await writeFile("data/movies.json", JSON.stringify(movies));
await writeFile("data/vectors.bin", Buffer.from(vectors.buffer));
