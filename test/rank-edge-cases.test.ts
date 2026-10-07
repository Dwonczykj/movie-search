import { test } from "node:test";
import assert from "node:assert/strict";
import { fuse, cosineTop } from "../src/rank.ts";

test("pins the exact lexWeight/semWeight formula at a non-edge, non-midpoint titleProbability", () => {
  const args = { titleProbability: 0.6, flaggedGenres: [], movies: [{ genres: [] }], limit: 10 };
  const lexOnly = fuse({ ...args, lexical: [{ index: 0, score: 1 }], semantic: [] })[0].score;
  const semOnly = fuse({ ...args, lexical: [], semantic: [{ index: 0, score: 1 }] })[0].score;
  assert.ok(Math.abs(lexOnly - 0.7 / 61) < 1e-9);
  assert.ok(Math.abs(semOnly - 0.55 / 61) < 1e-9);
});

test("a hit ranked 51st or lower in a ranking contributes nothing, even when the limit would allow it through", () => {
  const lexical = Array.from({ length: 51 }, (_, i) => ({ index: i, score: 51 - i }));
  const movies = Array.from({ length: 51 }, () => ({ genres: [] }));
  const fused = fuse({ lexical, semantic: [], titleProbability: 0.5, flaggedGenres: [], movies, limit: 51 });
  assert.equal(fused.length, 50);
  assert.equal(fused.some((r) => r.index === 50), false);
});

test("returns a similarity of 0, not NaN, when the query vector's magnitude is zero", () => {
  const vectors = Float32Array.from([1, 0]);
  const ranked = cosineTop({ query: [0, 0], vectors, dim: 2, limit: 1 });
  assert.equal(ranked[0].score, 0);
  assert.ok(!Number.isNaN(ranked[0].score));
});
