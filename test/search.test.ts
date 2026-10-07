import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { search } from "../src/search.ts";
import { DIM } from "../src/workers-ai.ts";

const unit = (axis: number): number[] => Array.from({ length: DIM }, (_, d) => (d === axis ? 1 : 0));

const index = {
  movies: [
    { title: "Alpha", year: "2020", overview: "wolves", genres: ["Comedy"], rating: 5, poster: "" },
    { title: "Beta", year: "2021", overview: "foxes", genres: ["Horror"], rating: 6, poster: "" },
  ],
  vectors: Float32Array.from([...unit(0), ...unit(1)]),
  genres: ["Comedy", "Horror"],
  bm25: () => [
    { index: 0, score: 2 },
    { index: 1, score: 1 },
  ],
};

const clefOk = ({ titleProbability }: { titleProbability: number }) =>
  mock.fn(async ({ genres }: { genres: string[] }) => ({
    ok: true as const,
    titleProbability,
    flaggedGenres: genres.filter((genre) => genre === "Horror"),
  }));
const clefDown = mock.fn(async () => ({ ok: false as const, error: "clef down" }));
const embedOk = mock.fn(async () => ({ ok: true as const, vectors: [unit(1)] }));
const embedDown = mock.fn(async () => ({ ok: false as const, error: "embedding down" }));

test("passes the index genres to Clef and returns the genres it flags", async () => {
  const askClef = clefOk({ titleProbability: 0.9 });
  const result = await search({ query: "beta", index, ai: { askClef, embedTexts: embedOk } });
  assert.deepEqual(askClef.mock.calls[0].arguments[0].genres, ["Comedy", "Horror"]);
  assert.deepEqual(result.flaggedGenres, ["Horror"]);
  assert.equal(result.titleProbability, 0.9);
  assert.equal(result.degraded, false);
});

test("a title-like query puts the BM25 top hit first and a descriptive query puts the semantic top hit first", async () => {
  const titleLike = await search({ query: "alpha", index: { ...index, genres: [] }, ai: { askClef: clefOk({ titleProbability: 0.95 }), embedTexts: embedOk } });
  const descriptive = await search({ query: "foxes", index: { ...index, genres: [] }, ai: { askClef: clefOk({ titleProbability: 0.05 }), embedTexts: embedOk } });
  assert.deepEqual(titleLike.results.map((m) => m.title), ["Alpha", "Beta"]);
  assert.deepEqual(descriptive.results.map((m) => m.title), ["Beta", "Alpha"]);
});

test("uses neutral weights, no flagged genres, and logs a warning when Clef fails", async (t) => {
  const warn = t.mock.method(console, "warn", () => undefined);
  const result = await search({ query: "wolves", index, ai: { askClef: clefDown, embedTexts: embedOk } });
  assert.equal(result.titleProbability, 0.5);
  assert.deepEqual(result.flaggedGenres, []);
  assert.equal(result.degraded, true);
  assert.equal(warn.mock.callCount(), 1);
});

test("ranks by BM25 alone and logs a warning when the embedding call fails", async (t) => {
  const warn = t.mock.method(console, "warn", () => undefined);
  const result = await search({ query: "wolves", index: { ...index, bm25: () => [{ index: 0, score: 1 }] }, ai: { askClef: clefOk({ titleProbability: 0.1 }), embedTexts: embedDown } });
  assert.deepEqual(result.results.map((m) => m.title), ["Alpha"]);
  assert.equal(result.degraded, true);
  assert.equal(warn.mock.callCount(), 1);
});

test("still returns BM25 results when both calls fail", async (t) => {
  t.mock.method(console, "warn", () => undefined);
  const result = await search({ query: "wolves", index, ai: { askClef: clefDown, embedTexts: embedDown } });
  assert.deepEqual(result.results.map((m) => m.title), ["Alpha", "Beta"]);
  assert.equal(result.titleProbability, 0.5);
  assert.equal(result.degraded, true);
});
