// One-off: download TMDB ~9.8k movies CSV, embed title+overview, write data/.
import { mkdir, writeFile } from "node:fs/promises";
import { parseCsv, embed, DIM } from "./lib.mjs";

const CSV = "https://huggingface.co/datasets/Pablinho/movies-dataset/resolve/main/9000plus.csv";
const [head, ...rows] = parseCsv(await (await fetch(CSV)).text());
const col = Object.fromEntries(head.map((h, i) => [h, i]));
const movies = rows
  .filter((r) => r[col.Title] && r[col.Overview])
  .map((r) => ({
    title: r[col.Title],
    year: r[col.Release_Date].slice(0, 4),
    overview: r[col.Overview],
    genres: r[col.Genre].split(",").map((g) => g.trim()).filter(Boolean),
    rating: +r[col.Vote_Average],
    poster: r[col.Poster_Url],
  }));

const vecs = new Float32Array(movies.length * DIM);
const BATCH = 100;
for (let i = 0; i < movies.length; i += BATCH) {
  const batch = movies.slice(i, i + BATCH).map((m) => `${m.title}. ${m.genres.join(", ")}. ${m.overview}`);
  (await embed(batch)).forEach((v, j) => vecs.set(v, (i + j) * DIM));
  console.log(`${Math.min(i + BATCH, movies.length)}/${movies.length}`);
}
await mkdir("data", { recursive: true });
await writeFile("data/movies.json", JSON.stringify(movies));
await writeFile("data/vectors.bin", Buffer.from(vecs.buffer));
