import { test } from "node:test";
import assert from "node:assert/strict";
import { toMovies } from "../src/csv.ts";

const header = ["Release_Date", "Title", "Overview", "Genre", "Vote_Average", "Poster_Url"];

test("keeps and maps a full-width row with Title and Overview populated", () => {
  const row = ["2020-05-15", "Shark Night", "A beach town is attacked by a shark", "Horror, Thriller,", "6.1", "https://img/p.jpg"];
  assert.deepEqual(toMovies({ rows: [header, row] }), [
    {
      title: "Shark Night",
      year: "2020",
      overview: "A beach town is attacked by a shark",
      genres: ["Horror", "Thriller"],
      rating: 6.1,
      poster: "https://img/p.jpg",
    },
  ]);
});
