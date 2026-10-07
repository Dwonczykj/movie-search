import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { fuse as realFuse, cosineTop as realCosineTop } from "../src/rank.ts";

// Captures what search() actually passes to fuse, so a test can tell the real
// fallback titleProbability from a hardcoded stand-in for it (see below).
const fuseCalls: { titleProbability: number }[] = [];

mock.module("../src/workers-ai.ts", {
  exports: {
    askClef: async () => ({ ok: false, error: "clef down" }),
    embedTexts: async () => ({ ok: true, vectors: [[1, 0]] }),
    DIM: 2,
  },
});
mock.module("../src/rank.ts", {
  exports: {
    fuse: (args: Parameters<typeof realFuse>[0]) => {
      fuseCalls.push(args);
      return realFuse(args);
    },
    cosineTop: realCosineTop,
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
  // Pins that the 0.5 fallback is what actually reaches ranking, not just what's reported.
  assert.equal(fuseCalls.at(-1)?.titleProbability, 0.5);
});
