import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { fuse as realFuse, cosineTop as realCosineTop } from "../src/rank.ts";

// Captures what search() actually passes to fuse, so a test can tell the real
// Clef output from a hardcoded stand-in for it (see the forwarding assertion below).
const fuseCalls: { flaggedGenres: string[] }[] = [];

mock.module("../src/workers-ai.ts", {
  exports: {
    askClef: async () => ({ ok: true, titleProbability: 0.9, flaggedGenres: ["Horror"] }),
    embedTexts: async () => ({ ok: false, error: "embedding down" }),
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
  movies: [
    { title: "Alpha", year: "2020", overview: "wolves", genres: [], rating: 5, poster: "" },
    { title: "Beta", year: "2020", overview: "foxes", genres: [], rating: 5, poster: "" },
  ],
  vectors: new Float32Array(4),
  genres: [],
  bm25: ({ query }: { query: string }) => (query.includes("wolves") ? [{ index: 0, score: 1 }] : [{ index: 1, score: 1 }]),
};

test("ranks by BM25 only and stays degraded when embedTexts fails", async (t) => {
  const warn = t.mock.method(console, "warn");
  const result = await search({ query: "wolves", index });
  assert.equal(result.degraded, true);
  assert.deepEqual(result.results.map((m) => m.title), ["Alpha"]);
  assert.ok(warn.mock.callCount() > 0);
});

test("forwards Clef's flagged genres to fuse instead of a hardcoded empty list", async () => {
  await search({ query: "wolves", index });
  assert.deepEqual(fuseCalls.at(-1)?.flaggedGenres, ["Horror"]);
});
