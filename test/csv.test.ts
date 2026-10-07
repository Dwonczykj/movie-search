import { test } from "node:test";
import assert from "node:assert/strict";
import { toMovies } from "../src/csv.ts";

const header = ["Release_Date", "Title", "Overview", "Genre", "Vote_Average", "Poster_Url"];

test("drops a row shifted short by an unescaped comma even though Title and Overview look populated", () => {
  const shifted = ["2020", "Shark Night", "A beach town is attacked, by a shark", "Horror", "6.1"];
  assert.deepEqual(toMovies({ rows: [header, shifted] }), []);
});

test("excludes a full-width row with an empty Title", () => {
  const row = ["2020", "", "A town is attacked by a shark", "Horror", "6.1", "https://img/p.jpg"];
  assert.deepEqual(toMovies({ rows: [header, row] }), []);
});

test("excludes a full-width row with an empty Overview", () => {
  const row = ["2020", "Shark Night", "", "Horror", "6.1", "https://img/p.jpg"];
  assert.deepEqual(toMovies({ rows: [header, row] }), []);
});
