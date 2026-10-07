import { test } from "node:test";
import assert from "node:assert/strict";
import { fuse, cosineTop } from "../src/rank.ts";

test("a lexical-only hit outranks a higher-score semantic-only hit when the query is title-like", () => {
  const ranked = fuse({
    lexical: [{ index: 0, score: 100 }],
    semantic: [{ index: 1, score: 9999 }],
    titleProbability: 1,
    flaggedGenres: [],
    movies: [{ genres: [] }, { genres: [] }],
    limit: 2,
  });
  assert.equal(ranked[0].index, 0);
});

test("a semantic-only hit outranks a higher-score lexical-only hit when the query is not title-like", () => {
  const ranked = fuse({
    lexical: [{ index: 0, score: 9999 }],
    semantic: [{ index: 1, score: 100 }],
    titleProbability: 0,
    flaggedGenres: [],
    movies: [{ genres: [] }, { genres: [] }],
    limit: 2,
  });
  assert.equal(ranked[0].index, 1);
});

test("fuses a movie present in both lists by summing each list's weighted RRF contribution", () => {
  const args = { titleProbability: 0.5, flaggedGenres: [], movies: [{ genres: [] }, { genres: [] }, { genres: [] }], limit: 10 };
  const lexOnly = fuse({ ...args, lexical: [{ index: 0, score: 1 }], semantic: [] });
  const semOnly = fuse({ ...args, lexical: [], semantic: [{ index: 2, score: 1 }, { index: 0, score: 1 }] });
  const both = fuse({ ...args, lexical: [{ index: 0, score: 1 }], semantic: [{ index: 2, score: 1 }, { index: 0, score: 1 }] });
  const contributionLex = lexOnly.find((r) => r.index === 0)?.score ?? 0;
  const contributionSem = semOnly.find((r) => r.index === 0)?.score ?? 0;
  const combined = both.find((r) => r.index === 0)?.score ?? 0;
  assert.ok(Math.abs(combined - (contributionLex + contributionSem)) < 1e-9);
});

test("multiplies the fused score by 1.25 for a single flagged genre", () => {
  const args = { lexical: [{ index: 0, score: 1 }], semantic: [], titleProbability: 0.5, limit: 10 };
  const baseline = fuse({ ...args, flaggedGenres: [], movies: [{ genres: ["Horror"] }] })[0].score;
  const boosted = fuse({ ...args, flaggedGenres: ["Horror"], movies: [{ genres: ["Horror"] }] })[0].score;
  assert.ok(Math.abs(boosted - baseline * 1.25) < 1e-9);
});

test("compounds the genre multiplier once per flagged genre the movie has", () => {
  const args = { lexical: [{ index: 0, score: 1 }], semantic: [], titleProbability: 0.5, limit: 10 };
  const baseline = fuse({ ...args, flaggedGenres: [], movies: [{ genres: ["Horror", "War"] }] })[0].score;
  const boosted = fuse({ ...args, flaggedGenres: ["Horror", "War"], movies: [{ genres: ["Horror", "War"] }] })[0].score;
  assert.ok(Math.abs(boosted - baseline * 1.25 ** 2) < 1e-9);
});

test("applies no genre boost when titleProbability is 1 (fully title-like)", () => {
  const args = { lexical: [{ index: 0, score: 1 }], semantic: [], titleProbability: 1, limit: 10 };
  const baseline = fuse({ ...args, flaggedGenres: [], movies: [{ genres: ["Horror"] }] })[0].score;
  const boosted = fuse({ ...args, flaggedGenres: ["Horror"], movies: [{ genres: ["Horror"] }] })[0].score;
  assert.ok(Math.abs(boosted - baseline) < 1e-9);
});

test("applies the maximum 1.5x genre boost when titleProbability is 0", () => {
  const args = { lexical: [{ index: 0, score: 1 }], semantic: [], titleProbability: 0, limit: 10 };
  const baseline = fuse({ ...args, flaggedGenres: [], movies: [{ genres: ["Horror"] }] })[0].score;
  const boosted = fuse({ ...args, flaggedGenres: ["Horror"], movies: [{ genres: ["Horror"] }] })[0].score;
  assert.ok(Math.abs(boosted - baseline * 1.5) < 1e-9);
});

test("leaves the fused score unmultiplied when the movie has zero flagged genres", () => {
  const args = { lexical: [{ index: 0, score: 1 }], semantic: [], titleProbability: 0.5, limit: 10, movies: [{ genres: ["Comedy"] }] };
  const baseline = fuse({ ...args, flaggedGenres: [] })[0].score;
  const unaffected = fuse({ ...args, flaggedGenres: ["Horror"] })[0].score;
  assert.equal(unaffected, baseline);
});

test("keeps exactly `limit` entries, with no duplicate or dropped index, when two scores tie", () => {
  const dim = 2;
  const vectors = Float32Array.from([1, 0, 1, 0, 0, 1]);
  const ranked = cosineTop({ query: [1, 0], vectors, dim, limit: 2 });
  assert.equal(ranked.length, 2);
  assert.deepEqual(new Set(ranked.map((r) => r.index)), new Set([0, 1]));
});
