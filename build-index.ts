import { mkdir, writeFile } from "node:fs/promises";
import { parseCsv, toMovies } from "./src/csv.ts";
import type { Movie } from "./src/csv.ts";
import { embedTexts } from "./src/workers-ai.ts";

const CSV_URL = "https://huggingface.co/datasets/Pablinho/movies-dataset/resolve/main/9000plus.csv";
const BATCH = 100;
const BUILD_TIMEOUT_MS = 60_000;

const chunk = <T>({ items, size }: { items: T[]; size: number }): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

const embedBatch = async ({ batch, done, total }: { batch: Movie[]; done: number; total: number }): Promise<number[][]> => {
  const embedded = await embedTexts({
    texts: batch.map((m) => `${m.title}. ${m.genres.join(", ")}. ${m.overview}`),
    timeoutMs: BUILD_TIMEOUT_MS,
  });
  if (!embedded.ok) throw new Error(`embedding batch at ${done} failed: ${embedded.error}`);
  console.log(`${done + batch.length}/${total}`);
  return embedded.vectors;
};

const text = await (await fetch(CSV_URL)).text();
const movies = toMovies({ rows: parseCsv({ text }) });
const vectors = await chunk({ items: movies, size: BATCH }).reduce(
  async (previous: Promise<number[][]>, batch, i) => [
    ...(await previous),
    ...(await embedBatch({ batch, done: i * BATCH, total: movies.length })),
  ],
  Promise.resolve([]),
);

await mkdir("data", { recursive: true });
await writeFile("data/movies.json", JSON.stringify(movies));
await writeFile("data/vectors.bin", Buffer.from(Float32Array.from(vectors.flat()).buffer));
