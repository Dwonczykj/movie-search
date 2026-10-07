import { test, mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../src/workers-ai.ts", {
  exports: {
    askClef: async () => ({ ok: false, error: "clef down" }),
    embedTexts: async () => ({ ok: true, vectors: [[1, 0]] }),
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

test("defaults to neutral Clef weights, empty flagged genres, and logs a warning when askClef fails", async (t) => {
  const warn = t.mock.method(console, "warn");
  const result = await search({ query: "wolves", index });
  assert.equal(result.titleProbability, 0.5);
  assert.deepEqual(result.flaggedGenres, []);
  assert.equal(result.degraded, true);
  assert.ok(warn.mock.callCount() > 0);
});
