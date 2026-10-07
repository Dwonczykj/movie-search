// Offline check: CSV parser edge cases + BM25 ranking.
import assert from "node:assert/strict";
import { parseCsv } from "./src/csv.ts";
import { makeBm25 } from "./src/bm25.ts";

assert.deepEqual(parseCsv({ text: 'a,"b,c","d ""e""\nf"\n1,2,3\n' }), [["a", "b,c", 'd "e"\nf'], ["1", "2", "3"]]);

const bm25 = makeBm25({ docs: ["a shark attacks a beach town", "toy cowboy and spaceman", "shark shark shark"] });
assert.equal(bm25({ query: "shark beach" })[0].index, 0);
assert.equal(bm25({ query: "zebra" }).length, 0);
console.log("ok");
