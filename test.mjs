// Offline check: CSV parser edge cases + BM25 ranking.
import assert from "node:assert/strict";
import { parseCsv, makeBm25 } from "./lib.mjs";

assert.deepEqual(parseCsv('a,"b,c","d ""e""\nf"\n1,2,3\n'), [["a", "b,c", 'd "e"\nf'], ["1", "2", "3"]]);

const bm25 = makeBm25(["a shark attacks a beach town", "toy cowboy and spaceman", "shark shark shark"]);
assert.equal(bm25("shark beach")[0].i, 0);
assert.equal(bm25("zebra").length, 0);
console.log("ok");
