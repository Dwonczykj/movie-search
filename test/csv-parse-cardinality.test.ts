import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../src/csv.ts";

test("treats a lone CR with no following LF as a row break, not a line continuation", () => {
  const rows = parseCsv({ text: "Title,Overview\rShark Night,fine\r" });
  assert.deepEqual(rows, [
    ["Title", "Overview"],
    ["Shark Night", "fine"],
  ]);
});

test("returns an empty row array for empty text input, not one row of a single empty field", () => {
  const rows = parseCsv({ text: "" });
  assert.deepEqual(rows, []);
});
