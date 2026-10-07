import { test, mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../src/workers-ai.ts", {
  exports: {
    askClef: async () => ({ ok: true, titleProbability: 0.9, flaggedGenres: [] }),
    embedTexts: async () => ({ ok: false, error: "embedding down" }),
    DIM: 2,
  },
});

const { search } = await import("../src/search.ts");

const index = {
  movies: [
    { title: "Alpha", year: "2020", overview: "wolves", genres: [], rating: 5, poster: "" },
    { title: "Beta", year: "2020", overview: "foxes", genres: [], rating: 5, poster: "" },
  ],
  vectors: new Float32Array(4),
  genres: [],
  bm25: ({ query }: { query: string }) => (query.includes("wolves") ? [{ index: 0, score: 1 }] : [{ index: 1, score: 1 }]),
};

test("ranks by BM25 only and stays degraded when embedTexts fails", async () => {
  const result = await search({ query: "wolves", index });
  assert.equal(result.degraded, true);
  assert.deepEqual(result.results.map((m) => m.title), ["Alpha"]);
});
