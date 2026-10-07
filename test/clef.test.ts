import { test } from "node:test";
import assert from "node:assert/strict";
import { clefQuestions, parseClef } from "../src/clef.ts";

test("keys a multi-word genre question with underscores instead of spaces", () => {
  const questions = clefQuestions({ genres: ["Science Fiction"] });
  assert.ok("genre_Science_Fiction" in questions);
  assert.match("genre_Science_Fiction", /^[A-Za-z0-9_.-]{1,100}$/);
});

test("flags only the genres whose probability is above 0.7", () => {
  const raw = {
    answers: {
      title: { noul: 0.8 },
      genre_Action: { noul: 0.9 },
      genre_Comedy: { noul: 0.3 },
    },
  };
  const result = parseClef({ raw, genres: ["Action", "Comedy"] });
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.titleProbability, 0.8);
  assert.deepEqual(result.ok && result.flaggedGenres, ["Action"]);
});

test("fails the Zod schema when an expected genre key is missing entirely", () => {
  const raw = { answers: { title: { noul: 0.8 }, genre_Action: { noul: 0.9 } } };
  const result = parseClef({ raw, genres: ["Action", "Comedy"] });
  assert.equal(result.ok, false);
});

test("fails the Zod schema when a probability is out of range or not a number", () => {
  const outOfRange = { answers: { title: { noul: 0.8 }, genre_Action: { noul: 1.4 } } };
  const notANumber = { answers: { title: { noul: 0.8 }, genre_Action: { noul: "high" } } };
  assert.equal(parseClef({ raw: outOfRange, genres: ["Action"] }).ok, false);
  assert.equal(parseClef({ raw: notANumber, genres: ["Action"] }).ok, false);
});

test("does not flag a genre probability of exactly 0.7", () => {
  const raw = { answers: { title: { noul: 0.5 }, genre_Action: { noul: 0.7 } } };
  const result = parseClef({ raw, genres: ["Action"] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.ok && result.flaggedGenres, []);
});
