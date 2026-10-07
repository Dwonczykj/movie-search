import { test, mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../src/workers-ai.ts", {
  exports: {
    askClef: async () => ({ ok: false, error: "clef down" }),
    embedTexts: async () => ({ ok: false, error: "embedding down" }),
    DIM: 2,
  },
});

const { search } = await import("../src/search.ts");

const index = {
  movies: [{ title: "Alpha", year: "2020", overview: "wolves", genres: [], rating: 5, poster: "" }],
  vectors: new Float32Array(2),
  genres: [],
  bm25: () => [{ index: 0, score: 1 }],
};

test("stays degraded with BM25-only, neutral-weight ranking when Clef and embedding both fail on the same call", async () => {
  const result = await search({ query: "wolves", index });
  assert.equal(result.titleProbability, 0.5);
  assert.deepEqual(result.flaggedGenres, []);
  assert.equal(result.degraded, true);
  assert.deepEqual(result.results.map((m) => m.title), ["Alpha"]);
});
