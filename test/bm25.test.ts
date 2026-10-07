import { test } from "node:test";
import assert from "node:assert/strict";
import { makeBm25 } from "../src/bm25.ts";

test("a document containing a query term scores above a document that doesn't contain it", () => {
  const bm25 = makeBm25({ docs: ["wolves hunt at night", "foxes hunt at night"] });
  const hits = bm25({ query: "wolves", limit: 10 });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].index, 0);
  assert.ok(hits[0].score > 0);
});

test("returns an empty array, not NaN scores, when no document contains any query term", () => {
  const bm25 = makeBm25({ docs: ["wolves hunt at night", "foxes hunt at night"] });
  const hits = bm25({ query: "elephants", limit: 10 });
  assert.deepEqual(hits, []);
});

test("caps the hit list at `limit` even when more documents match the query", () => {
  const bm25 = makeBm25({ docs: ["cats and dogs", "cats everywhere", "cats on mats", "no match here"] });
  const hits = bm25({ query: "cats", limit: 2 });
  assert.equal(hits.length, 2);
});

test("orders matching documents by descending score", () => {
  const bm25 = makeBm25({ docs: ["cats among many other unrelated words here", "cats cats", "dogs only"] });
  const hits = bm25({ query: "cats", limit: 10 });
  assert.deepEqual(hits.map((hit) => hit.index), [1, 0]);
  assert.ok(hits[0].score > hits[1].score);
});
